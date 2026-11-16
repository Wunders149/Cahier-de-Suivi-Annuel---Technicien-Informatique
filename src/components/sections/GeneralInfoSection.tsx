import React, { useState, useEffect } from 'react';
import { CahierSuiviData, GeneralInfo } from '../../types/it-tracker';
import { ShieldCheck, UserCheck, Building, Phone, Mail, Edit3, Check, FileText } from 'lucide-react';
import { DashboardStats } from '../dashboard/DashboardStats';
import { FormField, FormSection } from '../ui/FormField';
import {
  fieldInputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/formStyles';

interface GeneralInfoSectionProps {
  data: CahierSuiviData;
  info: GeneralInfo;
  onUpdate: (info: GeneralInfo) => void;
  onNavigateTab: (tab: string) => void;
  onDownloadDocx: () => void;
  onDownloadPdf: () => void;
}

export const GeneralInfoSection: React.FC<GeneralInfoSectionProps> = ({
  data,
  info,
  onUpdate,
  onNavigateTab,
  onDownloadDocx,
  onDownloadPdf,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<GeneralInfo>(info);

  useEffect(() => {
    setFormData(info);
  }, [info]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">1</span>
            Tableau de Bord & Page de Garde
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pilotage annuel, évolution mensuelle des interventions terminées et page de garde officielle du cahier.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>{isEditing ? 'Annuler modification' : 'Modifier les informations'}</span>
          </button>
        </div>
      </div>

      {/* Tableau de bord statistique (KPIs + Graphique linéaire Recharts) */}
      {!isEditing && (
        <DashboardStats data={data} onNavigateTab={onNavigateTab} />
      )}

      {/* Mode formulaire d'édition */}
      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Modifier les données de la page de garde
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Informations officielles affichées sur la couverture du cahier et les exports PDF / Word.
            </p>
          </div>

          <FormSection title="1. Identité & Poste">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <FormField label="Année de référence" required>
                <input
                  type="number"
                  required
                  value={formData.anneeReference}
                  onChange={(e) =>
                    setFormData({ ...formData, anneeReference: parseInt(e.target.value, 10) || 2026 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Prénom du technicien" required>
                <input
                  type="text"
                  required
                  value={formData.prenomTechnicien}
                  onChange={(e) => setFormData({ ...formData, prenomTechnicien: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Nom du technicien" required>
                <input
                  type="text"
                  required
                  value={formData.nomTechnicien}
                  onChange={(e) => setFormData({ ...formData, nomTechnicien: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Date de prise de fonction">
                <input
                  type="date"
                  value={formData.datePriseFonction}
                  onChange={(e) => setFormData({ ...formData, datePriseFonction: e.target.value })}
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>
            </div>

            <FormField label="Fonction exacte">
              <input
                type="text"
                value={formData.fonction}
                onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
                className={fieldInputClass}
              />
            </FormField>
          </FormSection>

          <FormSection title="2. Organisation & Rattachement" separated>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Nom de l'entreprise">
                <input
                  type="text"
                  value={formData.entreprise}
                  onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Département / Service">
                <input
                  type="text"
                  value={formData.departement}
                  onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Nom du responsable (RSI / DSI)">
                <input
                  type="text"
                  value={formData.responsableHierarchique}
                  onChange={(e) =>
                    setFormData({ ...formData, responsableHierarchique: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Titre du responsable">
                <input
                  type="text"
                  value={formData.titreResponsable}
                  onChange={(e) => setFormData({ ...formData, titreResponsable: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="3. Coordonnées professionnelles" separated>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Téléphone pro">
                <input
                  type="text"
                  value={formData.telephonePro}
                  onChange={(e) => setFormData({ ...formData, telephonePro: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Email pro">
                <input
                  type="email"
                  value={formData.emailPro}
                  onChange={(e) => setFormData({ ...formData, emailPro: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Localisation atelier / bureau">
                <input
                  type="text"
                  value={formData.localisationBureau}
                  onChange={(e) => setFormData({ ...formData, localisationBureau: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>
          </FormSection>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              Enregistrer les modifications
            </button>
          </div>
        </form>
      ) : null}

      {/* Rendu visuel de la Page de Garde officielle */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xl overflow-hidden max-w-4xl mx-auto">
        {/* Bande supérieure bleu marine */}
        <div className="bg-slate-900 text-white p-8 sm:p-10 text-center relative border-b-2 border-slate-800">
          <span className="text-xs font-bold tracking-widest uppercase text-blue-400 block mb-2">
            Système de Management des Services Informatiques (ITSM)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
            CAHIER DE SUIVI ANNUEL
          </h1>
          <h2 className="text-lg sm:text-xl font-bold text-blue-400 mb-2">
            DU TECHNICIEN INFORMATIQUE
          </h2>
          <p className="text-xs font-mono tabular-nums text-slate-300 font-medium">
            ANNÉE D'EXERCICE <span className="text-white font-bold text-sm underline decoration-blue-400 underline-offset-4">{info.anneeReference}</span>
          </p>
          <p className="text-xs text-slate-400 mt-2 max-w-lg mx-auto italic">
            Registre officiel de traçabilité, pilotage opérationnel, maintenance préventive et reporting hiérarchique
          </p>
        </div>

        {/* Corps de la page de garde */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Carte Titulaire */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm border-b border-slate-200 pb-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>IDENTIFICATION DU TECHNICIEN</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Nom & Prénom :</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {`${info.prenomTechnicien} ${info.nomTechnicien}`.trim() || (
                      <span className="text-slate-400 font-normal italic">Non renseigné</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fonction :</span>
                  <span className="text-slate-900 font-medium">{info.fonction || 'Technicien Informatique'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date de prise de fonction :</span>
                  <span className="text-slate-900 font-medium">{info.datePriseFonction || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Atelier / Bureau :</span>
                  <span className="text-slate-900 font-medium">
                    {info.localisationBureau || <span className="text-slate-400 italic">Non renseigné</span>}
                  </span>
                </div>
                <div className="pt-1 flex flex-col gap-1 text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    {info.telephonePro || <span className="text-slate-400 italic">Non renseigné</span>}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    {info.emailPro || <span className="text-slate-400 italic">Non renseigné</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Carte Organisation & Hiérarchie */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm border-b border-slate-200 pb-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>RATTACHEMENT & ORGANISATION</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Entreprise / Organisation :</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {info.entreprise || <span className="text-slate-400 font-normal italic">À renseigner</span>}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Direction / Service :</span>
                  <span className="text-slate-900 font-medium">{info.departement || 'DSI'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Responsable hiérarchique :</span>
                  <span className="text-slate-900 font-bold">
                    {info.responsableHierarchique || <span className="text-slate-400 font-normal italic">Non renseigné</span>}
                  </span>
                  <span className="text-slate-500 text-[11px] block">{info.titreResponsable}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Statut du registre :</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                    <Check className="w-3.5 h-3.5" /> Actif & Conforme ISO/IEC 20000
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Charte déontologique et engagement */}
          <div className="bg-blue-50/70 rounded-xl p-5 border border-blue-200 text-xs space-y-2">
            <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>ENGAGEMENT DÉONTOLOGIQUE, SÉCURITÉ & CONFIDENTIALITÉ</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              En tant que Technicien Informatique, je m'engage solennellement à assurer la continuité de service des équipements informatiques, à respecter scrupuleusement la confidentialité des informations professionnelles et personnelles consultées dans le cadre de mes fonctions, à appliquer la politique de sécurité des systèmes d'information (PSSI), et à consigner avec exactitude l'ensemble de mes interventions dans ce cahier de suivi.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between text-slate-600 border-t border-blue-200/80 font-medium">
              <span>Visa Technicien : [Certifié conforme au {info.datePriseFonction}]</span>
              <span>Validation RSI : [Visé et archivé DSI]</span>
            </div>
          </div>

          {/* Boutons d'export rapide */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={onDownloadDocx}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold shadow-md transition"
            >
              <FileText className="w-4 h-4" />
              <span>Télécharger le Cahier en Word (.docx modifiable)</span>
            </button>
            <button
              onClick={onDownloadPdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold shadow-md transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Télécharger le Cahier en PDF (Prêt à imprimer)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
