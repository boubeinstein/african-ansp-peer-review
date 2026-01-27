"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { TaskStatus, TaskPriority } from "@prisma/client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MoreHorizontal,
  Calendar,
  CheckSquare,
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { CreateTaskDialog } from "./create-task-dialog";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Assignee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | Date | null;
  checklist: ChecklistItem[] | unknown | null;
  createdAt: string | Date;
  completedAt: string | Date | null;
  assignedTo: Assignee | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  completedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface TaskCardProps {
  task: Task;
  locale: string;
  userId: string;
  onUpdate: () => void;
}

// Status configuration
const STATUS_CONFIG: Record<TaskStatus, {
  icon: typeof Clock;
  color: string;
  bgColor: string;
}> = {
  PENDING: {
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  IN_PROGRESS: {
    icon: PlayCircle,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  COMPLETED: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  CANCELLED: {
    icon: XCircle,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
  },
};

// Priority configuration
const PRIORITY_CONFIG: Record<TaskPriority, {
  color: string;
  bgColor: string;
}> = {
  URGENT: {
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800",
  },
  HIGH: {
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
  },
  MEDIUM: {
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
  },
  LOW: {
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800",
  },
};

export function TaskCard({ task, locale, userId, onUpdate }: TaskCardProps) {
  const t = useTranslations("reviews.workspace.tasks");
  const dateLocale = locale === "fr" ? fr : enUS;

  const [showEditDialog, setShowEditDialog] = useState(false);

  const isCreator = task.createdBy.id === userId;
  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const StatusIcon = statusConfig.icon;

  // Checklist progress
  const checklist = (task.checklist as ChecklistItem[]) || [];
  const completedItems = checklist.filter((item) => item.completed).length;
  const checklistProgress = checklist.length > 0
    ? Math.round((completedItems / checklist.length) * 100)
    : 0;

  // Due date formatting
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && task.status !== "COMPLETED" && task.status !== "CANCELLED";
  const isDueToday = dueDate && isToday(dueDate);
  const isDueTomorrow = dueDate && isTomorrow(dueDate);

  // Mutations
  const updateStatusMutation = trpc.reviewTask.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t("card.statusUpdated"));
      onUpdate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.reviewTask.delete.useMutation({
    onSuccess: () => {
      toast.success(t("card.deleted"));
      onUpdate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateStatusMutation.mutate({ id: task.id, status: newStatus });
  };

  const handleDelete = () => {
    if (confirm(t("card.deleteConfirm"))) {
      deleteMutation.mutate({ id: task.id });
    }
  };

  const formatDueDate = () => {
    if (!dueDate) return null;
    if (isDueToday) return t("card.dueToday");
    if (isDueTomorrow) return t("card.dueTomorrow");
    return format(dueDate, "PPP", { locale: dateLocale });
  };

  return (
    <>
      <Card className={`${task.status === "COMPLETED" || task.status === "CANCELLED" ? "opacity-70" : ""} ${isOverdue ? "border-red-300 dark:border-red-800" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium leading-tight">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* Status submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        {t("card.changeStatus")}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                          const Icon = config.icon;
                          return (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => handleStatusChange(status as TaskStatus)}
                              disabled={task.status === status}
                            >
                              <Icon className={`mr-2 h-4 w-4 ${config.color}`} />
                              {t(`status.${status.toLowerCase()}`)}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("card.edit")}
                    </DropdownMenuItem>

                    {isCreator && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleDelete}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("card.delete")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status badge */}
                <Badge variant="secondary" className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {t(`status.${task.status.toLowerCase()}`)}
                </Badge>

                {/* Priority badge */}
                <Badge variant="outline" className={`${priorityConfig.bgColor} ${priorityConfig.color}`}>
                  {t(`priority.${task.priority.toLowerCase()}`)}
                </Badge>

                {/* Due date */}
                {dueDate && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`${isOverdue ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" : isDueToday ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300" : ""}`}
                        >
                          {isOverdue && <AlertTriangle className="h-3 w-3 mr-1" />}
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDueDate()}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {format(dueDate, "PPPp", { locale: dateLocale })}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Assignee */}
                {task.assignedTo && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {task.assignedTo.firstName[0]}
                              {task.assignedTo.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {task.assignedTo.firstName}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("card.assignedTo", {
                          name: `${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
                        })}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Checklist progress */}
              {checklist.length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <Progress value={checklistProgress} className="h-2 flex-1 max-w-[200px]" />
                  <span className="text-xs text-muted-foreground">
                    {completedItems}/{checklist.length}
                  </span>
                </div>
              )}

              {/* Completed info */}
              {task.status === "COMPLETED" && task.completedBy && (
                <p className="text-xs text-muted-foreground italic">
                  {t("card.completedBy", {
                    name: `${task.completedBy.firstName} ${task.completedBy.lastName}`,
                    date: format(new Date(task.completedAt!), "PPp", { locale: dateLocale }),
                  })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <CreateTaskDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        reviewId=""
        locale={locale}
        teamMembers={[]}
        onSuccess={() => {
          setShowEditDialog(false);
          onUpdate();
        }}
        editTask={task}
      />
    </>
  );
}
