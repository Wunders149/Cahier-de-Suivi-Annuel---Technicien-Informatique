import {
  ArticleConsommable,
  CahierSuiviData,
  DemandeAchat,
  EquipementParc,
  EquipementReseau,
  FicheIntervention,
  InterventionType,
  ItemMaintenance,
  LogicielLicence,
  TacheJournal,
} from '../types/it-tracker';
import { estimateWorkbookSizeBytes, normalizeWorkbookData } from './backupService';

/**
 * Référentiel complet des endpoints exposés par l'application serveur SOGEDIPROMA · Gestion informatique
 */
export interface SogedipromaEndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  category:
    | 'Authentification'
    | 'Snapshot Global'
    | 'Consommables & Achats'
    | 'Audit & Sauvegardes'
    | 'Coffre & Sécurité';
  description: string;
  payloadHint?: string;
}

export const SOGEDIPROMA_ENDPOINTS: SogedipromaEndpointSpec[] = [
  {
    method: 'GET',
    path: '/api/status',
    category: 'Authentification',
    description: 'État du serveur, configuration initiale requise et statut authentifié.',
    payloadHint: '{ needsSetup, mailConfigured, settings, authenticated }',
  },
  {
    method: 'POST',
    path: '/api/login',
    category: 'Authentification',
    description: 'Ouverture de session HTTP (cookie de session) + snapshot initial.',
    payloadHint: 'Body: { username, password } → { revision, data, user }',
  },
  {
    method: 'POST',
    path: '/api/logout',
    category: 'Authentification',
    description: 'Fermeture propre de la session serveur.',
  },
  {
    method: 'GET',
    path: '/api/state',
    category: 'Snapshot Global',
    description:
      'Endpoint principal retournant toutes les listes : inventory (consommables), purchases (achats), assets (matériels & équipements), employees, departments, suppliers, tickets, workLogs, maintenance, subscriptions, budgets, itTracking, accesses.',
    payloadHint: '{ revision, user, data: { settings, inventory[], purchases[], assets[], ... } }',
  },
  {
    method: 'PUT',
    path: '/api/state',
    category: 'Snapshot Global',
    description: 'Synchronisation différentielle multi-utilisateurs avec gestion de révision.',
    payloadHint: 'Body: { revision, operations }',
  },
  {
    method: 'POST',
    path: '/api/inventory/movements',
    category: 'Consommables & Achats',
    description: 'Enregistrement d’une entrée ou sortie de stock sur un consommable.',
    payloadHint: 'Body: { id, itemId, type: "Entrée"|"Sortie", quantity, date, reason, reference, assignedEmployeeId, departmentId }',
  },
  {
    method: 'DELETE',
    path: '/api/inventory/:id',
    category: 'Consommables & Achats',
    description: 'Suppression unitaire d’un article de stock/consommable.',
  },
  {
    method: 'POST',
    path: '/api/inventory/bulk-delete',
    category: 'Consommables & Achats',
    description: 'Suppression groupée d’articles de stock.',
    payloadHint: 'Body: { ids: string[] }',
  },
  {
    method: 'POST',
    path: '/api/purchases',
    category: 'Consommables & Achats',
    description: 'Création et réception immédiate d’un achat (incrémente automatiquement le stock).',
    payloadHint: 'Body: { purchase: { id, ref, itemId, supplierId, quantity, unitPrice, date, budgetId, departmentId, notes } }',
  },
  {
    method: 'PUT',
    path: '/api/purchases/:id',
    category: 'Consommables & Achats',
    description: 'Mise à jour d’un achat existant.',
  },
  {
    method: 'DELETE',
    path: '/api/purchases/:id',
    category: 'Consommables & Achats',
    description: 'Suppression d’un achat (avec mouvement d’annulation de stock si déjà reçu).',
  },
  {
    method: 'GET',
    path: '/api/backup',
    category: 'Audit & Sauvegardes',
    description: 'Téléchargement du snapshot JSON complet exportable hors ligne (administrateur).',
    payloadHint: '{ app: "SOGEDIPROMA-IT", version: 2, data, audit }',
  },
  {
    method: 'POST',
    path: '/api/restore',
    category: 'Audit & Sauvegardes',
    description: 'Restauration d’un snapshot complet JSON sur le serveur SOGEDIPROMA.',
  },
  {
    method: 'GET',
    path: '/api/audit',
    category: 'Audit & Sauvegardes',
    description: 'Historique complet des créations, modifications et suppressions (administrateur).',
    payloadHint: '{ entries: AuditEntry[] }',
  },
  {
    method: 'POST',
    path: '/api/notifications/test',
    category: 'Audit & Sauvegardes',
    description: 'Envoi d’un e-mail de test SMTP si configuré sur le serveur.',
  },
];

export interface SogedipromaMovement {
  id: string;
  type: 'Entrée' | 'Sortie' | string;
  quantity: number;
  date: string;
  reason?: string;
  reference?: string;
  departmentId?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  user?: string;
}

export interface SogedipromaInventoryItem {
  id: string;
  name: string;
  sku?: string;
  type?: string;
  category?: string;
  quantity?: number;
  minQty?: number;
  unit?: string;
  unitCost?: number;
  location?: string;
  departmentId?: string;
  departmentName?: string;
  supplierId?: string;
  supplierName?: string;
  budgetId?: string;
  budgetName?: string;
  notes?: string;
  movements?: SogedipromaMovement[];
}

export interface SogedipromaPurchase {
  id: string;
  ref?: string;
  supplierId?: string;
  supplierName?: string;
  itemId?: string;
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  date?: string;
  budgetId?: string;
  budgetName?: string;
  departmentId?: string;
  departmentName?: string;
  status?: string;
  receivedApplied?: boolean;
  notes?: string;
}

export interface SogedipromaAsset {
  id: string;
  name: string;
  assetTag?: string;
  category?: string;
  brand?: string;
  model?: string;
  serial?: string;
  employeeId?: string;
  employeeName?: string;
  departmentId?: string;
  departmentName?: string;
  status?: string;
  location?: string;
  purchaseDate?: string;
  warrantyEnd?: string;
  purchasePrice?: number;
  supplierId?: string;
  supplierName?: string;
  budgetId?: string;
  budgetName?: string;
  hasPhoto?: boolean;
  notes?: string;
}

export interface SogedipromaEmployee {
  id: string;
  name: string;
  department?: string;
  departmentId?: string;
  email?: string;
  phone?: string;
  location?: string;
  status?: string;
}

export interface SogedipromaDepartment {
  id: string;
  name: string;
  code?: string;
  manager?: string;
  location?: string;
}

export interface SogedipromaSupplier {
  id: string;
  name: string;
  category?: string;
  contact?: string;
  email?: string;
  phone?: string;
  city?: string;
}

