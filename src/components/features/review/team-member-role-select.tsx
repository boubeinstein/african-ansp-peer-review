"use client";

/**
 * Team Member Role Select Component
 *
 * Inline dropdown for selecting a team member's role.
 * Disables LEAD_REVIEWER option if reviewer is not lead-qualified.
 */

import { useTranslations } from "next-intl";
import type { TeamRole } from "@prisma/client";

// UI Components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import { Star, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface TeamMemberRoleSelectProps {
  value: TeamRole;
  onChange: (role: TeamRole) => void;
  isLeadQualified: boolean;
  /** Number of reviews completed (for tooltip) */
  reviewsCompleted?: number;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TEAM_ROLES: TeamRole[] = [
  "LEAD_REVIEWER",
  "REVIEWER",
  "TECHNICAL_EXPERT",
  "OBSERVER",
  "TRAINEE",
];

const ROLE_CONFIG: Record<
  TeamRole,
  {
    labelEn: string;
    labelFr: string;
    shortEn: string;
    shortFr: string;
    color: string;
    description?: string;
  }
> = {
  LEAD_REVIEWER: {
    labelEn: "Lead Reviewer",
    labelFr: "Evaluateur Principal",
    shortEn: "Lead",
    shortFr: "Chef",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    description: "Leads the review team and coordinates activities",
  },
  REVIEWER: {
    labelEn: "Reviewer",
    labelFr: "Evaluateur",
    shortEn: "Reviewer",
    shortFr: "Eval.",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    description: "Full team member conducting review activities",
  },
  TECHNICAL_EXPERT: {
    labelEn: "Technical Expert",
    labelFr: "Expert Technique",
    shortEn: "Expert",
    shortFr: "Expert",
    color: "bg-indigo-100 text-indigo-800 border-indigo-300",
    description: "Provides specialized technical expertise",
  },
  OBSERVER: {
    labelEn: "Observer",
    labelFr: "Observateur",
    shortEn: "Observer",
    shortFr: "Obs.",
    color: "bg-gray-100 text-gray-800 border-gray-300",
    description: "Observes review process without active participation",
  },
  TRAINEE: {
    labelEn: "Trainee",
    labelFr: "Stagiaire",
    shortEn: "Trainee",
    shortFr: "Stag.",
    color: "bg-green-100 text-green-800 border-green-300",
    description: "Learning through supervised participation",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

const MIN_REVIEWS_FOR_LEAD = 3;

export function TeamMemberRoleSelect({
  value,
  onChange,
  isLeadQualified,
  reviewsCompleted = 0,
  disabled = false,
  compact = false,
  className,
}: TeamMemberRoleSelectProps) {
  const t = useTranslations("review.teamWizard.roles");

  const config = ROLE_CONFIG[value];
  const needsMoreReviews = reviewsCompleted < MIN_REVIEWS_FOR_LEAD;

  // Generate tooltip content for lead requirements
  const getLeadRequirementsTooltip = () => {
    const requirements: string[] = [];
    if (!isLeadQualified) {
      requirements.push(t("requiresLeadStatus"));
    }
    if (needsMoreReviews) {
      requirements.push(t("requiresMinReviews", {
        current: reviewsCompleted,
        required: MIN_REVIEWS_FOR_LEAD
      }));
    }
    return requirements;
  };

  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as TeamRole)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          compact ? "h-8 text-xs w-[110px]" : "w-[160px]",
          className
        )}
      >
        <SelectValue>
          <Badge
            variant="outline"
            className={cn("font-normal border", config.color)}
          >
            {value === "LEAD_REVIEWER" && (
              <Star className="h-3 w-3 mr-1" />
            )}
            {compact ? t(`short.${value}`) : t(value)}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TEAM_ROLES.map((role) => {
          const isRoleDisabled = role === "LEAD_REVIEWER" && (!isLeadQualified || needsMoreReviews);
          const requirements = role === "LEAD_REVIEWER" ? getLeadRequirementsTooltip() : [];

          return (
            <SelectItem
              key={role}
              value={role}
              disabled={isRoleDisabled}
              className={cn(isRoleDisabled && "opacity-50")}
            >
              <div className="flex items-center gap-2">
                {role === "LEAD_REVIEWER" && (
                  <Star className="h-3.5 w-3.5 text-yellow-500" />
                )}
                <span>{t(role)}</span>
                {isRoleDisabled && requirements.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{t("leadRequirements")}</p>
                          <ul className="text-xs space-y-0.5">
                            {requirements.map((req, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <span className="text-red-500">•</span> {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default TeamMemberRoleSelect;
