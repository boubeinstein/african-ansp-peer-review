/**
 * Seed Script: Demo Users and Reviewer Profiles
 *
 * Creates demo users with reviewer profiles for all 20 organizations:
 * - 2 reviewers per organization (1 Lead Qualified, 1 Certified)
 * - 3 system users (Admin, Coordinator, Steering Committee)
 *
 * Usage:
 *   npx tsx prisma/seed-demo-users.ts          # Seed data
 *   npx tsx prisma/seed-demo-users.ts cleanup  # Clean users
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserRole,
  ReviewerStatus,
  LanguageProficiency,
  ExpertiseArea,
  Language,
  ReviewerType,
  ReviewerSelectionStatus,
  ContactMethod,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "Demo2024!";
const SALT_ROUNDS = 10;

// =============================================================================
// USER DATA
// =============================================================================

interface ReviewerData {
  firstName: string;
  lastName: string;
  email: string;
  orgIcaoCode: string;
  role: UserRole;
  position: string;
  yearsExperience: number;
  status: ReviewerStatus;
  isLeadQualified: boolean;
  expertiseAreas: ExpertiseArea[];
  languages: { language: Language; proficiency: LanguageProficiency; isNative: boolean }[];
  reviewsCompleted: number;
  reviewsAsLead: number;
}

interface SystemUserData {
  firstName: string;
  lastName: string;
  email: string;
  orgIcaoCode: string;
  role: UserRole;
}

// Team 1 - ASECNA & Southern Africa Partnership
const TEAM_1_REVIEWERS: ReviewerData[] = [
  {
    firstName: "Amadou",
    lastName: "Diallo",
    email: "amadou.diallo@asecna.aero",
    orgIcaoCode: "ASEC",
    role: "PEER_REVIEWER" as UserRole,
    position: "Chief Air Traffic Controller",
    yearsExperience: 22,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "SMS_POLICY", "SMS_RISK"],
    languages: [
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "EN" as Language, proficiency: "ADVANCED" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 8,
    reviewsAsLead: 3,
  },
  {
    firstName: "Fatou",
    lastName: "Ndiaye",
    email: "fatou.ndiaye@asecna.aero",
    orgIcaoCode: "ASEC",
    role: "PEER_REVIEWER" as UserRole,
    position: "Safety Manager",
    yearsExperience: 12,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_ASSURANCE", "SMS_PROMOTION"],
    languages: [
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "EN" as Language, proficiency: "INTERMEDIATE" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 4,
    reviewsAsLead: 0,
  },
  {
    firstName: "Thabo",
    lastName: "Molefe",
    email: "thabo.molefe@atns.co.za",
    orgIcaoCode: "ATNS",
    role: "PEER_REVIEWER" as UserRole,
    position: "Operations Director",
    yearsExperience: 25,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "CNS", "PANS_OPS"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 12,
    reviewsAsLead: 5,
  },
  {
    firstName: "Nomvula",
    lastName: "Dlamini",
    email: "nomvula.dlamini@atns.co.za",
    orgIcaoCode: "ATNS",
    role: "PEER_REVIEWER" as UserRole,
    position: "Quality Assurance Manager",
    yearsExperience: 10,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_ASSURANCE", "AIM_AIS"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 3,
    reviewsAsLead: 0,
  },
  {
    firstName: "Kago",
    lastName: "Mothibi",
    email: "kago.mothibi@caab.co.bw",
    orgIcaoCode: "FBSK",
    role: "PEER_REVIEWER" as UserRole,
    position: "Senior ATC Supervisor",
    yearsExperience: 18,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "SAR"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 6,
    reviewsAsLead: 2,
  },
  {
    firstName: "Lesego",
    lastName: "Phiri",
    email: "lesego.phiri@caab.co.bw",
    orgIcaoCode: "FBSK",
    role: "PEER_REVIEWER" as UserRole,
    position: "AIS Officer",
    yearsExperience: 8,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["AIM_AIS", "MET"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 2,
    reviewsAsLead: 0,
  },
  {
    firstName: "Sipho",
    lastName: "Dlamini",
    email: "sipho.dlamini@ecaa.co.sz",
    orgIcaoCode: "FDMS",
    role: "PEER_REVIEWER" as UserRole,
    position: "Director of Air Navigation Services",
    yearsExperience: 20,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "SMS_POLICY", "CNS"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 5,
    reviewsAsLead: 2,
  },
  {
    firstName: "Thandiwe",
    lastName: "Nkosi",
    email: "thandiwe.nkosi@ecaa.co.sz",
    orgIcaoCode: "FDMS",
    role: "PEER_REVIEWER" as UserRole,
    position: "Communications Specialist",
    yearsExperience: 9,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["CNS", "MET"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 2,
    reviewsAsLead: 0,
  },
];

// Team 2 - East African Community
const TEAM_2_REVIEWERS: ReviewerData[] = [
  {
    firstName: "James",
    lastName: "Ochieng",
    email: "james.ochieng@kcaa.or.ke",
    orgIcaoCode: "HKJK",
    role: "PEER_REVIEWER" as UserRole,
    position: "Chief Operations Officer",
    yearsExperience: 24,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "PANS_OPS", "SMS_POLICY"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 10,
    reviewsAsLead: 4,
  },
  {
    firstName: "Wanjiku",
    lastName: "Kamau",
    email: "wanjiku.kamau@kcaa.or.ke",
    orgIcaoCode: "HKJK",
    role: "PEER_REVIEWER" as UserRole,
    position: "Safety Analyst",
    yearsExperience: 11,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_RISK", "SMS_ASSURANCE"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 4,
    reviewsAsLead: 0,
  },
  {
    firstName: "Baraka",
    lastName: "Mwakasege",
    email: "baraka.mwakasege@tcaa.go.tz",
    orgIcaoCode: "HTDA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Director of ANS",
    yearsExperience: 21,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "CNS", "SAR"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 7,
    reviewsAsLead: 3,
  },
  {
    firstName: "Rehema",
    lastName: "Mushi",
    email: "rehema.mushi@tcaa.go.tz",
    orgIcaoCode: "HTDA",
    role: "PEER_REVIEWER" as UserRole,
    position: "AIM Supervisor",
    yearsExperience: 9,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["AIM_AIS", "MET"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 3,
    reviewsAsLead: 0,
  },
  {
    firstName: "Moses",
    lastName: "Okello",
    email: "moses.okello@caa.go.ug",
    orgIcaoCode: "HUEN",
    role: "PEER_REVIEWER" as UserRole,
    position: "Senior ATC Manager",
    yearsExperience: 19,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "SMS_POLICY", "PANS_OPS"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 6,
    reviewsAsLead: 2,
  },
  {
    firstName: "Grace",
    lastName: "Nakato",
    email: "grace.nakato@caa.go.ug",
    orgIcaoCode: "HUEN",
    role: "PEER_REVIEWER" as UserRole,
    position: "Training Coordinator",
    yearsExperience: 8,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_PROMOTION", "ATS"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 2,
    reviewsAsLead: 0,
  },
  {
    firstName: "Jean-Pierre",
    lastName: "Mugabo",
    email: "jp.mugabo@rcaa.gov.rw",
    orgIcaoCode: "HRYR",
    role: "PEER_REVIEWER" as UserRole,
    position: "Deputy Director ANS",
    yearsExperience: 17,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "CNS", "SMS_RISK"],
    languages: [
      { language: "EN" as Language, proficiency: "ADVANCED" as LanguageProficiency, isNative: false },
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 5,
    reviewsAsLead: 2,
  },
  {
    firstName: "Claire",
    lastName: "Uwimana",
    email: "claire.uwimana@rcaa.gov.rw",
    orgIcaoCode: "HRYR",
    role: "PEER_REVIEWER" as UserRole,
    position: "Quality Manager",
    yearsExperience: 10,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_ASSURANCE", "SMS_PROMOTION"],
    languages: [
      { language: "EN" as Language, proficiency: "ADVANCED" as LanguageProficiency, isNative: false },
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 3,
    reviewsAsLead: 0,
  },
  {
    firstName: "Pierre",
    lastName: "Ndayisaba",
    email: "pierre.ndayisaba@bcaa.bi",
    orgIcaoCode: "HBBA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Chief Air Traffic Controller",
    yearsExperience: 16,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "SAR", "PANS_OPS"],
    languages: [
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "EN" as Language, proficiency: "INTERMEDIATE" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 4,
    reviewsAsLead: 1,
  },
  {
    firstName: "Aline",
    lastName: "Niyonzima",
    email: "aline.niyonzima@bcaa.bi",
    orgIcaoCode: "HBBA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Safety Officer",
    yearsExperience: 7,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_RISK", "MET"],
    languages: [
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "EN" as Language, proficiency: "INTERMEDIATE" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 2,
    reviewsAsLead: 0,
  },
];

// Team 3 - West African Anglophone
const TEAM_3_REVIEWERS: ReviewerData[] = [
  {
    firstName: "Chukwuemeka",
    lastName: "Okonkwo",
    email: "chukwuemeka.okonkwo@nama.gov.ng",
    orgIcaoCode: "DNAA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Director of Operations",
    yearsExperience: 26,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "SMS_POLICY", "PANS_OPS", "CNS"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 14,
    reviewsAsLead: 6,
  },
  {
    firstName: "Ngozi",
    lastName: "Adeyemi",
    email: "ngozi.adeyemi@nama.gov.ng",
    orgIcaoCode: "DNAA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Senior Safety Manager",
    yearsExperience: 13,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_RISK", "SMS_ASSURANCE", "SMS_PROMOTION"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 5,
    reviewsAsLead: 0,
  },
  {
    firstName: "Kwame",
    lastName: "Asante",
    email: "kwame.asante@gcaa.com.gh",
    orgIcaoCode: "DGAA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Chief ATC Manager",
    yearsExperience: 20,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "CNS", "SAR"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 9,
    reviewsAsLead: 4,
  },
  {
    firstName: "Abena",
    lastName: "Mensah",
    email: "abena.mensah@gcaa.com.gh",
    orgIcaoCode: "DGAA",
    role: "PEER_REVIEWER" as UserRole,
    position: "AIM Manager",
    yearsExperience: 11,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["AIM_AIS", "MET"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 4,
    reviewsAsLead: 0,
  },
  {
    firstName: "Sekou",
    lastName: "Camara",
    email: "sekou.camara@robertsfir.lr",
    orgIcaoCode: "GLRB",
    role: "PEER_REVIEWER" as UserRole,
    position: "Operations Manager",
    yearsExperience: 15,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "SMS_POLICY", "PANS_OPS"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 5,
    reviewsAsLead: 2,
  },
  {
    firstName: "Mariama",
    lastName: "Bah",
    email: "mariama.bah@robertsfir.lr",
    orgIcaoCode: "GLRB",
    role: "PEER_REVIEWER" as UserRole,
    position: "Safety Specialist",
    yearsExperience: 8,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_RISK", "SMS_ASSURANCE"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 2,
    reviewsAsLead: 0,
  },
];

// Team 4 - Southern & Eastern Africa
const TEAM_4_REVIEWERS: ReviewerData[] = [
  {
    firstName: "Carlos",
    lastName: "Machava",
    email: "carlos.machava@adm.co.mz",
    orgIcaoCode: "FQMA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Director of ANS",
    yearsExperience: 23,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "CNS", "SMS_POLICY"],
    languages: [
      { language: "PT" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "EN" as Language, proficiency: "ADVANCED" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 8,
    reviewsAsLead: 3,
  },
  {
    firstName: "Ana",
    lastName: "Tembe",
    email: "ana.tembe@adm.co.mz",
    orgIcaoCode: "FQMA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Quality Manager",
    yearsExperience: 10,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_ASSURANCE", "AIM_AIS"],
    languages: [
      { language: "PT" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "EN" as Language, proficiency: "INTERMEDIATE" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 3,
    reviewsAsLead: 0,
  },
  {
    firstName: "Chimwemwe",
    lastName: "Banda",
    email: "chimwemwe.banda@dca.gov.mw",
    orgIcaoCode: "FWKI",
    role: "PEER_REVIEWER" as UserRole,
    position: "Chief ATC",
    yearsExperience: 18,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "SAR", "PANS_OPS"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 6,
    reviewsAsLead: 2,
  },
  {
    firstName: "Tionge",
    lastName: "Phiri",
    email: "tionge.phiri@dca.gov.mw",
    orgIcaoCode: "FWKI",
    role: "PEER_REVIEWER" as UserRole,
    position: "Safety Officer",
    yearsExperience: 9,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_RISK", "MET"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 2,
    reviewsAsLead: 0,
  },
  {
    firstName: "Jean-Claude",
    lastName: "Rakotomalala",
    email: "jc.rakotomalala@adema.mg",
    orgIcaoCode: "FMMI",
    role: "PEER_REVIEWER" as UserRole,
    position: "Deputy Director Operations",
    yearsExperience: 21,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "CNS", "SMS_POLICY"],
    languages: [
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "EN" as Language, proficiency: "ADVANCED" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 7,
    reviewsAsLead: 3,
  },
  {
    firstName: "Hery",
    lastName: "Andriamanana",
    email: "hery.andriamanana@adema.mg",
    orgIcaoCode: "FMMI",
    role: "PEER_REVIEWER" as UserRole,
    position: "AIS Supervisor",
    yearsExperience: 12,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["AIM_AIS", "MET"],
    languages: [
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "EN" as Language, proficiency: "INTERMEDIATE" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 4,
    reviewsAsLead: 0,
  },
  {
    firstName: "Tendai",
    lastName: "Moyo",
    email: "tendai.moyo@caaz.co.zw",
    orgIcaoCode: "FVHA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Senior Operations Manager",
    yearsExperience: 19,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "PANS_OPS", "SAR"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 6,
    reviewsAsLead: 2,
  },
  {
    firstName: "Chiedza",
    lastName: "Ncube",
    email: "chiedza.ncube@caaz.co.zw",
    orgIcaoCode: "FVHA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Training Manager",
    yearsExperience: 10,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_PROMOTION", "SMS_ASSURANCE"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 3,
    reviewsAsLead: 0,
  },
  {
    firstName: "Mulenga",
    lastName: "Chanda",
    email: "mulenga.chanda@zacl.co.zm",
    orgIcaoCode: "FLKK",
    role: "PEER_REVIEWER" as UserRole,
    position: "Director of Air Navigation",
    yearsExperience: 22,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "CNS", "SMS_POLICY"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 8,
    reviewsAsLead: 3,
  },
  {
    firstName: "Natasha",
    lastName: "Mumba",
    email: "natasha.mumba@zacl.co.zm",
    orgIcaoCode: "FLKK",
    role: "PEER_REVIEWER" as UserRole,
    position: "Quality Assurance Officer",
    yearsExperience: 8,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_ASSURANCE", "AIM_AIS"],
    languages: [
      { language: "EN" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
    ],
    reviewsCompleted: 2,
    reviewsAsLead: 0,
  },
];

// Team 5 - Northern Africa
const TEAM_5_REVIEWERS: ReviewerData[] = [
  {
    firstName: "Youssef",
    lastName: "Benali",
    email: "youssef.benali@onda.ma",
    orgIcaoCode: "GMMN",
    role: "PEER_REVIEWER" as UserRole,
    position: "Chief Operations Officer",
    yearsExperience: 24,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "CNS", "PANS_OPS"],
    languages: [
      { language: "AR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: false },
      { language: "EN" as Language, proficiency: "ADVANCED" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 11,
    reviewsAsLead: 5,
  },
  {
    firstName: "Fatima",
    lastName: "Alaoui",
    email: "fatima.alaoui@onda.ma",
    orgIcaoCode: "GMMN",
    role: "PEER_REVIEWER" as UserRole,
    position: "Safety Director",
    yearsExperience: 14,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_POLICY", "SMS_RISK", "SMS_ASSURANCE"],
    languages: [
      { language: "AR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "FR" as Language, proficiency: "ADVANCED" as LanguageProficiency, isNative: false },
      { language: "EN" as Language, proficiency: "INTERMEDIATE" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 5,
    reviewsAsLead: 0,
  },
  {
    firstName: "Mohamed",
    lastName: "Trabelsi",
    email: "mohamed.trabelsi@oaca.nat.tn",
    orgIcaoCode: "DTTA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Director of ANS",
    yearsExperience: 21,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "SAR", "SMS_POLICY"],
    languages: [
      { language: "AR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: false },
      { language: "EN" as Language, proficiency: "ADVANCED" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 9,
    reviewsAsLead: 4,
  },
  {
    firstName: "Leila",
    lastName: "Chaabane",
    email: "leila.chaabane@oaca.nat.tn",
    orgIcaoCode: "DTTA",
    role: "PEER_REVIEWER" as UserRole,
    position: "Quality Manager",
    yearsExperience: 11,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["SMS_ASSURANCE", "SMS_PROMOTION"],
    languages: [
      { language: "AR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "FR" as Language, proficiency: "ADVANCED" as LanguageProficiency, isNative: false },
      { language: "EN" as Language, proficiency: "INTERMEDIATE" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 4,
    reviewsAsLead: 0,
  },
  {
    firstName: "Karim",
    lastName: "Boudiaf",
    email: "karim.boudiaf@enna.dz",
    orgIcaoCode: "DAAG",
    role: "PEER_REVIEWER" as UserRole,
    position: "Senior Operations Manager",
    yearsExperience: 20,
    status: "LEAD_QUALIFIED" as ReviewerStatus,
    isLeadQualified: true,
    expertiseAreas: ["ATS", "CNS", "PANS_OPS"],
    languages: [
      { language: "AR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "FR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: false },
      { language: "EN" as Language, proficiency: "INTERMEDIATE" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 7,
    reviewsAsLead: 3,
  },
  {
    firstName: "Samira",
    lastName: "Hadj",
    email: "samira.hadj@enna.dz",
    orgIcaoCode: "DAAG",
    role: "PEER_REVIEWER" as UserRole,
    position: "AIM Manager",
    yearsExperience: 12,
    status: "CERTIFIED" as ReviewerStatus,
    isLeadQualified: false,
    expertiseAreas: ["AIM_AIS", "MET"],
    languages: [
      { language: "AR" as Language, proficiency: "NATIVE" as LanguageProficiency, isNative: true },
      { language: "FR" as Language, proficiency: "ADVANCED" as LanguageProficiency, isNative: false },
      { language: "EN" as Language, proficiency: "BASIC" as LanguageProficiency, isNative: false },
    ],
    reviewsCompleted: 3,
    reviewsAsLead: 0,
  },
];

// System Users
const SYSTEM_USERS: SystemUserData[] = [
  {
    firstName: "System",
    lastName: "Administrator",
    email: "admin@aaprp.aero",
    orgIcaoCode: "ASEC",
    role: "SUPER_ADMIN" as UserRole,
  },
  {
    firstName: "Pauline",
    lastName: "Runghen",
    email: "coordinator@aaprp.aero",
    orgIcaoCode: "ASEC",
    role: "PROGRAMME_COORDINATOR" as UserRole,
  },
  {
    firstName: "Emmanuel",
    lastName: "Chukwuma",
    email: "steering@aaprp.aero",
    orgIcaoCode: "DNAA",
    role: "STEERING_COMMITTEE" as UserRole,
  },
];

// Combine all reviewers
const ALL_REVIEWERS: ReviewerData[] = [
  ...TEAM_1_REVIEWERS,
  ...TEAM_2_REVIEWERS,
  ...TEAM_3_REVIEWERS,
  ...TEAM_4_REVIEWERS,
  ...TEAM_5_REVIEWERS,
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedUsers(): Promise<void> {
  console.log("\n👤 Seeding Users and Reviewer Profiles...\n");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  let userCount = 0;
  let profileCount = 0;

  // Seed Reviewers
  for (const userData of ALL_REVIEWERS) {
    // Find organization by icaoCode
    const org = await prisma.organization.findFirst({
      where: { icaoCode: userData.orgIcaoCode },
    });

    if (!org) {
      console.log(`  ⚠️ Org not found: ${userData.orgIcaoCode}`);
      continue;
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { email: userData.email },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          organizationId: org.id,
          passwordHash,
          isActive: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          organizationId: org.id,
          passwordHash,
          isActive: true,
        },
      });
    }
    userCount++;

    // Create reviewer profile
    let profile = await prisma.reviewerProfile.findFirst({
      where: { userId: user.id },
    });

    const now = new Date();
    const certifiedAt = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

    if (profile) {
      profile = await prisma.reviewerProfile.update({
        where: { id: profile.id },
        data: {
          organizationId: org.id,
          homeOrganizationId: org.id,
          status: userData.status,
          currentPosition: userData.position,
          yearsExperience: userData.yearsExperience,
          expertiseAreas: userData.expertiseAreas,
          isLeadQualified: userData.isLeadQualified,
          leadQualifiedAt: userData.isLeadQualified ? certifiedAt : null,
          certifiedAt: certifiedAt,
          reviewsCompleted: userData.reviewsCompleted,
          reviewsAsLead: userData.reviewsAsLead,
          isAvailable: true,
          reviewerType: "PEER_REVIEWER" as ReviewerType,
          selectionStatus: "SELECTED" as ReviewerSelectionStatus,
          preferredContactMethod: "EMAIL" as ContactMethod,
        },
      });
    } else {
      profile = await prisma.reviewerProfile.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          homeOrganizationId: org.id,
          status: userData.status,
          currentPosition: userData.position,
          yearsExperience: userData.yearsExperience,
          expertiseAreas: userData.expertiseAreas,
          isLeadQualified: userData.isLeadQualified,
          leadQualifiedAt: userData.isLeadQualified ? certifiedAt : null,
          certifiedAt: certifiedAt,
          reviewsCompleted: userData.reviewsCompleted,
          reviewsAsLead: userData.reviewsAsLead,
          isAvailable: true,
          reviewerType: "PEER_REVIEWER" as ReviewerType,
          selectionStatus: "SELECTED" as ReviewerSelectionStatus,
          preferredContactMethod: "EMAIL" as ContactMethod,
        },
      });
    }
    profileCount++;

    // Delete existing languages and recreate
    await prisma.reviewerLanguage.deleteMany({
      where: { reviewerProfileId: profile.id },
    });

    for (const lang of userData.languages) {
      await prisma.reviewerLanguage.create({
        data: {
          reviewerProfileId: profile.id,
          language: lang.language,
          proficiency: lang.proficiency,
          isNative: lang.isNative,
          canConductInterviews: lang.proficiency === "NATIVE" || lang.proficiency === "ADVANCED",
          canWriteReports: lang.proficiency === "NATIVE" || lang.proficiency === "ADVANCED",
        },
      });
    }

    console.log(`  ✅ ${userData.firstName} ${userData.lastName} (${userData.orgIcaoCode}) - ${userData.status}`);
  }

  // Seed System Users
  console.log("\n📋 Seeding System Users...\n");
  for (const userData of SYSTEM_USERS) {
    const org = await prisma.organization.findFirst({
      where: { icaoCode: userData.orgIcaoCode },
    });

    if (!org) {
      console.log(`  ⚠️ Org not found: ${userData.orgIcaoCode}`);
      continue;
    }

    let user = await prisma.user.findFirst({
      where: { email: userData.email },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          organizationId: org.id,
          passwordHash,
          isActive: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          organizationId: org.id,
          passwordHash,
          isActive: true,
        },
      });
    }
    userCount++;

    console.log(`  ✅ ${userData.firstName} ${userData.lastName} (${userData.orgIcaoCode}) - ${userData.role}`);
  }

  console.log(`\n  Total: ${userCount} users, ${profileCount} reviewer profiles`);
}

async function cleanup(): Promise<void> {
  console.log("\n🗑️ Cleaning up demo users...\n");

  // Delete in correct order for foreign keys
  console.log("  Deleting reviewer languages...");
  await prisma.reviewerLanguage.deleteMany({});

  console.log("  Deleting reviewer profiles...");
  await prisma.reviewerProfile.deleteMany({});

  console.log("  Deleting users...");
  await prisma.user.deleteMany({});

  console.log("\n✅ Cleanup complete");
}

async function printSummary(): Promise<void> {
  console.log("\n" + "═".repeat(60));
  console.log("📊 USER SEED SUMMARY");
  console.log("═".repeat(60));

  const teams = await prisma.regionalTeam.findMany({
    orderBy: { teamNumber: "asc" },
  });

  for (const team of teams) {
    const profiles = await prisma.reviewerProfile.findMany({
      where: {
        homeOrganization: {
          regionalTeamId: team.id,
        },
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        homeOrganization: { select: { icaoCode: true } },
      },
    });

    console.log(`\n${team.nameEn} (${profiles.length} reviewers)`);
    console.log("─".repeat(50));
    for (const p of profiles) {
      const status = p.isLeadQualified ? "LEAD" : "CERT";
      console.log(`  ${p.user.firstName} ${p.user.lastName} (${p.homeOrganization.icaoCode}) - ${status}`);
    }
  }

  const totalUsers = await prisma.user.count();
  const totalProfiles = await prisma.reviewerProfile.count();
  const totalLanguages = await prisma.reviewerLanguage.count();

  console.log("\n" + "═".repeat(60));
  console.log(`Total: ${totalUsers} users, ${totalProfiles} profiles, ${totalLanguages} languages`);
  console.log("═".repeat(60));
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const command = process.argv[2];

  try {
    if (command === "cleanup") {
      await cleanup();
    } else {
      await seedUsers();
      await printSummary();
    }
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
