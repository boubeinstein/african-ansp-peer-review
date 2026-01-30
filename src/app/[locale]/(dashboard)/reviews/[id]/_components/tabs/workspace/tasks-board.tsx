"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, AlertCircle, Search, LayoutGrid, List } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format, isPast, isToday } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TaskDetail } from "./task-detail";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignee: { id: string; name: string; image: string | null } | null;
}

interface TasksBoardProps {
  tasks: Task[];
  reviewId: string;
}

const statusColumns = [
  { id: "PENDING", labelKey: "pending", color: "border-t-gray-400" },
  { id: "IN_PROGRESS", labelKey: "inProgress", color: "border-t-blue-500" },
  { id: "COMPLETED", labelKey: "completed", color: "border-t-green-500" },
];

const priorityColors: Record<string, string> = {
  URGENT: "border-l-red-500",
  HIGH: "border-l-orange-500",
  MEDIUM: "border-l-yellow-500",
  LOW: "border-l-green-500",
};

const priorityOrder: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function TasksBoard({ tasks, reviewId }: TasksBoardProps) {
  const t = useTranslations("reviews.detail.workspace.tasksList");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const isOverdue = (dueDate: Date | null, status: string) =>
    dueDate && isPast(dueDate) && !isToday(dueDate) && status !== "COMPLETED";

  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesPriority && task.status !== "CANCELLED";
    })
    .sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
    );

  const getTasksByStatus = (status: string) =>
    filteredTasks.filter((t) => t.status === status);

  if (selectedTaskId) {
    return (
      <TaskDetail
        taskId={selectedTaskId}
        reviewId={reviewId}
        onBack={() => setSelectedTaskId(null)}
      />
    );
  }

  const TaskCard = ({ task }: { task: Task }) => (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all border-l-4",
        priorityColors[task.priority] || "border-l-gray-300",
        isOverdue(task.dueDate, task.status) && "ring-1 ring-red-300"
      )}
      onClick={() => setSelectedTaskId(task.id)}
    >
      <CardContent className="p-3">
        <p className="text-sm font-medium mb-2 line-clamp-2">{task.title}</p>
        <div className="flex items-center justify-between">
          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue(task.dueDate, task.status)
                  ? "text-red-600 font-medium"
                  : "text-muted-foreground"
              )}
            >
              {isOverdue(task.dueDate, task.status) && (
                <AlertCircle className="h-3 w-3" />
              )}
              <Calendar className="h-3 w-3" />
              {format(task.dueDate, "MMM d", { locale: dateLocale })}
            </div>
          )}
          {task.assignee && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.image || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(task.assignee.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder={t("filterPriority")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
              <SelectItem value="URGENT">{t("priorities.URGENT")}</SelectItem>
              <SelectItem value="HIGH">{t("priorities.HIGH")}</SelectItem>
              <SelectItem value="MEDIUM">{t("priorities.MEDIUM")}</SelectItem>
              <SelectItem value="LOW">{t("priorities.LOW")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "board" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("board")}
            aria-label={t("viewBoard")}
            className="rounded-r-none"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            aria-label={t("viewList")}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Board View */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusColumns.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            return (
              <div key={column.id} className="space-y-3">
                <div
                  className={cn(
                    "flex items-center justify-between border-t-2 pt-2",
                    column.color
                  )}
                >
                  <h3 className="font-medium text-sm">
                    {t(`columns.${column.labelKey}`)}
                  </h3>
                  <Badge variant="secondary">{columnTasks.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {columnTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      {t("emptyColumn")}
                    </p>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t("noResults")}</p>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card
                key={task.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 border-l-4",
                  priorityColors[task.priority] || "border-l-gray-300"
                )}
                onClick={() => setSelectedTaskId(task.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{task.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {t(`detail.status.${task.status}`)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {t(`priorities.${task.priority}`)}
                        </Badge>
                        {task.dueDate && (
                          <span
                            className={cn(
                              "flex items-center gap-1",
                              isOverdue(task.dueDate, task.status) &&
                                "text-red-600"
                            )}
                          >
                            <Calendar className="h-3 w-3" />
                            {format(task.dueDate, "MMM d", {
                              locale: dateLocale,
                            })}
                          </span>
                        )}
                        {task.assignee && <span>{task.assignee.name}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
