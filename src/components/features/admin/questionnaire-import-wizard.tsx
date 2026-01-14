"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Shield,
  Upload,
  FileText,
} from "lucide-react";
import { ImportPreviewTable, ImportSummaryCard } from "./import-preview-table";
import { trpc } from "@/lib/trpc/client";
import type { ValidationError } from "@/lib/questionnaire/import-schema";

// =============================================================================
// TYPES
// =============================================================================

type QuestionnaireType = "ANS_USOAP_CMA" | "SMS_CANSO_SOE";
type FileFormat = "json" | "csv";
type WizardStep = 1 | 2 | 3 | 4;

interface QuestionPreview {
  pqNumber?: string | null;
  questionTextEn: string;
  questionTextFr: string;
  auditArea?: string | null;
  criticalElement?: string | null;
  smsComponent?: string | null;
  studyArea?: string | null;
  isPriorityPQ?: boolean;
  requiresOnSite?: boolean;
  pqStatus?: string;
  sortOrder: number;
  icaoReferences?: unknown[];
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  summary: {
    totalQuestions: number;
    totalCategories: number;
    totalReferences: number;
    newQuestions: number;
    updatedQuestions: number;
  } | null;
  preview?: {
    questionnaire: unknown;
    categories: unknown[];
    questions: QuestionPreview[];
  };
}

interface ImportWizardProps {
  locale: string;
  onComplete?: (questionnaireId: string) => void;
}

// =============================================================================
// STEP COMPONENTS
// =============================================================================

interface Step1Props {
  selectedType: QuestionnaireType | null;
  onSelectType: (type: QuestionnaireType) => void;
}

function Step1TypeSelection({ selectedType, onSelectType }: Step1Props) {
  const t = useTranslations("admin.import");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("step1.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("step1.description")}</p>
      </div>

      <RadioGroup
        value={selectedType || ""}
        onValueChange={(value) => onSelectType(value as QuestionnaireType)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Label
          htmlFor="ans"
          className={cn(
            "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors",
            selectedType === "ANS_USOAP_CMA"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-muted hover:border-muted-foreground/30"
          )}
        >
          <RadioGroupItem value="ANS_USOAP_CMA" id="ans" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">{t("step1.ansTitle")}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("step1.ansDescription")}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">851 PQs</Badge>
              <Badge variant="secondary" className="text-xs">9 Audit Areas</Badge>
              <Badge variant="secondary" className="text-xs">8 CEs</Badge>
            </div>
          </div>
        </Label>

        <Label
          htmlFor="sms"
          className={cn(
            "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors",
            selectedType === "SMS_CANSO_SOE"
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
              : "border-muted hover:border-muted-foreground/30"
          )}
        >
          <RadioGroupItem value="SMS_CANSO_SOE" id="sms" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span className="font-semibold">{t("step1.smsTitle")}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("step1.smsDescription")}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">4 Components</Badge>
              <Badge variant="secondary" className="text-xs">12 Study Areas</Badge>
              <Badge variant="secondary" className="text-xs">5 Levels</Badge>
            </div>
          </div>
        </Label>
      </RadioGroup>
    </div>
  );
}

interface Step2Props {
  selectedFormat: FileFormat;
  onSelectFormat: (format: FileFormat) => void;
  fileContent: string;
  fileName: string;
  onFileUpload: (content: string, name: string) => void;
  isValidating: boolean;
}

