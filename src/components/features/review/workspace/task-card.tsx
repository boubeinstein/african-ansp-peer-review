"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: string | Date | null;
    assignedTo: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
    checklist: unknown;
    createdAt: string | Date;
  };
  locale: string;
  userId: string;
  onUpdate: () => void;
}

export function TaskCard({ task, locale, userId, onUpdate }: TaskCardProps) {
  const t = useTranslations("reviews.workspace.tasks");

  // Placeholder - will be implemented in Prompt 10b
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-medium">{task.title}</p>
        <p className="text-sm text-muted-foreground">
          Task card coming in Prompt 10b...
        </p>
      </CardContent>
    </Card>
  );
}
