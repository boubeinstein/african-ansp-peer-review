"use client";

/**
 * Report Team Tab
 *
 * Professional team composition display with:
 * - Team lead highlighted card
 * - Members grouped by role (Reviewers, Technical Experts, Observers)
 * - Card grid layout per member
 * - Expertise coverage matrix showing audit area coverage and gaps
 *
 * Data sourced from ReportContent.sections.teamComposition + methodology.
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  Crown,
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportContent, TeamMemberInfo } from "@/types/report";

// =============================================================================
// ROLE GROUPING
// =============================================================================

const ROLE_ORDER: Record<string, number> = {
  LEAD_REVIEWER: 0,
  REVIEWER: 1,
  PEER_REVIEWER: 1,
  TECHNICAL_EXPERT: 2,
  OBSERVER: 3,
};

const ROLE_GROUP_KEYS: Record<string, string> = {
  LEAD_REVIEWER: "leadReviewer",
  REVIEWER: "reviewers",
  PEER_REVIEWER: "reviewers",
  TECHNICAL_EXPERT: "technicalExperts",
  OBSERVER: "observers",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  LEAD_REVIEWER: <Crown className="h-4 w-4" />,
  REVIEWER: <Shield className="h-4 w-4" />,
  PEER_REVIEWER: <Shield className="h-4 w-4" />,
  TECHNICAL_EXPERT: <Shield className="h-4 w-4" />,
  OBSERVER: <Eye className="h-4 w-4" />,
};

interface GroupedMembers {
  key: string;
  members: TeamMemberInfo[];
}

function groupMembersByRole(members: TeamMemberInfo[]): GroupedMembers[] {
  const groups = new Map<string, TeamMemberInfo[]>();

  for (const member of members) {
    const groupKey = ROLE_GROUP_KEYS[member.role] || "reviewers";
    const existing = groups.get(groupKey) || [];
    existing.push(member);
    groups.set(groupKey, existing);
  }

  return Array.from(groups.entries())
    .map(([key, mems]) => ({ key, members: mems }))
    .sort((a, b) => {
      const orderA = ROLE_ORDER[a.members[0]?.role] ?? 99;
      const orderB = ROLE_ORDER[b.members[0]?.role] ?? 99;
      return orderA - orderB;
    });
}

// =============================================================================
// TEAM LEAD CARD
// =============================================================================

function TeamLeadCard({ lead }: { lead: TeamMemberInfo }) {
  const t = useTranslations("report.team");

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-full flex-shrink-0">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{lead.name}</h3>
              <Badge className="bg-primary text-primary-foreground text-xs">
                {t("leadReviewer")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {lead.organization}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {lead.country}
              </Badge>
            </div>
            {lead.expertise.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {lead.expertise.map((exp) => (
                  <Badge key={exp} variant="secondary" className="text-xs">
                    {exp}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MEMBER CARD
// =============================================================================

function MemberCard({ member }: { member: TeamMemberInfo }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-full flex-shrink-0">
            {ROLE_ICONS[member.role] || <Users className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{member.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {member.organization}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {member.role.replace(/_/g, " ")}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {member.country}
              </Badge>
            </div>
            {member.expertise.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {member.expertise.map((exp) => (
                  <Badge
                    key={exp}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {exp}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EXPERTISE COVERAGE MATRIX
// =============================================================================

function ExpertiseCoverageMatrix({ content }: { content: ReportContent }) {
  const t = useTranslations("report.team");
  const team = content.sections.teamComposition;
  const methodology = content.sections.methodology;

  // Get audit areas in scope
  const reviewAreas = useMemo(
    () => methodology.reviewAreas.filter((a: { inScope: boolean }) => a.inScope),
    [methodology.reviewAreas]
  );

  // Collect all team members (lead + members)
  const allMembers = useMemo(() => {
    const members: TeamMemberInfo[] = [];
    if (team.teamLead) members.push(team.teamLead);
    members.push(...team.members);
    return members;
  }, [team.teamLead, team.members]);

  // Build coverage map: audit area code -> list of member names
  const coverageMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const area of reviewAreas) {
      map.set(area.code, []);
    }
    for (const member of allMembers) {
      for (const exp of member.expertise) {
        const upper = exp.toUpperCase();
        if (map.has(upper)) {
          map.get(upper)!.push(member.name);
        }
      }
    }
    return map;
  }, [reviewAreas, allMembers]);

  if (reviewAreas.length === 0) return null;

  const hasGaps = Array.from(coverageMap.values()).some(
    (members) => members.length === 0
  );

  return (
    <Card className="report-section">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {t("expertiseCoverage")}
          {hasGaps && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {t("gapsDetected")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">{t("areaCode")}</TableHead>
                <TableHead className="w-[180px]">{t("areaName")}</TableHead>
                <TableHead>{t("coveredBy")}</TableHead>
                <TableHead className="w-[80px] text-center">
                  {t("coverageStatus")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewAreas.map((area: { code: string; name: string; pqCount: number; inScope: boolean }) => {
                const members = coverageMap.get(area.code) || [];
                const isCovered = members.length > 0;
                return (
                  <TableRow
                    key={area.code}
                    className={cn(!isCovered && "bg-amber-50 dark:bg-amber-900/10")}
                  >
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {area.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {area.name}
                    </TableCell>
                    <TableCell>
                      {members.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {members.map((name) => (
                            <Badge
                              key={name}
                              variant="secondary"
                              className="text-xs"
                            >
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-sm italic">
                          {t("noExpertAssigned")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isCovered ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportTeamTab({ content }: { content: ReportContent }) {
  const t = useTranslations("report.team");
  const team = content.sections.teamComposition;

  const totalMembers = (team.teamLead ? 1 : 0) + team.members.length;
  const groupedMembers = useMemo(
    () => groupMembersByRole(team.members),
    [team.members]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <Badge variant="secondary">{totalMembers}</Badge>
      </div>

      {/* Team Lead */}
      {team.teamLead && (
        <div className="report-section">
          <TeamLeadCard lead={team.teamLead} />
        </div>
      )}

      {/* Grouped Members */}
      {groupedMembers.map((group) => (
        <div key={group.key} className="space-y-3 report-section">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t(group.key)}
            </h4>
            <Badge variant="outline" className="text-xs">
              {group.members.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.members.map((member, idx) => (
              <MemberCard key={`${member.name}-${idx}`} member={member} />
            ))}
          </div>
        </div>
      ))}

      {/* Observer Organizations */}
      {team.observerOrganizations && team.observerOrganizations.length > 0 && (
        <Card className="report-section">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {t("observerOrganizations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {team.observerOrganizations.map((org) => (
                <Badge key={org} variant="outline" className="text-sm py-1">
                  {org}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expertise Coverage Matrix */}
      <ExpertiseCoverageMatrix content={content} />
    </div>
  );
}
