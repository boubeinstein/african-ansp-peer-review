import { router } from "../../trpc";
import { adminQuestionnaireRouter } from "./questionnaire";

/**
 * Admin router combining all admin-specific sub-routers
 */
export const adminRouter = router({
  questionnaire: adminQuestionnaireRouter,
});
