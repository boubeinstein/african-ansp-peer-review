"use client";

/**
 * JoinRequestList Component
 *
 * Admin dashboard for viewing and managing join requests.
 * Includes stats, filtering by status, and navigation to detail view.
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { UserRole, JoinRequestStatus } from "@prisma/client";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc/client";
import { JoinRequestDetail } from "./join-request-detail";

interface JoinRequestListProps {
  userRole: UserRole;
  userId: string;
}

const statusConfig: Record<
  JoinRequestStatus,
  { icon: typeof Clock; color: string; bgColor: string }
> = {
  PENDING: { icon: Clock, color: "text-amber-700", bgColor: "bg-amber-50" },
  COORDINATOR_REVIEW: {
    icon: Eye,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  SC_REVIEW: {
    icon: FileText,
    color: "text-purple-700",
    bgColor: "bg-purple-50",
  },
  APPROVED: {
    icon: CheckCircle,
    color: "text-green-700",
    bgColor: "bg-green-50",
  },
  REJECTED: { icon: XCircle, color: "text-red-700", bgColor: "bg-red-50" },
  MORE_INFO: {
    icon: AlertCircle,
    color: "text-orange-700",
    bgColor: "bg-orange-50",
  },
  WITHDRAWN: { icon: XCircle, color: "text-slate-700", bgColor: "bg-slate-50" },
};

export function JoinRequestList({ userRole, userId }: JoinRequestListProps) {
  const t = useTranslations("joinRequestAdmin");
  const tStatus = useTranslations("joinRequest.status");
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch stats
  const { data: stats } = trpc.joinRequest.stats.useQuery();

  // Fetch all requests (we'll filter client-side for simplicity)
  const { data, isLoading, refetch } = trpc.joinRequest.list.useQuery({
    limit: 100,
  });

  // Status groups for filtering
  const inReviewStatuses: JoinRequestStatus[] = [
    JoinRequestStatus.COORDINATOR_REVIEW,
    JoinRequestStatus.SC_REVIEW,
    JoinRequestStatus.MORE_INFO,
  ];
  const decidedStatuses: JoinRequestStatus[] = [
    JoinRequestStatus.APPROVED,
    JoinRequestStatus.REJECTED,
  ];

  // Filter items based on tab
  const filteredItems = data?.items.filter((item) => {
    switch (activeTab) {
      case "pending":
        return item.status === JoinRequestStatus.PENDING;
      case "inReview":
        return inReviewStatuses.includes(item.status);
      case "decided":
        return decidedStatuses.includes(item.status);
      default:
        return true;
    }
  });

  // Get organization name based on locale (supports both linked org and free-text)
  const getOrgName = (org: { nameEn: string; nameFr: string } | null, request?: { organizationName?: string | null }) => {
    if (org) {
      return locale === "fr" ? org.nameFr : org.nameEn;
    }
    return request?.organizationName || "Unknown Organization";
  };

  const renderStatusBadge = (status: JoinRequestStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge
        variant="outline"
        className={`${config.bgColor} ${config.color} border-0`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {tStatus(status)}
      </Badge>
    );
  };

  if (selectedId) {
    return (
      <JoinRequestDetail
        id={selectedId}
        userRole={userRole}
        userId={userId}
        onBack={() => {
          setSelectedId(null);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-sm text-slate-600">{t("stats.total")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">
              {stats?.pending || 0}
            </div>
            <p className="text-sm text-slate-600">{t("stats.pending")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {stats?.approved || 0}
            </div>
            <p className="text-sm text-slate-600">{t("stats.approved")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {stats?.rejected || 0}
            </div>
            <p className="text-sm text-slate-600">{t("stats.rejected")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">{t("tabs.pending")}</TabsTrigger>
              <TabsTrigger value="inReview">{t("tabs.inReview")}</TabsTrigger>
              <TabsTrigger value="decided">{t("tabs.decided")}</TabsTrigger>
              <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : !filteredItems?.length ? (
            <div className="text-center py-8 text-slate-500">
              {t(`empty.${activeTab}`)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.organization")}</TableHead>
                  <TableHead>{t("table.contact")}</TableHead>
                  <TableHead>{t("table.submittedOn")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="w-[100px]">
                    {t("table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">
                        {getOrgName(request.organization, request)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {request.organization?.icaoCode || request.organizationIcaoCode || "N/A"} •{" "}
                        {request.organization?.country || request.organizationCountry || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{request.contactName}</div>
                      <div className="text-sm text-slate-500">
                        {request.contactEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{renderStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setSelectedId(request.id)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {t("actions.review")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
