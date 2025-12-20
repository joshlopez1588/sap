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
  Edit,
  Trash2,
  Building2,
  Users,
  Shield,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Save,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface ApplicationRole {
  id: string;
  name: string;
  description: string | null;
  isPrivileged: boolean;
  riskLevel: string;
  createdAt: string;
}

interface SodConflict {
  id: string;
  conflictReason: string | null;
  severity: string;
  role1: ApplicationRole;
  role2: ApplicationRole;
}

interface ReviewCycle {
  id: string;
  name: string;
  status: string;
  year: number;
  quarter: number | null;
  totalFindings: number;
  criticalFindings: number;
  completedAt: string | null;
  createdAt: string;
}

interface Application {
  id: string;
  name: string;
  description: string | null;
  vendor: string | null;
  systemOwner: string | null;
  businessUnit: string | null;
  dataClassification: string;
  businessCriticality: string;
  regulatoryScope: string[] | null;
  purpose: string | null;
  typicalUsers: string | null;
  sensitiveFunctions: string | null;
  accessRequestProcess: string | null;
  profileCompleteness: number | null;
  isActive: boolean;
  framework: { id: string; name: string; reviewFrequency: string } | null;
  roles: ApplicationRole[];
  sodConflicts: SodConflict[];
  reviewCycles: ReviewCycle[];
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  createdAt: string;
  _count: {
    roles: number;
    sodConflicts: number;
    reviewCycles: number;
  };
}

