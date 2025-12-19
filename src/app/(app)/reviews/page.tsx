import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList, Play, CheckCircle, Clock } from 'lucide-react';

const reviews = [
  {
    id: '1',
    name: 'Q4 2025 Review',
    application: 'Wire Transfer System',
    framework: 'High-Risk Framework',
    status: 'IN_REVIEW',
    dueDate: '2025-12-31',
    findings: { critical: 3, high: 5, medium: 2, low: 1 },
    progress: 65,
  },
  {
    id: '2',
    name: 'Q4 2025 Review',
    application: 'Core Banking System',
    framework: 'Standard Review Framework',
    status: 'DATA_COLLECTION',
    dueDate: '2026-01-15',
    findings: { critical: 0, high: 0, medium: 0, low: 0 },
    progress: 20,
  },
  {
    id: '3',
    name: 'Q3 2025 Review',
    application: 'Online Banking Portal',
    framework: 'Standard Review Framework',
    status: 'COMPLETED',
    dueDate: '2025-09-30',
    findings: { critical: 1, high: 3, medium: 5, low: 2 },
    progress: 100,
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Clock },
  DATA_COLLECTION: { label: 'Data Collection', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ANALYSIS_PENDING: { label: 'Analysis Pending', color: 'bg-blue-100 text-blue-700', icon: Play },
  ANALYSIS_COMPLETE: { label: 'Analysis Complete', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  IN_REVIEW: { label: 'In Review', color: 'bg-purple-100 text-purple-700', icon: ClipboardList },
  PENDING_ATTESTATION: { label: 'Pending Attestation', color: 'bg-orange-100 text-orange-700', icon: Clock },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-100 text-gray-700', icon: Clock },
};

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Cycles</h1>
          <p className="text-muted-foreground">
            Manage user access review cycles
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Review
        </Button>
      </div>

      <div className="grid gap-4">
        {reviews.map((review) => {
          const status = statusConfig[review.status];
          const StatusIcon = status.icon;
          const totalFindings =
            review.findings.critical + review.findings.high + review.findings.medium + review.findings.low;

          return (
            <Card key={review.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <ClipboardList className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{review.name}</h3>
                      <p className="text-sm font-medium">{review.application}</p>
                      <p className="text-sm text-muted-foreground">{review.framework}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Due: {review.dueDate}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {totalFindings > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        {review.findings.critical > 0 && (
                          <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                            {review.findings.critical} Critical
                          </span>
                        )}
                        {review.findings.high > 0 && (
                          <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-medium">
                            {review.findings.high} High
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground mb-1">
                      Progress: {review.progress}%
                    </div>
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          review.progress === 100 ? 'bg-green-500' : 'bg-primary'
                        }`}
                        style={{ width: `${review.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
