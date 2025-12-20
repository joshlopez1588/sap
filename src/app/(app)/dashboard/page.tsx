'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  stats: {
    activeReviews: number;
    openFindings: number;
    applications: number;
    completedReviews: number;
  };
  findingsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  upcomingReviews: Array<{
    id: string;
    name: string;
    application: string;
    applicationId: string;
    status: string;
    dueDate: string | null;
    totalFindings: number;
    criticalFindings: number;
  }>;
  recentReports: Array<{
    id: string;
    name: string;
    reportType: string;
    format: string;
    generatedAt: string;
    application: string | null;
  }>;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  DATA_COLLECTION: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ANALYSIS_PENDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ANALYSIS_COMPLETE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  IN_REVIEW: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  PENDING_ATTESTATION: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error: {error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      name: 'Active Reviews',
      value: data.stats.activeReviews.toString(),
      description: 'Currently in progress',
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      href: '/reviews',
    },
    {
      name: 'Open Findings',
      value: data.stats.openFindings.toString(),
      description: `${data.findingsBySeverity.critical} critical, ${data.findingsBySeverity.high} high`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      href: '/findings',
    },
    {
      name: 'Applications',
      value: data.stats.applications.toString(),
      description: 'Under review',
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      href: '/applications',
    },
    {
      name: 'Completed',
      value: data.stats.completedReviews.toString(),
      description: 'Reviews this year',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      href: '/reviews?status=COMPLETED',
    },
  ];

  const maxFinding = Math.max(
    data.findingsBySeverity.critical,
    data.findingsBySeverity.high,
    data.findingsBySeverity.medium,
    data.findingsBySeverity.low,
    1
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your user access review activities
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link href={stat.href} key={stat.name}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm font-medium">{stat.name}</p>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Reviews */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Active Reviews</CardTitle>
              </div>
              <Link href="/reviews">
                <Button variant="ghost" size="sm">
                  View all
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>Reviews currently in progress</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingReviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active reviews</p>
                <Link href="/reviews/new">
                  <Button variant="outline" size="sm" className="mt-4">
                    Start a review
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.upcomingReviews.map((review) => (
                  <Link href={`/reviews/${review.id}`} key={review.id}>
                    <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 cursor-pointer">
                      <div>
                        <p className="font-medium">{review.application}</p>
                        <p className="text-sm text-muted-foreground">
                          {review.dueDate
                            ? `Due: ${new Date(review.dueDate).toLocaleDateString()}`
                            : 'No due date'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            statusColors[review.status] || statusColors.DRAFT
                          }`}
                        >
                          {review.status.replace(/_/g, ' ')}
                        </span>
                        {review.totalFindings > 0 && (
                          <p className="mt-1 text-sm">
                            <span className={review.criticalFindings > 0 ? 'text-red-600' : 'text-muted-foreground'}>
                              {review.totalFindings} findings
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Quick Actions</CardTitle>
            </div>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/reviews/new">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Start New Review
                </Button>
              </Link>
              <Link href="/applications/new">
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="h-4 w-4 mr-2" />
                  Add Application
                </Button>
              </Link>
              <Link href="/findings?status=OPEN">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Review Open Findings
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Findings by Severity */}
      <Card>
        <CardHeader>
          <CardTitle>Open Findings by Severity</CardTitle>
          <CardDescription>Distribution of unresolved findings across all reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-8 h-40">
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-20 bg-red-500 rounded-t transition-all"
                style={{ height: `${Math.max((data.findingsBySeverity.critical / maxFinding) * 120, 4)}px` }}
              />
              <span className="text-sm font-medium">Critical</span>
              <span className="text-lg font-bold text-red-600">{data.findingsBySeverity.critical}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-20 bg-orange-500 rounded-t transition-all"
                style={{ height: `${Math.max((data.findingsBySeverity.high / maxFinding) * 120, 4)}px` }}
              />
              <span className="text-sm font-medium">High</span>
              <span className="text-lg font-bold text-orange-600">{data.findingsBySeverity.high}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-20 bg-yellow-500 rounded-t transition-all"
                style={{ height: `${Math.max((data.findingsBySeverity.medium / maxFinding) * 120, 4)}px` }}
              />
              <span className="text-sm font-medium">Medium</span>
              <span className="text-lg font-bold text-yellow-600">{data.findingsBySeverity.medium}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-20 bg-green-500 rounded-t transition-all"
                style={{ height: `${Math.max((data.findingsBySeverity.low / maxFinding) * 120, 4)}px` }}
              />
              <span className="text-sm font-medium">Low</span>
              <span className="text-lg font-bold text-green-600">{data.findingsBySeverity.low}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
