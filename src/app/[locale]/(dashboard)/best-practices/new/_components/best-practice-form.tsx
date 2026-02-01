"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
// Local type to avoid @prisma/client in client component
const BestPracticeCategory = {
  SAFETY_MANAGEMENT: "SAFETY_MANAGEMENT",
  OPERATIONAL_EFFICIENCY: "OPERATIONAL_EFFICIENCY",
  TRAINING_COMPETENCY: "TRAINING_COMPETENCY",
  TECHNOLOGY_INNOVATION: "TECHNOLOGY_INNOVATION",
  REGULATORY_COMPLIANCE: "REGULATORY_COMPLIANCE",
  STAKEHOLDER_ENGAGEMENT: "STAKEHOLDER_ENGAGEMENT",
} as const;
type BestPracticeCategory = (typeof BestPracticeCategory)[keyof typeof BestPracticeCategory];

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Lightbulb, Save, Info, X } from "lucide-react";

// Form schema
const formSchema = z.object({
  titleEn: z.string().min(5, "Title must be at least 5 characters").max(200),
  titleFr: z
    .string()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(200),
  summaryEn: z
    .string()
    .min(20, "Summary must be at least 20 characters")
    .max(500),
  summaryFr: z
    .string()
    .min(20, "Le résumé doit contenir au moins 20 caractères")
    .max(500),
  descriptionEn: z
    .string()
    .min(50, "Description must be at least 50 characters"),
  descriptionFr: z
    .string()
    .min(50, "La description doit contenir au moins 50 caractères"),
  implementationEn: z
    .string()
    .min(50, "Implementation guide must be at least 50 characters"),
  implementationFr: z
    .string()
    .min(50, "Le guide de mise en œuvre doit contenir au moins 50 caractères"),
  benefitsEn: z.string().min(20, "Benefits must be at least 20 characters"),
  benefitsFr: z
    .string()
    .min(20, "Les avantages doivent contenir au moins 20 caractères"),
  category: z.nativeEnum(BestPracticeCategory),
  auditArea: z.string().optional(),
  tags: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORY_OPTIONS: {
  value: BestPracticeCategory;
  labelEn: string;
  labelFr: string;
}[] = [
  {
    value: "SAFETY_MANAGEMENT",
    labelEn: "Safety Management",
    labelFr: "Gestion de la sécurité",
  },
  {
    value: "OPERATIONAL_EFFICIENCY",
    labelEn: "Operational Efficiency",
    labelFr: "Efficacité opérationnelle",
  },
  {
    value: "TRAINING_COMPETENCY",
    labelEn: "Training & Competency",
    labelFr: "Formation et compétence",
  },
  {
    value: "TECHNOLOGY_INNOVATION",
    labelEn: "Technology & Innovation",
    labelFr: "Technologie et innovation",
  },
  {
    value: "REGULATORY_COMPLIANCE",
    labelEn: "Regulatory Compliance",
    labelFr: "Conformité réglementaire",
  },
  {
    value: "STAKEHOLDER_ENGAGEMENT",
    labelEn: "Stakeholder Engagement",
    labelFr: "Engagement des parties prenantes",
  },
];

const AUDIT_AREAS = [
  "ATS",
  "AIM",
  "MET",
  "CNS",
  "SAR",
  "SMS",
  "SSP",
  "AGA",
  "OPS",
];

interface BestPracticeFormProps {
  locale: string;
  findingId?: string;
}

export function BestPracticeForm({
  locale,
  findingId,
}: BestPracticeFormProps) {
  const t = useTranslations("bestPractices.new");
  const router = useRouter();
  const [tagInput, setTagInput] = useState("");

  // Fetch finding if provided
  const { data: finding } = trpc.finding.getById.useQuery(
    { id: findingId! },
    { enabled: !!findingId }
  );

  // Create mutation
  const createMutation = trpc.bestPractice.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("createSuccess"));
      router.push(`/${locale}/best-practices/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titleEn: "",
      titleFr: "",
      summaryEn: "",
      summaryFr: "",
      descriptionEn: "",
      descriptionFr: "",
      implementationEn: "",
      implementationFr: "",
      benefitsEn: "",
      benefitsFr: "",
      category: "SAFETY_MANAGEMENT",
      auditArea: "",
      tags: [],
    },
  });

  // Pre-fill from finding if available
  useEffect(() => {
    if (finding) {
      form.setValue("titleEn", finding.titleEn || "");
      form.setValue("titleFr", finding.titleFr || "");
      form.setValue("descriptionEn", finding.descriptionEn || "");
      form.setValue("descriptionFr", finding.descriptionFr || "");
      // Note: finding doesn't have auditArea in the type, so we skip that
    }
  }, [finding, form]);

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      ...values,
      findingId: findingId || undefined,
      auditArea: values.auditArea || undefined,
    });
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.getValues("tags").includes(tag)) {
      form.setValue("tags", [...form.getValues("tags"), tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue(
      "tags",
      form.getValues("tags").filter((tag) => tag !== tagToRemove)
    );
  };

  const tags = useWatch({ control: form.control, name: "tags", defaultValue: [] });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${locale}/best-practices`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Finding link info */}
      {finding && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t("linkedToFinding", { reference: finding.referenceNumber })}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t("sections.basicInfo")}</CardTitle>
              <CardDescription>{t("sections.basicInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title EN */}
              <FormField
                control={form.control}
                name="titleEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.titleEn")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("placeholders.titleEn")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title FR */}
              <FormField
                control={form.control}
                name="titleFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.titleFr")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("placeholders.titleFr")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Summary EN */}
              <FormField
                control={form.control}
                name="summaryEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.summaryEn")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("placeholders.summaryEn")}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("fields.summaryHelp")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Summary FR */}
              <FormField
                control={form.control}
                name="summaryFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.summaryFr")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("placeholders.summaryFr")}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Category and Audit Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.category")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("placeholders.category")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {locale === "fr" ? cat.labelFr : cat.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auditArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.auditArea")}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "_none" ? "" : value)}
                        value={field.value || "_none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("placeholders.auditArea")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none">
                            {t("fields.noAuditArea")}
                          </SelectItem>
                          {AUDIT_AREAS.map((area) => (
                            <SelectItem key={area} value={area}>
                              {area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>{t("fields.tags")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder={t("placeholders.tags")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddTag}
                  >
                    {t("actions.addTag")}
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t("sections.content")}</CardTitle>
              <CardDescription>{t("sections.contentDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description EN */}
              <FormField
                control={form.control}
                name="descriptionEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.descriptionEn")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("placeholders.descriptionEn")}
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description FR */}
              <FormField
                control={form.control}
                name="descriptionFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.descriptionFr")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("placeholders.descriptionFr")}
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Implementation EN */}
              <FormField
                control={form.control}
                name="implementationEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.implementationEn")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("placeholders.implementationEn")}
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("fields.implementationHelp")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Implementation FR */}
              <FormField
                control={form.control}
                name="implementationFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.implementationFr")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("placeholders.implementationFr")}
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Benefits EN */}
              <FormField
                control={form.control}
                name="benefitsEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.benefitsEn")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("placeholders.benefitsEn")}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Benefits FR */}
              <FormField
                control={form.control}
                name="benefitsFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.benefitsFr")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("placeholders.benefitsFr")}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href={`/${locale}/best-practices`}>
                {t("actions.cancel")}
              </Link>
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("actions.saveDraft")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
