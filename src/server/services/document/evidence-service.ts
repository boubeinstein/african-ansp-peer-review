import { db } from "@/lib/db";

export interface CreateEvidenceLinkInput {
  documentId: string;
  entityType: string;
  entityId: string;
  linkType?: string;
  relevanceScore?: number;
  notesEn?: string;
  notesFr?: string;
  createdById: string;
}

export interface UpdateEvidenceLinkInput {
  linkType?: string;
  relevanceScore?: number;
  notesEn?: string;
  notesFr?: string;
}

export interface EvidenceLinkInfo {
  id: string;
  documentId: string;
  document: {
    id: string;
    name: string;
    description: string | null;
    fileType: string;
    fileUrl: string;
  };
  entityType: string;
  entityId: string;
  linkType: string;
  relevanceScore: number | null;
  isVerified: boolean;
  verifiedAt: Date | null;
  verifiedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  notesEn: string | null;
  notesFr: string | null;
  createdAt: Date;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface EvidenceStats {
  total: number;
  verified: number;
  unverified: number;
  byLinkType: Record<string, number>;
}

// Valid entity types for evidence linking
export const VALID_ENTITY_TYPES = [
  "FINDING",
  "CAP",
  "ASSESSMENT_RESPONSE",
  "REVIEW",
] as const;

// Valid link types
export const VALID_LINK_TYPES = [
  "SUPPORTS",
  "PROVES",
  "REFERENCES",
  "CONTRADICTS",
  "SUPERSEDES",
] as const;

export class EvidenceLinkService {
  /**
   * Create evidence link
   */
  async createLink(input: CreateEvidenceLinkInput): Promise<EvidenceLinkInfo> {
    // Validate entity type
    if (
      !VALID_ENTITY_TYPES.includes(
        input.entityType as (typeof VALID_ENTITY_TYPES)[number]
      )
    ) {
      throw new Error(
        `Invalid entity type: ${input.entityType}. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}`
      );
    }

    // Validate document exists
    const document = await db.document.findUnique({
      where: { id: input.documentId },
    });
    if (!document) {
      throw new Error("Document not found");
    }

    // Create the link
    const link = await db.evidenceLink.create({
      data: {
        documentId: input.documentId,
        entityType: input.entityType,
        entityId: input.entityId,
        linkType: input.linkType || "SUPPORTS",
        relevanceScore: input.relevanceScore,
        notesEn: input.notesEn,
        notesFr: input.notesFr,
        createdById: input.createdById,
      },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            description: true,
            fileType: true,
            fileUrl: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return this.mapToInfo(link);
  }

  /**
   * Get a specific link by ID
   */
  async getLink(linkId: string): Promise<EvidenceLinkInfo | null> {
    const link = await db.evidenceLink.findUnique({
      where: { id: linkId },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            description: true,
            fileType: true,
            fileUrl: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return link ? this.mapToInfo(link) : null;
  }

  /**
   * Get links for an entity
   */
  async getLinksForEntity(
    entityType: string,
    entityId: string,
    options?: {
      verifiedOnly?: boolean;
      linkType?: string;
    }
  ): Promise<EvidenceLinkInfo[]> {
    const where: {
      entityType: string;
      entityId: string;
      isVerified?: boolean;
      linkType?: string;
    } = { entityType, entityId };

    if (options?.verifiedOnly) {
      where.isVerified = true;
    }
    if (options?.linkType) {
      where.linkType = options.linkType;
    }

    const links = await db.evidenceLink.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            name: true,
            description: true,
            fileType: true,
            fileUrl: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
    });

    return links.map((link) => this.mapToInfo(link));
  }

  /**
   * Get links for a document
   */
  async getLinksForDocument(documentId: string): Promise<EvidenceLinkInfo[]> {
    const links = await db.evidenceLink.findMany({
      where: { documentId },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            description: true,
            fileType: true,
            fileUrl: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return links.map((link) => this.mapToInfo(link));
  }

  /**
   * Update evidence link
   */
  async updateLink(
    linkId: string,
    input: UpdateEvidenceLinkInput
  ): Promise<EvidenceLinkInfo> {
    const link = await db.evidenceLink.update({
      where: { id: linkId },
      data: {
        linkType: input.linkType,
        relevanceScore: input.relevanceScore,
        notesEn: input.notesEn,
        notesFr: input.notesFr,
      },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            description: true,
            fileType: true,
            fileUrl: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return this.mapToInfo(link);
  }

  /**
   * Verify evidence link
   */
  async verifyLink(linkId: string, verifiedById: string): Promise<void> {
    const link = await db.evidenceLink.findUnique({ where: { id: linkId } });
    if (!link) {
      throw new Error("Evidence link not found");
    }

    if (link.isVerified) {
      throw new Error("Evidence link is already verified");
    }

    await db.evidenceLink.update({
      where: { id: linkId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedById,
      },
    });
  }

  /**
   * Unverify evidence link
   */
  async unverifyLink(linkId: string): Promise<void> {
    const link = await db.evidenceLink.findUnique({ where: { id: linkId } });
    if (!link) {
      throw new Error("Evidence link not found");
    }

    if (!link.isVerified) {
      throw new Error("Evidence link is not verified");
    }

    await db.evidenceLink.update({
      where: { id: linkId },
      data: {
        isVerified: false,
        verifiedAt: null,
        verifiedById: null,
      },
    });
  }

  /**
   * Delete evidence link
   */
  async deleteLink(linkId: string): Promise<void> {
    const link = await db.evidenceLink.findUnique({ where: { id: linkId } });
    if (!link) {
      throw new Error("Evidence link not found");
    }

    await db.evidenceLink.delete({ where: { id: linkId } });
  }

  /**
   * Get evidence statistics for an entity
   */
  async getEntityEvidenceStats(
    entityType: string,
    entityId: string
  ): Promise<EvidenceStats> {
    const links = await db.evidenceLink.findMany({
      where: { entityType, entityId },
      select: { isVerified: true, linkType: true },
    });

    const byLinkType: Record<string, number> = {};
    let verified = 0;
    let unverified = 0;

    for (const link of links) {
      if (link.isVerified) verified++;
      else unverified++;
      byLinkType[link.linkType] = (byLinkType[link.linkType] || 0) + 1;
    }

    return {
      total: links.length,
      verified,
      unverified,
      byLinkType,
    };
  }

  /**
   * Get evidence statistics for a document
   */
  async getDocumentEvidenceStats(documentId: string): Promise<{
    totalLinks: number;
    verifiedLinks: number;
    entityTypes: Record<string, number>;
  }> {
    const links = await db.evidenceLink.findMany({
      where: { documentId },
      select: { isVerified: true, entityType: true },
    });

    const entityTypes: Record<string, number> = {};
    let verifiedLinks = 0;

    for (const link of links) {
      if (link.isVerified) verifiedLinks++;
      entityTypes[link.entityType] = (entityTypes[link.entityType] || 0) + 1;
    }

    return {
      totalLinks: links.length,
      verifiedLinks,
      entityTypes,
    };
  }

  /**
   * Bulk link documents to entity
   */
  async bulkLink(
    documentIds: string[],
    entityType: string,
    entityId: string,
    createdById: string,
    linkType: string = "SUPPORTS"
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const documentId of documentIds) {
      try {
        await this.createLink({
          documentId,
          entityType,
          entityId,
          linkType,
          createdById,
        });
        created++;
      } catch (error) {
        // Skip duplicates (unique constraint violation)
        if (
          error instanceof Error &&
          error.message.includes("Unique constraint")
        ) {
          skipped++;
        } else {
          throw error;
        }
      }
    }

    return { created, skipped };
  }

  /**
   * Bulk verify links
   */
  async bulkVerify(linkIds: string[], verifiedById: string): Promise<number> {
    const result = await db.evidenceLink.updateMany({
      where: {
        id: { in: linkIds },
        isVerified: false,
      },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedById,
      },
    });

    return result.count;
  }

  /**
   * Get unverified links for review
   */
  async getUnverifiedLinks(options?: {
    entityType?: string;
    limit?: number;
  }): Promise<EvidenceLinkInfo[]> {
    const where: { isVerified: boolean; entityType?: string } = {
      isVerified: false,
    };

    if (options?.entityType) {
      where.entityType = options.entityType;
    }

    const links = await db.evidenceLink.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            name: true,
            description: true,
            fileType: true,
            fileUrl: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: options?.limit || 50,
    });

    return links.map((link) => this.mapToInfo(link));
  }

  /**
   * Check if a document is linked to an entity
   */
  async isLinked(
    documentId: string,
    entityType: string,
    entityId: string
  ): Promise<boolean> {
    const link = await db.evidenceLink.findUnique({
      where: {
        documentId_entityType_entityId: {
          documentId,
          entityType,
          entityId,
        },
      },
    });

    return !!link;
  }

  /**
   * Map database record to EvidenceLinkInfo
   */
  private mapToInfo(link: {
    id: string;
    documentId: string;
    document: {
      id: string;
      name: string;
      description: string | null;
      fileType: string;
      fileUrl: string;
    };
    entityType: string;
    entityId: string;
    linkType: string;
    relevanceScore: number | null;
    isVerified: boolean;
    verifiedAt: Date | null;
    verifiedBy: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    notesEn: string | null;
    notesFr: string | null;
    createdAt: Date;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }): EvidenceLinkInfo {
    return {
      id: link.id,
      documentId: link.documentId,
      document: link.document,
      entityType: link.entityType,
      entityId: link.entityId,
      linkType: link.linkType,
      relevanceScore: link.relevanceScore,
      isVerified: link.isVerified,
      verifiedAt: link.verifiedAt,
      verifiedBy: link.verifiedBy,
      notesEn: link.notesEn,
      notesFr: link.notesFr,
      createdAt: link.createdAt,
      createdBy: link.createdBy,
    };
  }
}

export const evidenceLinkService = new EvidenceLinkService();
