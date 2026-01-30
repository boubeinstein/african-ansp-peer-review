export type ReviewTab = "overview" | "workspace" | "documents" | "findings" | "report" | "settings";

export interface ReviewTabConfig {
  id: ReviewTab;
  labelKey: string;
  icon: string;
  badge?: number;
  badgeVariant?: "default" | "destructive" | "secondary" | "outline";
}

export const REVIEW_TABS: ReviewTabConfig[] = [
  { id: "overview", labelKey: "overview", icon: "LayoutDashboard" },
  { id: "workspace", labelKey: "workspace", icon: "MessageSquare" },
  { id: "documents", labelKey: "documents", icon: "FileText" },
  { id: "findings", labelKey: "findings", icon: "AlertTriangle" },
  { id: "report", labelKey: "report", icon: "FileOutput" },
  { id: "settings", labelKey: "settings", icon: "Settings" },
];
