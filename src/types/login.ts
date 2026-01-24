/**
 * Types for login page statistics
 */

export interface LoginPageStats {
  participatingANSPs: number;
  expertReviewers: number;
  regionalTeams: number;
  completedReviews: number;
  teams: TeamInfo[];
  nextMilestone: MilestoneInfo;
}

export interface TeamInfo {
  number: number;
  nameEn: string;
  nameFr: string;
  members: string;
  orgCount: number;
  reviewerCount: number;
}

export interface MilestoneInfo {
  titleEn: string;
  titleFr: string;
  date: string;
  location: string;
}
