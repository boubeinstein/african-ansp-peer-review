/**
 * Document Upload API Route
 *
 * Handles multipart form data file uploads for evidence documents.
 * Supports both Supabase Storage (production) and local filesystem (development).
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";
import { auth } from "@/lib/auth";
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
  // PowerPoint (bonus)
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
  // Remove path components and special characters
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

    // If reviewId and category provided, upload to Supabase Storage
    if (reviewId && category && isStorageConfigured()) {
      const storagePath = generateFilePath(reviewId, category, file.name);
      const result = await uploadFile(buffer, storagePath, file.type);

      if (!result.success) {
        console.error("[Upload API] Supabase upload failed:", result.error);
        // Fall through to local upload as fallback
      } else {
        return NextResponse.json({
          success: true,
          path: result.path,
          url: result.url,
          storage: "supabase",
        });
      }
    }

    // Fallback: Local file storage
    const fileId = crypto.randomUUID();
    const extension = getFileExtension(file.type);
    const sanitizedOriginal = sanitizeFilename(file.name);
    const filename = `${fileId}${extension}`;

    // Create subdirectory for review documents if reviewId provided
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
  const storageConfigured = isStorageConfigured();

  return NextResponse.json(
    {
      message: "Use POST to upload files",
      storage: storageConfigured ? "supabase" : "local",
      allowedTypes: ALLOWED_MIME_TYPES,
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
    },
    { status: 200 }
  );
}
