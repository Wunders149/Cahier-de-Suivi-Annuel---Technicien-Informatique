import jsPDF from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  CahierSuiviData,
  FicheIntervention,
  IncidentReseau,
  IncidentSecurite,
  ItemMaintenance,
  RapportMensuel,
  TacheJournal,
} from '../types/it-tracker';

export const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export interface MonthlyActivitySnapshot {
  moisIndex: number;
  nomMois: string;
  annee: number;
  monthPrefix: string;
  rapport: RapportMensuel;
  taches: TacheJournal[];
  tachesTerminees: number;
  totalTaskMinutes: number;
  interventions: FicheIntervention[];
  interventionsTerminees: number;
  interventionsEnCours: number;
  tauxResolution: number;
  avgInterventionMinutes: number;
  maintenances: ItemMaintenance[];
  reseauIncidents: IncidentReseau[];
  incidentsSecurite: IncidentSecurite[];
}

export function getMonthPrefix(annee: number, moisIndex: number): string {
  const mm = moisIndex < 10 ? `0${moisIndex}` : `${moisIndex}`;
  return `${annee}-${mm}`;
}

export function getMonthlyActivitySnapshot(
  data: CahierSuiviData,
  moisIndex: number
): MonthlyActivitySnapshot {
  const annee = data.generalInfo.anneeReference || new Date().getFullYear();
  const nomMois = MONTH_NAMES[moisIndex - 1] || `Mois ${moisIndex}`;
  const monthPrefix = getMonthPrefix(annee, moisIndex);

  const rapport =
    data.rapportsMensuels.find((r) => r.moisIndex === moisIndex) || {
      moisIndex,
      nomMois,
      annee,
      totalInterventions: 0,
      incidentsResolus: 0,
      incidentsEnCours: 0,
      tauxResolutionFCR: 100,
      dureeMoyenneResolutionMin: 0,
      travauxRealises: '',
      maintenanceEffectuee: '',
      problemesRecurrents: '',
      difficultesRencontrees: '',
      besoinsMaterielsLogiciels: '',
      recommandationsTechnicien: '',
      activitesMoisSuivant: '',
      valideParHierarchie: false,
    };

  const taches = (data.journalTaches || []).filter((t) =>
    t.date?.startsWith(monthPrefix)
  );
  const tachesTerminees = taches.filter((t) => t.statut === 'Terminé').length;
  const totalTaskMinutes = taches.reduce(
    (sum, t) => sum + (t.dureeReelleMin || 0),
    0
  );

  const interventions = (data.interventions || []).filter((i) =>
    i.dateReception?.startsWith(monthPrefix)
  );
  const interventionsTerminees = interventions.filter(
    (i) => i.resultat === 'Résolu'
  ).length;
  const interventionsEnCours = interventions.length - interventionsTerminees;
  const tauxResolution =
    interventions.length > 0
      ? Math.round((interventionsTerminees / interventions.length) * 100)
      : rapport.tauxResolutionFCR || 100;
  const avgInterventionMinutes =
    interventions.length > 0
      ? Math.round(
          interventions.reduce((sum, i) => sum + (i.tempsConsacreMin || 0), 0) /
            interventions.length
        )
      : rapport.dureeMoyenneResolutionMin || 0;

  const maintenances = (data.maintenances || []).filter((m) =>
    m.dernierControle?.startsWith(monthPrefix)
  );
  const reseauIncidents = (data.reseauIncidents || []).filter((inc) =>
    inc.dateHeure?.startsWith(monthPrefix)
  );
  const incidentsSecurite = (data.incidentsSecurite || []).filter((sec) =>
    sec.dateHeure?.startsWith(monthPrefix)
  );

  return {
    moisIndex,
    nomMois,
    annee,
    monthPrefix,
    rapport,
    taches,
    tachesTerminees,
    totalTaskMinutes,
    interventions,
    interventionsTerminees,
    interventionsEnCours,
    tauxResolution,
    avgInterventionMinutes,
    maintenances,
    reseauIncidents,
    incidentsSecurite,
  };
}

