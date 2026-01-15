/**
 * Document Upload API Route
 *
 * Handles multipart form data file uploads for evidence documents.
 * For MVP, stores files locally in the /uploads directory.
 * Prepared for future cloud storage integration (S3, Supabase Storage).
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";
import { auth } from "@/lib/auth";

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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

async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
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

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const extension = getFileExtension(file.type);
    const sanitizedOriginal = sanitizeFilename(file.name);
    const filename = `${fileId}${extension}`;

    // Ensure upload directory exists
    await ensureUploadDir();

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(UPLOAD_DIR, filename);
    await writeFile(filePath, buffer);

    // Generate URL for the uploaded file
    // In production, this would be a CDN URL or signed URL
    const fileUrl = `/api/upload/${filename}`;

    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        filename,
        originalName: sanitizedOriginal,
        mimeType: file.type,
        size: file.size,
        url: fileUrl,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET HANDLER - File Download (Placeholder for serving files)
// =============================================================================

export async function GET() {
  return NextResponse.json(
    {
      message: "Use /api/upload/[filename] to download files",
      allowedTypes: ALLOWED_MIME_TYPES,
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
    },
    { status: 200 }
  );
}