function Step2FileUpload({
  selectedFormat,
  onSelectFormat,
  fileContent,
  fileName,
  onFileUpload,
  isValidating,
}: Step2Props) {
  const t = useTranslations("admin.import");

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileUpload(content, file.name);
      };
      reader.readAsText(file);
    },
    [onFileUpload]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileUpload(content, file.name);
      };
      reader.readAsText(file);
    },
    [onFileUpload]
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("step2.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("step2.description")}</p>
      </div>

      {/* Format Selection */}
      <div className="space-y-2">
        <Label>{t("step2.formatLabel")}</Label>
        <RadioGroup
          value={selectedFormat}
          onValueChange={(value) => onSelectFormat(value as FileFormat)}
          className="flex gap-4"
        >
          <Label
            htmlFor="json"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors",
              selectedFormat === "json"
                ? "border-primary bg-primary/5"
                : "border-muted"
            )}
          >
            <RadioGroupItem value="json" id="json" />
            <FileJson className="h-4 w-4" />
            <span>JSON</span>
          </Label>
          <Label
            htmlFor="csv"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors",
              selectedFormat === "csv"
                ? "border-primary bg-primary/5"
                : "border-muted"
            )}
          >
            <RadioGroupItem value="csv" id="csv" />
            <FileSpreadsheet className="h-4 w-4" />
            <span>CSV</span>
          </Label>
        </RadioGroup>
      </div>

      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          fileContent
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
            : "border-muted hover:border-muted-foreground/50"
        )}
      >
        <input
          type="file"
          accept={selectedFormat === "json" ? ".json" : ".csv"}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isValidating}
        />

        {isValidating ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("step2.validating")}</p>
          </div>
        ) : fileContent ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="font-medium">{fileName}</p>
            <p className="text-sm text-muted-foreground">
              {t("step2.fileUploaded")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">{t("step2.dropHere")}</p>
            <p className="text-sm text-muted-foreground">
              {t("step2.orClickToUpload")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface Step3Props {
  validationResult: ValidationResult | null;
  type: QuestionnaireType;
  onEditQuestion: (index: number, data: QuestionPreview) => void;
  onRemoveQuestion: (index: number) => void;
}

function Step3Preview({
  validationResult,
  type,
  onEditQuestion,
  onRemoveQuestion,
}: Step3Props) {
  const t = useTranslations("admin.import");

  if (!validationResult) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("step3.noData")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("step3.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("step3.description")}</p>
      </div>

      {/* Summary */}
      {validationResult.summary && (
        <ImportSummaryCard
          totalQuestions={validationResult.summary.totalQuestions}
          totalCategories={validationResult.summary.totalCategories}
          totalReferences={validationResult.summary.totalReferences}
          errorCount={validationResult.errors.length}
          warningCount={validationResult.warnings.length}
          type={type}
        />
      )}

      {/* Warnings */}
      {validationResult.warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              {t("step3.warnings")} ({validationResult.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-amber-700 dark:text-amber-400">
              {validationResult.warnings.map((warning, i) => (
                <li key={i}>• {warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {validationResult.preview && (
        <ImportPreviewTable
          questions={validationResult.preview.questions}
          errors={validationResult.errors}
          type={type}
          onEdit={onEditQuestion}
          onRemove={onRemoveQuestion}
        />
      )}
    </div>
  );
}

interface Step4Props {
  isImporting: boolean;
  importSuccess: boolean;
  importError: string | null;
  summary: {
    categories: number;
    questions: number;
    references: number;
  } | null;
}

function Step4Confirm({
  isImporting,
  importSuccess,
  importError,
  summary,
}: Step4Props) {
  const t = useTranslations("admin.import");

  if (isImporting) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <h2 className="text-lg font-semibold">{t("step4.importing")}</h2>
        <p className="text-sm text-muted-foreground">{t("step4.pleaseWait")}</p>
      </div>
    );
  }

  if (importSuccess && summary) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
          {t("step4.success")}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {t("step4.successDescription", {
            categories: summary.categories,
            questions: summary.questions,
            references: summary.references,
          })}
        </p>
      </div>
    );
  }

  if (importError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-destructive">
          {t("step4.error")}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">{importError}</p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <h2 className="text-lg font-semibold">{t("step4.ready")}</h2>
      <p className="text-sm text-muted-foreground mt-2">
        {t("step4.readyDescription")}
      </p>
    </div>
  );
}

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================

export function QuestionnaireImportWizard({
  locale,
  onComplete,
}: ImportWizardProps) {
  const t = useTranslations("admin.import");
  const router = useRouter();

  // State
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedType, setSelectedType] = useState<QuestionnaireType | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FileFormat>("json");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importSummary, setImportSummary] = useState<{
    categories: number;
    questions: number;
    references: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // tRPC mutations
  const validateMutation = trpc.admin.questionnaire.validateImport.useMutation();
  const bulkImportMutation = trpc.admin.questionnaire.bulkImport.useMutation();

  // Handle file upload and validate
  const handleFileUpload = useCallback(
    async (content: string, name: string) => {
      setFileContent(content);
      setFileName(name);

      if (selectedType) {
        try {
          const result = await validateMutation.mutateAsync({
            type: selectedType,
            data: content,
            format: selectedFormat,
          });

          setValidationResult(result as ValidationResult);

          if (result.isValid) {
            toast.success(t("validationSuccess"));
          } else {
            toast.error(t("validationErrors", { count: result.errors.length }));
          }
        } catch (error) {
          toast.error(t("validationFailed"));
          setValidationResult({
            isValid: false,
            errors: [
              {
                row: 0,
                field: "",
                message: error instanceof Error ? error.message : "Unknown error",
              },
            ],
            warnings: [],
            summary: null,
          });
        }
      }
    },
    [selectedType, selectedFormat, validateMutation, t]
  );

  // Handle question edit in preview
  const handleEditQuestion = useCallback(
    (index: number, data: QuestionPreview) => {
      if (!validationResult?.preview) return;

      const newQuestions = [...validationResult.preview.questions];
      newQuestions[index] = data;

      setValidationResult({
        ...validationResult,
        preview: {
          ...validationResult.preview,
          questions: newQuestions,
        },
      });
    },
    [validationResult]
  );

  // Handle question removal in preview
  const handleRemoveQuestion = useCallback(
    (index: number) => {
      if (!validationResult?.preview) return;

      const newQuestions = validationResult.preview.questions.filter(
        (_, i) => i !== index
      );
      const newErrors = validationResult.errors.filter((e) => e.row !== index);

      setValidationResult({
        ...validationResult,
        errors: newErrors,
        preview: {
          ...validationResult.preview,
          questions: newQuestions,
        },
        summary: validationResult.summary
          ? {
              ...validationResult.summary,
              totalQuestions: newQuestions.length,
            }
          : null,
      });
    },
    [validationResult]
  );

  // Handle import
  const handleImport = useCallback(async () => {
    if (!selectedType || !fileContent) return;

    setStep(4);
    setImportError(null);

    try {
      const result = await bulkImportMutation.mutateAsync({
        type: selectedType,
        data: fileContent,
        createQuestionnaire: true,
        updateExisting: false,
      });

      if (result.success && result.summary) {
        setImportSuccess(true);
        setImportSummary(result.summary);
        toast.success(t("importSuccess"));

        if (result.questionnaireId && onComplete) {
          onComplete(result.questionnaireId);
        }
      } else {
        setImportError(
          result.errors?.[0]?.message || t("importFailed")
        );
        toast.error(t("importFailed"));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("importFailed");
      setImportError(message);
      toast.error(message);
    }
  }, [selectedType, fileContent, bulkImportMutation, onComplete, t]);

  // Navigation
  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return selectedType !== null;
      case 2:
        return fileContent !== "" && validationResult !== null;
      case 3:
        return validationResult?.isValid === true;
      case 4:
        return importSuccess;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (step === 3) {
      handleImport();
    } else if (step < 4) {
      setStep((step + 1) as WizardStep);
    } else if (importSuccess) {
      router.push(`/${locale}/admin/questionnaires`);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((step - 1) as WizardStep);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("step", { current: step, total: 4 })}
          </span>
          <span className="font-medium">
            {step === 1 && t("step1.name")}
            {step === 2 && t("step2.name")}
            {step === 3 && t("step3.name")}
            {step === 4 && t("step4.name")}
          </span>
        </div>
        <Progress value={(step / 4) * 100} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {step === 1 && (
            <Step1TypeSelection
              selectedType={selectedType}
              onSelectType={setSelectedType}
            />
          )}

          {step === 2 && (
            <Step2FileUpload
              selectedFormat={selectedFormat}
              onSelectFormat={setSelectedFormat}
              fileContent={fileContent}
              fileName={fileName}
              onFileUpload={handleFileUpload}
              isValidating={validateMutation.isPending}
            />
          )}

          {step === 3 && selectedType && (
            <Step3Preview
              validationResult={validationResult}
              type={selectedType}
              onEditQuestion={handleEditQuestion}
              onRemoveQuestion={handleRemoveQuestion}
            />
          )}

          {step === 4 && (
            <Step4Confirm
              isImporting={bulkImportMutation.isPending}
              importSuccess={importSuccess}
              importError={importError}
              summary={importSummary}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={step === 1 || bulkImportMutation.isPending}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>

        <Button
          onClick={goNext}
          disabled={!canGoNext() || bulkImportMutation.isPending}
        >
          {step === 3 ? (
            <>
              {t("import")}
              <Upload className="h-4 w-4 ml-2" />
            </>
          ) : step === 4 && importSuccess ? (
            <>
              {t("done")}
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              {t("next")}
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
