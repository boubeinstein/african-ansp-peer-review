# Document Management Quick Reference
# Reference Rapide - Gestion des Documents

---

## Document Categories / Categories de Documents

| Code | Category (EN) | Categorie (FR) | Usage |
|------|---------------|----------------|-------|
| PRE_VISIT_REQUEST | Pre-Visit Request | Demande Pre-visite | Document request letter |
| HOST_SUBMISSION | Host Submission | Soumission de l'Hote | Documents from host ANSP |
| EVIDENCE | Evidence | Preuves | Photos, inspection reports |
| INTERVIEW_NOTES | Interview Notes | Notes d'Entretien | Staff interview records |
| DRAFT_REPORT | Draft Report | Rapport Preliminaire | Preliminary review report |
| FINAL_REPORT | Final Report | Rapport Final | Completed review report |
| CAP_EVIDENCE | CAP Evidence | Preuves PAC | Corrective action proof |
| CORRESPONDENCE | Correspondence | Correspondance | Email communications |
| OTHER | Other | Autre | Miscellaneous documents |

---

## Document Status Workflow / Flux de Statut

```
┌──────────────┐
│   UPLOADED   │  <-- Initial state / Etat initial
│  TELECHARGE  │
└──────┬───────┘
       │
       v
┌──────────────┐
│ UNDER_REVIEW │  <-- Being reviewed / En cours de revision
│  EN_REVISION │
└──────┬───────┘
       │
 ┌─────┴─────┐
 v           v
┌─────────┐ ┌──────────┐
│REVIEWED │ │ REJECTED │  <-- Needs re-upload / Necessite re-telechargement
│ REVISE  │ │  REJETE  │
└────┬────┘ └──────────┘
     │
     v
┌──────────┐
│ APPROVED │  <-- Final state / Etat final
│ APPROUVE │
└──────────┘
```

---

## Status Definitions / Definitions des Statuts

| Status | EN Description | Description FR |
|--------|----------------|----------------|
| UPLOADED | Just uploaded, awaiting review | Vient d'etre telecharge, en attente de revision |
| UNDER_REVIEW | Currently being reviewed | En cours de revision |
| REVIEWED | Review complete | Revision terminee |
| PENDING_APPROVAL | Awaiting formal approval | En attente d'approbation formelle |
| APPROVED | Formally approved (final) | Approuve formellement (final) |
| REJECTED | Rejected, needs re-upload | Rejete, necessite re-telechargement |

---

## File Specifications / Specifications des Fichiers

| Parameter | Value |
|-----------|-------|
| **Max file size** | 10 MB / 10 Mo |
| **PDF** | Supported / Supporte |
| **Word** | .doc, .docx |
| **Excel** | .xls, .xlsx |
| **Images** | .png, .jpg, .jpeg, .gif, .webp |
| **Text** | .txt, .csv |

---

## Uploading Documents / Telechargement de Documents

### Steps / Etapes

1. **Navigate to Documents tab** / Aller a l'onglet Documents
2. **Click "Upload Document"** / Cliquer sur "Telecharger un Document"
3. **Select category** / Selectionner la categorie
4. **Choose file (drag & drop or browse)** / Choisir le fichier
5. **Click "Upload"** / Cliquer sur "Telecharger"
6. **Wait for confirmation** / Attendre la confirmation

### From Checklist / Depuis la Liste de Controle

1. **Click Upload button on blocked item** / Cliquer sur Telecharger sur l'element bloque
2. **Category auto-selected** / Categorie auto-selectionnee
3. **Upload file** / Telecharger le fichier
4. **Return to checklist** / Retour a la liste de controle

---

## Reviewing Documents / Revision des Documents

### Who Can Review? / Qui Peut Reviser?

| Role | Permission |
|------|------------|
| Programme Coordinator | Yes |
| Lead Reviewer | Yes |
| Peer Reviewer | Yes |
| Host Organization | No |

### Steps / Etapes

