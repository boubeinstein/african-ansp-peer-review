/**
 * Supabase Storage Service
 *
 * Handles file uploads, downloads, and deletions for review documents.
 * Uses Supabase Storage with service role key for server-side operations.
 */

import { createClient } from "@supabase/supabase-js";

// =============================================================================
// CONFIGURATION
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables (log once at startup)
let _storageWarned = false;
if (!_storageWarned) {
  if (!supabaseUrl) {
    console.warn("[Storage] NEXT_PUBLIC_SUPABASE_URL is not set — file uploads disabled");
  }
  if (!supabaseServiceKey) {
    console.warn("[Storage] SUPABASE_SERVICE_ROLE_KEY is not set — file uploads disabled");
  }
  _storageWarned = true;
}

// Use service role for server-side operations (bypasses RLS)
const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const BUCKET_NAME = "review-documents";

// =============================================================================
// TYPES
// =============================================================================

export interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

export interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if storage is configured
 */
export function isStorageConfigured(): boolean {
  return supabase !== null;
}

/**
 * Generate a unique file path for storage
 * Format: reviews/{reviewId}/{category}/{timestamp}_{sanitizedName}
 */
export function generateFilePath(
  reviewId: string,
  category: string,
  originalName: string
): string {
  const timestamp = Date.now();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `reviews/${reviewId}/${category}/${timestamp}_${sanitizedName}`;
}

/**
 * Extract storage path from full URL
 */
export function extractPathFromUrl(url: string): string | null {
  if (!supabaseUrl) return null;

  const prefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/`;
  if (url.startsWith(prefix)) {
    return url.substring(prefix.length);
  }

  // Handle signed URL format
  const signedPrefix = `${supabaseUrl}/storage/v1/object/sign/${BUCKET_NAME}/`;
  if (url.startsWith(signedPrefix)) {
    // Extract path before query parameters
    const pathWithParams = url.substring(signedPrefix.length);
    const pathOnly = pathWithParams.split("?")[0];
    return pathOnly;
  }

  // Handle placeholder URLs from dev (local uploads)
  if (url.startsWith("/uploads/reviews/")) {
    return url.substring(9); // Remove "/uploads/"
  }

  // Handle path-only format (already a storage path)
  if (url.startsWith("reviews/")) {
    return url;
  }

  return null;
}

// =============================================================================
// UPLOAD FUNCTIONS
// =============================================================================

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: Buffer,
  filePath: string,
  contentType: string
): Promise<UploadResult> {
  if (!supabase || !supabaseUrl) {
    console.error("[Storage] Supabase client not configured");
    return {
      success: false,
      error: "Storage not configured. Check SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("[Storage] Upload error:", error);
      return { success: false, error: error.message };
    }

    // Generate public URL (note: bucket must be configured correctly)
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${data.path}`;

    return {
      success: true,
      path: data.path,
      url: publicUrl,
    };
  } catch (error) {
    console.error("[Storage] Upload exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

// =============================================================================
// DOWNLOAD FUNCTIONS
// =============================================================================

/**
 * Generate a signed URL for secure download
 * @param filePath - The storage path of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<SignedUrlResult> {
  if (!supabase) {
    console.error("[Storage] Supabase client not configured");
    return {
      success: false,
      error: "Storage not configured. Check SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("[Storage] Signed URL error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (error) {
    console.error("[Storage] Signed URL exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate URL",
    };
  }
}

/**
 * Generate a signed URL for download with custom filename
 */
export async function getSignedDownloadUrl(
  filePath: string,
  downloadFilename: string,
  expiresIn: number = 3600
): Promise<SignedUrlResult> {
  if (!supabase) {
    return {
      success: false,
      error: "Storage not configured",
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn, {
        download: downloadFilename,
      });

    if (error) {
      console.error("[Storage] Signed download URL error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (error) {
    console.error("[Storage] Signed download URL exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate URL",
    };
  }
}

// =============================================================================
// DELETE FUNCTIONS
// =============================================================================

/**
 * Delete a file from storage
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  if (!supabase) {
    console.error("[Storage] Supabase client not configured");
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("[Storage] Delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Storage] Delete exception:", error);
    return false;
  }
}

/**
 * Delete multiple files from storage
 */
export async function deleteFiles(filePaths: string[]): Promise<boolean> {
  if (!supabase) {
    console.error("[Storage] Supabase client not configured");
    return false;
  }

  if (filePaths.length === 0) return true;

  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

    if (error) {
      console.error("[Storage] Bulk delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Storage] Bulk delete exception:", error);
    return false;
  }
}

// =============================================================================
// LIST FUNCTIONS
// =============================================================================

/**
 * List files in a specific review folder
 */
export async function listReviewFiles(reviewId: string): Promise<string[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(`reviews/${reviewId}`, {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error("[Storage] List error:", error);
      return [];
    }

    // Return full paths
    return data
      .filter((file: { name: string }) => file.name !== ".emptyFolderPlaceholder")
      .map((file: { name: string }) => `reviews/${reviewId}/${file.name}`);
  } catch (error) {
    console.error("[Storage] List exception:", error);
    return [];
  }
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export const storageService = {
  isConfigured: isStorageConfigured,
  generatePath: generateFilePath,
  extractPath: extractPathFromUrl,
  upload: uploadFile,
  getSignedUrl,
  getSignedDownloadUrl,
  delete: deleteFile,
  deleteMany: deleteFiles,
  listReviewFiles,
};

export default storageService;
