"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { TaskPriority } from "@prisma/client";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Save,
  CalendarIcon,
  Plus,
  X,
  GripVertical,
} from "lucide-react";

// Checklist item type
interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

// Form schema
const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  assignedToId: z.string().optional(),
  priority: z.nativeEnum(TaskPriority),
  dueDate: z.date().optional().nullable(),
});

type FormValues = z.infer<typeof taskFormSchema>;

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface EditTask {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority | string;
  dueDate: string | Date | null;
  assignedTo?: TeamMember | null;
  assignedToId?: string | null;
  checklist: ChecklistItem[] | unknown | null;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  teamMembers: TeamMember[];
  onSuccess: () => void;
  editTask?: EditTask;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  reviewId,
  teamMembers,
  onSuccess,
  editTask,
}: CreateTaskDialogProps) {
  const t = useTranslations("reviews.workspace.tasks.form");

  const isEditMode = !!editTask;
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const lastEditTaskIdRef = useRef<string | null>(null);

  // Fetch team members if not provided (for edit mode)
  const { data: fetchedTeamMembers } = trpc.reviewDiscussion.getTeamMembers.useQuery(
    { reviewId },
    { enabled: open && teamMembers.length === 0 && !!reviewId }
  );

  const availableTeamMembers = teamMembers.length > 0 ? teamMembers : fetchedTeamMembers || [];

  // Create mutation
  const createMutation = trpc.reviewTask.create.useMutation({
    onSuccess: () => {
      toast.success(t("createSuccess"));
      resetForm();
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  // Update mutation
  const updateMutation = trpc.reviewTask.update.useMutation({
    onSuccess: () => {
      toast.success(t("updateSuccess"));
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedToId: "",
      priority: "MEDIUM",
      dueDate: null,
    },
  });

  // Reset form helper
  const resetForm = () => {
    form.reset({
      title: "",
      description: "",
      assignedToId: "",
      priority: "MEDIUM",
      dueDate: null,
    });
    setChecklist([]);
    setNewItemText("");
    lastEditTaskIdRef.current = null;
  };

  // Handle dialog close - reset form
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const onSubmit = (values: FormValues) => {
    const data = {
      title: values.title,
      description: values.description || undefined,
      assignedToId: values.assignedToId || undefined,
      priority: values.priority,
      dueDate: values.dueDate?.toISOString() || undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
    };

    if (isEditMode && editTask) {
      updateMutation.mutate({
        id: editTask.id,
        ...data,
      });
    } else {
      createMutation.mutate({
        reviewId,
        ...data,
      });
    }
  };

  // Checklist handlers
  const handleAddChecklistItem = () => {
    if (newItemText.trim()) {
      setChecklist([
        ...checklist,
        { id: uuidv4(), text: newItemText.trim(), completed: false },
      ]);
      setNewItemText("");
    }
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleUpdateChecklistItemText = (id: string, text: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, text } : item
      )
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Initialize form when dialog content receives focus (opens)
  const handleOpenAutoFocus = () => {
    if (editTask && lastEditTaskIdRef.current !== editTask.id) {
      lastEditTaskIdRef.current = editTask.id;
      const assigneeId = editTask.assignedTo?.id || editTask.assignedToId || "";
      form.reset({
        title: editTask.title,
        description: editTask.description || "",
        assignedToId: assigneeId,
        priority: editTask.priority as TaskPriority,
        dueDate: editTask.dueDate ? new Date(editTask.dueDate) : null,
      });
      setChecklist((editTask.checklist as ChecklistItem[]) || []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={handleOpenAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("title")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("titlePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("descriptionPlaceholder")}
                      rows={3}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignee and Priority row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assignee */}
              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("assignee")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("assigneePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
                        {availableTeamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName} {member.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("priority")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">{t("priorityLow")}</SelectItem>
                        <SelectItem value="MEDIUM">{t("priorityMedium")}</SelectItem>
                        <SelectItem value="HIGH">{t("priorityHigh")}</SelectItem>
                        <SelectItem value="URGENT">{t("priorityUrgent")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Due Date */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("dueDate")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t("dueDatePlaceholder")}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                      {field.value && (
                        <div className="p-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => field.onChange(null)}
                          >
                            {t("clearDate")}
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Checklist */}
            <div className="space-y-2">
              <FormLabel>{t("checklist")}</FormLabel>

              {/* Existing items */}
              {checklist.length > 0 && (
                <div className="space-y-2 mb-2">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 group"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-move" />
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => handleToggleChecklistItem(item.id)}
                      />
                      <Input
                        value={item.text}
                        onChange={(e) => handleUpdateChecklistItemText(item.id, e.target.value)}
                        className={cn(
                          "flex-1 h-8",
                          item.completed && "line-through text-muted-foreground"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveChecklistItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new item */}
              <div className="flex items-center gap-2">
                <Input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder={t("checklistPlaceholder")}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddChecklistItem}
                  disabled={!newItemText.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("addItem")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("checklistHelp")}
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isEditMode ? t("saveChanges") : t("createTask")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
