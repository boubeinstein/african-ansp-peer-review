export {
  documentIntegrityService,
  DocumentIntegrityService,
} from "./integrity-service";

export {
  documentVersionService,
  DocumentVersionService,
} from "./version-service";

export {
  evidenceLinkService,
  EvidenceLinkService,
  VALID_ENTITY_TYPES,
  VALID_LINK_TYPES,
} from "./evidence-service";

export type { HashResult, IntegrityCheckResult } from "./integrity-service";

export type {
  CreateVersionInput,
  VersionInfo,
  VersionDetail,
} from "./version-service";

export type {
  CreateEvidenceLinkInput,
  UpdateEvidenceLinkInput,
  EvidenceLinkInfo,
  EvidenceStats,
} from "./evidence-service";
