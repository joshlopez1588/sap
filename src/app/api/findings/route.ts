import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { findings, reviewCycles, userAccessRecords, applications } from '@/lib/db/schema';
import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';

// GET /api/findings - List all findings with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const reviewId = searchParams.get('reviewId');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const findingType = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (reviewId) {
      conditions.push(eq(findings.reviewCycleId, reviewId));
    }

    if (severity) {
      conditions.push(eq(findings.severity, severity as any));
    }

    if (status) {
      conditions.push(eq(findings.status, status as any));
    }

    if (findingType) {
      conditions.push(eq(findings.findingType, findingType as any));
    }

    if (search) {
      conditions.push(
        or(
          ilike(findings.title, `%${search}%`),
          ilike(findings.description, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(findings)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get findings with pagination
    const findingsList = await db.query.findings.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
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
        userAccessRecord: {
          columns: {
            id: true,
            username: true,
            email: true,
            displayName: true,
            roles: true,
          },
        },
        decidedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        asc(findings.status), // OPEN first
        desc(sql`CASE ${findings.severity}
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5 END`),
        desc(findings.createdAt),
      ],
      limit,
      offset,
    });

    // Get summary stats
    const [statsResult] = await db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${findings.status} = 'OPEN')::int`,
        inReview: sql<number>`count(*) filter (where ${findings.status} = 'IN_REVIEW')::int`,
        pendingRemediation: sql<number>`count(*) filter (where ${findings.status} = 'PENDING_REMEDIATION')::int`,
        remediated: sql<number>`count(*) filter (where ${findings.status} = 'REMEDIATED')::int`,
        critical: sql<number>`count(*) filter (where ${findings.severity} = 'CRITICAL')::int`,
        high: sql<number>`count(*) filter (where ${findings.severity} = 'HIGH')::int`,
        medium: sql<number>`count(*) filter (where ${findings.severity} = 'MEDIUM')::int`,
        low: sql<number>`count(*) filter (where ${findings.severity} = 'LOW')::int`,
      })
      .from(findings)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      data: findingsList,
      pagination: {
        page,
        limit,
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / limit),
      },
      stats: statsResult || {},
    });
  } catch (error) {
    console.error('Error fetching findings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch findings' },
      { status: 500 }
    );
  }
}
