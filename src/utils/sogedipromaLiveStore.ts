import { useEffect, useState } from 'react';
import {
  SogedipromaAccessItem,
  SogedipromaAsset,
  SogedipromaBudget,
  SogedipromaDepartment,
  SogedipromaEmployee,
  SogedipromaInventoryItem,
  SogedipromaItTrackingItem,
  SogedipromaPurchase,
  SogedipromaStateData,
  SogedipromaSubscription,
  SogedipromaSupplier,
} from './sogedipromaSync';
import {
  detectCurrencyAndConvertToAr,
  FxRates,
  loadFxRates,
} from './currencyConverter';

const LIVE_SNAPSHOT_STORAGE_KEY = 'sogediproma_live_snapshot_v1';
const LIVE_SNAPSHOT_EVENT = 'sogediproma-live-snapshot-updated';

export interface LiveStockMovementRow {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  type: 'Entrée' | 'Sortie' | string;
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  date: string;
  reason: string;
  reference: string;
  user: string;
  employeeName: string;
  departmentName: string;
  createdAt: string;
}

export interface LiveInventoryLookupItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minQty: number;
  unit: string;
  unitCost: number;
  departmentId: string;
  supplierId: string;
}

export interface LiveCampaignItemRow {
  id: string;
  code: string;
  qrCode: string;
  name: string;
  category: string;
  assignedName: string;
  location: string;
  department: string;
  checkedAt: string;
  checkedBy: string;
  checkMethod: string;
  resultStatus: string;
  reviewNote: string;
}

export interface LiveInventoryCampaignSummary {
  id: string;
  name: string;
  year: number;
  status: string;
  startDate: string;
  scopeLabel: string;
  counter: string;
  reviewer: string;
  totalItems: number;
  checkedItems: number;
  conformeCount: number;
  anomalyCount: number;
  items: LiveCampaignItemRow[];
}

export interface LiveCameraHealthRow {
  assetId: string;
  assetTag: string;
  name: string;
  location: string;
  ip: string;
  status: string;
  totalChecks: number;
  okChecks: number;
  issueCount: number;
  availabilityPct: number;
  lastCheckDate: string;
  lastCheckedBy: string;
  lastStatus: string;
  lastNote: string;
}

export interface LiveEmployeeRow {
  id: string;
  name: string;
  department: string;
  departmentId: string;
  email: string;
  phone: string;
  fleetPhone: string;
  position: string;
  location: string;
  status: string;
  hasCharter: boolean;
  charterName: string;
}

export interface LiveDepartmentRow {
  id: string;
  name: string;
  code: string;
  manager: string;
  location: string;
  employeesCount: number;
  assetsCount: number;
}

export interface LiveSupplierRow {
  id: string;
  name: string;
  category: string;
  contact: string;
  email: string;
  phone: string;
  city: string;
}

export interface LiveSoftwareAssignmentRow {
  id: string;
  softwareId: string;
  softwareName: string;
  editor: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  createdAt: string;
  createdBy: string;
}

export interface LiveAccessRbacRow {
  id: string;
  system: string;
  category: string;
  account: string;
  role: string;
  scope: string;
  status: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  grantedAt: string;
  approvedBy: string;
  reviewDate: string;
  notes: string;
}

export interface SogedipromaLiveSnapshot {
  syncedAt: string;
  revision?: number;
  company: string;
  currency: string;
  counts: {
    assets: number;
    assetsWithQr: number;
    inventoryItems: number;
    stockMovements: number;
    purchases: number;
    employees: number;
    fleetPhones: number;
    chartersSigned: number;
    departments: number;
    suppliers: number;
    tickets: number;
    workLogs: number;
    maintenances: number;
    cameraChecks: number;
    camerasTotal: number;
    subscriptions: number;
    softwareAssignments: number;
    accesses: number;
    budgets: number;
    campaignChecked: number;
    campaignTotal: number;
  };
  employees: LiveEmployeeRow[];
  departments: LiveDepartmentRow[];
  suppliers: LiveSupplierRow[];
  inventoryItems: LiveInventoryLookupItem[];
  stockMovements: LiveStockMovementRow[];
  inventoryCampaign: LiveInventoryCampaignSummary | null;
  cameraHealth: LiveCameraHealthRow[];
  softwareAssignments: LiveSoftwareAssignmentRow[];
  accesses: LiveAccessRbacRow[];
  budgetsSummary: Array<{
    id: string;
    name: string;
    category: string;
    fiscalYear: number;
    allocatedAr: number;
    derivedSpentAr: number;
    derivedCommittedAr: number;
  }>;
}

