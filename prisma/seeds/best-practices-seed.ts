/**
 * Best Practices Library - Seed Script
 * 
 * Creates high-quality, realistic best practice examples aligned with
 * ICAO USOAP CMA 2024 and CANSO Standard of Excellence frameworks.
 * 
 * Usage:
 *   npx ts-node prisma/seeds/best-practices-seed.ts
 *   or
 *   npx prisma db seed (if configured in package.json)
 * 
 * Prerequisites:
 *   - Organizations must exist in database
 *   - Users must exist (for submitter/reviewer)
 *   - BestPractice migration must be applied
 */

import "dotenv/config";
import { db } from "../../src/lib/db";
import { BestPracticeCategory, BestPracticeStatus } from "@prisma/client";

const prisma = db;

// =============================================================================
// BEST PRACTICE DATA
// =============================================================================

interface BestPracticeData {
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  summaryEn: string;
  summaryFr: string;
  descriptionEn: string;
  descriptionFr: string;
  implementationEn: string;
  implementationFr: string;
  benefitsEn: string;
  benefitsFr: string;
  category: BestPracticeCategory;
  auditArea: string;
  tags: string[];
  status: BestPracticeStatus;
}

const bestPractices: BestPracticeData[] = [
  // ==========================================================================
  // SAFETY MANAGEMENT
  // ==========================================================================
  {
    referenceNumber: "BP-2025-0001",
    titleEn: "Integrated Safety Performance Dashboard with Predictive Analytics",
    titleFr: "Tableau de bord intégré de performance sécurité avec analyse prédictive",
    summaryEn: "A real-time safety performance monitoring system that combines traditional safety indicators with predictive analytics to identify emerging risks before they materialize into incidents.",
    summaryFr: "Un système de surveillance de la performance sécurité en temps réel qui combine les indicateurs de sécurité traditionnels avec l'analyse prédictive pour identifier les risques émergents avant qu'ils ne se matérialisent en incidents.",
    descriptionEn: `This best practice introduces a comprehensive safety performance dashboard that revolutionizes how ANSPs monitor and manage safety. The system integrates data from multiple sources including:

• Mandatory and voluntary occurrence reports
• Air traffic complexity metrics
• Controller workload indicators
• Weather and environmental data
• Equipment reliability statistics
• Training and competency records

The dashboard employs machine learning algorithms trained on historical incident data to identify patterns and predict potential safety concerns. It provides three levels of insight:

1. **Reactive Indicators**: Traditional lagging indicators showing actual safety performance
2. **Proactive Indicators**: Leading indicators identifying conditions that precede incidents
3. **Predictive Indicators**: AI-generated forecasts highlighting areas of emerging risk

The system has been validated against five years of historical data and demonstrated 78% accuracy in predicting high-risk periods up to 72 hours in advance.`,
    descriptionFr: `Cette meilleure pratique introduit un tableau de bord complet de performance sécurité qui révolutionne la façon dont les ANSP surveillent et gèrent la sécurité. Le système intègre des données provenant de sources multiples, notamment:

• Rapports d'occurrences obligatoires et volontaires
• Métriques de complexité du trafic aérien
• Indicateurs de charge de travail des contrôleurs
• Données météorologiques et environnementales
• Statistiques de fiabilité des équipements
• Registres de formation et de compétences

Le tableau de bord utilise des algorithmes d'apprentissage automatique entraînés sur des données historiques d'incidents pour identifier des modèles et prédire les préoccupations potentielles en matière de sécurité. Il fournit trois niveaux d'information:

1. **Indicateurs réactifs**: Indicateurs retardés traditionnels montrant la performance réelle de sécurité
2. **Indicateurs proactifs**: Indicateurs avancés identifiant les conditions qui précèdent les incidents
3. **Indicateurs prédictifs**: Prévisions générées par l'IA mettant en évidence les zones de risque émergent

Le système a été validé sur cinq ans de données historiques et a démontré une précision de 78% dans la prédiction des périodes à haut risque jusqu'à 72 heures à l'avance.`,
    implementationEn: `**Phase 1: Data Infrastructure (Months 1-3)**
1. Audit existing data sources and identify integration requirements
2. Establish data warehouse architecture with real-time ingestion capability
3. Implement data quality controls and validation rules
4. Create standardized data formats aligned with ECCAIRS 2.0 taxonomy

**Phase 2: Dashboard Development (Months 4-6)**
1. Design user interface with input from safety managers and controllers
2. Develop core visualization components for each indicator category
3. Implement role-based access controls and alert thresholds
4. Create automated report generation capabilities

**Phase 3: Predictive Model Training (Months 7-9)**
1. Prepare historical dataset with proper labeling and feature engineering
2. Train and validate machine learning models using cross-validation
3. Establish model performance baselines and acceptance criteria
4. Implement model monitoring and retraining procedures

**Phase 4: Deployment and Optimization (Months 10-12)**
1. Pilot deployment with safety team for feedback collection
2. Integrate with existing safety management system workflows
3. Train all stakeholders on dashboard interpretation
4. Establish continuous improvement cycle based on user feedback

**Key Success Factors:**
• Executive sponsorship and dedicated project team
• Early involvement of end-users in design process
• Robust data governance framework
• Regular validation of predictive model accuracy`,
    implementationFr: `**Phase 1: Infrastructure de données (Mois 1-3)**
1. Auditer les sources de données existantes et identifier les exigences d'intégration
2. Établir une architecture d'entrepôt de données avec capacité d'ingestion en temps réel
3. Mettre en œuvre des contrôles de qualité des données et des règles de validation
4. Créer des formats de données standardisés alignés sur la taxonomie ECCAIRS 2.0

**Phase 2: Développement du tableau de bord (Mois 4-6)**
1. Concevoir l'interface utilisateur avec la contribution des gestionnaires de sécurité et des contrôleurs
2. Développer les composants de visualisation de base pour chaque catégorie d'indicateurs
3. Mettre en œuvre des contrôles d'accès basés sur les rôles et des seuils d'alerte
4. Créer des capacités de génération automatique de rapports

**Phase 3: Formation du modèle prédictif (Mois 7-9)**
1. Préparer l'ensemble de données historiques avec un étiquetage approprié
2. Former et valider les modèles d'apprentissage automatique
3. Établir des bases de performance du modèle et des critères d'acceptation
4. Mettre en œuvre des procédures de surveillance et de recyclage du modèle

**Phase 4: Déploiement et optimisation (Mois 10-12)**
1. Déploiement pilote avec l'équipe sécurité pour la collecte de commentaires
2. Intégrer aux flux de travail existants du système de gestion de la sécurité
3. Former toutes les parties prenantes à l'interprétation du tableau de bord
4. Établir un cycle d'amélioration continue basé sur les retours des utilisateurs`,
    benefitsEn: `**Quantitative Benefits:**
• 34% reduction in serious incidents over 24-month period
• 45% improvement in time to identify emerging safety trends
• 60% reduction in manual safety data processing effort
• 28% increase in voluntary safety report submissions

**Qualitative Benefits:**
• Enhanced safety culture through transparent performance visibility
• Improved decision-making with data-driven insights
• Better resource allocation for safety interventions
• Stronger evidence base for safety cases and regulatory submissions
• Increased confidence from oversight authorities

**Regulatory Alignment:**
• Supports ICAO Annex 19 requirements for safety performance monitoring
• Demonstrates mature SMS implementation (Level D)
• Facilitates State Safety Programme objectives tracking`,
    benefitsFr: `**Avantages quantitatifs:**
• Réduction de 34% des incidents graves sur une période de 24 mois
• Amélioration de 45% du temps d'identification des tendances de sécurité émergentes
• Réduction de 60% de l'effort de traitement manuel des données de sécurité
• Augmentation de 28% des soumissions de rapports de sécurité volontaires

**Avantages qualitatifs:**
• Culture de sécurité renforcée grâce à une visibilité transparente des performances
• Amélioration de la prise de décision avec des informations basées sur les données
• Meilleure allocation des ressources pour les interventions de sécurité
• Base de preuves plus solide pour les dossiers de sécurité
• Confiance accrue des autorités de surveillance

**Alignement réglementaire:**
• Soutient les exigences de l'Annexe 19 de l'OACI pour la surveillance des performances de sécurité
• Démontre une mise en œuvre mature du SGS (Niveau D)
• Facilite le suivi des objectifs du Programme national de sécurité`,
    category: "SAFETY_MANAGEMENT",
    auditArea: "SMS",
    tags: ["predictive-analytics", "dashboard", "safety-performance", "data-integration", "machine-learning"],
    status: "PUBLISHED",
  },

  {
    referenceNumber: "BP-2025-0002",
    titleEn: "Just Culture Implementation Framework with Peer Support Program",
    titleFr: "Cadre de mise en œuvre de la culture juste avec programme de soutien par les pairs",
    summaryEn: "A comprehensive framework for establishing and maintaining a just culture environment, including a trained peer support network to assist staff involved in safety occurrences.",
    summaryFr: "Un cadre complet pour établir et maintenir un environnement de culture juste, incluant un réseau de soutien par les pairs formé pour aider le personnel impliqué dans des occurrences de sécurité.",
    descriptionEn: `This best practice establishes a robust just culture framework that balances accountability with learning, supported by a peer assistance program. The framework addresses the critical challenge of encouraging open reporting while maintaining appropriate accountability for negligent or reckless behavior.

**Core Components:**

1. **Just Culture Policy and Charter**
   - Clear definitions of acceptable and unacceptable behaviors
   - Decision-making algorithm for accountability determination
   - Protection guarantees for reporters and involved parties
   - Appeals process and independent review mechanisms

2. **Trained Peer Support Network**
   - Volunteer controllers trained in critical incident stress management
   - Confidential support available within 2 hours of any significant occurrence
   - Structured debriefing protocols following CISM principles
   - Connection to professional psychological support when needed

3. **Manager Decision Support Tools**
   - Standardized assessment framework for occurrence evaluation
   - Clear criteria distinguishing honest mistakes from negligence
   - Documentation requirements ensuring consistent treatment
   - Regular calibration sessions to ensure fair application

4. **Organizational Learning Integration**
   - Systematic extraction of safety lessons from occurrences
   - Feedback loop to reporters on actions taken
   - Regular communication of systemic improvements made

The framework has been recognized by EUROCONTROL as a model practice and has been presented at multiple international safety conferences.`,
    descriptionFr: `Cette meilleure pratique établit un cadre robuste de culture juste qui équilibre la responsabilité avec l'apprentissage, soutenu par un programme d'assistance par les pairs. Le cadre aborde le défi critique d'encourager les rapports ouverts tout en maintenant une responsabilité appropriée pour les comportements négligents ou imprudents.

**Composantes principales:**

1. **Politique et charte de culture juste**
   - Définitions claires des comportements acceptables et inacceptables
   - Algorithme de prise de décision pour la détermination de la responsabilité
   - Garanties de protection pour les rapporteurs et les parties impliquées
   - Processus d'appel et mécanismes de révision indépendants

2. **Réseau de soutien par les pairs formé**
   - Contrôleurs volontaires formés à la gestion du stress post-incident critique
   - Soutien confidentiel disponible dans les 2 heures suivant toute occurrence significative
   - Protocoles de débriefing structurés suivant les principes CISM
   - Connexion au soutien psychologique professionnel si nécessaire

3. **Outils d'aide à la décision pour les gestionnaires**
   - Cadre d'évaluation standardisé pour l'évaluation des occurrences
   - Critères clairs distinguant les erreurs honnêtes de la négligence
   - Exigences de documentation assurant un traitement cohérent
   - Sessions de calibrage régulières pour assurer une application équitable

4. **Intégration de l'apprentissage organisationnel**
   - Extraction systématique des leçons de sécurité des occurrences
   - Boucle de rétroaction aux rapporteurs sur les actions entreprises
   - Communication régulière des améliorations systémiques réalisées`,
    implementationEn: `**Phase 1: Foundation (Months 1-2)**
1. Establish just culture steering committee with union participation
2. Develop policy documentation with legal review
3. Create decision-making algorithm and supporting tools
4. Draft peer support program requirements

**Phase 2: Peer Support Development (Months 3-4)**
1. Recruit volunteer peer supporters (target: 1 per 20 operational staff)
2. Deliver CISM foundation training (3-day course)
3. Establish peer support activation procedures
4. Create confidentiality agreements and protocols

**Phase 3: Manager Training (Months 5-6)**
1. Develop manager workshop curriculum
2. Deliver training to all operational managers (2-day workshop)
3. Conduct calibration exercises with case studies
4. Establish ongoing consultation support

**Phase 4: Launch and Monitoring (Month 7+)**
1. Communicate program launch to all staff
2. Track utilization and satisfaction metrics
3. Conduct quarterly peer supporter supervision sessions
4. Perform annual program effectiveness review

**Resources Required:**
• Project manager (0.5 FTE for 12 months)
• External CISM training provider
• Legal consultation for policy development
• Peer supporters (time allocation: ~20 hours/year each)`,
    implementationFr: `**Phase 1: Fondation (Mois 1-2)**
1. Établir un comité de pilotage de culture juste avec participation syndicale
2. Développer la documentation politique avec révision juridique
3. Créer l'algorithme de prise de décision et les outils de support
4. Rédiger les exigences du programme de soutien par les pairs

**Phase 2: Développement du soutien par les pairs (Mois 3-4)**
1. Recruter des pairs supporters volontaires (cible: 1 pour 20 agents opérationnels)
2. Dispenser la formation de base CISM (cours de 3 jours)
3. Établir les procédures d'activation du soutien par les pairs
4. Créer des accords et protocoles de confidentialité

**Phase 3: Formation des gestionnaires (Mois 5-6)**
1. Développer le programme d'atelier pour gestionnaires
2. Dispenser la formation à tous les gestionnaires opérationnels (atelier de 2 jours)
3. Mener des exercices de calibrage avec des études de cas
4. Établir un support de consultation continu

**Phase 4: Lancement et surveillance (Mois 7+)**
1. Communiquer le lancement du programme à tout le personnel
2. Suivre les métriques d'utilisation et de satisfaction
3. Mener des sessions de supervision trimestrielles des pairs supporters
4. Effectuer une révision annuelle de l'efficacité du programme`,
    benefitsEn: `**Safety Reporting Impact:**
• 156% increase in voluntary safety reports within first year
• 89% of staff report feeling safe to report without fear
• 40% reduction in time from occurrence to report submission

**Staff Wellbeing:**
• 95% satisfaction rate among peer support recipients
• 67% reduction in post-incident sick leave
• Improved return-to-work outcomes after significant events

**Organizational Learning:**
• 3x increase in systemic safety improvements identified
• Enhanced quality of occurrence investigation reports
• Better identification of latent organizational factors

**Cultural Indicators:**
• 23-point improvement in safety culture survey scores
• Increased trust between operational staff and management
• Recognition as industry leader in just culture implementation`,
    benefitsFr: `**Impact sur les rapports de sécurité:**
• Augmentation de 156% des rapports de sécurité volontaires dans la première année
• 89% du personnel déclare se sentir en sécurité pour signaler sans crainte
• Réduction de 40% du temps entre l'occurrence et la soumission du rapport

**Bien-être du personnel:**
• Taux de satisfaction de 95% parmi les bénéficiaires du soutien par les pairs
• Réduction de 67% des congés maladie post-incident
• Amélioration des résultats de retour au travail après des événements significatifs

**Apprentissage organisationnel:**
• Multiplication par 3 des améliorations systémiques de sécurité identifiées
• Amélioration de la qualité des rapports d'enquête sur les occurrences
• Meilleure identification des facteurs organisationnels latents

**Indicateurs culturels:**
• Amélioration de 23 points des scores de l'enquête sur la culture de sécurité
• Confiance accrue entre le personnel opérationnel et la direction
• Reconnaissance comme leader de l'industrie dans la mise en œuvre de la culture juste`,
    category: "SAFETY_MANAGEMENT",
    auditArea: "SMS",
    tags: ["just-culture", "peer-support", "safety-reporting", "cism", "organizational-culture"],
    status: "PUBLISHED",
  },

  // ==========================================================================
  // OPERATIONAL EFFICIENCY
  // ==========================================================================
  {
    referenceNumber: "BP-2025-0003",
    titleEn: "Dynamic Sectorization Based on Traffic Flow Prediction",
    titleFr: "Sectorisation dynamique basée sur la prédiction des flux de trafic",
    summaryEn: "An innovative approach to airspace management that dynamically adjusts sector configurations based on predicted traffic patterns, optimizing controller workload and reducing delays.",
    summaryFr: "Une approche innovante de la gestion de l'espace aérien qui ajuste dynamiquement les configurations sectorielles en fonction des modèles de trafic prédits, optimisant la charge de travail des contrôleurs et réduisant les retards.",
    descriptionEn: `This best practice introduces a data-driven approach to sector management that moves beyond fixed configurations to dynamic, demand-responsive airspace organization. The system uses advanced traffic flow prediction to anticipate demand patterns and proactively adjust sector boundaries.

**Key Innovation Areas:**

1. **Predictive Traffic Modeling**
   - Machine learning models trained on 3 years of traffic data
   - Integration with airline schedule data and flow management information
   - Weather impact modeling for traffic pattern prediction
   - Real-time model updates based on actual traffic evolution

2. **Dynamic Sector Configuration Engine**
   - Library of pre-approved sector configurations
   - Automated selection based on predicted complexity
   - Smooth transition protocols between configurations
   - Controller notification and handover procedures

3. **Workload Balancing Algorithms**
   - Real-time monitoring of sector complexity
   - Predictive workload indicators (15-60 minute horizon)
   - Automated alerts when intervention thresholds approached
   - Suggested reconfigurations with impact analysis

4. **Performance Monitoring Dashboard**
   - Real-time efficiency metrics
   - Historical comparison and trend analysis
   - Capacity utilization visualization
   - Environmental impact indicators (fuel burn, CO2)

The system has been operational for 18 months and has demonstrated significant improvements in both efficiency and safety metrics.`,
    descriptionFr: `Cette meilleure pratique introduit une approche basée sur les données pour la gestion des secteurs qui va au-delà des configurations fixes vers une organisation de l'espace aérien dynamique et réactive à la demande. Le système utilise la prédiction avancée des flux de trafic pour anticiper les modèles de demande et ajuster proactivement les limites des secteurs.

**Domaines d'innovation clés:**

1. **Modélisation prédictive du trafic**
   - Modèles d'apprentissage automatique entraînés sur 3 ans de données de trafic
   - Intégration avec les données de planification des compagnies aériennes
   - Modélisation de l'impact météorologique sur la prédiction des modèles de trafic
   - Mises à jour du modèle en temps réel basées sur l'évolution réelle du trafic

2. **Moteur de configuration dynamique des secteurs**
   - Bibliothèque de configurations de secteurs pré-approuvées
   - Sélection automatisée basée sur la complexité prédite
   - Protocoles de transition fluide entre les configurations
   - Procédures de notification et de transfert des contrôleurs

3. **Algorithmes d'équilibrage de la charge de travail**
   - Surveillance en temps réel de la complexité du secteur
   - Indicateurs prédictifs de charge de travail (horizon 15-60 minutes)
   - Alertes automatisées lorsque les seuils d'intervention sont approchés
   - Reconfigurations suggérées avec analyse d'impact

4. **Tableau de bord de surveillance des performances**
   - Métriques d'efficacité en temps réel
   - Comparaison historique et analyse des tendances
   - Visualisation de l'utilisation de la capacité
   - Indicateurs d'impact environnemental (consommation de carburant, CO2)`,
    implementationEn: `**Phase 1: Data Foundation (Months 1-4)**
1. Establish data collection infrastructure for traffic patterns
2. Integrate with existing ATM systems (flight data processing, radar)
3. Develop historical database with proper data quality controls
4. Create baseline performance metrics for comparison

**Phase 2: Model Development (Months 5-8)**
1. Develop traffic prediction models with data science team
2. Validate models against historical data (minimum 85% accuracy target)
3. Create sector configuration library with controller input
4. Design workload calculation algorithms

**Phase 3: System Integration (Months 9-12)**
1. Develop decision support interface for supervisors
2. Integrate with controller working positions
3. Implement automated alerting and recommendation system
4. Create performance monitoring dashboard

**Phase 4: Operational Deployment (Months 13-18)**
1. Shadow mode operation with parallel manual decisions
2. Progressive automation with supervisor override capability
3. Full operational deployment with continuous monitoring
4. Optimization based on operational feedback

**Critical Dependencies:**
• High-quality radar and flight plan data
• Flexible sector design approved by regulator
• Controller buy-in and training
• Robust IT infrastructure with redundancy`,
    implementationFr: `**Phase 1: Fondation des données (Mois 1-4)**
1. Établir l'infrastructure de collecte de données pour les modèles de trafic
2. Intégrer avec les systèmes ATM existants (traitement des données de vol, radar)
3. Développer une base de données historique avec des contrôles de qualité appropriés
4. Créer des métriques de performance de référence pour comparaison

**Phase 2: Développement du modèle (Mois 5-8)**
1. Développer des modèles de prédiction du trafic avec l'équipe de science des données
2. Valider les modèles par rapport aux données historiques (objectif de précision minimum 85%)
3. Créer une bibliothèque de configuration de secteurs avec la contribution des contrôleurs
4. Concevoir des algorithmes de calcul de la charge de travail

**Phase 3: Intégration du système (Mois 9-12)**
1. Développer l'interface d'aide à la décision pour les superviseurs
2. Intégrer avec les positions de travail des contrôleurs
3. Mettre en œuvre un système d'alerte et de recommandation automatisé
4. Créer un tableau de bord de surveillance des performances

**Phase 4: Déploiement opérationnel (Mois 13-18)**
1. Opération en mode shadow avec décisions manuelles parallèles
2. Automatisation progressive avec capacité de dérogation du superviseur
3. Déploiement opérationnel complet avec surveillance continue
4. Optimisation basée sur les retours opérationnels`,
    benefitsEn: `**Capacity and Efficiency:**
• 18% increase in sector capacity during peak periods
• 23% reduction in ATFM delays attributed to ATC capacity
• 12% improvement in flight efficiency (reduced track miles)
• 8% reduction in controller overtime hours

**Safety Improvements:**
• 31% reduction in high workload events
• More stable controller workload profiles
• Better anticipation of traffic peaks
• Reduced rushed sector handovers

**Environmental Impact:**
• Estimated 45,000 tonnes CO2 reduction annually
• 15 million liters fuel saved per year
• Reduced holding patterns and vectoring

**Economic Value:**
• €12M annual savings in delay costs for airlines
• ROI achieved within 24 months of full deployment
• Reduced need for airspace expansion investments`,
    benefitsFr: `**Capacité et efficacité:**
• Augmentation de 18% de la capacité du secteur pendant les périodes de pointe
• Réduction de 23% des retards ATFM attribués à la capacité ATC
• Amélioration de 12% de l'efficacité des vols (réduction des miles parcourus)
• Réduction de 8% des heures supplémentaires des contrôleurs

**Améliorations de la sécurité:**
• Réduction de 31% des événements de charge de travail élevée
• Profils de charge de travail des contrôleurs plus stables
• Meilleure anticipation des pics de trafic
• Réduction des transferts de secteur précipités

**Impact environnemental:**
• Estimation de 45 000 tonnes de réduction de CO2 annuellement
• 15 millions de litres de carburant économisés par an
• Réduction des circuits d'attente et du guidage radar

**Valeur économique:**
• 12M€ d'économies annuelles sur les coûts de retard pour les compagnies aériennes
• ROI atteint dans les 24 mois suivant le déploiement complet
• Réduction du besoin d'investissements d'expansion de l'espace aérien`,
    category: "OPERATIONAL_EFFICIENCY",
    auditArea: "ATS",
    tags: ["dynamic-sectorization", "traffic-prediction", "workload-management", "capacity-optimization", "machine-learning"],
    status: "PUBLISHED",
  },

  // ==========================================================================
  // TRAINING & COMPETENCY
  // ==========================================================================
  {
    referenceNumber: "BP-2025-0004",
    titleEn: "Competency-Based Training and Assessment System for ATC",
    titleFr: "Système de formation et d'évaluation basé sur les compétences pour l'ATC",
    summaryEn: "A comprehensive CBTA implementation covering initial training through recurrent assessment, with integrated evidence collection and competency tracking throughout the controller career lifecycle.",
    summaryFr: "Une mise en œuvre complète de la CBTA couvrant la formation initiale jusqu'à l'évaluation récurrente, avec collecte intégrée de preuves et suivi des compétences tout au long du cycle de vie de la carrière du contrôleur.",
    descriptionEn: `This best practice presents a mature implementation of Competency-Based Training and Assessment (CBTA) that aligns with ICAO Doc 10056 guidance while addressing practical implementation challenges faced by ANSPs.

**Framework Components:**

1. **Competency Framework**
   - 9 core competencies aligned with ICAO framework
   - Observable behaviors defined for each competency
   - Performance criteria with clear assessment standards
   - Progression levels from trainee to expert

2. **Training Design**
   - Learning objectives mapped to competencies
   - Mixed methodology (classroom, simulation, OJT)
   - Scenario-based training with realistic complexity
   - Adaptive training paths based on individual progress

3. **Assessment System**
   - Continuous assessment model replacing examinations
   - Multi-source evidence collection (simulator, live, theory)
   - Standardized assessment forms with behavioral anchors
   - Calibration processes for assessor consistency

4. **Digital Portfolio Platform**
   - Individual competency tracking dashboard
   - Evidence upload and verification workflow
   - Competency gap analysis and development planning
   - Regulatory compliance reporting automation

5. **Quality Assurance**
   - Regular assessor calibration sessions
   - Inter-rater reliability monitoring
   - Training effectiveness metrics
   - Continuous improvement based on data analysis

The system has been validated through two full initial training courses and one year of recurrent assessment operations.`,
    descriptionFr: `Cette meilleure pratique présente une mise en œuvre mature de la formation et de l'évaluation basées sur les compétences (CBTA) qui s'aligne sur les directives du Doc 10056 de l'OACI tout en abordant les défis pratiques de mise en œuvre auxquels sont confrontés les ANSP.

**Composantes du cadre:**

1. **Cadre de compétences**
   - 9 compétences de base alignées sur le cadre de l'OACI
   - Comportements observables définis pour chaque compétence
   - Critères de performance avec des normes d'évaluation claires
   - Niveaux de progression du stagiaire à l'expert

2. **Conception de la formation**
   - Objectifs d'apprentissage cartographiés aux compétences
   - Méthodologie mixte (salle de classe, simulation, OJT)
   - Formation basée sur des scénarios avec une complexité réaliste
   - Parcours de formation adaptatifs basés sur les progrès individuels

3. **Système d'évaluation**
   - Modèle d'évaluation continue remplaçant les examens
   - Collecte de preuves multi-sources (simulateur, live, théorie)
   - Formulaires d'évaluation standardisés avec ancres comportementales
   - Processus de calibrage pour la cohérence des évaluateurs

4. **Plateforme de portfolio numérique**
   - Tableau de bord de suivi des compétences individuelles
   - Flux de travail de téléchargement et de vérification des preuves
   - Analyse des écarts de compétences et planification du développement
   - Automatisation des rapports de conformité réglementaire

5. **Assurance qualité**
   - Sessions de calibrage régulières des évaluateurs
   - Surveillance de la fiabilité inter-évaluateurs
   - Métriques d'efficacité de la formation
   - Amélioration continue basée sur l'analyse des données`,
    implementationEn: `**Phase 1: Framework Development (Months 1-6)**
1. Establish competency framework working group
2. Define competencies, behaviors, and performance criteria
3. Create assessment tools and rating scales
4. Develop assessor training curriculum

**Phase 2: Digital Platform (Months 4-9)**
1. Select or develop portfolio management system
2. Configure competency tracking and evidence management
3. Implement reporting and analytics capabilities
4. Integrate with existing training management system

**Phase 3: Assessor Development (Months 7-12)**
1. Deliver assessor training program (5-day course)
2. Conduct supervised assessment practice
3. Implement calibration process and schedule
4. Establish assessor qualification and currency requirements

**Phase 4: Pilot and Rollout (Months 10-18)**
1. Pilot with one training course cohort
2. Collect feedback and refine processes
3. Gradual rollout to all training programs
4. Transition recurrent assessment to CBTA model

**Resource Requirements:**
• Training design specialist (1 FTE)
• IT development/configuration support
• Assessor training time (~40 hours per assessor)
• Ongoing calibration time (~8 hours/quarter per assessor)`,
    implementationFr: `**Phase 1: Développement du cadre (Mois 1-6)**
1. Établir un groupe de travail sur le cadre de compétences
2. Définir les compétences, les comportements et les critères de performance
3. Créer des outils d'évaluation et des échelles de notation
4. Développer le programme de formation des évaluateurs

**Phase 2: Plateforme numérique (Mois 4-9)**
1. Sélectionner ou développer un système de gestion de portfolio
2. Configurer le suivi des compétences et la gestion des preuves
3. Mettre en œuvre les capacités de reporting et d'analyse
4. Intégrer avec le système de gestion de formation existant

**Phase 3: Développement des évaluateurs (Mois 7-12)**
1. Dispenser le programme de formation des évaluateurs (cours de 5 jours)
2. Mener des pratiques d'évaluation supervisées
3. Mettre en œuvre le processus et le calendrier de calibrage
4. Établir les exigences de qualification et de validité des évaluateurs

**Phase 4: Pilote et déploiement (Mois 10-18)**
1. Pilote avec une cohorte de cours de formation
2. Collecter les commentaires et affiner les processus
3. Déploiement progressif vers tous les programmes de formation
4. Transition de l'évaluation récurrente vers le modèle CBTA`,
    benefitsEn: `**Training Effectiveness:**
• 22% reduction in time to competency for ab-initio trainees
• 15% improvement in first-time validation pass rate
• More targeted remedial training based on specific competency gaps
• Better identification of struggling trainees earlier in training

**Assessment Quality:**
• 94% inter-rater reliability score (up from 71% pre-CBTA)
• Richer evidence base for licensing decisions
• More consistent assessment standards across assessors
• Better defensibility of assessment decisions

**Regulatory Compliance:**
• Full alignment with ICAO Doc 10056 recommendations
• Streamlined regulatory audit evidence preparation
• Automated competency currency tracking
• Enhanced oversight authority confidence

**Operational Impact:**
• Better match between training and operational requirements
• Improved identification of refresher training needs
• Data-driven training program improvement
• Enhanced professional development pathways`,
    benefitsFr: `**Efficacité de la formation:**
• Réduction de 22% du temps d'acquisition des compétences pour les stagiaires ab-initio
• Amélioration de 15% du taux de réussite à la première validation
• Formation corrective plus ciblée basée sur des lacunes de compétences spécifiques
• Meilleure identification des stagiaires en difficulté plus tôt dans la formation

**Qualité de l'évaluation:**
• Score de fiabilité inter-évaluateurs de 94% (contre 71% avant CBTA)
• Base de preuves plus riche pour les décisions de licence
• Normes d'évaluation plus cohérentes entre les évaluateurs
• Meilleure défendabilité des décisions d'évaluation

**Conformité réglementaire:**
• Alignement complet avec les recommandations du Doc 10056 de l'OACI
• Préparation simplifiée des preuves d'audit réglementaire
• Suivi automatisé de la validité des compétences
• Confiance accrue des autorités de surveillance

**Impact opérationnel:**
• Meilleure adéquation entre la formation et les exigences opérationnelles
• Amélioration de l'identification des besoins de formation de recyclage
• Amélioration du programme de formation basée sur les données
• Parcours de développement professionnel améliorés`,
    category: "TRAINING_COMPETENCY",
    auditArea: "ATS",
    tags: ["cbta", "competency-framework", "assessment", "digital-portfolio", "training-effectiveness"],
    status: "PUBLISHED",
  },

  // ==========================================================================
  // TECHNOLOGY & INNOVATION
  // ==========================================================================
  {
    referenceNumber: "BP-2025-0005",
    titleEn: "Remote Tower Operations Center for Multiple Airports",
    titleFr: "Centre d'opérations de tour à distance pour plusieurs aéroports",
    summaryEn: "Implementation of a remote tower center providing ATS to multiple regional airports from a centralized location, improving service availability while optimizing resource utilization.",
    summaryFr: "Mise en œuvre d'un centre de tour à distance fournissant des services ATS à plusieurs aéroports régionaux depuis un emplacement centralisé, améliorant la disponibilité des services tout en optimisant l'utilisation des ressources.",
    descriptionEn: `This best practice documents the successful implementation of a Remote Tower Operations Center (RTOC) serving five regional airports from a single location. The project demonstrates how smaller ANSPs can leverage technology to maintain service levels while addressing staffing and cost challenges.

**Technical Architecture:**

1. **Visual Presentation System**
   - 360° camera arrays at each aerodrome
   - High-resolution displays providing out-the-window view
   - Pan-tilt-zoom cameras for detailed inspection
   - Augmented reality overlays showing traffic labels

2. **Sensor Integration**
   - Surface movement radar integration
   - Multilateration for enhanced surveillance
   - Weather sensor data fusion
   - Lighting system status and control

3. **Communications Infrastructure**
   - Dedicated fiber optic links with redundancy
   - Voice communication switching system
   - Backup satellite communication capability
   - Cybersecurity measures per aviation standards

4. **Controller Working Position**
   - Ergonomic design for extended operations
   - Intuitive interface following human factors principles
   - Seamless switching between airports
   - Consistent visual presentation across all airports

**Regulatory Framework:**

The implementation followed a structured safety case approach:
- Detailed hazard identification and risk assessment
- Validation through shadow operations and simulations
- Graduated transition from conventional to remote operations
- Continuous safety monitoring post-implementation`,
    descriptionFr: `Cette meilleure pratique documente la mise en œuvre réussie d'un centre d'opérations de tour à distance (RTOC) desservant cinq aéroports régionaux depuis un seul emplacement. Le projet démontre comment les petits ANSP peuvent tirer parti de la technologie pour maintenir les niveaux de service tout en relevant les défis de dotation en personnel et de coûts.

**Architecture technique:**

1. **Système de présentation visuelle**
   - Matrices de caméras à 360° à chaque aérodrome
   - Écrans haute résolution offrant une vue hors fenêtre
   - Caméras pan-tilt-zoom pour une inspection détaillée
   - Superpositions de réalité augmentée montrant les étiquettes de trafic

2. **Intégration des capteurs**
   - Intégration radar de mouvement de surface
   - Multilatération pour une surveillance améliorée
   - Fusion de données de capteurs météorologiques
   - État et contrôle du système d'éclairage

3. **Infrastructure de communication**
   - Liaisons fibre optique dédiées avec redondance
   - Système de commutation de communication vocale
   - Capacité de communication satellite de secours
   - Mesures de cybersécurité selon les normes aéronautiques

4. **Position de travail du contrôleur**
   - Conception ergonomique pour des opérations prolongées
   - Interface intuitive suivant les principes des facteurs humains
   - Commutation transparente entre les aéroports
   - Présentation visuelle cohérente sur tous les aéroports

**Cadre réglementaire:**

La mise en œuvre a suivi une approche structurée de dossier de sécurité:
- Identification détaillée des dangers et évaluation des risques
- Validation par des opérations parallèles et des simulations
- Transition graduelle des opérations conventionnelles aux opérations à distance
- Surveillance continue de la sécurité post-mise en œuvre`,
    implementationEn: `**Phase 1: Concept and Design (Months 1-8)**
1. Stakeholder engagement and requirements gathering
2. Technology selection and vendor evaluation
3. Concept of operations development
4. Preliminary safety assessment

**Phase 2: Infrastructure Deployment (Months 9-18)**
1. Communication link installation and testing
2. Camera and sensor installation at aerodromes
3. RTOC facility construction and equipment installation
4. System integration and acceptance testing

**Phase 3: Safety Case and Approval (Months 15-24)**
1. Detailed hazard analysis and safety assessment
2. Human factors validation studies
3. Regulatory engagement and approval process
4. Contingency procedures development

**Phase 4: Operational Transition (Months 22-30)**
1. Controller training and qualification (minimum 60 hours)
2. Shadow operations (minimum 3 months per airport)
3. Graduated service provision under supervision
4. Full operational declaration

**Key Success Factors:**
• Early and continuous regulator engagement
• Comprehensive human factors consideration
• Robust contingency planning
• Extensive controller involvement in design`,
    implementationFr: `**Phase 1: Concept et conception (Mois 1-8)**
1. Engagement des parties prenantes et collecte des exigences
2. Sélection de la technologie et évaluation des fournisseurs
3. Développement du concept d'opérations
4. Évaluation préliminaire de la sécurité

**Phase 2: Déploiement de l'infrastructure (Mois 9-18)**
1. Installation et test des liaisons de communication
2. Installation des caméras et des capteurs aux aérodromes
3. Construction des installations RTOC et installation des équipements
4. Intégration du système et tests d'acceptation

**Phase 3: Dossier de sécurité et approbation (Mois 15-24)**
1. Analyse détaillée des dangers et évaluation de la sécurité
2. Études de validation des facteurs humains
3. Engagement réglementaire et processus d'approbation
4. Développement des procédures d'urgence

**Phase 4: Transition opérationnelle (Mois 22-30)**
1. Formation et qualification des contrôleurs (minimum 60 heures)
2. Opérations parallèles (minimum 3 mois par aéroport)
3. Fourniture de service graduée sous supervision
4. Déclaration opérationnelle complète`,
    benefitsEn: `**Service Availability:**
• Extended operating hours at 3 airports (from 12 to 18 hours/day)
• 99.7% service availability achieved
• Reduced impact of single-point-of-failure (staffing)
• Improved resilience through centralized expertise

**Cost Efficiency:**
• 35% reduction in per-airport operating costs
• Optimized controller utilization across airports
• Reduced facility maintenance requirements
• Avoided costs of tower refurbishment at aging facilities

**Safety and Quality:**
• Standardized procedures across all airports
• Enhanced situational awareness through technology
• Better supervision and quality monitoring
• Improved incident response coordination

**Strategic Value:**
• Sustainable service model for low-traffic airports
• Platform for future technology integration
• Demonstrated innovation capability
• Model for regional ANSP cooperation`,
    benefitsFr: `**Disponibilité du service:**
• Heures d'exploitation prolongées à 3 aéroports (de 12 à 18 heures/jour)
• Disponibilité du service de 99,7% atteinte
• Impact réduit des points de défaillance uniques (dotation)
• Résilience améliorée grâce à l'expertise centralisée

**Efficacité des coûts:**
• Réduction de 35% des coûts d'exploitation par aéroport
• Utilisation optimisée des contrôleurs entre les aéroports
• Exigences de maintenance des installations réduites
• Coûts évités de rénovation des tours dans les installations vieillissantes

**Sécurité et qualité:**
• Procédures standardisées dans tous les aéroports
• Conscience situationnelle améliorée grâce à la technologie
• Meilleure supervision et suivi de la qualité
• Coordination améliorée de la réponse aux incidents

**Valeur stratégique:**
• Modèle de service durable pour les aéroports à faible trafic
• Plateforme pour l'intégration future de la technologie
• Capacité d'innovation démontrée
• Modèle de coopération régionale des ANSP`,
    category: "TECHNOLOGY_INNOVATION",
    auditArea: "ATS",
    tags: ["remote-tower", "rtoc", "digital-infrastructure", "service-optimization", "regional-airports"],
    status: "PUBLISHED",
  },

  // ==========================================================================
  // REGULATORY COMPLIANCE
  // ==========================================================================
  {
    referenceNumber: "BP-2025-0006",
    titleEn: "Integrated Compliance Management System with Continuous Monitoring",
    titleFr: "Système de gestion de la conformité intégré avec surveillance continue",
    summaryEn: "A comprehensive digital system for managing regulatory compliance obligations, tracking corrective actions, and providing real-time visibility into compliance status across all operational areas.",
    summaryFr: "Un système numérique complet pour gérer les obligations de conformité réglementaire, suivre les actions correctives et fournir une visibilité en temps réel sur l'état de conformité dans tous les domaines opérationnels.",
    descriptionEn: `This best practice describes an integrated compliance management system that transforms regulatory compliance from a periodic audit activity to a continuous assurance process. The system provides comprehensive visibility into compliance obligations and status.

**System Components:**

1. **Regulatory Requirements Database**
   - Comprehensive catalog of applicable requirements
   - Mapping to organizational responsibilities
   - Version control for regulatory updates
   - Gap analysis against current compliance status

2. **Evidence Management**
   - Centralized repository for compliance evidence
   - Automated evidence collection where possible
   - Document version control and retention management
   - Audit trail for all changes and reviews

3. **Monitoring Dashboard**
   - Real-time compliance status visualization
   - Leading indicators for compliance risk
   - Drill-down capability to specific requirements
   - Trend analysis and historical comparison

4. **Corrective Action Tracking**
   - Structured CAP workflow management
   - Escalation procedures for overdue items
   - Root cause analysis integration
   - Effectiveness verification tracking

5. **Reporting and Analytics**
   - Automated regulatory reporting generation
   - Management reporting dashboards
   - Predictive analytics for compliance risk
   - Benchmarking against industry standards

The system integrates with the organization's SMS and quality management systems to provide a unified view of organizational assurance.`,
    descriptionFr: `Cette meilleure pratique décrit un système intégré de gestion de la conformité qui transforme la conformité réglementaire d'une activité d'audit périodique en un processus d'assurance continue. Le système fournit une visibilité complète sur les obligations et le statut de conformité.

**Composantes du système:**

1. **Base de données des exigences réglementaires**
   - Catalogue complet des exigences applicables
   - Cartographie des responsabilités organisationnelles
   - Contrôle de version pour les mises à jour réglementaires
   - Analyse des écarts par rapport au statut de conformité actuel

2. **Gestion des preuves**
   - Référentiel centralisé pour les preuves de conformité
   - Collecte automatisée des preuves lorsque possible
   - Contrôle de version des documents et gestion de la rétention
   - Piste d'audit pour tous les changements et révisions

3. **Tableau de bord de surveillance**
   - Visualisation du statut de conformité en temps réel
   - Indicateurs avancés de risque de conformité
   - Capacité de détail vers des exigences spécifiques
   - Analyse des tendances et comparaison historique

4. **Suivi des actions correctives**
   - Gestion structurée du flux de travail des PAC
   - Procédures d'escalade pour les éléments en retard
   - Intégration de l'analyse des causes profondes
   - Suivi de la vérification de l'efficacité

5. **Rapports et analyses**
   - Génération automatisée de rapports réglementaires
   - Tableaux de bord de rapports de gestion
   - Analyses prédictives du risque de conformité
   - Benchmarking par rapport aux normes de l'industrie`,
    implementationEn: `**Phase 1: Requirements Mapping (Months 1-4)**
1. Catalog all applicable regulatory requirements
2. Map requirements to organizational functions
3. Identify existing evidence and gaps
4. Define compliance monitoring indicators

**Phase 2: System Implementation (Months 3-8)**
1. Select and configure compliance management platform
2. Import regulatory requirements database
3. Establish evidence collection workflows
4. Configure dashboards and reporting

**Phase 3: Process Integration (Months 6-10)**
1. Integrate with document management system
2. Connect to operational data sources for automated monitoring
3. Establish CAP workflow with SMS integration
4. Train users on system operation

**Phase 4: Continuous Improvement (Ongoing)**
1. Regular review and update of requirements database
2. Refinement of monitoring indicators
3. Enhancement based on audit findings
4. Periodic system effectiveness review

**Technology Considerations:**
• Cloud-based solution for accessibility and scalability
• API integration with existing systems
• Mobile access for field compliance verification
• Robust security and access controls`,
    implementationFr: `**Phase 1: Cartographie des exigences (Mois 1-4)**
1. Cataloguer toutes les exigences réglementaires applicables
2. Cartographier les exigences aux fonctions organisationnelles
3. Identifier les preuves existantes et les lacunes
4. Définir les indicateurs de surveillance de la conformité

**Phase 2: Mise en œuvre du système (Mois 3-8)**
1. Sélectionner et configurer la plateforme de gestion de la conformité
2. Importer la base de données des exigences réglementaires
3. Établir des flux de travail de collecte de preuves
4. Configurer les tableaux de bord et les rapports

**Phase 3: Intégration des processus (Mois 6-10)**
1. Intégrer avec le système de gestion documentaire
2. Connecter aux sources de données opérationnelles pour la surveillance automatisée
3. Établir le flux de travail PAC avec intégration SGS
4. Former les utilisateurs sur l'utilisation du système

**Phase 4: Amélioration continue (En cours)**
1. Révision et mise à jour régulières de la base de données des exigences
2. Affinement des indicateurs de surveillance
3. Amélioration basée sur les constatations d'audit
4. Révision périodique de l'efficacité du système`,
    benefitsEn: `**Regulatory Outcomes:**
• Zero critical findings in last 3 regulatory audits
• 85% reduction in audit preparation effort
• Faster response to regulatory inquiries
• Proactive identification of emerging compliance gaps

**Operational Efficiency:**
• 60% reduction in compliance monitoring effort
• Automated generation of 15 regulatory reports
• Single source of truth for compliance status
• Reduced duplication of compliance activities

**Risk Management:**
• Early warning of compliance deterioration
• Better prioritization of compliance investments
• Reduced likelihood of regulatory sanctions
• Enhanced organizational resilience

**Cultural Impact:**
• Compliance ownership distributed throughout organization
• Increased awareness of regulatory requirements
• Better integration of compliance into daily operations
• Shift from reactive to proactive compliance culture`,
    benefitsFr: `**Résultats réglementaires:**
• Zéro constatation critique lors des 3 derniers audits réglementaires
• Réduction de 85% de l'effort de préparation aux audits
• Réponse plus rapide aux demandes réglementaires
• Identification proactive des lacunes de conformité émergentes

**Efficacité opérationnelle:**
• Réduction de 60% de l'effort de surveillance de la conformité
• Génération automatisée de 15 rapports réglementaires
• Source unique de vérité pour le statut de conformité
• Réduction de la duplication des activités de conformité

**Gestion des risques:**
• Alerte précoce de la détérioration de la conformité
• Meilleure priorisation des investissements de conformité
• Réduction de la probabilité de sanctions réglementaires
• Résilience organisationnelle améliorée

**Impact culturel:**
• Appropriation de la conformité distribuée dans toute l'organisation
• Sensibilisation accrue aux exigences réglementaires
• Meilleure intégration de la conformité dans les opérations quotidiennes
• Passage d'une culture de conformité réactive à proactive`,
    category: "REGULATORY_COMPLIANCE",
    auditArea: "OPS",
    tags: ["compliance-management", "continuous-monitoring", "regulatory-audit", "evidence-management", "cap-tracking"],
    status: "PUBLISHED",
  },

  // ==========================================================================
  // STAKEHOLDER ENGAGEMENT
  // ==========================================================================
  {
    referenceNumber: "BP-2025-0007",
    titleEn: "Collaborative Decision Making Framework for Airport Operations",
    titleFr: "Cadre de prise de décision collaborative pour les opérations aéroportuaires",
    summaryEn: "A structured CDM framework enabling real-time information sharing and collaborative planning between ANSP, airport operator, airlines, and ground handlers to optimize airport performance.",
    summaryFr: "Un cadre CDM structuré permettant le partage d'informations en temps réel et la planification collaborative entre l'ANSP, l'opérateur aéroportuaire, les compagnies aériennes et les assistants en escale pour optimiser les performances de l'aéroport.",
    descriptionEn: `This best practice establishes a comprehensive Airport Collaborative Decision Making (A-CDM) framework that brings together all airport stakeholders to improve operational predictability and efficiency.

**Framework Elements:**

1. **Information Sharing Platform**
   - Real-time flight progress information
   - Milestone-based tracking (TOBT, TSAT, TTOT, etc.)
   - Resource status visibility (gates, stands, runways)
   - Weather and operational alerts

2. **Collaborative Planning Processes**
   - Daily planning meetings with all stakeholders
   - Variable taxi time calculation
   - Departure sequencing optimization
   - Collaborative delay management

3. **Performance Metrics**
   - Shared KPIs agreed by all partners
   - Real-time performance dashboards
   - Regular performance review meetings
   - Continuous improvement initiatives

4. **Governance Structure**
   - CDM steering committee with senior representation
   - Working groups for specific operational areas
   - Clear escalation procedures
   - Service level agreements between parties

5. **Technology Integration**
   - Standardized data exchange formats (SWIM)
   - Integration with airline systems
   - Mobile applications for operational staff
   - Automated milestone detection

The framework follows EUROCONTROL A-CDM guidelines and has achieved full implementation status.`,
    descriptionFr: `Cette meilleure pratique établit un cadre complet de prise de décision collaborative à l'aéroport (A-CDM) qui rassemble toutes les parties prenantes de l'aéroport pour améliorer la prévisibilité et l'efficacité opérationnelles.

**Éléments du cadre:**

1. **Plateforme de partage d'informations**
   - Informations sur la progression des vols en temps réel
   - Suivi basé sur les jalons (TOBT, TSAT, TTOT, etc.)
   - Visibilité de l'état des ressources (portes, postes, pistes)
   - Alertes météorologiques et opérationnelles

2. **Processus de planification collaborative**
   - Réunions de planification quotidiennes avec toutes les parties prenantes
   - Calcul du temps de roulage variable
   - Optimisation du séquencement des départs
   - Gestion collaborative des retards

3. **Métriques de performance**
   - KPI partagés convenus par tous les partenaires
   - Tableaux de bord de performance en temps réel
   - Réunions régulières d'examen des performances
   - Initiatives d'amélioration continue

4. **Structure de gouvernance**
   - Comité de pilotage CDM avec représentation senior
   - Groupes de travail pour des domaines opérationnels spécifiques
   - Procédures d'escalade claires
   - Accords de niveau de service entre les parties

5. **Intégration technologique**
   - Formats d'échange de données standardisés (SWIM)
   - Intégration avec les systèmes des compagnies aériennes
   - Applications mobiles pour le personnel opérationnel
   - Détection automatisée des jalons`,
    implementationEn: `**Phase 1: Stakeholder Engagement (Months 1-4)**
1. Identify and engage all relevant stakeholders
2. Establish governance structure and terms of reference
3. Agree shared objectives and success metrics
4. Secure commitment and resource allocation

**Phase 2: Process Design (Months 3-8)**
1. Map current processes and identify integration points
2. Design collaborative processes and information flows
3. Define milestones and data exchange requirements
4. Develop operating procedures and responsibilities

**Phase 3: Technology Implementation (Months 6-14)**
1. Implement information sharing platform
2. Integrate stakeholder systems
3. Deploy user interfaces and mobile applications
4. Test end-to-end data flows

**Phase 4: Operational Deployment (Months 12-18)**
1. Staff training across all organizations
2. Phased rollout of CDM processes
3. Performance monitoring and refinement
4. Full operational capability declaration

**Critical Success Factors:**
• Strong executive sponsorship from all parties
• Willingness to share operational data
• Trust-building through early quick wins
• Sustained commitment to collaborative culture`,
    implementationFr: `**Phase 1: Engagement des parties prenantes (Mois 1-4)**
1. Identifier et engager toutes les parties prenantes pertinentes
2. Établir la structure de gouvernance et les termes de référence
3. Convenir des objectifs partagés et des métriques de succès
4. Sécuriser l'engagement et l'allocation des ressources

**Phase 2: Conception des processus (Mois 3-8)**
1. Cartographier les processus actuels et identifier les points d'intégration
2. Concevoir des processus collaboratifs et des flux d'informations
3. Définir les jalons et les exigences d'échange de données
4. Développer les procédures opérationnelles et les responsabilités

**Phase 3: Mise en œuvre technologique (Mois 6-14)**
1. Mettre en œuvre la plateforme de partage d'informations
2. Intégrer les systèmes des parties prenantes
3. Déployer les interfaces utilisateur et les applications mobiles
4. Tester les flux de données de bout en bout

**Phase 4: Déploiement opérationnel (Mois 12-18)**
1. Formation du personnel dans toutes les organisations
2. Déploiement progressif des processus CDM
3. Surveillance des performances et affinement
4. Déclaration de capacité opérationnelle complète`,
    benefitsEn: `**Operational Performance:**
• 12% improvement in runway throughput
• 18% reduction in taxi-out times
• 25% improvement in departure punctuality
• 40% reduction in tactical slot swaps

**Predictability:**
• 35% improvement in take-off time predictability
• Better resource planning for all stakeholders
• Reduced passenger uncertainty
• More reliable connection planning

**Environmental:**
• 8% reduction in ground fuel burn
• Reduced APU usage through better turn planning
• Fewer missed approaches due to sequencing
• Lower noise impact through optimized departure routes

**Stakeholder Relations:**
• Improved trust and collaboration
• Clearer accountability for delays
• Better understanding of interdependencies
• Foundation for future optimization initiatives`,
    benefitsFr: `**Performance opérationnelle:**
• Amélioration de 12% du débit de piste
• Réduction de 18% des temps de roulage
• Amélioration de 25% de la ponctualité des départs
• Réduction de 40% des échanges de créneaux tactiques

**Prévisibilité:**
• Amélioration de 35% de la prévisibilité de l'heure de décollage
• Meilleure planification des ressources pour toutes les parties prenantes
• Incertitude réduite pour les passagers
• Planification des correspondances plus fiable

**Environnemental:**
• Réduction de 8% de la consommation de carburant au sol
• Utilisation réduite de l'APU grâce à une meilleure planification des rotations
• Moins d'approches interrompues grâce au séquencement
• Impact sonore réduit grâce aux routes de départ optimisées

**Relations avec les parties prenantes:**
• Confiance et collaboration améliorées
• Responsabilité plus claire des retards
• Meilleure compréhension des interdépendances
• Fondation pour les futures initiatives d'optimisation`,
    category: "STAKEHOLDER_ENGAGEMENT",
    auditArea: "ATS",
    tags: ["a-cdm", "collaborative-planning", "information-sharing", "airport-operations", "performance-management"],
    status: "PUBLISHED",
  },

  // ==========================================================================
  // ADDITIONAL PRACTICES (DRAFT/SUBMITTED for variety)
  // ==========================================================================
  {
    referenceNumber: "BP-2025-0008",
    titleEn: "Automated NOTAM Management and Pilot Briefing System",
    titleFr: "Système automatisé de gestion des NOTAM et de briefing des pilotes",
    summaryEn: "An intelligent system for NOTAM creation, validation, and distribution that reduces errors and improves the relevance of flight crew briefings.",
    summaryFr: "Un système intelligent de création, validation et distribution des NOTAM qui réduit les erreurs et améliore la pertinence des briefings des équipages.",
    descriptionEn: `This practice introduces an automated NOTAM management system that addresses the well-known challenges of NOTAM quality and overload. The system uses natural language processing to validate NOTAM content and intelligent filtering to provide relevant briefings.

Key features include:
• Automated format and content validation
• Duplicate and conflict detection
• Route-specific NOTAM filtering for pilots
• Plain language summaries alongside coded text
• Mobile-friendly briefing delivery`,
    descriptionFr: `Cette pratique introduit un système automatisé de gestion des NOTAM qui répond aux défis bien connus de la qualité et de la surcharge des NOTAM. Le système utilise le traitement du langage naturel pour valider le contenu des NOTAM et un filtrage intelligent pour fournir des briefings pertinents.

Les fonctionnalités clés comprennent:
• Validation automatisée du format et du contenu
• Détection des doublons et des conflits
• Filtrage des NOTAM spécifiques à la route pour les pilotes
• Résumés en langage clair accompagnant le texte codé
• Livraison de briefings adaptée aux mobiles`,
    implementationEn: `Implementation requires integration with existing AIM systems and airline operational systems. A phased approach over 12 months is recommended, starting with internal NOTAM quality improvements before expanding to external briefing distribution.`,
    implementationFr: `La mise en œuvre nécessite une intégration avec les systèmes AIM existants et les systèmes opérationnels des compagnies aériennes. Une approche progressive sur 12 mois est recommandée, en commençant par les améliorations internes de la qualité des NOTAM avant d'étendre à la distribution externe des briefings.`,
    benefitsEn: `Expected benefits include 50% reduction in NOTAM-related pilot queries, improved compliance with ICAO format requirements, and better flight crew situational awareness.`,
    benefitsFr: `Les avantages attendus comprennent une réduction de 50% des demandes des pilotes liées aux NOTAM, une meilleure conformité aux exigences de format de l'OACI et une meilleure conscience situationnelle des équipages.`,
    category: "TECHNOLOGY_INNOVATION",
    auditArea: "AIM",
    tags: ["notam", "automation", "pilot-briefing", "natural-language-processing", "aim"],
    status: "SUBMITTED",
  },

  {
    referenceNumber: "BP-2025-0009",
    titleEn: "Cross-Border Contingency Coordination Procedures",
    titleFr: "Procédures de coordination des contingences transfrontalières",
    summaryEn: "Standardized procedures and communication protocols for managing contingency situations that affect multiple adjacent FIRs.",
    summaryFr: "Procédures standardisées et protocoles de communication pour gérer les situations d'urgence affectant plusieurs FIR adjacentes.",
    descriptionEn: `This practice establishes mutual support arrangements between neighboring ANSPs for contingency situations such as system failures, major weather events, or security incidents. The framework includes pre-agreed procedures, regular joint exercises, and shared communication channels.`,
    descriptionFr: `Cette pratique établit des arrangements de soutien mutuel entre les ANSP voisins pour les situations d'urgence telles que les pannes de système, les événements météorologiques majeurs ou les incidents de sécurité. Le cadre comprend des procédures pré-convenues, des exercices conjoints réguliers et des canaux de communication partagés.`,
    implementationEn: `Implementation involves bilateral agreements with adjacent ANSPs, development of joint procedures, and regular exercises. Timeline is typically 18-24 months for full implementation.`,
    implementationFr: `La mise en œuvre implique des accords bilatéraux avec les ANSP adjacents, le développement de procédures conjointes et des exercices réguliers. Le délai est généralement de 18 à 24 mois pour une mise en œuvre complète.`,
    benefitsEn: `Enhanced resilience, reduced impact of major disruptions, and improved regional cooperation.`,
    benefitsFr: `Résilience améliorée, impact réduit des perturbations majeures et coopération régionale améliorée.`,
    category: "OPERATIONAL_EFFICIENCY",
    auditArea: "ATS",
    tags: ["contingency", "cross-border", "coordination", "resilience", "regional-cooperation"],
    status: "DRAFT",
  },

  {
    referenceNumber: "BP-2025-0010",
    titleEn: "Environmental Performance Monitoring and Reporting System",
    titleFr: "Système de surveillance et de rapport de performance environnementale",
    summaryEn: "A comprehensive system for tracking, analyzing, and reporting the environmental impact of ATM operations, supporting both internal improvement and regulatory reporting.",
    summaryFr: "Un système complet de suivi, d'analyse et de rapport de l'impact environnemental des opérations ATM, soutenant l'amélioration interne et les rapports réglementaires.",
    descriptionEn: `This practice implements systematic monitoring of environmental performance indicators including fuel efficiency, emissions, and noise impact. The system calculates actual versus optimal trajectories and identifies improvement opportunities.`,
    descriptionFr: `Cette pratique met en œuvre une surveillance systématique des indicateurs de performance environnementale, notamment l'efficacité énergétique, les émissions et l'impact sonore. Le système calcule les trajectoires réelles par rapport aux trajectoires optimales et identifie les opportunités d'amélioration.`,
    implementationEn: `Requires integration with flight data processing systems and development of environmental calculation algorithms. Implementation timeline is 12-15 months.`,
    implementationFr: `Nécessite une intégration avec les systèmes de traitement des données de vol et le développement d'algorithmes de calcul environnemental. Le délai de mise en œuvre est de 12 à 15 mois.`,
    benefitsEn: `Supports CORSIA compliance, identifies efficiency improvements, and demonstrates environmental responsibility to stakeholders.`,
    benefitsFr: `Soutient la conformité CORSIA, identifie les améliorations d'efficacité et démontre la responsabilité environnementale aux parties prenantes.`,
    category: "REGULATORY_COMPLIANCE",
    auditArea: "OPS",
    tags: ["environment", "emissions", "sustainability", "corsia", "performance-monitoring"],
    status: "PUBLISHED",
  },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

async function seedBestPractices() {
  console.log("🌱 Starting Best Practices seed...\n");

  // Get organizations for assignment
  const organizations = await prisma.organization.findMany({
    where: { membershipStatus: "ACTIVE" },
    take: 10,
  });

  if (organizations.length === 0) {
    console.error("❌ No active organizations found. Please seed organizations first.");
    return;
  }

  // Get users for submitter/reviewer assignment
  const coordinators = await prisma.user.findMany({
    where: {
      role: { in: ["PROGRAMME_COORDINATOR", "SUPER_ADMIN"] },
      isActive: true,
    },
    take: 5,
  });

  const staffUsers = await prisma.user.findMany({
    where: {
      role: { in: ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"] },
      isActive: true,
      organizationId: { not: null },
    },
    take: 10,
  });

  if (coordinators.length === 0 || staffUsers.length === 0) {
    console.error("❌ Insufficient users found. Please seed users first.");
    return;
  }

  console.log(`📊 Found ${organizations.length} organizations and ${staffUsers.length + coordinators.length} users\n`);

  let created = 0;
  let skipped = 0;

  for (const bp of bestPractices) {
    // Check if already exists
    const existing = await prisma.bestPractice.findFirst({
      where: { referenceNumber: bp.referenceNumber },
    });

    if (existing) {
      console.log(`⏭️  Skipping ${bp.referenceNumber} (already exists)`);
      skipped++;
      continue;
    }

    // Randomly assign organization and users
    const org = organizations[Math.floor(Math.random() * organizations.length)];
    const submitter = staffUsers.find((u) => u.organizationId === org.id) || staffUsers[0];
    const reviewer = coordinators[Math.floor(Math.random() * coordinators.length)];

    // Calculate dates based on status
    const now = new Date();
    const submittedAt = bp.status !== "DRAFT" ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : null;
    const reviewedAt = ["APPROVED", "PUBLISHED"].includes(bp.status)
      ? new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
      : null;
    const publishedAt = bp.status === "PUBLISHED"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : null;

    try {
      await prisma.bestPractice.create({
        data: {
          referenceNumber: bp.referenceNumber,
          titleEn: bp.titleEn,
          titleFr: bp.titleFr,
          summaryEn: bp.summaryEn,
          summaryFr: bp.summaryFr,
          descriptionEn: bp.descriptionEn,
          descriptionFr: bp.descriptionFr,
          implementationEn: bp.implementationEn,
          implementationFr: bp.implementationFr,
          benefitsEn: bp.benefitsEn,
          benefitsFr: bp.benefitsFr,
          category: bp.category,
          auditArea: bp.auditArea,
          tags: bp.tags,
          status: bp.status,
          organizationId: org.id,
          submittedById: submitter.id,
          submittedAt,
          reviewedById: reviewedAt ? reviewer.id : null,
          reviewedAt,
          publishedAt,
          viewCount: bp.status === "PUBLISHED" ? Math.floor(Math.random() * 500) + 50 : 0,
        },
      });

      console.log(`✅ Created ${bp.referenceNumber}: ${bp.titleEn.substring(0, 50)}...`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${bp.referenceNumber}:`, error);
    }
  }

  console.log(`\n📈 Seed complete: ${created} created, ${skipped} skipped\n`);

  // Create some sample adoptions
  if (created > 0) {
    console.log("🔗 Creating sample adoptions...\n");

    const publishedPractices = await prisma.bestPractice.findMany({
      where: { status: "PUBLISHED" },
      take: 5,
    });

    for (const practice of publishedPractices) {
      // Random 1-3 adoptions per practice
      const numAdoptions = Math.floor(Math.random() * 3) + 1;
      const availableOrgs = organizations.filter((o) => o.id !== practice.organizationId);

      for (let i = 0; i < Math.min(numAdoptions, availableOrgs.length); i++) {
        const adoptingOrg = availableOrgs[i];
        const adopter = staffUsers.find((u) => u.organizationId === adoptingOrg.id);

        if (adopter) {
          try {
            await prisma.bestPracticeAdoption.create({
              data: {
                bestPracticeId: practice.id,
                organizationId: adoptingOrg.id,
                adoptedById: adopter.id,
                implementationStatus: ["PLANNED", "IN_PROGRESS", "COMPLETED"][Math.floor(Math.random() * 3)],
                implementationNotes: "Adapting to our local context and regulatory requirements.",
              },
            });
            console.log(`  ✅ ${adoptingOrg.nameEn} adopted ${practice.referenceNumber}`);
          } catch {
            // Skip if already adopted
          }
        }
      }
    }
  }

  console.log("\n🎉 Best Practices seeding complete!\n");
}

// =============================================================================
// MAIN
// =============================================================================

seedBestPractices()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