export interface SogedipromaTicket {
  id: string;
  ref?: string;
  title: string;
  requesterId?: string;
  requesterName?: string;
  departmentId?: string;
  departmentName?: string;
  technicianId?: string;
  category?: string;
  priority?: string;
  status?: string;
  technician?: string;
  openedAt?: string;
  dueAt?: string;
  description?: string;
}

export interface SogedipromaWorkLog {
  id: string;
  date: string;
  technician?: string;
  technicianId?: string;
  departmentId?: string;
  departmentName?: string;
  title: string;
  category?: string;
  description?: string;
  result?: string;
  durationHours?: number;
  status?: string;
}

export interface SogedipromaMaintenance {
  id: string;
  assetId?: string;
  assetName?: string;
  assetTag?: string;
  assetCategory?: string;
  type?: string;
  plannedAt?: string;
  status?: string;
  provider?: string;
  employeeId?: string;
  employeeName?: string;
  departmentId?: string;
  cost?: number;
  budgetId?: string;
  notes?: string;
}

export interface SogedipromaSubscription {
  id: string;
  name: string;
  provider?: string;
  plan?: string;
  category?: string;
  amount?: number;
  billingCycle?: string;
  startDate?: string;
  renewalDate?: string;
  owner?: string;
  autoRenew?: string;
  status?: string;
  notes?: string;
}

export interface SogedipromaItTrackingItem {
  id: string;
  type?: string;
  name?: string;
  publisher?: string;
  category?: string;
  version?: string;
  licenseCount?: number;
  notes?: string;
}

export interface SogedipromaBudget {
  id: string;
  name: string;
  category?: string;
  fiscalYear?: number;
  allocated?: number;
}

export interface SogedipromaSettings {
  company?: string;
  currency?: string;
  supportEmail?: string;
  defaultLocation?: string;
}

export interface SogedipromaStateData {
  exportDate?: string;
  settings?: SogedipromaSettings;
  inventory?: SogedipromaInventoryItem[];
  purchases?: SogedipromaPurchase[];
  assets?: SogedipromaAsset[];
  employees?: SogedipromaEmployee[];
  departments?: SogedipromaDepartment[];
  suppliers?: SogedipromaSupplier[];
  tickets?: SogedipromaTicket[];
  workLogs?: SogedipromaWorkLog[];
  maintenance?: SogedipromaMaintenance[];
  subscriptions?: SogedipromaSubscription[];
  itTracking?: SogedipromaItTrackingItem[];
  budgets?: SogedipromaBudget[];
}

export type SogedipromaSyncModuleKey =
  | 'consommables'
  | 'demandesAchat'
  | 'parcEquipements'
  | 'reseauEquipements'
  | 'maintenances'
  | 'interventions'
  | 'journalTaches'
  | 'logicielsLicences';

export interface SogedipromaMappedDelta {
  companyMeta: {
    company: string;
    defaultLocation: string;
    supportEmail: string;
    currency: string;
    exportDate?: string;
    employeesCount: number;
    departmentsCount: number;
    suppliersCount: number;
  };
  consommables: ArticleConsommable[];
  demandesAchat: DemandeAchat[];
  parcEquipements: EquipementParc[];
  reseauEquipements: EquipementReseau[];
  maintenances: ItemMaintenance[];
  interventions: FicheIntervention[];
  journalTaches: TacheJournal[];
  logicielsLicences: LogicielLicence[];
}

function buildNormalizedKeyMap(rec: Record<string, unknown>): Map<string, unknown> {
  const map = new Map<string, unknown>();
  Object.entries(rec).forEach(([k, v]) => {
    const normalized = k.replace(/[\u2018\u2019]/g, "'").trim().toLowerCase();
    map.set(normalized, v);
  });
  return map;
}

function pickStr(map: Map<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const normalized = key.replace(/[\u2018\u2019]/g, "'").trim().toLowerCase();
    const val = map.get(normalized);
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.length > 0) return trimmed;
    } else if (typeof val === 'number' && Number.isFinite(val)) {
      return String(val);
    }
  }
  return undefined;
}

function pickNum(map: Map<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const normalized = key.replace(/[\u2018\u2019]/g, "'").trim().toLowerCase();
    const val = map.get(normalized);
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const n = Number(val.replace(/\s+/g, '').replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function normalizeSogedipromaAsset(raw: unknown, idx: number): SogedipromaAsset | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  // Format natif /api/state
  if (typeof rec.id === 'string' && typeof rec.name === 'string') {
    return raw as SogedipromaAsset;
  }
  // Format export combiné à clés françaises (ex: sogediproma-combined-*.json)
  const map = buildNormalizedKeyMap(rec);
  const id = pickStr(map, 'id') || `asset-${idx}`;
  const name = pickStr(map, 'name', 'matériel', 'materiel', 'designation', 'désignation') || 'Matériel IT';
  return {
    id,
    name,
    assetTag: pickStr(map, 'assettag', "code d'inventaire", 'code', 'reference', 'référence'),
    category: pickStr(map, 'category', 'catégorie', 'categorie'),
    brand: pickStr(map, 'brand', 'marque'),
    model: pickStr(map, 'model', 'modèle', 'modele'),
    serial: pickStr(map, 'serial', 'numéro de série', 'numero de serie'),
    employeeId: pickStr(map, 'employeeid'),
    employeeName: pickStr(map, 'employeename', 'utilisateur affecté', 'utilisateur affecte', 'utilisateur'),
    departmentId: pickStr(map, 'departmentid'),
    departmentName: pickStr(map, 'departmentname', 'département', 'departement', 'service'),
    status: pickStr(map, 'status', 'état', 'etat'),
    location: pickStr(map, 'location', 'emplacement'),
    purchaseDate: pickStr(map, 'purchasedate', "date d'achat"),
    warrantyEnd: pickStr(map, 'warrantyend', 'fin de garantie'),
    purchasePrice: pickNum(map, 'purchaseprice', "valeur d'achat", 'prix'),
    supplierId: pickStr(map, 'supplierid'),
    supplierName: pickStr(map, 'suppliername', 'fournisseur'),
    budgetId: pickStr(map, 'budgetid'),
    budgetName: pickStr(map, 'budgetname', 'budget associé', 'budget associe'),
    notes: pickStr(map, 'notes', 'note', 'observations'),
  };
}

function normalizeSogedipromaInventoryItem(raw: unknown, idx: number): SogedipromaInventoryItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.id === 'string' && typeof rec.name === 'string') {
    return raw as SogedipromaInventoryItem;
  }
  const map = buildNormalizedKeyMap(rec);
  const id = pickStr(map, 'id') || `inv-${idx}`;
  const name = pickStr(map, 'name', 'article', 'designation', 'désignation') || 'Article sans nom';
  return {
    id,
    name,
    sku: pickStr(map, 'sku', 'code / référence', 'code / reference', 'reference', 'référence', 'code'),
    type: pickStr(map, 'type'),
    category: pickStr(map, 'category', 'catégorie', 'categorie'),
    quantity: pickNum(map, 'quantity', 'quantité', 'quantite') ?? 0,
    minQty: pickNum(map, 'minqty', 'seuil minimum', 'seuil') ?? 0,
    unit: pickStr(map, 'unit', 'unité', 'unite'),
    unitCost: pickNum(map, 'unitcost', 'coût unitaire', 'cout unitaire'),
    location: pickStr(map, 'location', 'emplacement'),
    departmentId: pickStr(map, 'departmentid'),
    departmentName: pickStr(map, 'departmentname', 'département', 'departement'),
    supplierId: pickStr(map, 'supplierid'),
    supplierName: pickStr(map, 'suppliername', 'fournisseur'),
    budgetId: pickStr(map, 'budgetid'),
    budgetName: pickStr(map, 'budgetname', 'budget associé', 'budget associe'),
    notes: pickStr(map, 'notes', 'note', 'observations'),
    movements: Array.isArray(rec.movements) ? (rec.movements as SogedipromaMovement[]) : undefined,
  };
}

