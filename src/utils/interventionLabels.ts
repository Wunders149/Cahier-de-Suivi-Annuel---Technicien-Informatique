import { FicheIntervention, NatureIntervention } from '../types/it-tracker';

export interface InterventionVocabulary {
  nature: NatureIntervention;
  domainPrefix: string;
  summaryHeading: string;
  equipmentsRowLabel: string;
  descriptionLabel: string;
  descriptionCardTitle: string;
  descriptionPlaceholder: string;
  diagnosticLabel: string;
  diagnosticPlaceholder: string;
  causeLabel: string;
  causePlaceholder: string;
  solutionLabel: string;
  solutionCardTitle: string;
  solutionPlaceholder: string;
  materialLabel: string;
  materialPlaceholder: string;
  analysisHeading: string;
  analysisFieldLabel: string;
  analysisPlaceholder: string;
  equipmentsHeading: string;
  equipmentsSubtitle: string;
  equipmentItemPrefix: string;
  equipmentDiagLabel: string;
  equipmentDiagPlaceholder: string;
  equipmentActionsLabel: string;
  equipmentActionsPlaceholder: string;
  comparisonHeading: string;
  comparisonEquipCol: string;
  comparisonDiagCol: string;
  comparisonOpsCol: string;
  comparisonMatCol: string;
  recommandationsTitle: string;
  recommandationsPlaceholder: string;
  defaultDiagnostic: string;
  defaultCause: string;
  defaultSolution: string;
}

