import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { getRecentActivities } from "@/server/services/activity-service";

export const activityRouter = router({
  getRecent: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          teamId: z.string().optional(),
          days: z.number().min(1).max(90).default(30),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return getRecentActivities(input || {});
    }),
});
