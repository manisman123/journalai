import { NextRequest, NextResponse } from 'next/server';
import { getDocument, updateDocument } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse, Document } from '@/types/index';

type UpdateDocumentRequest = Partial<Document>;

type Params = {
  id: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse<ApiResponse<Document>>> {
  const { id } = await params;
  try {
    const userId = getUserFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Verify user owns this document
    if (document.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: document,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse<ApiResponse<Document>>> {
  const { id } = await params;
  try {
    const userId = getUserFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Verify user owns this document
    if (document.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 }
      );
    }

    const body: UpdateDocumentRequest = await request.json();

    // Only allow updating specific fields
    const allowedUpdates = ['status', 'extracted_data'];
    const updates: Partial<Document> = {};

    for (const key of allowedUpdates) {
      if (key in body) {
        (updates as any)[key] = (body as any)[key];
      }
    }

    const updatedDocument = await updateDocument(id, updates);

    if (!updatedDocument) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update document',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedDocument,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
