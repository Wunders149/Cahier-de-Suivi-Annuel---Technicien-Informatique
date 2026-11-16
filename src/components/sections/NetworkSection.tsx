import React, { useState } from 'react';
import { EquipementReseau, IncidentReseau, TestDebitReseau } from '../../types/it-tracker';
import { Network, AlertTriangle, Plus, Server, CheckCircle2, Gauge } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import {
  fieldInputClass,
  fieldSelectClass,
  fieldTextareaClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/formStyles';

interface NetworkSectionProps {
  equipements: EquipementReseau[];
  incidents: IncidentReseau[];
  testsDebit: TestDebitReseau[];
  onUpdateEquipements: (equipements: EquipementReseau[]) => void;
  onUpdateIncidents: (incidents: IncidentReseau[]) => void;
  onUpdateTestsDebit: (tests: TestDebitReseau[]) => void;
}

export const NetworkSection: React.FC<NetworkSectionProps> = ({
  equipements,
  incidents,
  testsDebit,
  onUpdateEquipements,
  onUpdateIncidents,
  onUpdateTestsDebit,
}) => {
  const [showAddIncident, setShowAddIncident] = useState(false);
  const [newIncident, setNewIncident] = useState<Partial<IncidentReseau>>({
    dateHeure: new Date().toISOString().replace('T', ' ').slice(0, 16),
    equipementOuLiaison: '',
    typeIncident: 'Coupure Internet',
    dureeInterruptionMin: 15,
    impactUtilisateurs: 'Quelques postes',
    cause: '',
    actionCorrective: '',
    statut: 'Résolu',
  });

  const handleAddIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.equipementOuLiaison) return;

    const item: IncidentReseau = {
      id: `INC-NET-${Date.now()}`,
      dateHeure: newIncident.dateHeure || new Date().toISOString().replace('T', ' ').slice(0, 16),
      equipementOuLiaison: newIncident.equipementOuLiaison || '',
      typeIncident: (newIncident.typeIncident as any) || 'Coupure Internet',
      dureeInterruptionMin: Number(newIncident.dureeInterruptionMin) || 0,
      impactUtilisateurs: (newIncident.impactUtilisateurs as any) || 'Quelques postes',
      cause: newIncident.cause || 'En cours d\'analyse',
      actionCorrective: newIncident.actionCorrective || 'Intervention effectuée',
      statut: (newIncident.statut as any) || 'Résolu',
    };

    onUpdateIncidents([item, ...incidents]);
    setShowAddIncident(false);
    setNewIncident({
      dateHeure: new Date().toISOString().replace('T', ' ').slice(0, 16),
      equipementOuLiaison: '',
      typeIncident: 'Coupure Internet',
      dureeInterruptionMin: 15,
      impactUtilisateurs: 'Quelques postes',
      cause: '',
      actionCorrective: '',
      statut: 'Résolu',
    });
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">6</span>
            Gestion des Réseaux Informatiques & Télécoms
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Topologie LAN/WAN, plan d'adressage IP, équipements d'interconnexion, registre des incidents et tests de débit.
          </p>
        </div>
        <button
          onClick={() => setShowAddIncident(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Déclarer un Incident Réseau</span>
        </button>
      </div>

      {/* Synthèse Architecture Réseau (Cartouche professionnel) */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-md">
        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-300 mb-3 flex items-center gap-2">
          <Network className="w-4 h-4" />
          Synthèse de l'Architecture Réseau & Liaisons Opérateur
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <span className="text-blue-300 block font-semibold">Connexion WAN 1 (Fibre Pro)</span>
            <strong className="text-sm block">Orange Fibre 1 Gbps Symétrique</strong>
            <span className="text-slate-300 block">IP Fixe Publique • SLA GTR 4h</span>
            <span className="text-emerald-400 font-semibold text-[11px]">● Ligne Active Principale</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <span className="text-blue-300 block font-semibold">Connexion WAN 2 (Secours SD-WAN)</span>
            <strong className="text-sm block">SFR Fibre Dédiée 500 Mbps</strong>
            <span className="text-slate-300 block">Failover automatique FortiGate</span>
            <span className="text-emerald-400 font-semibold text-[11px]">● Redondance Opérationnelle</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <span className="text-blue-300 block font-semibold">Plan de VLANs & Routage</span>
            <span className="block">• VLAN 10 : Administration (192.168.10.0/24)</span>
            <span className="block">• VLAN 20 : Postes Utilisateurs (192.168.20.0/23)</span>
            <span className="block">• VLAN 30 : Wi-Fi Corporate 802.1X</span>
            <span className="block">• VLAN 40 : Wi-Fi Invités • VLAN 50 : VoIP</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <span className="text-blue-300 block font-semibold">Supervision & Disponibilité</span>
            <strong className="text-lg font-extrabold text-emerald-400 block">99.96%</strong>
            <span className="text-slate-300 block">Supervision PRTG / SNMP v3</span>
            <span className="text-slate-400 text-[11px]">Sonde active 24/7 sur cœurs de réseau</span>
          </div>
        </div>
      </div>

      {/* Modal ajout incident */}
      <Modal
        isOpen={showAddIncident}
        onClose={() => setShowAddIncident(false)}
        title="Consigner un incident réseau"
        subtitle="Enregistrez une coupure, dégradation de liaison ou anomalie Wi-Fi / LAN."
        icon={<AlertTriangle className="w-4 h-4" />}
        tone="amber"
        size="lg"
        onSubmit={handleAddIncident}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddIncident(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              Enregistrer l'incident
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Contexte & Impact">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Date et heure" hint="Format AAAA-MM-JJ HH:MM">
                <input
                  type="text"
                  value={newIncident.dateHeure || ''}
                  onChange={(e) =>
                    setNewIncident({ ...newIncident, dateHeure: e.target.value })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Équipement ou liaison concernée" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: Switch SW-ACCES-02 ou Fibre WAN"
                  value={newIncident.equipementOuLiaison || ''}
                  onChange={(e) =>
                    setNewIncident({
                      ...newIncident,
                      equipementOuLiaison: e.target.value,
                    })
                  }
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Type d'incident">
                <select
                  value={newIncident.typeIncident || 'Coupure Internet'}
                  onChange={(e) =>
                    setNewIncident({
                      ...newIncident,
                      typeIncident: e.target
                        .value as IncidentReseau['typeIncident'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Coupure Internet">Coupure Internet</option>
                  <option value="Saturation bande passante">
                    Saturation bande passante
                  </option>
                  <option value="Perte ping switch">Perte ping switch</option>
                  <option value="Panne Wi-Fi">Panne Wi-Fi</option>
                  <option value="Conflit IP">Conflit IP</option>
                  <option value="Câble défectueux">Câble défectueux</option>
                </select>
              </FormField>
              <FormField label="Durée coupure (min)">
                <input
                  type="number"
                  min={0}
                  value={newIncident.dureeInterruptionMin ?? 0}
                  onChange={(e) =>
                    setNewIncident({
                      ...newIncident,
                      dureeInterruptionMin: Math.max(
                        0,
                        parseInt(e.target.value, 10) || 0
                      ),
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Impact utilisateurs">
                <select
                  value={newIncident.impactUtilisateurs || 'Quelques postes'}
                  onChange={(e) =>
                    setNewIncident({
                      ...newIncident,
                      impactUtilisateurs: e.target
                        .value as IncidentReseau['impactUtilisateurs'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Transparent">Transparent</option>
                  <option value="Quelques postes">Quelques postes</option>
                  <option value="Service complet">Service complet</option>
                  <option value="Général">Général</option>
                </select>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="2. Analyse & Remédiation" separated>
            <FormField label="Cause racine identifiée" required>
              <textarea
                rows={2}
                required
                placeholder="Explication technique de la panne..."
                value={newIncident.cause || ''}
                onChange={(e) =>
                  setNewIncident({ ...newIncident, cause: e.target.value })
                }
                className={fieldTextareaClass}
              />
            </FormField>

            <FormField label="Action corrective appliquée" required>
              <textarea
                rows={2}
                required
                placeholder="Réparation, reconfiguration, changement de port..."
                value={newIncident.actionCorrective || ''}
                onChange={(e) =>
                  setNewIncident({
                    ...newIncident,
                    actionCorrective: e.target.value,
                  })
                }
                className={fieldTextareaClass}
              />
            </FormField>

            <FormField label="Statut actuel de l'incident">
              <select
                value={newIncident.statut || 'Résolu'}
                onChange={(e) =>
                  setNewIncident({
                    ...newIncident,
                    statut: e.target.value as IncidentReseau['statut'],
                  })
                }
                className={fieldSelectClass}
              >
                <option value="Résolu">Résolu</option>
                <option value="Sous surveillance">Sous surveillance</option>
                <option value="En attente opérateur">En attente opérateur</option>
              </select>
            </FormField>
          </FormSection>
        </div>
      </Modal>

      {/* Tableau des équipements réseau */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          <span>Inventaire & Configuration des Équipements Réseau ({equipements.length})</span>
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 font-semibold">Nom & Type</th>
                  <th className="p-3 font-semibold">Marque & Modèle</th>
                  <th className="p-3 font-semibold">Adresse IP & MAC</th>
                  <th className="p-3 font-semibold">Localisation & VLAN</th>
                  <th className="p-3 font-semibold">Ports PoE</th>
                  <th className="p-3 font-semibold">Firmware</th>
                  <th className="p-3 font-semibold">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {equipements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      Aucun équipement réseau enregistré. Utilisez le bouton « Ajouter un Équipement » ci-dessus pour recenser vos switchs, routeurs et bornes Wi-Fi.
                    </td>
                  </tr>
                ) : (
                  equipements.map((eq) => (
                    <tr key={eq.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 align-top whitespace-nowrap">
                        <strong className="text-slate-900 block font-semibold">{eq.nom}</strong>
                        <span className="text-[11px] text-blue-700 font-medium">{eq.type}</span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="text-slate-800">{eq.marqueModele}</span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap font-mono text-[11px]">
                        <span className="text-slate-900 font-bold block">{eq.adresseIp}</span>
                        <span className="text-slate-400">{eq.adresseMac}</span>
                      </td>
                      <td className="p-3 align-top text-[11px]">
                        <span className="text-slate-800 block">{eq.localisation}</span>
                        <span className="text-slate-500 font-medium">{eq.vlan}</span>
                      </td>
                      <td className="p-3 align-top text-[11px]">
                        <span className="text-slate-700">{eq.portsPoE}</span>
                      </td>
                      <td className="p-3 align-top text-[11px] whitespace-nowrap">
                        <span className="text-slate-800 font-mono">{eq.firmwareVersion}</span>
                        <span className="text-slate-400 block text-[10px]">Reboot: {eq.dernierReboot}</span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {eq.etat}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Registre des incidents réseau */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span>Registre des Incidents de Connectivité Réseau</span>
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 font-semibold">Date & Heure</th>
                  <th className="p-3 font-semibold">Liaison / Équipement</th>
                  <th className="p-3 font-semibold">Type d'incident</th>
                  <th className="p-3 font-semibold">Durée & Impact</th>
                  <th className="p-3 font-semibold">Cause Racine</th>
                  <th className="p-3 font-semibold">Action Corrective</th>
                  <th className="p-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      Aucun incident de connectivité réseau consigné. Cliquez sur « Déclarer un Incident » en cas de coupure ou dégradation de service.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 align-top whitespace-nowrap font-medium text-slate-900">
                        {inc.dateHeure}
                      </td>
                      <td className="p-3 align-top font-semibold text-slate-900">
                        {inc.equipementOuLiaison}
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                          {inc.typeIncident}
                        </span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="font-bold text-slate-800">{inc.dureeInterruptionMin} min</span>
                        <span className="text-slate-400 block text-[11px]">Impact: {inc.impactUtilisateurs}</span>
                      </td>
                      <td className="p-3 align-top text-slate-700 max-w-xs">
                        {inc.cause}
                      </td>
                      <td className="p-3 align-top text-emerald-800 bg-emerald-50/40 max-w-xs">
                        {inc.actionCorrective}
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          {inc.statut}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tests de débit et performance SLA */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-blue-600" />
          <span>Mesures de Performance & Tests de Débit Périodiques</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {testsDebit.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 italic">
              Aucune mesure de débit enregistrée. Réalisez des tests périodiques pour documenter les performances de la connexion Internet et du réseau local.
            </div>
          ) : (
            testsDebit.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900 text-sm">{t.ligneConcernee}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    {t.statutConformite}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center py-2 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Débit Descendant</span>
                    <strong className="text-base text-blue-700 font-extrabold">{t.debitDescendantMbps} Mbps</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Débit Montant</span>
                    <strong className="text-base text-indigo-700 font-extrabold">{t.debitMontantMbps} Mbps</strong>
                  </div>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Latence (Ping) : <strong className="text-slate-800">{t.latenceMs} ms</strong></span>
                  <span>Gigue (Jitter) : <strong className="text-slate-800">{t.gigueMs} ms</strong></span>
                  <span>Mesuré le {t.dateHeure}</span>
                </div>
                <p className="text-slate-600 text-[11px] italic bg-slate-50 p-1.5 rounded">{t.observations}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
