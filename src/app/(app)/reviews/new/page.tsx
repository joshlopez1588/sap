'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

interface Application {
  id: string;
  name: string;
  frameworkId: string | null;
}

interface Framework {
  id: string;
  name: string;
}

export default function NewReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [formData, setFormData] = useState({
    name: `Q${currentQuarter} ${currentYear} Review`,
    applicationId: '',
    frameworkId: '',
    year: currentYear,
    quarter: currentQuarter,
    dueDate: '',
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [appsRes, fwRes] = await Promise.all([
          fetch('/api/applications'),
          fetch('/api/frameworks'),
        ]);

        if (appsRes.ok) {
          const data = await appsRes.json();
          setApplications(data.data || []);
        }

        if (fwRes.ok) {
          const data = await fwRes.json();
          setFrameworks(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    }
    fetchData();
  }, []);

  // Auto-select framework when application is selected
  useEffect(() => {
    if (formData.applicationId) {
      const app = applications.find((a) => a.id === formData.applicationId);
      if (app?.frameworkId) {
        setFormData((prev) => ({ ...prev, frameworkId: app.frameworkId! }));
      }
    }
  }, [formData.applicationId, applications]);

  // Update review name when quarter or year changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      name: `Q${prev.quarter} ${prev.year} Review`,
    }));
  }, [formData.quarter, formData.year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dueDate: formData.dueDate || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create review');
      }

      const { data } = await response.json();
      router.push(`/reviews/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reviews">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Review Cycle</h1>
          <p className="text-muted-foreground">
            Create a new user access review cycle
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Review Details</CardTitle>
            <CardDescription>Configure the review cycle parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Review Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Q4 2025 Review"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="applicationId">Application *</Label>
                <select
                  id="applicationId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.applicationId}
                  onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                  required
                >
                  <option value="">Select an application...</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frameworkId">Framework *</Label>
                <select
                  id="frameworkId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.frameworkId}
                  onChange={(e) => setFormData({ ...formData, frameworkId: e.target.value })}
                  required
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

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <select
                  id="year"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  required
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quarter">Quarter *</Label>
                <select
                  id="quarter"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.quarter}
                  onChange={(e) => setFormData({ ...formData, quarter: parseInt(e.target.value) })}
                  required
                >
                  <option value="1">Q1</option>
                  <option value="2">Q2</option>
                  <option value="3">Q3</option>
                  <option value="4">Q4</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Link href="/reviews">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !formData.applicationId || !formData.frameworkId}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Create Review
          </Button>
        </div>
      </form>
    </div>
  );
}
