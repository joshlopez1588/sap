import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reports, reviewCycles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating a report
const createReportSchema = z.object({
  reviewCycleId: z.string().uuid().optional(),
  reportType: z.enum(['executive_summary', 'detailed_findings', 'remediation_tracker', 'attestation_certificate', 'evidence_package']),
  name: z.string().min(1).max(255),
  format: z.enum(['PDF', 'DOCX', 'XLSX', 'ZIP']).default('PDF'),
});

// GET /api/reports - List all reports
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reviewCycleId = searchParams.get('reviewCycleId');

    const conditions = reviewCycleId ? eq(reports.reviewCycleId, reviewCycleId) : undefined;

    const reportsList = await db.query.reports.findMany({
      where: conditions,
      with: {
        reviewCycle: {
          columns: {
            id: true,
            name: true,
          },
          with: {
            application: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        generatedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [desc(reports.generatedAt)],
    });

    return NextResponse.json({ data: reportsList });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// POST /api/reports - Generate a new report
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createReportSchema.parse(body);

    // If reviewCycleId is provided, verify it exists
    if (validatedData.reviewCycleId) {
      const reviewCycle = await db.query.reviewCycles.findFirst({
        where: eq(reviewCycles.id, validatedData.reviewCycleId),
      });

      if (!reviewCycle) {
        return NextResponse.json({ error: 'Review cycle not found' }, { status: 400 });
      }
    }

    // Create the report record (in a real implementation, this would trigger report generation)
    const [newReport] = await db
      .insert(reports)
      .values({
        reviewCycleId: validatedData.reviewCycleId,
        reportType: validatedData.reportType,
        name: validatedData.name,
        format: validatedData.format,
        generatedById: session.user.id,
        generatedAt: new Date(),
        metadata: {
          status: 'generated',
          generatedBy: session.user.email,
        },
      })
      .returning();

    // Fetch complete report with relations
    const completeReport = await db.query.reports.findFirst({
      where: eq(reports.id, newReport.id),
      with: {
        reviewCycle: {
          with: {
            application: true,
          },
        },
        generatedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ data: completeReport }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}
