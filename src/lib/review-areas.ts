import type { ANSReviewArea, ExpertiseArea } from '@prisma/client';

/** Map an ExpertiseArea to the corresponding ANSReviewArea, if any */
export function expertiseToReviewArea(expertise: ExpertiseArea): ANSReviewArea | null {
  const map: Partial<Record<ExpertiseArea, ANSReviewArea>> = {
    ATS: 'ATS',
    AIM_AIS: 'AIS',
    FPD: 'FPD',
    MAP: 'MAP',
    PANS_OPS: 'FPD', // legacy alias
    MET: 'MET',
    CNS: 'CNS',
    SAR: 'SAR',
    SMS_POLICY: 'SMS',
    SMS_RISK: 'SMS',
    SMS_ASSURANCE: 'SMS',
    SMS_PROMOTION: 'SMS',
  };
  return map[expertise] ?? null;
}

/** Map an ANSReviewArea to all matching ExpertiseAreas */
export function reviewAreaToExpertise(area: ANSReviewArea): ExpertiseArea[] {
  const map: Record<ANSReviewArea, ExpertiseArea[]> = {
    ATS: ['ATS'],
    FPD: ['FPD', 'PANS_OPS'],
    AIS: ['AIM_AIS'],
    MAP: ['MAP'],
    MET: ['MET'],
    CNS: ['CNS'],
    SAR: ['SAR'],
    SMS: ['SMS_POLICY', 'SMS_RISK', 'SMS_ASSURANCE', 'SMS_PROMOTION'],
  };
  return map[area];
}

/** All 8 AAPRP review areas in programme display order */
export const AAPRP_REVIEW_AREAS: ANSReviewArea[] = [
  'ATS', 'FPD', 'AIS', 'MAP', 'MET', 'CNS', 'SAR', 'SMS',
];

/** The 7 ANS-only review areas (covered by the ANS Protocol Questionnaire) */
export const ANS_REVIEW_AREAS: ANSReviewArea[] = [
  'ATS', 'FPD', 'AIS', 'MAP', 'MET', 'CNS', 'SAR',
];
