# Import Format Specification

This document describes the JSON and CSV formats for importing questionnaire data into the African ANSP Peer Review Platform.

## Table of Contents

1. [ANS USOAP CMA Import Format](#ans-usoap-cma-import-format)
2. [SMS CANSO SoE Import Format](#sms-canso-soe-import-format)
3. [CSV Format Specification](#csv-format-specification)
4. [Validation Rules](#validation-rules)
5. [Example Files](#example-files)

---

## ANS USOAP CMA Import Format

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["questionnaire", "categories", "questions"],
  "properties": {
    "questionnaire": {
      "type": "object",
      "required": ["code", "version", "titleEn", "titleFr", "effectiveDate"],
      "properties": {
        "code": {
          "type": "string",
          "description": "Unique questionnaire code",
          "example": "USOAP_CMA_2024"
        },
        "version": {
          "type": "string",
          "description": "Version identifier",
          "example": "2024.1"
        },
        "titleEn": {
          "type": "string",
          "description": "English title"
        },
        "titleFr": {
          "type": "string",
          "description": "French title"
        },
        "descriptionEn": {
          "type": "string",
          "description": "English description (optional)"
        },
        "descriptionFr": {
          "type": "string",
          "description": "French description (optional)"
        },
        "effectiveDate": {
          "type": "string",
          "format": "date",
          "description": "Effective date (ISO 8601)",
          "example": "2025-07-01"
        },
        "expiryDate": {
          "type": "string",
          "format": "date",
          "description": "Expiry date (optional)"
        }
      }
    },
    "categories": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/ANSCategory"
      }
    },
    "questions": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/ANSQuestion"
      }
    }
  },
  "definitions": {
    "ANSCategory": {
      "type": "object",
      "required": ["code", "auditArea", "nameEn", "nameFr", "sortOrder"],
      "properties": {
        "code": {
          "type": "string",
          "description": "Category code (e.g., 'AGA')"
        },
        "auditArea": {
          "type": "string",
          "enum": ["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"]
        },
        "nameEn": { "type": "string" },
        "nameFr": { "type": "string" },
        "descriptionEn": { "type": "string" },
        "descriptionFr": { "type": "string" },
        "sortOrder": { "type": "integer" }
      }
    },
    "ANSQuestion": {
      "type": "object",
      "required": ["pqNumber", "categoryCode", "auditArea", "criticalElement", "questionTextEn", "sortOrder"],
      "properties": {
        "pqNumber": {
          "type": "string",
          "pattern": "^[A-Z]{2,3}\\s\\d+\\.\\d{3}$",
          "description": "Protocol Question number (e.g., 'AGA 1.001')"
        },
        "categoryCode": {
          "type": "string",
          "description": "Reference to category code"
        },
        "auditArea": {
          "type": "string",
          "enum": ["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"]
        },
        "criticalElement": {
          "type": "string",
          "enum": ["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"]
        },
        "isPriorityPQ": {
          "type": "boolean",
          "default": false
        },
        "requiresOnSite": {
          "type": "boolean",
          "default": false
        },
        "pqStatus": {
          "type": "string",
          "enum": ["NO_CHANGE", "REVISED", "NEW", "MERGED", "DELETED", "REFERENCE_REVISED"],
          "default": "NO_CHANGE"
        },
        "previousPqNumber": {
          "type": "string",
          "description": "Previous PQ number if merged/revised"
        },
        "questionTextEn": { "type": "string" },
        "questionTextFr": { "type": "string" },
        "guidanceEn": { "type": "string" },
        "guidanceFr": { "type": "string" },
        "weight": {
          "type": "number",
          "default": 1.0
        },
        "sortOrder": { "type": "integer" },
        "icaoReferences": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/ICAOReference"
          }
        }
      }
    },
    "ICAOReference": {
      "type": "object",
      "required": ["referenceType", "document"],
      "properties": {
        "referenceType": {
          "type": "string",
          "enum": ["CC", "STD", "RP", "PANS", "GM", "Cir", "SUPPS"]
        },
        "document": {
          "type": "string",
          "description": "Document identifier (e.g., 'Annex 14')"
        },
        "chapter": {
          "type": "string",
          "description": "Chapter/section reference"
        },
        "description": {
          "type": "string"
        }
      }
    }
  }
}
```

### Example ANS JSON

```json
{
  "questionnaire": {
    "code": "USOAP_CMA_2024",
    "version": "2024.1",
    "titleEn": "USOAP CMA 2024 Protocol Questions",
    "titleFr": "Questions de Protocole USOAP CMA 2024",
    "descriptionEn": "ICAO Universal Safety Oversight Audit Programme - Continuous Monitoring Approach",
    "descriptionFr": "Programme Universel d'Audit de Surveillance de la Sécurité de l'OACI",
    "effectiveDate": "2025-07-01"
  },
  "categories": [
    {
      "code": "AGA",
      "auditArea": "AGA",
      "nameEn": "Aerodromes and Ground Aids",
      "nameFr": "Aérodromes et Aides au Sol",
      "descriptionEn": "Certification and oversight of aerodromes",
      "descriptionFr": "Certification et surveillance des aérodromes",
      "sortOrder": 8
    }
  ],
  "questions": [
    {
      "pqNumber": "AGA 1.001",
      "categoryCode": "AGA",
      "auditArea": "AGA",
      "criticalElement": "CE_1",
      "isPriorityPQ": true,
      "requiresOnSite": false,
      "pqStatus": "NO_CHANGE",
      "questionTextEn": "Has the State promulgated national legislation for the certification of aerodromes?",
      "questionTextFr": "L'État a-t-il promulgué une législation nationale pour la certification des aérodromes?",
      "guidanceEn": "Review the primary aviation legislation to verify provisions for aerodrome certification.",
      "guidanceFr": "Examiner la législation aéronautique primaire pour vérifier les dispositions relatives à la certification des aérodromes.",
      "weight": 1.0,
      "sortOrder": 1,
      "icaoReferences": [
        {
          "referenceType": "STD",
          "document": "Annex 14",
          "chapter": "1.4",
          "description": "Aerodrome Certification"
        },
        {
          "referenceType": "GM",
          "document": "Doc 9774",
          "description": "Manual on Certification of Aerodromes"
        }
      ]
    }
  ]
}
```

---

## SMS CANSO SoE Import Format

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["questionnaire", "categories", "questions"],
  "properties": {
    "questionnaire": {
      "type": "object",
      "required": ["code", "version", "titleEn", "titleFr", "effectiveDate"],
      "properties": {
        "code": { "type": "string" },
        "version": { "type": "string" },
        "titleEn": { "type": "string" },
        "titleFr": { "type": "string" },
        "descriptionEn": { "type": "string" },
        "descriptionFr": { "type": "string" },
        "effectiveDate": { "type": "string", "format": "date" }
      }
    },
    "categories": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/SMSCategory"
      }
    },
    "questions": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/SMSQuestion"
      }
    }
  },
  "definitions": {
    "SMSCategory": {
      "type": "object",
      "required": ["code", "smsComponent", "studyArea", "nameEn", "nameFr", "sortOrder"],
      "properties": {
        "code": { "type": "string" },
        "smsComponent": {
          "type": "string",
          "enum": [
            "SAFETY_POLICY_OBJECTIVES",
            "SAFETY_RISK_MANAGEMENT",
            "SAFETY_ASSURANCE",
            "SAFETY_PROMOTION"
          ]
        },
        "studyArea": {
          "type": "string",
          "enum": [
            "SA_1_1", "SA_1_2", "SA_1_3", "SA_1_4", "SA_1_5",
            "SA_2_1", "SA_2_2",
            "SA_3_1", "SA_3_2", "SA_3_3",
            "SA_4_1", "SA_4_2"
          ]
        },
        "transversalArea": {
          "type": "string",
          "enum": ["SPM", "HP", "CI"],
          "description": "Optional cross-cutting area"
        },
        "nameEn": { "type": "string" },
        "nameFr": { "type": "string" },
        "sortOrder": { "type": "integer" }
      }
    },
    "SMSQuestion": {
      "type": "object",
      "required": ["categoryCode", "smsComponent", "studyArea", "maturityLevel", "questionTextEn", "sortOrder"],
      "properties": {
        "categoryCode": { "type": "string" },
        "smsComponent": {
          "type": "string",
          "enum": [
            "SAFETY_POLICY_OBJECTIVES",
            "SAFETY_RISK_MANAGEMENT",
            "SAFETY_ASSURANCE",
            "SAFETY_PROMOTION"
          ]
        },
        "studyArea": {
          "type": "string",
          "enum": [
            "SA_1_1", "SA_1_2", "SA_1_3", "SA_1_4", "SA_1_5",
            "SA_2_1", "SA_2_2",
            "SA_3_1", "SA_3_2", "SA_3_3",
            "SA_4_1", "SA_4_2"
          ]
        },
        "maturityLevel": {
          "type": "string",
          "enum": ["LEVEL_A", "LEVEL_B", "LEVEL_C", "LEVEL_D", "LEVEL_E"]
        },
        "transversalArea": {
          "type": "string",
          "enum": ["SPM", "HP", "CI"]
        },
        "questionTextEn": { "type": "string" },
        "questionTextFr": { "type": "string" },
        "guidanceEn": { "type": "string" },
        "guidanceFr": { "type": "string" },
        "weight": { "type": "number", "default": 1.0 },
        "sortOrder": { "type": "integer" }
      }
    }
  }
}
```

