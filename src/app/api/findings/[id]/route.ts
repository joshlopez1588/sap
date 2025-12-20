import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { findings, reviewCycles } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating a finding
const updateFindingSchema = z.object({
  status: z.enum([
    'OPEN',
    'IN_REVIEW',
    'PENDING_REMEDIATION',
    'REMEDIATED',
    'EXCEPTION_APPROVED',
    'DISMISSED',
    'CLOSED',
  ]).optional(),
  decision: z.enum(['REMEDIATE', 'EXCEPTION', 'DISMISS']).optional(),
  decisionJustification: z.string().optional().nullable(),
  compensatingControls: z.string().optional().nullable(),
  remediationDueDate: z.string().optional().nullable(),
  remediationTicketId: z.string().optional().nullable(),
  exceptionExpiryDate: z.string().optional().nullable(),
});

// GET /api/findings/[id] - Get a single finding
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const finding = await db.query.findings.findFirst({
      where: eq(findings.id, id),
      with: {
        reviewCycle: {
          with: {
            application: {
              with: {
                roles: true,
                sodConflicts: {
                  with: {
                    role1: true,
                    role2: true,
                  },
                },
              },
            },
            framework: {
              with: {
                checkCategories: true,
              },
            },
          },
        },
        userAccessRecord: {
          with: {
            employee: true,
          },
        },
        decidedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        exceptionApprovedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    return NextResponse.json({ data: finding });
  } catch (error) {
    console.error('Error fetching finding:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finding' },
      { status: 500 }
    );
  }
}

// PUT /api/findings/[id] - Update a finding (make decision)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMINISTRATOR', 'ISO', 'ANALYST'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateFindingSchema.parse(body);

    // Check if finding exists
    const existingFinding = await db.query.findings.findFirst({
      where: eq(findings.id, id),
    });

    if (!existingFinding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Partial<typeof findings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }

    if (validatedData.decision !== undefined) {
      updateData.decision = validatedData.decision;
      updateData.decidedById = session.user.id;
      updateData.decidedAt = new Date();

      // Set status based on decision
      if (validatedData.decision === 'REMEDIATE') {
        updateData.status = 'PENDING_REMEDIATION';
      } else if (validatedData.decision === 'EXCEPTION') {
        updateData.status = 'EXCEPTION_APPROVED';
        updateData.exceptionApprovedById = session.user.id;
        updateData.exceptionApprovedAt = new Date();
      } else if (validatedData.decision === 'DISMISS') {
        updateData.status = 'DISMISSED';
      }
    }

    if (validatedData.decisionJustification !== undefined) {
      updateData.decisionJustification = validatedData.decisionJustification;
    }

    if (validatedData.compensatingControls !== undefined) {
      updateData.compensatingControls = validatedData.compensatingControls;
    }

    if (validatedData.remediationDueDate !== undefined) {
      updateData.remediationDueDate = validatedData.remediationDueDate
        ? new Date(validatedData.remediationDueDate)
        : null;
    }

    if (validatedData.remediationTicketId !== undefined) {
      updateData.remediationTicketId = validatedData.remediationTicketId;
    }

    if (validatedData.exceptionExpiryDate !== undefined) {
      updateData.exceptionExpiryDate = validatedData.exceptionExpiryDate
        ? new Date(validatedData.exceptionExpiryDate)
        : null;
    }

    // Update the finding
    const [updatedFinding] = await db
      .update(findings)
      .set(updateData)
      .where(eq(findings.id, id))
      .returning();

    // Update review cycle finding counts
    await updateReviewCycleCounts(existingFinding.reviewCycleId);

    // Fetch complete finding with relations
    const completeFinding = await db.query.findings.findFirst({
      where: eq(findings.id, id),
      with: {
        reviewCycle: {
          with: {
            application: true,
          },
        },
        userAccessRecord: true,
        decidedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ data: completeFinding });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating finding:', error);
    return NextResponse.json(
      { error: 'Failed to update finding' },
      { status: 500 }
    );
  }
}

// Helper function to update review cycle finding counts
async function updateReviewCycleCounts(reviewCycleId: string) {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      critical: sql<number>`count(*) filter (where ${findings.severity} = 'CRITICAL' and ${findings.status} not in ('REMEDIATED', 'DISMISSED', 'CLOSED'))::int`,
      high: sql<number>`count(*) filter (where ${findings.severity} = 'HIGH' and ${findings.status} not in ('REMEDIATED', 'DISMISSED', 'CLOSED'))::int`,
      medium: sql<number>`count(*) filter (where ${findings.severity} = 'MEDIUM' and ${findings.status} not in ('REMEDIATED', 'DISMISSED', 'CLOSED'))::int`,
      low: sql<number>`count(*) filter (where ${findings.severity} = 'LOW' and ${findings.status} not in ('REMEDIATED', 'DISMISSED', 'CLOSED'))::int`,
    })
    .from(findings)
    .where(eq(findings.reviewCycleId, reviewCycleId));

  await db
    .update(reviewCycles)
    .set({
      totalFindings: counts?.total || 0,
      criticalFindings: counts?.critical || 0,
      highFindings: counts?.high || 0,
      mediumFindings: counts?.medium || 0,
      lowFindings: counts?.low || 0,
      updatedAt: new Date(),
    })
    .where(eq(reviewCycles.id, reviewCycleId));
}
