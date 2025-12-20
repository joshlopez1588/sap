'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ApplicationForm } from '@/components/applications/application-form';

export default function NewApplicationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/applications">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Application</h1>
          <p className="text-muted-foreground">
            Create a new application profile for access reviews
          </p>
        </div>
      </div>

      <ApplicationForm mode="create" />
    </div>
  );
}
