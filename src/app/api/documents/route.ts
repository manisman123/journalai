import { NextRequest, NextResponse } from 'next/server';
import { getDocuments, createDocument, getUsage, incrementUsage } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { processDocumentAI } from '@/lib/ai-extraction';
import { getExchangeRate } from '@/lib/exchange-rates';
import { checkUsageLimit } from '@/lib/subscription-config';
import { getUser } from '@/lib/db';
import { ApiResponse, Document } from '@/types/index';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Document[]>>> {
  try {
    const userId = getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const documents = await getDocuments(userId);
    // Strip file_base64 from list response to avoid sending large payloads
    const documentsWithoutFiles = documents.map(({ file_base64, ...rest }) => rest);
    return NextResponse.json({ success: true, data: documentsWithoutFiles }, { status: 200 });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Document & { pipeline?: string; classification?: any }>>> {
  try {
    const userId = getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check usage limit
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = await getUsage(userId, currentMonth);
    const currentUsage = usage?.docs_processed || 0;
    const usageCheck = checkUsageLimit(user.tier, currentUsage);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { success: false, error: `Usage limit exceeded. ${usageCheck.used}/${usageCheck.limit} documents this month.` },
        { status: 429 }
      );
    }

    let filename = '';
    let textContent: string | null = null;
    let imageBase64: string | null = null;
    let imageMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | null = null;
    let fileType = 'text/plain';
    let fileSize = 0;
    let rawFileBase64: string | undefined = undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }

      filename = file.name;
      fileType = file.type || 'application/octet-stream';
      fileSize = file.size;

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Store raw file as base64 for later retrieval (View button)
      rawFileBase64 = Buffer.from(bytes).toString('base64');

      // Determine if this is an image (use Claude Vision) or text/PDF
      const isImage = /^image\/(jpeg|png|gif|webp)/.test(fileType) ||
        /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

      if (isImage) {
        // Send as base64 for Claude Vision
        imageBase64 = Buffer.from(bytes).toString('base64');
        const ext = filename.toLowerCase().split('.').pop();
        const mediaMap: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
        };
        imageMediaType = mediaMap[ext || 'png'] || 'image/png';
      } else if (
        fileType.includes('text') ||
        fileType.includes('csv') ||
        fileType.includes('json') ||
        /\.(txt|csv|json)$/i.test(filename)
      ) {
        textContent = new TextDecoder().decode(bytes);
      } else {
        // PDFs and other binary files: extract printable ASCII
        const rawText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        const printable = rawText.match(/[\x20-\x7E]{4,}/g);
        textContent = printable ? printable.join(' ') : '';
        if (textContent.length < 20) {
          textContent = `[File: ${filename}] Unable to extract text from binary file`;
        }
      }
    } else {
      // JSON body: { filename, content }
      const body = await request.json();
      filename = body.filename || 'document.pdf';
      textContent = body.content || '';
      fileType = filename.endsWith('.pdf') ? 'application/pdf' : 'text/plain';
      fileSize = (textContent || '').length;

      if (!textContent) {
        return NextResponse.json(
          { success: false, error: 'File or content is required' },
          { status: 400 }
        );
      }
    }

    // ===== RUN AI EXTRACTION PIPELINE =====
    const result = await processDocumentAI(
      textContent,
      filename,
      imageBase64,
      imageMediaType
    );

    // ===== FOREIGN CURRENCY → SGD CONVERSION (IRAS compliance) =====
    let exchangeRate = null;
    const extractedCurrency = result.extractedData.currency?.toUpperCase();
    if (extractedCurrency && extractedCurrency !== 'SGD') {
      const invoiceDate = result.extractedData.date
        ? new Date(result.extractedData.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const totalAmount = (result.rawExtraction as any)?.total || result.extractedData.amount || 0;
      try {
        exchangeRate = await getExchangeRate(extractedCurrency, invoiceDate, totalAmount);
      } catch (e) {
        console.warn('Exchange rate lookup failed:', e);
      }
    }

    // Create document record (store file content for later retrieval via View button)
    const document: Document = {
      id: nanoid(),
      user_id: userId,
      filename: `${nanoid()}_${filename}`,
      original_name: filename,
      file_type: fileType,
      ocr_text: textContent?.slice(0, 5000) || '[Image processed via AI Vision]',
      extracted_data: result.extractedData,
      status: 'extracted',
      created_at: new Date(),
      file_base64: rawFileBase64,
      file_media_type: imageMediaType || fileType,
    };

    const createdDocument = await createDocument(document);
    await incrementUsage(userId, currentMonth, 1, fileSize);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...createdDocument,
          pipeline: result.pipeline,
          classification: result.classification,
          exchangeRate: exchangeRate,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload document error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
