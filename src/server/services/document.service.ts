/**
 * Document Service
 *
 * Handles document management including upload, linking to responses,
 * retrieval, and deletion (soft delete).
 */

import { prisma } from "@/lib/db";
import type {
  Document,
  DocumentCategory,
  Locale,
  Prisma,
} from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface CreateDocumentInput {
  name: string;
  originalName?: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category?: DocumentCategory;
  tags?: string[];
  language?: Locale;
  organizationId?: string;
  assessmentId?: string;
  uploadedById: string;
}

export interface UpdateDocumentInput {
  name?: string;
  description?: string;
  category?: DocumentCategory;
  tags?: string[];
  language?: Locale;
}

export interface LinkDocumentInput {
  documentId: string;
  responseId: string;
  notes?: string;
  addedById: string;
}

export interface DocumentFilter {
  organizationId?: string;
  assessmentId?: string;
  category?: DocumentCategory;
  tags?: string[];
  search?: string;
  includeDeleted?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DocumentWithRelations extends Document {
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  responses?: Array<{
    responseId: string;
    notes: string | null;
  }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_RESPONSE = 5;

// =============================================================================
// SERVICE CLASS
// =============================================================================

class DocumentService {
  /**
   * Validate a file before upload
   */
  validateFile(
    file: { type: string; size: number },
    existingCount = 0
  ): ValidationResult {
    const errors: string[] = [];

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push(
        `Invalid file type: ${file.type}. Allowed types: PDF, images, Word, Excel`
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push(
        `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    if (existingCount >= MAX_FILES_PER_RESPONSE) {
      errors.push(
        `Maximum files per response reached: ${MAX_FILES_PER_RESPONSE}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a URL reference
   */
  validateUrl(url: string): ValidationResult {
    const errors: string[] = [];

    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        errors.push("URL must use HTTP or HTTPS protocol");
      }
    } catch {
      errors.push("Invalid URL format");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a new document record
   */
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    const document = await prisma.document.create({
      data: {
        name: input.name,
        originalName: input.originalName,
        description: input.description,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        fileSize: input.fileSize,
        category: input.category ?? "EVIDENCE",
        tags: input.tags ?? [],
        language: input.language,
        organizationId: input.organizationId,
        assessmentId: input.assessmentId,
        uploadedById: input.uploadedById,
      },
    });

    return document;
  }

  /**
   * Create an external URL reference as a document
   */
  async createUrlReference(
    url: string,
    name: string,
    userId: string,
    options?: {
      description?: string;
      category?: DocumentCategory;
      organizationId?: string;
      assessmentId?: string;
    }
  ): Promise<Document> {
    const document = await prisma.document.create({
      data: {
        name,
        fileUrl: url,
        fileType: "external_link",
        fileSize: 0,
        category: options?.category ?? "EVIDENCE",
        description: options?.description,
        organizationId: options?.organizationId,
        assessmentId: options?.assessmentId,
        uploadedById: userId,
      },
    });

    return document;
  }

  /**
   * Link a document to an assessment response
   */
  async linkToResponse(input: LinkDocumentInput): Promise<void> {
    // Verify document exists and is not deleted
    const document = await prisma.document.findFirst({
      where: {
        id: input.documentId,
        isDeleted: false,
      },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Verify response exists
    const response = await prisma.assessmentResponse.findUnique({
      where: { id: input.responseId },
      include: { documents: true },
    });

    if (!response) {
      throw new Error("Response not found");
    }

    // Check if already linked
    const existingLink = response.documents.find(
      (d) => d.documentId === input.documentId
    );
    if (existingLink) {
      throw new Error("Document already linked to this response");
    }

    // Check max files limit
    if (response.documents.length >= MAX_FILES_PER_RESPONSE) {
      throw new Error(
        `Maximum ${MAX_FILES_PER_RESPONSE} documents per response`
      );
    }

    // Create link
    await prisma.responseDocument.create({
      data: {
        responseId: input.responseId,
        documentId: input.documentId,
        notes: input.notes,
        addedById: input.addedById,
      },
    });
  }

  /**
   * Unlink a document from an assessment response
   */
  async unlinkFromResponse(
    documentId: string,
    responseId: string
  ): Promise<void> {
    await prisma.responseDocument.delete({
      where: {
        responseId_documentId: {
          responseId,
          documentId,
        },
      },
    });
  }

  /**
   * Get a document by ID
   */
  async getDocument(
    documentId: string
  ): Promise<DocumentWithRelations | null> {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        isDeleted: false,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: {
          select: {
            responseId: true,
            notes: true,
          },
        },
      },
    });

    return document;
  }

  /**
   * Get documents for an assessment
   */
  async getAssessmentDocuments(
    assessmentId: string
  ): Promise<DocumentWithRelations[]> {
    const documents = await prisma.document.findMany({
      where: {
        assessmentId,
        isDeleted: false,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: {
          select: {
            responseId: true,
            notes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return documents;
  }

  /**
   * Get documents for a specific response
   */
  async getResponseDocuments(
    responseId: string
  ): Promise<DocumentWithRelations[]> {
    const responseDocuments = await prisma.responseDocument.findMany({
      where: { responseId },
      include: {
        document: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        addedAt: "desc",
      },
    });

    return responseDocuments
      .filter((rd) => !rd.document.isDeleted)
      .map((rd) => ({
        ...rd.document,
        responses: [{ responseId, notes: rd.notes }],
      }));
  }

  /**
   * Get documents for an organization (document library)
   */
  async getOrganizationDocuments(
    organizationId: string,
    filter?: DocumentFilter
  ): Promise<DocumentWithRelations[]> {
    const where: Prisma.DocumentWhereInput = {
      organizationId,
      isDeleted: filter?.includeDeleted ? undefined : false,
    };

    if (filter?.category) {
      where.category = filter.category;
    }

    if (filter?.assessmentId) {
      where.assessmentId = filter.assessmentId;
    }

    if (filter?.tags && filter.tags.length > 0) {
      where.tags = {
        hasSome: filter.tags,
      };
    }

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: "insensitive" } },
        { description: { contains: filter.search, mode: "insensitive" } },
        { originalName: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: {
          select: {
            responseId: true,
            notes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return documents;
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    documentId: string,
    input: UpdateDocumentInput,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string
  ): Promise<Document> {
    // Verify document exists
    const existing = await prisma.document.findFirst({
      where: {
        id: documentId,
        isDeleted: false,
      },
    });

    if (!existing) {
      throw new Error("Document not found");
    }

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        tags: input.tags,
        language: input.language,
      },
    });

    return document;
  }

  /**
   * Soft delete a document
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteDocument(documentId: string, _userId: string): Promise<void> {
    // Verify document exists
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        isDeleted: false,
      },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Soft delete
    await prisma.document.update({
      where: { id: documentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Get document count for a response
   */
  async getResponseDocumentCount(responseId: string): Promise<number> {
    const count = await prisma.responseDocument.count({
      where: {
        responseId,
        document: {
          isDeleted: false,
        },
      },
    });

    return count;
  }

  /**
   * Check if user can access document
   */
  async canAccessDocument(
    documentId: string,
    userId: string,
    userOrgId: string | null,
    isAdmin: boolean
  ): Promise<boolean> {
    if (isAdmin) return true;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        isDeleted: false,
      },
    });

    if (!document) return false;

    // User uploaded the document
    if (document.uploadedById === userId) return true;

    // Document belongs to user's organization
    if (userOrgId && document.organizationId === userOrgId) return true;

    return false;
  }

  /**
   * Get constants for client validation
   */
  getConstraints() {
    return {
      allowedMimeTypes: ALLOWED_MIME_TYPES,
      maxFileSize: MAX_FILE_SIZE,
      maxFilesPerResponse: MAX_FILES_PER_RESPONSE,
    };
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const documentService = new DocumentService();
