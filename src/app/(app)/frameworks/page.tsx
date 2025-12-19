'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Framework {
  id: string;
  name: string;
  description: string | null;
  reviewFrequency: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  attestationType: 'SINGLE' | 'DUAL';
  isDefault: boolean;
  isActive: boolean;
  regulatoryScope: string[] | null;
  thresholds: { dormantDays?: number; warningDays?: number; criticalDays?: number } | null;
  checkCategories: Array<{
    id: string;
    name: string;
    checkType: string;
    isEnabled: boolean;
  }>;
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

export default function FrameworksPage() {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFrameworks() {
      try {
        const response = await fetch('/api/frameworks');
        if (!response.ok) {
          throw new Error('Failed to fetch frameworks');
        }
        const data = await response.json();
        setFrameworks(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchFrameworks();
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
          <h1 className="text-2xl font-bold">Frameworks</h1>
          <p className="text-muted-foreground">
            Manage review frameworks and check categories
          </p>
        </div>
        <Link href="/frameworks/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Framework
          </Button>
        </Link>
      </div>

      {frameworks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No frameworks yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first framework to define how access reviews should be conducted.
            </p>
            <Link href="/frameworks/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Framework
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {frameworks.map((framework) => (
            <Link href={`/frameworks/${framework.id}`} key={framework.id}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{framework.name}</CardTitle>
                    </div>
                    {framework.isDefault && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Default
                      </span>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {framework.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        {framework._count.applications} app{framework._count.applications !== 1 ? 's' : ''}
                      </span>
                      <span className="text-muted-foreground">
                        {framework.checkCategories.filter(c => c.isEnabled).length} check{framework.checkCategories.filter(c => c.isEnabled).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                      {frequencyLabels[framework.reviewFrequency] || framework.reviewFrequency}
                    </span>
                  </div>
                  {framework.regulatoryScope && framework.regulatoryScope.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {framework.regulatoryScope.slice(0, 3).map((reg) => (
                        <span
                          key={reg}
                          className="rounded bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 text-xs text-blue-700 dark:text-blue-300"
                        >
                          {reg}
                        </span>
                      ))}
                      {framework.regulatoryScope.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{framework.regulatoryScope.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
