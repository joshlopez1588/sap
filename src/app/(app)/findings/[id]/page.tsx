'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  User,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  Save,
} from 'lucide-react';
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
  decisionJustification: string | null;
  compensatingControls: string | null;
  remediationDueDate: string | null;
  remediationTicketId: string | null;
  exceptionExpiryDate: string | null;
  createdAt: string;
  decidedAt: string | null;
  reviewCycle: {
    id: string;
    name: string;
    application: {
      id: string;
      name: string;
      roles: Array<{ name: string; isPrivileged: boolean }>;
    };
  };
  userAccessRecord: {
    id: string;
    username: string;
    email: string | null;
    displayName: string | null;
    roles: string[] | null;
    lastLoginAt: string | null;
    employee: {
      fullName: string | null;
      department: string | null;
      jobTitle: string | null;
      employmentStatus: string;
      terminationDate: string | null;
    } | null;
  } | null;
  decidedBy: { name: string | null; email: string } | null;
}

const severityConfig: Record<string, { color: string; bgColor: string }> = {
  CRITICAL: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  HIGH: { color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  MEDIUM: { color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  LOW: { color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  INFO: { color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'bg-red-100 text-red-700' },
  IN_REVIEW: { label: 'In Review', color: 'bg-blue-100 text-blue-700' },
  PENDING_REMEDIATION: { label: 'Pending Remediation', color: 'bg-yellow-100 text-yellow-700' },
  REMEDIATED: { label: 'Remediated', color: 'bg-green-100 text-green-700' },
  EXCEPTION_APPROVED: { label: 'Exception Approved', color: 'bg-purple-100 text-purple-700' },
  DISMISSED: { label: 'Dismissed', color: 'bg-gray-100 text-gray-700' },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-500' },
};

const findingTypeLabels: Record<string, string> = {
  TERMINATED_ACCESS: 'Terminated Employee Access',
  ORPHANED_ACCOUNT: 'Orphaned Account',
  SOD_CONFLICT: 'Segregation of Duties Conflict',
  PRIVILEGED_ACCESS: 'Privileged Access',
  DORMANT_ACCOUNT: 'Dormant Account',
  INAPPROPRIATE_ACCESS: 'Inappropriate Access',
  UNAUTHORIZED_CHANGE: 'Unauthorized Change',
  MISSING_AUTHORIZATION: 'Missing Authorization',
  OTHER: 'Other',
};

export default function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Decision form state
  const [decision, setDecision] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [compensatingControls, setCompensatingControls] = useState('');
  const [remediationDueDate, setRemediationDueDate] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [exceptionExpiry, setExceptionExpiry] = useState('');

  const fetchFinding = async () => {
    try {
      const response = await fetch(`/api/findings/${resolvedParams.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Finding not found');
        }
        throw new Error('Failed to fetch finding');
      }
      const data = await response.json();
      setFinding(data.data);

      // Pre-fill form if decision exists
      if (data.data.decision) {
        setDecision(data.data.decision);
        setJustification(data.data.decisionJustification || '');
        setCompensatingControls(data.data.compensatingControls || '');
        setTicketId(data.data.remediationTicketId || '');
        if (data.data.remediationDueDate) {
          setRemediationDueDate(new Date(data.data.remediationDueDate).toISOString().split('T')[0]);
        }
        if (data.data.exceptionExpiryDate) {
          setExceptionExpiry(new Date(data.data.exceptionExpiryDate).toISOString().split('T')[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinding();
  }, [resolvedParams.id]);

  const handleSubmitDecision = async () => {
    if (!decision || !justification) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/findings/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          decisionJustification: justification,
          compensatingControls: compensatingControls || null,
          remediationDueDate: remediationDueDate || null,
          remediationTicketId: ticketId || null,
          exceptionExpiryDate: exceptionExpiry || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save decision');
      }

      fetchFinding();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save decision');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Finding not found'}</p>
          <Link href="/findings">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Findings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const severity = severityConfig[finding.severity] || severityConfig.INFO;
  const status = statusConfig[finding.status] || statusConfig.OPEN;
  const isDecided = finding.decision !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/findings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-3 ${severity.bgColor}`}>
              <AlertTriangle className={`h-6 w-6 ${severity.color}`} />
            </div>
            <div>
              <h1 className="text-xl font-bold">{finding.title}</h1>
              <p className="text-muted-foreground">
                {findingTypeLabels[finding.findingType] || finding.findingType}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${severity.bgColor} ${severity.color}`}>
            {finding.severity}
          </span>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Finding Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Finding Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="mt-1">{finding.description || 'No description provided'}</p>
            </div>

            {finding.aiRationale && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                  AI Analysis
                  {finding.aiConfidenceScore && (
                    <span className="ml-2 text-xs">
                      ({Math.round(parseFloat(finding.aiConfidenceScore))}% confidence)
                    </span>
                  )}
                </p>
                <p className="text-sm">{finding.aiRationale}</p>
              </div>
            )}

            {finding.suggestedRemediation && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                  Suggested Remediation
                </p>
                <p className="text-sm">{finding.suggestedRemediation}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Review</p>
                <Link href={`/reviews/${finding.reviewCycle.id}`} className="text-primary hover:underline">
                  {finding.reviewCycle.name}
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Application</p>
                <Link
                  href={`/applications/${finding.reviewCycle.application.id}`}
                  className="text-primary hover:underline"
                >
                  {finding.reviewCycle.application.name}
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{new Date(finding.createdAt).toLocaleDateString()}</p>
              </div>
              {finding.decidedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Decided</p>
                  <p>{new Date(finding.decidedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        {finding.userAccessRecord && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {finding.userAccessRecord.displayName || finding.userAccessRecord.username}
                  </p>
                  <p className="text-sm text-muted-foreground">{finding.userAccessRecord.email}</p>
                </div>
              </div>

              {finding.userAccessRecord.employee && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p>{finding.userAccessRecord.employee.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Job Title</p>
                    <p>{finding.userAccessRecord.employee.jobTitle || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={
                      finding.userAccessRecord.employee.employmentStatus === 'TERMINATED'
                        ? 'text-red-600 font-medium'
                        : ''
                    }>
                      {finding.userAccessRecord.employee.employmentStatus}
                    </p>
                  </div>
                  {finding.userAccessRecord.employee.terminationDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Terminated</p>
                      <p className="text-red-600">
                        {new Date(finding.userAccessRecord.employee.terminationDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {finding.userAccessRecord.roles?.map((role) => (
                    <span
                      key={role}
                      className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-sm"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              {finding.userAccessRecord.lastLoginAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p>{new Date(finding.userAccessRecord.lastLoginAt).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Decision Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isDecided ? 'Decision' : 'Make a Decision'}
          </CardTitle>
          <CardDescription>
            {isDecided
              ? `Decided by ${finding.decidedBy?.name || finding.decidedBy?.email}`
              : 'Select how to handle this finding'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Decision Type Selection */}
          <div className="grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setDecision('REMEDIATE')}
              disabled={isDecided}
              className={`p-4 border rounded-lg text-left transition-colors ${
                decision === 'REMEDIATE'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'hover:border-gray-400'
              } ${isDecided && decision !== 'REMEDIATE' ? 'opacity-50' : ''}`}
            >
              <CheckCircle className={`h-6 w-6 mb-2 ${decision === 'REMEDIATE' ? 'text-green-600' : 'text-muted-foreground'}`} />
              <p className="font-medium">Remediate</p>
              <p className="text-sm text-muted-foreground">Assign for fix</p>
            </button>

            <button
              type="button"
              onClick={() => setDecision('EXCEPTION')}
              disabled={isDecided}
              className={`p-4 border rounded-lg text-left transition-colors ${
                decision === 'EXCEPTION'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'hover:border-gray-400'
              } ${isDecided && decision !== 'EXCEPTION' ? 'opacity-50' : ''}`}
            >
              <Shield className={`h-6 w-6 mb-2 ${decision === 'EXCEPTION' ? 'text-purple-600' : 'text-muted-foreground'}`} />
              <p className="font-medium">Exception</p>
              <p className="text-sm text-muted-foreground">Accept with controls</p>
            </button>

            <button
              type="button"
              onClick={() => setDecision('DISMISS')}
              disabled={isDecided}
              className={`p-4 border rounded-lg text-left transition-colors ${
                decision === 'DISMISS'
                  ? 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
                  : 'hover:border-gray-400'
              } ${isDecided && decision !== 'DISMISS' ? 'opacity-50' : ''}`}
            >
              <XCircle className={`h-6 w-6 mb-2 ${decision === 'DISMISS' ? 'text-gray-600' : 'text-muted-foreground'}`} />
              <p className="font-medium">Dismiss</p>
              <p className="text-sm text-muted-foreground">False positive</p>
            </button>
          </div>

          {/* Decision Details */}
          {decision && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="justification">Justification *</Label>
                <textarea
                  id="justification"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain the rationale for this decision..."
                  disabled={isDecided}
                />
              </div>

              {decision === 'REMEDIATE' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Remediation Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={remediationDueDate}
                      onChange={(e) => setRemediationDueDate(e.target.value)}
                      disabled={isDecided}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticketId">Ticket ID</Label>
                    <Input
                      id="ticketId"
                      value={ticketId}
                      onChange={(e) => setTicketId(e.target.value)}
                      placeholder="e.g., JIRA-1234"
                      disabled={isDecided}
                    />
                  </div>
                </div>
              )}

              {decision === 'EXCEPTION' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="controls">Compensating Controls *</Label>
                    <textarea
                      id="controls"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={compensatingControls}
                      onChange={(e) => setCompensatingControls(e.target.value)}
                      placeholder="Describe the controls that mitigate this risk..."
                      disabled={isDecided}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Exception Expiry Date</Label>
                    <Input
                      id="expiry"
                      type="date"
                      value={exceptionExpiry}
                      onChange={(e) => setExceptionExpiry(e.target.value)}
                      disabled={isDecided}
                    />
                  </div>
                </>
              )}

              {!isDecided && (
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSubmitDecision}
                    disabled={saving || !justification || (decision === 'EXCEPTION' && !compensatingControls)}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Submit Decision
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
