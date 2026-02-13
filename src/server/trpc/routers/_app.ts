import { router, createCallerFactory } from "../trpc";
import { authRouter } from "./auth";
import { questionnaireRouter } from "./questionnaire";
import { adminRouter } from "./admin";
import { assessmentRouter } from "./assessment";
import { responseRouter } from "./response";
import { scoringRouter } from "./scoring";
import { documentRouter } from "./document";
import { progressRouter } from "./progress";
import { reviewerRouter } from "./reviewer";
import { organizationRouter } from "./organization";
import { coiRouter } from "./coi";
import { reviewRouter } from "./review";
import { findingRouter } from "./finding";
import { capRouter } from "./cap";
import { capEvidenceRouter } from "./cap-evidence";
import { reportRouter } from "./report";
import { trainingRouter } from "./training";
import { settingsRouter } from "./settings";
import { joinRequestRouter } from "./join-request";
import { dashboardRouter } from "./dashboard";
import { notificationRouter } from "./notification";
import { analyticsRouter } from "./analytics";
import { auditRouter } from "./audit";
import { translationRouter } from "./translation";
import { teamStatisticsRouter } from "./team-statistics";
import { activityRouter } from "./activity";
import { publicRouter } from "./public";
import { checklistRouter } from "./checklist";
import { bestPracticeRouter } from "./best-practice";
import { bestPracticePromotionRouter } from "./best-practice-promotion";
import { reviewDiscussionRouter } from "./review-discussion";
import { reviewTaskRouter } from "./review-task";
import { collaborationRouter } from "./collaboration";
import { workflowRouter } from "./workflow";
import { documentEnhancedRouter } from "./document-enhanced";
import { searchRouter } from "./search";
import { retrospectiveRouter } from "./retrospective";
import { lessonsRouter } from "./lessons";
import { onboardingRouter } from "./onboarding";
import { loginSessionRouter } from "./login-session";
import { safetyIntelligenceRouter } from "./safety-intelligence";
import { fieldworkSyncRouter } from "./fieldwork-sync";
import { retrospectiveAnalyticsRouter } from "./retrospective-analytics";

/**
 * Main app router combining all sub-routers
 */
export const appRouter = router({
  auth: authRouter,
  questionnaire: questionnaireRouter,
  admin: adminRouter,
  assessment: assessmentRouter,
  response: responseRouter,
  scoring: scoringRouter,
  document: documentRouter,
  progress: progressRouter,
  reviewer: reviewerRouter,
  organization: organizationRouter,
  coi: coiRouter,
  review: reviewRouter,
  finding: findingRouter,
  cap: capRouter,
  capEvidence: capEvidenceRouter,
  report: reportRouter,
  training: trainingRouter,
  settings: settingsRouter,
  joinRequest: joinRequestRouter,
  dashboard: dashboardRouter,
  notification: notificationRouter,
  analytics: analyticsRouter,
  audit: auditRouter,
  translation: translationRouter,
  teamStatistics: teamStatisticsRouter,
  activity: activityRouter,
  public: publicRouter,
  checklist: checklistRouter,
  bestPractice: bestPracticeRouter,
  bestPracticePromotion: bestPracticePromotionRouter,
  reviewDiscussion: reviewDiscussionRouter,
  reviewTask: reviewTaskRouter,
  collaboration: collaborationRouter,
  workflow: workflowRouter,
  documentEnhanced: documentEnhancedRouter,
  search: searchRouter,
  retrospective: retrospectiveRouter,
  lessons: lessonsRouter,
  onboarding: onboardingRouter,
  loginSession: loginSessionRouter,
  safetyIntelligence: safetyIntelligenceRouter,
  fieldworkSync: fieldworkSyncRouter,
  retrospectiveAnalytics: retrospectiveAnalyticsRouter,
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