### Example SMS JSON

```json
{
  "questionnaire": {
    "code": "CANSO_SOE_2024",
    "version": "2024.1",
    "titleEn": "CANSO Standard of Excellence 2024",
    "titleFr": "Norme d'Excellence CANSO 2024",
    "effectiveDate": "2024-01-01"
  },
  "categories": [
    {
      "code": "SA_1_1",
      "smsComponent": "SAFETY_POLICY_OBJECTIVES",
      "studyArea": "SA_1_1",
      "nameEn": "Management Commitment and Responsibility",
      "nameFr": "Engagement et Responsabilité de la Direction",
      "sortOrder": 1
    }
  ],
  "questions": [
    {
      "categoryCode": "SA_1_1",
      "smsComponent": "SAFETY_POLICY_OBJECTIVES",
      "studyArea": "SA_1_1",
      "maturityLevel": "LEVEL_A",
      "questionTextEn": "Senior management has made an informal commitment to safety.",
      "questionTextFr": "La haute direction a pris un engagement informel envers la sécurité.",
      "guidanceEn": "Look for evidence of verbal commitment to safety by senior leaders.",
      "guidanceFr": "Rechercher des preuves d'engagement verbal envers la sécurité par les dirigeants.",
      "weight": 1.0,
      "sortOrder": 1
    },
    {
      "categoryCode": "SA_1_1",
      "smsComponent": "SAFETY_POLICY_OBJECTIVES",
      "studyArea": "SA_1_1",
      "maturityLevel": "LEVEL_E",
      "transversalArea": "CI",
      "questionTextEn": "The organization is recognized as an industry leader in safety management.",
      "questionTextFr": "L'organisation est reconnue comme leader de l'industrie en gestion de la sécurité.",
      "weight": 1.0,
      "sortOrder": 5
    }
  ]
}
```

