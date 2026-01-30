"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.date().optional(),
  assignedToId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TeamMember {
  id: string;
  name: string;
  image: string | null;
}

interface TaskFormProps {
  reviewId: string;
  teamMembers: TeamMember[];
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultValues?: Partial<TaskFormData>;
  editTaskId?: string;
}

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function TaskForm({
  reviewId,
  teamMembers,
  onSuccess,
  onCancel,
  defaultValues,
  editTaskId,
}: TaskFormProps) {
  const t = useTranslations("reviews.detail.workspace.tasksList.form");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      priority: defaultValues?.priority || "MEDIUM",
      dueDate: defaultValues?.dueDate,
      assignedToId: defaultValues?.assignedToId,
    },
  });

  const createMutation = trpc.reviewTask.create.useMutation({
    onSuccess: () => {
      toast.success(t("createSuccess"));
      reset();
      utils.reviewTask.list.invalidate({ reviewId });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || t("createError"));
    },
  });

  const updateMutation = trpc.reviewTask.update.useMutation({
    onSuccess: () => {
      toast.success(t("updateSuccess"));
      utils.reviewTask.list.invalidate({ reviewId });
      if (editTaskId) utils.reviewTask.getById.invalidate({ id: editTaskId });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || t("updateError"));
    },
  });

  const onSubmit = (data: TaskFormData) => {
    const payload = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate?.toISOString(),
      assignedToId: data.assignedToId,
    };

    if (editTaskId) {
      updateMutation.mutate({ id: editTaskId, ...payload });
    } else {
      createMutation.mutate({ reviewId, ...payload });
    }
  };

  const priority = watch("priority");
  const dueDate = watch("dueDate");
  const assignedToId = watch("assignedToId");
  const selectedAssignee = teamMembers.find((m) => m.id === assignedToId);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{t("title")} *</Label>
        <Input
          id="title"
          placeholder={t("titlePlaceholder")}
          {...register("title")}
          disabled={isPending}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          placeholder={t("descriptionPlaceholder")}
          rows={3}
          {...register("description")}
          disabled={isPending}
        />
      </div>

      {/* Priority & Due Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("priority")} *</Label>
          <Select
            value={priority}
            onValueChange={(value) => setValue("priority", value as TaskFormData["priority"])}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        p === "URGENT" && "bg-red-500",
                        p === "HIGH" && "bg-orange-500",
                        p === "MEDIUM" && "bg-yellow-500",
                        p === "LOW" && "bg-green-500"
                      )}
                    />
                    {t(`priorities.${p}`)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("dueDate")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
                disabled={isPending}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP", { locale: dateLocale }) : t("dueDatePlaceholder")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={(date) => setValue("dueDate", date)}
                initialFocus
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Assignee */}
      <div className="space-y-2">
        <Label>{t("assignee")}</Label>
        <Select
          value={assignedToId || "unassigned"}
          onValueChange={(value) => setValue("assignedToId", value === "unassigned" ? undefined : value)}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue>
              {selectedAssignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedAssignee.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(selectedAssignee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{selectedAssignee.name}</span>
                </div>
              ) : (
                t("unassigned")
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <span className="text-muted-foreground">{t("unassigned")}</span>
            </SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            {t("cancel")}
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editTaskId ? t("update") : t("create")}
        </Button>
      </div>
    </form>
  );
}
