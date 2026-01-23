"use client";

/**
 * Analytics Chart Components
 *
 * Recharts-based visualizations for the analytics dashboard.
 */

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// =============================================================================
// COLORS
// =============================================================================

const COLORS = {
  primary: "#1e3a5f",
  secondary: "#64748b",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  // Severity colors
  critical: "#dc2626",
  major: "#f97316",
  minor: "#eab308",
  observation: "#3b82f6",
  // Status colors
  draft: "#9ca3af",
  submitted: "#3b82f6",
  underReview: "#8b5cf6",
  accepted: "#22c55e",
  inProgress: "#f59e0b",
  completed: "#10b981",
  verified: "#059669",
  closed: "#6b7280",
  rejected: "#ef4444",
};

// =============================================================================
// REVIEW STATUS CHART
// =============================================================================

interface ReviewStatusData {
  status: string;
  count: number;
}

export function ReviewStatusChart({ data }: { data: ReviewStatusData[] }) {
  const chartData = data.map((item) => ({
    name: formatStatus(item.status),
    value: item.count,
    fill: getStatusColor(item.status),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
          outerRadius={100}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// REVIEW TREND CHART
// =============================================================================

interface ReviewTrendData {
  month: string;
  year: number;
  count: number;
}

export function ReviewTrendChart({ data }: { data: ReviewTrendData[] }) {
  const chartData = data.map((item) => ({
    name: `${item.month} ${item.year}`,
    reviews: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="reviews"
          stroke={COLORS.primary}
          fillOpacity={1}
          fill="url(#colorReviews)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// FINDING SEVERITY CHART
// =============================================================================

interface FindingSeverityData {
  severity: string;
  count: number;
}

export function FindingSeverityChart({ data }: { data: FindingSeverityData[] }) {
  const chartData = data.map((item) => ({
    name: formatSeverity(item.severity),
    value: item.count,
    fill: getSeverityColor(item.severity),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={100} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// FINDING TREND CHART
// =============================================================================

interface FindingTrendData {
  month: string;
  year: number;
  total: number;
  critical: number;
  major: number;
  minor: number;
  observation: number;
}

export function FindingTrendChart({ data }: { data: FindingTrendData[] }) {
  const chartData = data.map((item) => ({
    name: `${item.month} ${item.year}`,
    Critical: item.critical,
    Major: item.major,
    Minor: item.minor,
    Observation: item.observation,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="Critical"
          stackId="1"
          stroke={COLORS.critical}
          fill={COLORS.critical}
        />
        <Area
          type="monotone"
          dataKey="Major"
          stackId="1"
          stroke={COLORS.major}
          fill={COLORS.major}
        />
        <Area
          type="monotone"
          dataKey="Minor"
          stackId="1"
          stroke={COLORS.minor}
          fill={COLORS.minor}
        />
        <Area
          type="monotone"
          dataKey="Observation"
          stackId="1"
          stroke={COLORS.observation}
          fill={COLORS.observation}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// CAP STATUS CHART
// =============================================================================

interface CAPStatusData {
  status: string;
  count: number;
}

export function CAPStatusChart({ data }: { data: CAPStatusData[] }) {
  const chartData = data.map((item) => ({
    name: formatCAPStatus(item.status),
    value: item.count,
    fill: getCAPStatusColor(item.status),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// REVIEWER PERFORMANCE CHART
// =============================================================================

interface ReviewerPerformanceData {
  reviewerId: string;
  reviewerName: string;
  organizationName: string;
  reviewsCompleted: number;
  reviewsInProgress: number;
  findingsRaised: number;
  isAvailable: boolean;
}

export function ReviewerPerformanceChart({
  data,
}: {
  data: ReviewerPerformanceData[];
}) {
  const chartData = data.map((item) => ({
    name: item.reviewerName.split(" ")[0], // First name only for space
    completed: item.reviewsCompleted,
    inProgress: item.reviewsInProgress,
    fullName: item.reviewerName,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value, name) => [value, name]}
          labelFormatter={(label, payload) => {
            if (payload && payload[0]) {
              return payload[0].payload.fullName;
            }
            return label;
          }}
        />
        <Legend />
        <Bar
          dataKey="completed"
          name="Completed"
          stackId="a"
          fill={COLORS.success}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="inProgress"
          name="In Progress"
          stackId="a"
          fill={COLORS.warning}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    REQUESTED: "Requested",
    APPROVED: "Approved",
    PLANNING: "Planning",
    SCHEDULED: "Scheduled",
    IN_PROGRESS: "In Progress",
    REPORT_DRAFTING: "Report Drafting",
    REPORT_REVIEW: "Report Review",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return statusMap[status] || status;
}

function formatSeverity(severity: string): string {
  const severityMap: Record<string, string> = {
    CRITICAL: "Critical",
    MAJOR: "Major",
    MINOR: "Minor",
    OBSERVATION: "Observation",
  };
  return severityMap[severity] || severity;
}

function formatCAPStatus(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    UNDER_REVIEW: "Under Review",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    VERIFIED: "Verified",
    CLOSED: "Closed",
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    REQUESTED: "#9ca3af",
    APPROVED: "#3b82f6",
    PLANNING: "#8b5cf6",
    SCHEDULED: "#06b6d4",
    IN_PROGRESS: "#f59e0b",
    REPORT_DRAFTING: "#ec4899",
    REPORT_REVIEW: "#a855f7",
    COMPLETED: "#22c55e",
    CANCELLED: "#ef4444",
  };
  return colorMap[status] || COLORS.secondary;
}

function getSeverityColor(severity: string): string {
  const colorMap: Record<string, string> = {
    CRITICAL: COLORS.critical,
    MAJOR: COLORS.major,
    MINOR: COLORS.minor,
    OBSERVATION: COLORS.observation,
  };
  return colorMap[severity] || COLORS.secondary;
}

function getCAPStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    DRAFT: "#9ca3af",
    SUBMITTED: "#3b82f6",
    UNDER_REVIEW: "#8b5cf6",
    ACCEPTED: "#22c55e",
    REJECTED: "#ef4444",
    IN_PROGRESS: "#f59e0b",
    COMPLETED: "#10b981",
    VERIFIED: "#059669",
    CLOSED: "#6b7280",
  };
  return colorMap[status] || COLORS.secondary;
}
