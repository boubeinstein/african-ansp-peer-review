"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, FileQuestion, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PQCard } from "./pq-card";
import type { USOAPAuditArea, CriticalElement } from "@/types/prisma-enums";

interface PQListProps {
  locale: string;
  filters: {
    auditAreas: USOAPAuditArea[];
    criticalElements: CriticalElement[];
    isPriority: boolean;
    requiresOnSite: boolean;
    search: string;
  };
  page: number;
  onPageChange: (page: number) => void;
}

const ITEMS_PER_PAGE = 20;

export function PQList({ locale, filters, page, onPageChange }: PQListProps) {
  const t = useTranslations("ansBrowser");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // For now, we'll simulate data since we don't have real data in the database yet
  // In production, this would use the tRPC query
  const mockQuestions = generateMockQuestions(filters, page);

  const totalItems = mockQuestions.total;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const questions = mockQuestions.questions;
  const isLoading = false;
  const error = null;

  // Toggle expanded question
  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Generate pagination items
  const getPaginationItems = () => {
    const items: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      // Always show first page
      items.push(1);

      if (page > 3) {
        items.push("ellipsis");
      }

      // Show pages around current
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        items.push(i);
      }

      if (page < totalPages - 2) {
        items.push("ellipsis");
      }

      // Always show last page
      items.push(totalPages);
    }

    return items;
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error.title")}</AlertTitle>
        <AlertDescription>{t("error.description")}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-1">{t("empty.title")}</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {t("empty.description")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t("results.showing", {
            from: (page - 1) * ITEMS_PER_PAGE + 1,
            to: Math.min(page * ITEMS_PER_PAGE, totalItems),
            total: totalItems,
          })}
        </span>
        <span>
          {t("results.page", { current: page, total: totalPages })}
        </span>
      </div>

      {/* Question Cards */}
      <div className="space-y-3">
        {questions.map((question) => (
          <PQCard
            key={question.id}
            question={question}
            locale={locale}
            isExpanded={expandedId === question.id}
            onToggle={() => handleToggle(question.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => page > 1 && onPageChange(page - 1)}
                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {getPaginationItems().map((item, index) =>
              item === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    onClick={() => onPageChange(item)}
                    isActive={page === item}
                    className="cursor-pointer"
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => page < totalPages && onPageChange(page + 1)}
                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

// Mock data generator for demo purposes
// This would be replaced with actual tRPC data fetching
interface MockQuestion {
  id: string;
  pqNumber: string;
  questionTextEn: string;
  questionTextFr: string;
  guidanceEn: string | null;
  guidanceFr: string | null;
  auditArea: USOAPAuditArea | null;
  criticalElement: CriticalElement | null;
  isPriorityPQ: boolean;
  requiresOnSite: boolean;
  pqStatus: "NO_CHANGE" | "REVISED" | "NEW";
  icaoReferences: Array<{
    id: string;
    referenceType: string;
    document: string;
    chapter: string | null;
    description: string | null;
  }>;
}

function generateMockQuestions(
  filters: PQListProps["filters"],
  page: number
): { questions: MockQuestion[]; total: number } {
  const allQuestions: MockQuestion[] = [];
  const auditAreas: USOAPAuditArea[] = [
    "LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"
  ];
  const criticalElements: CriticalElement[] = [
    "CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"
  ];

  // Generate 100 sample questions
  for (let i = 1; i <= 100; i++) {
    const auditArea = auditAreas[i % auditAreas.length];
    const ce = criticalElements[i % criticalElements.length];
    const isPriority = i % 7 === 0;
    const requiresOnSite = i % 5 === 0;
    const pqStatus = i % 15 === 0 ? "NEW" : i % 10 === 0 ? "REVISED" : "NO_CHANGE";

    allQuestions.push({
      id: `pq-${i}`,
      pqNumber: `${7 + Math.floor(i / 100)}.${String(i).padStart(3, "0")}`,
      questionTextEn: `Has the State established ${isPriority ? "priority " : ""}requirements for ${auditArea} related to ${ce.replace("_", "-")}? This question assesses the implementation of safety oversight functions.`,
      questionTextFr: `L'État a-t-il établi des exigences ${isPriority ? "prioritaires " : ""}pour ${auditArea} liées à ${ce.replace("_", "-")}? Cette question évalue la mise en œuvre des fonctions de surveillance de la sécurité.`,
      guidanceEn: "Review the relevant documentation and verify that adequate procedures are in place. Check for evidence of implementation and compliance monitoring.",
      guidanceFr: "Examiner la documentation pertinente et vérifier que des procédures adéquates sont en place. Vérifier les preuves de mise en œuvre et de surveillance de la conformité.",
      auditArea,
      criticalElement: ce,
      isPriorityPQ: isPriority,
      requiresOnSite,
      pqStatus,
      icaoReferences: [
        {
          id: `ref-${i}-1`,
          referenceType: "STD",
          document: `Annex ${1 + (i % 18)}`,
          chapter: `Chapter ${1 + (i % 12)}`,
          description: "Standard reference for compliance assessment",
        },
        ...(i % 3 === 0
          ? [
              {
                id: `ref-${i}-2`,
                referenceType: "GM",
                document: "Doc 9859",
                chapter: "Section 4.2",
                description: "Safety Management Manual guidance",
              },
            ]
          : []),
      ],
    });
  }

  // Apply filters
  let filtered = allQuestions;

  if (filters.auditAreas.length > 0) {
    filtered = filtered.filter((q) =>
      q.auditArea && filters.auditAreas.includes(q.auditArea)
    );
  }

  if (filters.criticalElements.length > 0) {
    filtered = filtered.filter((q) =>
      q.criticalElement && filters.criticalElements.includes(q.criticalElement)
    );
  }

  if (filters.isPriority) {
    filtered = filtered.filter((q) => q.isPriorityPQ);
  }

  if (filters.requiresOnSite) {
    filtered = filtered.filter((q) => q.requiresOnSite);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (q) =>
        q.pqNumber.toLowerCase().includes(searchLower) ||
        q.questionTextEn.toLowerCase().includes(searchLower) ||
        q.questionTextFr.toLowerCase().includes(searchLower)
    );
  }

  // Paginate
  const start = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(start, start + ITEMS_PER_PAGE);

  return {
    questions: paginated,
    total: filtered.length,
  };
}
