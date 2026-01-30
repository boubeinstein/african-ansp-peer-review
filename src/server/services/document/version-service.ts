import { db } from "@/lib/db";
import { documentIntegrityService } from "./integrity-service";

export interface CreateVersionInput {
  documentId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  changeNotes?: string;
  createdById: string;
}

export interface VersionInfo {
  id: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  fileHash: string;
  isLocked: boolean;
  createdAt: Date;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface VersionDetail extends VersionInfo {
  fileUrl: string;
  changeNotes: string | null;
  mimeType: string;
  hashAlgorithm: string;
  lockedAt: Date | null;
  lockedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export class DocumentVersionService {
  /**
   * Create new version of a document
   */
  async createVersion(input: CreateVersionInput): Promise<VersionInfo> {
    const {
      documentId,
      fileBuffer,
      fileName,
      mimeType,
      changeNotes,
      createdById,
    } = input;

    // Verify document exists
    const document = await db.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Get current max version number
    const maxVersion = await db.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const versionNumber = (maxVersion?.versionNumber || 0) + 1;

    // Calculate hash
    const { hash, algorithm } = documentIntegrityService.calculateHash(fileBuffer);

    // Upload file
    const fileUrl = await this.uploadFile(
      documentId,
      versionNumber,
      fileBuffer,
      fileName
    );

    // Create version record
    const version = await db.documentVersion.create({
      data: {
        documentId,
        versionNumber,
        fileUrl,
        fileName,
        fileSize: fileBuffer.length,
        mimeType,
        hashAlgorithm: algorithm,
        fileHash: hash,
        changeNotes,
        createdById,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update document's current version
    await db.document.update({
      where: { id: documentId },
      data: {
        currentVersionId: version.id,
        updatedAt: new Date(),
      },
    });

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      fileName: version.fileName,
      fileSize: version.fileSize,
      fileHash: version.fileHash,
      isLocked: version.isLocked,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
    };
  }

  /**
   * Get all versions of a document
   */
  async getVersions(documentId: string): Promise<VersionInfo[]> {
    const versions = await db.documentVersion.findMany({
      where: { documentId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { versionNumber: "desc" },
    });

    return versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      fileName: v.fileName,
      fileSize: v.fileSize,
      fileHash: v.fileHash,
      isLocked: v.isLocked,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
    }));
  }

  /**
   * Get specific version with full details
   */
  async getVersion(versionId: string): Promise<VersionDetail> {
    const version = await db.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        lockedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!version) {
      throw new Error("Version not found");
    }

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      fileName: version.fileName,
      fileSize: version.fileSize,
      fileHash: version.fileHash,
      fileUrl: version.fileUrl,
      mimeType: version.mimeType,
      hashAlgorithm: version.hashAlgorithm,
      isLocked: version.isLocked,
      lockedAt: version.lockedAt,
      lockedBy: version.lockedBy,
      changeNotes: version.changeNotes,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
    };
  }

