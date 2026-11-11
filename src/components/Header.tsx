import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  FileText,
  Download,
  Printer,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  LogIn,
  LogOut,
  Shield,
  ChevronDown,
  Check
} from 'lucide-react';
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

const TAB_TITLES: Record<string, string> = {
  general: '01. Informations Générales',
  plan: '02. Planification & KPI',
  journal: '03. Journal Quotidien',
  interventions: '04. Interventions IT',
  maintenance: '05. Maintenances (11 Domaines)',
  reseau: '06. Réseaux & Télécoms',
  parc: '07. Parc Matériel (CMDB)',
  logiciels: '08. Logiciels & Licences',
  securite: '09. Sauvegardes & PRA',
  consommables: '10. Consommables & Achats',
  rapports: '11. Rapports Mensuels',
  bilans: '12. Bilans & Calculateur ROI',
  livret: '📖 Livret Complet A4',
};

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
  const { generalInfo } = data;
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

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fermer les dropdowns en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setExportMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTitle = TAB_TITLES[activeTab] || 'Tableau de Bord';

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* 1. GAUCHE : Menu hamburger (mobile) & Titre de section épuré */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
          <span className="font-semibold text-slate-900 dark:text-white hidden sm:inline truncate max-w-[150px]">
            {generalInfo.entreprise}
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
          <span className="font-bold text-blue-600 dark:text-blue-400 truncate text-sm">
            {currentTitle}
          </span>
        </div>
      </div>

      {/* 2. CENTRE : Raccourci recherche compact & discret */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-sm px-4">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs transition"
          title="Rechercher (⌘K)"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Rechercher...</span>
          </div>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* 3. DROITE : Menu Exporter unique + Statut Cloud discret + Profil */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Recherche sur mobile */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Rechercher"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Indicateur Cloud Firestore discret (icône compacte) */}
        {user ? (
          <div className="flex items-center">
            {syncStatus === 'synced' && (
              <button
                onClick={() => saveDataToCloud(data)}
                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition relative group"
                title={lastSyncTime ? `Cloud synchronisé à ${lastSyncTime.toLocaleTimeString()}` : 'Cloud synchronisé'}
              >
                <Cloud className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </button>
            )}

            {syncStatus === 'saving' && (
              <div
                className="p-1.5 text-amber-600"
                title="Sauvegarde en cours..."
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
            )}

            {syncStatus === 'error' && (
              <button
                onClick={() => saveDataToCloud(data)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Erreur de synchronisation. Cliquez pour réessayer."
              >
                <AlertCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div
            className="p-1.5 text-slate-400"
            title="Mode local hors ligne"
          >
            <CloudOff className="w-4 h-4" />
          </div>
        )}

        {/* Menu déroulant unique pour TOUS les exports (Word, PDF, Imprimer) */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            title="Options d'exportation du cahier de suivi"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isGeneratingDocx ? 'Génération...' : 'Exporter'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-blue-200 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-xs space-y-0.5 animate-in fade-in duration-100">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                Formats d'exportation
              </div>

              <button
                onClick={() => {
                  onDownloadDocx();
                  setExportMenuOpen(false);
                }}
                disabled={isGeneratingDocx}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-200 font-medium transition disabled:opacity-50"
              >
                <span className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Document Word (.docx)</strong>
                  <span className="text-[10px] text-slate-500">Document complet modifiable</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onDownloadPdf();
                  setExportMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 font-medium transition"
              >
                <span className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Document PDF (.pdf)</strong>
                  <span className="text-[10px] text-slate-500">Fichier prêt pour la direction</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onPrintPreview();
                  setExportMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition"
              >
                <span className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                  <Printer className="w-3.5 h-3.5" />
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Format Livret A4</strong>
                  <span className="text-[10px] text-slate-500">Aperçu et impression officielle</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Profil Utilisateur / Connexion Google */}
        <div className="relative pl-1 border-l border-slate-200 dark:border-slate-800" ref={userMenuRef}>
          {user ? (
            <div>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none"
                title={`${user.displayName || user.email} (${isAdmin ? 'Admin' : 'Technicien'})`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utilisateur'}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'T').charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 text-xs space-y-2 animate-in fade-in duration-100">
                  <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">
                      {user.displayName || 'Technicien IT'}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block">
                      {user.email}
                    </span>
                    <div className="mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        isAdmin
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {isAdmin ? 'Super Administrateur DSI' : (profile?.role || 'Technicien')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      signOut();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 font-medium transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs font-medium transition"
              title="Connexion Google"
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
