import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { QuestionDetailView } from "./question-detail-view";
import { QuestionDetailSkeleton } from "./question-detail-skeleton";
import { ChevronRight, Home } from "lucide-react";

interface QuestionPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

async function getQuestion(id: string) {
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      icaoReferences: true,
      questionnaire: {
        select: {
          id: true,
          type: true,
          code: true,
          titleEn: true,
          titleFr: true,
        },
      },
      category: {
        select: {
          id: true,
          code: true,
          nameEn: true,
          nameFr: true,
        },
      },
    },
  });

  return question;
}

// Get related questions (same audit area or study area)
async function getRelatedQuestions(
  questionId: string,
  auditArea: string | null,
  studyArea: string | null,
  limit: number = 5
) {
  if (!auditArea && !studyArea) return [];

  const whereClause: Record<string, unknown> = {
    id: { not: questionId },
  };

  if (auditArea) {
    whereClause.auditArea = auditArea;
  } else if (studyArea) {
    whereClause.studyArea = studyArea;
  }

  const related = await prisma.question.findMany({
    where: whereClause,
    select: {
      id: true,
      pqNumber: true,
      questionTextEn: true,
    },
    take: limit,
    orderBy: { sortOrder: "asc" },
  });

  return related;
}

export async function generateMetadata({ params }: QuestionPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "questionDetail" });
  const question = await getQuestion(id);

  if (!question) {
    return { title: t("notFound") };
  }

  const title = question.pqNumber
    ? `${question.pqNumber} - ${t("title")}`
    : t("title");

  return {
    title,
    description:
      locale === "fr"
        ? question.questionTextFr?.slice(0, 160)
        : question.questionTextEn?.slice(0, 160),
  };
}

export default async function QuestionPage({ params }: QuestionPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "questionDetail" });

  const question = await getQuestion(id);

  if (!question) {
    notFound();
  }

  const relatedQuestions = await getRelatedQuestions(
    id,
    question.auditArea,
    question.studyArea
  );

  const questionWithRelated = {
    ...question,
    relatedQuestions,
  };

  // Determine breadcrumb path based on questionnaire type
  const isANS = question.questionnaire?.type === "ANS_USOAP_CMA";
  const questionnairePath = isANS ? "ans" : "sms";
  const questionnaireName = isANS ? "ANS USOAP CMA" : "SMS CANSO SoE";

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link
          href={`/${locale}/questionnaires`}
          className="hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/${locale}/questionnaires`}
          className="hover:text-foreground transition-colors"
        >
          {t("breadcrumb.questionnaires")}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/${locale}/questionnaires/${questionnairePath}`}
          className="hover:text-foreground transition-colors"
        >
          {questionnaireName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">
          {question.pqNumber || t("question")}
        </span>
      </nav>

      <Suspense fallback={<QuestionDetailSkeleton />}>
        <QuestionDetailView
          question={questionWithRelated}
          locale={locale}
        />
      </Suspense>
    </div>
  );
}
