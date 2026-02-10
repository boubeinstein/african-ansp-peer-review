"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  CheckSquare,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReviewData } from "../../_lib/fetch-review-data";
import { SessionBanner } from "@/components/collaboration/session-banner";
import { TeamActivityFeed } from "@/components/collaboration/team-activity-feed";
import { DiscussionsList } from "./workspace/discussions-list";
import { TasksBoard } from "./workspace/tasks-board";
import { NewDiscussionDialog } from "./workspace/new-discussion-dialog";
import { NewTaskDialog } from "./workspace/new-task-dialog";

interface WorkspaceTabProps {
  review: ReviewData;
  userId?: string;
  locale?: string;
}

export function WorkspaceTab({ review, userId, locale = "en" }: WorkspaceTabProps) {
  const t = useTranslations("reviews.detail.workspace");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showNewDiscussion, setShowNewDiscussion] = useState(
    searchParams.get("action") === "discussion"
  );
  const [showNewTask, setShowNewTask] = useState(
    searchParams.get("action") === "task"
  );

  // Transform tasks for the board component
  const tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    assignee: { id: string; name: string; image: string | null } | null;
  }> = review.tasks.map((t: { id: string; status: string }) => ({
    id: t.id,
    title: "Task",
    status: t.status,
    priority: "MEDIUM",
    dueDate: null,
    assignee: null,
  }));

  const openDiscussions = review.discussions.filter((d: { isResolved: boolean }) => !d.isResolved).length;
  const openTasks = tasks.filter(
    (t) => t.status !== "DONE" && t.status !== "CANCELLED"
  ).length;

  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Session Banner */}
      <SessionBanner
        reviewId={review.id}
        reviewReference={review.referenceNumber}
        userId={userId}
      />

      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Primary action */}
        <Button
          size="sm"
          onClick={() => navigateToTab("findings")}
        >
          <AlertTriangle className="mr-1.5 h-4 w-4" />
          {t("quickActions.addFinding")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToTab("documents")}
        >
          <Upload className="mr-1.5 h-4 w-4" />
          {t("quickActions.uploadDocument")}
        </Button>

        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewDiscussion(true)}
        >
          <MessageSquare className="mr-1.5 h-4 w-4" />
          {t("quickActions.newDiscussion")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewTask(true)}
        >
          <CheckSquare className="mr-1.5 h-4 w-4" />
          {t("quickActions.createTask")}
        </Button>
      </div>

      {/* Team Activity Feed */}
      <TeamActivityFeed
        reviewId={review.id}
        locale={locale}
      />

      {/* Discussions & Tasks */}
      <div className="pt-2">
        <Tabs defaultValue="discussions" className="space-y-3">
          <TabsList>
            <TabsTrigger value="discussions" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              {t("discussions")}
              {openDiscussions > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {openDiscussions}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5">
              <CheckSquare className="h-3.5 w-3.5" />
              {t("tasks")}
              {openTasks > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {openTasks}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussions" className="mt-3">
            <DiscussionsList
              reviewId={review.id}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-3">
            <TasksBoard
              tasks={tasks}
              reviewId={review.id}
            />
          </TabsContent>
        </Tabs>
      </div>

      <NewDiscussionDialog
        open={showNewDiscussion}
        onOpenChange={setShowNewDiscussion}
        reviewId={review.id}
      />

      <NewTaskDialog
        open={showNewTask}
        onOpenChange={setShowNewTask}
        reviewId={review.id}
      />
    </div>
  );
}
