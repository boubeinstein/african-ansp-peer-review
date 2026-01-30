"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  MoreHorizontal,
  Calendar,
  User,
  Flag,
  Clock,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TaskForm } from "./task-form";

interface TaskDetailProps {
  taskId: string;
  reviewId: string;
  onBack: () => void;
}

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

const priorityConfig = {
  URGENT: { color: "text-red-600 bg-red-100", icon: "🔴" },
  HIGH: { color: "text-orange-600 bg-orange-100", icon: "🟠" },
  MEDIUM: { color: "text-yellow-600 bg-yellow-100", icon: "🟡" },
  LOW: { color: "text-green-600 bg-green-100", icon: "🟢" },
};

const statusConfig = {
  PENDING: { color: "bg-gray-100 text-gray-800" },
  IN_PROGRESS: { color: "bg-blue-100 text-blue-800" },
  COMPLETED: { color: "bg-green-100 text-green-800" },
  CANCELLED: { color: "bg-red-100 text-red-800" },
};

export function TaskDetail({ taskId, reviewId, onBack }: TaskDetailProps) {
  const t = useTranslations("reviews.detail.workspace.tasksList.detail");
  const tForm = useTranslations("reviews.detail.workspace.tasksList.form");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: task, isLoading } = trpc.reviewTask.getById.useQuery(
    { id: taskId },
    { enabled: !!taskId }
  );

  const { data: teamMembers } = trpc.reviewDiscussion.getTeamMembers.useQuery(
    { reviewId },
    { enabled: isEditing }
  );

  const formattedTeamMembers = teamMembers?.map((member) => ({
    id: member.id,
    name: `${member.firstName} ${member.lastName}`,
    image: null,
  })) || [];

  const updateStatusMutation = trpc.reviewTask.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t("statusUpdated"));
      utils.reviewTask.getById.invalidate({ id: taskId });
      utils.reviewTask.list.invalidate({ reviewId });
    },
    onError: (error) => toast.error(error.message || t("updateError")),
  });

  const deleteMutation = trpc.reviewTask.delete.useMutation({
    onSuccess: () => {
      toast.success(t("deleted"));
      utils.reviewTask.list.invalidate({ reviewId });
      onBack();
    },
    onError: (error) => toast.error(error.message || t("deleteError")),
  });

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();

  const isOverdue = (dueDate: Date | null) =>
    dueDate && isPast(dueDate) && !isToday(dueDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("cancelEdit")}
        </Button>
        <Card>
          <CardHeader>
            <h3 className="font-semibold">{t("editTask")}</h3>
          </CardHeader>
          <CardContent>
            <TaskForm
              reviewId={reviewId}
              teamMembers={formattedTeamMembers}
              editTaskId={taskId}
              defaultValues={{
                title: task.title,
                description: task.description || undefined,
                priority: task.priority,
                dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                assignedToId: task.assignedTo?.id,
              }}
              onSuccess={() => setIsEditing(false)}
              onCancel={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const assigneeName = task.assignedTo
    ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <h2 className="font-semibold text-xl">{task.title}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {t("created")}{" "}
                  {formatDistanceToNow(new Date(task.createdAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </span>
              </div>
            </div>
            <Select
              value={task.status}
              onValueChange={(status) =>
                updateStatusMutation.mutate({
                  id: taskId,
                  status: status as (typeof STATUS_OPTIONS)[number],
                })
              }
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "font-normal",
                        statusConfig[status].color
                      )}
                    >
                      {t(`status.${status}`)}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {task.description}
            </p>
          )}
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Priority */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Flag className="h-3 w-3" />
                {t("priority")}
              </p>
              <Badge
                variant="secondary"
                className={
                  priorityConfig[task.priority as keyof typeof priorityConfig]
                    ?.color
                }
              >
                {
                  priorityConfig[task.priority as keyof typeof priorityConfig]
                    ?.icon
                }{" "}
                {tForm(`priorities.${task.priority}`)}
              </Badge>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("dueDate")}
              </p>
              {task.dueDate ? (
                <div
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    isOverdue(new Date(task.dueDate)) &&
                      task.status !== "COMPLETED" &&
                      "text-red-600"
                  )}
                >
                  {isOverdue(new Date(task.dueDate)) &&
                    task.status !== "COMPLETED" && (
                      <AlertCircle className="h-4 w-4" />
                    )}
                  {task.status === "COMPLETED" && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {format(new Date(task.dueDate), "PPP", { locale: dateLocale })}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("noDueDate")}
                </span>
              )}
            </div>

            {/* Assignee */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {t("assignee")}
              </p>
              {task.assignedTo ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(
                        task.assignedTo.firstName,
                        task.assignedTo.lastName
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{assigneeName}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("unassigned")}
                </span>
              )}
            </div>
          </div>

          {/* Created by / Completed by info */}
          <Separator />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              {t("createdBy")}: {task.createdBy.firstName}{" "}
              {task.createdBy.lastName}
            </p>
            {task.completedBy && task.completedAt && (
              <p>
                {t("completedBy")}: {task.completedBy.firstName}{" "}
                {task.completedBy.lastName} -{" "}
                {format(new Date(task.completedAt), "PPP", {
                  locale: dateLocale,
                })}
              </p>
            )}
          </div>

          {/* Linked Discussion */}
          {task.discussion && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("linkedDiscussion")}
                </p>
                <p className="font-medium">{task.discussion.subject}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelDelete")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: taskId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
