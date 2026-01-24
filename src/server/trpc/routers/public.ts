import { router, publicProcedure } from "../trpc";

/**
 * Public router for endpoints that don't require authentication.
 * Used for login page statistics and other public-facing data.
 */
export const publicRouter = router({
  /**
   * Get statistics for the login page
   * Returns participating ANSPs, reviewer count, teams, and upcoming milestones
   */
  getLoginPageStats: publicProcedure.query(async ({ ctx }) => {
    const [anspCount, reviewerCount, completedReviews] = await Promise.all([
      ctx.db.organization.count({
        where: { membershipStatus: "ACTIVE" },
      }),
      ctx.db.reviewerProfile.count({
        where: {
          status: { in: ["CERTIFIED", "LEAD_QUALIFIED"] },
        },
      }),
      ctx.db.review.count({
        where: { status: "COMPLETED" },
      }),
    ]);

    return {
      participatingANSPs: anspCount,
      expertReviewers: reviewerCount,
      regionalTeams: 5,
      completedReviews,
      teams: [
        {
          number: 1,
          nameEn: "ASECNA & Southern Africa Partnership",
          nameFr: "Partenariat ASECNA & Afrique Australe",
          members: "ASECNA, ATNS, CAAB, ESWACAA",
          orgCount: 4,
          reviewerCount: 8,
        },
        {
          number: 2,
          nameEn: "East African Community",
          nameFr: "Communauté d'Afrique de l'Est",
          members: "KCAA, TCAA, UCAA, RCAA, BCAA",
          orgCount: 5,
          reviewerCount: 10,
        },
        {
          number: 3,
          nameEn: "West African Anglophone",
          nameFr: "Afrique de l'Ouest Anglophone",
          members: "NAMA, GCAA, RFIR",
          orgCount: 3,
          reviewerCount: 6,
        },
        {
          number: 4,
          nameEn: "Southern & Eastern Africa",
          nameFr: "Afrique Australe et Orientale",
          members: "ADM, MCAA, ACM, CAAZ, ZACL",
          orgCount: 5,
          reviewerCount: 10,
        },
        {
          number: 5,
          nameEn: "Northern Africa",
          nameFr: "Afrique du Nord",
          members: "DGAC, OACA, ANAC",
          orgCount: 3,
          reviewerCount: 6,
        },
      ],
      nextMilestone: {
        titleEn: "AFI Peer Reviewers Training",
        titleFr: "Formation des Évaluateurs AFI",
        date: "Feb 2-5, 2026",
        location: "Dar es Salaam, Tanzania",
      },
    };
  }),
});
