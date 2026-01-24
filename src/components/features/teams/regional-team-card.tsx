"use client";

/**
 * Regional Team Card Component
 *
 * Displays a peer review team with its members, lead organization, and key statistics.
 * Teams are partnership-based (similar characteristics: airspace, equipment, procedures)
 * - NOT strictly regional.
 */

import { cn } from "@/lib/utils";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Icons
import { Crown, Users } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface OrganizationSummary {
  id: string;
  nameEn: string;
  nameFr: string;
  organizationCode: string | null;
  country: string;
}

interface RegionalTeamData {
  id: string;
  teamNumber: number;
  code: string;
  nameEn: string;
  nameFr: string;
  isActive: boolean;
  leadOrganization: OrganizationSummary;
  memberOrganizations: OrganizationSummary[];
  _count?: {
    memberOrganizations: number;
  };
}

interface RegionalTeamCardProps {
  team: RegionalTeamData;
  locale: string;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Team number colors
const TEAM_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-blue-500", text: "text-white", border: "border-blue-500" },
  2: { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-500" },
  3: { bg: "bg-amber-500", text: "text-white", border: "border-amber-500" },
  4: { bg: "bg-purple-500", text: "text-white", border: "border-purple-500" },
  5: { bg: "bg-rose-500", text: "text-white", border: "border-rose-500" },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get initials from organization name
 */
function getInitials(name: string): string {
  const words = name.split(/\s+/);
  if (words.length === 1) {
    return name.substring(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Generate a consistent color based on string
 */
function getAvatarColor(str: string): string {
  const colors = [
    "bg-slate-500",
    "bg-gray-500",
    "bg-zinc-500",
    "bg-neutral-500",
    "bg-stone-500",
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function RegionalTeamCard({ team, locale, className }: RegionalTeamCardProps) {
  const isFrench = locale === "fr";
  const teamName = isFrench ? team.nameFr : team.nameEn;
  const leadOrgName = isFrench ? team.leadOrganization.nameFr : team.leadOrganization.nameEn;

  const teamColor = TEAM_COLORS[team.teamNumber] || TEAM_COLORS[1];
  const memberCount = team._count?.memberOrganizations ?? team.memberOrganizations.length;

  // Get members for avatar stack (max 5)
  const displayedMembers = team.memberOrganizations.slice(0, 5);
  const overflowCount = memberCount - 5;

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        !team.isActive && "opacity-60",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Team Number Circle */}
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold",
              teamColor.bg,
              teamColor.text
            )}
          >
            {team.teamNumber}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg leading-tight">{teamName}</CardTitle>
              {!team.isActive && (
                <Badge variant="secondary" className="text-xs">
                  {isFrench ? "Inactif" : "Inactive"}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              <Badge variant="outline" className="font-mono text-xs">
                {team.code}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Lead Organization */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <Crown className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {isFrench ? "Organisation Leader" : "Lead Organization"}
            </p>
            <p className="text-sm font-medium truncate">{leadOrgName}</p>
            {team.leadOrganization.organizationCode && (
              <p className="text-xs text-muted-foreground">
                {team.leadOrganization.organizationCode} - {team.leadOrganization.country}
              </p>
            )}
          </div>
        </div>

        {/* Member Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              {memberCount} {isFrench ? "membres" : "members"}
            </span>
          </div>
        </div>

        {/* Member Avatar Stack */}
        {displayedMembers.length > 0 && (
          <div className="flex items-center -space-x-2">
            {displayedMembers.map((member) => {
              const memberName = isFrench ? member.nameFr : member.nameEn;
              return (
                <Avatar
                  key={member.id}
                  className={cn(
                    "h-8 w-8 border-2 border-background",
                    getAvatarColor(member.id)
                  )}
                  title={memberName}
                >
                  <AvatarFallback className={cn("text-xs text-white", getAvatarColor(member.id))}>
                    {member.organizationCode?.substring(0, 2) || getInitials(memberName)}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {overflowCount > 0 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                +{overflowCount}
              </div>
            )}
          </div>
        )}

        {/* Member List (compact) */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          {team.memberOrganizations.slice(0, 3).map((member) => (
            <div key={member.id} className="truncate">
              {member.organizationCode && <span className="font-mono mr-1">{member.organizationCode}</span>}
              {isFrench ? member.nameFr : member.nameEn}
            </div>
          ))}
          {memberCount > 3 && (
            <div className="text-muted-foreground/60">
              +{memberCount - 3} {isFrench ? "autres" : "more"}...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RegionalTeamCard;
