'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, X } from 'lucide-react';

interface Framework {
  id: string;
  name: string;
}

interface ApplicationFormData {
  name: string;
  description: string;
  vendor: string;
  systemOwner: string;
  businessUnit: string;
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  businessCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  regulatoryScope: string[];
  purpose: string;
  typicalUsers: string;
  sensitiveFunctions: string;
  accessRequestProcess: string;
  frameworkId: string | null;
}

interface ApplicationFormProps {
  initialData?: Partial<ApplicationFormData> & { id?: string };
  mode: 'create' | 'edit';
}

const REGULATORY_OPTIONS = ['FFIEC', 'NIST', 'SOX', 'GLBA', 'BSA', 'PCI'];

export function ApplicationForm({ initialData, mode }: ApplicationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);

  const [formData, setFormData] = useState<ApplicationFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    vendor: initialData?.vendor || '',
    systemOwner: initialData?.systemOwner || '',
    businessUnit: initialData?.businessUnit || '',
    dataClassification: initialData?.dataClassification || 'INTERNAL',
    businessCriticality: initialData?.businessCriticality || 'MEDIUM',
    regulatoryScope: initialData?.regulatoryScope || [],
    purpose: initialData?.purpose || '',
    typicalUsers: initialData?.typicalUsers || '',
    sensitiveFunctions: initialData?.sensitiveFunctions || '',
    accessRequestProcess: initialData?.accessRequestProcess || '',
    frameworkId: initialData?.frameworkId || null,
  });

  useEffect(() => {
    async function fetchFrameworks() {
      try {
        const response = await fetch('/api/frameworks');
        if (response.ok) {
          const data = await response.json();
          setFrameworks(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch frameworks:', err);
      }
    }
    fetchFrameworks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = mode === 'create' ? '/api/applications' : `/api/applications/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save application');
      }

      const { data } = await response.json();
      router.push(`/applications/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleRegulatory = (reg: string) => {
    const newScope = formData.regulatoryScope.includes(reg)
      ? formData.regulatoryScope.filter((r) => r !== reg)
      : [...formData.regulatoryScope, reg];
    setFormData({ ...formData, regulatoryScope: newScope });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Core details about the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Application Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Core Banking System"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the application and its primary function..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="e.g., FIS Global"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemOwner">System Owner</Label>
              <Input
                id="systemOwner"
                value={formData.systemOwner}
                onChange={(e) => setFormData({ ...formData, systemOwner: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessUnit">Business Unit</Label>
              <Input
                id="businessUnit"
                value={formData.businessUnit}
                onChange={(e) => setFormData({ ...formData, businessUnit: e.target.value })}
                placeholder="e.g., Operations"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frameworkId">Review Framework</Label>
              <select
                id="frameworkId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.frameworkId || ''}
                onChange={(e) => setFormData({ ...formData, frameworkId: e.target.value || null })}
              >
                <option value="">Select a framework...</option>
                {frameworks.map((fw) => (
                  <option key={fw.id} value={fw.id}>
                    {fw.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
          <CardDescription>Data sensitivity and business importance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dataClassification">Data Classification</Label>
              <select
                id="dataClassification"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.dataClassification}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dataClassification: e.target.value as typeof formData.dataClassification,
                  })
                }
              >
                <option value="PUBLIC">Public</option>
                <option value="INTERNAL">Internal</option>
                <option value="CONFIDENTIAL">Confidential</option>
                <option value="RESTRICTED">Restricted</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessCriticality">Business Criticality</Label>
              <select
                id="businessCriticality"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.businessCriticality}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    businessCriticality: e.target.value as typeof formData.businessCriticality,
                  })
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Regulatory Scope</Label>
            <div className="flex flex-wrap gap-2">
              {REGULATORY_OPTIONS.map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => toggleRegulatory(reg)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    formData.regulatoryScope.includes(reg)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Context */}
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis Context</CardTitle>
          <CardDescription>
            This information helps the AI understand the application for more accurate analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <textarea
              id="purpose"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="What is the primary business purpose of this application?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="typicalUsers">Typical Users</Label>
            <textarea
              id="typicalUsers"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.typicalUsers}
              onChange={(e) => setFormData({ ...formData, typicalUsers: e.target.value })}
              placeholder="Who typically uses this application and in what capacity?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sensitiveFunctions">Sensitive Functions</Label>
            <textarea
              id="sensitiveFunctions"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.sensitiveFunctions}
              onChange={(e) => setFormData({ ...formData, sensitiveFunctions: e.target.value })}
              placeholder="What sensitive or high-risk functions does this application provide?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessRequestProcess">Access Request Process</Label>
            <textarea
              id="accessRequestProcess"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.accessRequestProcess}
              onChange={(e) => setFormData({ ...formData, accessRequestProcess: e.target.value })}
              placeholder="How do users request access to this application?"
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {mode === 'create' ? 'Create Application' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
