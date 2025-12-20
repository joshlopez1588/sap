'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Filter, User, Building2, Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';

interface Finding {
  id: string;
  title: string;
  description: string | null;
  findingType: string;
  severity: string;
  status: string;
  aiRationale: string | null;
  aiConfidenceScore: string | null;
  suggestedRemediation: string | null;
  decision: string | null;
  createdAt: string;
  reviewCycle: {
    id: string;
    name: string;
    application: { id: string; name: string };
  };
  userAccessRecord: {
    id: string;
    username: string;
    email: string | null;
    displayName: string | null;
    roles: string[] | null;
  } | null;
}

interface Stats {
  total: number;
  open: number;
  inReview: number;
  pendingRemediation: number;
  remediated: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const severityConfig: Record<string, { color: string; bgColor: string }> = {
  CRITICAL: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  HIGH: { color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  MEDIUM: { color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  LOW: { color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  INFO: { color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  IN_REVIEW: { label: 'In Review', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  PENDING_REMEDIATION: { label: 'Pending Remediation', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  REMEDIATED: { label: 'Remediated', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  EXCEPTION_APPROVED: { label: 'Exception', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  DISMISSED: { label: 'Dismissed', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
};

const findingTypeLabels: Record<string, string> = {
  TERMINATED_ACCESS: 'Terminated Access',
  ORPHANED_ACCOUNT: 'Orphaned Account',
  SOD_CONFLICT: 'SoD Conflict',
  PRIVILEGED_ACCESS: 'Privileged Access',
  DORMANT_ACCOUNT: 'Dormant Account',
  INAPPROPRIATE_ACCESS: 'Inappropriate Access',
  UNAUTHORIZED_CHANGE: 'Unauthorized Change',
  MISSING_AUTHORIZATION: 'Missing Authorization',
  OTHER: 'Other',
};

export default function FindingsPage() {
  const searchParams = useSearchParams();
  const reviewId = searchParams.get('reviewId');

  const [findings, setFindings] = useState<Finding[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function fetchFindings() {
      try {
        const params = new URLSearchParams();
        if (reviewId) params.set('reviewId', reviewId);
        if (search) params.set('search', search);
        if (severityFilter) params.set('severity', severityFilter);
        if (statusFilter) params.set('status', statusFilter);

        const response = await fetch(`/api/findings?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch findings');
        }
        const data = await response.json();
        setFindings(data.data || []);
        setStats(data.stats || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(fetchFindings, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [reviewId, search, severityFilter, statusFilter]);

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
          <h1 className="text-2xl font-bold">Findings</h1>
          <p className="text-muted-foreground">
            Review and resolve security findings
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search findings..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={severityFilter || ''}
                onChange={(e) => setSeverityFilter(e.target.value || null)}
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="PENDING_REMEDIATION">Pending Remediation</option>
                <option value="REMEDIATED">Remediated</option>
                <option value="EXCEPTION_APPROVED">Exception</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
              {(search || severityFilter || statusFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setSeverityFilter(null);
                    setStatusFilter(null);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700 dark:text-red-400">Critical</span>
                <span className="text-2xl font-bold">{stats.critical}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-700 dark:text-orange-400">High</span>
                <span className="text-2xl font-bold">{stats.high}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Medium</span>
                <span className="text-2xl font-bold">{stats.medium}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Low</span>
                <span className="text-2xl font-bold">{stats.low}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Findings List */}
      {findings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No findings</h3>
            <p className="text-muted-foreground text-center">
              {reviewId
                ? 'No findings have been generated for this review yet.'
                : 'Run an access review to generate findings.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {findings.map((finding) => {
            const severity = severityConfig[finding.severity] || severityConfig.INFO;
            const status = statusConfig[finding.status] || statusConfig.OPEN;

            return (
              <Link href={`/findings/${finding.id}`} key={finding.id}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-lg p-3 ${severity.bgColor}`}>
                        <AlertTriangle className={`h-5 w-5 ${severity.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{finding.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {findingTypeLabels[finding.findingType] || finding.findingType}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {finding.userAccessRecord && (
                                <span className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {finding.userAccessRecord.displayName || finding.userAccessRecord.username}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {finding.reviewCycle.application.name}
                              </span>
                            </div>
                            {finding.userAccessRecord?.roles && finding.userAccessRecord.roles.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                {finding.userAccessRecord.roles.slice(0, 3).map((role) => (
                                  <span key={role} className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                                    {role}
                                  </span>
                                ))}
                                {finding.userAccessRecord.roles.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{finding.userAccessRecord.roles.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severity.bgColor} ${severity.color}`}>
                              {finding.severity}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
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
