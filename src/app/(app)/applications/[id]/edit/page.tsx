'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ApplicationForm } from '@/components/applications/application-form';

interface Application {
  id: string;
  name: string;
  description: string | null;
  vendor: string | null;
  systemOwner: string | null;
  businessUnit: string | null;
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  businessCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  regulatoryScope: string[] | null;
  purpose: string | null;
  typicalUsers: string | null;
  sensitiveFunctions: string | null;
  accessRequestProcess: string | null;
  frameworkId: string | null;
}

export default function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApplication() {
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
    }
    fetchApplication();
  }, [resolvedParams.id]);

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
      <div className="flex items-center gap-4">
        <Link href={`/applications/${application.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit {application.name}</h1>
          <p className="text-muted-foreground">
            Update application profile details
          </p>
        </div>
      </div>

      <ApplicationForm
        mode="edit"
        initialData={{
          id: application.id,
          name: application.name,
          description: application.description || '',
          vendor: application.vendor || '',
          systemOwner: application.systemOwner || '',
          businessUnit: application.businessUnit || '',
          dataClassification: application.dataClassification,
          businessCriticality: application.businessCriticality,
          regulatoryScope: application.regulatoryScope || [],
          purpose: application.purpose || '',
          typicalUsers: application.typicalUsers || '',
          sensitiveFunctions: application.sensitiveFunctions || '',
          accessRequestProcess: application.accessRequestProcess || '',
          frameworkId: application.frameworkId,
        }}
      />
    </div>
  );
}
