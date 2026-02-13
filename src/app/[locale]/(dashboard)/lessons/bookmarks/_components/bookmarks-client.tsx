"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bookmark,
  BookmarkX,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// =============================================================================
// Types
// =============================================================================

interface BookmarksClientProps {
  locale: string;
  searchParams: {
    page?: string;
    sortBy?: string;
  };
}

// =============================================================================
// Component
// =============================================================================

export function BookmarksClient({
  locale,
  searchParams,
}: BookmarksClientProps) {
  const t = useTranslations("lessons.bookmarks");
  const tCommon = useTranslations("lessons");
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const page = parseInt(searchParams.page || "1", 10);
  const sortBy = (searchParams.sortBy || "bookmarked") as "bookmarked" | "created";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");

  // ---- Queries ----
  const bookmarksQuery = trpc.lessons.getMyBookmarks.useQuery({
    page,
    pageSize: 12,
  });

  // ---- Mutations ----
  const utils = trpc.useUtils();

  const unbookmarkMutation = trpc.lessons.bookmark.useMutation({
    onSuccess: () => {
      toast.success(t("removed"));
      void utils.lessons.getMyBookmarks.invalidate();
    },
  });

  const updateNotesMutation = trpc.lessons.updateBookmarkNotes.useMutation({
    onSuccess: () => {
      toast.success(t("notesSaved"));
      setEditingId(null);
      void utils.lessons.getMyBookmarks.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // ---- Handlers ----
  const goToPage = (newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (newPage > 1) params.set("page", newPage.toString());
      if (sortBy !== "bookmarked") params.set("sortBy", sortBy);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const handleSortChange = (newSort: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (newSort !== "bookmarked") params.set("sortBy", newSort);
      router.push(params.toString() ? `${pathname}?${params}` : pathname);
    });
  };

  const startEdit = (bookmarkId: string, currentNotes: string) => {
    setEditingId(bookmarkId);
    setEditNotes(currentNotes || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNotes("");
  };

  const saveNotes = (bookmarkId: string) => {
    updateNotesMutation.mutate({
      bookmarkId,
      notes: editNotes || null,
    });
  };

  // ---- Data ----
  const items = bookmarksQuery.data?.items ?? [];
  const totalPages = bookmarksQuery.data?.totalPages ?? 1;
  const totalCount = bookmarksQuery.data?.totalCount ?? 0;

  const baseLessonsPath = pathname.replace("/bookmarks", "");

  return (
    <>
      {/* Sort bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount > 0
            ? t("count", { count: totalCount })
            : ""}
        </p>
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bookmarked">{t("sortBookmarked")}</SelectItem>
            <SelectItem value="created">{t("sortCreated")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {bookmarksQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3 mb-3" />
              <div className="h-12 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!bookmarksQuery.isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Bookmark className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t("emptyTitle")}
          </h3>
          <p className="text-muted-foreground max-w-md mb-4">
            {t("emptyDescription")}
          </p>
          <Button variant="outline" asChild>
            <Link href={baseLessonsPath}>
              {t("browseKnowledgeBase")}
            </Link>
          </Button>
        </div>
      )}

      {/* Bookmark list */}
      {!bookmarksQuery.isLoading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((bookmark) => {
            const lesson = bookmark.lesson;
            const title = locale === "fr" ? lesson.titleFr : lesson.titleEn;
            const isEditing = editingId === bookmark.id;

            return (
              <Card key={bookmark.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Lesson info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`${baseLessonsPath}/${lesson.id}`}
                          className="text-sm font-medium hover:underline truncate"
                        >
                          {title}
                        </Link>
                        <Link
                          href={`${baseLessonsPath}/${lesson.id}`}
                          className="shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </Link>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {lesson.category}
                        </Badge>
                        {lesson.impactLevel && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {lesson.impactLevel}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {t("bookmarkedOn", {
                            date: new Date(bookmark.createdAt).toLocaleDateString(
                              locale === "fr" ? "fr-FR" : "en-GB",
                              { day: "numeric", month: "short", year: "numeric" }
                            ),
                          })}
                        </span>
                      </div>

                      {/* Personal notes */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder={t("notesPlaceholder")}
                            className="text-sm min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => saveNotes(bookmark.id)}
                              disabled={updateNotesMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              {t("save")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              {tCommon("detail.cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          {bookmark.notes ? (
                            <p className="text-xs text-muted-foreground italic flex-1">
                              {bookmark.notes}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 flex-1">
                              {t("noNotes")}
                            </p>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => startEdit(bookmark.id, bookmark.notes ?? "")}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            <span className="text-[10px]">{t("editNotes")}</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Unbookmark button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => unbookmarkMutation.mutate({ lessonId: lesson.id })}
                      disabled={unbookmarkMutation.isPending}
                    >
                      <BookmarkX className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {tCommon("pagination.previous")}
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            {tCommon("pagination.page", { page, totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
          >
            {tCommon("pagination.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
