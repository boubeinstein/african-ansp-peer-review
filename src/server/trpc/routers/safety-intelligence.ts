import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import {
  getProgrammeKPIs,
  getANSPPerformance,
  getRegionalTeamSummaries,
  getFindingPatterns,
  getSystemicIssues,
  getTrendData,
  getCAPAnalytics,
} from "@/lib/safety-intelligence/aggregation-service";

// Reusable team filter input
const teamFilterSchema = z.object({
  teamId: z.string().nullish(),
});

export const safetyIntelligenceRouter = router({
  /**
   * Programme-wide KPIs
   */
  getKPIs: adminProcedure
    .input(teamFilterSchema)
    .query(async ({ ctx, input }) => {
      return getProgrammeKPIs(ctx.db, input.teamId ?? undefined);
    }),

  /**
   * Per-ANSP performance for benchmarking table
   */
  getANSPPerformance: adminProcedure
    .input(teamFilterSchema)
    .query(async ({ ctx, input }) => {
      return getANSPPerformance(ctx.db, input.teamId ?? undefined);
    }),

  /**
   * Regional team summaries
   */
  getTeamSummaries: adminProcedure.query(async ({ ctx }) => {
    return getRegionalTeamSummaries(ctx.db);
  }),

  /**
   * Finding patterns by audit area
   */
  getFindingPatterns: adminProcedure
    .input(teamFilterSchema)
    .query(async ({ ctx, input }) => {
      return getFindingPatterns(ctx.db, input.teamId ?? undefined);
    }),

  /**
   * Systemic issues across organizations
   */
  getSystemicIssues: adminProcedure
    .input(teamFilterSchema)
    .query(async ({ ctx, input }) => {
      return getSystemicIssues(ctx.db, input.teamId ?? undefined);
    }),

  /**
   * Quarterly trend data
   */
  getTrendData: adminProcedure
    .input(teamFilterSchema)
    .query(async ({ ctx, input }) => {
      return getTrendData(ctx.db, input.teamId ?? undefined);
    }),

  /**
   * CAP analytics
   */
  getCAPAnalytics: adminProcedure
    .input(teamFilterSchema)
    .query(async ({ ctx, input }) => {
      return getCAPAnalytics(ctx.db, input.teamId ?? undefined);
    }),
});