1. **Find document in list** / Trouver le document dans la liste
2. **Click menu (more actions)** / Cliquer sur le menu (plus d'actions)
3. **Select "Mark as Reviewed"** / Selectionner "Marquer comme Revise"
4. **Add notes (optional)** / Ajouter des notes (optionnel)
5. **Click "Mark Reviewed"** / Cliquer sur "Marquer Revise"

---

## Approving Documents / Approbation des Documents

### Who Can Approve? / Qui Peut Approuver?

| Role | Permission |
|------|------------|
| Programme Coordinator | Yes |
| Lead Reviewer | Yes |
| Peer Reviewer | No |
| Host Organization | No |

### Steps / Etapes

1. **Document must be REVIEWED** / Le document doit etre REVISE
2. **Click menu (more actions)** / Cliquer sur le menu
3. **Select "Approve"** / Selectionner "Approuver"
4. **Confirm approval** / Confirmer l'approbation

---

## Rejecting Documents / Rejet des Documents

### When to Reject? / Quand Rejeter?

- Document is incomplete / Document incomplet
- Wrong document uploaded / Mauvais document telecharge
- Poor quality / scan / Mauvaise qualite / scan
- Outdated version / Version obsolete

### Steps / Etapes

1. **Click menu (more actions)** / Cliquer sur le menu
2. **Select "Reject"** / Selectionner "Rejeter"
3. **Enter reason (required)** / Entrer la raison (obligatoire)
4. **Click "Reject"** / Cliquer sur "Rejeter"
5. **Host notified to re-upload** / L'hote est notifie de re-telecharger

---

## Filtering & Search / Filtrage et Recherche

### Filter by Category / Filtrer par Categorie

Click category tabs at top:
Cliquer sur les onglets de categorie en haut:

```
All | Pre-Visit | Host | Evidence | Interview | Reports | CAP | Other
```

### Filter by Status / Filtrer par Statut

Use dropdown: / Utiliser le menu deroulant:

```
All Status | Uploaded | Under Review | Reviewed | Approved | Rejected
```

### Search / Recherche

Type filename in search box / Taper le nom de fichier dans la zone de recherche

---

## Bulk Actions / Actions Groupees

### Select Multiple / Selectionner Plusieurs

1. **Check boxes next to documents** / Cocher les cases a cote des documents
2. **Click "Bulk Actions"** / Cliquer sur "Actions Groupees"
3. **Choose action** / Choisir l'action:
   - Mark as Reviewed / Marquer comme Revise
   - Approve All / Tout Approuver

**Limit:** Max 50 documents at once / Max 50 documents a la fois

---

## Document Statistics / Statistiques des Documents

Dashboard shows: / Le tableau de bord affiche:

| Metric | Description |
|--------|-------------|
| **Total** | All documents / Tous les documents |
| **Pending Review** | UPLOADED status / Statut TELECHARGE |
| **Reviewed** | REVIEWED status / Statut REVISE |
| **Approved** | APPROVED status / Statut APPROUVE |

---

## Deleting Documents / Suppression de Documents

### Who Can Delete? / Qui Peut Supprimer?

| Condition | Who |
|-----------|-----|
| Own uploaded document | Uploader / Telechargeur |
| Any document (not approved) | Lead Reviewer, Coordinator |
| Approved document | Super Admin only |

### Steps / Etapes

1. **Click menu (more actions)** / Cliquer sur le menu
2. **Select "Delete"** / Selectionner "Supprimer"
3. **Confirm deletion** / Confirmer la suppression

**Warning:** Deletion is permanent / La suppression est permanente

---

## Checklist Integration / Integration Liste de Controle

| Checklist Item | Required Category |
|----------------|-------------------|
| Document request sent | PRE_VISIT_REQUEST |
| Pre-visit docs received | HOST_SUBMISSION (Reviewed) |
| Staff interviews completed | INTERVIEW_NOTES |
| Facilities inspection | EVIDENCE |
| Document review completed | HOST_SUBMISSION (All Reviewed) |
| Evidence uploaded | EVIDENCE (linked to findings) |
| Draft report prepared | DRAFT_REPORT |
| Host feedback received | CORRESPONDENCE |

---

## Troubleshooting / Depannage

| Issue | Solution |
|-------|----------|
| Upload fails | Check file size (max 10MB), file type |
| Can't approve | Document must be REVIEWED first |
| Can't delete | Document may be APPROVED (Admin only) |
| Document not visible | Check category filter, refresh page |

| Probleme | Solution |
|----------|----------|
| Echec du telechargement | Verifier la taille (max 10Mo), le type |
| Impossible d'approuver | Le document doit etre REVISE d'abord |
| Impossible de supprimer | Le document peut etre APPROUVE (Admin seulement) |
| Document non visible | Verifier le filtre de categorie, actualiser |

---

**Version:** 1.0 | March/Mars 2026 | AAPRP 2026
