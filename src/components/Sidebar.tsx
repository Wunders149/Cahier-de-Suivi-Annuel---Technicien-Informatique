import React from 'react';
import {
  FileBadge,
  CalendarDays,
  ListTodo,
  Wrench,
  CheckSquare,
  Network,
  Cpu,
  KeyRound,
  ShieldCheck,
  Package,
  CalendarRange,
  Award,
  BookOpen,
  X,
  User,
  RotateCcw,
  LogIn,
  LogOut,
} from 'lucide-react';
import { GeneralInfo } from '../types/it-tracker';
import { useFirebase } from '../context/FirebaseContext';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  generalInfo: GeneralInfo;
  badgeCounts: {
    pendingTasks: number;
    activeInterventions: number;
    lowStock: number;
  };
  onResetData: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeAlert?: string;
  isHighlight?: boolean;
}

interface NavSection {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  generalInfo,
  badgeCounts,
  onResetData,
}) => {
  const { user, isAdmin, signInWithGoogle, signOut } = useFirebase();
  const navSections: NavSection[] = [
    {
      group: 'Vue d\'ensemble',
      items: [
        { id: 'general', label: '01. Informations Générales', icon: FileBadge },
        { id: 'plan', label: '02. Planification & KPI', icon: CalendarDays },
      ],
    },
    {
      group: 'Opérations de Terrain',
      items: [
        {
          id: 'journal',
          label: '03. Journal Quotidien',
          icon: ListTodo,
          badge: badgeCounts.pendingTasks > 0 ? `${badgeCounts.pendingTasks}` : undefined,
        },
        {
          id: 'interventions',
          label: '04. Interventions IT',
          icon: Wrench,
          badge: badgeCounts.activeInterventions > 0 ? `${badgeCounts.activeInterventions}` : undefined,
        },
        {
          id: 'maintenance',
          label: '05. Maintenances (11 Domaines)',
          icon: CheckSquare,
        },
      ],
    },
    {
      group: 'Infrastructures & Parc',
      items: [
        { id: 'reseau', label: '06. Réseaux & Télécoms', icon: Network },
        { id: 'parc', label: '07. Parc Matériel (CMDB)', icon: Cpu },
        { id: 'logiciels', label: '08. Logiciels & Licences', icon: KeyRound },
      ],
    },
    {
      group: 'Sécurité & Logistique',
      items: [
        { id: 'securite', label: '09. Sauvegardes & PRA', icon: ShieldCheck },
        {
          id: 'consommables',
          label: '10. Consommables & Achats',
          icon: Package,
          badgeAlert: badgeCounts.lowStock > 0 ? `${badgeCounts.lowStock} alertes` : undefined,
        },
      ],
    },
    {
      group: 'Reporting & Clôture',
      items: [
        { id: 'rapports', label: '11. Rapports Mensuels (12 Mois)', icon: CalendarRange },
        { id: 'bilans', label: '12. Bilans T1-T4, Annuel & ROI', icon: Award },
      ],
    },
    {
      group: 'Livrable Officiel',
      items: [
        {
          id: 'livret',
          label: '📖 Livret Complet A4',
          icon: BookOpen,
          isHighlight: true,
        },
      ],
    },
  ];

  return (
    <>
      {/* Overlay sur mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Barre latérale */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* En-tête du sidebar */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              IT
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block leading-none">
                Cahier de Suivi
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Exercice {generalInfo.anneeReference}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation groupée */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {sec.group}
              </span>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition duration-150 ${
                      isActive
                        ? item.isHighlight
                          ? 'bg-amber-500 text-slate-950 font-bold shadow'
                          : 'bg-blue-600 text-white font-semibold shadow'
                        : item.isHighlight
                        ? 'text-amber-400 hover:bg-slate-800/80 bg-amber-500/10'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? item.isHighlight
                              ? 'text-slate-950'
                              : 'text-white'
                            : item.isHighlight
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {item.badge}
                      </span>
                    )}

                    {item.badgeAlert && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800/80">
                        {item.badgeAlert}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Profil du technicien et statut Firebase en bas */}
        <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-950/70 space-y-2.5">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utilisateur'}
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 border border-blue-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {(user.displayName || user.email || 'T').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white block truncate">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    {isAdmin && (
                      <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Admin
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {user.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={onResetData}
                  title="Réinitialiser les données locales"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={signOut}
                  title="Déconnexion Firebase"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-200 block truncate">
                      {generalInfo.prenomTechnicien} {generalInfo.nomTechnicien}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block">
                      Mode Local Hors Ligne
                    </span>
                  </div>
                </div>

                <button
                  onClick={onResetData}
                  title="Réinitialiser les données d'exemple"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={signInWithGoogle}
                className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Connexion Cloud Google</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
