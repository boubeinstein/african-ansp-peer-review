"use client";

/**
 * Organization Detail Page
 *
 * Displays organization details with tabbed interface for
 * overview, assessments, reviews, and users.
 */

import { use } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  ClipboardList,
  FileText,
  Globe,
  MapPin,
  Users,
} from "lucide-react";
import { OrganizationDetailHeader } from "@/components/features/organization/organization-detail-header";
import type { OrganizationWithCounts } from "@/types/organization";

// =============================================================================
// TYPES
// =============================================================================

interface OrganizationDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REGION_LABELS: Record<string, { en: string; fr: string }> = {
  WACAF: { en: "Western & Central Africa (WACAF)", fr: "Afrique occidentale et centrale (WACAF)" },
  ESAF: { en: "Eastern & Southern Africa (ESAF)", fr: "Afrique orientale et australe (ESAF)" },
  NORTHERN: { en: "Northern Africa", fr: "Afrique du Nord" },
};

// =============================================================================
// LOADING SKELETON
// =============================================================================

function DetailSkeleton() {
  return (
    <div className="container py-6 space-y-6">
      {/* Back button skeleton */}
      <Skeleton className="h-10 w-40" />

      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row gap-6 p-6 bg-card rounded-lg border">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-96" />

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

// =============================================================================
// TAB CONTENT COMPONENTS
// =============================================================================

function OverviewTab({
  organization,
  locale,
}: {
  organization: OrganizationWithCounts;
  locale: "en" | "fr";
}) {
  const t = useTranslations("organizations");
  const regionLabel = REGION_LABELS[organization.region]?.[locale] || organization.region;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Location Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            {t("detail.tabs.location")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("detail.country")}</p>
            <p className="font-medium">{organization.country}</p>
          </div>
          {organization.city && (
            <div>
              <p className="text-sm text-muted-foreground">{t("detail.city")}</p>
              <p className="font-medium">{organization.city}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{t("detail.region")}</p>
            <p className="font-medium">{regionLabel}</p>
          </div>
        </CardContent>
      </Card>

      {/* Membership Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            {t("detail.tabs.membership")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("detail.membershipStatus")}</p>
            <p className="font-medium">{organization.membershipStatus}</p>
          </div>
          {organization.joinedAt && (
            <div>
              <p className="text-sm text-muted-foreground">{t("detail.joinedDate")}</p>
              <p className="font-medium">
                {new Date(organization.joinedAt).toLocaleDateString(
                  locale === "fr" ? "fr-FR" : "en-US",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{t("detail.createdDate")}</p>
            <p className="font-medium">
              {new Date(organization.createdAt).toLocaleDateString(
                locale === "fr" ? "fr-FR" : "en-US",
                { year: "numeric", month: "long", day: "numeric" }
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            {t("detail.tabs.statistics")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">{organization._count.users}</p>
              <p className="text-sm text-muted-foreground">{t("detail.users")}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">{organization._count.assessments}</p>
              <p className="text-sm text-muted-foreground">{t("detail.assessments")}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">{organization._count.reviewsAsHost}</p>
              <p className="text-sm text-muted-foreground">{t("detail.reviews")}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">{organization._count.homeReviewers}</p>
              <p className="text-sm text-muted-foreground">{t("detail.reviewers")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AssessmentListItem {
  id: string;
  nameEn: string;
  nameFr: string;
  status: string;
  createdAt: Date;
  questionnaire: {
    type: string;
  };
}

function AssessmentsTab({
  organizationId,
  locale,
}: {
  organizationId: string;
  locale: "en" | "fr";
}) {
  const t = useTranslations("organizations");
  const router = useRouter();

  // Fetch assessments for this organization using the list query with organizationId filter
  const { data, isLoading } = trpc.assessment.list.useQuery(
    { organizationId, page: 1, limit: 50 },
    { retry: false }
  );

  const assessments = data?.assessments as AssessmentListItem[] | undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!assessments || assessments.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">{t("detail.noAssessments")}</h3>
          <p className="text-muted-foreground max-w-sm mt-2">
            {t("detail.noAssessmentsDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detail.tabs.assessments")}</CardTitle>
        <CardDescription>
          {t("detail.assessmentsDescription", { count: assessments.length })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("detail.assessmentName")}</TableHead>
              <TableHead>{t("detail.assessmentType")}</TableHead>
              <TableHead>{t("detail.assessmentStatus")}</TableHead>
              <TableHead>{t("detail.assessmentDate")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.map((assessment) => (
              <TableRow key={assessment.id}>
                <TableCell className="font-medium">
                  {locale === "fr" ? assessment.nameFr : assessment.nameEn}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {assessment.questionnaire.type === "ANS_USOAP_CMA" ? "ANS" : "SMS"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={assessment.status === "COMPLETED" ? "default" : "secondary"}
                  >
                    {assessment.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(assessment.createdAt).toLocaleDateString(
                    locale === "fr" ? "fr-FR" : "en-US"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/${locale}/assessments/${assessment.id}`)}
                  >
                    {t("actions.view")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ReviewsTab({}: {
  organizationId: string;
  locale: "en" | "fr";
}) {
  const t = useTranslations("organizations");

  // Placeholder - peer reviews router not yet implemented
  return (
    <Card className="py-12">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Globe className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">{t("detail.noReviews")}</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          {t("detail.noReviewsDescription")}
        </p>
      </CardContent>
    </Card>
  );
}

function UsersTab({}: {
  organizationId: string;
  locale: "en" | "fr";
}) {
  const t = useTranslations("organizations");

  // Placeholder - admin users endpoint not yet implemented
  return (
    <Card className="py-12">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Users className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">{t("detail.noUsers")}</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          {t("detail.noUsersDescription")}
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function OrganizationDetailPage({
  params,
}: OrganizationDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const locale = useLocale() as "en" | "fr";
  const t = useTranslations("organizations");

  // Fetch organization details
  const { data: organization, isLoading, error } = trpc.organization.getById.useQuery(
    { id },
    { retry: false }
  );

  // For simplicity, show edit button and users tab for all users
  // Server-side permissions will still control what users can actually do
  // The edit page will handle unauthorized access appropriately
  const isAdmin = true;

  // Handlers - navigate to dashboard since ANSP users don't have access to organizations list
  const handleBack = () => {
    router.push(`/${locale}/dashboard`);
  };

  const handleEdit = () => {
    router.push(`/${locale}/organizations/${id}/edit`);
  };

  // Loading state
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="container py-6">
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-destructive/10 p-6 mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">{t("error.title")}</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {error.message}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("detail.backToList")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!organization) {
    return (
      <div className="container py-6">
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Building2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t("detail.notFound")}</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {t("detail.notFoundDescription")}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("detail.backToList")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <OrganizationDetailHeader
        organization={organization}
        onBack={handleBack}
        onEdit={isAdmin ? handleEdit : undefined}
      />

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("detail.tabs.overview")}</span>
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">{t("detail.tabs.assessments")}</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t("detail.tabs.reviews")}</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t("detail.tabs.users")}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab organization={organization} locale={locale} />
        </TabsContent>

        <TabsContent value="assessments" className="mt-6">
          <AssessmentsTab organizationId={id} locale={locale} />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <ReviewsTab organizationId={id} locale={locale} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="mt-6">
            <UsersTab organizationId={id} locale={locale} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
