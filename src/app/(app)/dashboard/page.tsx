import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ClipboardList,
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';

const stats = [
  {
    name: 'Active Reviews',
    value: '3',
    description: 'Currently in progress',
    icon: ClipboardList,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    name: 'Open Findings',
    value: '24',
    description: '8 critical, 12 high',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    name: 'Applications',
    value: '12',
    description: 'Under review',
    icon: Building2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    name: 'Completed',
    value: '156',
    description: 'Reviews this year',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
];

const upcomingReviews = [
  {
    application: 'Wire Transfer System',
    dueDate: 'Dec 31, 2025',
    status: 'In Progress',
    findings: 8,
  },
  {
    application: 'Core Banking',
    dueDate: 'Jan 15, 2026',
    status: 'Data Collection',
    findings: 0,
  },
  {
    application: 'Online Banking Portal',
    dueDate: 'Jan 31, 2026',
    status: 'Not Started',
    findings: 0,
  },
];

const recentActivity = [
  { action: 'Finding resolved', details: 'Terminated access removed for John Doe', time: '2 hours ago' },
  { action: 'Review started', details: 'Q4 2025 review for Wire Transfer System', time: '5 hours ago' },
  { action: 'Exception approved', details: 'SoD exception for Jane Smith', time: '1 day ago' },
  { action: 'Report generated', details: 'Executive Summary for Core Banking', time: '2 days ago' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your user access review activities
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm font-medium">{stat.name}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Reviews */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Upcoming Reviews</CardTitle>
            </div>
            <CardDescription>Reviews due in the next 60 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingReviews.map((review, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{review.application}</p>
                    <p className="text-sm text-muted-foreground">Due: {review.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        review.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-700'
                          : review.status === 'Data Collection'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {review.status}
                    </span>
                    {review.findings > 0 && (
                      <p className="mt-1 text-sm text-red-600">{review.findings} findings</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <CardDescription>Latest actions across all reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.details}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Findings by Severity */}
      <Card>
        <CardHeader>
          <CardTitle>Open Findings by Severity</CardTitle>
          <CardDescription>Distribution of unresolved findings across all reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 h-32">
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 bg-red-500 rounded-t" style={{ height: '80px' }} />
              <span className="text-sm font-medium">Critical</span>
              <span className="text-xs text-muted-foreground">8</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 bg-orange-500 rounded-t" style={{ height: '120px' }} />
              <span className="text-sm font-medium">High</span>
              <span className="text-xs text-muted-foreground">12</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 bg-yellow-500 rounded-t" style={{ height: '40px' }} />
              <span className="text-sm font-medium">Medium</span>
              <span className="text-xs text-muted-foreground">3</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 bg-green-500 rounded-t" style={{ height: '10px' }} />
              <span className="text-sm font-medium">Low</span>
              <span className="text-xs text-muted-foreground">1</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
