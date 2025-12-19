import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Shield, AlertTriangle } from 'lucide-react';

const applications = [
  {
    id: '1',
    name: 'Wire Transfer System',
    vendor: 'FIS Global',
    owner: 'Sarah Johnson',
    businessUnit: 'Treasury Operations',
    classification: 'Confidential',
    criticality: 'Critical',
    completeness: 80,
    lastReview: '2025-09-30',
    nextReview: '2025-12-31',
  },
  {
    id: '2',
    name: 'Core Banking System',
    vendor: 'Fiserv',
    owner: 'Michael Chen',
    businessUnit: 'IT Operations',
    classification: 'Restricted',
    criticality: 'Critical',
    completeness: 95,
    lastReview: '2025-09-30',
    nextReview: '2026-01-15',
  },
  {
    id: '3',
    name: 'Online Banking Portal',
    vendor: 'Internal',
    owner: 'Jessica Williams',
    businessUnit: 'Digital Banking',
    classification: 'Internal',
    criticality: 'High',
    completeness: 70,
    lastReview: '2025-06-30',
    nextReview: '2026-01-31',
  },
];

const classificationColors: Record<string, string> = {
  Public: 'bg-green-100 text-green-700',
  Internal: 'bg-blue-100 text-blue-700',
  Confidential: 'bg-yellow-100 text-yellow-700',
  Restricted: 'bg-red-100 text-red-700',
};

const criticalityColors: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            Manage application profiles, roles, and SoD rules
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      <div className="grid gap-4">
        {applications.map((app) => (
          <Card key={app.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{app.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {app.vendor} • Owner: {app.owner}
                    </p>
                    <p className="text-sm text-muted-foreground">{app.businessUnit}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classificationColors[app.classification]}`}>
                        {app.classification}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${criticalityColors[app.criticality]}`}>
                        {app.criticality}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <span className="text-sm text-muted-foreground">Profile: </span>
                    <span className="font-medium">{app.completeness}%</span>
                  </div>
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${app.completeness}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Next review: {app.nextReview}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