function normalizeSogedipromaPurchase(raw: unknown, idx: number): SogedipromaPurchase | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.id === 'string' && (typeof rec.ref === 'string' || typeof rec.itemId === 'string')) {
    return raw as SogedipromaPurchase;
  }
  const map = buildNormalizedKeyMap(rec);
  const id = pickStr(map, 'id') || `purchase-${idx}`;
  const status = pickStr(map, 'status', 'statut', 'état', 'etat');
  return {
    id,
    ref: pickStr(map, 'ref', 'référence de commande', 'reference de commande', 'référence', 'reference', 'code'),
    supplierId: pickStr(map, 'supplierid'),
    supplierName: pickStr(map, 'suppliername', 'fournisseur'),
    itemId: pickStr(map, 'itemid'),
    itemName: pickStr(map, 'itemname', 'article de stock', 'article', 'désignation', 'designation'),
    quantity: pickNum(map, 'quantity', 'quantité', 'quantite') ?? 1,
    unitPrice: pickNum(map, 'unitprice', 'prix unitaire', 'pu', 'coût unitaire', 'cout unitaire') ?? 0,
    date: pickStr(map, 'date', 'date de commande'),
    budgetId: pickStr(map, 'budgetid'),
    budgetName: pickStr(map, 'budgetname', 'budget associé', 'budget associe'),
    departmentId: pickStr(map, 'departmentid'),
    departmentName: pickStr(map, 'departmentname', 'département', 'departement', 'service'),
    status,
    receivedApplied: typeof rec.receivedApplied === 'boolean' ? rec.receivedApplied : status === 'Reçu',
    notes: pickStr(map, 'notes', 'note', 'observations'),
  };
}

function detectArrayCollectionType(
  arr: unknown[]
): 'assets' | 'inventory' | 'purchases' | 'tickets' | null {
  const firstObj = arr.find((item) => item && typeof item === 'object' && !Array.isArray(item)) as
    | Record<string, unknown>
    | undefined;
  if (!firstObj) return null;

  const map = buildNormalizedKeyMap(firstObj);
  const rawId = (pickStr(map, 'id') || '').toLowerCase();

  if (
    rawId.startsWith('ass-') ||
    map.has('matériel') ||
    map.has('materiel') ||
    map.has("code d'inventaire") ||
    map.has('assettag') ||
    map.has('numéro de série') ||
    map.has('numero de serie') ||
    map.has('serial')
  ) {
    return 'assets';
  }

  if (
    rawId.startsWith('inv-') ||
    map.has('article') ||
    map.has('seuil minimum') ||
    map.has('minqty') ||
    map.has('sku') ||
    map.has('code / référence')
  ) {
    return 'inventory';
  }

  if (
    rawId.startsWith('pur-') ||
    map.has('référence de commande') ||
    map.has('reference de commande') ||
    map.has('article de stock') ||
    map.has('itemid') ||
    map.has('unitprice')
  ) {
    return 'purchases';
  }

  if (rawId.startsWith('tic-') || (map.has('priority') && map.has('openedat'))) {
    return 'tickets';
  }

  return null;
}

