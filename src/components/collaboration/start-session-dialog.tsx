"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { SessionType } from "@prisma/client";

interface StartSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  reviewReference: string;
  onSessionStarted: () => void;
}

const SESSION_TYPES: {
  value: SessionType;
  label: string;
  description: string;
}[] = [
  {
    value: "FIELDWORK",
    label: "Fieldwork Session",
    description: "On-site review activities",
  },
  {
    value: "REMOTE",
    label: "Remote Collaboration",
    description: "Virtual team collaboration",
  },
  {
    value: "DOCUMENT_REVIEW",
    label: "Document Review",
    description: "Review submitted documents",
  },
  {
    value: "DEBRIEF",
    label: "Team Debrief",
    description: "Post-fieldwork discussion",
  },
  {
    value: "PLANNING",
    label: "Planning Session",
    description: "Review planning and preparation",
  },
];

export function StartSessionDialog({
  open,
  onOpenChange,
  reviewId,
  reviewReference,
  onSessionStarted,
}: StartSessionDialogProps) {
  const [sessionType, setSessionType] = useState<SessionType>("FIELDWORK");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const startSession = trpc.collaboration.startSession.useMutation({
    onSuccess: () => {
      toast.success("Session started", {
        description: "Team members can now join your collaboration session.",
      });
      onSessionStarted();
      resetForm();
    },
    onError: (error: { message: string }) => {
      toast.error("Failed to start session", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setSessionType("FIELDWORK");
    setTitle("");
    setDescription("");
    setIsRecording(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startSession.mutate({
      reviewId,
      sessionType,
      title: title || undefined,
      description: description || undefined,
      isRecording,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Start Collaboration Session</DialogTitle>
            <DialogDescription>
              Start a live session for review {reviewReference}. Team members
              will be notified and can join to collaborate in real-time.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Session Type */}
            <div className="grid gap-2">
              <Label htmlFor="sessionType">Session Type</Label>
              <Select
                value={sessionType}
                onValueChange={(value) => setSessionType(value as SessionType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select session type" />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">Session Title (Optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Day 1 - ATS Review"
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of session objectives..."
                rows={3}
              />
            </div>

            {/* Recording Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="recording">Record Session Activities</Label>
                <p className="text-sm text-muted-foreground">
                  Log all activities for audit trail and playback
                </p>
              </div>
              <Switch
                id="recording"
                checked={isRecording}
                onCheckedChange={setIsRecording}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={startSession.isPending}>
              {startSession.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Session
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
