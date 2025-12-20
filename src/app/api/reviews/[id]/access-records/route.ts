import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reviewCycles, userAccessRecords } from '@/lib/db/schema';
import { eq, and, desc, asc, ilike, or, sql } from 'drizzle-orm';

// GET /api/reviews/[id]/access-records - List all user access records for a review
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
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const hasSodConflict = searchParams.get('hasSodConflict');
    const hasPrivilegedAccess = searchParams.get('hasPrivilegedAccess');
    const isDormant = searchParams.get('isDormant');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Verify review exists
    const review = await db.query.reviewCycles.findFirst({
      where: eq(reviewCycles.id, id),
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Build where conditions
    const conditions = [eq(userAccessRecords.reviewCycleId, id)];

    if (search) {
      conditions.push(
        or(
          ilike(userAccessRecords.username, `%${search}%`),
          ilike(userAccessRecords.email, `%${search}%`),
          ilike(userAccessRecords.displayName, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(userAccessRecords.reviewStatus, status as any));
    }

    if (hasSodConflict === 'true') {
      conditions.push(eq(userAccessRecords.hasSodConflict, true));
    }

    if (hasPrivilegedAccess === 'true') {
      conditions.push(eq(userAccessRecords.hasPrivilegedAccess, true));
    }

    if (isDormant === 'true') {
      conditions.push(eq(userAccessRecords.isDormant, true));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userAccessRecords)
      .where(and(...conditions));

    // Get records with pagination
    const records = await db.query.userAccessRecords.findMany({
      where: and(...conditions),
      with: {
        employee: {
          columns: {
            id: true,
            employeeId: true,
            fullName: true,
            email: true,
            department: true,
            jobTitle: true,
            employmentStatus: true,
            terminationDate: true,
          },
        },
      },
      orderBy: [
        desc(userAccessRecords.hasSodConflict),
        desc(userAccessRecords.hasPrivilegedAccess),
        asc(userAccessRecords.username),
      ],
      limit,
      offset,
    });

    // Get summary stats
    const [statsResult] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${userAccessRecords.reviewStatus} = 'PENDING')::int`,
        needsReview: sql<number>`count(*) filter (where ${userAccessRecords.reviewStatus} = 'NEEDS_REVIEW')::int`,
        approved: sql<number>`count(*) filter (where ${userAccessRecords.reviewStatus} = 'APPROVED')::int`,
        remediation: sql<number>`count(*) filter (where ${userAccessRecords.reviewStatus} = 'REMEDIATION')::int`,
        sodConflicts: sql<number>`count(*) filter (where ${userAccessRecords.hasSodConflict} = true)::int`,
        privilegedAccess: sql<number>`count(*) filter (where ${userAccessRecords.hasPrivilegedAccess} = true)::int`,
        dormant: sql<number>`count(*) filter (where ${userAccessRecords.isDormant} = true)::int`,
      })
      .from(userAccessRecords)
      .where(eq(userAccessRecords.reviewCycleId, id));

    return NextResponse.json({
      data: records,
      pagination: {
        page,
        limit,
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / limit),
      },
      stats: statsResult || {},
    });
  } catch (error) {
    console.error('Error fetching access records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access records' },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/[id]/access-records - Clear all access records for a review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMINISTRATOR', 'ISO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Verify review exists and is in correct status
    const review = await db.query.reviewCycles.findFirst({
      where: eq(reviewCycles.id, id),
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (!['DRAFT', 'DATA_COLLECTION'].includes(review.status)) {
      return NextResponse.json(
        { error: 'Cannot clear records - review has progressed past data collection' },
        { status: 400 }
      );
    }

    // Delete all access records
    await db.delete(userAccessRecords).where(eq(userAccessRecords.reviewCycleId, id));

    // Reset review to DRAFT status
    await db
      .update(reviewCycles)
      .set({
        status: 'DRAFT',
        startedAt: null,
        snapshotDate: null,
        updatedAt: new Date(),
      })
      .where(eq(reviewCycles.id, id));

    return NextResponse.json({ message: 'Access records cleared successfully' });
  } catch (error) {
    console.error('Error clearing access records:', error);
    return NextResponse.json(
      { error: 'Failed to clear access records' },
      { status: 500 }
    );
  }
}
