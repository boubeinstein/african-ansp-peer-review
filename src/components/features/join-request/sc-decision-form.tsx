"use client";

/**
 * SCDecisionForm Component
 *
 * Form for Steering Committee members to make the final
 * decision on join requests (approve, reject, or request more info).
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

interface SCDecisionFormProps {
  requestId: string;
  recommendedTeam?: number | null;
  onSuccess: () => void;
}

const decisionSchema = z
  .object({
    scDecision: z.enum(["APPROVED", "REJECTED", "MORE_INFO"]),
    scDecisionNotes: z.string().optional(),
    scAssignedTeam: z.number().min(1).max(5).optional(),
    rejectionReason: z.string().optional(),
    additionalInfoRequest: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.scDecision === "APPROVED" && !data.scAssignedTeam) {
        return false;
      }
      return true;
    },
    {
      message: "Team assignment is required for approval",
      path: ["scAssignedTeam"],
    }
  )
  .refine(
    (data) => {
      if (data.scDecision === "REJECTED" && !data.rejectionReason) {
        return false;
      }
      return true;
    },
    {
      message: "Rejection reason is required",
      path: ["rejectionReason"],
    }
  )
  .refine(
    (data) => {
      if (data.scDecision === "MORE_INFO" && !data.additionalInfoRequest) {
        return false;
      }
      return true;
    },
    {
      message: "Please specify what information is needed",
      path: ["additionalInfoRequest"],
    }
  );

type DecisionFormData = z.infer<typeof decisionSchema>;

export function SCDecisionForm({
  requestId,
  recommendedTeam,
  onSuccess,
}: SCDecisionFormProps) {
  const t = useTranslations("joinRequestAdmin.scReview");
  const tSuccess = useTranslations("joinRequestAdmin.success");
  const tErrors = useTranslations("joinRequestAdmin.errors");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DecisionFormData>({
    resolver: zodResolver(decisionSchema),
    defaultValues: {
      scAssignedTeam: recommendedTeam ?? undefined,
    },
  });

  const decision = watch("scDecision");

  const mutation = trpc.joinRequest.scDecision.useMutation({
    onSuccess: (data) => {
      if (data.status === "APPROVED") {
        toast.success(tSuccess("applicationApproved"));
      } else if (data.status === "REJECTED") {
        toast.success(tSuccess("applicationRejected"));
      } else {
        toast.success(tSuccess("decisionSubmitted"));
      }
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || tErrors("decisionFailed"));
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit = (data: DecisionFormData) => {
    setIsLoading(true);
    mutation.mutate({
      id: requestId,
      ...data,
    });
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription className="text-sm">
          {t("instructions")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Decision */}
          <div className="space-y-2">
            <Label>{t("decision")}</Label>
            <RadioGroup
              onValueChange={(value) =>
                setValue(
                  "scDecision",
                  value as "APPROVED" | "REJECTED" | "MORE_INFO"
                )
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="APPROVED" id="sc-approve" />
                <Label
                  htmlFor="sc-approve"
                  className="font-normal cursor-pointer text-green-700"
                >
                  {t("approve")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="REJECTED" id="sc-reject" />
                <Label
                  htmlFor="sc-reject"
                  className="font-normal cursor-pointer text-red-700"
                >
                  {t("reject")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MORE_INFO" id="sc-defer" />
                <Label
                  htmlFor="sc-defer"
                  className="font-normal cursor-pointer text-orange-700"
                >
                  {t("defer")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Assigned Team (only if approving) */}
          {decision === "APPROVED" && (
            <div className="space-y-2">
              <Label>{t("assignedTeam")}</Label>
              <Select
                defaultValue={recommendedTeam?.toString()}
                onValueChange={(value) =>
                  setValue("scAssignedTeam", parseInt(value))
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
              {errors.scAssignedTeam && (
                <p className="text-xs text-red-500">
                  {errors.scAssignedTeam.message}
                </p>
              )}
            </div>
          )}

          {/* Rejection Reason (only if rejecting) */}
          {decision === "REJECTED" && (
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="Explain why the application is being rejected..."
                className="min-h-[80px]"
                {...register("rejectionReason")}
              />
              {errors.rejectionReason && (
                <p className="text-xs text-red-500">
                  {errors.rejectionReason.message}
                </p>
              )}
            </div>
          )}

          {/* Additional Info Request (only if deferring) */}
          {decision === "MORE_INFO" && (
            <div className="space-y-2">
              <Label>Information Requested</Label>
              <Textarea
                placeholder="Specify what additional information is needed..."
                className="min-h-[80px]"
                {...register("additionalInfoRequest")}
              />
              {errors.additionalInfoRequest && (
                <p className="text-xs text-red-500">
                  {errors.additionalInfoRequest.message}
                </p>
              )}
            </div>
          )}

          {/* Decision Notes (optional) */}
          <div className="space-y-2">
            <Label>{t("comments")}</Label>
            <Textarea
              placeholder={t("commentsPlaceholder")}
              className="min-h-[80px]"
              {...register("scDecisionNotes")}
            />
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
