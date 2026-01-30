"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format, isPast, isToday } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  { id: "TODO", labelKey: "todo" },
  { id: "IN_PROGRESS", labelKey: "inProgress" },
  { id: "IN_REVIEW", labelKey: "inReview" },
  { id: "DONE", labelKey: "done" },
];

const priorityColors: Record<string, string> = {
  URGENT: "border-l-red-500",
  HIGH: "border-l-orange-500",
  MEDIUM: "border-l-yellow-500",
  LOW: "border-l-green-500",
};

export function TasksBoard({ tasks, reviewId: _reviewId }: TasksBoardProps) {
  const t = useTranslations("reviews.detail.workspace.tasksList");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const isOverdue = (dueDate: Date | null) => {
    return dueDate && isPast(dueDate) && !isToday(dueDate);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statusColumns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);

        return (
          <div key={column.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{t(`columns.${column.labelKey}`)}</h3>
              <Badge variant="secondary">{columnTasks.length}</Badge>
            </div>

            <div className="space-y-2 min-h-[200px] p-2 bg-muted/30 rounded-lg">
              {columnTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  {t("emptyColumn")}
                </p>
              ) : (
                columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-shadow border-l-4",
                      priorityColors[task.priority] || "border-l-gray-300"
                    )}
                  >
                    <CardContent className="p-3">
                      <p className="text-sm font-medium mb-2 line-clamp-2">{task.title}</p>

                      <div className="flex items-center justify-between">
                        {task.dueDate && (
                          <div className={cn(
                            "flex items-center gap-1 text-xs",
                            isOverdue(task.dueDate) ? "text-red-600" : "text-muted-foreground"
                          )}>
                            {isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3" />}
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
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
