export type Locale = "EN" | "FR";
export type QuestionnaireType = "ANS_USOAP_CMA" | "SMS_CANSO_SOE";

export type USOAPAuditArea = "LEG" | "ORG" | "PEL" | "OPS" | "AIR" | "AIG" | "ANS" | "AGA" | "SSP";
export type CriticalElement = "CE_1" | "CE_2" | "CE_3" | "CE_4" | "CE_5" | "CE_6" | "CE_7" | "CE_8";
export type SMSComponent = "SAFETY_POLICY_OBJECTIVES" | "SAFETY_RISK_MANAGEMENT" | "SAFETY_ASSURANCE" | "SAFETY_PROMOTION";
export type CANSOStudyArea = "SA_1_1" | "SA_1_2" | "SA_1_3" | "SA_1_4" | "SA_1_5" | "SA_2_1" | "SA_2_2" | "SA_3_1" | "SA_3_2" | "SA_3_3" | "SA_4_1" | "SA_4_2";
export type MaturityLevel = "LEVEL_A" | "LEVEL_B" | "LEVEL_C" | "LEVEL_D" | "LEVEL_E";

export type UserRole =
  | "SUPER_ADMIN" | "SYSTEM_ADMIN" | "STEERING_COMMITTEE" | "PROGRAMME_COORDINATOR"
  | "LEAD_REVIEWER" | "PEER_REVIEWER" | "OBSERVER"
  | "ANSP_ADMIN" | "SAFETY_MANAGER" | "QUALITY_MANAGER" | "STAFF";

export type ExpertiseArea =
  | "ATS" | "AIM_AIS" | "MET" | "CNS" | "PANS_OPS" | "SAR"
  | "SMS_POLICY" | "SMS_RISK" | "SMS_ASSURANCE" | "SMS_PROMOTION"
  | "AERODROME" | "RFF" | "ENGINEERING" | "QMS" | "TRAINING" | "HUMAN_FACTORS";

export interface BilingualContent {
  en: string;
  fr: string;
}
