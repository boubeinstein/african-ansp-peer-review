/**
 * Document Upload API Route
 *
 * Handles multipart form data file uploads for evidence documents.
 * Storage priority:
 * 1. Vercel Blob (production) - if BLOB_READ_WRITE_TOKEN is set
 * 2. Supabase Storage - if configured
 * 3. Local filesystem (development fallback)
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import {
  uploadFile,
  generateFilePath,
  isStorageConfigured,
} from "@/server/services/storage.service";

// =============================================================================
// CONSTANTS
// =============================================================================

const ALLOWED_MIME_TYPES = [
  // PDFs
  "application/pdf",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Word documents
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Use public/uploads for local development so files are served statically
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// =============================================================================
// HELPERS
// =============================================================================

function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      ".pptx",
  };
  return mimeToExt[mimeType] || "";
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 100);
}

async function ensureUploadDir(subDir?: string): Promise<string> {
  const targetDir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }
  return targetDir;
}

function isVercelBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// =============================================================================
// POST HANDLER - File Upload
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const reviewId = formData.get("reviewId") as string | null;
    const category = formData.get("category") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type",
          allowedTypes: ALLOWED_MIME_TYPES,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File too large",
          maxSize: MAX_FILE_SIZE,
          maxSizeMB: MAX_FILE_SIZE / 1024 / 1024,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const extension = getFileExtension(file.type);
    const sanitizedOriginal = sanitizeFilename(file.name);
    const filename = `${fileId}${extension}`;

    // Build storage path
    const storagePath = reviewId && category
      ? `reviews/${reviewId}/${category}/${filename}`
      : `uploads/${filename}`;

    // ==========================================================================
    // STORAGE OPTION 1: Vercel Blob (Production)
    // ==========================================================================
    if (isVercelBlobConfigured()) {
      try {
        console.log("[Upload API] Using Vercel Blob storage");
        const blob = await put(storagePath, buffer, {
          access: "public",
          contentType: file.type,
        });

        return NextResponse.json({
          success: true,
          path: storagePath,
          url: blob.url,
          storage: "vercel-blob",
          file: {
            id: fileId,
            filename,
            originalName: sanitizedOriginal,
            mimeType: file.type,
            size: file.size,
          },
        });
      } catch (error) {
        console.error("[Upload API] Vercel Blob upload failed:", error);
        // Fall through to other storage options
      }
    }

    // ==========================================================================
    // STORAGE OPTION 2: Supabase Storage
    // ==========================================================================
    if (reviewId && category && isStorageConfigured()) {
      const supabasePath = generateFilePath(reviewId, category, file.name);
      const result = await uploadFile(buffer, supabasePath, file.type);

      if (result.success) {
        return NextResponse.json({
          success: true,
          path: result.path,
          url: result.url,
          storage: "supabase",
          file: {
            id: fileId,
            filename,
            originalName: sanitizedOriginal,
            mimeType: file.type,
            size: file.size,
          },
        });
      } else {
        console.error("[Upload API] Supabase upload failed:", result.error);
        // Fall through to local storage
      }
    }

    // ==========================================================================
    // STORAGE OPTION 3: Local Filesystem (Development Only)
    // ==========================================================================
    console.log("[Upload API] Using local filesystem storage (dev fallback)");

    let targetDir = UPLOAD_DIR;
    let relativePath = filename;

    if (reviewId && category) {
      const subDir = `reviews/${reviewId}/${category}`;
      targetDir = await ensureUploadDir(subDir);
      relativePath = `${subDir}/${filename}`;
    } else {
      await ensureUploadDir();
    }

    // Write file to disk
    const filePath = path.join(targetDir, filename);
    await writeFile(filePath, buffer);

    // Generate URL for the uploaded file
    const fileUrl = `/uploads/${relativePath}`;

    return NextResponse.json({
      success: true,
      path: relativePath,
      url: fileUrl,
      storage: "local",
      file: {
        id: fileId,
        filename,
        originalName: sanitizedOriginal,
        mimeType: file.type,
        size: file.size,
      },
    });
  } catch (error) {
    console.error("[Upload API] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET HANDLER - Upload Info
// =============================================================================

export async function GET() {
  const blobConfigured = isVercelBlobConfigured();
  const supabaseConfigured = isStorageConfigured();

  let activeStorage = "local";
  if (blobConfigured) activeStorage = "vercel-blob";
  else if (supabaseConfigured) activeStorage = "supabase";

  return NextResponse.json(
    {
      message: "Use POST to upload files",
      storage: activeStorage,
      storageOptions: {
        "vercel-blob": blobConfigured,
        supabase: supabaseConfigured,
        local: true,
      },
      allowedTypes: ALLOWED_MIME_TYPES,
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
    },
    { status: 200 }
  );
}
