import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, CheckCircle2, ClipboardList } from "lucide-react";

interface ReviewsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Peer Reviews landing page
 *
 * Peer Reviews are external reviews conducted BY peer reviewers ON a host ANSP.
 * This is different from Assessments (self-assessments by an ANSP on themselves).
 */
export default async function ReviewsPage({ params }: ReviewsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });

  // Stats are static for now as the module is under development
  const stats = {
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button disabled>
          <Users className="h-4 w-4 mr-2" />
          {t("actions.requestReview")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.total")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.scheduled")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.scheduled}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.inProgress")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{stats.inProgress}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.completed")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      <Card className="py-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Users className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">{t("empty.title")}</h3>
          <p className="text-muted-foreground max-w-sm mt-2">
            {t("empty.description")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