export function getInterventionVocabulary(
  nature?: NatureIntervention
): InterventionVocabulary {
  if (nature === 'Déploiement / Installation') {
    return {
      nature: 'Déploiement / Installation',
      domainPrefix: 'DÉPLOIEMENT & MISE EN SERVICE',
      summaryHeading: "1. Synthèse de l'Opération",
      equipmentsRowLabel: 'Unités / Équipements concernés',
      descriptionLabel: "Objet & Synthèse de l'opération *",
      descriptionCardTitle: "Objet & Synthèse de l'opération",
      descriptionPlaceholder:
        "Contexte opérationnel, objectif du déploiement et systèmes mis en service...",
      diagnosticLabel: 'Préparation & Enregistrement',
      diagnosticPlaceholder:
        'Enregistrement numéros de série, prérequis réseau/alimentation, paramétrage portail...',
      causeLabel: "Contexte / Zone d'implantation",
      causePlaceholder:
        "Contraintes d'environnement, emplacement retenu, couverture ou périmètre...",
      solutionLabel: 'Travaux & Mise en service réalisés',
      solutionCardTitle: 'Travaux & Mise en service réalisés',
      solutionPlaceholder:
        'Installation physique, raccordement, tests de validation et mise en production...',
      materialLabel: 'Matériel, Alimentation & Fixations',
      materialPlaceholder:
        'Ex: Balises SPOT Trace, câble 5V étanche, piles AAA Lithium, visserie inox...',
      analysisHeading: '2. Étapes Techniques Réalisées',
      analysisFieldLabel: 'Étapes techniques détaillées (optionnel)',
      analysisPlaceholder:
        "1. Préparation et enregistrement :\n• ...\n\n2. Installation physique :\n• ...\n\n3. Tests et validation :\n• ...",
      equipmentsHeading: '3. Détails par Unité / Équipement',
      equipmentsSubtitle:
        'Détaillez chaque unité, navire, poste ou site équipé lors de ce déploiement.',
      equipmentItemPrefix: 'Unité',
      equipmentDiagLabel: 'Emplacement, pose & fixation',
      equipmentDiagPlaceholder:
        'Emplacement de pose, mode de fixation, contraintes techniques...',
      equipmentActionsLabel: 'Opérations & tests effectués',
      equipmentActionsPlaceholder:
        'Une étape ou test validé par ligne (ex: Test acquisition GPS validé, Remontée plateforme OK)...',
      comparisonHeading: '4. Récapitulatif Comparatif par Unité',
      comparisonEquipCol: 'Unité / Équipement',
      comparisonDiagCol: 'Emplacement & Pose',
      comparisonOpsCol: 'Opérations & Tests',
      comparisonMatCol: 'Alimentation / Matériel',
      recommandationsTitle: "Recommandations d'Exploitation & Entretien",
      recommandationsPlaceholder:
        "Ex:\n• Vérification visuelle : contrôler les voyants avant chaque utilisation.\n• Entretien : nettoyer le boîtier et vérifier l'étanchéité des connectiques.",
      defaultDiagnostic: 'Préparation et enregistrement préalables effectués.',
      defaultCause: 'Déploiement planifié et mise en service opérationnelle.',
      defaultSolution: 'Installation, configuration et tests de validation conformes.',
    };
  }

  if (nature === 'Maintenance / Contrôle') {
    return {
      nature: 'Maintenance / Contrôle',
      domainPrefix: 'MAINTENANCE PRÉVENTIVE & CONTRÔLE',
      summaryHeading: '1. Synthèse de la Maintenance',
      equipmentsRowLabel: 'Équipements contrôlés',
      descriptionLabel: 'Objet du contrôle / Maintenance *',
      descriptionCardTitle: 'Objet de la maintenance',
      descriptionPlaceholder:
        'Périmètre contrôlé, périodicité et objectif de vérification...',
      diagnosticLabel: "Constats d'inspection",
      diagnosticPlaceholder:
        'Mesures relevées, état matériel/logiciel, alertes observées...',
      causeLabel: 'Points de vigilance identifiés',
      causePlaceholder:
        'Usure, saturation, firmware obsolète ou RAS...',
      solutionLabel: 'Actions préventives & correctives',
      solutionCardTitle: 'Actions de maintenance réalisées',
      solutionPlaceholder:
        'Mises à jour, nettoyage, tests de redondance, réglages effectués...',
      materialLabel: 'Outillage & Consommables utilisés',
      materialPlaceholder: 'Ex: Kit nettoyage, multimètre, logiciel de diagnostic...',
      analysisHeading: '2. Protocole & Observations Techniques',
      analysisFieldLabel: 'Protocole et observations détaillées (optionnel)',
      analysisPlaceholder:
        'Détail des points vérifiés, mesures effectuées et conclusions techniques...',
      equipmentsHeading: '3. Détail par Équipement Contrôlé',
      equipmentsSubtitle:
        'Ajoutez des sous-fiches si la maintenance couvre plusieurs équipements.',
      equipmentItemPrefix: 'Contrôle',
      equipmentDiagLabel: 'État constaté',
      equipmentDiagPlaceholder: 'État physique, voyants, performances relevées...',
      equipmentActionsLabel: 'Opérations de maintenance',
      equipmentActionsPlaceholder:
        'Une action par ligne (ex: Nettoyage ventilateurs, Mise à jour firmware)...',
      comparisonHeading: '4. Récapitulatif Comparatif des Contrôles',
      comparisonEquipCol: 'Équipement',
      comparisonDiagCol: 'État constaté',
      comparisonOpsCol: 'Opérations effectuées',
      comparisonMatCol: 'Matériel / Pièces',
      recommandationsTitle: "Recommandations d'Exploitation & Suivi",
      recommandationsPlaceholder:
        'Préconisations de suivi, prochain contrôle planifié ou pièces à prévoir...',
      defaultDiagnostic: 'Inspection complète réalisée sans anomalie majeure.',
      defaultCause: 'Maintenance périodique préventive.',
      defaultSolution: 'Contrôles et opérations de maintenance validés.',
    };
  }

  return {
    nature: 'Incident / Dépannage',
    domainPrefix: 'MAINTENANCE & SUPPORT',
    summaryHeading: "1. Synthèse Générale de l'Incident",
    equipmentsRowLabel: 'Équipements concernés',
    descriptionLabel: 'Description de la panne ou de la demande *',
    descriptionCardTitle: 'Problème / Panne signalée',
    descriptionPlaceholder: 'Symptômes constatés et contexte de la panne...',
    diagnosticLabel: 'Diagnostic technique',
    diagnosticPlaceholder: 'Tests réalisés, constatations...',
    causeLabel: 'Cause identifiée',
    causePlaceholder: 'Origine du dysfonctionnement...',
    solutionLabel: 'Solution corrective appliquée',
    solutionCardTitle: 'Solution corrective appliquée',
    solutionPlaceholder:
      'Actions de réparation, remplacement ou paramétrage...',
    materialLabel: 'Matériel / Outils utilisés',
    materialPlaceholder: 'Ex: Câble RJ45, multimètre, poste de diagnostic...',
    analysisHeading: '2. Analyse Technique et Cause Racine',
    analysisFieldLabel: 'Analyse technique et cause racine approfondie (optionnel)',
    analysisPlaceholder:
      "Explication détaillée de l'inspection et de la cause racine pour le rapport...",
    equipmentsHeading: '3. Rapport Détaillé par Équipement',
    equipmentsSubtitle:
      "Ajoutez des sous-rapports si l'intervention concerne plusieurs équipements distincts.",
    equipmentItemPrefix: 'Incident',
    equipmentDiagLabel: 'Constat et diagnostic',
    equipmentDiagPlaceholder: 'Constat et diagnostic sur cet équipement...',
    equipmentActionsLabel: 'Actions correctives appliquées',
    equipmentActionsPlaceholder:
      'Actions correctives appliquées (une ligne par action)...',
    comparisonHeading: '4. Récapitulatif Comparatif des Interventions',
    comparisonEquipCol: 'Équipement',
    comparisonDiagCol: 'Diagnostic',
    comparisonOpsCol: 'Opérations réalisées',
    comparisonMatCol: 'Matériel spécifique',
    recommandationsTitle: "Recommandations d'Exploitation & Prévention",
    recommandationsPlaceholder:
      "Conseils d'utilisation, contrôles préventifs ou actions pour éviter la récurrence...",
    defaultDiagnostic: 'Diagnostic préliminaire conforme.',
    defaultCause: 'Dysfonctionnement identifié.',
    defaultSolution: 'Résolution standard appliquée.',
  };
}

export function formatInterventionStatusLabel(
  resultat: FicheIntervention['resultat'],
  nature?: NatureIntervention
): string {
  if (nature === 'Déploiement / Installation' && resultat === 'Résolu') {
    return 'Opérationnel / Terminé';
  }
  return resultat;
}
