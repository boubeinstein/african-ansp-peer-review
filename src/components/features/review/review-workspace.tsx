"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { MessageSquare, CheckSquare, Loader2 } from "lucide-react";
import { DiscussionList, TaskList } from "./workspace";

interface ReviewWorkspaceProps {
  reviewId: string;
  locale: string;
  userId: string;
  defaultTab?: string;
}

export function ReviewWorkspace({
  reviewId,
  locale,
  userId,
  defaultTab = "discussions",
}: ReviewWorkspaceProps) {
  const t = useTranslations("reviews.workspace");
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Fetch stats for badges
  const { data: discussionStats, isLoading: loadingDiscussions } =
    trpc.reviewDiscussion.getStats.useQuery({ reviewId });

  const { data: taskStats, isLoading: loadingTasks } =
    trpc.reviewTask.getStats.useQuery({ reviewId });

  return (
    <Card className="p-0 overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b bg-muted/30 px-4">
          <TabsList className="h-12 bg-transparent gap-4">
            {/* Discussions Tab */}
            <TabsTrigger
              value="discussions"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              {t("tabs.discussions")}
              {loadingDiscussions ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : discussionStats && discussionStats.unresolved > 0 ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {discussionStats.unresolved}
                </Badge>
              ) : null}
            </TabsTrigger>

            {/* Tasks Tab */}
            <TabsTrigger
              value="tasks"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              {t("tabs.tasks")}
              {loadingTasks ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : taskStats && taskStats.pending + taskStats.inProgress > 0 ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {taskStats.pending + taskStats.inProgress}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Discussions Content */}
        <TabsContent value="discussions" className="m-0 p-4">
          <DiscussionList reviewId={reviewId} locale={locale} userId={userId} />
        </TabsContent>

        {/* Tasks Content */}
        <TabsContent value="tasks" className="m-0 p-4">
          <TaskList reviewId={reviewId} locale={locale} userId={userId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
