import React, { useState } from 'react';
import { GeneralInfo } from '../../types/it-tracker';
import { ShieldCheck, UserCheck, Building, Calendar, Phone, Mail, MapPin, Edit3, Check, FileText } from 'lucide-react';

interface GeneralInfoSectionProps {
  info: GeneralInfo;
  onUpdate: (info: GeneralInfo) => void;
  onDownloadDocx: () => void;
  onDownloadPdf: () => void;
}

export const GeneralInfoSection: React.FC<GeneralInfoSectionProps> = ({
  info,
  onUpdate,
  onDownloadDocx,
  onDownloadPdf,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<GeneralInfo>(info);

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
            Informations Générales & Page de Garde
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Page de garde officielle, identification du titulaire, rattachement hiérarchique et charte déontologique.
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

      {/* Mode formulaire d'édition */}
      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-blue-900 border-b border-blue-100 pb-2">
            Modifier les données de la page de garde
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Année de référence</label>
              <input
                type="number"
                value={formData.anneeReference}
                onChange={(e) => setFormData({ ...formData, anneeReference: parseInt(e.target.value) || 2026 })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Prénom du technicien</label>
              <input
                type="text"
                value={formData.prenomTechnicien}
                onChange={(e) => setFormData({ ...formData, prenomTechnicien: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nom du technicien</label>
              <input
                type="text"
                value={formData.nomTechnicien}
                onChange={(e) => setFormData({ ...formData, nomTechnicien: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Fonction exacte</label>
              <input
                type="text"
                value={formData.fonction}
                onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Département / Service</label>
              <input
                type="text"
                value={formData.departement}
                onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nom de l'entreprise</label>
              <input
                type="text"
                value={formData.entreprise}
                onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nom du responsable (RSI / DSI)</label>
              <input
                type="text"
                value={formData.responsableHierarchique}
                onChange={(e) => setFormData({ ...formData, responsableHierarchique: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Titre du responsable</label>
              <input
                type="text"
                value={formData.titreResponsable}
                onChange={(e) => setFormData({ ...formData, titreResponsable: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Date de prise de fonction</label>
              <input
                type="date"
                value={formData.datePriseFonction}
                onChange={(e) => setFormData({ ...formData, datePriseFonction: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Téléphone pro</label>
              <input
                type="text"
                value={formData.telephonePro}
                onChange={(e) => setFormData({ ...formData, telephonePro: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email pro</label>
              <input
                type="email"
                value={formData.emailPro}
                onChange={(e) => setFormData({ ...formData, emailPro: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Localisation atelier / bureau</label>
              <input
                type="text"
                value={formData.localisationBureau}
                onChange={(e) => setFormData({ ...formData, localisationBureau: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
            >
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
                  <span className="text-slate-900 font-bold text-sm">{info.prenomTechnicien} {info.nomTechnicien}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fonction :</span>
                  <span className="text-slate-900 font-medium">{info.fonction}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date de prise de fonction :</span>
                  <span className="text-slate-900 font-medium">{info.datePriseFonction}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Atelier / Bureau :</span>
                  <span className="text-slate-900 font-medium">{info.localisationBureau}</span>
                </div>
                <div className="pt-1 flex flex-col gap-1 text-slate-600">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-blue-600" /> {info.telephonePro}</span>
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-600" /> {info.emailPro}</span>
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
                  <span className="text-slate-900 font-bold text-sm">{info.entreprise}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Direction / Service :</span>
                  <span className="text-slate-900 font-medium">{info.departement}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Responsable hiérarchique :</span>
                  <span className="text-slate-900 font-bold">{info.responsableHierarchique}</span>
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
