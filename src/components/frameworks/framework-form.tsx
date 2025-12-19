'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, X, Plus, Trash2, GripVertical } from 'lucide-react';

interface CheckCategory {
  id?: string;
  name: string;
  checkType: string;
  description?: string;
  isEnabled: boolean;
  defaultSeverity: string;
  severityRules?: Record<string, string>;
  regulatoryReferences?: string[];
  sortOrder?: number;
}

interface FrameworkFormData {
  name: string;
  description: string;
  reviewFrequency: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  attestationType: 'SINGLE' | 'DUAL';
  regulatoryScope: string[];
  thresholds: {
    dormantDays?: number;
    warningDays?: number;
    criticalDays?: number;
  };
  isDefault: boolean;
  checkCategories: CheckCategory[];
}

interface FrameworkFormProps {
  initialData?: Partial<FrameworkFormData> & { id?: string };
  mode: 'create' | 'edit';
}

const CHECK_TYPES = [
  { value: 'EMPLOYMENT_STATUS', label: 'Employment Status' },
  { value: 'SEGREGATION_OF_DUTIES', label: 'Segregation of Duties' },
  { value: 'PRIVILEGED_ACCESS', label: 'Privileged Access' },
  { value: 'DORMANT_ACCOUNT', label: 'Dormant Account' },
  { value: 'ACCESS_APPROPRIATENESS', label: 'Access Appropriateness' },
  { value: 'ACCESS_AUTHORIZATION', label: 'Access Authorization' },
  { value: 'CUSTOM', label: 'Custom' },
];

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const REGULATORY_OPTIONS = ['FFIEC', 'NIST', 'SOX', 'GLBA', 'BSA', 'PCI'];

export function FrameworkForm({ initialData, mode }: FrameworkFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FrameworkFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    reviewFrequency: initialData?.reviewFrequency || 'QUARTERLY',
    attestationType: initialData?.attestationType || 'SINGLE',
    regulatoryScope: initialData?.regulatoryScope || [],
    thresholds: initialData?.thresholds || { dormantDays: 90, warningDays: 60 },
    isDefault: initialData?.isDefault || false,
    checkCategories: initialData?.checkCategories || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = mode === 'create' ? '/api/frameworks' : `/api/frameworks/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save framework');
      }

      const { data } = await response.json();
      router.push(`/frameworks/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addCheckCategory = () => {
    setFormData({
      ...formData,
      checkCategories: [
        ...formData.checkCategories,
        {
          name: '',
          checkType: 'CUSTOM',
          isEnabled: true,
          defaultSeverity: 'MEDIUM',
          sortOrder: formData.checkCategories.length,
        },
      ],
    });
  };

  const updateCheckCategory = (index: number, updates: Partial<CheckCategory>) => {
    const newCategories = [...formData.checkCategories];
    newCategories[index] = { ...newCategories[index], ...updates };
    setFormData({ ...formData, checkCategories: newCategories });
  };

  const removeCheckCategory = (index: number) => {
    setFormData({
      ...formData,
      checkCategories: formData.checkCategories.filter((_, i) => i !== index),
    });
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
          <CardDescription>Define the framework name and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Framework Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Standard Review Framework"
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
              placeholder="Describe the purpose and scope of this framework..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isDefault" className="font-normal">
              Set as default framework for new applications
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Review Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Review Settings</CardTitle>
          <CardDescription>Configure how reviews are conducted</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reviewFrequency">Review Frequency</Label>
              <select
                id="reviewFrequency"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.reviewFrequency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reviewFrequency: e.target.value as typeof formData.reviewFrequency,
                  })
                }
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="SEMI_ANNUAL">Semi-Annual</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attestationType">Attestation Type</Label>
              <select
                id="attestationType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.attestationType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    attestationType: e.target.value as typeof formData.attestationType,
                  })
                }
              >
                <option value="SINGLE">Single (One Approver)</option>
                <option value="DUAL">Dual (Two Approvers)</option>
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

      {/* Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Thresholds</CardTitle>
          <CardDescription>Configure threshold values for automated checks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dormantDays">Dormant Days</Label>
              <Input
                id="dormantDays"
                type="number"
                value={formData.thresholds.dormantDays || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, dormantDays: parseInt(e.target.value) || undefined },
                  })
                }
                placeholder="e.g., 90"
              />
              <p className="text-xs text-muted-foreground">Days without login before flagging as dormant</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warningDays">Warning Days</Label>
              <Input
                id="warningDays"
                type="number"
                value={formData.thresholds.warningDays || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, warningDays: parseInt(e.target.value) || undefined },
                  })
                }
                placeholder="e.g., 60"
              />
              <p className="text-xs text-muted-foreground">Days before approaching dormant threshold</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="criticalDays">Critical Days</Label>
              <Input
                id="criticalDays"
                type="number"
                value={formData.thresholds.criticalDays || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, criticalDays: parseInt(e.target.value) || undefined },
                  })
                }
                placeholder="e.g., 180"
              />
              <p className="text-xs text-muted-foreground">Days for critical severity dormant finding</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Check Categories</CardTitle>
              <CardDescription>Define what checks to perform during reviews</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCheckCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Add Check
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.checkCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No check categories defined yet.</p>
              <p className="text-sm">Click "Add Check" to create check categories for this framework.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.checkCategories.map((category, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 bg-muted/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                      <span className="text-sm font-medium">Check #{index + 1}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCheckCategory(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Check Name</Label>
                      <Input
                        value={category.name}
                        onChange={(e) => updateCheckCategory(index, { name: e.target.value })}
                        placeholder="e.g., Employment Status Verification"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Check Type</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={category.checkType}
                        onChange={(e) => updateCheckCategory(index, { checkType: e.target.value })}
                      >
                        {CHECK_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Severity</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={category.defaultSeverity}
                        onChange={(e) => updateCheckCategory(index, { defaultSeverity: e.target.value })}
                      >
                        {SEVERITIES.map((sev) => (
                          <option key={sev} value={sev}>
                            {sev}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        checked={category.isEnabled}
                        onChange={(e) => updateCheckCategory(index, { isEnabled: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label className="font-normal">Enabled</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={category.description || ''}
                      onChange={(e) => updateCheckCategory(index, { description: e.target.value })}
                      placeholder="Describe what this check verifies..."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
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
          {mode === 'create' ? 'Create Framework' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
