/**
 * Regional Teams Admin Page
 *
 * Displays all 5 regional peer review teams with their members and leads.
 */

import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";

// Components
import { RegionalTeamCard } from "@/components/features/teams/regional-team-card";

// Icons
import { Users, Globe } from "lucide-react";

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getRegionalTeams() {
  const prisma = db;

  const teams = await prisma.regionalTeam.findMany({
    orderBy: { teamNumber: "asc" },
    include: {
      leadOrganization: {
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          organizationCode: true,
          country: true,
        },
      },
      memberOrganizations: {
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          organizationCode: true,
          country: true,
        },
        orderBy: { nameEn: "asc" },
      },
      _count: {
        select: { memberOrganizations: true },
      },
    },
  });

  return teams;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function RegionalTeamsPage() {
  const locale = await getLocale();
  const teams = await getRegionalTeams();

  const isFrench = locale === "fr";

  // Calculate totals
  const totalMembers = teams.reduce(
  (sum: number, team: { _count?: { memberOrganizations: number } }) => sum + (team._count?.memberOrganizations ?? 0),
  0
);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-8 w-8 text-primary" />
            {isFrench ? "Équipes Régionales" : "Regional Teams"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isFrench
              ? "Les 5 équipes de revue par les pairs du Programme Africain ANSP"
              : "The 5 peer review teams of the African ANSP Programme"}
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{teams.length}</p>
              <p className="text-xs text-muted-foreground">
                {isFrench ? "Équipes" : "Teams"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{totalMembers}</p>
              <p className="text-xs text-muted-foreground">
                {isFrench ? "Organisations" : "Organizations"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">
            {isFrench ? "Aucune équipe trouvée" : "No teams found"}
          </h3>
          <p className="text-muted-foreground mt-1">
            {isFrench
              ? "Les équipes régionales n'ont pas encore été configurées."
              : "Regional teams have not been configured yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <RegionalTeamCard key={team.id} team={team} locale={locale} />
          ))}
        </div>
      )}

      {/* Team Composition Legend */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-3">
          {isFrench ? "Composition des Équipes" : "Team Composition"}
        </h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <span className="font-medium text-blue-600">Team 1:</span>{" "}
            ASECNA, ATNS, Botswana, Eswatini
          </div>
          <div>
            <span className="font-medium text-emerald-600">Team 2:</span>{" "}
            Uganda, Tanzania, Burundi, Rwanda, Kenya
          </div>
          <div>
            <span className="font-medium text-amber-600">Team 3:</span>{" "}
            NAMA (Nigeria), GCAA (Ghana), Roberts FIR
          </div>
          <div>
            <span className="font-medium text-purple-600">Team 4:</span>{" "}
            Mozambique, Malawi, Madagascar, Zimbabwe, Zambia
          </div>
          <div>
            <span className="font-medium text-rose-600">Team 5:</span>{" "}
            Morocco, Tunisia, Algeria
          </div>
        </div>
      </div>
    </div>
  );
}