/**
 * Génère et télécharge un Cahier de Suivi Mensuel complet au format PDF A4
 */
export function generateMonthlyPdf(data: CahierSuiviData, moisIndex: number): void {
  const snap = getMonthlyActivitySnapshot(data, moisIndex);
  const { generalInfo } = data;
  const { rapport } = snap;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  let pageCount = 1;

  const techName =
    `${generalInfo.prenomTechnicien || ''} ${generalInfo.nomTechnicien || ''}`.trim() ||
    'Technicien Informatique';
  const companyName = generalInfo.entreprise || 'Direction des Systèmes d\'Information';
  const managerName = generalInfo.responsableHierarchique || 'Responsable Hiérarchique (RSI)';

  const addHeaderFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${companyName} | Cahier de Suivi Mensuel — ${snap.nomMois} ${snap.annee}`,
      margin,
      10
    );
    doc.text(techName, pageWidth - margin, 10, { align: 'right' });
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, 12, pageWidth - margin, 12);

    doc.line(margin, 285, pageWidth - margin, 285);
    doc.text(
      `Livrable Mensuel Officiel · ${snap.nomMois} ${snap.annee}`,
      margin,
      290
    );
    doc.text(`Page ${pageCount}`, pageWidth - margin, 290, { align: 'right' });
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > 276) {
      doc.addPage();
      pageCount += 1;
      addHeaderFooter();
      y = 20;
    }
  };

  addHeaderFooter();

  // Bannière d'en-tête
  doc.setFillColor(15, 42, 74);
  doc.roundedRect(margin, 18, contentWidth, 28, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(147, 197, 253);
  doc.text('CAHIER DE SUIVI MENSUEL DU TECHNICIEN INFORMATIQUE', margin + 5, 26);

  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(`${snap.nomMois.toUpperCase()} ${snap.annee}`, margin + 5, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Statut livraison : ${rapport.statutLivraison || 'Prêt à livrer'}${
      rapport.dateLivraison ? ` (${rapport.dateLivraison})` : ''
    }`,
    margin + 5,
    42
  );

  y = 53;

  // Fiche d'identification
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Entreprise / Organisation :', margin + 4, y + 6);
  doc.text('Technicien titulaire :', margin + 4, y + 12.5);
  doc.text('Destinataire (Hiérarchie) :', margin + 4, y + 19);

  doc.setFont('helvetica', 'normal');
  doc.text(`${companyName} (${generalInfo.departement || 'DSI'})`, margin + 52, y + 6);
  doc.text(`${techName} — ${generalInfo.fonction || 'Technicien IT'}`, margin + 52, y + 12.5);
  doc.text(
    `${rapport.destinataireLivraison || managerName}`,
    margin + 52,
    y + 19
  );

  y += 31;

  // Indicateurs clés du mois
  const totalIntervDisplay = Math.max(snap.interventions.length, rapport.totalInterventions || 0);
  const resolvedDisplay = Math.max(snap.interventionsTerminees, rapport.incidentsResolus || 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 42, 74);
  doc.text('1. SYNTHÈSE & INDICATEURS DU MOIS', margin, y);
  y += 4;

  const boxW = (contentWidth - 9) / 4;
  const kpis = [
    { label: 'Interventions', val: `${totalIntervDisplay}`, sub: `${resolvedDisplay} terminées` },
    { label: 'Taux Résolution', val: `${snap.tauxResolution}%`, sub: `MTTR ${snap.avgInterventionMinutes} min` },
    { label: 'Journal Quotidien', val: `${snap.taches.length}`, sub: `${snap.tachesTerminees} terminées` },
    { label: 'Maintenances', val: `${snap.maintenances.length}`, sub: `${snap.reseauIncidents.length} inc. réseau` },
  ];

  kpis.forEach((k, idx) => {
    const bx = margin + idx * (boxW + 3);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(bx, y, boxW, 18, 1.5, 1.5, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(k.label.toUpperCase(), bx + boxW / 2, y + 5, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(k.val, bx + boxW / 2, y + 11.5, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(k.sub, bx + boxW / 2, y + 15.8, { align: 'center' });
  });

  y += 25;

  // Sections narratives du rapport mensuel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 42, 74);
  doc.text('2. COMPTE-RENDU D\'ACTIVITÉ MENSUEL', margin, y);
  y += 5;

  const narrativeItems: Array<[string, string]> = [
    ['Travaux & Projets réalisés', rapport.travauxRealises],
    ['Maintenance préventive effectuée', rapport.maintenanceEffectuee],
    ['Problèmes récurrents identifiés', rapport.problemesRecurrents],
    ['Difficultés techniques / organisationnelles', rapport.difficultesRencontrees],
    ['Besoins matériels & logiciels', rapport.besoinsMaterielsLogiciels],
    ['Recommandations du technicien', rapport.recommandationsTechnicien],
    ['Priorités pour le mois suivant (M+1)', rapport.activitesMoisSuivant],
  ];

  narrativeItems.forEach(([title, content]) => {
    const body = content?.trim() || 'Aucune observation particulière consignée pour cette rubrique.';
    const lines = doc.splitTextToSize(body, contentWidth - 6);
    const blockH = 8 + lines.length * 4.2;
    ensureSpace(blockH + 3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(title, margin, y + 3.5);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y + 5, contentWidth, lines.length * 4.2 + 4, 1, 1, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(lines, margin + 3, y + 9);

    y += blockH + 4;
  });

  // 3. Interventions IT du mois
  ensureSpace(24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 42, 74);
  doc.text(
    `3. INTERVENTIONS TECHNIQUES DU MOIS (${snap.interventions.length})`,
    margin,
    y + 2
  );
  y += 7;

  if (snap.interventions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Aucune fiche d'intervention enregistrée sur ${snap.nomMois} ${snap.annee}.`, margin, y + 2);
    y += 9;
  } else {
    snap.interventions.forEach((it) => {
      const desc = doc.splitTextToSize(
        `${it.descriptionPanne} — Solution : ${it.solutionAppliquee || 'En attente'}`,
        contentWidth - 6
      );
      const itemH = 9 + desc.length * 3.8;
      ensureSpace(itemH + 2);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, itemH, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 42, 74);
      doc.text(
        `${it.numeroReference} | ${it.dateReception} | ${it.nomDemandeur} (${it.serviceDemandeur})`,
        margin + 3,
        y + 4.5
      );
      doc.text(
        `${it.resultat} (${it.tempsConsacreMin} min)`,
        pageWidth - margin - 3,
        y + 4.5,
        { align: 'right' }
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(desc, margin + 3, y + 9);

      y += itemH + 2.5;
    });
  }

  // 4. Tâches du Journal Quotidien du mois
  ensureSpace(22);
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 42, 74);
  doc.text(
    `4. JOURNAL QUOTIDIEN DU MOIS (${snap.taches.length} tâches · ${Math.round((snap.totalTaskMinutes / 60) * 10) / 10} h)`,
    margin,
    y
  );
  y += 5;

  if (snap.taches.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Aucune activité journalière consignée sur ${snap.nomMois} ${snap.annee}.`, margin, y + 2);
    y += 9;
  } else {
    snap.taches.forEach((t) => {
      const line = `${t.date} (${t.heure}) · ${t.tache} [${t.categorie}] — ${t.statut} (${t.dureeReelleMin} min)`;
      const wrapped = doc.splitTextToSize(line, contentWidth - 4);
      ensureSpace(wrapped.length * 4 + 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(wrapped, margin + 2, y + 3);
      y += wrapped.length * 4 + 1.5;
    });
  }

  // 5. Cadre de livraison & Visa Hiérarchique
  ensureSpace(38);
  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(15, 42, 74);
  doc.roundedRect(margin, y, contentWidth, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 42, 74);
  doc.text('BORDEREAU DE LIVRAISON & VISA HIÉRARCHIQUE', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Livré par : ${techName}   |   Date de remise : ${
      rapport.dateLivraison || new Date().toISOString().split('T')[0]
    }`,
    margin + 4,
    y + 13
  );
  doc.text(
    `Destinataire : ${rapport.destinataireLivraison || managerName}   |   Validation RSI : ${
      rapport.valideParHierarchie ? `Validé le ${rapport.dateValidation}` : 'En attente de visa'
    }`,
    margin + 4,
    y + 19
  );
  if (rapport.noteLivraison) {
    doc.text(`Note de remise : ${rapport.noteLivraison}`, margin + 4, y + 25);
  }

  const safeMonth = snap.nomMois.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  doc.save(`Cahier_Suivi_Mensuel_${safeMonth}_${snap.annee}.pdf`);
}

/**
 * Génère et télécharge un Cahier de Suivi Mensuel éditable au format Word (.docx)
 */
export async function generateMonthlyDocx(
  data: CahierSuiviData,
  moisIndex: number
): Promise<void> {
  const snap = getMonthlyActivitySnapshot(data, moisIndex);
  const { generalInfo } = data;
  const { rapport } = snap;

  const techName =
    `${generalInfo.prenomTechnicien || ''} ${generalInfo.nomTechnicien || ''}`.trim() ||
    'Technicien Informatique';
  const companyName = generalInfo.entreprise || 'Entreprise / Organisation';
  const managerName = generalInfo.responsableHierarchique || 'Responsable Hiérarchique (RSI)';

  const totalIntervDisplay = Math.max(snap.interventions.length, rapport.totalInterventions || 0);
  const resolvedDisplay = Math.max(snap.interventionsTerminees, rapport.incidentsResolus || 0);

  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
  };

  const makeHeaderCell = (text: string) =>
    new TableCell({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })],
        }),
      ],
      shading: { type: ShadingType.CLEAR, fill: '0F2A4A' },
      borders: cellBorders,
    });

  const makeTextCell = (text: string, bold = false) =>
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: text || '—', bold, color: '1E293B', size: 18 })],
        }),
      ],
      borders: cellBorders,
    });

  const narrativeBlocks: Paragraph[] = [];
  const sections: Array<[string, string]> = [
    ['1. Travaux & Projets réalisés', rapport.travauxRealises],
    ['2. Maintenance préventive effectuée', rapport.maintenanceEffectuee],
    ['3. Problèmes récurrents identifiés', rapport.problemesRecurrents],
    ['4. Difficultés rencontrées', rapport.difficultesRencontrees],
    ['5. Besoins matériels & logiciels', rapport.besoinsMaterielsLogiciels],
    ['6. Recommandations à la hiérarchie', rapport.recommandationsTechnicien],
    ['7. Activités prévues mois suivant (M+1)', rapport.activitesMoisSuivant],
  ];

  sections.forEach(([title, content]) => {
    narrativeBlocks.push(
      new Paragraph({
        spacing: { before: 180, after: 60 },
        children: [new TextRun({ text: title, bold: true, color: '1E3A8A', size: 22 })],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: content?.trim() || 'Aucune observation particulière consignée pour ce mois.',
            color: '334155',
            size: 20,
          }),
        ],
      })
    );
  });

  const interventionTableRows: TableRow[] = [
    new TableRow({
      children: [
        makeHeaderCell('Référence'),
        makeHeaderCell('Date'),
        makeHeaderCell('Demandeur / Service'),
        makeHeaderCell('Problème & Solution'),
        makeHeaderCell('Résultat'),
      ],
    }),
  ];

  if (snap.interventions.length === 0) {
    interventionTableRows.push(
      new TableRow({
        children: [
          makeTextCell('—'),
          makeTextCell('—'),
          makeTextCell('—'),
          makeTextCell(`Aucune fiche d'intervention enregistrée pour ${snap.nomMois} ${snap.annee}.`),
          makeTextCell('—'),
        ],
      })
    );
  } else {
    snap.interventions.forEach((it) => {
      interventionTableRows.push(
        new TableRow({
          children: [
            makeTextCell(it.numeroReference, true),
            makeTextCell(it.dateReception),
            makeTextCell(`${it.nomDemandeur} (${it.serviceDemandeur})`),
            makeTextCell(`${it.descriptionPanne} → ${it.solutionAppliquee || 'En cours'}`),
            makeTextCell(`${it.resultat} (${it.tempsConsacreMin}m)`),
          ],
        })
      );
    });
  }

  const taskTableRows: TableRow[] = [
    new TableRow({
      children: [
        makeHeaderCell('Date'),
        makeHeaderCell('Activité / Tâche'),
        makeHeaderCell('Catégorie'),
        makeHeaderCell('Durée'),
        makeHeaderCell('Statut'),
      ],
    }),
  ];

  if (snap.taches.length === 0) {
    taskTableRows.push(
      new TableRow({
        children: [
          makeTextCell('—'),
          makeTextCell(`Aucune tâche journalière enregistrée pour ${snap.nomMois} ${snap.annee}.`),
          makeTextCell('—'),
          makeTextCell('—'),
          makeTextCell('—'),
        ],
      })
    );
  } else {
    snap.taches.forEach((t) => {
      taskTableRows.push(
        new TableRow({
          children: [
            makeTextCell(`${t.date} ${t.heure}`),
            makeTextCell(t.tache, true),
            makeTextCell(t.categorie),
            makeTextCell(`${t.dureeReelleMin} min`),
            makeTextCell(t.statut),
          ],
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${companyName} — Cahier Mensuel ${snap.nomMois} ${snap.annee}`,
                    color: '64748B',
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Document de Suivi Mensuel DSI · Page ', color: '64748B', size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: '64748B', size: 16 }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'CAHIER DE SUIVI MENSUEL DU TECHNICIEN INFORMATIQUE',
                bold: true,
                color: '0F2A4A',
                size: 30,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `${snap.nomMois.toUpperCase()} ${snap.annee} — ${companyName}`,
                bold: true,
                color: '0284C7',
                size: 24,
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  makeTextCell('Technicien titulaire', true),
                  makeTextCell(`${techName} (${generalInfo.fonction || 'Technicien IT'})`),
                ],
              }),
              new TableRow({
                children: [
                  makeTextCell('Destinataire / Hiérarchie', true),
                  makeTextCell(rapport.destinataireLivraison || managerName),
                ],
              }),
              new TableRow({
                children: [
                  makeTextCell('Statut de livraison', true),
                  makeTextCell(
                    `${rapport.statutLivraison || 'Prêt à livrer'}${
                      rapport.dateLivraison ? ` — remis le ${rapport.dateLivraison}` : ''
                    }`
                  ),
                ],
              }),
              new TableRow({
                children: [
                  makeTextCell('Synthèse chiffrée', true),
                  makeTextCell(
                    `${totalIntervDisplay} interventions (${resolvedDisplay} terminées) · ${snap.taches.length} tâches journal · Taux FCR ${snap.tauxResolution}%`
                  ),
                ],
              }),
            ],
          }),

          ...narrativeBlocks,

          new Paragraph({
            spacing: { before: 280, after: 120 },
            children: [
              new TextRun({
                text: `REGISTRE DES INTERVENTIONS (${snap.interventions.length})`,
                bold: true,
                color: '0F2A4A',
                size: 24,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: interventionTableRows,
          }),

          new Paragraph({
            spacing: { before: 280, after: 120 },
            children: [
              new TextRun({
                text: `JOURNAL QUOTIDIEN DU MOIS (${snap.taches.length})`,
                bold: true,
                color: '0F2A4A',
                size: 24,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: taskTableRows,
          }),

          new Paragraph({
            spacing: { before: 320, after: 80 },
            children: [
              new TextRun({
                text: 'VISA DE LIVRAISON & VALIDATION HIÉRARCHIQUE',
                bold: true,
                color: '0F2A4A',
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Technicien : ${techName} | Destinataire : ${
                  rapport.destinataireLivraison || managerName
                } | Statut RSI : ${
                  rapport.valideParHierarchie ? `Validé le ${rapport.dateValidation}` : 'En attente de signature'
                }`,
                size: 20,
                color: '334155',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeMonth = snap.nomMois.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  saveAs(blob, `Cahier_Suivi_Mensuel_${safeMonth}_${snap.annee}.docx`);
}
