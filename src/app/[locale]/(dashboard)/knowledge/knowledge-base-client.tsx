"use client";

/**
 * Knowledge Base — unified Best Practices + Lessons Learned hub
 *
 * Three tabs:
 *   1. Best Practices — peer-reviewed best practices browser
 *   2. Lessons Learned — searchable lessons knowledge base
 *   3. My Bookmarks — user's saved lesson bookmarks
 */

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lightbulb, BookOpen, Bookmark, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BestPracticesContent } from "../best-practices/_components/best-practices-content";
import { LessonsSearchClient } from "../lessons/_components/lessons-search-client";
import { BookmarksClient } from "../lessons/bookmarks/_components/bookmarks-client";

// =============================================================================
// TYPES
// =============================================================================

interface KnowledgeBaseClientProps {
  locale: string;
  canSubmitBP: boolean;
  userOrgId?: string | null;
}

type KBTab = "bestPractices" | "lessons" | "bookmarks";

const VALID_TABS: KBTab[] = ["bestPractices", "lessons", "bookmarks"];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function KnowledgeBaseClient({
  locale,
  canSubmitBP,
  userOrgId,
}: KnowledgeBaseClientProps) {
  const t = useTranslations("knowledge");
  const searchParams = useSearchParams();

  // Support ?tab= deep linking (e.g. redirect from /best-practices, /lessons)
  const tabParam = searchParams.get("tab") as KBTab | null;
  const defaultTab: KBTab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "bestPractices";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canSubmitBP && (
          <Button asChild>
            <Link href={`/${locale}/best-practices/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t("submitBestPractice")}
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bestPractices" className="gap-1.5">
            <Lightbulb className="h-4 w-4 hidden sm:inline" />
            {t("tabs.bestPractices")}
          </TabsTrigger>
          <TabsTrigger value="lessons" className="gap-1.5">
            <BookOpen className="h-4 w-4 hidden sm:inline" />
            {t("tabs.lessonsLearned")}
          </TabsTrigger>
          <TabsTrigger value="bookmarks" className="gap-1.5">
            <Bookmark className="h-4 w-4 hidden sm:inline" />
            {t("tabs.myBookmarks")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Best Practices */}
        <TabsContent value="bestPractices">
          <BestPracticesContent
            locale={locale}
            searchParams={{}}
            userOrgId={userOrgId}
          />
        </TabsContent>

        {/* Tab 2: Lessons Learned */}
        <TabsContent value="lessons">
          <LessonsSearchClient
            locale={locale}
            searchParams={{}}
            embedded
          />
        </TabsContent>

        {/* Tab 3: My Bookmarks */}
        <TabsContent value="bookmarks">
          <BookmarksClient
            locale={locale}
            searchParams={{}}
            embedded
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default KnowledgeBaseClient;