export function parseSogedipromaJsonPayload(rawJsonText: string): {
  success: boolean;
  data?: SogedipromaStateData;
  revision?: number;
  error?: string;
} {
  try {
    const parsedRaw = JSON.parse(rawJsonText) as unknown;
    if (!parsedRaw || typeof parsedRaw !== 'object') {
      return { success: false, error: 'Le document JSON ne contient pas un objet ou tableau valide.' };
    }

    // Cas 1 : Export autonome sous forme de tableau JSON racine (ex: sogediproma-assets-*.json)
    if (Array.isArray(parsedRaw)) {
      const detectedType = detectArrayCollectionType(parsedRaw);
      if (!detectedType) {
        return {
          success: false,
          error:
            'Tableau JSON non reconnu. Utilisez un export SOGEDIPROMA (assets, inventory ou purchases).',
        };
      }

      const normalizedData: SogedipromaStateData = {};
      if (detectedType === 'assets') {
        const assets = parsedRaw
          .map((a, idx) => normalizeSogedipromaAsset(a, idx))
          .filter((a): a is SogedipromaAsset => Boolean(a));
        normalizedData.assets = assets;
        const maxDate = assets
          .map((a) => a.purchaseDate)
          .filter((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}/.test(d)))
          .sort()
          .pop();
        if (maxDate) normalizedData.exportDate = maxDate;
      } else if (detectedType === 'inventory') {
        normalizedData.inventory = parsedRaw
          .map((i, idx) => normalizeSogedipromaInventoryItem(i, idx))
          .filter((i): i is SogedipromaInventoryItem => Boolean(i));
      } else if (detectedType === 'purchases') {
        normalizedData.purchases = parsedRaw
          .map((p, idx) => normalizeSogedipromaPurchase(p, idx))
          .filter((p): p is SogedipromaPurchase => Boolean(p));
      } else if (detectedType === 'tickets') {
        normalizedData.tickets = parsedRaw as SogedipromaTicket[];
      }

      return {
        success: true,
        data: normalizedData,
      };
    }

    const parsed = parsedRaw as Record<string, unknown>;

    // Cas 2 : /api/backup ou /api/state ({ app: "SOGEDIPROMA-IT", data: { ... }, revision? })
    // OU Format export combiné ({ export_date, summary, assets: [...], inventory: [...] })
    const rawCandidate =
      parsed.data && typeof parsed.data === 'object'
        ? (parsed.data as Record<string, unknown>)
        : parsed;

    const rawAssets = Array.isArray(rawCandidate.assets)
      ? rawCandidate.assets
      : Array.isArray(rawCandidate.materiels)
      ? rawCandidate.materiels
      : undefined;

    const rawInventory = Array.isArray(rawCandidate.inventory)
      ? rawCandidate.inventory
      : Array.isArray(rawCandidate.consommables)
      ? rawCandidate.consommables
      : undefined;

    const rawPurchases = Array.isArray(rawCandidate.purchases)
      ? rawCandidate.purchases
      : Array.isArray(rawCandidate.achats)
      ? rawCandidate.achats
      : undefined;

    const hasKnownCollections =
      Array.isArray(rawInventory) ||
      Array.isArray(rawPurchases) ||
      Array.isArray(rawAssets) ||
      Array.isArray(rawCandidate.tickets) ||
      Array.isArray(rawCandidate.workLogs) ||
      Array.isArray(rawCandidate.maintenance) ||
      Array.isArray(rawCandidate.subscriptions);

    if (!hasKnownCollections) {
      return {
        success: false,
        error:
          'Format SOGEDIPROMA non reconnu. Utilisez un export /api/backup, un export combiné ou matériels SOGEDIPROMA (.json), une réponse /api/state ou une connexion directe.',
      };
    }

    const normalizedData: SogedipromaStateData = {
      ...(rawCandidate as SogedipromaStateData),
      exportDate:
        typeof parsed.export_date === 'string'
          ? parsed.export_date
          : typeof rawCandidate.exportDate === 'string'
          ? rawCandidate.exportDate
          : undefined,
      assets: rawAssets
        ? rawAssets
            .map((a, idx) => normalizeSogedipromaAsset(a, idx))
            .filter((a): a is SogedipromaAsset => Boolean(a))
        : undefined,
      inventory: rawInventory
        ? rawInventory
            .map((i, idx) => normalizeSogedipromaInventoryItem(i, idx))
            .filter((i): i is SogedipromaInventoryItem => Boolean(i))
        : undefined,
      purchases: rawPurchases
        ? rawPurchases
            .map((p, idx) => normalizeSogedipromaPurchase(p, idx))
            .filter((p): p is SogedipromaPurchase => Boolean(p))
        : undefined,
    };

    return {
      success: true,
      data: normalizedData,
      revision: typeof parsed.revision === 'number' ? parsed.revision : undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: `JSON invalide : ${(err as Error).message}`,
    };
  }
}

function mapConsumableCategory(item: SogedipromaInventoryItem): ArticleConsommable['categorie'] {
  const hay = `${item.category || ''} ${item.type || ''} ${item.name || ''}`.toLowerCase();
  if (
    hay.includes('toner') ||
    hay.includes('cartouche') ||
    hay.includes('encre') ||
    hay.includes('impression') ||
    hay.includes('ruban') ||
    hay.includes('zebra')
  ) {
    return 'Toners & Cartouches';
  }
  if (hay.includes('papier') || hay.includes('ramette') || hay.includes('agrafe')) {
    return 'Papier';
  }
  if (hay.includes('câble') || hay.includes('cable') || hay.includes('hdmi') || hay.includes('rj45') || hay.includes('adaptateur')) {
    return 'Câbles & Connectique';
  }
  if (hay.includes('souris') || hay.includes('clavier') || hay.includes('pavé') || hay.includes('casque') || hay.includes('périphérique')) {
    return "Périphériques d'entrée";
  }
  if (hay.includes('ssd') || hay.includes('disque') || hay.includes('usb') || hay.includes('hub') || hay.includes('support') || hay.includes('rouleau')) {
    return 'Stockage & Accessoires';
  }
  if (item.type === 'Pièce détachée' || hay.includes('pièce') || hay.includes('batterie') || hay.includes('pile') || hay.includes('ram')) {
    return 'Pièces de rechange';
  }
  return 'Nouveaux équipements';
}

function mapUnit(rawUnit?: string): ArticleConsommable['unite'] {
  const u = (rawUnit || '').toLowerCase();
  if (u.includes('carton') || u.includes('ramette')) return 'Carton';
  if (u.includes('rouleau') || u.includes('bobine')) return 'Rouleau';
  if (u.includes('pack') || u.includes('boît') || u.includes('boit') || u.includes('lot')) return 'Pack';
  return 'Unité';
}

function isActiveNetworkAsset(asset: SogedipromaAsset): boolean {
  const cat = (asset.category || '').trim().toLowerCase();
  const detail = `${asset.name || ''} ${asset.model || ''} ${asset.brand || ''}`.toLowerCase();
  const location = (asset.location || '').toLowerCase();
  const tag = (asset.assetTag || '').toLowerCase();

  // Format /api/state classique : catégorie dédiée "Réseau"
  if (cat === 'réseau' || cat === 'reseau') return true;

  // Onduleurs placés dans la baie réseau (NET-011 / NET-012)
  if (
    (cat.includes('alimentation') || cat.includes('onduleur')) &&
    (location.includes('baie') || tag.startsWith('net-'))
  ) {
    return true;
  }

  // Format export combiné / assets : "Réseau & Câblage" et "Sécurité & Vidéo" regroupent câbles passifs & caméras/NVR
  if (cat.includes('réseau') || cat.includes('reseau') || cat.includes('sécurité') || cat.includes('securite')) {
    return /(?:^|[^a-z0-9à-ÿ])(switch|mini-switch|router|routeur|firewall|pare-feu|mikrotik|starlink|modem|unifi|aruba|wifi|wi-fi|ap|nvr|dvr|camera|caméra|serveur|nas)(?:$|[^a-z0-9à-ÿ])/i.test(
      detail
    );
  }
  return false;
}

function mapAssetType(category?: string, model?: string, name?: string): EquipementParc['type'] {
  const cat = (category || '').trim().toLowerCase();
  const detail = `${model || ''} ${name || ''}`.toLowerCase();

  if (cat === 'réseau' || cat === 'reseau') return 'Switch/Réseau';
  if (
    (cat.includes('réseau') || cat.includes('reseau')) &&
    /\b(switch|router|routeur|firewall|pare-feu|mikrotik|starlink|modem|unifi|aruba|wifi|wi-fi|ap)\b/i.test(detail)
  ) {
    return 'Switch/Réseau';
  }
  if (cat.includes('serveur')) return 'Serveur';
  if (cat.includes('imprimante') || cat.includes('scanneur') || cat.includes('scanner')) return 'Imprimante';
  if (cat.includes('écran') || cat.includes('ecran')) return 'Écran';
  if (cat.includes('téléphone') || cat.includes('telephone') || cat.includes('smartphone')) return 'Smartphone';
  if (cat.includes('tablette')) return 'Tablette';
  if (cat.includes('ordinateur')) {
    if (
      detail.includes('portable') ||
      detail.includes('laptop') ||
      detail.includes('latitude') ||
      detail.includes('thinkpad') ||
      detail.includes('elitebook') ||
      detail.includes('probook') ||
      detail.includes('macbook')
    ) {
      return 'PC Portable';
    }
    return 'PC Fixe';
  }
  return 'Périphérique';
}

