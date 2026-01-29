"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PresenceAvatars } from "@/components/collaboration";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EditFindingDialog } from "./edit-finding-dialog";
import { usePresence } from "@/hooks/use-presence";

interface Finding {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr?: string | null;
  descriptionEn: string;
  descriptionFr?: string | null;
  severity: string;
  status: string;
  findingType?: string;
  criticalElement?: string | null;
  reviewId: string;
  _count?: {
    comments: number;
    documents: number;
  };
}

interface FindingCardProps {
  finding: Finding;
  userId?: string; // Pass from server component - no need for SessionProvider
  sessionId?: string;
  locale?: string;
  onUpdate?: () => void;
}

const severityColors: Record<string, string> = {
  OBSERVATION: "bg-blue-100 text-blue-800 border-blue-200",
  MINOR: "bg-yellow-100 text-yellow-800 border-yellow-200",
  MAJOR: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  OPEN: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
  DISPUTED: "bg-red-100 text-red-800",
};

export function FindingCard({
  finding,
  userId,
  sessionId,
  locale = "en",
  onUpdate,
}: FindingCardProps) {
  const [showEdit, setShowEdit] = useState(false);

  // Get members viewing this finding - pass userId to avoid needing SessionProvider
  const { members } = usePresence({ reviewId: finding.reviewId, userId });
  const viewingMembers = members.filter(
    (m) => m.currentFocus === `finding:${finding.id}`
  );

  // Delete mutation
  const deleteFinding = trpc.finding.delete.useMutation({
    onSuccess: () => {
      toast.success("Finding deleted");

      // Broadcast deletion
      if (sessionId) {
        broadcastDeleted.mutate({
          reviewId: finding.reviewId,
          sessionId,
          findingId: finding.id,
          referenceNumber: finding.referenceNumber,
        });
      }

      onUpdate?.();
    },
    onError: (error: { message: string }) => {
      toast.error("Failed to delete", { description: error.message });
    },
  });

  const broadcastDeleted =
    trpc.collaboration.broadcastFindingDeleted.useMutation();

  const handleDelete = () => {
    if (confirm(`Delete finding ${finding.referenceNumber}?`)) {
      deleteFinding.mutate({ id: finding.id });
    }
  };

  // Get localized title and description
  const title =
    locale === "fr" && finding.titleFr ? finding.titleFr : finding.titleEn;
  const description =
    locale === "fr" && finding.descriptionFr
      ? finding.descriptionFr
      : finding.descriptionEn;

  return (
    <>
      <Card
        className={cn(
          "transition-all",
          viewingMembers.length > 0 && "ring-2 ring-primary/20"
        )}
        data-focus-id={`finding:${finding.id}`}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {finding.referenceNumber}
              </span>
              <Badge
                variant="outline"
                className={cn("text-xs", severityColors[finding.severity])}
              >
                {finding.severity}
              </Badge>
              <Badge
                variant="secondary"
                className={cn("text-xs", statusColors[finding.status])}
              >
                {finding.status}
              </Badge>
            </div>
            <h3 className="font-semibold leading-tight">{title}</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Users viewing this finding */}
            {viewingMembers.length > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-muted-foreground" />
                <PresenceAvatars
                  members={viewingMembers}
                  maxVisible={3}
                  size="sm"
                  showStatus={false}
                />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEdit(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            {finding.criticalElement && (
              <span>CE: {finding.criticalElement.replace("_", "-")}</span>
            )}
            {finding.findingType && (
              <span>{finding.findingType.replace(/_/g, " ")}</span>
            )}
            {finding._count && (
              <>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {finding._count.comments}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {finding._count.documents}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <EditFindingDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        finding={finding}
        sessionId={sessionId}
        onUpdated={() => {
          setShowEdit(false);
          onUpdate?.();
        }}
      />
    </>
  );
}
