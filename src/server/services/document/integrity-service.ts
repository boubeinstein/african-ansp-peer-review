import crypto from "crypto";
import { db } from "@/lib/db";
import type { HashAlgorithm, Prisma } from "@prisma/client";

export interface HashResult {
  hash: string;
  algorithm: HashAlgorithm;
}

export interface IntegrityCheckResult {
  isValid: boolean;
  expectedHash: string;
  actualHash: string;
  algorithm: HashAlgorithm;
  checkedAt: Date;
}

export class DocumentIntegrityService {
  /**
   * Calculate hash for file buffer
   */
  calculateHash(buffer: Buffer, algorithm: HashAlgorithm = "SHA256"): HashResult {
    const algo =
      algorithm === "SHA512" ? "sha512" : algorithm === "MD5" ? "md5" : "sha256";
    const hash = crypto.createHash(algo).update(buffer).digest("hex");
    return { hash, algorithm };
  }

  /**
   * Calculate hash for file from URL (fetch and hash)
   */
  async calculateHashFromUrl(
    fileUrl: string,
    algorithm: HashAlgorithm = "SHA256"
  ): Promise<HashResult> {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return this.calculateHash(buffer, algorithm);
  }

  /**
   * Verify document version integrity
   */
  async verifyVersion(
    versionId: string,
    performedById?: string
  ): Promise<IntegrityCheckResult> {
    const version = await db.documentVersion.findUnique({
      where: { id: versionId },
      select: { fileUrl: true, fileHash: true, hashAlgorithm: true },
    });

    if (!version) {
      throw new Error("Version not found");
    }

    const { hash: actualHash } = await this.calculateHashFromUrl(
      version.fileUrl,
      version.hashAlgorithm
    );

    const result: IntegrityCheckResult = {
      isValid: actualHash === version.fileHash,
      expectedHash: version.fileHash,
      actualHash,
      algorithm: version.hashAlgorithm,
      checkedAt: new Date(),
    };

    // Log integrity check if userId provided
    if (performedById) {
      await db.auditLog.create({
        data: {
          userId: performedById,
          action: "INTEGRITY_CHECK",
          entityType: "DOCUMENT_VERSION",
          entityId: versionId,
          newState: result as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return result;
  }

  /**
   * Verify all versions of a document
   */
  async verifyDocument(
    documentId: string,
    performedById?: string
  ): Promise<{ versionId: string; result: IntegrityCheckResult }[]> {
    const versions = await db.documentVersion.findMany({
      where: { documentId },
      select: { id: true },
    });

    const results: { versionId: string; result: IntegrityCheckResult }[] = [];
    for (const version of versions) {
      const result = await this.verifyVersion(version.id, performedById);
      results.push({ versionId: version.id, result });
    }

    return results;
  }

  /**
   * Lock a version (make immutable)
   */
  async lockVersion(versionId: string, lockedById: string): Promise<void> {
    const version = await db.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new Error("Version not found");
    }

    if (version.isLocked) {
      throw new Error("Version is already locked");
    }

    // Verify integrity before locking
    const check = await this.verifyVersion(versionId, lockedById);
    if (!check.isValid) {
      throw new Error("Cannot lock version: integrity check failed");
    }

    await db.documentVersion.update({
      where: { id: versionId },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedById,
      },
    });
  }

  /**
   * Unlock a version (requires admin privileges - checked at router level)
   */
  async unlockVersion(versionId: string): Promise<void> {
    const version = await db.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new Error("Version not found");
    }

    if (!version.isLocked) {
      throw new Error("Version is not locked");
    }

    await db.documentVersion.update({
      where: { id: versionId },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedById: null,
      },
    });
  }

  /**
   * Generate integrity report for audit
   */
  async generateIntegrityReport(
    documentId: string,
    performedById?: string
  ): Promise<{
    documentId: string;
    totalVersions: number;
    verifiedVersions: number;
    failedVersions: number;
    lockedVersions: number;
    results: {
      versionId: string;
      versionNumber: number;
      isValid: boolean;
      isLocked: boolean;
    }[];
    generatedAt: Date;
  }> {
    const versions = await db.documentVersion.findMany({
      where: { documentId },
      select: { id: true, versionNumber: true, isLocked: true },
      orderBy: { versionNumber: "asc" },
    });

    const results: {
      versionId: string;
      versionNumber: number;
      isValid: boolean;
      isLocked: boolean;
    }[] = [];
    let verified = 0;
    let failed = 0;
    let locked = 0;

    for (const version of versions) {
      try {
        const check = await this.verifyVersion(version.id, performedById);
        results.push({
          versionId: version.id,
          versionNumber: version.versionNumber,
          isValid: check.isValid,
          isLocked: version.isLocked,
        });
        if (check.isValid) verified++;
        else failed++;
        if (version.isLocked) locked++;
      } catch {
        results.push({
          versionId: version.id,
          versionNumber: version.versionNumber,
          isValid: false,
          isLocked: version.isLocked,
        });
        failed++;
      }
    }

    return {
      documentId,
      totalVersions: versions.length,
      verifiedVersions: verified,
      failedVersions: failed,
      lockedVersions: locked,
      results,
      generatedAt: new Date(),
    };
  }

  /**
   * Check if a document has any tampered versions
   */
  async hasTamperedVersions(
    documentId: string,
    performedById?: string
  ): Promise<boolean> {
    const report = await this.generateIntegrityReport(documentId, performedById);
    return report.failedVersions > 0;
  }
}

export const documentIntegrityService = new DocumentIntegrityService();