---

## CSV Format Specification

CSV files can be used as an alternative to JSON. The system auto-detects the format based on file extension.

### ANS CSV Format

| Column | Required | Description |
|--------|----------|-------------|
| pqNumber | Yes | Protocol Question number (e.g., "AGA 1.001") |
| auditArea | Yes | LEG, ORG, PEL, OPS, AIR, AIG, ANS, AGA, SSP |
| criticalElement | Yes | CE_1 through CE_8 |
| isPriorityPQ | No | TRUE/FALSE (default: FALSE) |
| requiresOnSite | No | TRUE/FALSE (default: FALSE) |
| pqStatus | No | NO_CHANGE, REVISED, NEW, MERGED, DELETED |
| previousPqNumber | No | Previous PQ if merged/revised |
| questionTextEn | Yes | English question text |
| questionTextFr | No | French question text |
| guidanceEn | No | English guidance |
| guidanceFr | No | French guidance |
| weight | No | Numeric weight (default: 1.0) |
| sortOrder | Yes | Numeric sort order |
| references | No | Pipe-separated references (see below) |

**Reference Format**: `TYPE:DOC:CHAPTER:DESC|TYPE:DOC:CHAPTER:DESC`

Example: `STD:Annex 14:1.4:Certification|GM:Doc 9774::Manual`

### SMS CSV Format