const SOFTWARE_LABELS: Record<string, { name: string; editor: string }> = {
  'software-default-anydesk': { name: 'AnyDesk', editor: 'AnyDesk Software' },
  'software-default-outlook': { name: 'Microsoft Outlook', editor: 'Microsoft' },
  'software-default-workspace': { name: 'Google Workspace', editor: 'Google' },
  'software-default-dropbox': { name: 'Dropbox', editor: 'Dropbox' },
  'software-default-onedrive': { name: 'Microsoft OneDrive', editor: 'Microsoft' },
  'software-default-open-vpn': { name: 'OpenVPN', editor: 'OpenVPN Inc.' },
  'software-default-avira': { name: 'Avira Antivirus', editor: 'Avira / Gen Digital' },
  'software-default-domaine': { name: 'Active Directory (Domaine)', editor: 'Microsoft' },
  'software-default-whatsapp': { name: 'WhatsApp Desktop', editor: 'Meta' },
  'software-default-office-365': { name: 'Microsoft 365 / Office', editor: 'Microsoft' },
  'software-default-teams': { name: 'Microsoft Teams', editor: 'Microsoft' },
  'software-default-chatgpt': { name: 'ChatGPT', editor: 'OpenAI' },
  'software-default-pointage': { name: 'Logiciel de Pointage RH', editor: 'SOGEDIPROMA' },
  'software-default-foxy-pdf-reader': { name: 'Foxit PDF Reader', editor: 'Foxit Software' },
  'software-default-ticket': { name: 'Portail Tickets Support', editor: 'SOGEDIPROMA IT' },
};

const KNOWN_USD_SAAS =
  /(hostinger|anthropic|claude|icloud|apple|openai|chatgpt|adobe|dropbox|microsoft|canva|navionics|zoom|notion|slack)/i;

export function inferSubscriptionCurrency(
  sub: SogedipromaSubscription,
  settingsCurrency: string
): 'Ar' | 'EUR' | 'USD' {
  const hay = `${sub.name || ''} ${sub.provider || ''} ${sub.plan || ''} ${sub.notes || ''}`;
  if (/€|\bEUR\b/i.test(hay)) return 'EUR';
  if (/\$|\bUSD\b/i.test(hay)) return 'USD';
  const amt = Number(sub.amount) || 0;
  if (settingsCurrency === 'Ar' && amt > 0 && amt < 5000) {
    return 'USD';
  }
  if (KNOWN_USD_SAAS.test(hay) && amt > 0 && amt < 20000) {
    return 'USD';
  }
  return settingsCurrency === 'EUR' ? 'EUR' : settingsCurrency === 'USD' ? 'USD' : 'Ar';
}

