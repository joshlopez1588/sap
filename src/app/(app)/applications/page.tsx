'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Building2, Loader2, Search, Shield, Users } from 'lucide-react';
import Link from 'next/link';

interface Application {
  id: string;
  name: string;
  description: string | null;
  vendor: string | null;
  systemOwner: string | null;
  businessUnit: string | null;
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  businessCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  profileCompleteness: number | null;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  framework: { id: string; name: string } | null;
  _count: {
    roles: number;
    sodConflicts: number;
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

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchApplications() {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);

        const response = await fetch(`/api/applications?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch applications');
        }
        const data = await response.json();
        setApplications(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(fetchApplications, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [search]);

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
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            Manage application profiles, roles, and SoD rules
          </p>
        </div>
        <Link href="/applications/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Application
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search applications..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {applications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No applications yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first application to start managing access reviews.
            </p>
            <Link href="/applications/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Application
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Link href={`/applications/${app.id}`} key={app.id}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{app.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {app.vendor || 'No vendor'} {app.systemOwner && `• Owner: ${app.systemOwner}`}
                        </p>
                        {app.businessUnit && (
                          <p className="text-sm text-muted-foreground">{app.businessUnit}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classificationColors[app.dataClassification]}`}>
                            {app.dataClassification}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${criticalityColors[app.businessCriticality]}`}>
                            {app.businessCriticality}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {app._count.roles} role{app._count.roles !== 1 ? 's' : ''}
                          </span>
                          {app._count.sodConflicts > 0 && (
                            <span className="flex items-center gap-1">
                              <Shield className="h-4 w-4" />
                              {app._count.sodConflicts} SoD rule{app._count.sodConflicts !== 1 ? 's' : ''}
                            </span>
                          )}
                          {app.framework && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                              {app.framework.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">
                        <span className="text-sm text-muted-foreground">Profile: </span>
                        <span className="font-medium">{app.profileCompleteness || 0}%</span>
                      </div>
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (app.profileCompleteness || 0) >= 80
                              ? 'bg-green-500'
                              : (app.profileCompleteness || 0) >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${app.profileCompleteness || 0}%` }}
                        />
                      </div>
                      {app.nextReviewDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Next review: {new Date(app.nextReviewDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