function mapAssetState(status?: string): EquipementParc['etatMateriel'] {
  switch (status) {
    case 'En réparation':
      return 'En réparation';
    case 'Abîmé':
      return 'Dégradé';
    case 'Hors service':
    case 'Réformé':
      return 'Rebut / Obsolète';
    case 'Disponible':
      return 'Très bon état';
    case 'Affecté':
    default:
      return 'Bon état';
  }
}

function mapNetworkType(name?: string, model?: string, notes?: string): EquipementReseau['type'] {
  const hay = `${name || ''} ${model || ''} ${notes || ''}`.toLowerCase();
  if (hay.includes('routeur') || hay.includes('router') || hay.includes('mikrotik') || hay.includes('starlink') || hay.includes('modem')) {
    return 'Routeur';
  }
  if (hay.includes('firewall') || hay.includes('pare-feu') || hay.includes('forti') || hay.includes('pfsense')) {
    return 'Firewall';
  }
  if (hay.includes('wifi') || hay.includes('wi-fi') || hay.includes('ap ') || hay.includes('point d') || hay.includes('unifi') || hay.includes('aruba')) {
    return "Point d'accès Wi-Fi";
  }
  if (hay.includes('onduleur') || hay.includes('ups')) {
    return 'Onduleur Réseau';
  }
  if (hay.includes('dhcp') || hay.includes('dns')) {
    return 'Serveur DHCP/DNS';
  }
  return 'Switch';
}

function mapTicketInterventionType(cat?: string): InterventionType {
  switch (cat) {
    case 'Réseau':
      return 'Réseau';
    case 'Logiciel':
      return 'Logiciel';
    case 'Accès / compte':
      return 'Compte/Accès';
    case 'Téléphonie':
      return 'Téléphonie';
    case 'Matériel':
    default:
      return 'Matériel';
  }
}

function mapWorkLogCategory(cat?: string): TacheJournal['categorie'] {
  switch (cat) {
    case 'Assistance':
      return 'Support Utilisateur';
    case 'Installation':
      return 'Déploiement Matériel';
    case 'Réseau':
      return 'Réseau & Wifi';
    case 'Sécurité':
      return 'Sécurité & Sauvegarde';
    case 'Maintenance':
      return 'Maintenance Préventive';
    case 'Gestion du parc':
      return 'Gestion des Stocks';
    default:
      return 'Autre';
  }
}

function mapMaintenanceCategory(assetCategory?: string, notes?: string): ItemMaintenance['categorie'] {
  const hay = `${assetCategory || ''} ${notes || ''}`.toLowerCase();
  if (hay.includes('imprim') || hay.includes('scan')) return 'Imprimantes';
  if (hay.includes('réseau') || hay.includes('reseau') || hay.includes('switch') || hay.includes('routeur') || hay.includes('wifi')) {
    return 'Équipements réseau';
  }
  if (hay.includes('serveur') || hay.includes('nas')) return 'Serveurs';
  if (hay.includes('onduleur') || hay.includes('ups')) return 'Onduleurs';
  if (hay.includes('sauvegarde') || hay.includes('backup')) return 'Contrôle sauvegardes';
  if (hay.includes('antivirus') || hay.includes('edr')) return 'Vérification Antivirus';
  if (hay.includes('ordinateur') || hay.includes('pc')) return 'Ordinateurs';
  return 'Périphériques';
}

