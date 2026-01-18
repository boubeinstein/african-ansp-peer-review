"use client";

/**
 * CAP Verification Form Modal Component
 *
 * Form modal for peer reviewers to verify CAP implementation.
 * Supports both successful verification and failed verification (rework required).
 *
 * Features:
 * - Verification method dropdown (Document Review, On-site Inspection, etc.)
 * - Verification notes with EN/FR language tabs
 * - Verification result radio (Verified / Not Verified)
 * - Failure reason field when "Not Verified" is selected
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  ShieldX,
  Loader2,
  FileText,
  Building,
  MessageSquare,
  ClipboardList,
  TestTube,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// =============================================================================
// VERIFICATION METHODS
// =============================================================================

const VERIFICATION_METHODS = [
  { value: "DOCUMENT_REVIEW", icon: FileText },
  { value: "ON_SITE_INSPECTION", icon: Building },
  { value: "INTERVIEW", icon: MessageSquare },
  { value: "EVIDENCE_REVIEW", icon: ClipboardList },
  { value: "TEST_DEMONSTRATION", icon: TestTube },
] as const;

// =============================================================================
// FORM SCHEMA
// =============================================================================

const verificationFormSchema = z
  .object({
    verificationMethod: z.string().min(1, "Verification method is required"),
    verificationNotesEn: z.string().optional(),
    verificationNotesFr: z.string().optional(),
    verificationResult: z.enum(["VERIFIED", "NOT_VERIFIED"]),
    failureReason: z.string().optional(),
  })
  .refine(
    (data) => {
      // If not verified, failure reason is required
      if (data.verificationResult === "NOT_VERIFIED") {
        return data.failureReason && data.failureReason.length >= 10;
      }
      return true;
    },
    {
      message: "Failure reason must be at least 10 characters when verification fails",
      path: ["failureReason"],
    }
  );

type VerificationFormValues = z.infer<typeof verificationFormSchema>;

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface CAPVerificationFormProps {
  capId: string;
  findingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CAPVerificationForm({
  capId,
  findingId,
  open,
  onOpenChange,
  onSuccess,
}: CAPVerificationFormProps) {
  const t = useTranslations("cap");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [notesLang, setNotesLang] = useState<"en" | "fr">(locale === "fr" ? "fr" : "en");

  // tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  // ==========================================================================
  // FORM
  // ==========================================================================

  const form = useForm<VerificationFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(verificationFormSchema) as any,
    defaultValues: {
      verificationMethod: "",
      verificationNotesEn: "",
      verificationNotesFr: "",
      verificationResult: "VERIFIED",
      failureReason: "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const verificationResult = form.watch("verificationResult");

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const verifyMutation = trpc.cap.verify.useMutation({
    onSuccess: () => {
      toast.success(t("success.verified"));
      utils.cap.getById.invalidate({ id: capId });
      utils.cap.getByFinding.invalidate({ findingId });
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const failVerificationMutation = trpc.cap.failVerification.useMutation({
    onSuccess: () => {
      toast.success(t("success.verificationFailed"));
      utils.cap.getById.invalidate({ id: capId });
      utils.cap.getByFinding.invalidate({ findingId });
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const onSubmit = (data: VerificationFormValues) => {
    // Combine EN/FR notes
    const combinedNotes = [
      data.verificationNotesEn && `[EN] ${data.verificationNotesEn}`,
      data.verificationNotesFr && `[FR] ${data.verificationNotesFr}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    if (data.verificationResult === "VERIFIED") {
      verifyMutation.mutate({
        id: capId,
        verificationMethod: data.verificationMethod,
        verificationNotes: combinedNotes || undefined,
      });
    } else {
      failVerificationMutation.mutate({
        id: capId,
        verificationMethod: data.verificationMethod,
        failureReason: data.failureReason!,
        verificationNotes: combinedNotes || undefined,
      });
    }
  };

  const isPending = verifyMutation.isPending || failVerificationMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t("verification.title")}
          </DialogTitle>
          <DialogDescription>
            {t("verification.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Verification Method */}
            <FormField
              control={form.control}
              name="verificationMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("verification.method")} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("verification.methodPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VERIFICATION_METHODS.map((method) => {
                        const Icon = method.icon;
                        return (
                          <SelectItem key={method.value} value={method.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span>{t(`verification.methods.${method.value}`)}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("verification.methodHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Verification Notes with EN/FR tabs */}
            <div className="space-y-2">
              <Label>{t("verification.notes")}</Label>
              <Tabs value={notesLang} onValueChange={(v) => setNotesLang(v as "en" | "fr")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="fr">Français</TabsTrigger>
                </TabsList>

                <TabsContent value="en" className="mt-2">
                  <FormField
                    control={form.control}
                    name="verificationNotesEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder={t("verification.notesPlaceholderEn")}
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="fr" className="mt-2">
                  <FormField
                    control={form.control}
                    name="verificationNotesFr"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder={t("verification.notesPlaceholderFr")}
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              <p className="text-sm text-muted-foreground">
                {t("form.optional")}
              </p>
            </div>

            {/* Verification Result */}
            <FormField
              control={form.control}
              name="verificationResult"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{t("verification.result")} *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      {/* Verified Option */}
                      <Label
                        htmlFor="verified"
                        className={cn(
                          "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 cursor-pointer transition-all",
                          "hover:bg-accent hover:text-accent-foreground",
                          field.value === "VERIFIED" &&
                            "border-green-500 bg-green-50 dark:bg-green-950/20"
                        )}
                      >
                        <RadioGroupItem
                          value="VERIFIED"
                          id="verified"
                          className="sr-only"
                        />
                        <ShieldCheck
                          className={cn(
                            "mb-3 h-8 w-8",
                            field.value === "VERIFIED"
                              ? "text-green-600"
                              : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            field.value === "VERIFIED" && "text-green-700 dark:text-green-400"
                          )}
                        >
                          {t("verification.verified")}
                        </span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                          {t("verification.verifiedDescription")}
                        </span>
                      </Label>

                      {/* Not Verified Option */}
                      <Label
                        htmlFor="not-verified"
                        className={cn(
                          "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 cursor-pointer transition-all",
                          "hover:bg-accent hover:text-accent-foreground",
                          field.value === "NOT_VERIFIED" &&
                            "border-red-500 bg-red-50 dark:bg-red-950/20"
                        )}
                      >
                        <RadioGroupItem
                          value="NOT_VERIFIED"
                          id="not-verified"
                          className="sr-only"
                        />
                        <ShieldX
                          className={cn(
                            "mb-3 h-8 w-8",
                            field.value === "NOT_VERIFIED"
                              ? "text-red-600"
                              : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            field.value === "NOT_VERIFIED" && "text-red-700 dark:text-red-400"
                          )}
                        >
                          {t("verification.notVerified")}
                        </span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                          {t("verification.notVerifiedDescription")}
                        </span>
                      </Label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Failure Reason (shown only when Not Verified) */}
            {verificationResult === "NOT_VERIFIED" && (
              <FormField
                control={form.control}
                name="failureReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      {t("verification.failureReason")} *
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("verification.failureReasonPlaceholder")}
                        className="min-h-[120px] border-red-200 focus-visible:ring-red-500"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-destructive">
                      {t("verification.failureReasonHint")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                variant={verificationResult === "NOT_VERIFIED" ? "destructive" : "default"}
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {verificationResult === "VERIFIED" ? (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {t("verification.confirmVerified")}
                  </>
                ) : (
                  <>
                    <ShieldX className="h-4 w-4 mr-2" />
                    {t("verification.confirmNotVerified")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