  /**
   * Get the current (latest) version of a document
   */
  async getCurrentVersion(documentId: string): Promise<VersionDetail | null> {
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: { currentVersionId: true },
    });

    if (!document?.currentVersionId) {
      // Try to get the latest version by version number
      const latestVersion = await db.documentVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: "desc" },
      });

      if (!latestVersion) return null;

      return this.getVersion(latestVersion.id);
    }

    return this.getVersion(document.currentVersionId);
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: { id: string; versionNumber: number; fileSize: number };
    version2: { id: string; versionNumber: number; fileSize: number };
    sizeChange: number;
    sizeDeltaPercent: number;
    hashMatch: boolean;
    createdAtDiff: number; // milliseconds
  }> {
    const [v1, v2] = await Promise.all([
      db.documentVersion.findUnique({ where: { id: versionId1 } }),
      db.documentVersion.findUnique({ where: { id: versionId2 } }),
    ]);

    if (!v1 || !v2) {
      throw new Error("Version not found");
    }

    const sizeChange = v2.fileSize - v1.fileSize;
    const sizeDeltaPercent =
      v1.fileSize > 0 ? (sizeChange / v1.fileSize) * 100 : 0;

    return {
      version1: {
        id: v1.id,
        versionNumber: v1.versionNumber,
        fileSize: v1.fileSize,
      },
      version2: {
        id: v2.id,
        versionNumber: v2.versionNumber,
        fileSize: v2.fileSize,
      },
      sizeChange,
      sizeDeltaPercent: Math.round(sizeDeltaPercent * 100) / 100,
      hashMatch: v1.fileHash === v2.fileHash,
      createdAtDiff: v2.createdAt.getTime() - v1.createdAt.getTime(),
    };
  }

  /**
   * Delete a version (only if not locked and not the only version)
   */
  async deleteVersion(versionId: string): Promise<void> {
    const version = await db.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        document: {
          include: {
            versions: { select: { id: true } },
          },
        },
      },
    });

    if (!version) {
      throw new Error("Version not found");
    }

    if (version.isLocked) {
      throw new Error("Cannot delete locked version");
    }

    if (version.document.versions.length <= 1) {
      throw new Error("Cannot delete the only version of a document");
    }

    // If this is the current version, update document to previous version
    if (version.document.currentVersionId === versionId) {
      const previousVersion = await db.documentVersion.findFirst({
        where: {
          documentId: version.documentId,
          id: { not: versionId },
        },
        orderBy: { versionNumber: "desc" },
      });

      await db.document.update({
        where: { id: version.documentId },
        data: { currentVersionId: previousVersion?.id || null },
      });
    }

    // Delete the version
    await db.documentVersion.delete({ where: { id: versionId } });

    // Clean up the file (optional - depends on storage strategy)
    await this.deleteFile(version.fileUrl);
  }

  /**
   * Upload file to storage
   */
  private async uploadFile(
    documentId: string,
    versionNumber: number,
    buffer: Buffer,
    fileName: string
  ): Promise<string> {
    // TODO: Integrate with cloud storage service (S3, Supabase Storage, etc.)
    // For now, use local file storage as placeholder
    const fs = await import("fs/promises");
    const path = await import("path");

    const uploadDir = path.join(
      process.cwd(),
      "uploads",
      "documents",
      documentId
    );
    await fs.mkdir(uploadDir, { recursive: true });

    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(
      uploadDir,
      `v${versionNumber}_${sanitizedFileName}`
    );
    await fs.writeFile(filePath, buffer);

    return `/uploads/documents/${documentId}/v${versionNumber}_${sanitizedFileName}`;
  }

  /**
   * Delete file from storage
   */
  private async deleteFile(fileUrl: string): Promise<void> {
    // TODO: Integrate with cloud storage service
    // For now, handle local file deletion
    if (fileUrl.startsWith("/uploads/")) {
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const filePath = path.join(process.cwd(), fileUrl);
        await fs.unlink(filePath);
      } catch {
        // File may not exist, ignore
      }
    }
  }

  /**
   * Get version history summary for a document
   */
  async getVersionHistorySummary(documentId: string): Promise<{
    documentId: string;
    totalVersions: number;
    latestVersion: number;
    lockedVersions: number;
    totalSize: number;
    firstVersionAt: Date | null;
    lastVersionAt: Date | null;
  }> {
    const versions = await db.documentVersion.findMany({
      where: { documentId },
      select: {
        versionNumber: true,
        fileSize: true,
        isLocked: true,
        createdAt: true,
      },
      orderBy: { versionNumber: "asc" },
    });

    if (versions.length === 0) {
      return {
        documentId,
        totalVersions: 0,
        latestVersion: 0,
        lockedVersions: 0,
        totalSize: 0,
        firstVersionAt: null,
        lastVersionAt: null,
      };
    }

    return {
      documentId,
      totalVersions: versions.length,
      latestVersion: Math.max(...versions.map((v) => v.versionNumber)),
      lockedVersions: versions.filter((v) => v.isLocked).length,
      totalSize: versions.reduce((sum, v) => sum + v.fileSize, 0),
      firstVersionAt: versions[0].createdAt,
      lastVersionAt: versions[versions.length - 1].createdAt,
    };
  }
}

export const documentVersionService = new DocumentVersionService();
