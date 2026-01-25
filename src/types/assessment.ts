import type { QuestionnaireType } from "@prisma/client";

export interface CreateAssessmentInput {
  organizationId: string;
  questionnaireType: QuestionnaireType;
  title?: string;
  description?: string;
}

export interface AssessmentCreationContext {
  /** Current user's role */
  userRole: string;
  /** User's organization (if any) */
  userOrganizationId: string | null;
  /** User's organization name */
  userOrganizationName: string | null;
  /** Can user select a different organization? */
  canSelectOrganization: boolean;
  /** Available organizations for selection (if applicable) */
  availableOrganizations: {
    id: string;
    name: string;
    code: string;
    country: string;
  }[];
}

export interface AssessmentCreationStep {
  id: "organization" | "questionnaire" | "details" | "confirm";
  title: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
}

export interface AssessmentDraft {
  organizationId: string | null;
  organizationName: string | null;
  questionnaireType: QuestionnaireType | null;
  questionnaireName: string | null;
  title: string;
  description: string;
}
