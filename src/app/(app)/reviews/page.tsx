'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList, Play, CheckCircle, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Review {
  id: string;
  name: string;
  status: string;
  year: number;
  quarter: number | null;
  dueDate: string | null;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  application: { id: string; name: string } | null;
  framework: { id: string; name: string } | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: Clock },
  DATA_COLLECTION: { label: 'Data Collection', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  ANALYSIS_PENDING: { label: 'Analysis Pending', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Play },
  ANALYSIS_COMPLETE: { label: 'Analysis Complete', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: CheckCircle },
  IN_REVIEW: { label: 'In Review', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: ClipboardList },
  PENDING_ATTESTATION: { label: 'Pending Attestation', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400', icon: Clock },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500', icon: Clock },
};

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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const response = await fetch('/api/reviews');
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }
        const data = await response.json();
        setReviews(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Cycles</h1>
          <p className="text-muted-foreground">
            Manage user access review cycles
          </p>
        </div>
        <Link href="/reviews/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Review
          </Button>
        </Link>
      </div>

      {reviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No review cycles yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first review cycle to start analyzing user access.
            </p>
            <Link href="/reviews/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Review
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => {
            const status = statusConfig[review.status] || statusConfig.DRAFT;
            const StatusIcon = status.icon;
            const totalFindings =
              review.criticalFindings + review.highFindings + review.mediumFindings + review.lowFindings;
            const progress = statusProgress[review.status] || 0;

            return (
              <Link href={`/reviews/${review.id}`} key={review.id}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-primary/10 p-3">
                          <ClipboardList className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{review.name}</h3>
                          <p className="text-sm font-medium">{review.application?.name || 'No application'}</p>
                          <p className="text-sm text-muted-foreground">{review.framework?.name || 'No framework'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </span>
                            {review.dueDate && (
                              <span className="text-sm text-muted-foreground">
                                Due: {new Date(review.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {totalFindings > 0 && (
                          <div className="flex items-center gap-2 mb-2 justify-end">
                            {review.criticalFindings > 0 && (
                              <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 text-xs font-medium">
                                {review.criticalFindings} Critical
                              </span>
                            )}
                            {review.highFindings > 0 && (
                              <span className="rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 text-xs font-medium">
                                {review.highFindings} High
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground mb-1">
                          Progress: {progress}%
                        </div>
                        <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              progress === 100 ? 'bg-green-500' : 'bg-primary'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
