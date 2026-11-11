import React from 'react';
import { Menu, Search, FileText, Download, Printer, Cloud, CloudOff, RefreshCw, AlertCircle, LogIn, LogOut, Shield } from 'lucide-react';
import { CahierSuiviData } from '../types/it-tracker';
import { useFirebase } from '../context/FirebaseContext';

interface HeaderProps {
  data: CahierSuiviData;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSidebar: () => void;
  onOpenSearch: () => void;
  onDownloadDocx: () => void;
  onDownloadPdf: () => void;
  onPrintPreview: () => void;
  isGeneratingDocx: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  data,
  activeTab,
  onOpenSidebar,
  onOpenSearch,
  onDownloadDocx,
  onDownloadPdf,
  onPrintPreview,
  isGeneratingDocx,
}) => {
  const { generalInfo, journalTaches, consommables } = data;
  const {
    user,
    profile,
    isAdmin,
    syncStatus,
    lastSyncTime,
    signInWithGoogle,
    signOut,
    saveDataToCloud
  } = useFirebase();

  const tabTitles: Record<string, string> = {
    general: '01. Informations Générales & Page de Garde',
    plan: '02. Planification Annuelle & KPI',
    journal: '03. Journal Quotidien d\'Activité',
    interventions: '04. Registre des Interventions IT',
    maintenance: '05. Maintenance Préventive & Corrective',
    reseau: '06. Infrastructure Réseau & Incidents',
    parc: '07. Gestion du Parc Informatique (CMDB)',
    logiciels: '08. Logiciels, Licences & Comptes',
    securite: '09. Sauvegarde, PRA & Cybersécurité',
    consommables: '10. Consommables & Demandes d\'Achat',
    rapports: '11. Rapports Mensuels (12 Mois)',
    bilans: '12. Bilans Trimestriels & Annuel',
    livret: '📖 Livret Officiel A4 Imprimable',
  };

  const currentTitle = tabTitles[activeTab] || 'Tableau de Bord';
  const alertesStock = consommables.filter((c) => c.stockActuel <= c.stockMinimumAlerte).length;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Zone Gauche : Menu hamburger (mobile) & Fil d'Ariane */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-white hidden sm:inline">
            {generalInfo.entreprise}
          </span>
          <span className="hidden sm:inline" aria-hidden="true">/</span>
          <span className="hidden md:inline">DSI</span>
          <span className="hidden md:inline" aria-hidden="true">/</span>
          <span className="font-bold text-blue-600 dark:text-blue-400 truncate max-w-[180px] sm:max-w-xs">
            {currentTitle}
          </span>
        </div>
      </div>

      {/* Zone Centrale : Recherche rapide & Statut Cloud Firebase */}
      <div className="hidden xl:flex items-center gap-3 text-xs">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Recherche globale...</span>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* Indicateur Cloud Firebase Firestore */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          {user ? (
            <div className="flex items-center gap-1.5">
              {syncStatus === 'synced' && (
                <button
                  onClick={() => saveDataToCloud(data)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-[11px] font-medium transition"
                  title={lastSyncTime ? `Synchronisé à ${lastSyncTime.toLocaleTimeString()}` : 'Synchronisé au Cloud'}
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Cloud Synchro</span>
                </button>
              )}
              {syncStatus === 'saving' && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-medium">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span>Sauvegarde...</span>
                </div>
              )}
              {syncStatus === 'error' && (
                <button
                  onClick={() => saveDataToCloud(data)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 text-[11px] font-medium transition"
                  title="Erreur lors de la synchronisation. Cliquez pour réessayer."
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>Erreur Cloud</span>
                </button>
              )}
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[11px]"
              title="Données sauvegardées localement. Connectez-vous avec Google pour activer la synchronisation Cloud."
            >
              <CloudOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Stockage Local</span>
            </div>
          )}

          {alertesStock > 0 && (
            <span className="text-red-600 font-semibold text-[11px]">
              {alertesStock} alertes stock
            </span>
          )}
        </div>
      </div>

      {/* Zone Droite : Exports & Utilisateur Firebase */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenSearch}
          className="xl:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Rechercher"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={onDownloadDocx}
          disabled={isGeneratingDocx}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition duration-150 whitespace-nowrap shrink-0 disabled:opacity-50"
          title="Générer le document Word (.docx) entièrement modifiable"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isGeneratingDocx ? 'Export...' : 'Word (.docx)'}</span>
        </button>

        <button
          onClick={onDownloadPdf}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition duration-150 whitespace-nowrap shrink-0"
          title="Télécharger le document PDF (.pdf) prêt à l'emploi"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PDF (.pdf)</span>
        </button>

        <button
          onClick={onPrintPreview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-medium transition duration-150 whitespace-nowrap shrink-0"
          title="Mode Impression A4"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Imprimer A4</span>
        </button>

        {/* Bouton de connexion ou Profil Firebase */}
        <div className="pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-700 ml-1">
          {user ? (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                title={`Connecté en tant que ${user.email} ${isAdmin ? '(Administrateur)' : ''}`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utilisateur'}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[100px] leading-tight">
                    {user.displayName || user.email?.split('@')[0]}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-slate-500">
                    {isAdmin && <Shield className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                    <span>{isAdmin ? 'Super Admin' : (profile?.role || 'Technicien')}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={signOut}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs font-semibold shadow-xs transition"
              title="Connectez-vous avec Google pour activer la synchronisation Firestore Cloud"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connexion</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

