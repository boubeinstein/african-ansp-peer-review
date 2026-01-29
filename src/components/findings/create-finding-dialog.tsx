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
  titleEn: z.string().min(5, "Title must be at least 5 characters"),
  descriptionEn: z
    .string()
    .min(20, "Description must be at least 20 characters"),
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
    .optional(),
});

type FindingFormValues = z.infer<typeof findingSchema>;

interface CreateFindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  organizationId: string;
  sessionId?: string;
  onCreated: () => void;
}

export function CreateFindingDialog({
  open,
  onOpenChange,
  reviewId,
  organizationId,
  sessionId,
  onCreated,
}: CreateFindingDialogProps) {
  const form = useForm<FindingFormValues>({
    resolver: zodResolver(findingSchema),
    defaultValues: {
      titleEn: "",
      descriptionEn: "",
      severity: "OBSERVATION",
      findingType: "OBSERVATION",
    },
  });

  // Create finding mutation
  const createFinding = trpc.finding.create.useMutation({
    onSuccess: (finding) => {
      toast.success("Finding created", {
        description: `Reference: ${finding.referenceNumber}`,
      });

      // Broadcast to collaboration session
      if (sessionId) {
        broadcastCreated.mutate({
          reviewId,
          sessionId,
          finding: {
            id: finding.id,
            referenceNumber: finding.referenceNumber,
            title: finding.titleEn,
            severity: finding.severity,
            status: finding.status,
            createdAt: finding.createdAt,
          },
        });
      }

      form.reset();
      onCreated();
    },
    onError: (error: { message: string }) => {
      toast.error("Failed to create finding", {
        description: error.message,
      });
    },
  });

  // Broadcast mutation
  const broadcastCreated =
    trpc.collaboration.broadcastFindingCreated.useMutation();

  const onSubmit = (values: FindingFormValues) => {
    createFinding.mutate({
      reviewId,
      organizationId,
      titleEn: values.titleEn,
      titleFr: values.titleEn, // Use same for now, can add FR field later
      descriptionEn: values.descriptionEn,
      descriptionFr: values.descriptionEn, // Use same for now
      severity: values.severity,
      findingType: values.findingType,
      criticalElement: values.criticalElement,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Finding</DialogTitle>
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
                    <Input
                      placeholder="Brief description of the finding"
                      {...field}
                    />
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
                    <Textarea
                      placeholder="Detailed description of the finding..."
                      rows={4}
                      {...field}
                    />
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
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
                  <FormLabel>Critical Element (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
              <Button type="submit" disabled={createFinding.isPending}>
                {createFinding.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Finding
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
