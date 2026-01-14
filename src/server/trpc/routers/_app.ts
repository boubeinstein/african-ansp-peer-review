import { router, createCallerFactory } from "../trpc";
import { questionnaireRouter } from "./questionnaire";
import { adminRouter } from "./admin";

/**
 * Main app router combining all sub-routers
 */
export const appRouter = router({
  questionnaire: questionnaireRouter,
  admin: adminRouter,
});

/**
 * Export type definition of the API
 * This is used by the client to type-check calls
 */
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for direct procedure calls
 */
export const createCaller = createCallerFactory(appRouter);
