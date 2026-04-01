import { NextRequest, NextResponse } from 'next/server';
import { getDocument } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

type Params = {
  id: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const userId = getUserFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (!document.file_base64) {
      return NextResponse.json(
        { success: false, error: 'No file content stored for this document' },
        { status: 404 }
      );
    }

    // Return the file as a data URL JSON response for easy client-side rendering
    return NextResponse.json({
      success: true,
      data: {
        file_base64: document.file_base64,
        file_media_type: document.file_media_type || 'application/octet-stream',
        original_name: document.original_name,
      },
    });
  } catch (error) {
    console.error('Get document file error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
