"use client";

/**
 * CoordinatorReviewForm Component
 *
 * Form for programme coordinators to review join requests
 * and submit recommendations to the Steering Committee.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

interface CoordinatorReviewFormProps {
  requestId: string;
  onSuccess: () => void;
}

const reviewSchema = z.object({
  coordinatorNotes: z.string().min(10, "Notes are required (min 10 characters)"),
  coordinatorRecommendation: z.enum(["APPROVE", "REJECT", "MORE_INFO"]),
  coordinatorRecommendedTeam: z.number().min(1).max(5).optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

export function CoordinatorReviewForm({
  requestId,
  onSuccess,
}: CoordinatorReviewFormProps) {
  const t = useTranslations("joinRequestAdmin.coordinatorReview");
  const tSuccess = useTranslations("joinRequestAdmin.success");
  const tErrors = useTranslations("joinRequestAdmin.errors");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
  });

  const recommendation = watch("coordinatorRecommendation");

  const mutation = trpc.joinRequest.coordinatorReview.useMutation({
    onSuccess: () => {
      toast.success(tSuccess("reviewSubmitted"));
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || tErrors("reviewFailed"));
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit = (data: ReviewFormData) => {
    setIsLoading(true);
    mutation.mutate({
      id: requestId,
      ...data,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription className="text-sm">
          {t("instructions")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Recommendation */}
          <div className="space-y-2">
            <Label>{t("recommendation")}</Label>
            <RadioGroup
              onValueChange={(value) =>
                setValue(
                  "coordinatorRecommendation",
                  value as "APPROVE" | "REJECT" | "MORE_INFO"
                )
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="APPROVE" id="approve" />
                <Label htmlFor="approve" className="font-normal cursor-pointer">
                  {t("recommend")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="REJECT" id="reject" />
                <Label htmlFor="reject" className="font-normal cursor-pointer">
                  {t("notRecommend")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MORE_INFO" id="more-info" />
                <Label htmlFor="more-info" className="font-normal cursor-pointer">
                  {t("needsInfo")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Recommended Team (only if recommending approval) */}
          {recommendation === "APPROVE" && (
            <div className="space-y-2">
              <Label>{t("recommendedTeam")}</Label>
              <Select
                onValueChange={(value) =>
                  setValue("coordinatorRecommendedTeam", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Team 1 (Southern Africa)</SelectItem>
                  <SelectItem value="2">Team 2 (East Africa)</SelectItem>
                  <SelectItem value="3">Team 3 (West Africa)</SelectItem>
                  <SelectItem value="4">Team 4 (South-East Africa)</SelectItem>
                  <SelectItem value="5">Team 5 (North Africa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-2">
            <Label>{t("comments")}</Label>
            <Textarea
              placeholder={t("commentsPlaceholder")}
              className="min-h-[100px]"
              {...register("coordinatorNotes")}
            />
            {errors.coordinatorNotes && (
              <p className="text-xs text-red-500">
                {errors.coordinatorNotes.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
