import React from 'react';
import { Download, Printer, FileText, RotateCcw, ShieldCheck, Laptop, CheckCircle2, Clock } from 'lucide-react';
import { CahierSuiviData } from '../types/it-tracker';

interface HeaderProps {
  data: CahierSuiviData;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onDownloadDocx: () => void;
  onDownloadPdf: () => void;
  onPrintPreview: () => void;
  onResetData: () => void;
  isGeneratingDocx: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  data,
  activeTab,
  onSelectTab,
  onDownloadDocx,
  onDownloadPdf,
  onPrintPreview,
  onResetData,
  isGeneratingDocx,
}) => {
  const { generalInfo, journalTaches, interventions, parcEquipements, consommables } = data;

  const tachesEnCours = journalTaches.filter((t) => t.statut === 'En cours' || t.statut === 'À faire').length;
  const ticketsResolus = interventions.filter((i) => i.resultat === 'Résolu').length;
  const alertesStock = consommables.filter((c) => c.stockActuel <= c.stockMinimumAlerte).length;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      {/* Barre supérieure d'en-tête */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Titre */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-inner border border-blue-400/30">
              <Laptop className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Exercice {generalInfo.anneeReference}
                </span>
                <span className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                  {generalInfo.entreprise}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Cahier de Suivi Annuel du Technicien IT
              </h1>
              <p className="text-xs text-slate-400">
                Titulaire : <span className="text-slate-200 font-medium">{generalInfo.prenomTechnicien} {generalInfo.nomTechnicien}</span> • DSI / {generalInfo.departement}
              </p>
            </div>
          </div>

          {/* Boutons d'export et d'action */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onDownloadDocx}
              disabled={isGeneratingDocx}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition duration-150 disabled:opacity-50"
              title="Générer et télécharger le document Word (.docx) entièrement modifiable"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              <span>{isGeneratingDocx ? 'Génération...' : 'Export Word (.docx)'}</span>
            </button>

            <button
              onClick={onDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow transition duration-150"
              title="Télécharger le document PDF (.pdf) prêt à imprimer"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>Télécharger PDF</span>
            </button>

            <button
              onClick={onPrintPreview}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium shadow-sm transition duration-150"
              title="Aperçu avant impression et impression A4 haute fidélité"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Imprimer A4</span>
            </button>

            <button
              onClick={onResetData}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs transition duration-150"
              title="Réinitialiser les données d'exemple"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Barre de métriques rapides */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2 bg-slate-800/50 px-2.5 py-1.5 rounded border border-slate-800">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-slate-400">Tâches en attente :</span>{' '}
              <span className="font-semibold text-white">{tachesEnCours}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/50 px-2.5 py-1.5 rounded border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-400">Tickets résolus :</span>{' '}
              <span className="font-semibold text-white">{ticketsResolus}/{interventions.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/50 px-2.5 py-1.5 rounded border border-slate-800">
            <Laptop className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <span className="text-slate-400">Équipements parc :</span>{' '}
              <span className="font-semibold text-white">{parcEquipements.length} recensés</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/50 px-2.5 py-1.5 rounded border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-slate-400">Sauvegardes 3-2-1 :</span>{' '}
              <span className="font-semibold text-emerald-300">100% Conforme</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
