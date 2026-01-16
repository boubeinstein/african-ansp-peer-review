/**
 * Seed Demo Reviewers
 *
 * Generates 99 demo reviewers for testing:
 * - 45 selected, 54 nominated
 * - Distributed across expertise areas
 * - All have EN+FR minimum
 * - Various statuses
 * - Sample certifications
 * - Random availability slots
 * - Some COI entries
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type {
  ExpertiseArea,
  ProficiencyLevel,
  Language,
  LanguageProficiency,
  ReviewerSelectionStatus,
  ReviewerType,
  COIType,
  AvailabilityType,
  CertificationType,
  ContactMethod,
  AfricanRegion,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// CONSTANTS
// =============================================================================

const EXPERTISE_AREAS: ExpertiseArea[] = [
  "ATS",
  "AIM_AIS",
  "MET",
  "CNS",
  "SAR",
  "PANS_OPS",
  "SMS_POLICY",
  "SMS_RISK",
  "SMS_ASSURANCE",
  "SMS_PROMOTION",
  "AERODROME",
  "RFF",
  "ENGINEERING",
  "QMS",
  "TRAINING",
  "HUMAN_FACTORS",
];

const LANGUAGES: Language[] = ["EN", "FR", "PT", "AR", "ES"];

const PROFICIENCY_LEVELS: ProficiencyLevel[] = ["BASIC", "COMPETENT", "PROFICIENT", "EXPERT"];

const LANGUAGE_PROFICIENCIES: LanguageProficiency[] = ["BASIC", "INTERMEDIATE", "ADVANCED", "NATIVE"];

const COI_TYPES: COIType[] = ["EMPLOYMENT", "FINANCIAL", "CONTRACTUAL", "PERSONAL", "PREVIOUS_REVIEW", "OTHER"];

const CERTIFICATION_TYPES: CertificationType[] = [
  "PEER_REVIEWER",
  "LEAD_REVIEWER",
  "SMS_ASSESSOR",
  "ICAO_AUDITOR",
  "CANSO_TRAINER",
  "ATC_LICENSE",
  "OTHER",
];

const AFRICAN_COUNTRIES = [
  "Algeria",
  "Angola",
  "Benin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cameroon",
  "Cape Verde",
  "Central African Republic",
  "Chad",
  "Comoros",
  "Congo",
  "DR Congo",
  "Côte d'Ivoire",
  "Djibouti",
  "Egypt",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "Gabon",
  "Gambia",
  "Ghana",
  "Guinea",
  "Guinea-Bissau",
  "Kenya",
  "Lesotho",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Mali",
  "Mauritania",
  "Mauritius",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Niger",
  "Nigeria",
  "Rwanda",
  "São Tomé",
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Sudan",
  "Tanzania",
  "Togo",
  "Tunisia",
  "Uganda",
  "Zambia",
  "Zimbabwe",
];

const FIRST_NAMES = [
  "Amadou",
  "Fatima",
  "Kwame",
  "Amina",
  "Chidi",
  "Zainab",
  "Oluwaseun",
  "Aisha",
  "Kofi",
  "Nadia",
  "Ibrahim",
  "Mariam",
  "Mohamed",
  "Adama",
  "Emmanuel",
  "Fatoumata",
  "Jean",
  "Marie",
  "Pierre",
  "Céline",
  "Ahmed",
  "Salma",
  "Youssef",
  "Leila",
  "Hassan",
  "Nour",
  "Omar",
  "Yasmine",
  "Moussa",
  "Khadija",
  "Ali",
  "Hawa",
  "Boubacar",
  "Aminata",
  "Mamadou",
  "Fatou",
  "Sekou",
  "Djamila",
  "Abdoulaye",
  "Rokia",
];

const LAST_NAMES = [
  "Diallo",
  "Traoré",
  "Konaté",
  "Camara",
  "Sylla",
  "Keita",
  "Ndiaye",
  "Sow",
  "Ba",
  "Diop",
  "Fall",
  "Sarr",
  "Ouedraogo",
  "Sawadogo",
  "Coulibaly",
  "Sanogo",
  "Touré",
  "Cissé",
  "Diabaté",
  "Koné",
  "Mensah",
  "Asante",
  "Osei",
  "Adjei",
  "Owusu",
  "Appiah",
  "Ofori",
  "Boateng",
  "Agyemang",
  "Dufour",
  "Mbeki",
  "Mandela",
  "Zuma",
  "Kenyatta",
  "Odinga",
  "Museveni",
  "Kagame",
  "Nkrumah",
  "Senghor",
  "Houphouët",
];

const POSITIONS = [
  "ATS Manager",
  "Safety Director",
  "ATM Expert",
  "CNS Engineer",
  "AIM/AIS Supervisor",
  "Meteorological Officer",
  "SAR Coordinator",
  "Quality Manager",
  "Training Manager",
  "Human Factors Specialist",
  "SMS Manager",
  "Operations Manager",
  "Technical Director",
  "Deputy Director General",
  "Chief Safety Officer",
];

// =============================================================================
// HELPERS
// =============================================================================

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDate(startYear: number, endYear: number): Date {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateFutureDate(monthsAhead: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.floor(Math.random() * monthsAhead));
  return date;
}

// =============================================================================
// ORGANIZATION SEEDING
// =============================================================================

async function seedOrganizations() {
  console.log("Creating organizations...");

  const organizations: Array<{
    nameEn: string;
    nameFr: string;
    icaoCode: string;
    country: string;
    region: AfricanRegion;
  }> = [];

  // Region mapping by country
  const regionByCountry: Record<string, AfricanRegion> = {
    // WACAF region (West & Central Africa)
    "Benin": "WACAF", "Burkina Faso": "WACAF", "Cape Verde": "WACAF",
    "Cameroon": "WACAF", "Central African Republic": "WACAF", "Chad": "WACAF",
    "Congo": "WACAF", "DR Congo": "WACAF", "Côte d'Ivoire": "WACAF",
    "Equatorial Guinea": "WACAF", "Gabon": "WACAF", "Gambia": "WACAF",
    "Ghana": "WACAF", "Guinea": "WACAF", "Guinea-Bissau": "WACAF",
    "Liberia": "WACAF", "Mali": "WACAF", "Mauritania": "WACAF",
    "Niger": "WACAF", "Nigeria": "WACAF", "Senegal": "WACAF",
    "Sierra Leone": "WACAF", "Togo": "WACAF", "São Tomé": "WACAF",
    // ESAF region (Eastern & Southern Africa)
    "Angola": "ESAF", "Botswana": "ESAF", "Burundi": "ESAF",
    "Comoros": "ESAF", "Djibouti": "ESAF", "Eritrea": "ESAF",
    "Eswatini": "ESAF", "Ethiopia": "ESAF", "Kenya": "ESAF",
    "Lesotho": "ESAF", "Madagascar": "ESAF", "Malawi": "ESAF",
    "Mauritius": "ESAF", "Mozambique": "ESAF", "Namibia": "ESAF",
    "Rwanda": "ESAF", "Seychelles": "ESAF", "Somalia": "ESAF",
    "South Africa": "ESAF", "South Sudan": "ESAF", "Sudan": "ESAF",
    "Tanzania": "ESAF", "Uganda": "ESAF", "Zambia": "ESAF", "Zimbabwe": "ESAF",
    // NORTHERN region
    "Algeria": "NORTHERN", "Egypt": "NORTHERN", "Libya": "NORTHERN",
    "Morocco": "NORTHERN", "Tunisia": "NORTHERN",
  };

  // Create ANSP organizations for major African countries
  const majorCountries = AFRICAN_COUNTRIES.slice(0, 30);

  for (const country of majorCountries) {
    const code = country.slice(0, 2).toUpperCase() + "ANS";
    organizations.push({
      nameEn: `${country} Air Navigation Services`,
      nameFr: `Services de Navigation Aérienne du ${country}`,
      icaoCode: code,
      country,
      region: regionByCountry[country] || "WACAF",
    });
  }

  const createdOrgs: string[] = [];

  for (const org of organizations) {
    const created = await prisma.organization.upsert({
      where: { icaoCode: org.icaoCode },
      update: {},
      create: {
        nameEn: org.nameEn,
        nameFr: org.nameFr,
        icaoCode: org.icaoCode,
        country: org.country,
        region: org.region,
        membershipStatus: "ACTIVE",
      },
    });
    createdOrgs.push(created.id);
  }

  console.log(`  Created/updated ${createdOrgs.length} organizations`);
  return createdOrgs;
}

// =============================================================================
// REVIEWER SEEDING
// =============================================================================

interface ReviewerData {
  firstName: string;
  lastName: string;
  email: string;
  organizationId: string;
  status: ReviewerSelectionStatus;
  isLeadQualified: boolean;
  yearsExperience: number;
  reviewsCompleted: number;
  expertise: Array<{
    area: ExpertiseArea;
    level: ProficiencyLevel;
    years: number;
    isPrimary: boolean;
  }>;
  languages: Array<{
    language: Language;
    proficiency: LanguageProficiency;
    canConductInterviews: boolean;
    canWriteReports: boolean;
  }>;
  certifications: Array<{
    type: CertificationType;
    name: string;
    issuer: string;
    issuedDate: Date;
    expiryDate: Date | null;
    isValid: boolean;
  }>;
  availability: Array<{
    startDate: Date;
    endDate: Date;
    type: AvailabilityType;
  }>;
  coi: Array<{
    organizationId: string;
    type: COIType;
    reason: string;
  }>;
}

function generateReviewer(
  index: number,
  organizationIds: string[],
  isSelected: boolean
): ReviewerData {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  const email = `reviewer${index + 1}@aaprp-demo.org`;
  const organizationId = randomElement(organizationIds);

  // More experienced reviewers are more likely to be selected/lead qualified
  const baseYears = isSelected ? randomInt(8, 25) : randomInt(3, 15);
  const baseReviews = isSelected ? randomInt(2, 15) : randomInt(0, 5);
  const isLeadQualified = isSelected && baseYears >= 10 && baseReviews >= 3 && Math.random() > 0.5;

  // Generate expertise (2-5 areas)
  const expertiseCount = randomInt(2, 5);
  const selectedExpertise = randomElements(EXPERTISE_AREAS, expertiseCount, expertiseCount);
  const expertise = selectedExpertise.map((area, idx) => ({
    area,
    level: isSelected
      ? randomElement(["PROFICIENT", "EXPERT"] as ProficiencyLevel[])
      : randomElement(PROFICIENCY_LEVELS),
    years: randomInt(2, Math.min(baseYears, 15)),
    isPrimary: idx === 0,
  }));

  // Generate languages (always include EN and FR)
  const languages: ReviewerData["languages"] = [
    {
      language: "EN",
      proficiency: randomElement(["INTERMEDIATE", "ADVANCED", "NATIVE"] as LanguageProficiency[]),
      canConductInterviews: true,
      canWriteReports: true,
    },
    {
      language: "FR",
      proficiency: randomElement(["INTERMEDIATE", "ADVANCED", "NATIVE"] as LanguageProficiency[]),
      canConductInterviews: true,
      canWriteReports: true,
    },
  ];

  // Some reviewers have additional languages
  if (Math.random() > 0.6) {
    const additionalLangs = randomElements(["PT", "AR", "ES"] as Language[], 1, 2);
    for (const lang of additionalLangs) {
      languages.push({
        language: lang,
        proficiency: randomElement(LANGUAGE_PROFICIENCIES),
        canConductInterviews: Math.random() > 0.5,
        canWriteReports: Math.random() > 0.5,
      });
    }
  }

  // Generate certifications (0-3)
  const certCount = randomInt(0, 3);
  const certifications: ReviewerData["certifications"] = [];
  if (certCount > 0) {
    const selectedCerts = randomElements(CERTIFICATION_TYPES, certCount, certCount);
    for (const certType of selectedCerts) {
      const issuedDate = generateDate(2018, 2024);
      const hasExpiry = Math.random() > 0.3;
      const expiryDate = hasExpiry ? generateFutureDate(24) : null;
      certifications.push({
        type: certType,
        name: `${certType.replace(/_/g, " ")} Certification`,
        issuer: randomElement(["ICAO", "CANSO", "National CAA", "AFCAC", "ASECNA"]),
        issuedDate,
        expiryDate,
        isValid: !hasExpiry || (expiryDate != null && expiryDate > new Date()),
      });
    }
  }

  // Generate availability (2-6 periods in the next year)
  const availability: ReviewerData["availability"] = [];
  const availCount = randomInt(2, 6);
  for (let i = 0; i < availCount; i++) {
    const startDate = generateFutureDate(12);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + randomInt(7, 30));
    availability.push({
      startDate,
      endDate,
      type: randomElement(["AVAILABLE", "AVAILABLE", "AVAILABLE", "TENTATIVE", "ON_ASSIGNMENT"] as AvailabilityType[]),
    });
  }

  // Generate COI (0-2)
  const coi: ReviewerData["coi"] = [];
  if (Math.random() > 0.8) {
    const coiCount = randomInt(1, 2);
    const coiOrgs = randomElements(
      organizationIds.filter((id) => id !== organizationId),
      coiCount,
      coiCount
    );
    for (const coiOrgId of coiOrgs) {
      coi.push({
        organizationId: coiOrgId,
        type: randomElement(COI_TYPES),
        reason: "Previous employment or professional relationship",
      });
    }
  }

  return {
    firstName,
    lastName,
    email,
    organizationId,
    status: isSelected ? "SELECTED" : randomElement(["NOMINATED", "UNDER_REVIEW"] as ReviewerSelectionStatus[]),
    isLeadQualified,
    yearsExperience: baseYears,
    reviewsCompleted: baseReviews,
    expertise,
    languages,
    certifications,
    availability,
    coi,
  };
}

async function seedReviewers(organizationIds: string[]) {
  console.log("Creating reviewers...");

  const passwordHash = await bcrypt.hash("DemoPassword123!", 12);

  let selectedCount = 0;
  let nominatedCount = 0;

  for (let i = 0; i < 99; i++) {
    const isSelected = i < 45; // First 45 are selected
    const reviewerData = generateReviewer(i, organizationIds, isSelected);

    if (isSelected) selectedCount++;
    else nominatedCount++;

    // Create user
    const user = await prisma.user.upsert({
      where: { email: reviewerData.email },
      update: {},
      create: {
        email: reviewerData.email,
        passwordHash,
        firstName: reviewerData.firstName,
        lastName: reviewerData.lastName,
        role: "PEER_REVIEWER",
        organizationId: reviewerData.organizationId,
        locale: Math.random() > 0.5 ? "EN" : "FR",
        isActive: true,
      },
    });

    // Create reviewer profile
    const profile = await prisma.reviewerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        organizationId: reviewerData.organizationId,
        homeOrganizationId: reviewerData.organizationId,
        reviewerType: "PEER_REVIEWER" as ReviewerType,
        selectionStatus: reviewerData.status,
        isLeadQualified: reviewerData.isLeadQualified,
        yearsExperience: reviewerData.yearsExperience,
        reviewsCompleted: reviewerData.reviewsCompleted,
        isAvailable: true,
        currentPosition: randomElement(POSITIONS),
        biography: `Experienced aviation professional with ${reviewerData.yearsExperience} years in the industry.`,
        preferredContactMethod: randomElement(["EMAIL", "PHONE", "TEAMS"] as ContactMethod[]),
      },
    });

    // Create expertise records
    for (const exp of reviewerData.expertise) {
      await prisma.reviewerExpertise.create({
        data: {
          reviewerProfileId: profile.id,
          area: exp.area,
          proficiencyLevel: exp.level,
          yearsExperience: exp.years,
        },
      });
    }

    // Create language records
    for (const lang of reviewerData.languages) {
      await prisma.reviewerLanguage.create({
        data: {
          reviewerProfileId: profile.id,
          language: lang.language,
          proficiency: lang.proficiency,
          canConductInterviews: lang.canConductInterviews,
          canWriteReports: lang.canWriteReports,
        },
      });
    }

    // Create certification records
    for (const cert of reviewerData.certifications) {
      await prisma.reviewerCertification.create({
        data: {
          reviewerProfileId: profile.id,
          certificationType: cert.type,
          certificationName: cert.name,
          certificationNameFr: cert.name,
          issuingAuthority: cert.issuer,
          issueDate: cert.issuedDate,
          expiryDate: cert.expiryDate,
          isValid: cert.isValid,
        },
      });
    }

    // Create availability records
    for (const avail of reviewerData.availability) {
      await prisma.reviewerAvailability.create({
        data: {
          reviewerProfileId: profile.id,
          startDate: avail.startDate,
          endDate: avail.endDate,
          availabilityType: avail.type,
          isRecurring: false,
        },
      });
    }

    // Create COI records
    for (const coi of reviewerData.coi) {
      await prisma.reviewerCOI.create({
        data: {
          reviewerProfileId: profile.id,
          organizationId: coi.organizationId,
          coiType: coi.type,
          reason: coi.reason,
          startDate: new Date(),
          isActive: true,
        },
      });
    }

    if ((i + 1) % 10 === 0) {
      console.log(`  Created ${i + 1} reviewers...`);
    }
  }

  console.log(`  Created 99 reviewers: ${selectedCount} selected, ${nominatedCount} nominated`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("Starting reviewer seed...\n");

  try {
    // Seed organizations first
    const organizationIds = await seedOrganizations();

    // Seed reviewers
    await seedReviewers(organizationIds);

    // Print summary
    const stats = await prisma.reviewerProfile.groupBy({
      by: ["selectionStatus"],
      _count: { id: true },
    });

    console.log("\n=== Reviewer Seed Summary ===");
    console.log(`Total organizations: ${organizationIds.length}`);
    console.log("Reviewers by status:");
    for (const stat of stats) {
      console.log(`  ${stat.selectionStatus}: ${stat._count.id}`);
    }

    const leadCount = await prisma.reviewerProfile.count({
      where: { isLeadQualified: true },
    });
    console.log(`Lead qualified: ${leadCount}`);

    console.log("\n✓ Reviewer seed completed successfully!");
  } catch (error) {
    console.error("\n✗ Reviewer seed failed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

export { seedReviewers };
