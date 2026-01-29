"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const findingSchema = z.object({
  titleEn: z.string().min(5),
  descriptionEn: z.string().min(20),
  severity: z.enum(["OBSERVATION", "MINOR", "MAJOR", "CRITICAL"]),
  findingType: z.enum([
    "NON_CONFORMITY",
    "OBSERVATION",
    "RECOMMENDATION",
    "GOOD_PRACTICE",
    "CONCERN",
  ]),
  criticalElement: z
    .enum(["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"])
    .optional()
    .nullable(),
});

type FindingFormValues = z.infer<typeof findingSchema>;

interface EditFindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finding: {
    id: string;
    reviewId: string;
    referenceNumber: string;
    titleEn: string;
    titleFr?: string | null;
    descriptionEn: string;
    descriptionFr?: string | null;
    severity: string;
    status: string;
    findingType?: string;
    criticalElement?: string | null;
  };
  sessionId?: string;
  onUpdated: () => void;
}

export function EditFindingDialog({
  open,
  onOpenChange,
  finding,
  sessionId,
  onUpdated,
}: EditFindingDialogProps) {
  const form = useForm<FindingFormValues>({
    resolver: zodResolver(findingSchema),
    defaultValues: {
      titleEn: finding.titleEn,
      descriptionEn: finding.descriptionEn,
      severity: finding.severity as FindingFormValues["severity"],
      findingType: (finding.findingType ||
        "OBSERVATION") as FindingFormValues["findingType"],
      criticalElement:
        (finding.criticalElement as FindingFormValues["criticalElement"]) ||
        null,
    },
  });

  // Update mutation
  const updateFinding = trpc.finding.update.useMutation({
    onSuccess: (updated) => {
      toast.success("Finding updated");

      // Broadcast changes
      if (sessionId) {
        const changes: Record<string, unknown> = {};
        const previous: Record<string, unknown> = {};

        // Detect what changed
        if (updated.titleEn !== finding.titleEn) {
          changes.title = updated.titleEn;
          previous.title = finding.titleEn;
        }
        if (updated.severity !== finding.severity) {
          changes.severity = updated.severity;
          previous.severity = finding.severity;
        }
        if (updated.findingType !== finding.findingType) {
          changes.findingType = updated.findingType;
          previous.findingType = finding.findingType;
        }

        if (Object.keys(changes).length > 0) {
          broadcastUpdated.mutate({
            reviewId: finding.reviewId,
            sessionId,
            findingId: finding.id,
            changes,
            previousValues: previous,
          });
        }
      }

      onUpdated();
    },
    onError: (error: { message: string }) => {
      toast.error("Failed to update", { description: error.message });
    },
  });

  const broadcastUpdated =
    trpc.collaboration.broadcastFindingUpdated.useMutation();

  const onSubmit = (values: FindingFormValues) => {
    updateFinding.mutate({
      id: finding.id,
      titleEn: values.titleEn,
      titleFr: values.titleEn, // Keep FR in sync for now
      descriptionEn: values.descriptionEn,
      descriptionFr: values.descriptionEn, // Keep FR in sync for now
      severity: values.severity,
      findingType: values.findingType,
      criticalElement: values.criticalElement,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Finding {finding.referenceNumber}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titleEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descriptionEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="findingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NON_CONFORMITY">
                          Non-Conformity
                        </SelectItem>
                        <SelectItem value="OBSERVATION">Observation</SelectItem>
                        <SelectItem value="RECOMMENDATION">
                          Recommendation
                        </SelectItem>
                        <SelectItem value="GOOD_PRACTICE">
                          Good Practice
                        </SelectItem>
                        <SelectItem value="CONCERN">Concern</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OBSERVATION">Observation</SelectItem>
                        <SelectItem value="MINOR">Minor</SelectItem>
                        <SelectItem value="MAJOR">Major</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="criticalElement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Critical Element</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select CE reference" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CE_1">
                        CE-1: Primary Aviation Legislation
                      </SelectItem>
                      <SelectItem value="CE_2">
                        CE-2: Specific Operating Regulations
                      </SelectItem>
                      <SelectItem value="CE_3">
                        CE-3: State Civil Aviation System
                      </SelectItem>
                      <SelectItem value="CE_4">
                        CE-4: Technical Personnel Qualification
                      </SelectItem>
                      <SelectItem value="CE_5">
                        CE-5: Technical Guidance & Tools
                      </SelectItem>
                      <SelectItem value="CE_6">
                        CE-6: Licensing & Certification
                      </SelectItem>
                      <SelectItem value="CE_7">
                        CE-7: Surveillance Obligations
                      </SelectItem>
                      <SelectItem value="CE_8">
                        CE-8: Resolution of Safety Issues
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateFinding.isPending}>
                {updateFinding.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
