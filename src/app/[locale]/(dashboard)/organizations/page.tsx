import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Clock } from "lucide-react";

interface OrganizationsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: OrganizationsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "navigation" });
  return {
    title: t("organizations"),
  };
}

export default async function OrganizationsPage({ params }: OrganizationsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Organizations</CardTitle>
          <CardDescription>
            Manage participating ANSPs and their profiles
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{t("comingSoon")}</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            This feature is currently under development and will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
