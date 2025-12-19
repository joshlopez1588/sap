import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const frameworks = [
  {
    id: '1',
    name: 'Standard Review Framework',
    description: 'Standard quarterly access review framework for general applications.',
    frequency: 'Quarterly',
    isDefault: true,
    applications: 8,
    checks: 6,
  },
  {
    id: '2',
    name: 'High-Risk Framework',
    description: 'Enhanced review framework for high-risk applications.',
    frequency: 'Quarterly',
    isDefault: false,
    applications: 3,
    checks: 8,
  },
  {
    id: '3',
    name: 'SOX-Critical Framework',
    description: 'Specialized framework for SOX-critical applications.',
    frequency: 'Quarterly',
    isDefault: false,
    applications: 2,
    checks: 10,
  },
];

export default function FrameworksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Frameworks</h1>
          <p className="text-muted-foreground">
            Manage review frameworks and check categories
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Framework
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {frameworks.map((framework) => (
          <Card key={framework.id} className="hover:border-primary/50 transition-colors cursor-pointer">
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
              <CardDescription>{framework.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {framework.applications} apps
                  </span>
                  <span className="text-muted-foreground">
                    {framework.checks} checks
                  </span>
                </div>
                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                  {framework.frequency}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