export function buildSogedipromaLiveSnapshot(
  raw: SogedipromaStateData,
  revision?: number,
  fxRates: FxRates = loadFxRates()
): SogedipromaLiveSnapshot {
  const settings = raw.settings || {};
  const currency = settings.currency || 'Ar';

  const employeesRaw: SogedipromaEmployee[] = Array.isArray(raw.employees) ? raw.employees : [];
  const departmentsRaw: SogedipromaDepartment[] = Array.isArray(raw.departments) ? raw.departments : [];
  const suppliersRaw: SogedipromaSupplier[] = Array.isArray(raw.suppliers) ? raw.suppliers : [];
  const inventoryRaw: SogedipromaInventoryItem[] = Array.isArray(raw.inventory) ? raw.inventory : [];
  const purchasesRaw: SogedipromaPurchase[] = Array.isArray(raw.purchases) ? raw.purchases : [];
  const assetsRaw: SogedipromaAsset[] = Array.isArray(raw.assets) ? raw.assets : [];
  const itTrackingRaw: SogedipromaItTrackingItem[] = Array.isArray(raw.itTracking) ? raw.itTracking : [];
  const accessesRaw: SogedipromaAccessItem[] = Array.isArray(raw.accesses) ? raw.accesses : [];
  const subscriptionsRaw: SogedipromaSubscription[] = Array.isArray(raw.subscriptions)
    ? raw.subscriptions
    : [];
  const budgetsRaw: SogedipromaBudget[] = Array.isArray(raw.budgets) ? raw.budgets : [];

  const empMap = new Map(employeesRaw.map((e) => [String(e.id), e]));
  const deptMap = new Map(departmentsRaw.map((d) => [String(d.id), d]));

  const resolveEmpName = (id?: string, direct?: string) =>
    (id && empMap.get(String(id))?.name) || direct?.trim() || '';

  const resolveDeptName = (deptId?: string, empId?: string, direct?: string) => {
    if (deptId && deptMap.get(String(deptId))) return deptMap.get(String(deptId))!.name;
    if (direct?.trim()) return direct.trim();
    if (empId && empMap.get(String(empId))) {
      const e = empMap.get(String(empId))!;
      if (e.departmentId && deptMap.get(String(e.departmentId))) {
        return deptMap.get(String(e.departmentId))!.name;
      }
      return e.department || '';
    }
    return '';
  };

  // 1. Employees (159 agents, fleetPhone, charter)
  const employees: LiveEmployeeRow[] = employeesRaw.map((e) => {
    const rec = e as unknown as Record<string, unknown>;
    const fleetPhone = String(rec.fleetPhone || '').trim();
    const position = String(rec.position || '').trim();
    const charterRaw = rec.charterAttachment;
    const hasCharter = Boolean(rec.charterSigned || charterRaw);
    let charterName = '';
    if (charterRaw && typeof charterRaw === 'object') {
      charterName = String((charterRaw as Record<string, unknown>).name || 'Charte signée');
    } else if (typeof charterRaw === 'string') {
      charterName = charterRaw;
    }
    return {
      id: String(e.id),
      name: e.name || 'Collaborateur',
      department: resolveDeptName(e.departmentId, undefined, e.department) || 'Non rattaché',
      departmentId: String(e.departmentId || ''),
      email: e.email || '',
      phone: e.phone || '',
      fleetPhone,
      position,
      location: e.location || '',
      status: e.status || 'Actif',
      hasCharter,
      charterName,
    };
  });

  // 2. Departments
  const empCountByDept = new Map<string, number>();
  employees.forEach((e) => {
    if (e.departmentId) {
      empCountByDept.set(e.departmentId, (empCountByDept.get(e.departmentId) || 0) + 1);
    }
  });
  const assetCountByDept = new Map<string, number>();
  assetsRaw.forEach((a) => {
    if (a.departmentId) {
      assetCountByDept.set(String(a.departmentId), (assetCountByDept.get(String(a.departmentId)) || 0) + 1);
    }
  });
  const departments: LiveDepartmentRow[] = departmentsRaw.map((d) => ({
    id: String(d.id),
    name: d.name,
    code: d.code || '',
    manager: d.manager || '',
    location: d.location || '',
    employeesCount: empCountByDept.get(String(d.id)) || 0,
    assetsCount: assetCountByDept.get(String(d.id)) || 0,
  }));

  // 3. Suppliers
  const suppliers: LiveSupplierRow[] = suppliersRaw.map((s) => ({
    id: String(s.id),
    name: s.name,
    category: s.category || '',
    contact: s.contact || '',
    email: s.email || '',
    phone: s.phone || '',
    city: s.city || '',
  }));

  // 4. Inventory items + 1 255 stock movements
  const inventoryItems: LiveInventoryLookupItem[] = inventoryRaw.map((item) => ({
    id: String(item.id),
    name: item.name,
    sku: item.sku || '',
    quantity: Number(item.quantity) || 0,
    minQty: Number(item.minQty) || 0,
    unit: item.unit || 'Unité',
    unitCost: Number(item.unitCost) || 0,
    departmentId: String(item.departmentId || ''),
    supplierId: String(item.supplierId || ''),
  }));

  const stockMovements: LiveStockMovementRow[] = [];
  inventoryRaw.forEach((item) => {
    const movs = Array.isArray(item.movements) ? item.movements : [];
    movs.forEach((m, idx) => {
      const mRec = m as unknown as Record<string, unknown>;
      stockMovements.push({
        id: String(m.id || `${item.id}-mov-${idx}`),
        itemId: String(item.id),
        itemName: item.name || 'Article',
        itemSku: item.sku || '',
        type: m.type || 'Sortie',
        quantity: Number(m.quantity) || 0,
        previousQuantity:
          typeof mRec.previousQuantity === 'number' ? mRec.previousQuantity : undefined,
        newQuantity: typeof mRec.newQuantity === 'number' ? mRec.newQuantity : undefined,
        date: m.date || '',
        reason: m.reason || '',
        reference: m.reference || '',
        user: m.user || String(mRec.modifiedBy || ''),
        employeeName: resolveEmpName(m.assignedEmployeeId, m.assignedEmployeeName),
        departmentName: resolveDeptName(m.departmentId, m.assignedEmployeeId),
        createdAt: String(mRec.createdAt || m.date || ''),
      });
    });
  });
  stockMovements.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));

  // 5. Annual Inventory Campaign + QR codes
  const campRow = itTrackingRaw.find((r) => r && r.type === 'annualInventoryCampaign');
  let inventoryCampaign: LiveInventoryCampaignSummary | null = null;
  if (campRow) {
    const rawItems = Array.isArray(campRow.items)
      ? (campRow.items as Array<Record<string, unknown>>)
      : [];
    const items: LiveCampaignItemRow[] = rawItems.map((it, idx) => ({
      id: String(it.id || `camp-item-${idx}`),
      code: String(it.code || ''),
      qrCode: String(it.qrCode || ''),
      name: String(it.name || 'Matériel'),
      category: String(it.category || ''),
      assignedName: String(it.assignedName || ''),
      location: String(it.location || ''),
      department: String(it.department || ''),
      checkedAt: String(it.checkedAt || ''),
      checkedBy: String(it.checkedBy || ''),
      checkMethod: String(it.checkMethod || ''),
      resultStatus: String(it.resultStatus || ''),
      reviewNote: String(it.reviewNote || ''),
    }));
    const checkedItems = items.filter((i) => Boolean(i.checkedAt || i.resultStatus)).length;
    const conformeCount = items.filter((i) => i.resultStatus === 'Conforme').length;
    const anomalyCount = items.filter(
      (i) => Boolean(i.resultStatus) && i.resultStatus !== 'Conforme'
    ).length;

    inventoryCampaign = {
      id: String(campRow.id),
      name: campRow.name || `Campagne Inventaire ${campRow.year || 2026}`,
      year: Number(campRow.year) || 2026,
      status: campRow.status || 'En cours',
      startDate: campRow.startDate || '',
      scopeLabel: campRow.scopeLabel || 'Matériels',
      counter: campRow.counter || campRow.createdBy || '',
      reviewer: campRow.reviewer || '',
      totalItems: items.length,
      checkedItems,
      conformeCount,
      anomalyCount,
      items,
    };
  }

  // 6. Camera Health (66 cameras + 128 checks)
  const cameraChecksRaw = itTrackingRaw.filter((r) => r && r.type === 'cameraCheck');
  const checksByAsset = new Map<
    string,
    {
      total: number;
      ok: number;
      issues: number;
      lastDate: string;
      lastBy: string;
      lastStatus: string;
      lastNote: string;
    }
  >();

  cameraChecksRaw.forEach((chk) => {
    const aid = String(chk.assetId || '');
    if (!aid) return;
    const bucket = checksByAsset.get(aid) || {
      total: 0,
      ok: 0,
      issues: 0,
      lastDate: '',
      lastBy: '',
      lastStatus: '',
      lastNote: '',
    };
    bucket.total += 1;
    const st = (chk.cameraStatus || '').trim();
    const isOk = !st || st.toLowerCase() === 'marche' || st.toLowerCase() === 'ok';
    if (isOk) bucket.ok += 1;
    else bucket.issues += 1;

    const dt = chk.checkedAt || chk.date || '';
    if (dt >= bucket.lastDate) {
      bucket.lastDate = dt;
      bucket.lastBy = chk.checkedBy || '';
      bucket.lastStatus = st || 'Marche';
      bucket.lastNote = chk.note || '';
    }
    checksByAsset.set(aid, bucket);
  });

  const videoAssets = assetsRaw.filter((a) => {
    const cat = (a.category || '').toLowerCase();
    const detail = `${a.name || ''} ${a.model || ''}`.toLowerCase();
    return cat.includes('sécurité') || cat.includes('vidéo') || /\b(caméra|camera|nvr|dvr)\b/i.test(detail);
  });

  const cameraHealth: LiveCameraHealthRow[] = videoAssets.map((cam) => {
    const agg = checksByAsset.get(String(cam.id));
    const ipMatch = /IP:\s*([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i.exec(cam.notes || '');
    const total = agg?.total || 0;
    const ok = agg?.ok || 0;
    return {
      assetId: String(cam.id),
      assetTag: cam.assetTag || '',
      name: cam.name || 'Caméra IP',
      location: cam.location || '',
      ip: ipMatch ? ipMatch[1] : '—',
      status: cam.status || 'Affecté',
      totalChecks: total,
      okChecks: ok,
      issueCount: agg?.issues || 0,
      availabilityPct: total > 0 ? Math.round((ok / total) * 100) : 100,
      lastCheckDate: agg?.lastDate ? agg.lastDate.slice(0, 10) : '',
      lastCheckedBy: agg?.lastBy || '',
      lastStatus: agg?.lastStatus || 'Non contrôlée',
      lastNote: agg?.lastNote || '',
    };
  });

  // 7. 93 Software Assignments
  const softwareAssignments: LiveSoftwareAssignmentRow[] = itTrackingRaw
    .filter((r) => r && r.type === 'softwareAssignment')
    .map((r) => {
      const swId = String(r.softwareId || '');
      const meta = SOFTWARE_LABELS[swId] || {
        name: swId.replace(/^software-default-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        editor: 'Éditeur',
      };
      return {
        id: String(r.id),
        softwareId: swId,
        softwareName: meta.name,
        editor: meta.editor,
        employeeId: String(r.employeeId || ''),
        employeeName: resolveEmpName(r.employeeId) || 'Poste non identifié',
        departmentName: resolveDeptName(undefined, r.employeeId) || 'SOGEDIPROMA',
        createdAt: r.createdAt || '',
        createdBy: r.createdBy || '',
      };
    });

  // 8. 194 RBAC Accesses
  const accesses: LiveAccessRbacRow[] = accessesRaw.map((acc) => ({
    id: String(acc.id),
    system: (acc.system || acc.category || 'Système IT').trim(),
    category: acc.category || 'Application',
    account: acc.account || '—',
    role: acc.role || 'Utilisateur',
    scope: acc.scope || '',
    status: acc.status || 'Actif',
    employeeId: String(acc.employeeId || ''),
    employeeName: resolveEmpName(acc.employeeId),
    departmentName: resolveDeptName(acc.departmentId, acc.employeeId),
    grantedAt: acc.grantedAt || '',
    approvedBy: acc.approvedBy || '',
    reviewDate: acc.reviewDate || '',
    notes: acc.notes || '',
  }));

  // 9. Derived Budget Consumption
  const budgetRealMap = new Map<string, { spent: number; committed: number }>();
  const addBudgetSpend = (budgetId: string | undefined, spentDelta: number, committedDelta: number) => {
    if (!budgetId) return;
    const cur = budgetRealMap.get(budgetId) || { spent: 0, committed: 0 };
    cur.spent += spentDelta;
    cur.committed += committedDelta;
    budgetRealMap.set(budgetId, cur);
  };

  purchasesRaw.forEach((p) => {
    const total = (Number(p.quantity) || 1) * (Number(p.unitPrice) || 0);
    if (p.receivedApplied || p.status === 'Reçu') addBudgetSpend(p.budgetId, total, 0);
    else addBudgetSpend(p.budgetId, 0, total);
  });

  assetsRaw.forEach((a) => {
    addBudgetSpend(a.budgetId, Number(a.purchasePrice) || 0, 0);
  });

  (Array.isArray(raw.maintenance) ? raw.maintenance : []).forEach((m) => {
    addBudgetSpend(m.budgetId, Number(m.cost) || 0, 0);
  });

  subscriptionsRaw.forEach((s) => {
    const sRec = s as unknown as Record<string, unknown>;
    const budgetId = typeof sRec.budgetId === 'string' ? sRec.budgetId : undefined;
    const cur = inferSubscriptionCurrency(s, currency);
    const parsed = detectCurrencyAndConvertToAr(
      `${s.amount || 0} ${cur} / ${s.billingCycle || 'Mensuel'}`,
      fxRates
    );
    if (s.status === 'Active' || s.status === 'Essai') {
      addBudgetSpend(budgetId, 0, parsed.annualizedAr);
    }
  });

  const budgetsSummary = budgetsRaw.map((b) => {
    const derived = budgetRealMap.get(String(b.id));
    return {
      id: String(b.id),
      name: b.name,
      category: b.category || 'Infrastructure',
      fiscalYear: Number(b.fiscalYear) || 2027,
      allocatedAr: Number(b.allocated) || 0,
      derivedSpentAr: Math.max(Number(b.spent) || 0, Math.round(derived?.spent || 0)),
      derivedCommittedAr: Math.max(Number(b.committed) || 0, Math.round(derived?.committed || 0)),
    };
  });

  const assetsWithQr = assetsRaw.filter((a) =>
    Boolean((a as unknown as Record<string, unknown>).inventoryQrCode)
  ).length;

  return {
    syncedAt: new Date().toISOString(),
    revision,
    company: settings.company || 'SOGEDIPROMA',
    currency,
    counts: {
      assets: assetsRaw.length,
      assetsWithQr,
      inventoryItems: inventoryRaw.length,
      stockMovements: stockMovements.length,
      purchases: purchasesRaw.length,
      employees: employees.length,
      fleetPhones: employees.filter((e) => Boolean(e.fleetPhone)).length,
      chartersSigned: employees.filter((e) => e.hasCharter).length,
      departments: departments.length,
      suppliers: suppliers.length,
      tickets: Array.isArray(raw.tickets) ? raw.tickets.length : 0,
      workLogs: Array.isArray(raw.workLogs) ? raw.workLogs.length : 0,
      maintenances: Array.isArray(raw.maintenance) ? raw.maintenance.length : 0,
      cameraChecks: cameraChecksRaw.length,
      camerasTotal: cameraHealth.length,
      subscriptions: subscriptionsRaw.length,
      softwareAssignments: softwareAssignments.length,
      accesses: accesses.length,
      budgets: budgetsRaw.length,
      campaignChecked: inventoryCampaign?.checkedItems || 0,
      campaignTotal: inventoryCampaign?.totalItems || 0,
    },
    employees,
    departments,
    suppliers,
    inventoryItems,
    stockMovements,
    inventoryCampaign,
    cameraHealth,
    softwareAssignments,
    accesses,
    budgetsSummary,
  };
}

export function loadSogedipromaLiveSnapshot(): SogedipromaLiveSnapshot | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LIVE_SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SogedipromaLiveSnapshot;
  } catch {
    return null;
  }
}

export function saveSogedipromaLiveSnapshot(
  raw: SogedipromaStateData,
  revision?: number
): SogedipromaLiveSnapshot {
  const snapshot = buildSogedipromaLiveSnapshot(raw, revision);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LIVE_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LIVE_SNAPSHOT_EVENT, { detail: snapshot }));
    }
  } catch {
    // Quota localStorage éventuelle -> conserver en mémoire événementielle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LIVE_SNAPSHOT_EVENT, { detail: snapshot }));
    }
  }
  return snapshot;
}

export function useSogedipromaLiveSnapshot(): SogedipromaLiveSnapshot | null {
  const [snapshot, setSnapshot] = useState<SogedipromaLiveSnapshot | null>(() =>
    loadSogedipromaLiveSnapshot()
  );

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<SogedipromaLiveSnapshot>;
      if (custom.detail) {
        setSnapshot(custom.detail);
      } else {
        setSnapshot(loadSogedipromaLiveSnapshot());
      }
    };
    window.addEventListener(LIVE_SNAPSHOT_EVENT, handleUpdate);
    return () => window.removeEventListener(LIVE_SNAPSHOT_EVENT, handleUpdate);
  }, []);

  return snapshot;
}
