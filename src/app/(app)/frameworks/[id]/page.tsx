'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  Clock,
  Shield,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface CheckCategory {
  id: string;
  name: string;
  checkType: string;
  description: string | null;
  isEnabled: boolean;
  defaultSeverity: string;
  regulatoryReferences: string[] | null;
}

interface Framework {
  id: string;
  name: string;
  description: string | null;
  version: string | null;
  reviewFrequency: string;
  attestationType: string;
  isDefault: boolean;
  isActive: boolean;
  regulatoryScope: string[] | null;
  thresholds: { dormantDays?: number; warningDays?: number; criticalDays?: number } | null;
  checkCategories: CheckCategory[];
  createdBy: { id: string; name: string | null; email: string } | null;
  createdAt: string;
  _count: {
    applications: number;
  };
}

const frequencyLabels: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMI_ANNUAL: 'Semi-Annual',
  ANNUAL: 'Annual',
};

const checkTypeLabels: Record<string, string> = {
  EMPLOYMENT_STATUS: 'Employment Status',
  SEGREGATION_OF_DUTIES: 'Segregation of Duties',
  PRIVILEGED_ACCESS: 'Privileged Access',
  DORMANT_ACCOUNT: 'Dormant Account',
  ACCESS_APPROPRIATENESS: 'Access Appropriateness',
  ACCESS_AUTHORIZATION: 'Access Authorization',
  CUSTOM: 'Custom',
};

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function FrameworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [framework, setFramework] = useState<Framework | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchFramework() {
      try {
        const response = await fetch(`/api/frameworks/${resolvedParams.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Framework not found');
          }
          throw new Error('Failed to fetch framework');
        }
        const data = await response.json();
        setFramework(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchFramework();
  }, [resolvedParams.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/frameworks/${resolvedParams.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete framework');
      }
      router.push('/frameworks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !framework) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Framework not found'}</p>
          <Link href="/frameworks">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Frameworks
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/frameworks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{framework.name}</h1>
              {framework.isDefault && (
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <p className="text-muted-foreground">
              {framework.description || 'No description provided'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/frameworks/${framework.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Delete this framework?
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {framework._count.applications > 0
                      ? `Cannot delete: ${framework._count.applications} application(s) are using this framework.`
                      : 'This action cannot be undone.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting || framework._count.applications > 0}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Frequency</p>
                <p className="text-lg font-semibold">
                  {frequencyLabels[framework.reviewFrequency]}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Attestation</p>
                <p className="text-lg font-semibold">
                  {framework.attestationType === 'DUAL' ? 'Dual Approval' : 'Single Approval'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Check Categories</p>
                <p className="text-lg font-semibold">
                  {framework.checkCategories.filter(c => c.isEnabled).length} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{framework._count.applications}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-lg font-semibold">Using this framework</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regulatory Scope & Thresholds */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Regulatory Scope</CardTitle>
          </CardHeader>
          <CardContent>
            {framework.regulatoryScope && framework.regulatoryScope.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {framework.regulatoryScope.map((reg) => (
                  <span
                    key={reg}
                    className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-sm text-blue-700 dark:text-blue-300"
                  >
                    {reg}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No regulatory scope defined</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            {framework.thresholds ? (
              <div className="grid grid-cols-3 gap-4">
                {framework.thresholds.dormantDays && (
                  <div>
                    <p className="text-sm text-muted-foreground">Dormant</p>
                    <p className="text-lg font-semibold">{framework.thresholds.dormantDays} days</p>
                  </div>
                )}
                {framework.thresholds.warningDays && (
                  <div>
                    <p className="text-sm text-muted-foreground">Warning</p>
                    <p className="text-lg font-semibold">{framework.thresholds.warningDays} days</p>
                  </div>
                )}
                {framework.thresholds.criticalDays && (
                  <div>
                    <p className="text-sm text-muted-foreground">Critical</p>
                    <p className="text-lg font-semibold">{framework.thresholds.criticalDays} days</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No thresholds configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Check Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Check Categories</CardTitle>
          <CardDescription>
            Checks performed during access reviews using this framework
          </CardDescription>
        </CardHeader>
        <CardContent>
          {framework.checkCategories.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No check categories defined for this framework.
            </p>
          ) : (
            <div className="space-y-3">
              {framework.checkCategories.map((category) => (
                <div
                  key={category.id}
                  className={`border rounded-lg p-4 ${
                    category.isEnabled ? '' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {category.isEnabled ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {checkTypeLabels[category.checkType] || category.checkType}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        severityColors[category.defaultSeverity]
                      }`}
                    >
                      {category.defaultSeverity}
                    </span>
                  </div>
                  {category.description && (
                    <p className="mt-2 text-sm text-muted-foreground ml-8">
                      {category.description}
                    </p>
                  )}
                  {category.regulatoryReferences && category.regulatoryReferences.length > 0 && (
                    <div className="mt-2 ml-8 flex flex-wrap gap-1">
                      {category.regulatoryReferences.map((ref) => (
                        <span
                          key={ref}
                          className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
                        >
                          {ref}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
