"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  Plus,
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  User,
} from "lucide-react";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { TaskCard } from "./task-card";
import { CreateTaskDialog } from "./create-task-dialog";

interface TaskListProps {
  reviewId: string;
  locale: string;
  userId: string;
}

export function TaskList({ reviewId, locale, userId }: TaskListProps) {
  const t = useTranslations("reviews.workspace.tasks");

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch tasks
  const { data, isLoading, error, refetch } = trpc.reviewTask.list.useQuery({
    reviewId,
    page,
    pageSize: 10,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    priority: priorityFilter === "ALL" ? undefined : priorityFilter,
    assignedToId: assigneeFilter === "ALL" ? undefined : assigneeFilter === "ME" ? userId : assigneeFilter,
    sortBy: "dueDate",
    sortOrder: "asc",
  });

  // Fetch stats
  const { data: stats } = trpc.reviewTask.getStats.useQuery({ reviewId });

  // Fetch team members for filter
  const { data: teamMembers } = trpc.reviewDiscussion.getTeamMembers.useQuery({ reviewId });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      {stats && (
        <div className="flex flex-wrap items-center gap-3">
          <StatBadge
            icon={Clock}
            label={t("stats.pending")}
            count={stats.pending}
            color="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30"
          />
          <StatBadge
            icon={PlayCircle}
            label={t("stats.inProgress")}
            count={stats.inProgress}
            color="text-blue-600 bg-blue-100 dark:bg-blue-900/30"
          />
          <StatBadge
            icon={CheckCircle2}
            label={t("stats.completed")}
            count={stats.completed}
            color="text-green-600 bg-green-100 dark:bg-green-900/30"
          />
          {stats.overdue > 0 && (
            <StatBadge
              icon={AlertTriangle}
              label={t("stats.overdue")}
              count={stats.overdue}
              color="text-red-600 bg-red-100 dark:bg-red-900/30"
            />
          )}
          {stats.myTasks > 0 && (
            <StatBadge
              icon={User}
              label={t("stats.myTasks")}
              count={stats.myTasks}
              color="text-purple-600 bg-purple-100 dark:bg-purple-900/30"
            />
          )}
        </div>
      )}

      {/* Filters and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as TaskStatus | "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.allStatuses")}</SelectItem>
              <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t("status.inProgress")}</SelectItem>
              <SelectItem value="COMPLETED">{t("status.completed")}</SelectItem>
              <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select
            value={priorityFilter}
            onValueChange={(value) => {
              setPriorityFilter(value as TaskPriority | "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("filters.priority")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.allPriorities")}</SelectItem>
              <SelectItem value="URGENT">{t("priority.urgent")}</SelectItem>
              <SelectItem value="HIGH">{t("priority.high")}</SelectItem>
              <SelectItem value="MEDIUM">{t("priority.medium")}</SelectItem>
              <SelectItem value="LOW">{t("priority.low")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee filter */}
          <Select
            value={assigneeFilter}
            onValueChange={(value) => {
              setAssigneeFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("filters.assignee")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.allAssignees")}</SelectItem>
              <SelectItem value="ME">{t("filters.assignedToMe")}</SelectItem>
              {teamMembers?.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Create button */}
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("actions.newTask")}
        </Button>
      </div>

      {/* Task list */}
      {isLoading ? (
        <TaskListSkeleton />
      ) : data?.items.length === 0 ? (
        <EmptyTasks onCreateClick={() => setShowCreateDialog(true)} />
      ) : (
        <div className="space-y-3">
          {data?.items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              locale={locale}
              userId={userId}
              onUpdate={() => refetch()}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {t("pagination.page", { page, totalPages: data.totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        reviewId={reviewId}
        locale={locale}
        teamMembers={teamMembers || []}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />
    </div>
  );
}

// Stat badge component
interface StatBadgeProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  color: string;
}

function StatBadge({ icon: Icon, label, count, color }: StatBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${color}`}>
      <Icon className="h-4 w-4" />
      <span className="font-medium">{count}</span>
      <span className="text-xs opacity-80">{label}</span>
    </div>
  );
}

// Loading skeleton
function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Empty state
interface EmptyTasksProps {
  onCreateClick: () => void;
}

function EmptyTasks({ onCreateClick }: EmptyTasksProps) {
  const t = useTranslations("reviews.workspace.tasks.empty");

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <CheckSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{t("title")}</h3>
      <p className="text-muted-foreground max-w-md mb-4">{t("description")}</p>
      <Button onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" />
        {t("action")}
      </Button>
    </div>
  );
}
