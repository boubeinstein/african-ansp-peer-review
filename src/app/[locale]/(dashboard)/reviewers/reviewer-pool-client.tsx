"use client";

/**
 * Reviewer Pool — unified Reviewers + Teams hub
 *
 * Two tabs:
 *   1. Reviewer Directory — searchable reviewer list with filters
 *   2. Regional Teams — 5 regional peer support teams overview
 */

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserPlus,
  Calendar,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewerDirectory } from "@/components/features/reviewer/reviewer-directory";
import { TeamsListClient } from "../teams/teams-list-client";
import type { UserRole } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewerPoolClientProps {
  locale: string;
  userContext: {
    id: string;
    role: UserRole;
    organizationId: string | null | undefined;
  };
  isAdmin: boolean;
}

type RPTab = "directory" | "teams";

const VALID_TABS: RPTab[] = ["directory", "teams"];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReviewerPoolClient({
  locale,
  userContext,
  isAdmin,
}: ReviewerPoolClientProps) {
  const t = useTranslations("reviewerPool");
  const tR = useTranslations("reviewers");
  const searchParams = useSearchParams();

  // Support ?tab= deep linking (e.g. redirect from /teams)
  const tabParam = searchParams.get("tab") as RPTab | null;
  const defaultTab: RPTab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "directory";

  // Stats — placeholder values matching the original page
  const stats = {
    total: 99,
    selected: 45,
    active: 38,
    available: 32,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/${locale}/reviewers/matching`}>
                <Sparkles className="h-4 w-4 mr-2" />
                {tR("actions.buildTeam") || "Build Review Team"}
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/${locale}/reviewers/new`}>
                <UserPlus className="h-4 w-4 mr-2" />
                {tR("actions.addReviewer")}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="directory" className="gap-1.5">
            <Users className="h-4 w-4 hidden sm:inline" />
            {t("tabs.directory")}
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-1.5">
            <UsersRound className="h-4 w-4 hidden sm:inline" />
            {t("tabs.teams")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Reviewer Directory */}
        <TabsContent value="directory" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tR("stats.total")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tR("stats.selected")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">{stats.selected}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tR("stats.active")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{stats.active}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tR("stats.available")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  <span className="text-2xl font-bold">{stats.available}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <ReviewerDirectory userContext={userContext} />
        </TabsContent>

        {/* Tab 2: Regional Teams */}
        <TabsContent value="teams">
          <TeamsListClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReviewerPoolClient;
