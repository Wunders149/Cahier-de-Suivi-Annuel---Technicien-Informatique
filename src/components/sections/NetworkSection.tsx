import React, { useMemo, useState } from 'react';
import {
  EquipementReseau,
  IncidentReseau,
  TestDebitReseau,
} from '../../types/it-tracker';
import {
  Network,
  AlertTriangle,
  Plus,
  Server,
  CheckCircle2,
  Gauge,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import { CrudRowActions } from '../ui/CrudRowActions';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
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
  onShowToast?: (msg: string) => void;
}

const DEFAULT_EQUIPEMENT = (): Partial<EquipementReseau> => ({
  nom: '',
  type: 'Switch',
  marqueModele: '',
  adresseIp: '192.168.10.',
  adresseMac: '',
  localisation: 'Baie Principale',
  vlan: 'VLAN 10',
  portsPoE: '24 ports PoE+',
  firmwareVersion: '',
  etat: 'En ligne',
  dernierReboot: new Date().toISOString().split('T')[0],
  observations: '',
});

const DEFAULT_INCIDENT = (): Partial<IncidentReseau> => ({
  dateHeure: new Date().toISOString().replace('T', ' ').slice(0, 16),
  equipementOuLiaison: '',
  typeIncident: 'Coupure Internet',
  dureeInterruptionMin: 15,
  impactUtilisateurs: 'Quelques postes',
  cause: '',
  actionCorrective: '',
  statut: 'Résolu',
});

const DEFAULT_TEST_DEBIT = (): Partial<TestDebitReseau> => ({
  dateHeure: new Date().toISOString().replace('T', ' ').slice(0, 16),
  ligneConcernee: 'WAN 1 - Fibre Principale',
  debitDescendantMbps: 920,
  debitMontantMbps: 880,
  latenceMs: 8,
  gigueMs: 1,
  statutConformite: 'Conforme SLA',
  observations: 'Mesure conforme au contrat opérateur.',
});

