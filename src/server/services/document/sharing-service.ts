import crypto from "crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface CreateTokenInput {
  documentId: string;
  permissions?: string[];
  expiresInHours?: number;
  maxAccesses?: number;
  recipientEmail?: string;
  recipientName?: string;
  purpose?: string;
  createdById: string;
}

export interface TokenInfo {
  id: string;
  token: string;
  documentId: string;
  document: {
    id: string;
    name: string;
    fileType: string;
    fileSize: number;
  };
  permissions: string[];
  expiresAt: Date;
  maxAccesses: number | null;
  accessCount: number;
  recipientEmail: string | null;
  recipientName: string | null;
  purpose: string | null;
  createdAt: Date;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  lastAccessedAt: Date | null;
  isValid: boolean;
}

export interface AccessResult {
  isValid: boolean;
  token?: TokenInfo;
  documentUrl?: string;
  error?: string;
}

export interface TokenListOptions {
  documentId?: string;
  createdById?: string;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
}

export class DocumentSharingService {
  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Create an access token for a document
   */
  async createToken(input: CreateTokenInput): Promise<TokenInfo> {
    // Validate document exists
    const document = await db.document.findUnique({
      where: { id: input.documentId },
    });
    if (!document) {
      throw new Error("Document not found");
    }

    // Calculate expiry (default: 24 hours)
    const expiresInHours = input.expiresInHours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Generate token
    const token = this.generateSecureToken();

    // Create access token
    const accessToken = await db.documentAccessToken.create({
      data: {
        documentId: input.documentId,
        token,
        permissions: input.permissions || ["VIEW"],
        expiresAt,
        maxAccesses: input.maxAccesses,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName,
        purpose: input.purpose,
        createdById: input.createdById,
      },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            fileType: true,
            fileSize: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Log creation
    await db.auditLog.create({
      data: {
        userId: input.createdById,
        action: "TOKEN_CREATE",
        entityType: "DOCUMENT_ACCESS_TOKEN",
        entityId: accessToken.id,
        newState: {
          documentId: input.documentId,
          permissions: input.permissions || ["VIEW"],
          expiresAt: expiresAt.toISOString(),
          maxAccesses: input.maxAccesses,
          recipientEmail: input.recipientEmail,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return this.mapToTokenInfo(accessToken);
  }

  /**
   * Validate and access a document via token
   */
  async validateAndAccess(
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AccessResult> {
    const accessToken = await db.documentAccessToken.findUnique({
      where: { token },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            fileType: true,
            fileSize: true,
            fileUrl: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!accessToken) {
      return { isValid: false, error: "Invalid token" };
    }

    // Check expiry
    if (new Date() > accessToken.expiresAt) {
      return { isValid: false, error: "Token has expired" };
    }

    // Check max accesses
    if (
      accessToken.maxAccesses !== null &&
      accessToken.accessCount >= accessToken.maxAccesses
    ) {
      return { isValid: false, error: "Maximum access count exceeded" };
    }

    // Increment access count
    await db.documentAccessToken.update({
      where: { id: accessToken.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    // Log access
    await db.auditLog.create({
      data: {
        userId: accessToken.createdById,
        action: "TOKEN_ACCESS",
        entityType: "DOCUMENT_ACCESS_TOKEN",
        entityId: accessToken.id,
        metadata: {
          ipAddress,
          userAgent,
          accessCount: accessToken.accessCount + 1,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      isValid: true,
      token: this.mapToTokenInfo(accessToken),
      documentUrl: accessToken.document.fileUrl,
    };
  }

  /**
   * Get token by ID
   */
  async getToken(tokenId: string): Promise<TokenInfo | null> {
    const accessToken = await db.documentAccessToken.findUnique({
      where: { id: tokenId },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            fileType: true,
            fileSize: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return accessToken ? this.mapToTokenInfo(accessToken) : null;
  }

  /**
   * Get token by token string
   */
  async getTokenByString(token: string): Promise<TokenInfo | null> {
    const accessToken = await db.documentAccessToken.findUnique({
      where: { token },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            fileType: true,
            fileSize: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return accessToken ? this.mapToTokenInfo(accessToken) : null;
  }

  /**
   * List tokens
   */
  async listTokens(options: TokenListOptions = {}): Promise<{
    tokens: TokenInfo[];
    total: number;
  }> {
    const where: Prisma.DocumentAccessTokenWhereInput = {};

    if (options.documentId) {
      where.documentId = options.documentId;
    }

    if (options.createdById) {
      where.createdById = options.createdById;
    }

    if (!options.includeExpired) {
      where.expiresAt = { gt: new Date() };
    }

    const [tokens, total] = await Promise.all([
      db.documentAccessToken.findMany({
        where,
        include: {
          document: {
            select: {
              id: true,
              name: true,
              fileType: true,
              fileSize: true,
            },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      db.documentAccessToken.count({ where }),
    ]);

    return {
      tokens: tokens.map((t) => this.mapToTokenInfo(t)),
      total,
    };
  }

  /**
   * Revoke a token
   */
  async revokeToken(tokenId: string, revokedById: string): Promise<void> {
    const accessToken = await db.documentAccessToken.findUnique({
      where: { id: tokenId },
    });

    if (!accessToken) {
      throw new Error("Token not found");
    }

    // Delete the token
    await db.documentAccessToken.delete({
      where: { id: tokenId },
    });

    // Log revocation
    await db.auditLog.create({
      data: {
        userId: revokedById,
        action: "TOKEN_REVOKE",
        entityType: "DOCUMENT_ACCESS_TOKEN",
        entityId: tokenId,
        previousState: {
          documentId: accessToken.documentId,
          permissions: accessToken.permissions,
          accessCount: accessToken.accessCount,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Revoke all tokens for a document
   */
  async revokeAllTokensForDocument(
    documentId: string,
    revokedById: string
  ): Promise<number> {
    const tokens = await db.documentAccessToken.findMany({
      where: { documentId },
      select: { id: true },
    });

    const count = tokens.length;

    if (count > 0) {
      await db.documentAccessToken.deleteMany({
        where: { documentId },
      });

      // Log revocation
      await db.auditLog.create({
        data: {
          userId: revokedById,
          action: "TOKEN_REVOKE_ALL",
          entityType: "DOCUMENT",
          entityId: documentId,
          metadata: {
            revokedCount: count,
            tokenIds: tokens.map((t) => t.id),
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return count;
  }

  /**
   * Extend token expiry
   */
  async extendToken(
    tokenId: string,
    additionalHours: number,
    extendedById: string
  ): Promise<TokenInfo> {
    const accessToken = await db.documentAccessToken.findUnique({
      where: { id: tokenId },
    });

    if (!accessToken) {
      throw new Error("Token not found");
    }

    const newExpiresAt = new Date(accessToken.expiresAt);
    newExpiresAt.setHours(newExpiresAt.getHours() + additionalHours);

    const updated = await db.documentAccessToken.update({
      where: { id: tokenId },
      data: { expiresAt: newExpiresAt },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            fileType: true,
            fileSize: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Log extension
    await db.auditLog.create({
      data: {
        userId: extendedById,
        action: "UPDATE",
        entityType: "DOCUMENT_ACCESS_TOKEN",
        entityId: tokenId,
        previousState: {
          expiresAt: accessToken.expiresAt.toISOString(),
        } as unknown as Prisma.InputJsonValue,
        newState: {
          expiresAt: newExpiresAt.toISOString(),
          additionalHours,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return this.mapToTokenInfo(updated);
  }

  /**
   * Get access statistics for a document
   */
  async getDocumentAccessStats(documentId: string): Promise<{
    activeTokens: number;
    expiredTokens: number;
    totalAccesses: number;
    uniqueRecipients: number;
  }> {
    const now = new Date();

    const [activeTokens, expiredTokens, totalAccessesResult, uniqueRecipients] =
      await Promise.all([
        db.documentAccessToken.count({
          where: {
            documentId,
            expiresAt: { gt: now },
          },
        }),
        db.documentAccessToken.count({
          where: {
            documentId,
            expiresAt: { lte: now },
          },
        }),
        db.documentAccessToken.aggregate({
          where: { documentId },
          _sum: { accessCount: true },
        }),
        db.documentAccessToken.groupBy({
          by: ["recipientEmail"],
          where: {
            documentId,
            recipientEmail: { not: null },
          },
        }),
      ]);

    return {
      activeTokens,
      expiredTokens,
      totalAccesses: totalAccessesResult._sum.accessCount || 0,
      uniqueRecipients: uniqueRecipients.length,
    };
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await db.documentAccessToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }

  /**
   * Generate share URL
   */
  generateShareUrl(token: string, baseUrl: string): string {
    return `${baseUrl}/api/shared/${token}`;
  }

  /**
   * Check if a token is valid without incrementing access count
   */
  async isTokenValid(token: string): Promise<boolean> {
    const accessToken = await db.documentAccessToken.findUnique({
      where: { token },
      select: {
        expiresAt: true,
        maxAccesses: true,
        accessCount: true,
      },
    });

    if (!accessToken) {
      return false;
    }

    if (new Date() > accessToken.expiresAt) {
      return false;
    }

    if (
      accessToken.maxAccesses !== null &&
      accessToken.accessCount >= accessToken.maxAccesses
    ) {
      return false;
    }

    return true;
  }

  /**
   * Map database record to TokenInfo
   */
  private mapToTokenInfo(record: {
    id: string;
    token: string;
    documentId: string;
    document: {
      id: string;
      name: string;
      fileType: string;
      fileSize: number;
    };
    permissions: string[];
    expiresAt: Date;
    maxAccesses: number | null;
    accessCount: number;
    recipientEmail: string | null;
    recipientName: string | null;
    purpose: string | null;
    createdAt: Date;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
    lastAccessedAt: Date | null;
  }): TokenInfo {
    const now = new Date();
    const isValid =
      record.expiresAt > now &&
      (record.maxAccesses === null ||
        record.accessCount < record.maxAccesses);

    return {
      id: record.id,
      token: record.token,
      documentId: record.documentId,
      document: record.document,
      permissions: record.permissions,
      expiresAt: record.expiresAt,
      maxAccesses: record.maxAccesses,
      accessCount: record.accessCount,
      recipientEmail: record.recipientEmail,
      recipientName: record.recipientName,
      purpose: record.purpose,
      createdAt: record.createdAt,
      createdBy: record.createdBy,
      lastAccessedAt: record.lastAccessedAt,
      isValid,
    };
  }
}

export const documentSharingService = new DocumentSharingService();
