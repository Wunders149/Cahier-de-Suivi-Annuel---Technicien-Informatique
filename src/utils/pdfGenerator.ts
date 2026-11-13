import jsPDF from 'jspdf';
import { CahierSuiviData } from '../types/it-tracker';

/**
 * Déclenche l'aperçu avant impression et l'impression directe en PDF A4 vectoriel haute fidélité
 */
export function triggerPrintToPdf(): void {
  window.print();
}

/**
 * Génère et télécharge directement un fichier PDF A4 complet et structuré
 */
export function generateDirectPdf(data: CahierSuiviData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { generalInfo, objectifsAnnuels, journalTaches, interventions, maintenances, bilanAnnuel } = data;

  const margin = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const primaryColor = [15, 42, 74]; // #0F2A4A Bleu marine
  const secondaryColor = [30, 58, 138]; // #1E3A8A Bleu
  const accentColor = [2, 132, 199]; // #0284C7 Cyan
  const lightBg = [241, 245, 249]; // #F1F5F9 Gris clair
  const textColor = [30, 41, 59]; // #1E293B

  const entrepriseLabel = generalInfo.entreprise?.trim() || 'Cahier de Suivi IT';
  const techFullName = `${generalInfo.prenomTechnicien} ${generalInfo.nomTechnicien}`.trim() || 'Technicien IT';
  const responsableLabel = generalInfo.responsableHierarchique
    ? `${generalInfo.responsableHierarchique}${generalInfo.titreResponsable ? ` (${generalInfo.titreResponsable})` : ''}`
    : generalInfo.titreResponsable || 'Responsable SI';

  function addHeader(sectionTitle: string) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${entrepriseLabel} | DSI — Cahier de Suivi Annuel ${generalInfo.anneeReference}`, margin, 10);
    doc.text(sectionTitle, pageWidth - margin, 10, { align: 'right' });
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, 12, pageWidth - margin, 12);
  }

  function addFooter(currentPage: number) {
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, 285, pageWidth - margin, 285);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Document Interne Confidentiel — Technicien Informatique', margin, 290);
    doc.text(`Page ${currentPage}`, pageWidth - margin, 290, { align: 'right' });
  }

  // --- PAGE 1: PAGE DE GARDE ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, 20, contentWidth, 3, 'F');

  doc.setFontSize(11);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('DIRECTION DES SYSTÈMES D\'INFORMATION', pageWidth / 2, 35, { align: 'center' });

  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CAHIER DE SUIVI ANNUEL', pageWidth / 2, 50, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('DU TECHNICIEN INFORMATIQUE', pageWidth / 2, 60, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`EXERCICE ANNUEL ${generalInfo.anneeReference}`, pageWidth / 2, 70, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Outil de Pilotage Opérationnel, Traçabilité des Interventions & Maintenance du SI', pageWidth / 2, 78, { align: 'center' });

  // Cadre des informations
  y = 95;
  const rows = [
    ['Année de référence', `${generalInfo.anneeReference}`],
    ['Nom & Prénom', techFullName],
    ['Fonction', generalInfo.fonction || '—'],
    ['Département / Service', generalInfo.departement || '—'],
    ['Entreprise / Organisation', generalInfo.entreprise || '—'],
    ['Responsable hiérarchique', responsableLabel],
    ['Date de prise de fonction', generalInfo.datePriseFonction || '—'],
    ['Coordonnées professionnelles', generalInfo.telephonePro || generalInfo.emailPro ? `${generalInfo.telephonePro || '—'} | ${generalInfo.emailPro || '—'}` : '—'],
    ['Localisation atelier IT', generalInfo.localisationBureau || '—'],
  ];

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y - 5, contentWidth, 92, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y - 5, contentWidth, 92, 2, 2, 'S');

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(label, margin + 4, y + 3);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const splitVal = doc.splitTextToSize(String(value || '—'), 110);
    doc.text(splitVal, margin + 62, y + 3);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 2, y + 6, margin + contentWidth - 2, y + 6);
    y += 9.5;
  });

  // Charte d'engagement
  y = 205;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'F');
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('ENGAGEMENT PROFESSIONNEL & CONFIDENTIALITÉ', margin + 5, y + 7);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const engagementText =
    'Le technicien soussigné certifie consigner avec rigueur, honnêteté et exactitude l\'ensemble des travaux, maintenances et incidents techniques réalisés sur le système d\'information de l\'organisation. Il garantit la stricte confidentialité des données et l\'absence totale de mots de passe en clair.';
  doc.text(doc.splitTextToSize(engagementText, contentWidth - 10), margin + 5, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Fait le ${generalInfo.datePriseFonction || '—'} — Visa Technicien : [Lu et Approuvé]`, margin + 5, y + 36);

  addFooter(1);

  // --- PAGE 2: PLANIFICATION & OBJECTIFS ---
  doc.addPage();
  addHeader('Planification Annuelle & Objectifs');
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('2. PLANIFICATION ANNUELLE & OBJECTIFS STRATÉGIQUES', margin, y);
  y += 8;

  if (objectifsAnnuels.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Aucun objectif annuel enregistré pour cet exercice.', margin, y + 4);
  } else {
    objectifsAnnuels.slice(0, 5).forEach((obj) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, y, contentWidth, 40, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 40, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${obj.id} : ${obj.titre}`, margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`Missions : ${obj.missionsPrevue || '—'}`, margin + 4, y + 12);
      doc.text(`Résultats attendus : ${obj.resultatsAttendus || '—'}`, margin + 4, y + 18);
      doc.text(`KPI : ${obj.kpi || '—'} | Échéance : ${obj.echeance || '—'} | Priorité : ${obj.priorite}`, margin + 4, y + 24);

      // Barre d'avancement
      const avancementPct = Math.max(0, Math.min(100, obj.avancement || 0));
      doc.text(`Avancement : ${avancementPct}% (${obj.statut})`, margin + 4, y + 32);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(margin + 60, y + 28, 70, 5, 1, 1, 'F');
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.roundedRect(margin + 60, y + 28, (70 * avancementPct) / 100, 5, 1, 1, 'F');

      y += 46;
    });
  }

  addFooter(2);

  // --- PAGE 3: JOURNAL QUOTIDIEN ---
  doc.addPage();
  addHeader('Journal Quotidien des Travaux');
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('3. GESTION QUOTIDIENNE DES ACTIVITÉS (EXTRAIT DU JOURNAL)', margin, y);
  y += 8;

  if (journalTaches.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Aucune tâche consignée dans le journal quotidien.', margin, y + 4);
  } else {
    journalTaches.slice(0, 6).forEach((task) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, y, contentWidth, 34, 1.5, 1.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 34, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`[${task.date} ${task.heure}] - ${task.tache}`, margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`Catégorie : ${task.categorie} | Priorité : ${task.priorite} | Durée : ${task.dureeReelleMin} min | Statut : ${task.statut}`, margin + 4, y + 12);
      doc.text(`Description : ${task.description || '—'}`, margin + 4, y + 18);
      doc.text(`Résultat : ${task.resultat || '—'}`, margin + 4, y + 24);
      doc.text(`Observations : ${task.observations || '—'}`, margin + 4, y + 30);

      y += 38;
    });
  }

  addFooter(3);

  // --- PAGE 4: FICHES D'INTERVENTION ---
  doc.addPage();
  addHeader('Registre des Interventions');
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. REGISTRE DES INTERVENTIONS INFORMATIQUES', margin, y);
  y += 8;

  if (interventions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Aucune fiche d\'intervention enregistrée.', margin, y + 4);
  } else {
    interventions.slice(0, 3).forEach((it) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(margin, y, contentWidth, 68, 2, 2, 'F');
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.roundedRect(margin, y, contentWidth, 68, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`Fiche N° ${it.numeroReference} — ${it.nomDemandeur} (${it.serviceDemandeur})`, margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`Reçu le : ${it.dateReception} à ${it.heureReception} | Équipement : ${it.equipementConcerne} | Prio : ${it.priorite}`, margin + 4, y + 13);
      doc.text(`Panne signalée : ${it.descriptionPanne || '—'}`, margin + 4, y + 20);
      doc.text(`Diagnostic technique : ${it.diagnosticTechnique || '—'}`, margin + 4, y + 28);
      doc.text(`Cause identifiée : ${it.causeIdentifiee || '—'}`, margin + 4, y + 36);
      doc.text(`Solution appliquée : ${it.solutionAppliquee || '—'}`, margin + 4, y + 44);
      doc.text(`Matériel/Outils utilisés : ${it.materielLogicielUtilise || '—'} | Temps passé : ${it.tempsConsacreMin} min`, margin + 4, y + 52);
      doc.text(`Résultat : ${it.resultat} | Validation demandeur : ${it.validationDemandeur ? 'OUI (' + (it.dateValidation || 'Validé') + ')' : 'NON'}`, margin + 4, y + 60);

      y += 76;
    });
  }

  addFooter(4);

  // --- PAGE 5: MAINTENANCE & SYNTHÈSE ANNUELLE ---
  doc.addPage();
  addHeader('Maintenance Préventive & Bilan Annuel');
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('5. MAINTENANCE PRÉVENTIVE & SYNTHÈSE DE FIN D\'EXERCICE', margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Checklist des 11 Domaines de Maintenance Contrôlés :', margin, y);
  y += 6;

  if (maintenances.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Aucun contrôle de maintenance enregistré.', margin + 4, y);
    y += 8;
  } else {
    maintenances.slice(0, 8).forEach((m) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`${m.valide ? '[X]' : '[ ]'} ${m.categorie} (${m.typeMaintenance}) : ${m.tacheControle} - Statut : ${m.statut}`, margin + 4, y);
      y += 5;
    });
  }

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Bilan Consolidé de l'Exercice ${bilanAnnuel.annee}`, margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const synthSplit = doc.splitTextToSize(
    bilanAnnuel.syntheseGenerale?.trim() || 'Aucune synthèse renseignée.',
    contentWidth
  );
  doc.text(synthSplit, margin, y);
  y += synthSplit.length * 4 + 4;

  doc.setFont('helvetica', 'bold');
  doc.text(`Taux d'objectifs annuels atteints : ${bilanAnnuel.objectifsAtteintsTaux || 0}%`, margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  const appreciationSplit = doc.splitTextToSize(
    `Appréciation du RSI : ${bilanAnnuel.appreciationRsi?.trim() || 'En attente'}`,
    contentWidth
  );
  doc.text(appreciationSplit, margin, y);
  y += appreciationSplit.length * 4 + 6;

  let currentPageNumber = 5;
  if (y > 250) {
    addFooter(currentPageNumber);
    doc.addPage();
    currentPageNumber += 1;
    addHeader('Signatures & Clôture');
    y = 24;
  }

  // Signatures
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 26, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 26, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Signature Technicien Informatique (${bilanAnnuel.signatureTechnicienDate || '—'}) :`, margin + 6, y + 8);
  doc.setFont('helvetica', 'italic');
  doc.text(`${techFullName} [${bilanAnnuel.signatureTechnicienDate ? 'Signé' : 'En attente'}]`, margin + 6, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.text(`Validation Hiérarchique RSI (${bilanAnnuel.signatureRsiDate || '—'}) :`, margin + 95, y + 8);
  doc.setFont('helvetica', 'italic');
  doc.text(`${generalInfo.responsableHierarchique || 'Responsable SI'} [${bilanAnnuel.signatureRsiDate ? 'Approuvé' : 'En attente'}]`, margin + 95, y + 16);

  addFooter(currentPageNumber);

  doc.save(`cahier_suivi_annuel_technicien_it_${generalInfo.anneeReference}.pdf`);
}
