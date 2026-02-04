"use client";

/**
 * Training Topic List Component
 *
 * Displays a list of training topics with expandable content.
 * Each topic shows title, description, and related protocol questions.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  BookOpen,
  ExternalLink,
  Link as LinkIcon,
  FileDown,
  Video,
  Presentation,
  ClipboardList,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// =============================================================================
// TYPES
// =============================================================================

interface TrainingTopic {
  id: string;
  titleEn: string;
  titleFr: string;
  contentEn: string;
  contentFr: string;
  relatedPQs: string[];
  sortOrder: number;
}

interface TrainingResource {
  id: string;
  titleEn: string;
  titleFr: string;
  resourceType: "DOCUMENT" | "VIDEO" | "PRESENTATION" | "CHECKLIST" | "TEMPLATE" | "EXTERNAL_LINK";
  urlEn: string | null;
  urlFr: string | null;
  fileUrlEn: string | null;
  fileUrlFr: string | null;
  sortOrder: number;
}

interface TrainingTopicListProps {
  topics: TrainingTopic[];
  locale: string;
  className?: string;
}

interface TrainingResourceGridProps {
  resources: TrainingResource[];
  locale: string;
  className?: string;
}

// =============================================================================
// RESOURCE TYPE ICONS
// =============================================================================

const RESOURCE_TYPE_ICONS: Record<TrainingResource["resourceType"], React.ElementType> = {
  DOCUMENT: FileText,
  VIDEO: Video,
  PRESENTATION: Presentation,
  CHECKLIST: ClipboardList,
  TEMPLATE: File,
  EXTERNAL_LINK: ExternalLink,
};

const RESOURCE_TYPE_COLORS: Record<TrainingResource["resourceType"], string> = {
  DOCUMENT: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  VIDEO: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
  PRESENTATION: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  CHECKLIST: "bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400",
  TEMPLATE: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
  EXTERNAL_LINK: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400",
};

// =============================================================================
// TOPIC ITEM
// =============================================================================

interface TopicItemProps {
  topic: TrainingTopic;
  locale: string;
  index: number;
  defaultOpen?: boolean;
}

function TopicItem({ topic, locale, index, defaultOpen = false }: TopicItemProps) {
  const t = useTranslations("training");
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const title = locale === "fr" ? topic.titleFr : topic.titleEn;
  const content = locale === "fr" ? topic.contentFr : topic.contentEn;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "border rounded-lg transition-all duration-200",
          isOpen ? "shadow-sm" : "hover:bg-muted/50"
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex items-start gap-4 w-full p-4 text-left">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0 mt-0.5">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-base">{title}</h4>
              {!isOpen && content && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {content.substring(0, 150)}
                  {content.length > 150 && "..."}
                </p>
              )}
            </div>
            <div className="shrink-0 mt-1">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="pl-12">
              {/* Content */}
              {content && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {content}
                  </p>
                </div>
              )}

              {/* Related Protocol Questions */}
              {topic.relatedPQs && topic.relatedPQs.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    {t("relatedQuestions")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topic.relatedPQs.map((pq, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-mono">
                        {pq}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// =============================================================================
// TOPIC LIST
// =============================================================================

export function TrainingTopicList({
  topics,
  locale,
  className,
}: TrainingTopicListProps) {
  const t = useTranslations("training");

  if (topics.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{t("noTopics")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("topicsTitle")}</CardTitle>
          <Badge variant="secondary">{topics.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {topics
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((topic, index) => (
              <TopicItem
                key={topic.id}
                topic={topic}
                locale={locale}
                index={index}
                defaultOpen={index === 0}
              />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// RESOURCE CARD
// =============================================================================

interface ResourceCardProps {
  resource: TrainingResource;
  locale: string;
}

function ResourceCard({ resource, locale }: ResourceCardProps) {
  const title = locale === "fr" ? resource.titleFr : resource.titleEn;
  const Icon = RESOURCE_TYPE_ICONS[resource.resourceType];
  const colorClass = RESOURCE_TYPE_COLORS[resource.resourceType];

  const url = (locale === "fr" ? resource.urlFr : resource.urlEn) || resource.urlEn;
  const fileUrl = (locale === "fr" ? resource.fileUrlFr : resource.fileUrlEn) || resource.fileUrlEn;
  const href = url || fileUrl;
  const isExternal = resource.resourceType === "EXTERNAL_LINK" || url?.startsWith("http");

  const isDownload = !!(!isExternal && fileUrl);

  return (
    <a
      href={href || "#"}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      download={isDownload || undefined}
      className={cn(
        "block p-4 border rounded-lg transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        !href && "pointer-events-none opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2">{title}</h4>
          <p className="text-xs text-muted-foreground mt-1 capitalize">
            {resource.resourceType.toLowerCase().replace("_", " ")}
          </p>
        </div>
        {isExternal && (
          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        {fileUrl && !isExternal && (
          <FileDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>
    </a>
  );
}

// =============================================================================
// RESOURCE GRID
// =============================================================================

export function TrainingResourceGrid({
  resources,
  locale,
  className,
}: TrainingResourceGridProps) {
  const t = useTranslations("training");

  if (resources.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("resourcesTitle")}</CardTitle>
          <Badge variant="secondary">{resources.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((resource) => (
              <ResourceCard key={resource.id} resource={resource} locale={locale} />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default TrainingTopicList;
