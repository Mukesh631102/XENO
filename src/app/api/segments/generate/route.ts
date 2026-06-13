import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSQLQuery, generateTemplates } from '@/lib/llm';
import { z } from 'zod';

// Request body validation schema
const GenerateSegmentSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

/**
 * POST /api/segments/generate
 * Accepts a natural language prompt, generates a SQL query via LLM,
 * executes it against the PostgreSQL database, and returns matching customers.
 * Also generates three AI‑crafted message templates for the segment.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = GenerateSegmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request payload',
          errors: parsed.error.issues,
        },
        { status: 400 }
      );
    }
    const { prompt } = parsed.data;

    // 1️⃣ Generate the SQL query and segment metadata via LLM
    const segmentInfo = await generateSQLQuery(prompt);

    // 2️⃣ Execute the generated SQL query safely – we expect a SELECT from "customers"
    let customers: any[] = [];
    try {
      // Prisma raw query – using $queryRawUnsafe because the LLM supplies a full SQL string
      customers = await prisma.$queryRawUnsafe<any[]>(segmentInfo.sql);
    } catch (execError) {
      // If the LLM produced invalid SQL, surface a clear error
      console.error('SQL Execution Error:', execError);
      return NextResponse.json(
        {
          success: false,
          message: 'Generated SQL query failed to execute',
          error: (execError as Error).message,
          segment: {
            name: segmentInfo.name,
            description: segmentInfo.description,
            sql: segmentInfo.sql,
          },
        },
        { status: 400 }
      );
    }

    // 3️⃣ Generate copywriting templates for the audience
    const templates = await generateTemplates(segmentInfo.name, segmentInfo.description);

    // 4️⃣ Build response payload
    return NextResponse.json({
      success: true,
      segment: {
        name: segmentInfo.name,
        description: segmentInfo.description,
        sql: segmentInfo.sql,
        explanation: segmentInfo.explanation,
      },
      audience: {
        count: customers.length,
        customers,
      },
      templates,
    });
  } catch (error) {
    console.error('API /segments/generate error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Unexpected server error',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