export function mapSogedipromaToWorkbookDelta(raw: SogedipromaStateData): SogedipromaMappedDelta {
  const settings = raw.settings || {};
  const currency = settings.currency || 'Ar';
  const defaultLocation = settings.defaultLocation || 'Siège SOGEDIPROMA';

  const employees = Array.isArray(raw.employees) ? raw.employees : [];
  const departments = Array.isArray(raw.departments) ? raw.departments : [];
  const suppliers = Array.isArray(raw.suppliers) ? raw.suppliers : [];
  const budgets = Array.isArray(raw.budgets) ? raw.budgets : [];
  const inventory = Array.isArray(raw.inventory) ? raw.inventory : [];
  const purchases = Array.isArray(raw.purchases) ? raw.purchases : [];
  const assets = Array.isArray(raw.assets) ? raw.assets : [];
  const tickets = Array.isArray(raw.tickets) ? raw.tickets : [];
  const workLogs = Array.isArray(raw.workLogs) ? raw.workLogs : [];
  const maintenance = Array.isArray(raw.maintenance) ? raw.maintenance : [];
  const subscriptions = Array.isArray(raw.subscriptions) ? raw.subscriptions : [];
  const itTracking = Array.isArray(raw.itTracking) ? raw.itTracking : [];

  const employeeMap = new Map(employees.map((e) => [String(e.id), e]));
  const departmentMap = new Map(departments.map((d) => [String(d.id), d]));
  const supplierMap = new Map(suppliers.map((s) => [String(s.id), s]));
  const budgetMap = new Map(budgets.map((b) => [String(b.id), b]));
  const inventoryMap = new Map(inventory.map((i) => [String(i.id), i]));
  const assetMap = new Map(assets.map((a) => [String(a.id), a]));

  const resolveEmployeeName = (id?: string, directName?: string): string =>
    (id && employeeMap.get(String(id))?.name) || directName?.trim() || '';

  const resolveDepartmentName = (deptId?: string, empId?: string, directDept?: string): string => {
    if (deptId && departmentMap.get(String(deptId))) {
      return departmentMap.get(String(deptId))!.name;
    }
    if (directDept?.trim()) {
      return directDept.trim();
    }
    if (empId && employeeMap.get(String(empId))) {
      const emp = employeeMap.get(String(empId))!;
      if (emp.departmentId && departmentMap.get(String(emp.departmentId))) {
        return departmentMap.get(String(emp.departmentId))!.name;
      }
      return emp.department || '';
    }
    return '';
  };

  // Articles ayant une commande en cours
  const orderedItemIds = new Set(
    purchases
      .filter((p) => p.itemId && p.status === 'Commandé' && !p.receivedApplied)
      .map((p) => String(p.itemId))
  );

  // 1. Consommables & Stocks
  const consommables: ArticleConsommable[] = inventory.map((item, idx) => {
    const stock = Number(item.quantity) || 0;
    const minAlert = Number(item.minQty) || 0;
    const isOrdered = orderedItemIds.has(String(item.id));
    let statut: ArticleConsommable['statut'] = 'En stock';
    if (stock <= 0) {
      statut = isOrdered ? 'Commande en cours' : 'Rupture';
    } else if (stock <= minAlert) {
      statut = isOrdered ? 'Commande en cours' : 'Stock bas';
    }

    const supplierName =
      (item.supplierId && supplierMap.get(String(item.supplierId))?.name) ||
      item.supplierName?.trim() ||
      'Non renseigné';

    return {
      id: `sog-inv-${item.id || idx}`,
      reference: item.sku?.trim() || `SOG-STK-${String(idx + 1).padStart(3, '0')}`,
      designation: item.name || 'Article sans nom',
      categorie: mapConsumableCategory(item),
      stockActuel: stock,
      stockMinimumAlerte: minAlert,
      quantiteRecommandeeAchat:
        stock <= minAlert ? Math.max(1, minAlert * 2 - stock) : Math.max(1, minAlert),
      unite: mapUnit(item.unit),
      emplacementStock: item.location?.trim() || defaultLocation,
      fournisseur: supplierName,
      statut,
    };
  });

  // 2. Demandes d'achat & commandes
  const demandesAchat: DemandeAchat[] = purchases.map((p, idx) => {
    const qty = Number(p.quantity) || 1;
    const unitPrice = Number(p.unitPrice) || 0;
    const invItem = p.itemId ? inventoryMap.get(String(p.itemId)) : undefined;
    const supplierName =
      (p.supplierId && supplierMap.get(String(p.supplierId))?.name) ||
      p.supplierName?.trim() ||
      'Fournisseur IT';
    const deptName = resolveDepartmentName(p.departmentId, undefined, p.departmentName);
    const budgetName =
      (p.budgetId && budgetMap.get(String(p.budgetId))?.name) || p.budgetName?.trim() || '';
    const isReceived = Boolean(p.receivedApplied) || p.status === 'Reçu';

    const statut: DemandeAchat['statut'] = isReceived
      ? 'Reçu / Contrôlé'
      : p.status === 'Commandé'
      ? 'Commandé'
      : 'Brouillon';

    return {
      id: `sog-pur-${p.id || idx}`,
      numeroCommande: p.ref?.trim() || `ACH-${String(idx + 1).padStart(4, '0')}`,
      dateDemande: p.date || new Date().toISOString().split('T')[0],
      demandeur: deptName || 'Équipe IT SOGEDIPROMA',
      articlesDemandes: invItem ? invItem.name : p.itemName || p.itemId || 'Article informatique',
      quantite: qty,
      fournisseur: supplierName,
      montantEstimeTTC: Math.round(qty * unitPrice * 100) / 100,
      priorite: 'Normale',
      statut,
      dateReception: isReceived ? p.date : undefined,
      observations: [p.notes, budgetName ? `Budget : ${budgetName}` : '', unitPrice ? `PU : ${unitPrice} ${currency}` : '']
        .filter(Boolean)
        .join(' · '),
    };
  });

  // 3. Matériels & équipements -> Parc CMDB
  const maintenanceByAsset = new Map<string, string[]>();
  maintenance.forEach((m) => {
    if (!m.assetId) return;
    const list = maintenanceByAsset.get(String(m.assetId)) || [];
    list.push(`${m.plannedAt || ''} (${m.type || 'Maintenance'} - ${m.status || ''})`);
    maintenanceByAsset.set(String(m.assetId), list);
  });

  const parcEquipements: EquipementParc[] = assets.map((a, idx) => {
    const empName = resolveEmployeeName(a.employeeId, a.employeeName);
    const deptName = resolveDepartmentName(a.departmentId, a.employeeId, a.departmentName);
    const supplierName =
      (a.supplierId && supplierMap.get(String(a.supplierId))?.name) ||
      a.supplierName?.trim() ||
      '';
    const budgetName =
      (a.budgetId && budgetMap.get(String(a.budgetId))?.name) || a.budgetName?.trim() || '';
    const mHistory = maintenanceByAsset.get(String(a.id)) || [];
    const assetType = mapAssetType(a.category, a.model, a.name);

    return {
      id: `sog-ast-${a.id || idx}`,
      numeroInventaire: a.assetTag?.trim() || `SOG-IT-${String(idx + 1).padStart(4, '0')}`,
      designation: a.name || 'Matériel IT',
      type: assetType,
      marqueModele: [a.brand, a.model].filter(Boolean).join(' ') || a.category || 'Standard',
      numeroSerie: a.serial?.trim() || 'N/A',
      configurationTechnique: [
        a.category ? `Catégorie : ${a.category}` : '',
        a.purchasePrice ? `Valeur : ${a.purchasePrice} ${currency}` : '',
        supplierName ? `Fournisseur : ${supplierName}` : '',
        budgetName ? `Budget : ${budgetName}` : '',
        a.notes || '',
      ]
        .filter(Boolean)
        .join(' · '),
      dateAcquisition: a.purchaseDate || new Date().toISOString().split('T')[0],
      etatMateriel: mapAssetState(a.status),
      utilisateurResponsable: empName || (a.status === 'Disponible' ? 'Stock DSI' : 'Non affecté'),
      service: deptName || 'SOGEDIPROMA',
      localisation: a.location?.trim() || defaultLocation,
      finGarantie: a.warrantyEnd || 'Non spécifiée',
      dureeVieEstimeeAns: assetType === 'Serveur' || assetType === 'Switch/Réseau' ? 5 : 4,
      historiqueInterventions: mHistory.length
        ? mHistory.slice(0, 4).join(' | ')
        : 'Importé depuis SOGEDIPROMA.',
    };
  });

  // 4. Équipements réseau actifs extraits de assets (Switchs, Routeurs, Onduleurs de baie, NVR, Caméras IP, etc.)
  const reseauEquipements: EquipementReseau[] = assets
    .filter((a) => isActiveNetworkAsset(a))
    .map((a, idx) => {
      const notes = a.notes || '';
      const ipMatch = /IP:\s*([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i.exec(notes);
      const macMatch = /MAC:\s*([0-9a-fA-F:-]{11,})/i.exec(notes);
      const fwMatch = /Firmware:\s*([^|]+)/i.exec(notes);
      const portsMatch = /(\d+\s*ports?\s*[^|,()]+(?:\([^)]+\))?)/i.exec(notes);
      const poeDetailMatch = /\(([^)]*PoE[^)]*)\)/i.exec(notes);

      const adresseIp = ipMatch ? ipMatch[1].trim() : '—';
      const adresseMac = macMatch ? macMatch[1].trim().toUpperCase() : a.serial || '—';
      const firmwareVersion = fwMatch ? fwMatch[1].trim() : 'Standard';
      const portsPoE = poeDetailMatch
        ? poeDetailMatch[1].trim()
        : portsMatch
        ? portsMatch[1].trim()
        : '—';
      const vlan = adresseIp.startsWith('192.168.200.') ? 'VLAN Vidéo (200)' : 'LAN Principal';

      return {
        id: `sog-net-${a.id || idx}`,
        nom: a.name || `Équipement Réseau ${idx + 1}`,
        type: mapNetworkType(a.name, a.model, notes),
        marqueModele: [a.brand, a.model].filter(Boolean).join(' ') || a.category || 'Réseau',
        adresseIp,
        adresseMac,
        localisation: a.location?.trim() || defaultLocation,
        vlan,
        portsPoE,
        firmwareVersion,
        etat:
          a.status === 'En réparation'
            ? 'En maintenance'
            : a.status === 'Hors service' || a.status === 'Réformé'
            ? 'Hors ligne'
            : a.status === 'Abîmé'
            ? 'Alerte'
            : 'En ligne',
        dernierReboot: a.purchaseDate || '',
        observations: [a.assetTag ? `Tag : ${a.assetTag}` : '', notes].filter(Boolean).join(' · '),
      };
    });

  // 5. Maintenances
  const maintenances: ItemMaintenance[] = maintenance.map((m, idx) => {
    const asset = m.assetId ? assetMap.get(String(m.assetId)) : undefined;
    const isDone = m.status === 'Terminée';
    const typeMaint: ItemMaintenance['typeMaintenance'] =
      m.type === 'Réparation' ? 'Corrective' : 'Préventive';
    const statut: ItemMaintenance['statut'] =
      m.status === 'Terminée'
        ? 'Conforme'
        : m.status === 'Annulée'
        ? 'Non applicable'
        : m.status === 'En cours'
        ? 'À traiter'
        : 'À traiter';

    return {
      id: `sog-mnt-${m.id || idx}`,
      categorie: mapMaintenanceCategory(asset?.category || m.assetCategory, m.notes),
      typeMaintenance: typeMaint,
      tacheControle: `${m.type || 'Maintenance'} — ${asset ? asset.name : m.assetName || 'Équipement IT'}`,
      frequence: 'Trimestrielle',
      dernierControle: isDone ? m.plannedAt || '' : '',
      prochainControle: m.plannedAt || new Date().toISOString().split('T')[0],
      statut,
      responsableOuEquipement:
        [m.provider || resolveEmployeeName(m.employeeId, m.employeeName), asset?.assetTag || m.assetTag]
          .filter(Boolean)
          .join(' · ') || 'Équipe IT',
      observations: [m.notes, m.cost ? `Coût : ${m.cost} ${currency}` : ''].filter(Boolean).join(' · '),
      valide: isDone,
    };
  });

  // 6. Tickets de support -> Interventions IT
  const interventions: FicheIntervention[] = tickets.map((t, idx) => {
    const requester = t.requesterName?.trim() || resolveEmployeeName(t.requesterId) || 'Collaborateur';
    const deptName = resolveDepartmentName(t.departmentId, t.requesterId, t.departmentName) || 'SOGEDIPROMA';
    const priority: FicheIntervention['priorite'] =
      t.priority === 'Urgente'
        ? 'Critique'
        : t.priority === 'Haute'
        ? 'Haute'
        : t.priority === 'Basse'
        ? 'Basse'
        : 'Normale';
    const resultat: FicheIntervention['resultat'] =
      t.status === 'Résolu' || t.status === 'Fermé'
        ? 'Résolu'
        : t.status === 'En attente'
        ? 'En attente pièce'
        : 'En cours';

    return {
      id: `sog-tic-${t.id || idx}`,
      numeroReference: t.ref?.trim() || `TIC-${String(idx + 1).padStart(4, '0')}`,
      dateReception: t.openedAt || new Date().toISOString().split('T')[0],
      heureReception: '09:00',
      nomDemandeur: requester,
      serviceDemandeur: deptName,
      equipementConcerne: t.title || 'Ticket Support',
      natureIntervention: 'Incident / Dépannage',
      typeIntervention: mapTicketInterventionType(t.category),
      priorite: priority,
      titreRapport: t.title,
      descriptionPanne: t.description?.trim() || t.title || 'Ticket importé depuis SOGEDIPROMA.',
      diagnosticTechnique: `Catégorie SOGEDIPROMA : ${t.category || 'Support'} · Technicien : ${
        t.technician || resolveEmployeeName(t.technicianId) || 'Équipe IT'
      }`,
      causeIdentifiee: '',
      solutionAppliquee: resultat === 'Résolu' ? 'Incident résolu et clôturé dans SOGEDIPROMA.' : 'En cours de traitement.',
      materielLogicielUtilise: '',
      tempsConsacreMin: 30,
      resultat,
      validationDemandeur: t.status === 'Fermé' || t.status === 'Résolu',
      dateValidation: t.dueAt || undefined,
    };
  });

  // 7. Suivi du travail -> Journal Quotidien
  const journalTaches: TacheJournal[] = workLogs.map((w, idx) => {
    const mins = Math.max(15, Math.round((Number(w.durationHours) || 0.5) * 60));
    const statut: TacheJournal['statut'] =
      w.status === 'Terminé' ? 'Terminé' : w.status === 'À suivre' ? 'À faire' : 'En cours';
    return {
      id: `sog-wrk-${w.id || idx}`,
      date: w.date || new Date().toISOString().split('T')[0],
      heure: '08:30',
      tache: w.title || 'Intervention journalière',
      description: w.description || '',
      categorie: mapWorkLogCategory(w.category),
      priorite: 'Normale',
      dureeEstimeeMin: mins,
      dureeReelleMin: statut === 'Terminé' ? mins : 0,
      statut,
      resultat: w.result || '',
      observations: [w.technician ? `Technicien : ${w.technician}` : '', resolveDepartmentName(w.departmentId, w.technicianId, w.departmentName)]
        .filter(Boolean)
        .join(' · '),
    };
  });

  // 8. Abonnements & Catalogue logiciels -> Logiciels & Licences
  const todayIso = new Date().toISOString().split('T')[0];
  const cutoff30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const subLicences: LogicielLicence[] = subscriptions.map((s, idx) => {
    const isExpiring = Boolean(s.renewalDate && s.renewalDate >= todayIso && s.renewalDate <= cutoff30);
    return {
      id: `sog-sub-${s.id || idx}`,
      nomLogiciel: s.name || 'Abonnement SaaS',
      editeur: s.provider || 'Fournisseur',
      version: s.plan || s.category || 'Standard',
      typeLicence: 'Abonnement SaaS',
      nombreLicencesAchetees: 1,
      nombreLicencesAttribuees: s.status === 'Active' || s.status === 'Essai' ? 1 : 0,
      dateExpiration: s.renewalDate || 'À définir',
      coutRenouvellementEstime: s.amount ? `${s.amount} ${currency} / ${s.billingCycle || 'Mensuel'}` : '—',
      procedureInstallation: s.notes || 'Géré via console prestataire.',
      gestionComptesEtDroits: s.owner ? `Responsable : ${s.owner}` : 'Administration DSI',
      statutConformite: isExpiring ? 'Expire sous 30j' : 'Conforme',
      observations: `Statut SOGEDIPROMA : ${s.status || 'Active'} · Renouvellement : ${
        s.autoRenew === 'Oui' ? 'Automatique' : 'Manuel'
      }`,
    };
  });

  const trackedSoftware = itTracking.filter((row) => row && row.type === 'software' && row.name);
  const trackedLicences: LogicielLicence[] = trackedSoftware.map((sw, idx) => ({
    id: `sog-sw-${sw.id || idx}`,
    nomLogiciel: sw.name || 'Logiciel',
    editeur: sw.publisher || 'Éditeur',
    version: sw.version || 'Standard',
    typeLicence: 'Volume VL',
    nombreLicencesAchetees: Number(sw.licenseCount) || 1,
    nombreLicencesAttribuees: Number(sw.licenseCount) || 1,
    dateExpiration: 'Permanent / À vérifier',
    coutRenouvellementEstime: '—',
    procedureInstallation: sw.notes || '',
    gestionComptesEtDroits: sw.category || 'Suivi informatique SOGEDIPROMA',
    statutConformite: 'Conforme',
    observations: sw.notes || '',
  }));

  const resolvedEmployeesCount =
    employees.length ||
    new Set(assets.map((a) => a.employeeName?.trim()).filter((v): v is string => Boolean(v))).size;
  const resolvedDepartmentsCount =
    departments.length ||
    new Set(
      [
        ...assets.map((a) => a.departmentName?.trim()),
        ...inventory.map((i) => i.departmentName?.trim()),
        ...purchases.map((p) => p.departmentName?.trim()),
      ].filter((v): v is string => Boolean(v))
    ).size;
  const resolvedSuppliersCount =
    suppliers.length ||
    new Set(
      [
        ...assets.map((a) => a.supplierName?.trim()),
        ...inventory.map((i) => i.supplierName?.trim()),
        ...purchases.map((p) => p.supplierName?.trim()),
      ].filter((v): v is string => Boolean(v))
    ).size;

  return {
    companyMeta: {
      company: settings.company || 'SOGEDIPROMA',
      defaultLocation,
      supportEmail: settings.supportEmail || '',
      currency,
      exportDate: raw.exportDate,
      employeesCount: resolvedEmployeesCount,
      departmentsCount: resolvedDepartmentsCount,
      suppliersCount: resolvedSuppliersCount,
    },
    consommables,
    demandesAchat,
    parcEquipements,
    reseauEquipements,
    maintenances,
    interventions,
    journalTaches,
    logicielsLicences: [...subLicences, ...trackedLicences],
  };
}

