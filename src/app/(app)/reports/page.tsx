'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileBarChart,
  Download,
  FileText,
  Shield,
  Package,
  Loader2,
  Plus,
  X,
  Save,
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  reportType: string;
  format: string;
  fileSize: number | null;
  generatedAt: string;
  reviewCycle: {
    id: string;
    name: string;
    application: { id: string; name: string };
  } | null;
  generatedBy: { name: string | null; email: string };
}

interface ReviewCycle {
  id: string;
  name: string;
  application: { name: string };
}

const reportTypes = [
  {
    id: 'executive_summary',
    name: 'Executive Summary',
    description: '2-4 page overview for leadership and audit committee',
    icon: FileBarChart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    format: 'PDF',
  },
  {
    id: 'detailed_findings',
    name: 'Detailed Findings Report',
    description: 'Complete findings with AI rationale and decisions',
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    format: 'PDF',
  },
  {
    id: 'remediation_tracker',
    name: 'Remediation Tracker',
    description: 'Open items with due dates and owners',
    icon: FileBarChart,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    format: 'XLSX',
  },
  {
    id: 'attestation_certificate',
    name: 'Attestation Certificate',
    description: 'Formal compliance certification document',
    icon: Shield,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    format: 'PDF',
  },
  {
    id: 'evidence_package',
    name: 'Evidence Package',
    description: 'Complete ZIP archive for examiners/auditors',
    icon: Package,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    format: 'ZIP',
  },
];

const reportTypeLabels: Record<string, string> = {
  executive_summary: 'Executive Summary',
  detailed_findings: 'Detailed Findings',
  remediation_tracker: 'Remediation Tracker',
  attestation_certificate: 'Attestation Certificate',
  evidence_package: 'Evidence Package',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [reviewCycles, setReviewCycles] = useState<ReviewCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<typeof reportTypes[0] | null>(null);
  const [selectedReviewCycleId, setSelectedReviewCycleId] = useState('');
  const [reportName, setReportName] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      const [reportsRes, reviewsRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/reviews'),
      ]);

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.data || []);
      }

      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        setReviewCycles(data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openGenerateModal = (reportType: typeof reportTypes[0]) => {
    setSelectedReportType(reportType);
    setReportName('');
    setSelectedReviewCycleId('');
    setShowGenerateModal(true);
  };

  const handleGenerate = async () => {
    if (!selectedReportType || !reportName) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: selectedReportType.id,
          name: reportName,
          format: selectedReportType.format,
          reviewCycleId: selectedReviewCycleId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate report');
      }

      setShowGenerateModal(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Generate and download compliance reports
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4 text-red-600 dark:text-red-400">
          {error}
          <Button variant="link" onClick={() => setError(null)} className="ml-2">
            Dismiss
          </Button>
        </div>
      )}

      {/* Report Types */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Generate New Report</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => openGenerateModal(report)}
            >
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
                    <p className="text-xs text-muted-foreground mt-2">
                      Format: {report.format}
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
        {reports.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No reports yet</h3>
              <p className="text-muted-foreground text-center">
                Generate your first report by selecting a report type above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {reportTypeLabels[report.reportType] || report.reportType} | {report.format} | {formatFileSize(report.fileSize)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Generated: {new Date(report.generatedAt).toLocaleDateString()}
                          {report.reviewCycle && ` | ${report.reviewCycle.application.name}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && selectedReportType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${selectedReportType.bgColor}`}>
                    <selectedReportType.icon className={`h-5 w-5 ${selectedReportType.color}`} />
                  </div>
                  <h3 className="font-semibold">{selectedReportType.name}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowGenerateModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportName">Report Name *</Label>
                <Input
                  id="reportName"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder={`e.g., Q4 2025 ${selectedReportType.name}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewCycle">Review Cycle (optional)</Label>
                <select
                  id="reviewCycle"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedReviewCycleId}
                  onChange={(e) => setSelectedReviewCycleId(e.target.value)}
                >
                  <option value="">All reviews</option>
                  {reviewCycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.name} - {cycle.application?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowGenerateModal(false)} disabled={generating}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={generating || !reportName}>
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
