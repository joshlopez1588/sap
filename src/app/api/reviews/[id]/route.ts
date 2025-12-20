import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reviewCycles, userAccessRecords, findings } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating a review
const updateReviewSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum([
    'DRAFT',
    'DATA_COLLECTION',
    'ANALYSIS_PENDING',
    'ANALYSIS_COMPLETE',
    'IN_REVIEW',
    'PENDING_ATTESTATION',
    'COMPLETED',
    'ARCHIVED',
  ]).optional(),
  dueDate: z.string().optional().nullable(),
  snapshotDate: z.string().optional().nullable(),
});

// GET /api/reviews/[id] - Get a single review
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

    const review = await db.query.reviewCycles.findFirst({
      where: eq(reviewCycles.id, id),
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
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        attestedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Get counts
    const [accessRecordCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userAccessRecords)
      .where(eq(userAccessRecords.reviewCycleId, id));

    const [findingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(findings)
      .where(eq(findings.reviewCycleId, id));

    // Calculate progress based on status
    const statusProgress: Record<string, number> = {
      DRAFT: 5,
      DATA_COLLECTION: 20,
      ANALYSIS_PENDING: 40,
      ANALYSIS_COMPLETE: 60,
      IN_REVIEW: 75,
      PENDING_ATTESTATION: 90,
      COMPLETED: 100,
      ARCHIVED: 100,
    };

    return NextResponse.json({
      data: {
        ...review,
        _count: {
          userAccessRecords: accessRecordCount?.count || 0,
          findings: findingCount?.count || 0,
        },
        progress: statusProgress[review.status] || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

// PUT /api/reviews/[id] - Update a review
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
    const validatedData = updateReviewSchema.parse(body);

    // Check if review exists
    const existingReview = await db.query.reviewCycles.findFirst({
      where: eq(reviewCycles.id, id),
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Partial<typeof reviewCycles.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      // Set timestamps based on status changes
      if (validatedData.status === 'DATA_COLLECTION' && !existingReview.startedAt) {
        updateData.startedAt = new Date();
      }
      if (validatedData.status === 'COMPLETED' && !existingReview.completedAt) {
        updateData.completedAt = new Date();
      }
    }
    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    }
    if (validatedData.snapshotDate !== undefined) {
      updateData.snapshotDate = validatedData.snapshotDate ? new Date(validatedData.snapshotDate) : null;
    }

    // Update the review
    const [updatedReview] = await db
      .update(reviewCycles)
      .set(updateData)
      .where(eq(reviewCycles.id, id))
      .returning();

    // Fetch complete review with relations
    const completeReview = await db.query.reviewCycles.findFirst({
      where: eq(reviewCycles.id, id),
      with: {
        application: true,
        framework: true,
      },
    });

    return NextResponse.json({ data: completeReview });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/[id] - Delete a review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if review exists
    const existingReview = await db.query.reviewCycles.findFirst({
      where: eq(reviewCycles.id, id),
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Only allow deletion of DRAFT reviews, archive others
    if (existingReview.status !== 'DRAFT') {
      await db
        .update(reviewCycles)
        .set({ status: 'ARCHIVED', updatedAt: new Date() })
        .where(eq(reviewCycles.id, id));

      return NextResponse.json({
        message: 'Review archived (not deleted - has data)',
        archived: true,
      });
    }

    // Delete the review (cascade will delete related records)
    await db.delete(reviewCycles).where(eq(reviewCycles.id, id));

    return NextResponse.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}