export const NetworkSection: React.FC<NetworkSectionProps> = ({
  equipements,
  incidents,
  testsDebit,
  onUpdateEquipements,
  onUpdateIncidents,
  onUpdateTestsDebit,
  onShowToast,
}) => {
  // 1. CRUD Équipements réseau
  const [eqModalOpen, setEqModalOpen] = useState(false);
  const [editingEqId, setEditingEqId] = useState<string | null>(null);
  const [eqForm, setEqForm] = useState<Partial<EquipementReseau>>(DEFAULT_EQUIPEMENT);
  const [inspectingEqId, setInspectingEqId] = useState<string | null>(null);
  const [deletingEqId, setDeletingEqId] = useState<string | null>(null);

  // 2. CRUD Incidents réseau
  const [incModalOpen, setIncModalOpen] = useState(false);
  const [editingIncId, setEditingIncId] = useState<string | null>(null);
  const [incForm, setIncForm] = useState<Partial<IncidentReseau>>(DEFAULT_INCIDENT);
  const [inspectingIncId, setInspectingIncId] = useState<string | null>(null);
  const [deletingIncId, setDeletingIncId] = useState<string | null>(null);

  // 3. CRUD Tests de débit
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [testForm, setTestForm] = useState<Partial<TestDebitReseau>>(DEFAULT_TEST_DEBIT);
  const [inspectingTestId, setInspectingTestId] = useState<string | null>(null);
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const inspectingEq = useMemo(
    () => equipements.find((e) => e.id === inspectingEqId) || null,
    [equipements, inspectingEqId]
  );
  const deletingEq = useMemo(
    () => equipements.find((e) => e.id === deletingEqId) || null,
    [equipements, deletingEqId]
  );

  const inspectingInc = useMemo(
    () => incidents.find((i) => i.id === inspectingIncId) || null,
    [incidents, inspectingIncId]
  );
  const deletingInc = useMemo(
    () => incidents.find((i) => i.id === deletingIncId) || null,
    [incidents, deletingIncId]
  );

  const inspectingTest = useMemo(
    () => testsDebit.find((t) => t.id === inspectingTestId) || null,
    [testsDebit, inspectingTestId]
  );
  const deletingTest = useMemo(
    () => testsDebit.find((t) => t.id === deletingTestId) || null,
    [testsDebit, deletingTestId]
  );

  // Handlers Équipements
  const openCreateEq = () => {
    setEditingEqId(null);
    setEqForm(DEFAULT_EQUIPEMENT());
    setEqModalOpen(true);
  };

  const openEditEq = (eq: EquipementReseau) => {
    setEditingEqId(eq.id);
    setEqForm({ ...eq });
    setEqModalOpen(true);
  };

  const openDuplicateEq = (eq: EquipementReseau) => {
    setEditingEqId(null);
    setEqForm({ ...eq, id: undefined, nom: `${eq.nom}-BIS` });
    setEqModalOpen(true);
  };

  const handleSaveEq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqForm.nom?.trim()) return;

    const payload: EquipementReseau = {
      id: editingEqId || `NET-EQ-${Date.now()}`,
      nom: eqForm.nom.trim(),
      type: eqForm.type || 'Switch',
      marqueModele: eqForm.marqueModele?.trim() || '',
      adresseIp: eqForm.adresseIp?.trim() || '',
      adresseMac: eqForm.adresseMac?.trim() || '',
      localisation: eqForm.localisation?.trim() || '',
      vlan: eqForm.vlan?.trim() || '',
      portsPoE: eqForm.portsPoE?.trim() || '',
      firmwareVersion: eqForm.firmwareVersion?.trim() || '',
      etat: eqForm.etat || 'En ligne',
      dernierReboot: eqForm.dernierReboot || '',
      observations: eqForm.observations?.trim() || '',
    };

    if (editingEqId) {
      onUpdateEquipements(equipements.map((e) => (e.id === editingEqId ? payload : e)));
      notify('Équipement réseau mis à jour.');
    } else {
      onUpdateEquipements([...equipements, payload]);
      notify('Équipement réseau ajouté.');
    }
    setEqModalOpen(false);
    setEditingEqId(null);
  };

  const handleConfirmDeleteEq = () => {
    if (!deletingEqId) return;
    onUpdateEquipements(equipements.filter((e) => e.id !== deletingEqId));
    if (inspectingEqId === deletingEqId) setInspectingEqId(null);
    setDeletingEqId(null);
    notify('Équipement réseau supprimé.');
  };

  // Handlers Incidents
  const openCreateInc = () => {
    setEditingIncId(null);
    setIncForm(DEFAULT_INCIDENT());
    setIncModalOpen(true);
  };

  const openEditInc = (inc: IncidentReseau) => {
    setEditingIncId(inc.id);
    setIncForm({ ...inc });
    setIncModalOpen(true);
  };

  const handleSaveInc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incForm.equipementOuLiaison?.trim()) return;

    const payload: IncidentReseau = {
      id: editingIncId || `INC-NET-${Date.now()}`,
      dateHeure:
        incForm.dateHeure || new Date().toISOString().replace('T', ' ').slice(0, 16),
      equipementOuLiaison: incForm.equipementOuLiaison.trim(),
      typeIncident: incForm.typeIncident || 'Coupure Internet',
      dureeInterruptionMin: Math.max(0, Number(incForm.dureeInterruptionMin) || 0),
      impactUtilisateurs: incForm.impactUtilisateurs || 'Quelques postes',
      cause: incForm.cause?.trim() || "En cours d'analyse",
      actionCorrective: incForm.actionCorrective?.trim() || 'Intervention effectuée',
      statut: incForm.statut || 'Résolu',
    };

    if (editingIncId) {
      onUpdateIncidents(incidents.map((i) => (i.id === editingIncId ? payload : i)));
      notify('Incident réseau mis à jour.');
    } else {
      onUpdateIncidents([payload, ...incidents]);
      notify('Incident réseau enregistré.');
    }
    setIncModalOpen(false);
    setEditingIncId(null);
  };

  const handleConfirmDeleteInc = () => {
    if (!deletingIncId) return;
    onUpdateIncidents(incidents.filter((i) => i.id !== deletingIncId));
    if (inspectingIncId === deletingIncId) setInspectingIncId(null);
    setDeletingIncId(null);
    notify('Incident réseau supprimé.');
  };

  // Handlers Tests de Débit
  const openCreateTest = () => {
    setEditingTestId(null);
    setTestForm(DEFAULT_TEST_DEBIT());
    setTestModalOpen(true);
  };

  const openEditTest = (test: TestDebitReseau) => {
    setEditingTestId(test.id);
    setTestForm({ ...test });
    setTestModalOpen(true);
  };

  const handleSaveTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.ligneConcernee?.trim()) return;

    const payload: TestDebitReseau = {
      id: editingTestId || `SPD-${Date.now()}`,
      dateHeure:
        testForm.dateHeure || new Date().toISOString().replace('T', ' ').slice(0, 16),
      ligneConcernee: testForm.ligneConcernee.trim(),
      debitDescendantMbps: Math.max(0, Number(testForm.debitDescendantMbps) || 0),
      debitMontantMbps: Math.max(0, Number(testForm.debitMontantMbps) || 0),
      latenceMs: Math.max(0, Number(testForm.latenceMs) || 0),
      gigueMs: Math.max(0, Number(testForm.gigueMs) || 0),
      statutConformite: testForm.statutConformite || 'Conforme SLA',
      observations: testForm.observations?.trim() || '',
    };

    if (editingTestId) {
      onUpdateTestsDebit(testsDebit.map((t) => (t.id === editingTestId ? payload : t)));
      notify('Mesure de débit mise à jour.');
    } else {
      onUpdateTestsDebit([payload, ...testsDebit]);
      notify('Nouveau test de débit enregistré.');
    }
    setTestModalOpen(false);
    setEditingTestId(null);
  };

  const handleConfirmDeleteTest = () => {
    if (!deletingTestId) return;
    onUpdateTestsDebit(testsDebit.filter((t) => t.id !== deletingTestId));
    if (inspectingTestId === deletingTestId) setInspectingTestId(null);
    setDeletingTestId(null);
    notify('Mesure de débit supprimée.');
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
              6
            </span>
            <span>Gestion des Réseaux Informatiques &amp; Télécoms</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Topologie LAN/WAN, plan d&apos;adressage IP, équipements d&apos;interconnexion, registre des incidents et tests de débit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" onClick={openCreateEq} className={secondaryButtonClass}>
            <Plus className="w-4 h-4" />
            <span>Équipement</span>
          </button>
          <button type="button" onClick={openCreateTest} className={secondaryButtonClass}>
            <Gauge className="w-4 h-4" />
            <span>Test Débit</span>
          </button>
          <button type="button" onClick={openCreateInc} className={primaryButtonClass}>
            <Plus className="w-4 h-4" />
            <span>Incident Réseau</span>
          </button>
        </div>
      </div>

      {/* Synthèse Architecture Réseau */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-3 flex items-center gap-2">
          <Network className="w-4 h-4" />
          <span>Synthèse de l&apos;Architecture Réseau &amp; Liaisons Opérateur</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <span className="text-blue-300 block font-semibold">Connexion WAN 1 (Fibre Pro)</span>
            <strong className="text-sm block">Orange Fibre 1 Gbps Symétrique</strong>
            <span className="text-slate-300 block">IP Fixe Publique · SLA GTR 4h</span>
            <span className="text-emerald-400 font-semibold text-[11px]">Ligne Active Principale</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <span className="text-blue-300 block font-semibold">Connexion WAN 2 (Secours SD-WAN)</span>
            <strong className="text-sm block">SFR Fibre Dédiée 500 Mbps</strong>
            <span className="text-slate-300 block">Failover automatique FortiGate</span>
            <span className="text-emerald-400 font-semibold text-[11px]">Redondance Opérationnelle</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1 font-mono tabular-nums text-[11px]">
            <span className="text-blue-300 block font-sans font-semibold text-xs">
              Plan de VLANs &amp; Routage
            </span>
            <span className="block">VLAN 10 : Admin (192.168.10.0/24)</span>
            <span className="block">VLAN 20 : Utilisateurs (192.168.20.0/23)</span>
            <span className="block">VLAN 30 : Wi-Fi Corporate 802.1X</span>
            <span className="block">VLAN 40 : Invités · VLAN 50 : VoIP</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <span className="text-blue-300 block font-semibold">Inventaire Actif</span>
            <strong className="text-lg font-extrabold font-mono tabular-nums text-emerald-400 block">
              {equipements.length} équipement{equipements.length > 1 ? 's' : ''}
            </strong>
            <span className="text-slate-300 block font-mono tabular-nums">
              {incidents.length} incident{incidents.length > 1 ? 's' : ''} · {testsDebit.length}{' '}
              mesure{testsDebit.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* MODALES ÉQUIPEMENT RÉSEAU */}
      <Modal
        isOpen={eqModalOpen}
        onClose={() => setEqModalOpen(false)}
        title={editingEqId ? "Modifier l'équipement réseau" : 'Ajouter un équipement réseau'}
        subtitle="Switch, routeur, firewall, borne Wi-Fi ou équipement cœur de réseau."
        icon={<Server className="w-4 h-4" />}
        size="lg"
        onSubmit={handleSaveEq}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEqModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              {editingEqId ? 'Enregistrer les modifications' : "Ajouter l'équipement"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Identification & Adressage">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Nom d'hôte / Équipement" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: SW-COEUR-01"
                  value={eqForm.nom || ''}
                  onChange={(e) => setEqForm({ ...eqForm, nom: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Type">
                <select
                  value={eqForm.type || 'Switch'}
                  onChange={(e) =>
                    setEqForm({
                      ...eqForm,
                      type: e.target.value as EquipementReseau['type'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Routeur">Routeur</option>
                  <option value="Switch">Switch</option>
                  <option value="Point d'accès Wi-Fi">Point d&apos;accès Wi-Fi</option>
                  <option value="Firewall">Firewall</option>
                  <option value="Onduleur Réseau">Onduleur Réseau</option>
                  <option value="Serveur DHCP/DNS">Serveur DHCP/DNS</option>
                </select>
              </FormField>
              <FormField label="État">
                <select
                  value={eqForm.etat || 'En ligne'}
                  onChange={(e) =>
                    setEqForm({
                      ...eqForm,
                      etat: e.target.value as EquipementReseau['etat'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="En ligne">En ligne</option>
                  <option value="Alerte">Alerte</option>
                  <option value="En maintenance">En maintenance</option>
                  <option value="Hors ligne">Hors ligne</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Marque & Modèle">
                <input
                  type="text"
                  placeholder="Ex: Aruba 2930F 24G"
                  value={eqForm.marqueModele || ''}
                  onChange={(e) => setEqForm({ ...eqForm, marqueModele: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Adresse IP">
                <input
                  type="text"
                  placeholder="192.168.10.2"
                  value={eqForm.adresseIp || ''}
                  onChange={(e) => setEqForm({ ...eqForm, adresseIp: e.target.value })}
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Adresse MAC">
                <input
                  type="text"
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={eqForm.adresseMac || ''}
                  onChange={(e) => setEqForm({ ...eqForm, adresseMac: e.target.value })}
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="2. Topologie & Exploitation" separated>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Localisation physique">
                <input
                  type="text"
                  placeholder="Baie RDC - Rack B"
                  value={eqForm.localisation || ''}
                  onChange={(e) => setEqForm({ ...eqForm, localisation: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="VLAN(s) configuré(s)">
                <input
                  type="text"
                  placeholder="VLAN 10, 20, 30"
                  value={eqForm.vlan || ''}
                  onChange={(e) => setEqForm({ ...eqForm, vlan: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Ports PoE">
                <input
                  type="text"
                  placeholder="18 / 24 utilisés"
                  value={eqForm.portsPoE || ''}
                  onChange={(e) => setEqForm({ ...eqForm, portsPoE: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Version Firmware">
                <input
                  type="text"
                  placeholder="v16.11.0008"
                  value={eqForm.firmwareVersion || ''}
                  onChange={(e) =>
                    setEqForm({ ...eqForm, firmwareVersion: e.target.value })
                  }
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>
              <FormField label="Dernier redémarrage">
                <input
                  type="date"
                  value={eqForm.dernierReboot || ''}
                  onChange={(e) =>
                    setEqForm({ ...eqForm, dernierReboot: e.target.value })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <FormField label="Observations">
              <textarea
                rows={2}
                value={eqForm.observations || ''}
                onChange={(e) => setEqForm({ ...eqForm, observations: e.target.value })}
                className={fieldTextareaClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(inspectingEq)}
        onClose={() => setInspectingEqId(null)}
        title={inspectingEq?.nom || 'Équipement réseau'}
        subtitle={
          inspectingEq
            ? `${inspectingEq.type} · ${inspectingEq.marqueModele} · ${inspectingEq.adresseIp}`
            : undefined
        }
        icon={<Server className="w-4 h-4" />}
        size="md"
        footer={
          inspectingEq && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingEqId(inspectingEq.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold"
              >
                Supprimer
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingEq;
                    setInspectingEqId(null);
                    openDuplicateEq(target);
                  }}
                  className={secondaryButtonClass}
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingEq;
                    setInspectingEqId(null);
                    openEditEq(target);
                  }}
                  className={primaryButtonClass}
                >
                  Modifier
                </button>
              </div>
            </div>
          )
        }
      >
        {inspectingEq && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500">IP / MAC</div>
                <div className="font-mono font-bold text-slate-900">
                  {inspectingEq.adresseIp}
                </div>
                <div className="font-mono text-slate-500 text-[11px]">
                  {inspectingEq.adresseMac || '—'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Localisation &amp; VLAN</div>
                <div className="font-semibold text-slate-900">{inspectingEq.localisation}</div>
                <div className="text-slate-600">{inspectingEq.vlan}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Ports PoE</div>
                <div className="text-slate-800">{inspectingEq.portsPoE || '—'}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Firmware / Reboot</div>
                <div className="font-mono text-slate-800">
                  {inspectingEq.firmwareVersion || '—'} · {inspectingEq.dernierReboot || '—'}
                </div>
              </div>
            </div>
            {inspectingEq.observations && (
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {inspectingEq.observations}
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingEq)}
        onClose={() => setDeletingEqId(null)}
        onConfirm={handleConfirmDeleteEq}
        title="Supprimer cet équipement réseau ?"
        itemLabel={deletingEq?.nom || ''}
        itemMeta={
          deletingEq
            ? `${deletingEq.type} · ${deletingEq.adresseIp} · ${deletingEq.localisation}`
            : undefined
        }
      />

      {/* MODALES INCIDENT RÉSEAU */}
      <Modal
        isOpen={incModalOpen}
        onClose={() => setIncModalOpen(false)}
        title={editingIncId ? "Modifier l'incident réseau" : 'Consigner un incident réseau'}
        subtitle="Enregistrez une coupure, dégradation de liaison ou anomalie Wi-Fi / LAN."
        icon={<AlertTriangle className="w-4 h-4" />}
        tone="amber"
        size="lg"
        onSubmit={handleSaveInc}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIncModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              {editingIncId ? 'Enregistrer les modifications' : "Enregistrer l'incident"}
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
                  value={incForm.dateHeure || ''}
                  onChange={(e) => setIncForm({ ...incForm, dateHeure: e.target.value })}
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Équipement ou liaison concernée" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: Switch SW-ACCES-02 ou Fibre WAN"
                  value={incForm.equipementOuLiaison || ''}
                  onChange={(e) =>
                    setIncForm({ ...incForm, equipementOuLiaison: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Type d'incident">
                <select
                  value={incForm.typeIncident || 'Coupure Internet'}
                  onChange={(e) =>
                    setIncForm({
                      ...incForm,
                      typeIncident: e.target.value as IncidentReseau['typeIncident'],
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
                  value={incForm.dureeInterruptionMin ?? 0}
                  onChange={(e) =>
                    setIncForm({
                      ...incForm,
                      dureeInterruptionMin: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Impact utilisateurs">
                <select
                  value={incForm.impactUtilisateurs || 'Quelques postes'}
                  onChange={(e) =>
                    setIncForm({
                      ...incForm,
                      impactUtilisateurs: e.target.value as IncidentReseau['impactUtilisateurs'],
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
                value={incForm.cause || ''}
                onChange={(e) => setIncForm({ ...incForm, cause: e.target.value })}
                className={fieldTextareaClass}
              />
            </FormField>

            <FormField label="Action corrective appliquée" required>
              <textarea
                rows={2}
                required
                placeholder="Réparation, reconfiguration, changement de port..."
                value={incForm.actionCorrective || ''}
                onChange={(e) =>
                  setIncForm({ ...incForm, actionCorrective: e.target.value })
                }
                className={fieldTextareaClass}
              />
            </FormField>

            <FormField label="Statut actuel de l'incident">
              <select
                value={incForm.statut || 'Résolu'}
                onChange={(e) =>
                  setIncForm({
                    ...incForm,
                    statut: e.target.value as IncidentReseau['statut'],
                  })
                }
                className={fieldSelectClass}
              >
                <option value="Résolu">Résolu</option>
                <option value="En investigation">En investigation</option>
                <option value="Ticket FAI ouvert">Ticket FAI ouvert</option>
              </select>
            </FormField>
          </FormSection>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(inspectingInc)}
        onClose={() => setInspectingIncId(null)}
        title={inspectingInc?.equipementOuLiaison || 'Incident réseau'}
        subtitle={
          inspectingInc
            ? `${inspectingInc.dateHeure} · ${inspectingInc.typeIncident} · ${inspectingInc.dureeInterruptionMin} min`
            : undefined
        }
        icon={<AlertTriangle className="w-4 h-4" />}
        tone="amber"
        size="md"
        footer={
          inspectingInc && (
            <div className="w-full flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingIncId(inspectingInc.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold"
              >
                Supprimer
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = inspectingInc;
                  setInspectingIncId(null);
                  openEditInc(target);
                }}
                className={primaryButtonClass}
              >
                Modifier
              </button>
            </div>
          )
        }
      >
        {inspectingInc && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span>
                Impact : <strong>{inspectingInc.impactUtilisateurs}</strong>
              </span>
              <span className="font-semibold text-emerald-700">{inspectingInc.statut}</span>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Cause racine
              </h4>
              <p className="text-slate-800 whitespace-pre-line">{inspectingInc.cause}</p>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Action corrective
              </h4>
              <p className="text-emerald-950 bg-emerald-50 border border-emerald-200 p-3 rounded-lg whitespace-pre-line">
                {inspectingInc.actionCorrective}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingInc)}
        onClose={() => setDeletingIncId(null)}
        onConfirm={handleConfirmDeleteInc}
        title="Supprimer cet incident réseau ?"
        itemLabel={deletingInc?.equipementOuLiaison || ''}
        itemMeta={
          deletingInc ? `${deletingInc.dateHeure} · ${deletingInc.typeIncident}` : undefined
        }
      />

      {/* MODALES TEST DE DÉBIT */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title={
          editingTestId ? 'Modifier la mesure de débit' : 'Enregistrer un test de débit SLA'
        }
        subtitle="Mesure périodique des performances WAN/LAN (Descendant, Montant, Latence, Gigue)."
        icon={<Gauge className="w-4 h-4" />}
        size="md"
        onSubmit={handleSaveTest}
        footer={
          <>
            <button
              type="button"
              onClick={() => setTestModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              {editingTestId ? 'Enregistrer les modifications' : 'Enregistrer la mesure'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormSection title="1. Liaison & Horodatage">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Ligne ou liaison testée" required>
                <input
                  type="text"
                  required
                  value={testForm.ligneConcernee || ''}
                  onChange={(e) =>
                    setTestForm({ ...testForm, ligneConcernee: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Date & heure">
                <input
                  type="text"
                  value={testForm.dateHeure || ''}
                  onChange={(e) => setTestForm({ ...testForm, dateHeure: e.target.value })}
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="2. Mesures relevées" separated>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FormField label="Descendant (Mbps)">
                <input
                  type="number"
                  min={0}
                  value={testForm.debitDescendantMbps ?? 0}
                  onChange={(e) =>
                    setTestForm({
                      ...testForm,
                      debitDescendantMbps: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Montant (Mbps)">
                <input
                  type="number"
                  min={0}
                  value={testForm.debitMontantMbps ?? 0}
                  onChange={(e) =>
                    setTestForm({
                      ...testForm,
                      debitMontantMbps: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Latence (ms)">
                <input
                  type="number"
                  min={0}
                  value={testForm.latenceMs ?? 0}
                  onChange={(e) =>
                    setTestForm({ ...testForm, latenceMs: parseFloat(e.target.value) || 0 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Gigue (ms)">
                <input
                  type="number"
                  min={0}
                  value={testForm.gigueMs ?? 0}
                  onChange={(e) =>
                    setTestForm({ ...testForm, gigueMs: parseFloat(e.target.value) || 0 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <FormField label="Conformité SLA">
              <select
                value={testForm.statutConformite || 'Conforme SLA'}
                onChange={(e) =>
                  setTestForm({
                    ...testForm,
                    statutConformite: e.target.value as TestDebitReseau['statutConformite'],
                  })
                }
                className={fieldSelectClass}
              >
                <option value="Conforme SLA">Conforme SLA</option>
                <option value="Dégradé">Dégradé</option>
                <option value="Anormalement bas">Anormalement bas</option>
              </select>
            </FormField>

            <FormField label="Observations">
              <input
                type="text"
                value={testForm.observations || ''}
                onChange={(e) =>
                  setTestForm({ ...testForm, observations: e.target.value })
                }
                className={fieldInputClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(inspectingTest)}
        onClose={() => setInspectingTestId(null)}
        title={inspectingTest?.ligneConcernee || 'Test de débit'}
        subtitle={inspectingTest ? `Mesuré le ${inspectingTest.dateHeure}` : undefined}
        icon={<Gauge className="w-4 h-4" />}
        size="sm"
        footer={
          inspectingTest && (
            <div className="w-full flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingTestId(inspectingTest.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold"
              >
                Supprimer
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = inspectingTest;
                  setInspectingTestId(null);
                  openEditTest(target);
                }}
                className={primaryButtonClass}
              >
                Modifier
              </button>
            </div>
          )
        }
      >
        {inspectingTest && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono tabular-nums">
              <div>
                <div className="text-[11px] font-sans text-slate-500">Descendant</div>
                <strong className="text-blue-700 text-base">
                  {inspectingTest.debitDescendantMbps} Mbps
                </strong>
              </div>
              <div>
                <div className="text-[11px] font-sans text-slate-500">Montant</div>
                <strong className="text-indigo-700 text-base">
                  {inspectingTest.debitMontantMbps} Mbps
                </strong>
              </div>
              <div>
                <div className="text-[11px] font-sans text-slate-500">Latence / Gigue</div>
                <strong className="text-slate-900">
                  {inspectingTest.latenceMs} ms / {inspectingTest.gigueMs} ms
                </strong>
              </div>
              <div>
                <div className="text-[11px] font-sans text-slate-500">Statut SLA</div>
                <strong className="text-emerald-700">{inspectingTest.statutConformite}</strong>
              </div>
            </div>
            <p className="text-slate-700">{inspectingTest.observations || 'Aucune note.'}</p>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingTest)}
        onClose={() => setDeletingTestId(null)}
        onConfirm={handleConfirmDeleteTest}
        title="Supprimer cette mesure de débit ?"
        itemLabel={deletingTest?.ligneConcernee || ''}
        itemMeta={
          deletingTest
            ? `${deletingTest.dateHeure} · ${deletingTest.debitDescendantMbps} / ${deletingTest.debitMontantMbps} Mbps`
            : undefined
        }
      />

      {/* Tableau des équipements réseau */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            <span>Inventaire &amp; Configuration des Équipements Réseau ({equipements.length})</span>
          </h3>
          <button
            type="button"
            onClick={openCreateEq}
            className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
          >
            + Ajouter un équipement
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 font-semibold whitespace-nowrap">Nom &amp; Type</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Marque &amp; Modèle</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Adresse IP &amp; MAC</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Localisation &amp; VLAN</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Ports PoE</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Firmware</th>
                  <th className="p-3 font-semibold whitespace-nowrap">État</th>
                  <th className="p-3 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {equipements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="space-y-2">
                        <p className="text-slate-600 font-medium">
                          Aucun équipement réseau enregistré.
                        </p>
                        <button
                          type="button"
                          onClick={openCreateEq}
                          className={secondaryButtonClass}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter un équipement réseau</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  equipements.map((eq) => (
                    <tr key={eq.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectingEqId(eq.id)}
                          className="text-left text-slate-900 hover:text-blue-700 font-semibold block"
                        >
                          {eq.nom}
                        </button>
                        <span className="text-[11px] text-blue-700 font-medium">{eq.type}</span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="text-slate-800">{eq.marqueModele}</span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums text-[11px]">
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
                      <td className="p-3 align-top text-[11px] whitespace-nowrap font-mono tabular-nums">
                        <span className="text-slate-800">{eq.firmwareVersion}</span>
                        <span className="text-slate-400 block text-[10px]">
                          Reboot: {eq.dernierReboot}
                        </span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {eq.etat}
                        </span>
                      </td>
                      <td className="p-3 align-top text-right whitespace-nowrap">
                        <CrudRowActions
                          onView={() => setInspectingEqId(eq.id)}
                          onEdit={() => openEditEq(eq)}
                          onDuplicate={() => openDuplicateEq(eq)}
                          onDelete={() => setDeletingEqId(eq.id)}
                        />
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Registre des Incidents de Connectivité Réseau ({incidents.length})</span>
          </h3>
          <button
            type="button"
            onClick={openCreateInc}
            className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
          >
            + Déclarer un incident
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 font-semibold whitespace-nowrap">Date &amp; Heure</th>
                  <th className="p-3 font-semibold">Liaison / Équipement</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Type d&apos;incident</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Durée &amp; Impact</th>
                  <th className="p-3 font-semibold">Cause Racine</th>
                  <th className="p-3 font-semibold">Action Corrective</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Statut</th>
                  <th className="p-3 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="space-y-2">
                        <p className="text-slate-600 font-medium">
                          Aucun incident de connectivité réseau consigné.
                        </p>
                        <button
                          type="button"
                          onClick={openCreateInc}
                          className={secondaryButtonClass}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Consigner un incident réseau</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums font-medium text-slate-900">
                        {inc.dateHeure}
                      </td>
                      <td className="p-3 align-top font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={() => setInspectingIncId(inc.id)}
                          className="text-left hover:text-blue-700"
                        >
                          {inc.equipementOuLiaison}
                        </button>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                          {inc.typeIncident}
                        </span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums">
                        <span className="font-bold text-slate-800">
                          {inc.dureeInterruptionMin} min
                        </span>
                        <span className="text-slate-400 font-sans block text-[11px]">
                          Impact: {inc.impactUtilisateurs}
                        </span>
                      </td>
                      <td className="p-3 align-top text-slate-700 max-w-xs">{inc.cause}</td>
                      <td className="p-3 align-top text-emerald-900 bg-emerald-50/40 max-w-xs">
                        {inc.actionCorrective}
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          {inc.statut}
                        </span>
                      </td>
                      <td className="p-3 align-top text-right whitespace-nowrap">
                        <CrudRowActions
                          onView={() => setInspectingIncId(inc.id)}
                          onEdit={() => openEditInc(inc)}
                          onDelete={() => setDeletingIncId(inc.id)}
                        />
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600" />
            <span>Mesures de Performance &amp; Tests de Débit Périodiques ({testsDebit.length})</span>
          </h3>
          <button
            type="button"
            onClick={openCreateTest}
            className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
          >
            + Ajouter une mesure
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {testsDebit.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
              <p className="text-slate-600 text-xs font-medium">
                Aucune mesure de débit enregistrée.
              </p>
              <button
                type="button"
                onClick={openCreateTest}
                className={secondaryButtonClass}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un test de débit</span>
              </button>
            </div>
          ) : (
            testsDebit.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <button
                    type="button"
                    onClick={() => setInspectingTestId(t.id)}
                    className="font-bold text-slate-900 hover:text-blue-700 text-sm text-left truncate"
                  >
                    {t.ligneConcernee}
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                      {t.statutConformite}
                    </span>
                    <CrudRowActions
                      compact
                      onView={() => setInspectingTestId(t.id)}
                      onEdit={() => openEditTest(t)}
                      onDelete={() => setDeletingTestId(t.id)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center py-2 bg-slate-50 rounded-lg font-mono tabular-nums">
                  <div>
                    <span className="text-slate-400 font-sans text-[10px] block uppercase">
                      Débit Descendant
                    </span>
                    <strong className="text-base text-blue-700 font-extrabold">
                      {t.debitDescendantMbps} Mbps
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans text-[10px] block uppercase">
                      Débit Montant
                    </span>
                    <strong className="text-base text-indigo-700 font-extrabold">
                      {t.debitMontantMbps} Mbps
                    </strong>
                  </div>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono tabular-nums">
                  <span>
                    Latence : <strong className="text-slate-800">{t.latenceMs} ms</strong>
                  </span>
                  <span>
                    Gigue : <strong className="text-slate-800">{t.gigueMs} ms</strong>
                  </span>
                  <span>{t.dateHeure}</span>
                </div>
                {t.observations && (
                  <p className="text-slate-600 text-[11px] italic bg-slate-50 p-1.5 rounded">
                    {t.observations}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
