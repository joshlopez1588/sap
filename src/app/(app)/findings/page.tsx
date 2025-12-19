import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Filter, User, Building2 } from 'lucide-react';

const findings = [
  {
    id: '1',
    title: 'Terminated Employee Access',
    type: 'TERMINATED_ACCESS',
    severity: 'CRITICAL',
    status: 'OPEN',
    user: 'John Smith',
    application: 'Wire Transfer System',
    roles: ['Wire Initiator', 'Wire Approver'],
    createdAt: '2025-12-15',
  },
  {
    id: '2',
    title: 'Segregation of Duties Violation',
    type: 'SOD_CONFLICT',
    severity: 'CRITICAL',
    status: 'IN_REVIEW',
    user: 'Jane Doe',
    application: 'Wire Transfer System',
    roles: ['Wire Initiator', 'Wire Approver'],
    createdAt: '2025-12-14',
  },
  {
    id: '3',
    title: 'Privileged Access Without Justification',
    type: 'PRIVILEGED_ACCESS',
    severity: 'HIGH',
    status: 'OPEN',
    user: 'Bob Wilson',
    application: 'Core Banking System',
    roles: ['System Admin'],
    createdAt: '2025-12-13',
  },
  {
    id: '4',
    title: 'Dormant Account - No Login 120 Days',
    type: 'DORMANT_ACCOUNT',
    severity: 'MEDIUM',
    status: 'PENDING_REMEDIATION',
    user: 'Alice Brown',
    application: 'Online Banking Portal',
    roles: ['User'],
    createdAt: '2025-12-12',
  },
];

const severityConfig: Record<string, { color: string; bgColor: string }> = {
  CRITICAL: { color: 'text-red-700', bgColor: 'bg-red-100' },
  HIGH: { color: 'text-orange-700', bgColor: 'bg-orange-100' },
  MEDIUM: { color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  LOW: { color: 'text-green-700', bgColor: 'bg-green-100' },
  INFO: { color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'bg-red-100 text-red-700' },
  IN_REVIEW: { label: 'In Review', color: 'bg-blue-100 text-blue-700' },
  PENDING_REMEDIATION: { label: 'Pending Remediation', color: 'bg-yellow-100 text-yellow-700' },
  REMEDIATED: { label: 'Remediated', color: 'bg-green-100 text-green-700' },
  EXCEPTION_APPROVED: { label: 'Exception', color: 'bg-purple-100 text-purple-700' },
  DISMISSED: { label: 'Dismissed', color: 'bg-gray-100 text-gray-700' },
};

export default function FindingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Findings</h1>
          <p className="text-muted-foreground">
            Review and resolve security findings
          </p>
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries({ CRITICAL: 2, HIGH: 5, MEDIUM: 3, LOW: 1 }).map(([severity, count]) => (
          <Card key={severity}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${severityConfig[severity].color}`}>
                  {severity}
                </span>
                <span className="text-2xl font-bold">{count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {findings.map((finding) => {
          const severity = severityConfig[finding.severity];
          const status = statusConfig[finding.status];

          return (
            <Card key={finding.id} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-3 ${severity.bgColor}`}>
                    <AlertTriangle className={`h-5 w-5 ${severity.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{finding.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {finding.user}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {finding.application}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {finding.roles.map((role) => (
                            <span key={role} className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severity.bgColor} ${severity.color}`}>
                          {finding.severity}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
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
