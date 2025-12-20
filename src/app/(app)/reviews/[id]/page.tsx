'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ArrowLeft,
  Upload,
  Play,
  CheckCircle,
  ClipboardList,
  Users,
  AlertTriangle,
  Trash2,
  FileText,
  Clock,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

interface Review {
  id: string;
  name: string;
  status: string;
  year: number;
  quarter: number | null;
  dueDate: string | null;
  snapshotDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  attestedAt: string | null;
  attestationNotes: string | null;
  application: {
    id: string;
    name: string;
    roles: Array<{ id: string; name: string; isPrivileged: boolean }>;
    sodConflicts: Array<{ id: string; role1: { name: string }; role2: { name: string } }>;
  };
  framework: {
    id: string;
    name: string;
    checkCategories: Array<{ id: string; name: string; checkType: string }>;
  };
  createdBy: { name: string | null; email: string };
  attestedBy: { name: string | null; email: string } | null;
  _count: {
    userAccessRecords: number;
    findings: number;
  };
  progress: number;
}

interface AccessStats {
  total: number;
  pending: number;
  needsReview: number;
  approved: number;
  remediation: number;
  sodConflicts: number;
  privilegedAccess: number;
  dormant: number;
}

const statusConfig: Record<string, { label: string; color: string; nextAction: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', nextAction: 'Import Data' },
  DATA_COLLECTION: { label: 'Data Collection', color: 'bg-yellow-100 text-yellow-700', nextAction: 'Run Analysis' },
  ANALYSIS_PENDING: { label: 'Analysis Pending', color: 'bg-blue-100 text-blue-700', nextAction: 'Wait for Analysis' },
  ANALYSIS_COMPLETE: { label: 'Analysis Complete', color: 'bg-purple-100 text-purple-700', nextAction: 'Review Findings' },
  IN_REVIEW: { label: 'In Review', color: 'bg-orange-100 text-orange-700', nextAction: 'Complete Review' },
  PENDING_ATTESTATION: { label: 'Pending Attestation', color: 'bg-pink-100 text-pink-700', nextAction: 'Attest' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', nextAction: 'Generate Report' },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-100 text-gray-500', nextAction: '' },
};