const classificationColors: Record<string, string> = {
  PUBLIC: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INTERNAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONFIDENTIAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  RESTRICTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const criticalityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  DATA_COLLECTION: 'bg-blue-100 text-blue-700',
  ANALYSIS_PENDING: 'bg-yellow-100 text-yellow-700',
  ANALYSIS_COMPLETE: 'bg-purple-100 text-purple-700',
  IN_REVIEW: 'bg-orange-100 text-orange-700',
  PENDING_ATTESTATION: 'bg-pink-100 text-pink-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

type TabType = 'overview' | 'roles' | 'history';

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Role modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<ApplicationRole | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', isPrivileged: false, riskLevel: 'LOW' });
  const [savingRole, setSavingRole] = useState(false);

  // SoD modal state
  const [showSodModal, setShowSodModal] = useState(false);
  const [sodForm, setSodForm] = useState({ role1Id: '', role2Id: '', conflictReason: '', severity: 'HIGH' });
  const [savingSod, setSavingSod] = useState(false);

  const fetchApplication = async () => {
    try {
      const response = await fetch(`/api/applications/${resolvedParams.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Application not found');
        }
        throw new Error('Failed to fetch application');
      }
      const data = await response.json();
      setApplication(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [resolvedParams.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/applications/${resolvedParams.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete application');
      }
      router.push('/applications');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Role CRUD functions
  const handleSaveRole = async () => {
    setSavingRole(true);
    try {
      const url = editingRole
        ? `/api/applications/${resolvedParams.id}/roles/${editingRole.id}`
        : `/api/applications/${resolvedParams.id}/roles`;
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save role');
      }

      setShowRoleModal(false);
      setEditingRole(null);
      setRoleForm({ name: '', description: '', isPrivileged: false, riskLevel: 'LOW' });
      fetchApplication();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Delete this role?')) return;
    try {
      const response = await fetch(`/api/applications/${resolvedParams.id}/roles/${roleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete role');
      }
      fetchApplication();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  const openEditRole = (role: ApplicationRole) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      isPrivileged: role.isPrivileged,
      riskLevel: role.riskLevel,
    });
    setShowRoleModal(true);
  };

  // SoD CRUD functions
  const handleSaveSod = async () => {
    setSavingSod(true);
    try {
      const response = await fetch(`/api/applications/${resolvedParams.id}/sod-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sodForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save SoD conflict');
      }

      setShowSodModal(false);
      setSodForm({ role1Id: '', role2Id: '', conflictReason: '', severity: 'HIGH' });
      fetchApplication();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save SoD conflict');
    } finally {
      setSavingSod(false);
    }
  };

  const handleDeleteSod = async (conflictId: string) => {
    if (!confirm('Delete this SoD conflict?')) return;
    try {
      const response = await fetch(`/api/applications/${resolvedParams.id}/sod-conflicts/${conflictId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete SoD conflict');
      }
      fetchApplication();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete SoD conflict');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Application not found'}</p>
          <Link href="/applications">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
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
          <Link href="/applications">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{application.name}</h1>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classificationColors[application.dataClassification]}`}>
                  {application.dataClassification}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${criticalityColors[application.businessCriticality]}`}>
                  {application.businessCriticality}
                </span>
              </div>
              <p className="text-muted-foreground">
                {application.vendor || 'No vendor'} {application.systemOwner && `| Owner: ${application.systemOwner}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/applications/${application.id}/edit`}>
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
                  <p className="font-medium text-red-800 dark:text-red-200">Delete this application?</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {application._count.reviewCycles > 0
                      ? 'Application will be marked inactive (has review history).'
                      : 'This action cannot be undone.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Completeness */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Profile Completeness</p>
              <p className="text-2xl font-bold">{application.profileCompleteness || 0}%</p>
            </div>
            <div className="w-64 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (application.profileCompleteness || 0) >= 80
                    ? 'bg-green-500'
                    : (application.profileCompleteness || 0) >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${application.profileCompleteness || 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {(['overview', 'roles', 'history'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'roles' && `Roles & SoD (${application._count.roles})`}
              {tab === 'history' && `Review History (${application._count.reviewCycles})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1">{application.description || 'No description provided'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="mt-1">{application.vendor || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">System Owner</p>
                  <p className="mt-1">{application.systemOwner || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Business Unit</p>
                  <p className="mt-1">{application.businessUnit || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Framework</p>
                  <p className="mt-1">
                    {application.framework ? (
                      <Link href={`/frameworks/${application.framework.id}`} className="text-primary hover:underline">
                        {application.framework.name}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Context</CardTitle>
              <CardDescription>Information used for AI analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Purpose</p>
                <p className="mt-1">{application.purpose || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Typical Users</p>
                <p className="mt-1">{application.typicalUsers || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sensitive Functions</p>
                <p className="mt-1">{application.sensitiveFunctions || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Access Request Process</p>
                <p className="mt-1">{application.accessRequestProcess || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Regulatory Scope</CardTitle>
            </CardHeader>
            <CardContent>
              {application.regulatoryScope && application.regulatoryScope.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {application.regulatoryScope.map((reg) => (
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
              <CardTitle className="text-lg">Review Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Last Review</p>
                  <p className="mt-1">
                    {application.lastReviewDate
                      ? new Date(application.lastReviewDate).toLocaleDateString()
                      : 'Never reviewed'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Review</p>
                  <p className="mt-1">
                    {application.nextReviewDate
                      ? new Date(application.nextReviewDate).toLocaleDateString()
                      : 'Not scheduled'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Roles Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Application Roles</CardTitle>
                  <CardDescription>Roles defined for this application</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingRole(null);
                    setRoleForm({ name: '', description: '', isPrivileged: false, riskLevel: 'LOW' });
                    setShowRoleModal(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {application.roles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No roles defined yet.</p>
                  <p className="text-sm">Add roles to track access and create SoD rules.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {application.roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${role.isPrivileged ? 'bg-red-500' : 'bg-gray-400'}`} />
                        <div>
                          <p className="font-medium">{role.name}</p>
                          {role.description && (
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[role.riskLevel]}`}>
                          {role.riskLevel}
                        </span>
                        {role.isPrivileged && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                            Privileged
                          </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEditRole(role)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SoD Conflicts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Segregation of Duties Rules</CardTitle>
                  <CardDescription>Role combinations that create conflicts</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowSodModal(true)}
                  disabled={application.roles.length < 2}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add SoD Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {application.sodConflicts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No SoD rules defined yet.</p>
                  <p className="text-sm">
                    {application.roles.length < 2
                      ? 'Add at least 2 roles to create SoD rules.'
                      : 'Add rules to flag users with conflicting role combinations.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {application.sodConflicts.map((conflict) => (
                    <div key={conflict.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {conflict.role1.name}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <ChevronRight className="h-4 w-4 text-muted-foreground -ml-3" />
                            <span className="font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {conflict.role2.name}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[conflict.severity]}`}>
                            {conflict.severity}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteSod(conflict.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {conflict.conflictReason && (
                        <p className="mt-2 text-sm text-muted-foreground">{conflict.conflictReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review History</CardTitle>
            <CardDescription>Past access reviews for this application</CardDescription>
          </CardHeader>
          <CardContent>
            {application.reviewCycles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reviews conducted yet.</p>
                <p className="text-sm">Start a new review from the Reviews section.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {application.reviewCycles.map((cycle) => (
                  <Link href={`/reviews/${cycle.id}`} key={cycle.id}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div>
                        <p className="font-medium">{cycle.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {cycle.year} {cycle.quarter && `Q${cycle.quarter}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Findings</p>
                          <p className="font-medium">
                            {cycle.totalFindings} total
                            {cycle.criticalFindings > 0 && (
                              <span className="text-red-600 ml-1">({cycle.criticalFindings} critical)</span>
                            )}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[cycle.status]}`}>
                          {cycle.status.replace(/_/g, ' ')}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingRole ? 'Edit Role' : 'Add Role'}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowRoleModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleName">Role Name *</Label>
                <Input
                  id="roleName"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g., Administrator"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDescription">Description</Label>
                <textarea
                  id="roleDescription"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Describe this role..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="riskLevel">Risk Level</Label>
                <select
                  id="riskLevel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={roleForm.riskLevel}
                  onChange={(e) => setRoleForm({ ...roleForm, riskLevel: e.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrivileged"
                  checked={roleForm.isPrivileged}
                  onChange={(e) => setRoleForm({ ...roleForm, isPrivileged: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isPrivileged" className="font-normal">
                  Privileged Access
                </Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowRoleModal(false)} disabled={savingRole}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRole} disabled={savingRole || !roleForm.name}>
                  {savingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SoD Modal */}
      {showSodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add SoD Rule</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSodModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role1">Role 1 *</Label>
                <select
                  id="role1"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sodForm.role1Id}
                  onChange={(e) => setSodForm({ ...sodForm, role1Id: e.target.value })}
                >
                  <option value="">Select a role...</option>
                  {application.roles
                    .filter((r) => r.id !== sodForm.role2Id)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role2">Role 2 *</Label>
                <select
                  id="role2"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sodForm.role2Id}
                  onChange={(e) => setSodForm({ ...sodForm, role2Id: e.target.value })}
                >
                  <option value="">Select a role...</option>
                  {application.roles
                    .filter((r) => r.id !== sodForm.role1Id)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <select
                  id="severity"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sodForm.severity}
                  onChange={(e) => setSodForm({ ...sodForm, severity: e.target.value })}
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conflictReason">Conflict Reason</Label>
                <textarea
                  id="conflictReason"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sodForm.conflictReason}
                  onChange={(e) => setSodForm({ ...sodForm, conflictReason: e.target.value })}
                  placeholder="Explain why these roles conflict..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowSodModal(false)} disabled={savingSod}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSod}
                  disabled={savingSod || !sodForm.role1Id || !sodForm.role2Id}
                >
                  {savingSod ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
