"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Link as LinkIcon,
  Upload,
  Trash2,
  ExternalLink,
  Plus,
  FileUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EvidencePanelProps {
  evidenceDescription: string;
  evidenceUrls: string[];
  onDescriptionChange: (value: string) => void;
  onUrlsChange: (urls: string[]) => void;
  disabled?: boolean;
}

export function EvidencePanel({
  evidenceDescription,
  evidenceUrls,
  onDescriptionChange,
  onUrlsChange,
  disabled,
}: EvidencePanelProps) {
  const t = useTranslations("workspace.evidence");
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddUrl = () => {
    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl) {
      setUrlError(t("errors.emptyUrl"));
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      setUrlError(t("errors.invalidUrl"));
      return;
    }

    if (evidenceUrls.includes(trimmedUrl)) {
      setUrlError(t("errors.duplicateUrl"));
      return;
    }

    onUrlsChange([...evidenceUrls, trimmedUrl]);
    setNewUrl("");
    setUrlError("");
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    onUrlsChange(evidenceUrls.filter((url) => url !== urlToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddUrl();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // File upload would be handled here in a real implementation
    // For now, we just show the drop zone
  };

  const getUrlDomain = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const hasEvidence = evidenceDescription.length > 0 || evidenceUrls.length > 0;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t("title")}</CardTitle>
          </div>
          {hasEvidence ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t("hasEvidence")}
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" />
              {t("noEvidence")}
            </Badge>
          )}
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Evidence Description */}
        <div className="space-y-2">
          <Label htmlFor="evidence-description" className="text-sm font-medium">
            {t("descriptionLabel")}
          </Label>
          <Textarea
            id="evidence-description"
            value={evidenceDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            disabled={disabled}
            className="min-h-[80px] resize-y"
          />
          <p className="text-xs text-muted-foreground">
            {t("descriptionHint")}
          </p>
        </div>

        {/* Document Links */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("linksLabel")}</Label>

          {/* Existing URLs */}
          {evidenceUrls.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence>
                {evidenceUrls.map((url, index) => (
                  <motion.div
                    key={url}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2 p-2 bg-muted rounded-md group"
                  >
                    <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate block"
                      >
                        {url}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {getUrlDomain(url)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        asChild
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={disabled}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("removeDialog.title")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("removeDialog.description")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("removeDialog.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveUrl(url)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t("removeDialog.confirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Add new URL */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  setUrlError("");
                }}
                onKeyPress={handleKeyPress}
                placeholder={t("urlPlaceholder")}
                disabled={disabled}
                className={cn(urlError && "border-destructive")}
              />
              {urlError && (
                <p className="text-xs text-destructive mt-1">{urlError}</p>
              )}
            </div>
            <Button
              type="button"
              onClick={handleAddUrl}
              disabled={disabled || !newUrl.trim()}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* File Upload Zone (placeholder for future implementation) */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              disabled={disabled}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                // File upload would be handled here
                console.log("Files selected:", e.target.files);
              }}
            />
            <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">{t("dropzone.title")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dropzone.subtitle")}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t("dropzone.button")}
            </Button>
          </div>

          {/* Supported formats hint */}
          <p className="text-xs text-muted-foreground">
            {t("supportedFormats")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
