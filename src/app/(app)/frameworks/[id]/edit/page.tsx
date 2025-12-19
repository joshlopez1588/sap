'use client';

import { useState, useEffect, use } from 'react';
import { FrameworkForm } from '@/components/frameworks/framework-form';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Framework {
  id: string;
  name: string;
  description: string | null;
  reviewFrequency: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  attestationType: 'SINGLE' | 'DUAL';
  isDefault: boolean;
  regulatoryScope: string[] | null;
  thresholds: { dormantDays?: number; warningDays?: number; criticalDays?: number } | null;
  checkCategories: Array<{
    id: string;
    name: string;
    checkType: string;
    description: string | null;
    isEnabled: boolean;
    defaultSeverity: string;
    severityRules: Record<string, string> | null;
    regulatoryReferences: string[] | null;
    sortOrder: number | null;
  }>;
}

export default function EditFrameworkPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [framework, setFramework] = useState<Framework | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/frameworks/${framework.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Framework</h1>
          <p className="text-muted-foreground">{framework.name}</p>
        </div>
      </div>

      <FrameworkForm
        mode="edit"
        initialData={{
          id: framework.id,
          name: framework.name,
          description: framework.description || '',
          reviewFrequency: framework.reviewFrequency,
          attestationType: framework.attestationType,
          regulatoryScope: framework.regulatoryScope || [],
          thresholds: framework.thresholds || {},
          isDefault: framework.isDefault,
          checkCategories: framework.checkCategories.map((c) => ({
            id: c.id,
            name: c.name,
            checkType: c.checkType,
            description: c.description || undefined,
            isEnabled: c.isEnabled,
            defaultSeverity: c.defaultSeverity,
            severityRules: c.severityRules || undefined,
            regulatoryReferences: c.regulatoryReferences || undefined,
            sortOrder: c.sortOrder || undefined,
          })),
        }}
      />
    </div>
  );
}
