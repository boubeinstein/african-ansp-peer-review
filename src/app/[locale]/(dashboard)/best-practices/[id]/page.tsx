import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BestPracticeDetail } from "./_components/best-practice-detail";
import BestPracticeLoading from "./loading";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const practice = await prisma.bestPractice.findUnique({
    where: { id },
    select: {
      titleEn: true,
      titleFr: true,
      summaryEn: true,
      summaryFr: true,
    },
  });

  if (!practice) {
    return { title: "Not Found" };
  }

  const title = locale === "fr" ? practice.titleFr : practice.titleEn;
  const description =
    locale === "fr" ? practice.summaryFr : practice.summaryEn;

  return {
    title: `${title} | Best Practices`,
    description,
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function BestPracticeDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const session = await auth();

  // Check if practice exists
  const practiceExists = await prisma.bestPractice.findUnique({
    where: { id },
    select: { id: true, status: true, submittedById: true },
  });

  if (!practiceExists) {
    notFound();
  }

  // Check access for non-published practices
  const isAdmin =
    session?.user?.role &&
    ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
      session.user.role
    );
  const isSubmitter = session?.user?.id === practiceExists.submittedById;

  if (practiceExists.status !== "PUBLISHED" && !isAdmin && !isSubmitter) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<BestPracticeLoading />}>
        <BestPracticeDetail
          id={id}
          locale={locale}
          userOrgId={session?.user?.organizationId}
        />
      </Suspense>
    </div>
  );
}
