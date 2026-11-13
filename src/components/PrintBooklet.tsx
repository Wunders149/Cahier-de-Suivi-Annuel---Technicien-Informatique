import React from 'react';
import { CahierSuiviData } from '../types/it-tracker';
import { Printer, Download, ArrowLeft, FileText } from 'lucide-react';

interface PrintBookletProps {
  data: CahierSuiviData;
  onBack: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  onDownloadDocx: () => void;
}

export const PrintBooklet: React.FC<PrintBookletProps> = ({
  data,
  onBack,
  onPrint,
  onDownloadPdf,
  onDownloadDocx,
}) => {
  const {
    generalInfo,
    objectifsAnnuels,
    jalonsCalendrier,
    journalTaches,
    interventions,
    maintenances,
    reseauEquipements,
    reseauIncidents,
    reseauTestsDebit,
    parcEquipements,
    logicielsLicences,
    sauvegardes,
    incidentsSecurite,
    consommables,
    demandesAchat,
    rapportsMensuels,
    bilansTrimestriels,
    bilanAnnuel,
  } = data;

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="bg-slate-100 min-h-screen py-6 print:py-0 print:bg-white text-slate-900 font-sans">
      {/* Barre d'action supérieure (cachée à l'impression) */}
      <div className="max-w-5xl mx-auto px-4 mb-6 print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-300 shadow-sm sticky top-2 z-50">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'application interactive</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadDocx}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
          >
            <FileText className="w-4 h-4" />
            <span>Télécharger Word (.docx)</span>
          </button>
          <button
            onClick={onDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger PDF (.pdf)</span>
          </button>
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition"
          >
            <Printer className="w-4 h-4 text-blue-300" />
            <span>Lancer l'Impression A4 (Ctrl+P)</span>
          </button>
        </div>
      </div>

      {/* DOCUMENT A4 COMPLET */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:max-w-none print:w-full print:mx-0 p-8 sm:p-12 print:p-6 space-y-12">
        {/* --- PAGE 1: PAGE DE GARDE A4 --- */}
        <div className="min-h-[260mm] flex flex-col justify-between border-4 border-slate-900 p-8 relative print:border-4">
          <div className="text-center space-y-4">
            <div className="text-xs uppercase font-extrabold tracking-widest text-blue-900 border-b-2 border-blue-900 pb-2">
              {(generalInfo.entreprise || 'CAHIER DE SUIVI IT').toUpperCase()} • DIRECTION DES SYSTÈMES D'INFORMATION
            </div>
            <div className="py-8">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2">
                REGISTRE OFFICIEL INTERNE DE GESTION IT
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
                CAHIER DE SUIVI ANNUEL
              </h1>
              <h2 className="text-xl sm:text-2xl font-bold text-blue-800">
                DU TECHNICIEN INFORMATIQUE
              </h2>
              <div className="mt-4 inline-block px-4 py-1.5 bg-slate-900 text-white font-extrabold text-base tracking-wider rounded">
                EXERCICE ANNUEL {generalInfo.anneeReference}
              </div>
            </div>
          </div>

          {/* Grille d'identification du titulaire */}
          <div className="my-6 border-2 border-slate-900 divide-y-2 divide-slate-900 text-xs bg-slate-50/50">
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 p-2.5">
              <span className="font-bold text-slate-700">Nom & Prénom du Technicien :</span>
              <span className="col-span-2 font-bold text-slate-950 text-sm">
                {`${generalInfo.prenomTechnicien} ${generalInfo.nomTechnicien}`.trim() || '—'}
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 p-2.5">
              <span className="font-bold text-slate-700">Fonction :</span>
              <span className="col-span-2 text-slate-900 font-semibold">{generalInfo.fonction || '—'}</span>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 p-2.5">
              <span className="font-bold text-slate-700">Département / Service :</span>
              <span className="col-span-2 text-slate-900">{generalInfo.departement || '—'}</span>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 p-2.5">
              <span className="font-bold text-slate-700">Entreprise / Organisation :</span>
              <span className="col-span-2 font-bold text-slate-900">{generalInfo.entreprise || '—'}</span>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 p-2.5">
              <span className="font-bold text-slate-700">Responsable hiérarchique :</span>
              <span className="col-span-2 text-slate-900">
                {generalInfo.responsableHierarchique
                  ? `${generalInfo.responsableHierarchique}${generalInfo.titreResponsable ? ` (${generalInfo.titreResponsable})` : ''}`
                  : generalInfo.titreResponsable || '—'}
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 p-2.5">
              <span className="font-bold text-slate-700">Date de prise de fonction :</span>
              <span className="col-span-2 text-slate-900">{generalInfo.datePriseFonction || '—'}</span>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 p-2.5">
              <span className="font-bold text-slate-700">Coordonnées professionnelles :</span>
              <span className="col-span-2 text-slate-900">
                {generalInfo.telephonePro || generalInfo.emailPro
                  ? `Tél : ${generalInfo.telephonePro || '—'} | Email : ${generalInfo.emailPro || '—'}`
                  : '—'}
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 p-2.5">
              <span className="font-bold text-slate-700">Localisation bureau / atelier :</span>
              <span className="col-span-2 text-slate-900">{generalInfo.localisationBureau || '—'}</span>
            </div>
          </div>

          {/* Charte & engagement */}
          <div className="space-y-4 pt-4 border-t-2 border-slate-900 text-xs">
            <div className="border border-slate-300 p-3 rounded bg-white">
              <strong className="block text-slate-900 font-bold mb-1 uppercase text-[11px]">
                Charte d'engagement & Déontologie de l'administrateur système et support :
              </strong>
              <p className="text-slate-600 text-[11px] leading-relaxed italic">
                « Le technicien informatique s'engage à assurer avec diligence, neutralité et rigueur la maintenance et l'assistance des utilisateurs. Il veille scrupuleusement au secret professionnel, à la protection des données à caractère personnel (RGPD) et applique la Politique de Sécurité des Systèmes d'Information (PSSI). Aucun mot de passe en clair n'est consigné dans ce cahier. »
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center text-xs pt-2">
              <div className="border border-slate-400 p-3 h-20 flex flex-col justify-between">
                <span className="font-bold text-slate-600">Signature du Technicien IT</span>
                <span className="text-slate-400 italic text-[10px]">[Visa et Date]</span>
              </div>
              <div className="border border-slate-400 p-3 h-20 flex flex-col justify-between">
                <span className="font-bold text-slate-600">Visa du Responsable SI (RSI)</span>
                <span className="text-slate-400 italic text-[10px]">[Approbation et Date]</span>
              </div>
            </div>
          </div>
        </div>

        {/* SAUT DE PAGE */}
        <div className="page-break" style={{ pageBreakBefore: 'always' }} />

        {/* SOMMAIRE AUTOMATIQUE */}
        <div className="space-y-6 pt-4">
          <div className="border-b-2 border-slate-900 pb-2">
            <h2 className="text-2xl font-black text-slate-900">SOMMAIRE & TABLE DES MATIÈRES</h2>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Structure du cahier de suivi annuel</span>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-800">
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>1. INFORMATIONS GÉNÉRALES & CHARTE DÉONTOLOGIQUE</span>
              <span className="font-bold">Page 01</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>2. PLANIFICATION ANNUELLE & CALENDRIER DES JALONS (JANV. À DÉC.)</span>
              <span className="font-bold">Page 03</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>3. GESTION QUOTIDIENNE DES ACTIVITÉS (JOURNAL DE BORD)</span>
              <span className="font-bold">Page 05</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>4. REGISTRE DES INTERVENTIONS INFORMATIQUES & FICHES DÉTAILLÉES</span>
              <span className="font-bold">Page 08</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>5. MAINTENANCE PRÉVENTIVE ET CORRECTIVE (11 DOMAINES D'INFRASTRUCTURE)</span>
              <span className="font-bold">Page 12</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>6. GESTION DES RÉSEAUX INFORMATIQUES & REGISTRE DES INCIDENTS RÉSEAU</span>
              <span className="font-bold">Page 16</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>7. GESTION DU PARC INFORMATIQUE (INVENTAIRE CMDB & ÉQUIPEMENTS)</span>
              <span className="font-bold">Page 19</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>8. GESTION DES LOGICIELS, LICENCES & GESTION DES DROITS D'ACCÈS</span>
              <span className="font-bold">Page 22</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>9. SAUVEGARDE ET SÉCURITÉ INFORMATIQUE (RÈGLE 3-2-1 & TESTS PRA)</span>
              <span className="font-bold">Page 24</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>10. GESTION DES CONSOMMABLES, STOCKS ET DEMANDES D'ACHAT (DA)</span>
              <span className="font-bold">Page 26</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>11. RAPPORTS MENSUELS D'ACTIVITÉ (LES 12 MOIS DE L'ANNÉE)</span>
              <span className="font-bold">Page 28</span>
            </div>
            <div className="flex items-center justify-between border-b border-dotted border-slate-300 py-1.5">
              <span>12. BILANS TRIMESTRIELS (T1-T4) ET BILAN ANNUEL CONSOLIDÉ</span>
              <span className="font-bold">Page 34</span>
            </div>
          </div>
        </div>

        {/* SAUT DE PAGE */}
        <div className="page-break" style={{ pageBreakBefore: 'always' }} />

        {/* SECTION 2 : PLANIFICATION ANNUELLE */}
        <div className="space-y-6">
          <div className="border-b-2 border-slate-900 pb-2">
            <h2 className="text-xl font-black text-slate-900">2. PLANIFICATION ANNUELLE & CALENDRIER D'ACTIVITÉ</h2>
            <span className="text-xs text-slate-500 uppercase">Objectifs stratégiques, missions, KPI et jalonnement</span>
          </div>

          <table className="w-full text-left text-[11px] border-2 border-slate-900 border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2 border border-slate-700">Réf.</th>
                <th className="p-2 border border-slate-700">Objectif Annuel & Missions</th>
                <th className="p-2 border border-slate-700">Résultats Attendus</th>
                <th className="p-2 border border-slate-700">Échéance</th>
                <th className="p-2 border border-slate-700">KPI Cible</th>
                <th className="p-2 border border-slate-700">Avancement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {objectifsAnnuels.map((obj) => (
                <tr key={obj.id} className="border-b border-slate-200">
                  <td className="p-2 font-bold align-top border border-slate-200">{obj.id}</td>
                  <td className="p-2 align-top border border-slate-200">
                    <strong className="block text-slate-900">{obj.titre}</strong>
                    <span className="text-slate-500 text-[10px]">Missions : {obj.missionsPrevue}</span>
                  </td>
                  <td className="p-2 align-top border border-slate-200">{obj.resultatsAttendus}</td>
                  <td className="p-2 align-top border border-slate-200 whitespace-nowrap">{obj.echeance}</td>
                  <td className="p-2 align-top border border-slate-200 font-semibold text-blue-900">{obj.kpi}</td>
                  <td className="p-2 align-top border border-slate-200 font-bold whitespace-nowrap">
                    {obj.avancement}% ({obj.statut})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Calendrier annuel */}
          <h3 className="text-sm font-bold text-slate-900 pt-2">Calendrier des 12 Mois (Janvier à Décembre) :</h3>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {jalonsCalendrier.map((j) => (
              <div key={j.id} className="border border-slate-300 p-2 rounded bg-slate-50 flex items-start justify-between">
                <div>
                  <span className="font-bold text-blue-900 block">
                    Mois {j.mois < 10 ? '0' + j.mois : j.mois} • {moisNoms[j.mois - 1]} : {j.titre}
                  </span>
                  <span className="text-slate-500 block">{j.description}</span>
                </div>
                <span className="font-bold text-slate-700 shrink-0 ml-2">
                  {j.estComplete ? '[X] Réalisé' : '[ ] À faire'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SAUT DE PAGE */}
        <div className="page-break" style={{ pageBreakBefore: 'always' }} />

        {/* SECTION 3 : JOURNAL QUOTIDIEN */}
        <div className="space-y-6">
          <div className="border-b-2 border-slate-900 pb-2">
            <h2 className="text-xl font-black text-slate-900">3. GESTION QUOTIDIENNE DES ACTIVITÉS (EXTRAIT DU JOURNAL)</h2>
            <span className="text-xs text-slate-500 uppercase">Consignation des travaux, durées réelles et observations</span>
          </div>

          <table className="w-full text-left text-[10px] border-2 border-slate-900 border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2 border border-slate-700">Date/Heure</th>
                <th className="p-2 border border-slate-700">Tâche & Description</th>
                <th className="p-2 border border-slate-700">Catégorie</th>
                <th className="p-2 border border-slate-700">Prio</th>
                <th className="p-2 border border-slate-700">Durée</th>
                <th className="p-2 border border-slate-700">Statut</th>
                <th className="p-2 border border-slate-700">Résultat & Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {journalTaches.map((t) => (
                <tr key={t.id} className="border-b border-slate-200">
                  <td className="p-2 font-bold whitespace-nowrap align-top border border-slate-200">
                    {t.date} {t.heure}
                  </td>
                  <td className="p-2 align-top border border-slate-200">
                    <strong className="block text-slate-900">{t.tache}</strong>
                    <span className="text-slate-500">{t.description}</span>
                  </td>
                  <td className="p-2 align-top border border-slate-200">{t.categorie}</td>
                  <td className="p-2 align-top border border-slate-200 font-semibold">{t.priorite}</td>
                  <td className="p-2 align-top border border-slate-200 whitespace-nowrap">{t.dureeReelleMin} min</td>
                  <td className="p-2 align-top border border-slate-200 font-bold">{t.statut}</td>
                  <td className="p-2 align-top border border-slate-200">
                    <span className="block font-medium text-emerald-900">{t.resultat}</span>
                    <span className="italic text-slate-500">{t.observations}</span>
                  </td>
                </tr>
              ))}
              {/* Lignes vierges pour saisie manuscrite */}
              {[1, 2, 3].map((idx) => (
                <tr key={`blank-${idx}`} className="h-8 border-b border-slate-200">
                  <td className="border border-slate-200 p-2 text-slate-300">__/__ 09:00</td>
                  <td className="border border-slate-200 p-2 text-slate-300">Ligne de saisie manuscrite...</td>
                  <td className="border border-slate-200 p-2"></td>
                  <td className="border border-slate-200 p-2"></td>
                  <td className="border border-slate-200 p-2"></td>
                  <td className="border border-slate-200 p-2"></td>
                  <td className="border border-slate-200 p-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SAUT DE PAGE */}
        <div className="page-break" style={{ pageBreakBefore: 'always' }} />

        {/* SECTION 4 : REGISTRE DES INTERVENTIONS */}
        <div className="space-y-6">
          <div className="border-b-2 border-slate-900 pb-2">
            <h2 className="text-xl font-black text-slate-900">4. REGISTRE DES INTERVENTIONS INFORMATIQUES</h2>
            <span className="text-xs text-slate-500 uppercase">Fiches d'intervention détaillées et validation</span>
          </div>

          <div className="space-y-4">
            {interventions.slice(0, 3).map((it) => (
              <div key={it.id} className="border-2 border-slate-900 rounded p-4 text-[11px] space-y-2 bg-slate-50/30">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                  <span className="font-extrabold text-blue-900 text-sm">{it.numeroReference}</span>
                  <span className="text-slate-600">Reçu le : {it.dateReception} à {it.heureReception}</span>
                  <span className="font-bold text-slate-900">Priorité : {it.priorite}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-800">
                  <div><strong>Demandeur :</strong> {it.nomDemandeur} ({it.serviceDemandeur})</div>
                  <div><strong>Équipement concerné :</strong> {it.equipementConcerne}</div>
                </div>
                <div>
                  <strong className="text-red-900">Description panne :</strong> {it.descriptionPanne}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Diagnostic :</strong> {it.diagnosticTechnique}</div>
                  <div><strong>Cause :</strong> {it.causeIdentifiee}</div>
                </div>
                <div>
                  <strong className="text-emerald-900">Solution appliquée :</strong> {it.solutionAppliquee}
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200 text-[10px]">
                  <span>Matériel/Outils : {it.materielLogicielUtilise}</span>
                  <span>Temps : {it.tempsConsacreMin} min</span>
                  <span className="font-bold text-slate-900">Résultat : {it.resultat}</span>
                  <span>Validation demandeur : {it.validationDemandeur ? '[X] Signé' : '[ ] Non signé'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SAUT DE PAGE */}
        <div className="page-break" style={{ pageBreakBefore: 'always' }} />

        {/* SECTION 5 : MAINTENANCE PRÉVENTIVE & CORRECTIVE */}
        <div className="space-y-6">
          <div className="border-b-2 border-slate-900 pb-2">
            <h2 className="text-xl font-black text-slate-900">5. MAINTENANCE PRÉVENTIVE ET CORRECTIVE (11 DOMAINES)</h2>
            <span className="text-xs text-slate-500 uppercase">Check-list des 11 périmètres opérationnels</span>
          </div>

          <table className="w-full text-left text-[10px] border-2 border-slate-900 border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2 border border-slate-700">Domaine</th>
                <th className="p-2 border border-slate-700">Type</th>
                <th className="p-2 border border-slate-700">Tâche de Contrôle & Procédure</th>
                <th className="p-2 border border-slate-700">Fréquence</th>
                <th className="p-2 border border-slate-700">Dernier / Prochain</th>
                <th className="p-2 border border-slate-700">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {maintenances.map((m) => (
                <tr key={m.id} className="border-b border-slate-200">
                  <td className="p-2 font-bold align-top border border-slate-200">{m.categorie}</td>
                  <td className="p-2 align-top border border-slate-200 whitespace-nowrap">{m.typeMaintenance}</td>
                  <td className="p-2 align-top border border-slate-200">{m.tacheControle}</td>
                  <td className="p-2 align-top border border-slate-200 whitespace-nowrap">{m.frequence}</td>
                  <td className="p-2 align-top border border-slate-200 whitespace-nowrap">
                    {m.dernierControle} → {m.prochainControle}
                  </td>
                  <td className="p-2 align-top border border-slate-200 font-bold whitespace-nowrap">
                    {m.valide ? '[X] Conforme' : '[ ] À traiter'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SAUT DE PAGE */}
        <div className="page-break" style={{ pageBreakBefore: 'always' }} />

        {/* SECTION 11 & 12 : RAPPORTS MENSUELS & BILAN ANNUEL */}
        <div className="space-y-6">
          <div className="border-b-2 border-slate-900 pb-2">
            <h2 className="text-xl font-black text-slate-900">12. BILAN ANNUEL D'ACTIVITÉ & ÉVALUATION DU TECHNICIEN</h2>
            <span className="text-xs text-slate-500 uppercase">Clôture de l'exercice et signatures hiérarchiques</span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-300 rounded">
              <strong className="block text-slate-900 font-bold mb-1">Synthèse générale annuelle :</strong>
              <p>{bilanAnnuel.syntheseGenerale || 'Aucune synthèse renseignée.'}</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-300 rounded">
              <strong className="block text-slate-900 font-bold mb-1">Principales réalisations & Améliorations :</strong>
              <p className="whitespace-pre-line">{bilanAnnuel.principalesRealisations || 'Aucune réalisation renseignée.'}</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-300 rounded">
              <strong className="block text-slate-900 font-bold mb-1">Investissements informatiques préconisés pour N+1 :</strong>
              <p className="whitespace-pre-line font-medium text-blue-900">{bilanAnnuel.investissementsInformatiquesPreconises || 'Aucun investissement préconisé.'}</p>
            </div>

            {bilanAnnuel.projetsRoi && bilanAnnuel.projetsRoi.length > 0 && (
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="bg-slate-900 text-white font-bold p-2 text-[11px] uppercase tracking-wider">
                  Retour sur Investissement (ROI) des Projets Réalisés
                </div>
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-semibold">
                      <th className="p-2">Projet IT & Catégorie</th>
                      <th className="p-2 text-right">Investissement</th>
                      <th className="p-2 text-right">Économies directes</th>
                      <th className="p-2 text-right">Temps gagné</th>
                      <th className="p-2 text-right">ROI An 1 / Payback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bilanAnnuel.projetsRoi.map((p) => {
                      const invest = p.coutInvestissementEuros || 0;
                      const eco = p.economiesFinancieresAnnuellesEuros || 0;
                      const heures = p.gainTempsEstimeHeuresParAn || 0;
                      const val = eco + heures * (p.tauxHoraireMoyenValorise || 35);
                      const roi = invest > 0 ? Math.round(((val - invest) / invest) * 100) : 0;
                      const payback = val > 0 ? Math.round((invest / val) * 12 * 10) / 10 : 0;

                      return (
                        <tr key={p.id}>
                          <td className="p-2">
                            <strong>{p.nomProjet}</strong>
                            <span className="block text-slate-500 text-[9px]">{p.categorie}</span>
                          </td>
                          <td className="p-2 text-right font-mono">{invest.toLocaleString('fr-FR')} €</td>
                          <td className="p-2 text-right font-mono text-emerald-800 font-semibold">+{eco.toLocaleString('fr-FR')} €/an</td>
                          <td className="p-2 text-right font-mono text-blue-800">{heures} h/an</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {roi > 0 ? `+${roi}%` : `${roi}%`} ({payback} m)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-300 rounded">
              <strong className="block text-slate-900 font-bold mb-1">Appréciation officielle du Responsable SI (RSI) :</strong>
              <p className="italic text-slate-700">
                {bilanAnnuel.appreciationRsi ? `« ${bilanAnnuel.appreciationRsi} »` : 'En attente de validation RSI.'}
              </p>
            </div>

            {/* Signatures officielles */}
            <div className="grid grid-cols-2 gap-6 pt-6 text-center text-xs">
              <div className="border-2 border-slate-900 p-4 h-28 flex flex-col justify-between">
                <strong className="text-slate-900">
                  {`${generalInfo.prenomTechnicien} ${generalInfo.nomTechnicien}`.trim() || 'Technicien IT'}
                  {generalInfo.fonction ? ` (${generalInfo.fonction})` : ''}
                </strong>
                <span className={bilanAnnuel.signatureTechnicienDate ? 'text-emerald-700 font-semibold' : 'text-slate-400 italic'}>
                  {bilanAnnuel.signatureTechnicienDate ? `[Signé le ${bilanAnnuel.signatureTechnicienDate}]` : '[Visa et Date]'}
                </span>
              </div>
              <div className="border-2 border-slate-900 p-4 h-28 flex flex-col justify-between">
                <strong className="text-slate-900">
                  {generalInfo.responsableHierarchique || 'Responsable SI'}
                  {generalInfo.titreResponsable ? ` (${generalInfo.titreResponsable})` : ''}
                </strong>
                <span className={bilanAnnuel.signatureRsiDate ? 'text-emerald-700 font-semibold' : 'text-slate-400 italic'}>
                  {bilanAnnuel.signatureRsiDate ? `[Validé le ${bilanAnnuel.signatureRsiDate}]` : '[Approbation et Date]'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
