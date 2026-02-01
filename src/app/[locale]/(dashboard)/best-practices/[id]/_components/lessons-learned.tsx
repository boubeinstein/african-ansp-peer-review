"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/markdown";
import { toast } from "sonner";
import {
  Building2,
  ChevronDown,
  Clock,
  Globe,
  Lightbulb,
  MessageSquare,
  PenLine,
  Star,
  Target,
  ThumbsUp,
  Trophy,
} from "lucide-react";
import { isOversightRole, canAddLessonLearned } from "@/lib/permissions";
import type { UserRole } from "@/types/prisma-enums";

interface LessonsLearnedProps {
  bestPracticeId: string;
  locale: string;
  hasAdopted: boolean;
  userRole?: string;
  userOrgId?: string | null;
}

export function LessonsLearned({
  bestPracticeId,
  locale,
  hasAdopted,
  userRole,
  userOrgId,
}: LessonsLearnedProps) {
  const t = useTranslations("bestPractices.detail.lessons");
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();

  // Role-based permission check
  const isProgrammeRole = userRole ? isOversightRole(userRole as UserRole) : false;
  const canAddLesson = userRole
    ? canAddLessonLearned(userRole as UserRole, userOrgId)
    : false;
  // Programme roles can always add insights; ANSP roles can add if they adopted
  const showAddButton = canAddLesson && (isProgrammeRole || hasAdopted);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    challengesFaced: "",
    keySuccessFactors: "",
    recommendations: "",
    implementationDifficulty: 3,
    overallEffectiveness: 3,
    timeToImplementMonths: 6,
  });

  // Fetch lessons
  const { data: lessons, isLoading } = trpc.bestPractice.getLessons.useQuery({
    bestPracticeId,
  });

  // Add lesson mutation
  const addLesson = trpc.bestPractice.addLesson.useMutation({
    onSuccess: () => {
      toast.success(t("form.success"));
      setDialogOpen(false);
      setFormData({
        title: "",
        content: "",
        challengesFaced: "",
        keySuccessFactors: "",
        recommendations: "",
        implementationDifficulty: 3,
        overallEffectiveness: 3,
        timeToImplementMonths: 6,
      });
      utils.bestPractice.getLessons.invalidate({ bestPracticeId });
    },
  });

  // Mark helpful mutation
  const markHelpful = trpc.bestPractice.markLessonHelpful.useMutation({
    onSuccess: () => {
      utils.bestPractice.getLessons.invalidate({ bestPracticeId });
    },
  });

  const toggleExpanded = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLesson.mutate({
      bestPracticeId,
      ...formData,
    });
  };

  const renderStars = (value: number | null, max: number = 5) => {
    if (!value) return null;
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              i < value
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  const getDifficultyLabel = (value: number | null) => {
    if (!value) return "";
    return t(`difficulty.${value}` as "difficulty.1");
  };

  const getEffectivenessLabel = (value: number | null) => {
    if (!value) return "";
    return t(`effectiveness.${value}` as "effectiveness.1");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t("title")}
          </CardTitle>

          {showAddButton && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {isProgrammeRole ? (
                    <>
                      <Globe className="h-4 w-4 mr-2" />
                      {t("addInsight")}
                    </>
                  ) : (
                    <>
                      <PenLine className="h-4 w-4 mr-2" />
                      {t("shareExperience")}
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("form.title")}</DialogTitle>
                  <DialogDescription>{t("form.description")}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t("form.titleLabel")}</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder={t("form.titlePlaceholder")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">{t("form.contentLabel")}</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      placeholder={t("form.contentPlaceholder")}
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">{t("form.difficultyLabel")}</Label>
                      <select
                        id="difficulty"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.implementationDifficulty}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            implementationDifficulty: parseInt(e.target.value),
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {getDifficultyLabel(v)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="effectiveness">
                        {t("form.effectivenessLabel")}
                      </Label>
                      <select
                        id="effectiveness"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.overallEffectiveness}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            overallEffectiveness: parseInt(e.target.value),
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {getEffectivenessLabel(v)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time">{t("form.timeLabel")}</Label>
                      <Input
                        id="time"
                        type="number"
                        min={1}
                        max={60}
                        value={formData.timeToImplementMonths}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            timeToImplementMonths: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="challenges">{t("form.challengesLabel")}</Label>
                    <Textarea
                      id="challenges"
                      value={formData.challengesFaced}
                      onChange={(e) =>
                        setFormData({ ...formData, challengesFaced: e.target.value })
                      }
                      placeholder={t("form.challengesPlaceholder")}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="successFactors">
                      {t("form.successFactorsLabel")}
                    </Label>
                    <Textarea
                      id="successFactors"
                      value={formData.keySuccessFactors}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          keySuccessFactors: e.target.value,
                        })
                      }
                      placeholder={t("form.successFactorsPlaceholder")}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recommendations">
                      {t("form.recommendationsLabel")}
                    </Label>
                    <Textarea
                      id="recommendations"
                      value={formData.recommendations}
                      onChange={(e) =>
                        setFormData({ ...formData, recommendations: e.target.value })
                      }
                      placeholder={t("form.recommendationsPlaceholder")}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      {t("form.cancel")}
                    </Button>
                    <Button type="submit" disabled={addLesson.isPending}>
                      {t("form.submit")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
      </CardHeader>

      <CardContent>
        {!lessons || lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("empty")}
          </p>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson) => {
              const orgName =
                locale === "fr"
                  ? lesson.organization.nameFr
                  : lesson.organization.nameEn;

              const isExpanded = expandedLessons.has(lesson.id);
              const hasExpandableContent =
                lesson.challengesFaced ||
                lesson.keySuccessFactors ||
                lesson.recommendations;

              return (
                <Collapsible
                  key={lesson.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(lesson.id)}
                >
                  <div className="border rounded-lg p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{lesson.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{orgName}</span>
                          {lesson.organization.organizationCode && (
                            <>
                              <span>|</span>
                              <span className="font-mono">
                                {lesson.organization.organizationCode}
                              </span>
                            </>
                          )}
                          {lesson.publishedAt && (
                            <>
                              <span>|</span>
                              <span>
                                {formatDistanceToNow(new Date(lesson.publishedAt), {
                                  addSuffix: true,
                                  locale: dateLocale,
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex flex-wrap gap-3">
                      {lesson.implementationDifficulty && (
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {t("metrics.difficulty")}:
                          </span>
                          {renderStars(lesson.implementationDifficulty)}
                        </div>
                      )}
                      {lesson.overallEffectiveness && (
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {t("metrics.effectiveness")}:
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              lesson.overallEffectiveness >= 4
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : lesson.overallEffectiveness >= 3
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {getEffectivenessLabel(lesson.overallEffectiveness)}
                          </Badge>
                        </div>
                      )}
                      {lesson.timeToImplementMonths && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {t("metrics.months", {
                              count: lesson.timeToImplementMonths,
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Main content */}
                    <Markdown content={lesson.content} className="prose-sm" />

                    {/* Expandable sections */}
                    {hasExpandableContent && (
                      <CollapsibleContent className="space-y-4 pt-2">
                        {lesson.challengesFaced && (
                          <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-3">
                            <h5 className="flex items-center gap-2 font-medium text-sm text-orange-700 dark:text-orange-400 mb-2">
                              <Target className="h-4 w-4" />
                              {t("sections.challengesFaced")}
                            </h5>
                            <Markdown
                              content={lesson.challengesFaced}
                              className="prose-sm text-orange-900 dark:text-orange-100"
                            />
                          </div>
                        )}

                        {lesson.keySuccessFactors && (
                          <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3">
                            <h5 className="flex items-center gap-2 font-medium text-sm text-green-700 dark:text-green-400 mb-2">
                              <Trophy className="h-4 w-4" />
                              {t("sections.keySuccessFactors")}
                            </h5>
                            <Markdown
                              content={lesson.keySuccessFactors}
                              className="prose-sm text-green-900 dark:text-green-100"
                            />
                          </div>
                        )}

                        {lesson.recommendations && (
                          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3">
                            <h5 className="flex items-center gap-2 font-medium text-sm text-blue-700 dark:text-blue-400 mb-2">
                              <Lightbulb className="h-4 w-4" />
                              {t("sections.recommendations")}
                            </h5>
                            <Markdown
                              content={lesson.recommendations}
                              className="prose-sm text-blue-900 dark:text-blue-100"
                            />
                          </div>
                        )}
                      </CollapsibleContent>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => markHelpful.mutate({ lessonId: lesson.id })}
                        disabled={markHelpful.isPending}
                      >
                        <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                        {t("markHelpful")}
                        {lesson.helpfulCount > 0 && (
                          <span className="ml-1.5 text-muted-foreground">
                            ({lesson.helpfulCount})
                          </span>
                        )}
                      </Button>

                      {hasExpandableContent && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 text-xs">
                            <ChevronDown
                              className={`h-3.5 w-3.5 mr-1.5 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                            {isExpanded ? "Show Less" : "Show More"}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
