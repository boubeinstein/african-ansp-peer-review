import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, WorkflowStateType } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function seedWorkflows() {
  console.log("🔄 Seeding workflow definitions...");

  // Get system user for audit trail
  const systemUser = await db.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });
  const createdById = systemUser?.id || null;

  // =========================================================================
  // CAP WORKFLOW
  // =========================================================================
  const capWorkflow = await db.workflowDefinition.upsert({
    where: { code: "CAP_WORKFLOW_V1" },
    create: {
      code: "CAP_WORKFLOW_V1",
      nameEn: "Corrective Action Plan Workflow",
      nameFr: "Flux de travail du plan d'action corrective",
      descriptionEn:
        "Standard 6-stage CAP lifecycle from draft through verification and closure",
      descriptionFr:
        "Cycle de vie PAC standard à 6 étapes, du brouillon à la vérification et clôture",
      entityType: "CAP",
      isActive: true,
      isDefault: true,
      createdById,
    },
    update: { isActive: true, isDefault: true },
  });

  const capStates = [
    {
      code: "DRAFT",
      labelEn: "Draft",
      labelFr: "Brouillon",
      stateType: "INITIAL" as WorkflowStateType,
      color: "#6B7280",
      icon: "FileEdit",
      sortOrder: 1,
    },
    {
      code: "SUBMITTED",
      labelEn: "Submitted",
      labelFr: "Soumis",
      stateType: "INTERMEDIATE" as WorkflowStateType,
      color: "#3B82F6",
      icon: "Send",
      sortOrder: 2,
      defaultSLADays: 7,
    },
    {
      code: "ACCEPTED",
      labelEn: "Accepted",
      labelFr: "Accepté",
      stateType: "INTERMEDIATE" as WorkflowStateType,
      color: "#10B981",
      icon: "CheckCircle",
      sortOrder: 3,
    },
    {
      code: "REJECTED",
      labelEn: "Rejected",
      labelFr: "Rejeté",
      stateType: "REJECTED" as WorkflowStateType,
      color: "#EF4444",
      icon: "XCircle",
      sortOrder: 4,
    },
    {
      code: "IMPLEMENTED",
      labelEn: "Implemented",
      labelFr: "Mis en œuvre",
      stateType: "INTERMEDIATE" as WorkflowStateType,
      color: "#8B5CF6",
      icon: "Rocket",
      sortOrder: 5,
      defaultSLADays: 14,
    },
    {
      code: "VERIFIED",
      labelEn: "Verified",
      labelFr: "Vérifié",
      stateType: "INTERMEDIATE" as WorkflowStateType,
      color: "#06B6D4",
      icon: "BadgeCheck",
      sortOrder: 6,
    },
    {
      code: "CLOSED",
      labelEn: "Closed",
      labelFr: "Clôturé",
      stateType: "TERMINAL" as WorkflowStateType,
      color: "#059669",
      icon: "CheckCheck",
      sortOrder: 7,
    },
  ];

  const capStateMap: Record<string, string> = {};
  for (const state of capStates) {
    const created = await db.workflowState.upsert({
      where: {
        workflowId_code: { workflowId: capWorkflow.id, code: state.code },
      },
      create: { workflowId: capWorkflow.id, ...state },
      update: state,
    });
    capStateMap[state.code] = created.id;
  }

  const capTransitions = [
    {
      from: "DRAFT",
      to: "SUBMITTED",
      code: "SUBMIT",
      labelEn: "Submit for Review",
      labelFr: "Soumettre pour examen",
      allowedRoles: ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
      buttonVariant: "default",
      confirmRequired: true,
      confirmMessageEn: "Are you sure you want to submit this CAP for review?",
      confirmMessageFr:
        "Êtes-vous sûr de vouloir soumettre ce PAC pour examen?",
    },
    {
      from: "SUBMITTED",
      to: "ACCEPTED",
      code: "ACCEPT",
      labelEn: "Accept",
      labelFr: "Accepter",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
      buttonVariant: "default",
    },
    {
      from: "SUBMITTED",
      to: "REJECTED",
      code: "REJECT",
      labelEn: "Reject",
      labelFr: "Rejeter",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
      buttonVariant: "destructive",
      confirmRequired: true,
      confirmMessageEn:
        "Are you sure you want to reject this CAP? The submitter will need to revise it.",
      confirmMessageFr:
        "Êtes-vous sûr de vouloir rejeter ce PAC? Le soumetteur devra le réviser.",
    },
    {
      from: "REJECTED",
      to: "DRAFT",
      code: "REVISE",
      labelEn: "Revise",
      labelFr: "Réviser",
      allowedRoles: ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
      buttonVariant: "outline",
    },
    {
      from: "ACCEPTED",
      to: "IMPLEMENTED",
      code: "MARK_IMPLEMENTED",
      labelEn: "Mark as Implemented",
      labelFr: "Marquer comme mis en œuvre",
      allowedRoles: ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
      buttonVariant: "default",
      confirmRequired: true,
      confirmMessageEn:
        "Are you sure this CAP has been fully implemented? Evidence should be uploaded.",
      confirmMessageFr:
        "Êtes-vous sûr que ce PAC a été entièrement mis en œuvre? Les preuves doivent être téléchargées.",
    },
    {
      from: "IMPLEMENTED",
      to: "VERIFIED",
      code: "VERIFY",
      labelEn: "Verify Implementation",
      labelFr: "Vérifier la mise en œuvre",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
      buttonVariant: "default",
    },
    {
      from: "IMPLEMENTED",
      to: "ACCEPTED",
      code: "REQUEST_CHANGES",
      labelEn: "Request Changes",
      labelFr: "Demander des modifications",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
      buttonVariant: "outline",
    },
    {
      from: "VERIFIED",
      to: "CLOSED",
      code: "CLOSE",
      labelEn: "Close CAP",
      labelFr: "Clôturer le PAC",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR", "SUPER_ADMIN"],
      buttonVariant: "default",
      confirmRequired: true,
      confirmMessageEn: "Are you sure you want to close this CAP?",
      confirmMessageFr: "Êtes-vous sûr de vouloir clôturer ce PAC?",
    },
  ];

  for (const t of capTransitions) {
    await db.workflowTransition.upsert({
      where: {
        workflowId_fromStateId_code: {
          workflowId: capWorkflow.id,
          fromStateId: capStateMap[t.from],
          code: t.code,
        },
      },
      create: {
        workflowId: capWorkflow.id,
        fromStateId: capStateMap[t.from],
        toStateId: capStateMap[t.to],
        code: t.code,
        labelEn: t.labelEn,
        labelFr: t.labelFr,
        trigger: "MANUAL",
        allowedRoles: t.allowedRoles,
        buttonVariant: t.buttonVariant,
        confirmRequired: t.confirmRequired || false,
        confirmMessageEn: t.confirmMessageEn,
        confirmMessageFr: t.confirmMessageFr,
      },
      update: {
        labelEn: t.labelEn,
        labelFr: t.labelFr,
        allowedRoles: t.allowedRoles,
        buttonVariant: t.buttonVariant,
        confirmRequired: t.confirmRequired || false,
        confirmMessageEn: t.confirmMessageEn,
        confirmMessageFr: t.confirmMessageFr,
      },
    });
  }

  // Escalation rule for CAP review overdue
  await db.escalationRule.upsert({
    where: { id: "cap-submitted-overdue" },
    create: {
      id: "cap-submitted-overdue",
      workflowId: capWorkflow.id,
      stateId: capStateMap["SUBMITTED"],
      nameEn: "CAP Review Overdue",
      nameFr: "Examen du PAC en retard",
      triggerAfterDays: 7,
      action: "NOTIFY",
      actionConfig: {
        notifyRoles: ["PROGRAMME_COORDINATOR"],
        message: {
          en: "A CAP has been awaiting review for over 7 days",
          fr: "Un PAC attend un examen depuis plus de 7 jours",
        },
      },
      repeatIntervalDays: 3,
      maxRepeats: 3,
      isActive: true,
    },
    update: {},
  });

  // Escalation rule for implementation overdue
  await db.escalationRule.upsert({
    where: { id: "cap-implementation-overdue" },
    create: {
      id: "cap-implementation-overdue",
      workflowId: capWorkflow.id,
      stateId: capStateMap["ACCEPTED"],
      nameEn: "CAP Implementation Overdue",
      nameFr: "Mise en œuvre du PAC en retard",
      triggerAfterDays: 30,
      action: "ESCALATE",
      actionConfig: {
        message: {
          en: "A CAP has not been implemented within the expected timeframe",
          fr: "Un PAC n'a pas été mis en œuvre dans les délais prévus",
        },
      },
      repeatIntervalDays: 7,
      maxRepeats: 5,
      isActive: true,
    },
    update: {},
  });

  console.log("✅ CAP workflow seeded");

  // =========================================================================
  // FINDING WORKFLOW
  // =========================================================================
  const findingWorkflow = await db.workflowDefinition.upsert({
    where: { code: "FINDING_WORKFLOW_V1" },
    create: {
      code: "FINDING_WORKFLOW_V1",
      nameEn: "Finding Lifecycle",
      nameFr: "Cycle de vie des constatations",
      descriptionEn: "Tracking of peer review findings from identification to closure",
      descriptionFr:
        "Suivi des constatations d'examen par les pairs de l'identification à la clôture",
      entityType: "FINDING",
      isActive: true,
      isDefault: true,
      createdById,
    },
    update: { isActive: true, isDefault: true },
  });

  const findingStates = [
    {
      code: "OPEN",
      labelEn: "Open",
      labelFr: "Ouvert",
      stateType: "INITIAL" as WorkflowStateType,
      color: "#EF4444",
      icon: "AlertCircle",
      sortOrder: 1,
    },
    {
      code: "IN_PROGRESS",
      labelEn: "In Progress",
      labelFr: "En cours",
      stateType: "INTERMEDIATE" as WorkflowStateType,
      color: "#F59E0B",
      icon: "Clock",
      sortOrder: 2,
      defaultSLADays: 30,
    },
    {
      code: "CLOSED",
      labelEn: "Closed",
      labelFr: "Clôturé",
      stateType: "INTERMEDIATE" as WorkflowStateType,
      color: "#10B981",
      icon: "CheckCircle",
      sortOrder: 3,
    },
    {
      code: "VERIFIED",
      labelEn: "Verified",
      labelFr: "Vérifié",
      stateType: "TERMINAL" as WorkflowStateType,
      color: "#059669",
      icon: "BadgeCheck",
      sortOrder: 4,
    },
  ];

  const findingStateMap: Record<string, string> = {};
  for (const state of findingStates) {
    const created = await db.workflowState.upsert({
      where: {
        workflowId_code: { workflowId: findingWorkflow.id, code: state.code },
      },
      create: { workflowId: findingWorkflow.id, ...state },
      update: state,
    });
    findingStateMap[state.code] = created.id;
  }

  const findingTransitions = [
    {
      from: "OPEN",
      to: "IN_PROGRESS",
      code: "START_WORK",
      labelEn: "Start Working",
      labelFr: "Commencer le travail",
      allowedRoles: ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
      buttonVariant: "default",
    },
    {
      from: "IN_PROGRESS",
      to: "CLOSED",
      code: "CLOSE",
      labelEn: "Close Finding",
      labelFr: "Clôturer la constatation",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
      buttonVariant: "default",
      confirmRequired: true,
      confirmMessageEn:
        "Are you sure you want to close this finding? This indicates the corrective action has been addressed.",
      confirmMessageFr:
        "Êtes-vous sûr de vouloir clôturer cette constatation? Cela indique que l'action corrective a été traitée.",
    },
    {
      from: "IN_PROGRESS",
      to: "OPEN",
      code: "REOPEN",
      labelEn: "Reopen",
      labelFr: "Rouvrir",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
      buttonVariant: "outline",
    },
    {
      from: "CLOSED",
      to: "VERIFIED",
      code: "VERIFY",
      labelEn: "Verify Closure",
      labelFr: "Vérifier la clôture",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
      buttonVariant: "default",
    },
    {
      from: "CLOSED",
      to: "IN_PROGRESS",
      code: "REOPEN_FROM_CLOSED",
      labelEn: "Reopen",
      labelFr: "Rouvrir",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
      buttonVariant: "outline",
    },
  ];

  for (const t of findingTransitions) {
    await db.workflowTransition.upsert({
      where: {
        workflowId_fromStateId_code: {
          workflowId: findingWorkflow.id,
          fromStateId: findingStateMap[t.from],
          code: t.code,
        },
      },
      create: {
        workflowId: findingWorkflow.id,
        fromStateId: findingStateMap[t.from],
        toStateId: findingStateMap[t.to],
        code: t.code,
        labelEn: t.labelEn,
        labelFr: t.labelFr,
        trigger: "MANUAL",
        allowedRoles: t.allowedRoles,
        buttonVariant: t.buttonVariant || "default",
        confirmRequired: t.confirmRequired || false,
        confirmMessageEn: t.confirmMessageEn,
        confirmMessageFr: t.confirmMessageFr,
      },
      update: {},
    });
  }

  console.log("✅ Finding workflow seeded");

  // =========================================================================
  // REVIEW WORKFLOW
  // =========================================================================
  const reviewWorkflow = await db.workflowDefinition.upsert({
    where: { code: "REVIEW_WORKFLOW_V1" },
    create: {
      code: "REVIEW_WORKFLOW_V1",
      nameEn: "Peer Review Workflow",
      nameFr: "Flux d'examen par les pairs",
      descriptionEn:
        "Complete peer review lifecycle from request through completion",
      descriptionFr:
        "Cycle de vie complet de l'examen par les pairs de la demande à la finalisation",
      entityType: "REVIEW",
      isActive: true,
      isDefault: true,
      createdById,
    },
    update: { isActive: true, isDefault: true },
  });

  const reviewStates = [
    {
      code: "DRAFT",
      labelEn: "Draft",
      labelFr: "Brouillon",
      stateType: "INITIAL" as WorkflowStateType,
      color: "#6B7280",
      icon: "FileEdit",
      sortOrder: 1,
    },
    {
      code: "SUBMITTED",
      labelEn: "Submitted",
      labelFr: "Soumis",
      stateType: "INTERMEDIATE" as WorkflowStateType,
      color: "#3B82F6",
      icon: "Send",
      sortOrder: 2,
      defaultSLADays: 14,
    },
    {
      code: "APPROVED",
      labelEn: "Approved",
      labelFr: "Approuvé",
      stateType: "INTERMEDIATE" as WorkflowStateType,
      color: "#10B981",
      icon: "CheckCircle",
      sortOrder: 3,
    },
    {
      code: "REJECTED",
      labelEn: "Rejected",
      labelFr: "Rejeté",
      stateType: "REJECTED" as WorkflowStateType,
      color: "#EF4444",
      icon: "XCircle",
      sortOrder: 4,
    },
    {
      code: "SCHEDULED",
      labelEn: "Scheduled",
      labelFr: "Planifié",
      stateType: "INTERMEDIATE" as WorkflowStateType,
      color: "#8B5CF6",
      icon: "Calendar",
      sortOrder: 5,
    },
    {
      code: "IN_PROGRESS",
      labelEn: "In Progress",
      labelFr: "En cours",
      stateType: "INTERMEDIATE" as WorkflowStateType,
      color: "#F59E0B",
      icon: "Clock",
      sortOrder: 6,
    },
    {
      code: "COMPLETED",
      labelEn: "Completed",
      labelFr: "Terminé",
      stateType: "TERMINAL" as WorkflowStateType,
      color: "#059669",
      icon: "CheckCheck",
      sortOrder: 7,
    },
    {
      code: "CANCELLED",
      labelEn: "Cancelled",
      labelFr: "Annulé",
      stateType: "TERMINAL" as WorkflowStateType,
      color: "#6B7280",
      icon: "XCircle",
      sortOrder: 8,
    },
  ];

  const reviewStateMap: Record<string, string> = {};
  for (const state of reviewStates) {
    const created = await db.workflowState.upsert({
      where: {
        workflowId_code: { workflowId: reviewWorkflow.id, code: state.code },
      },
      create: { workflowId: reviewWorkflow.id, ...state },
      update: state,
    });
    reviewStateMap[state.code] = created.id;
  }

  const reviewTransitions = [
    {
      from: "DRAFT",
      to: "SUBMITTED",
      code: "SUBMIT",
      labelEn: "Submit Review Request",
      labelFr: "Soumettre la demande d'examen",
      allowedRoles: ["ANSP_ADMIN", "PROGRAMME_COORDINATOR"],
      buttonVariant: "default",
      confirmRequired: true,
      confirmMessageEn:
        "Are you sure you want to submit this review request for approval?",
      confirmMessageFr:
        "Êtes-vous sûr de vouloir soumettre cette demande d'examen pour approbation?",
    },
    {
      from: "SUBMITTED",
      to: "APPROVED",
      code: "APPROVE",
      labelEn: "Approve Request",
      labelFr: "Approuver la demande",
      allowedRoles: ["STEERING_COMMITTEE", "PROGRAMME_COORDINATOR"],
      buttonVariant: "default",
    },
    {
      from: "SUBMITTED",
      to: "REJECTED",
      code: "REJECT",
      labelEn: "Reject Request",
      labelFr: "Rejeter la demande",
      allowedRoles: ["STEERING_COMMITTEE", "PROGRAMME_COORDINATOR"],
      buttonVariant: "destructive",
      confirmRequired: true,
      confirmMessageEn:
        "Are you sure you want to reject this review request?",
      confirmMessageFr:
        "Êtes-vous sûr de vouloir rejeter cette demande d'examen?",
    },
    {
      from: "REJECTED",
      to: "DRAFT",
      code: "REVISE",
      labelEn: "Revise Request",
      labelFr: "Réviser la demande",
      allowedRoles: ["ANSP_ADMIN", "PROGRAMME_COORDINATOR"],
      buttonVariant: "outline",
    },
    {
      from: "APPROVED",
      to: "SCHEDULED",
      code: "SCHEDULE",
      labelEn: "Schedule Review",
      labelFr: "Planifier l'examen",
      allowedRoles: ["PROGRAMME_COORDINATOR"],
      buttonVariant: "default",
    },
    {
      from: "SCHEDULED",
      to: "IN_PROGRESS",
      code: "START",
      labelEn: "Start Review",
      labelFr: "Commencer l'examen",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
      buttonVariant: "default",
    },
    {
      from: "IN_PROGRESS",
      to: "COMPLETED",
      code: "COMPLETE",
      labelEn: "Complete Review",
      labelFr: "Terminer l'examen",
      allowedRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
      buttonVariant: "default",
      confirmRequired: true,
      confirmMessageEn:
        "Are you sure you want to mark this review as completed? All findings should be documented.",
      confirmMessageFr:
        "Êtes-vous sûr de vouloir marquer cet examen comme terminé? Toutes les constatations doivent être documentées.",
    },
    {
      from: "APPROVED",
      to: "CANCELLED",
      code: "CANCEL_APPROVED",
      labelEn: "Cancel Review",
      labelFr: "Annuler l'examen",
      allowedRoles: ["PROGRAMME_COORDINATOR", "SUPER_ADMIN"],
      buttonVariant: "destructive",
      confirmRequired: true,
      confirmMessageEn:
        "Are you sure you want to cancel this review? This action cannot be undone.",
      confirmMessageFr:
        "Êtes-vous sûr de vouloir annuler cet examen? Cette action ne peut pas être annulée.",
    },
    {
      from: "SCHEDULED",
      to: "CANCELLED",
      code: "CANCEL_SCHEDULED",
      labelEn: "Cancel Review",
      labelFr: "Annuler l'examen",
      allowedRoles: ["PROGRAMME_COORDINATOR", "SUPER_ADMIN"],
      buttonVariant: "destructive",
      confirmRequired: true,
      confirmMessageEn:
        "Are you sure you want to cancel this scheduled review? Team members will need to be notified.",
      confirmMessageFr:
        "Êtes-vous sûr de vouloir annuler cet examen planifié? Les membres de l'équipe devront être notifiés.",
    },
  ];

  for (const t of reviewTransitions) {
    await db.workflowTransition.upsert({
      where: {
        workflowId_fromStateId_code: {
          workflowId: reviewWorkflow.id,
          fromStateId: reviewStateMap[t.from],
          code: t.code,
        },
      },
      create: {
        workflowId: reviewWorkflow.id,
        fromStateId: reviewStateMap[t.from],
        toStateId: reviewStateMap[t.to],
        code: t.code,
        labelEn: t.labelEn,
        labelFr: t.labelFr,
        trigger: "MANUAL",
        allowedRoles: t.allowedRoles,
        buttonVariant: t.buttonVariant || "default",
        confirmRequired: t.confirmRequired || false,
        confirmMessageEn: t.confirmMessageEn,
        confirmMessageFr: t.confirmMessageFr,
      },
      update: {},
    });
  }

  // Escalation rule for review approval overdue
  await db.escalationRule.upsert({
    where: { id: "review-approval-overdue" },
    create: {
      id: "review-approval-overdue",
      workflowId: reviewWorkflow.id,
      stateId: reviewStateMap["SUBMITTED"],
      nameEn: "Review Approval Overdue",
      nameFr: "Approbation de l'examen en retard",
      triggerAfterDays: 14,
      action: "ESCALATE",
      actionConfig: {
        message: {
          en: "A peer review request has been awaiting approval for over 14 days",
          fr: "Une demande d'examen par les pairs attend une approbation depuis plus de 14 jours",
        },
      },
      repeatIntervalDays: 7,
      maxRepeats: 2,
      isActive: true,
    },
    update: {},
  });

  console.log("✅ Review workflow seeded");
  console.log("");
  console.log("🎉 All workflows seeded successfully!");
  console.log("");
  console.log("Summary:");
  console.log("  - CAP Workflow: 7 states, 8 transitions, 2 escalation rules");
  console.log("  - Finding Workflow: 4 states, 5 transitions");
  console.log("  - Review Workflow: 8 states, 9 transitions, 1 escalation rule");
}

seedWorkflows()
  .catch((error) => {
    console.error("❌ Error seeding workflows:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