| Column | Required | Description |
|--------|----------|-------------|
| studyArea | Yes | SA_1_1 through SA_4_2 |
| smsComponent | Yes | SAFETY_POLICY_OBJECTIVES, etc. |
| maturityLevel | Yes | LEVEL_A through LEVEL_E |
| transversalArea | No | SPM, HP, CI |
| questionTextEn | Yes | English question text |
| questionTextFr | No | French question text |
| guidanceEn | No | English guidance |
| guidanceFr | No | French guidance |
| weight | No | Numeric weight (default: 1.0) |
| sortOrder | Yes | Numeric sort order |

### Example ANS CSV

```csv
pqNumber,auditArea,criticalElement,isPriorityPQ,requiresOnSite,pqStatus,questionTextEn,questionTextFr,guidanceEn,guidanceFr,weight,sortOrder,references
AGA 1.001,AGA,CE_1,TRUE,FALSE,NO_CHANGE,"Has the State promulgated legislation for aerodrome certification?","L'État a-t-il promulgué une législation pour la certification des aérodromes?","Review primary aviation legislation","Examiner la législation aéronautique primaire",1.0,1,"STD:Annex 14:1.4:Certification|GM:Doc 9774::Manual"
AGA 1.002,AGA,CE_2,TRUE,FALSE,NEW,"Has the State adopted specific regulations for aerodrome design?","L'État a-t-il adopté des règlements spécifiques pour la conception des aérodromes?",,,,2,"STD:Annex 14:3.1:Physical Characteristics"
```

---

## Validation Rules

### General Rules

1. **Encoding**: UTF-8 required for proper French character support (é, è, à, etc.)
2. **Required Fields**: All required fields must be non-empty
3. **Unique Identifiers**: PQ numbers must be unique within questionnaire
4. **Sort Order**: Must be positive integers, unique within category

### ANS-Specific Rules

1. **PQ Number Format**: Must match pattern `XXX N.NNN` (e.g., "AGA 1.001")
2. **Audit Area**: Must match category's audit area
3. **Critical Element**: Must be CE_1 through CE_8
4. **Amendment Status**: If MERGED or REVISED, `previousPqNumber` should be provided

### SMS-Specific Rules

1. **Study Area Mapping**: Study area must belong to correct SMS component:
   - Component 1: SA_1_1 through SA_1_5
   - Component 2: SA_2_1, SA_2_2
   - Component 3: SA_3_1 through SA_3_3
   - Component 4: SA_4_1, SA_4_2
2. **Maturity Level**: Questions should be ordered A → E for each study area
3. **Transversal Areas**: Optional, cross-cutting theme indicator

### Reference Rules

1. **Reference Type**: Must be valid ICAO reference type
2. **Document**: Required, identifies the source document
3. **Chapter**: Optional, specific section reference
4. **Description**: Optional, brief description of relevance

---

## Example Files

### Complete ANS Import File

See: `prisma/seed-data/ans-usoap-cma-2024.json`

### Complete SMS Import File

See: `prisma/seed-data/sms-canso-soe-2024.json`

### Sample Data for Testing

The system includes seed data for testing:
- 153 AGA Protocol Questions (complete AGA audit area)
- Full ICAO reference mappings
- Bilingual content (EN/FR)

---

## Import Process

### Step-by-Step

1. **Upload**: Select JSON or CSV file
2. **Parse**: System validates format and extracts data
3. **Preview**: Review parsed data with validation warnings
4. **Import**: Bulk insert with transaction rollback on error

### Error Handling

| Error Type | Description | Resolution |
|------------|-------------|------------|
| FORMAT_ERROR | Invalid JSON/CSV structure | Check file format |
| MISSING_FIELD | Required field is empty | Add missing data |
| INVALID_ENUM | Invalid enum value | Use correct value from list |
| DUPLICATE_PQ | PQ number already exists | Change PQ number or update existing |
| ENCODING_ERROR | Invalid characters | Save as UTF-8 |

### Bulk Operations

- Import supports up to 1000 questions per file
- Large imports are processed in batches of 100
- Progress is shown during import
- Rollback on any error in batch

---

## API Usage

### Validate Before Import

```typescript
const result = await trpc.admin.questionnaire.validate.mutate({
  type: 'ANS_USOAP_CMA',
  data: jsonData,
});

if (result.errors.length > 0) {
  console.error('Validation errors:', result.errors);
}
```

### Execute Import

```typescript
const result = await trpc.admin.questionnaire.import.mutate({
  type: 'ANS_USOAP_CMA',
  data: jsonData,
});

console.log(`Imported ${result.questionsCount} questions`);
```
