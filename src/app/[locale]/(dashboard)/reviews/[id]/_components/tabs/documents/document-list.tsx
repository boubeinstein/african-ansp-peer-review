"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Search,
  Download,
  MoreHorizontal,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  category: string;
  mimeType: string;
  fileSize: number;
  status: string;
  uploadedBy: { id: string; name: string };
  createdAt: Date;
  url?: string;
}

interface DocumentListProps {
  documents: Document[];
  reviewId: string;
  onView?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
}

const CATEGORIES = [
  "PRE_VISIT_REQUEST",
  "HOST_SUBMISSION",
  "EVIDENCE",
  "INTERVIEW_NOTES",
  "DRAFT_REPORT",
  "FINAL_REPORT",
  "CORRESPONDENCE",
  "OTHER",
] as const;

const categoryColors: Record<string, string> = {
  PRE_VISIT_REQUEST: "bg-blue-100 text-blue-800",
  HOST_SUBMISSION: "bg-purple-100 text-purple-800",
  EVIDENCE: "bg-green-100 text-green-800",
  INTERVIEW_NOTES: "bg-amber-100 text-amber-800",
  DRAFT_REPORT: "bg-orange-100 text-orange-800",
  FINAL_REPORT: "bg-emerald-100 text-emerald-800",
  CORRESPONDENCE: "bg-gray-100 text-gray-800",
  OTHER: "bg-slate-100 text-slate-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-amber-500" />,
  APPROVED: <CheckCircle className="h-4 w-4 text-green-500" />,
  REJECTED: <AlertCircle className="h-4 w-4 text-red-500" />,
};

export function DocumentList({
  documents,
  onView,
  onDelete,
}: DocumentListProps) {
  const t = useTranslations("reviews.detail.documents");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/"))
      return <FileImage className="h-5 w-5 text-purple-500" />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    if (mimeType.includes("pdf"))
      return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.includes("word") || mimeType.includes("document"))
      return <FileText className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group documents by category for summary
  const categoryCounts = documents.reduce(
    (acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      {/* Category Summary */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryCounts).map(([category, count]) => (
            <Badge
              key={category}
              variant="secondary"
              className={cn(
                "cursor-pointer transition-opacity",
                categoryColors[category],
                categoryFilter !== "all" &&
                  categoryFilter !== category &&
                  "opacity-50"
              )}
              onClick={() =>
                setCategoryFilter(categoryFilter === category ? "all" : category)
              }
            >
              {t(`categories.${category}`)} ({count})
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t("filterCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(`categories.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">
              {searchQuery || categoryFilter !== "all"
                ? t("noResults")
                : t("empty.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || categoryFilter !== "all"
                ? t("tryDifferent")
                : t("empty.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* File Icon */}
                  <div className="shrink-0">{getFileIcon(doc.mimeType)}</div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{doc.name}</h4>
                      {statusIcons[doc.status]}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", categoryColors[doc.category])}
                      >
                        {t(`categories.${doc.category}`)}
                      </Badge>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>{doc.uploadedBy.name}</span>
                      <span>
                        {formatDistanceToNow(doc.createdAt, {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.url} download={doc.name}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(doc)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t("view")}
                          </DropdownMenuItem>
                        )}
                        {doc.url && (
                          <DropdownMenuItem asChild>
                            <a href={doc.url} download={doc.name}>
                              <Download className="h-4 w-4 mr-2" />
                              {t("download")}
                            </a>
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