function upsertBySogPrefix<T extends { id: string }>(
  existing: T[],
  incoming: T[],
  replaceSogEntries: boolean
): T[] {
  // Évite d'effacer les entrées sog-* existantes lors d'un import partiel (ex: fichier assets uniquement)
  if (incoming.length === 0) {
    return existing;
  }

  const base = replaceSogEntries
    ? existing.filter((item) => !String(item.id || '').startsWith('sog-'))
    : [...existing];

  const byId = new Map<string, T>();
  base.forEach((item) => {
    if (item && item.id) byId.set(item.id, item);
  });
  incoming.forEach((item) => {
    if (item && item.id) byId.set(item.id, item);
  });
  return Array.from(byId.values());
}

export function applySogedipromaMerge(
  currentData: CahierSuiviData,
  delta: SogedipromaMappedDelta,
  selectedModules: Record<SogedipromaSyncModuleKey, boolean>,
  mode: 'merge' | 'replace-sog'
): { nextData: CahierSuiviData; estimatedBytes: number } {
  const replaceSog = mode === 'replace-sog';

  const nextGeneralInfo = {
    ...currentData.generalInfo,
    entreprise: currentData.generalInfo.entreprise?.trim()
      ? currentData.generalInfo.entreprise
      : delta.companyMeta.company,
    localisationBureau: currentData.generalInfo.localisationBureau?.trim()
      ? currentData.generalInfo.localisationBureau
      : delta.companyMeta.defaultLocation,
    emailPro: currentData.generalInfo.emailPro?.trim()
      ? currentData.generalInfo.emailPro
      : delta.companyMeta.supportEmail,
  };

  const nextData = normalizeWorkbookData({
    ...currentData,
    generalInfo: nextGeneralInfo,
    consommables: selectedModules.consommables
      ? upsertBySogPrefix(currentData.consommables, delta.consommables, replaceSog)
      : currentData.consommables,
    demandesAchat: selectedModules.demandesAchat
      ? upsertBySogPrefix(currentData.demandesAchat, delta.demandesAchat, replaceSog)
      : currentData.demandesAchat,
    parcEquipements: selectedModules.parcEquipements
      ? upsertBySogPrefix(currentData.parcEquipements, delta.parcEquipements, replaceSog)
      : currentData.parcEquipements,
    reseauEquipements: selectedModules.reseauEquipements
      ? upsertBySogPrefix(currentData.reseauEquipements, delta.reseauEquipements, replaceSog)
      : currentData.reseauEquipements,
    maintenances: selectedModules.maintenances
      ? upsertBySogPrefix(currentData.maintenances, delta.maintenances, replaceSog)
      : currentData.maintenances,
    interventions: selectedModules.interventions
      ? upsertBySogPrefix(currentData.interventions, delta.interventions, replaceSog)
      : currentData.interventions,
    journalTaches: selectedModules.journalTaches
      ? upsertBySogPrefix(currentData.journalTaches, delta.journalTaches, replaceSog)
      : currentData.journalTaches,
    logicielsLicences: selectedModules.logicielsLicences
      ? upsertBySogPrefix(currentData.logicielsLicences, delta.logicielsLicences, replaceSog)
      : currentData.logicielsLicences,
  });

  return {
    nextData,
    estimatedBytes: estimateWorkbookSizeBytes(nextData),
  };
}
