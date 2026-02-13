"use client";

import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileCheck,
  Star,
  Lightbulb,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// =============================================================================
// Colors
// =============================================================================

const CHART_COLORS = {
  rating: "#f59e0b",
  prep: "#3b82f6",
  onsite: "#22c55e",
  reporting: "#8b5cf6",
  bar: "#1e3a5f",
  barAlt: "#64748b",
};

// =============================================================================
// Component
// =============================================================================

interface LessonsAnalyticsProps {
  locale: string;
}

export function LessonsAnalytics({ locale }: LessonsAnalyticsProps) {
  const t = useTranslations("lessons.analytics");
  const currentLocale = useLocale();

  const queryOpts = { retry: 1 } as const;

  const overviewQuery =
    trpc.retrospectiveAnalytics.getOverview.useQuery(undefined, queryOpts);
  const trendsQuery =
    trpc.retrospectiveAnalytics.getProcessRatingTrends.useQuery(undefined, queryOpts);
  const themesQuery =
    trpc.retrospectiveAnalytics.getCommonThemes.useQuery(undefined, queryOpts);
  const regionalQuery =
    trpc.retrospectiveAnalytics.getRegionalInsights.useQuery(undefined, queryOpts);
  const improvementQuery =
    trpc.retrospectiveAnalytics.getImprovementTracking.useQuery(undefined, queryOpts);

  const overview = overviewQuery.data;
  const trends = trendsQuery.data;
  const themes = themesQuery.data;
  const regional = regionalQuery.data;
  const improvement = improvementQuery.data;

  const isLoading =
    overviewQuery.isLoading ||
    trendsQuery.isLoading ||
    themesQuery.isLoading ||
    regionalQuery.isLoading ||
    improvementQuery.isLoading;

  const hasError =
    overviewQuery.isError ||
    trendsQuery.isError ||
    themesQuery.isError ||
    regionalQuery.isError ||
    improvementQuery.isError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-3" />
              <div className="h-8 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">{t("error")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("totalRetrospectives")}
                  </p>
                  <p className="text-2xl font-bold">
                    {overview.totalWithRetro}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {overview.submissionRate}% {t("submissionRate")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("avgRating")}
                  </p>
                  <p className="text-2xl font-bold">
                    {overview.avgProcessRating.toFixed(1)}
                    <span className="text-sm text-muted-foreground">
                      /5
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {overview.completionRate}% {t("completionRate")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Lightbulb className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("totalLessons")}
                  </p>
                  <p className="text-2xl font-bold">
                    {overview.totalLessons}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {overview.publishedLessons} {t("published")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("topContributors")}
                  </p>
                  {overview.topContributors.length > 0 ? (
                    <div className="space-y-0.5 mt-1">
                      {overview.topContributors.slice(0, 3).map((c) => (
                        <p key={c.userId} className="text-xs truncate">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground ml-1">
                            ({c.lessonCount})
                          </span>
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Process Effectiveness Trend */}
      {trends && trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("processEffectivenessTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="rating"
                  domain={[0, 5]}
                  tick={{ fontSize: 12 }}
                  label={{
                    value: t("chartRating"),
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 11 },
                  }}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "%",
                    angle: 90,
                    position: "insideRight",
                    style: { fontSize: 11 },
                  }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  yAxisId="rating"
                  type="monotone"
                  dataKey="avgRating"
                  stroke={CHART_COLORS.rating}
                  strokeWidth={2}
                  name={t("chartAvgRating")}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="prepEffective"
                  stroke={CHART_COLORS.prep}
                  strokeDasharray="4 2"
                  name={t("chartPrep")}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="onsiteEffective"
                  stroke={CHART_COLORS.onsite}
                  strokeDasharray="4 2"
                  name={t("chartOnsite")}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="reportingEffective"
                  stroke={CHART_COLORS.reporting}
                  strokeDasharray="4 2"
                  name={t("chartReporting")}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Lessons Table */}
        {overview && overview.topLessons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("topLessons")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t("colTitle")}</TableHead>
                    <TableHead className="text-xs text-right">
                      {t("colHelpful")}
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      {t("colViews")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.topLessons.map((lesson) => (
                    <TableRow key={lesson.id}>
                      <TableCell>
                        <Link
                          href={`/${locale}/lessons/${lesson.id}`}
                          className="text-xs hover:underline"
                        >
                          {currentLocale === "fr"
                            ? lesson.titleFr
                            : lesson.titleEn}
                        </Link>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0"
                          >
                            {lesson.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {lesson.author.firstName} {lesson.author.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {lesson.helpfulCount}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {lesson.viewCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Theme Cloud */}
        {themes && themes.topWords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("themeCloud")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 justify-center py-4">
                {themes.topWords.map((item) => {
                  const maxCount = themes.topWords[0].count;
                  const minSize = 12;
                  const maxSize = 28;
                  const size =
                    minSize +
                    ((item.count / maxCount) * (maxSize - minSize));
                  return (
                    <span
                      key={item.word}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-default"
                      style={{ fontSize: `${size}px` }}
                      title={`${item.count}`}
                    >
                      {item.word}
                    </span>
                  );
                })}
              </div>
              {/* Tag badges */}
              {themes.tags.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("topTags")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {themes.tags.slice(0, 10).map((tag) => (
                      <Badge
                        key={tag.tag}
                        variant="secondary"
                        className="text-[11px]"
                      >
                        {tag.tag}{" "}
                        <span className="opacity-60 ml-1">{tag.count}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Regional Insights */}
      {regional && regional.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("regionalInsights")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={regional}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="reviewCount"
                  fill={CHART_COLORS.bar}
                  name={t("chartReviews")}
                />
                <Bar
                  dataKey="lessonCount"
                  fill={CHART_COLORS.barAlt}
                  name={t("chartLessons")}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {regional.map((r) => (
                <div
                  key={r.region}
                  className="rounded-md border p-3 text-center"
                >
                  <p className="text-xs text-muted-foreground">{r.region}</p>
                  <p className="text-lg font-bold">
                    {r.avgRating.toFixed(1)}
                    <span className="text-xs text-muted-foreground">/5</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.reviewCount} {t("reviews")} · {r.lessonCount}{" "}
                    {t("lessonsLabel")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Improvement Tracking */}
      {improvement && improvement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("improvementTracking")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">
                    {t("colOrganization")}
                  </TableHead>
                  <TableHead className="text-xs">{t("colReviews")}</TableHead>
                  <TableHead className="text-xs text-right">
                    {t("colChange")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {improvement.map((org) => {
                  const name =
                    currentLocale === "fr" ? org.orgNameFr : org.orgNameEn;
                  return (
                    <TableRow key={name}>
                      <TableCell className="text-xs font-medium">
                        {name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {org.reviews.map((r, i) => (
                            <Badge
                              key={r.referenceNumber}
                              variant="outline"
                              className="text-[9px] px-1 py-0"
                            >
                              {r.rating}/5
                              {i < org.reviews.length - 1 && (
                                <span className="ml-1">→</span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium",
                            org.ratingChange > 0
                              ? "text-green-600"
                              : org.ratingChange < 0
                                ? "text-red-600"
                                : "text-muted-foreground"
                          )}
                        >
                          {org.ratingChange > 0 ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : org.ratingChange < 0 ? (
                            <TrendingDown className="h-3.5 w-3.5" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                          {org.ratingChange > 0 ? "+" : ""}
                          {org.ratingChange}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
