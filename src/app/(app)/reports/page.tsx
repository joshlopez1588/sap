import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileBarChart, Download, FileText, Shield, Package } from 'lucide-react';

const reportTypes = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description: '2-4 page overview for leadership and audit committee',
    icon: FileBarChart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'detailed',
    name: 'Detailed Findings Report',
    description: 'Complete findings with AI rationale and decisions',
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'remediation',
    name: 'Remediation Tracker',
    description: 'Open items with due dates and owners',
    icon: FileBarChart,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    id: 'attestation',
    name: 'Attestation Certificate',
    description: 'Formal compliance certification document',
    icon: Shield,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 'evidence',
    name: 'Evidence Package',
    description: 'Complete ZIP archive for examiners/auditors',
    icon: Package,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
];

const recentReports = [
  {
    id: '1',
    name: 'Q3 2025 Executive Summary - Wire Transfer System',
    type: 'Executive Summary',
    generatedAt: '2025-10-01',
    format: 'PDF',
    size: '256 KB',
  },
  {
    id: '2',
    name: 'Q3 2025 Detailed Findings - Core Banking',
    type: 'Detailed Findings',
    generatedAt: '2025-10-01',
    format: 'PDF',
    size: '1.2 MB',
  },
  {
    id: '3',
    name: 'Q3 2025 Evidence Package - All Applications',
    type: 'Evidence Package',
    generatedAt: '2025-10-05',
    format: 'ZIP',
    size: '15.4 MB',
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Generate and download compliance reports
        </p>
      </div>

      {/* Report Types */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Generate New Report</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => (
            <Card key={report.id} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-3 ${report.bgColor}`}>
                    <report.icon className={`h-6 w-6 ${report.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{report.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {report.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Reports</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.type} • {report.format} • {report.size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Generated: {report.generatedAt}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
