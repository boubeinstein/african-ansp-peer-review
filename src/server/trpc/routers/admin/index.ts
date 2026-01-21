import { router } from "../../trpc";
import { adminQuestionnaireRouter } from "./questionnaire";
import { adminUserRouter } from "./user";

/**
 * Admin router combining all admin-specific sub-routers
 */
export const adminRouter = router({
  questionnaire: adminQuestionnaireRouter,
  user: adminUserRouter,
});
