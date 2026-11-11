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
  ShieldAlert,
  Package,
  CalendarRange,
  Award,
  BookOpen,
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'general', label: '1. Informations Générales', icon: FileBadge },
    { id: 'plan', label: '2. Planification & KPI', icon: CalendarDays },
    { id: 'journal', label: '3. Journal Quotidien', icon: ListTodo },
    { id: 'interventions', label: '4. Interventions IT', icon: Wrench },
    { id: 'maintenance', label: '5. Maintenances (11 Domaines)', icon: CheckSquare },
    { id: 'reseau', label: '6. Réseaux & Incidents', icon: Network },
    { id: 'parc', label: '7. Parc Informatique (CMDB)', icon: Cpu },
    { id: 'logiciels', label: '8. Logiciels & Licences', icon: KeyRound },
    { id: 'securite', label: '9. Sauvegardes & Sécurité', icon: ShieldAlert },
    { id: 'consommables', label: '10. Consommables & Achats', icon: Package },
    { id: 'rapports', label: '11. Rapports Mensuels (12 Mois)', icon: CalendarRange },
    { id: 'bilans', label: '12. Bilans T1-T4 & Annuel', icon: Award },
    { id: 'livret', label: '📖 Livret Complet A4', icon: BookOpen, highlight: true },
  ];

  return (
    <nav className="bg-slate-800/90 border-b border-slate-700/80 sticky top-[95px] z-30 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-slate-600">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? tab.highlight
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'bg-blue-600 text-white shadow'
                    : tab.highlight
                    ? 'text-amber-300 hover:bg-slate-700/80 bg-amber-500/10 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? (tab.highlight ? 'text-slate-950' : 'text-blue-200') : tab.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