export default function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [accessStats, setAccessStats] = useState<AccessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const fetchReview = async () => {
    try {
      const response = await fetch(`/api/reviews/${resolvedParams.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Review not found');
        }
        throw new Error('Failed to fetch review');
      }
      const data = await response.json();
      setReview(data.data);

      // Fetch access stats if we have records
      if (data.data._count.userAccessRecords > 0) {
        const statsRes = await fetch(`/api/reviews/${resolvedParams.id}/access-records?limit=1`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setAccessStats(statsData.stats);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReview();
  }, [resolvedParams.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress('Parsing CSV...');

    try {
      // Parse CSV file
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

      // Map columns
      const usernameIdx = headers.findIndex((h) => h.includes('username') || h.includes('user') || h === 'id');
      const emailIdx = headers.findIndex((h) => h.includes('email'));
      const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('display'));
      const rolesIdx = headers.findIndex((h) => h.includes('role') || h.includes('permission'));
      const lastLoginIdx = headers.findIndex((h) => h.includes('login') || h.includes('last'));

      if (usernameIdx === -1) {
        throw new Error('CSV must have a username column');
      }

      const records = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        if (!values[usernameIdx]) continue;

        records.push({
          username: values[usernameIdx],
          email: emailIdx >= 0 ? values[emailIdx] : undefined,
          displayName: nameIdx >= 0 ? values[nameIdx] : undefined,
          roles: rolesIdx >= 0 ? values[rolesIdx]?.split(';').map((r) => r.trim()).filter(Boolean) : [],
          lastLoginAt: lastLoginIdx >= 0 ? values[lastLoginIdx] : undefined,
        });
      }

      setUploadProgress(`Importing ${records.length} records...`);

      // Send to API
      const response = await fetch(`/api/reviews/${resolvedParams.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import records');
      }

      const result = await response.json();
      setUploadProgress(
        `Imported ${result.data.imported} records (${result.data.matched} matched, ${result.data.unmatched} unmatched)`
      );

      // Refresh review data
      fetchReview();

      // Clear progress after delay
      setTimeout(() => setUploadProgress(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setUploadProgress(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/reviews/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      fetchReview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Review not found'}</p>
          <Link href="/reviews">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reviews
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[review.status] || statusConfig.DRAFT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reviews">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{review.name}</h1>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-muted-foreground">
              {review.application.name} | {review.framework.name}
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Review Progress</span>
            <span className="font-medium">{review.progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                review.progress === 100 ? 'bg-green-500' : 'bg-primary'
              }`}
              style={{ width: `${review.progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{review._count.userAccessRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Findings</p>
                <p className="text-2xl font-bold">{review._count.findings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{review.criticalFindings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="text-lg font-medium">
                  {review.dueDate ? new Date(review.dueDate).toLocaleDateString() : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Access Stats if available */}
      {accessStats && accessStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Access Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{accessStats.sodConflicts}</p>
                <p className="text-sm text-muted-foreground">SoD Conflicts</p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{accessStats.privilegedAccess}</p>
                <p className="text-sm text-muted-foreground">Privileged Users</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{accessStats.dormant}</p>
                <p className="text-sm text-muted-foreground">Dormant Accounts</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{accessStats.needsReview}</p>
                <p className="text-sm text-muted-foreground">Needs Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
          <CardDescription>Next step: {status.nextAction}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Import Data - available in DRAFT or DATA_COLLECTION */}
            {['DRAFT', 'DATA_COLLECTION'].includes(review.status) && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Import CSV
                </Button>
              </>
            )}

            {/* Run Analysis - available when we have data */}
            {review.status === 'DATA_COLLECTION' && review._count.userAccessRecords > 0 && (
              <Button onClick={() => handleStatusChange('IN_REVIEW')}>
                <Play className="h-4 w-4 mr-2" />
                Start Review
              </Button>
            )}

            {/* View Findings - available after data collection */}
            {['IN_REVIEW', 'PENDING_ATTESTATION', 'COMPLETED'].includes(review.status) && (
              <Link href={`/findings?reviewId=${review.id}`}>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Findings
                </Button>
              </Link>
            )}

            {/* Complete Review */}
            {review.status === 'IN_REVIEW' && (
              <Button onClick={() => handleStatusChange('PENDING_ATTESTATION')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Review
              </Button>
            )}

            {/* Attest */}
            {review.status === 'PENDING_ATTESTATION' && (
              <Button onClick={() => handleStatusChange('COMPLETED')} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Attest & Complete
              </Button>
            )}
          </div>

          {uploadProgress && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
              {uploadProgress}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Period</span>
              <span>{review.year} Q{review.quarter}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Snapshot Date</span>
              <span>{review.snapshotDate ? new Date(review.snapshotDate).toLocaleDateString() : 'Not taken'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started</span>
              <span>{review.startedAt ? new Date(review.startedAt).toLocaleDateString() : 'Not started'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span>{review.completedAt ? new Date(review.completedAt).toLocaleDateString() : 'In progress'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created By</span>
              <span>{review.createdBy.name || review.createdBy.email}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Framework Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-muted-foreground mb-2">Application Roles ({review.application.roles.length})</p>
              <div className="flex flex-wrap gap-1">
                {review.application.roles.slice(0, 5).map((role) => (
                  <span
                    key={role.id}
                    className={`text-xs px-2 py-1 rounded ${
                      role.isPrivileged ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {role.name}
                  </span>
                ))}
                {review.application.roles.length > 5 && (
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">
                    +{review.application.roles.length - 5} more
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-2">SoD Rules ({review.application.sodConflicts.length})</p>
              {review.application.sodConflicts.length > 0 ? (
                <div className="text-sm">
                  {review.application.sodConflicts.slice(0, 3).map((conflict) => (
                    <div key={conflict.id} className="text-muted-foreground">
                      {conflict.role1.name} / {conflict.role2.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No SoD rules defined</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground mb-2">Checks ({review.framework.checkCategories.length})</p>
              <div className="flex flex-wrap gap-1">
                {review.framework.checkCategories.map((check) => (
                  <span
                    key={check.id}
                    className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {check.name}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
