/**
 * Organization Module - TypeScript Types and Zod Schemas
 *
 * Types and validation schemas for organization management in the
 * AFI Peer Review Programme.
 *
 * @module types/organization
 */

import { z } from "zod";
import type {
  Organization as PrismaOrganization,
  AfricanRegion,
  MembershipStatus,
} from "@prisma/client";

// ============================================
// ENUM RE-EXPORTS (for client-side use)
// ============================================

export { AfricanRegion, MembershipStatus } from "@prisma/client";

// ============================================
// ZOD SCHEMAS
// ============================================

/**
 * Schema for creating a new organization
 */
export const organizationCreateSchema = z.object({
  nameEn: z
    .string()
    .min(2, "English name must be at least 2 characters")
    .max(200, "English name must be less than 200 characters"),
  nameFr: z
    .string()
    .min(2, "French name must be at least 2 characters")
    .max(200, "French name must be less than 200 characters"),
  icaoCode: z
    .string()
    .length(4, "ICAO code must be exactly 4 characters")
    .regex(/^[A-Z]{4}$/, "ICAO code must be 4 uppercase letters")
    .nullable()
    .optional(),
  country: z
    .string()
    .min(2, "Country must be at least 2 characters")
    .max(100, "Country must be less than 100 characters"),
  city: z
    .string()
    .max(100, "City must be less than 100 characters")
    .nullable()
    .optional(),
  region: z.enum(["WACAF", "ESAF", "NORTHERN"] as const),
  website: z
    .string()
    .url("Invalid website URL")
    .max(500, "Website URL must be less than 500 characters")
    .nullable()
    .optional(),
  contactEmail: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .nullable()
    .optional(),
  contactPhone: z
    .string()
    .max(50, "Phone must be less than 50 characters")
    .nullable()
    .optional(),
  address: z
    .string()
    .max(500, "Address must be less than 500 characters")
    .nullable()
    .optional(),
  descriptionEn: z
    .string()
    .max(2000, "English description must be less than 2000 characters")
    .nullable()
    .optional(),
  descriptionFr: z
    .string()
    .max(2000, "French description must be less than 2000 characters")
    .nullable()
    .optional(),
  membershipStatus: z
    .enum(["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"] as const)
    .default("PENDING"),
});

/**
 * Schema for updating an organization
 */
export const organizationUpdateSchema = organizationCreateSchema
  .partial()
  .extend({
    id: z.string().cuid("Invalid organization ID"),
  });

/**
 * Schema for organization filters
 */
export const organizationFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  region: z.array(z.enum(["WACAF", "ESAF", "NORTHERN"] as const)).optional(),
  country: z.array(z.string()).optional(),
  membershipStatus: z
    .array(z.enum(["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"] as const))
    .optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum([
      "nameEn",
      "nameFr",
      "country",
      "region",
      "membershipStatus",
      "createdAt",
      "icaoCode",
    ])
    .default("nameEn"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

/**
 * Schema for organization ID parameter
 */
export const organizationIdSchema = z.object({
  id: z.string().cuid("Invalid organization ID"),
});

// ============================================
// INFERRED TYPES
// ============================================

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;
export type OrganizationFilters = z.infer<typeof organizationFiltersSchema>;

// ============================================
// TYPE RE-EXPORTS
// ============================================

export type Organization = PrismaOrganization;

// ============================================
// COMPOSITE TYPES
// ============================================

/**
 * Organization with related counts
 */
export interface OrganizationWithCounts extends PrismaOrganization {
  _count: {
    users: number;
    assessments: number;
    homeReviewers: number;
    reviewsAsHost: number;
  };
}

/**
 * Organization for list views (lightweight)
 */
export interface OrganizationListItem {
  id: string;
  nameEn: string;
  nameFr: string;
  icaoCode: string | null;
  country: string;
  city: string | null;
  region: AfricanRegion;
  membershipStatus: MembershipStatus;
  joinedAt: Date | null;
  createdAt: Date;
  _count?: {
    users: number;
    assessments: number;
  };
}

/**
 * Organization statistics
 */
export interface OrganizationStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  inactive: number;
  byRegion: Record<string, number>;
  byStatus: Record<string, number>;
  byCountry: Record<string, number>;
}

/**
 * Organization card for UI display
 */
export interface OrganizationCard {
  id: string;
  nameEn: string;
  nameFr: string;
  icaoCode: string | null;
  country: string;
  city: string | null;
  region: AfricanRegion;
  membershipStatus: MembershipStatus;
  usersCount: number;
  assessmentsCount: number;
}

/**
 * Organization dropdown option
 */
export interface OrganizationOption {
  id: string;
  nameEn: string;
  nameFr: string;
  icaoCode: string | null;
  country: string;
}

/**
 * Paginated organization list response
 */
export interface OrganizationListResponse {
  items: OrganizationListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Region option for filters
 */
export interface RegionOption {
  value: AfricanRegion;
  label: string;
  labelFr: string;
}

/**
 * Country option for filters
 */
export interface CountryOption {
  value: string;
  label: string;
  count: number;
}
