# Fieldwork Checklist Quick Reference
# Reference Rapide - Liste de Controle du Terrain

---

## Checklist Overview / Apercu de la Liste

| Phase | Items | Elements |
|-------|-------|----------|
| **Pre-Visit / Pre-visite** | 4 | 4 |
| **On-Site / Sur Site** | 6 | 6 |
| **Post-Visit / Post-visite** | 4 | 4 |
| **Total** | **14** | **14** |

---

## Phase 1: Pre-Visit / Pre-visite

| # | Item (EN) | Element (FR) | Validation |
|---|-----------|--------------|------------|
| 1 | Document request sent to host | Demande de documents envoyee a l'hote | DOC: PRE_VISIT_REQUEST |
| 2 | Pre-visit documents received and reviewed | Documents pre-visite recus et examines | DOC: HOST_SUBMISSION (Reviewed) |
| 3 | Coordination meeting held with team | Reunion de coordination tenue avec l'equipe | MANUAL |
| 4 | Review plan approved by team | Plan de revue approuve par l'equipe | APPROVAL: Lead Reviewer |

---

## Phase 2: On-Site / Sur Site

| # | Item (EN) | Element (FR) | Validation |
|---|-----------|--------------|------------|
| 5 | Opening meeting conducted with host | Reunion d'ouverture tenue avec l'hote | MANUAL |
| 6 | Staff interviews completed | Entretiens du personnel termines | DOC: INTERVIEW_NOTES |
| 7 | Facilities inspection completed | Inspection des installations terminee | DOC: EVIDENCE |
| 8 | Document review completed | Examen des documents termine | DOC: All HOST_SUBMISSION reviewed |
| 9 | Preliminary findings discussed with host | Constatations preliminaires discutees | FINDING: >= 1 exists |
| 10 | Closing meeting conducted | Reunion de cloture tenue | PREREQ: All items 5-9 complete |

---

## Phase 3: Post-Visit / Post-visite

| # | Item (EN) | Element (FR) | Validation |
|---|-----------|--------------|------------|
| 11 | All findings entered in system | Toutes les constatations saisies | AUTO: Findings count > 0 |
| 12 | Supporting evidence uploaded | Preuves a l'appui telechargees | AUTO: All findings have evidence |
| 13 | Draft report prepared | Rapport preliminaire prepare | DOC: DRAFT_REPORT |
| 14 | Host feedback received on draft | Commentaires de l'hote recus | DOC: CORRESPONDENCE or MANUAL |

---

## Validation Types / Types de Validation

| Code | Meaning (EN) | Signification (FR) |
|------|--------------|-------------------|
| DOC | Document required | Document requis |
| MANUAL | Manual completion allowed | Completion manuelle autorisee |
| APPROVAL | Role-based approval | Approbation basee sur le role |
| FINDING | Finding required | Constatation requise |
| PREREQ | Prerequisite items | Elements prealables |
| AUTO | Automatic validation | Validation automatique |

---

## Status Indicators / Indicateurs de Statut

| Indicator | Status (EN) | Statut (FR) |
|-----------|-------------|-------------|
| Green circle | Completed | Termine |
| Amber circle | Validation issue | Probleme de validation |
| Gray circle | Pending | En attente |
| Unlocked icon | Override available | Derogation disponible |
| Locked icon | Overridden | Derogatoire |

---

## How to Complete Items / Comment Completer les Elements

### Document-Required Items / Elements Necessitant un Document

1. **Click Upload button** / Cliquer sur le bouton Telecharger
2. **Select correct category** / Selectionner la bonne categorie
3. **Upload file (max 10MB)** / Telecharger le fichier (max 10Mo)
4. **Item auto-validates** / L'element se valide automatiquement

### Manual Items / Elements Manuels

1. **Click checkbox** / Cliquer sur la case a cocher
2. **Item marked complete** / Element marque comme termine

### Blocked Items / Elements Bloques

If you see amber indicator:
1. **Read validation message** / Lire le message de validation
2. **Complete required action** / Effectuer l'action requise
3. **Upload missing document** / Telecharger le document manquant
4. **Or request override** / Ou demander une derogation

---

## Override Process / Processus de Derogation

**Who can override? / Qui peut deroger?**
- Programme Coordinator / Coordinateur de Programme
- System Admin / Administrateur Systeme

**Steps / Etapes:**

1. Click unlock icon / Cliquer sur l'icone deverrouiller
2. Enter reason (min 10 characters) / Entrer la raison (min 10 caracteres)
3. Click "Override Item" / Cliquer sur "Deroger"
4. Item shows override badge / L'element affiche un badge de derogation

**Example reasons / Exemples de raisons:**
- "Document received via email, verified by coordinator"
- "Document recu par email, verifie par le coordinateur"
- "Meeting held virtually due to travel restrictions"
- "Reunion tenue virtuellement en raison des restrictions de voyage"

---

## Complete Fieldwork / Terminer le Travail de Terrain

**Requirements / Exigences:**
- All 14 items must be completed or overridden
- Les 14 elements doivent etre completes ou derogatoires

**Button location / Emplacement du bouton:**
- Bottom of checklist page / Bas de la page de liste de controle

**Effect / Effet:**
- Review transitions to REPORTING phase
- La revue passe a la phase RAPPORT

---

## Troubleshooting / Depannage

| Issue (EN) | Solution (EN) |
|------------|---------------|
| Can't complete item | Check validation message, upload required document |
| Override button missing | You don't have permission (Coordinator only) |
| Document not showing | Refresh page, check correct category |
| Progress not updating | Wait a moment, then refresh |

| Probleme (FR) | Solution (FR) |
|---------------|---------------|
| Impossible de completer | Verifier le message, telecharger le document requis |
| Bouton derogation absent | Pas de permission (Coordinateur seulement) |
| Document non affiche | Actualiser la page, verifier la categorie |
| Progression non mise a jour | Attendre un moment, puis actualiser |

---

## Document Categories Quick Reference / Reference Rapide des Categories

| Category | Code | Used For |
|----------|------|----------|
| Pre-Visit Request | PRE_VISIT_REQUEST | Item 1 |
| Host Submission | HOST_SUBMISSION | Items 2, 8 |
| Interview Notes | INTERVIEW_NOTES | Item 6 |
| Evidence | EVIDENCE | Items 7, 12 |
| Draft Report | DRAFT_REPORT | Item 13 |
| Correspondence | CORRESPONDENCE | Item 14 |

---

**Version:** 1.0 | March/Mars 2026 | AAPRP 2026
