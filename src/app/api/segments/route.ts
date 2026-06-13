import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';

export async function GET() {
  try {
    const segments = await prisma.segment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { campaigns: true } } },
    });
    return NextResponse.json({ success: true, data: segments });
  } catch (error: any) {
    console.error('[API/SEGMENTS/GET] Error retrieving segments:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve segments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseErr: any) {
      console.error('[API/SEGMENTS/POST] Failed to parse request JSON:', parseErr);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload in request body' },
        { status: 400 }
      );
    }

    console.log('[API/SEGMENTS/POST] Received segment save request payload:', body);

    const { name, description, criteria, sqlQuery, audienceCount } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Segment name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Prepare JSON criteria
    let finalCriteria: Prisma.InputJsonValue = {};
    if (criteria !== undefined && criteria !== null) {
      if (typeof criteria === 'object') {
        finalCriteria = criteria as Prisma.InputJsonValue;
      } else {
        try {
          finalCriteria = JSON.parse(String(criteria)) as Prisma.InputJsonValue;
        } catch {
          finalCriteria = { rawCriteria: String(criteria) };
        }
      }
    }

    // Determine audience count. If sqlQuery is present, attempt executing it to get count.
    let count = typeof audienceCount === 'number' ? audienceCount : 0;
    if (sqlQuery && typeof sqlQuery === 'string' && sqlQuery.trim() !== '') {
      try {
        console.log('[API/SEGMENTS/POST] Executing generated SQL query to count audience:', sqlQuery);
        const rows = await prisma.$queryRawUnsafe<unknown[]>(sqlQuery);
        count = rows.length;
        console.log(`[API/SEGMENTS/POST] SQL query executed successfully. Found count: ${count}`);
      } catch (queryErr: any) {
        console.error('[API/SEGMENTS/POST] SQL Query execution failed. Using fallback count.', queryErr);
        // Fall back to original audienceCount passed from client, or 0.
      }
    }

    console.log('[API/SEGMENTS/POST] Writing segment to database...');
    const segment = await prisma.segment.create({
      data: {
        name: name.trim(),
        description: typeof description === 'string' ? description : '',
        criteria: finalCriteria,
        sqlQuery: typeof sqlQuery === 'string' ? sqlQuery : '',
        audienceCount: count,
      },
    });

    console.log('[API/SEGMENTS/POST] Segment saved successfully:', segment);
    return NextResponse.json({ success: true, data: segment }, { status: 201 });
  } catch (error: any) {
    console.error('[API/SEGMENTS/POST] Fatal database error during segment creation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal Database Error during segment saving',
        meta: error.code ? { code: error.code, meta: error.meta } : undefined,
      },
      { status: 500 }
    );
  }
}
