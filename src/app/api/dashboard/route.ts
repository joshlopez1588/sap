import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { applications, reviewCycles, findings, reports } from '@/lib/db/schema';
import { eq, sql, and, gte, desc, not, inArray } from 'drizzle-orm';

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentYear = new Date().getFullYear();

    // Get application count
    const [appCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
      .where(eq(applications.isActive, true));

    // Get active reviews (not completed or archived)
    const activeStatuses = ['DRAFT', 'DATA_COLLECTION', 'ANALYSIS_PENDING', 'ANALYSIS_COMPLETE', 'IN_REVIEW', 'PENDING_ATTESTATION'];
    const [activeReviewCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewCycles)
      .where(inArray(reviewCycles.status, activeStatuses as any));

    // Get completed reviews this year
    const [completedReviewCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewCycles)
      .where(
        and(
          eq(reviewCycles.status, 'COMPLETED'),
          eq(reviewCycles.year, currentYear)
        )
      );

    // Get open findings by severity
    const openStatuses = ['OPEN', 'IN_REVIEW', 'PENDING_REMEDIATION'];
    const [findingStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        critical: sql<number>`count(*) filter (where ${findings.severity} = 'CRITICAL')::int`,
        high: sql<number>`count(*) filter (where ${findings.severity} = 'HIGH')::int`,
        medium: sql<number>`count(*) filter (where ${findings.severity} = 'MEDIUM')::int`,
        low: sql<number>`count(*) filter (where ${findings.severity} = 'LOW')::int`,
      })
      .from(findings)
      .where(inArray(findings.status, openStatuses as any));

    // Get upcoming reviews (with due dates in next 60 days)
    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const upcomingReviews = await db.query.reviewCycles.findMany({
      where: and(
        inArray(reviewCycles.status, activeStatuses as any)
      ),
      with: {
        application: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(reviewCycles.dueDate)],
      limit: 5,
    });

    // Get recent reports
    const recentReports = await db.query.reports.findMany({
      with: {
        reviewCycle: {
          with: {
            application: {
              columns: {
                name: true,
              },
            },
          },
        },
        generatedBy: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [desc(reports.generatedAt)],
      limit: 5,
    });

    return NextResponse.json({
      data: {
        stats: {
          activeReviews: activeReviewCount?.count || 0,
          openFindings: findingStats?.total || 0,
          applications: appCount?.count || 0,
          completedReviews: completedReviewCount?.count || 0,
        },
        findingsBySeverity: {
          critical: findingStats?.critical || 0,
          high: findingStats?.high || 0,
          medium: findingStats?.medium || 0,
          low: findingStats?.low || 0,
        },
        upcomingReviews: upcomingReviews.map((review) => ({
          id: review.id,
          name: review.name,
          application: review.application?.name || 'Unknown',
          applicationId: review.application?.id,
          status: review.status,
          dueDate: review.dueDate,
          totalFindings: review.totalFindings,
          criticalFindings: review.criticalFindings,
        })),
        recentReports: recentReports.map((report) => ({
          id: report.id,
          name: report.name,
          reportType: report.reportType,
          format: report.format,
          fileSize: report.fileSize,
          generatedAt: report.generatedAt,
          application: report.reviewCycle?.application?.name || null,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
