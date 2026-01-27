/**
 * Seed Demo Notifications
 *
 * Creates realistic notifications for demo users based on existing
 * reviews, findings, and CAPs in the database.
 *
 * Run: npx tsx prisma/seed-notifications.ts
 * Or:  npm run db:seed:notifications
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type {
  NotificationType,
  NotificationPriority,
  UserRole,
} from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to create dates relative to now
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

interface NotificationData {
  userId: string;
  type: NotificationType;
  titleEn: string;
  titleFr: string;
  messageEn: string;
  messageFr: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionLabelEn?: string;
  actionLabelFr?: string;
  priority: NotificationPriority;
  createdAt: Date;
  readAt?: Date;
}

async function main() {
  console.log("\n🔔 Seeding Demo Notifications...\n");

  // Clear existing notifications
  const deleted = await prisma.notification.deleteMany({});
  console.log(`  🗑️  Cleared ${deleted.count} existing notifications`);

  // Get users to create notifications for
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
    },
    include: {
      organization: true,
    },
  });

  if (users.length === 0) {
    console.log("❌ No users found. Seed users first.");
    return;
  }

  console.log(`  👥 Found ${users.length} users`);

  // Get entities to reference in notifications
  const reviews = await prisma.review.findMany({
    take: 10,
    include: {
      hostOrganization: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const findings = await prisma.finding.findMany({
    take: 10,
    include: {
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const caps = await prisma.correctiveActionPlan.findMany({
    take: 10,
    include: {
      finding: {
        include: {
          review: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const assessments = await prisma.assessment.findMany({
    take: 10,
    include: {
      organization: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(
    `  📊 Found: ${reviews.length} reviews, ${findings.length} findings, ${caps.length} CAPs, ${assessments.length} assessments`
  );

  const notifications: NotificationData[] = [];

  // =========================================================================
  // PROGRAMME COORDINATORS & ADMINS - See everything
  // =========================================================================
  const adminRoles: UserRole[] = [
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "PROGRAMME_COORDINATOR",
    "STEERING_COMMITTEE",
  ];
  const adminUsers = users.filter((u) => adminRoles.includes(u.role));

  for (const user of adminUsers) {
    // System welcome (read)
    notifications.push({
      userId: user.id,
      type: "SYSTEM_ANNOUNCEMENT",
      titleEn: "Welcome to AAPRP Platform",
      titleFr: "Bienvenue sur la plateforme AAPRP",
      messageEn:
        "The African ANSP Peer Review Programme platform is ready for the February 2026 training. Explore the features and prepare for the refresher course.",
      messageFr:
        "La plateforme du Programme africain de revue par les pairs des ANSP est prête pour la formation de février 2026. Explorez les fonctionnalités et préparez-vous au cours de remise à niveau.",
      priority: "LOW",
      createdAt: daysAgo(14),
      readAt: daysAgo(13),
    });

    // Review requests
    if (reviews.length > 0) {
      notifications.push({
        userId: user.id,
        type: "REVIEW_REQUESTED",
        titleEn: "New Peer Review Request",
        titleFr: "Nouvelle demande de revue par les pairs",
        messageEn: `${reviews[0].hostOrganization?.nameEn || "An organization"} has requested a peer review.`,
        messageFr: `${reviews[0].hostOrganization?.nameFr || "Une organisation"} a demandé une revue par les pairs.`,
        entityType: "Review",
        entityId: reviews[0].id,
        actionUrl: `/reviews/${reviews[0].id}`,
        actionLabelEn: "Review Request",
        actionLabelFr: "Examiner la demande",
        priority: "HIGH",
        createdAt: daysAgo(3),
      });

      if (reviews.length > 1) {
        notifications.push({
          userId: user.id,
          type: "REVIEW_SCHEDULED",
          titleEn: "Peer Review Scheduled",
          titleFr: "Revue par les pairs programmée",
          messageEn: `Review ${reviews[1].referenceNumber} has been scheduled and confirmed.`,
          messageFr: `La revue ${reviews[1].referenceNumber} a été programmée et confirmée.`,
          entityType: "Review",
          entityId: reviews[1].id,
          actionUrl: `/reviews/${reviews[1].id}`,
          actionLabelEn: "View Details",
          actionLabelFr: "Voir les détails",
          priority: "NORMAL",
          createdAt: daysAgo(5),
          readAt: daysAgo(4),
        });
      }

      if (reviews.length > 2) {
        notifications.push({
          userId: user.id,
          type: "REVIEW_COMPLETED",
          titleEn: "Peer Review Completed",
          titleFr: "Revue par les pairs terminée",
          messageEn: `Review ${reviews[2].referenceNumber} has been completed. Final report is available.`,
          messageFr: `La revue ${reviews[2].referenceNumber} est terminée. Le rapport final est disponible.`,
          entityType: "Review",
          entityId: reviews[2].id,
          actionUrl: `/reviews/${reviews[2].id}`,
          actionLabelEn: "View Report",
          actionLabelFr: "Voir le rapport",
          priority: "NORMAL",
          createdAt: daysAgo(7),
          readAt: daysAgo(6),
        });
      }
    }

    // CAP overdue alerts
    if (caps.length > 0) {
      notifications.push({
        userId: user.id,
        type: "CAP_OVERDUE",
        titleEn: "CAP Overdue Alert",
        titleFr: "Alerte PAC en retard",
        messageEn: `A Corrective Action Plan is overdue. Please follow up with the organization.`,
        messageFr: `Un Plan d'Action Corrective est en retard. Veuillez faire un suivi avec l'organisation.`,
        entityType: "CAP",
        entityId: caps[0].id,
        actionUrl: `/caps/${caps[0].id}`,
        actionLabelEn: "View CAP",
        actionLabelFr: "Voir le PAC",
        priority: "URGENT",
        createdAt: daysAgo(1),
      });
    }
  }

  // =========================================================================
  // ANSP ADMINS - See their organization's notifications
  // =========================================================================
  const anspRoles: UserRole[] = ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"];
  const anspAdmins = users.filter((u) => anspRoles.includes(u.role));

  for (const user of anspAdmins) {
    // Welcome notification
    notifications.push({
      userId: user.id,
      type: "SYSTEM_ANNOUNCEMENT",
      titleEn: "Welcome to AAPRP",
      titleFr: "Bienvenue sur AAPRP",
      messageEn: `Welcome to the African ANSP Peer Review Programme. Complete your organization's self-assessment to request a peer review.`,
      messageFr: `Bienvenue au Programme africain de revue par les pairs des ANSP. Complétez l'auto-évaluation de votre organisation pour demander une revue par les pairs.`,
      priority: "NORMAL",
      createdAt: daysAgo(10),
      readAt: daysAgo(9),
    });

    // Find reviews for this user's organization
    const orgReviews = reviews.filter(
      (r) => r.hostOrganizationId === user.organizationId
    );
    if (orgReviews.length > 0) {
      notifications.push({
        userId: user.id,
        type: "REVIEW_APPROVED",
        titleEn: "Peer Review Request Approved",
        titleFr: "Demande de revue par les pairs approuvée",
        messageEn: `Your peer review request has been approved. Review ${orgReviews[0].referenceNumber} is now scheduled.`,
        messageFr: `Votre demande de revue par les pairs a été approuvée. La revue ${orgReviews[0].referenceNumber} est maintenant programmée.`,
        entityType: "Review",
        entityId: orgReviews[0].id,
        actionUrl: `/reviews/${orgReviews[0].id}`,
        actionLabelEn: "View Review",
        actionLabelFr: "Voir la revue",
        priority: "HIGH",
        createdAt: daysAgo(2),
      });

      notifications.push({
        userId: user.id,
        type: "TEAM_ASSIGNED",
        titleEn: "Review Team Assigned",
        titleFr: "Équipe de revue assignée",
        messageEn: `A review team has been assigned to ${orgReviews[0].referenceNumber}. You can now view the team composition.`,
        messageFr: `Une équipe de revue a été assignée à ${orgReviews[0].referenceNumber}. Vous pouvez maintenant voir la composition de l'équipe.`,
        entityType: "Review",
        entityId: orgReviews[0].id,
        actionUrl: `/reviews/${orgReviews[0].id}`,
        actionLabelEn: "View Team",
        actionLabelFr: "Voir l'équipe",
        priority: "NORMAL",
        createdAt: daysAgo(1),
      });
    }

    // Find findings for this user's organization
    const orgFindings = findings.filter(
      (f) => f.review?.hostOrganizationId === user.organizationId
    );
    if (orgFindings.length > 0) {
      notifications.push({
        userId: user.id,
        type: "FINDING_CREATED",
        titleEn: "New Finding Recorded",
        titleFr: "Nouvelle constatation enregistrée",
        messageEn: `A finding has been recorded: ${orgFindings[0].referenceNumber}. A corrective action plan is required.`,
        messageFr: `Une constatation a été enregistrée: ${orgFindings[0].referenceNumber}. Un plan d'action corrective est requis.`,
        entityType: "Finding",
        entityId: orgFindings[0].id,
        actionUrl: `/findings/${orgFindings[0].id}`,
        actionLabelEn: "View Finding",
        actionLabelFr: "Voir la constatation",
        priority: "HIGH",
        createdAt: daysAgo(4),
      });

      notifications.push({
        userId: user.id,
        type: "CAP_REQUIRED",
        titleEn: "Corrective Action Plan Required",
        titleFr: "Plan d'action corrective requis",
        messageEn: `Please submit a Corrective Action Plan for finding ${orgFindings[0].referenceNumber} within 30 days.`,
        messageFr: `Veuillez soumettre un plan d'action corrective pour la constatation ${orgFindings[0].referenceNumber} dans les 30 jours.`,
        entityType: "Finding",
        entityId: orgFindings[0].id,
        actionUrl: `/findings/${orgFindings[0].id}`,
        actionLabelEn: "Create CAP",
        actionLabelFr: "Créer un PAC",
        priority: "HIGH",
        createdAt: daysAgo(3),
      });
    }

    // CAP deadline approaching
    const orgCaps = caps.filter(
      (c) => c.finding?.review?.hostOrganizationId === user.organizationId
    );
    if (orgCaps.length > 0) {
      notifications.push({
        userId: user.id,
        type: "CAP_DEADLINE_APPROACHING",
        titleEn: "CAP Deadline Approaching",
        titleFr: "Échéance du PAC approchant",
        messageEn: `A CAP implementation deadline is in 7 days. Please ensure timely completion.`,
        messageFr: `L'échéance de mise en œuvre d'un PAC est dans 7 jours. Veuillez assurer une réalisation dans les délais.`,
        entityType: "CAP",
        entityId: orgCaps[0].id,
        actionUrl: `/caps/${orgCaps[0].id}`,
        actionLabelEn: "View CAP",
        actionLabelFr: "Voir le PAC",
        priority: "HIGH",
        createdAt: hoursAgo(12),
      });
    }

    // Assessment reminder
    const orgAssessments = assessments.filter(
      (a) => a.organizationId === user.organizationId
    );
    if (orgAssessments.length > 0) {
      notifications.push({
        userId: user.id,
        type: "REMINDER",
        titleEn: "Assessment In Progress",
        titleFr: "Évaluation en cours",
        messageEn: `Your self-assessment ${orgAssessments[0].referenceNumber} is in progress. Continue where you left off.`,
        messageFr: `Votre auto-évaluation ${orgAssessments[0].referenceNumber} est en cours. Continuez là où vous vous êtes arrêté.`,
        entityType: "Assessment",
        entityId: orgAssessments[0].id,
        actionUrl: `/assessments/${orgAssessments[0].id}`,
        actionLabelEn: "Continue",
        actionLabelFr: "Continuer",
        priority: "NORMAL",
        createdAt: daysAgo(2),
        readAt: daysAgo(1),
      });
    }
  }

  // =========================================================================
  // REVIEWERS - See review team and assignment notifications
  // =========================================================================
  const reviewerRoles: UserRole[] = ["LEAD_REVIEWER", "PEER_REVIEWER", "OBSERVER"];
  const reviewers = users.filter((u) => reviewerRoles.includes(u.role));

  for (const user of reviewers) {
    // Welcome for reviewers
    notifications.push({
      userId: user.id,
      type: "SYSTEM_ANNOUNCEMENT",
      titleEn: "Reviewer Profile Active",
      titleFr: "Profil de réviseur actif",
      messageEn:
        "Your reviewer profile is now active. You may receive invitations to join peer review teams.",
      messageFr:
        "Votre profil de réviseur est maintenant actif. Vous pourrez recevoir des invitations à rejoindre des équipes de revue par les pairs.",
      priority: "LOW",
      createdAt: daysAgo(14),
      readAt: daysAgo(12),
    });

    // Team invitation
    if (reviews.length > 0) {
      notifications.push({
        userId: user.id,
        type: "TEAM_INVITATION",
        titleEn: "Peer Review Team Invitation",
        titleFr: "Invitation à l'équipe de revue",
        messageEn: `You have been invited to join the review team for ${reviews[0].referenceNumber}. Please respond within 7 days.`,
        messageFr: `Vous avez été invité à rejoindre l'équipe de revue pour ${reviews[0].referenceNumber}. Veuillez répondre dans les 7 jours.`,
        entityType: "Review",
        entityId: reviews[0].id,
        actionUrl: `/reviews/${reviews[0].id}`,
        actionLabelEn: "Respond",
        actionLabelFr: "Répondre",
        priority: "HIGH",
        createdAt: daysAgo(2),
      });

      if (reviews.length > 1) {
        notifications.push({
          userId: user.id,
          type: "REVIEW_STARTED",
          titleEn: "Peer Review Started",
          titleFr: "Revue par les pairs démarrée",
          messageEn: `Review ${reviews[1].referenceNumber} has officially started. Access the fieldwork checklist and documents.`,
          messageFr: `La revue ${reviews[1].referenceNumber} a officiellement commencé. Accédez à la liste de contrôle de terrain et aux documents.`,
          entityType: "Review",
          entityId: reviews[1].id,
          actionUrl: `/reviews/${reviews[1].id}`,
          actionLabelEn: "View Review",
          actionLabelFr: "Voir la revue",
          priority: "NORMAL",
          createdAt: daysAgo(1),
        });
      }
    }

    // Finding assignment (for lead reviewers)
    if (user.role === "LEAD_REVIEWER" && findings.length > 0) {
      notifications.push({
        userId: user.id,
        type: "FINDING_CREATED",
        titleEn: "Finding Submitted for Review",
        titleFr: "Constatation soumise pour examen",
        messageEn: `Finding ${findings[0].referenceNumber} requires your review and approval.`,
        messageFr: `La constatation ${findings[0].referenceNumber} nécessite votre examen et approbation.`,
        entityType: "Finding",
        entityId: findings[0].id,
        actionUrl: `/findings/${findings[0].id}`,
        actionLabelEn: "Review Finding",
        actionLabelFr: "Examiner la constatation",
        priority: "NORMAL",
        createdAt: hoursAgo(6),
      });
    }

    // CAP submitted for verification
    if (caps.length > 0) {
      notifications.push({
        userId: user.id,
        type: "CAP_SUBMITTED",
        titleEn: "CAP Submitted for Verification",
        titleFr: "PAC soumis pour vérification",
        messageEn: `A Corrective Action Plan has been implemented and submitted for your verification.`,
        messageFr: `Un Plan d'Action Corrective a été mis en œuvre et soumis pour votre vérification.`,
        entityType: "CAP",
        entityId: caps[0].id,
        actionUrl: `/caps/${caps[0].id}`,
        actionLabelEn: "Verify CAP",
        actionLabelFr: "Vérifier le PAC",
        priority: "NORMAL",
        createdAt: daysAgo(1),
      });
    }
  }

  // =========================================================================
  // CREATE ALL NOTIFICATIONS
  // =========================================================================

  console.log(`\n  📝 Creating ${notifications.length} notifications...`);

  const created = await prisma.notification.createMany({
    data: notifications,
    skipDuplicates: true,
  });

  console.log(`  ✅ Created ${created.count} notifications`);

  // Summary by type
  const summary = notifications.reduce(
    (acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log("\n  📊 Summary by type:");
  Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });

  // Count unread
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  console.log(`\n  🔴 Unread notifications: ${unreadCount}`);

  console.log("\n✅ Notification seeding complete!\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
