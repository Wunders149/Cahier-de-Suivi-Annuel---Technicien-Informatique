import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import { CahierSuiviData } from '../types/it-tracker';
import { User } from 'firebase/auth';
import { normalizeWorkbookData } from '../utils/backupService';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'technician' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface CloudWorkbookSnapshot {
  data: CahierSuiviData;
  updatedAt: string;
}

export interface WorkbookArchiveRecord {
  id: string;
  workbookId: string;
  userId: string;
  annee: number;
  archivedAt: string;
  summaryStats: {
    interventionsCount: number;
    tasksCount: number;
    parcCount: number;
    licencesCount: number;
    consommablesCount: number;
  };
  data: CahierSuiviData;
}

export const ADMIN_EMAIL = 'razafimahefaphilibert7@gmail.com';

/**
 * Vérifie si une valeur est un objet littéral simple (et non un FieldValue Firestore, Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Supprime récursivement toute propriété valant `undefined` ou nombre non fini
 * pour garantir la compatibilité stricte avec Firestore setDoc().
 */
function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (isPlainObject(value)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    return 0 as unknown as T;
  }

  return value;
}

/**
 * Enregistre ou met à jour le profil de l'utilisateur dans Firestore
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const now = new Date().toISOString();
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const userProfile: UserProfile = {
    userId: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Technicien IT',
    photoURL: user.photoURL || '',
    role: isAdmin ? 'admin' : 'technician',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const existing = await getDoc(userRef);
    if (!existing.exists()) {
      await setDoc(
        userRef,
        sanitizeForFirestore({
          ...userProfile,
          serverCreatedAt: serverTimestamp(),
          serverUpdatedAt: serverTimestamp(),
        })
      );
    } else {
      const data = existing.data() as UserProfile;
      userProfile.role = isAdmin ? 'admin' : data.role || 'technician';
      userProfile.createdAt = data.createdAt || now;
      await setDoc(
        userRef,
        sanitizeForFirestore({
          ...userProfile,
          serverUpdatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
    return userProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Construit la charge utile complète d'un cahier pour Firestore
 */
function buildWorkbookPayload(
  userId: string,
  userEmail: string,
  data: CahierSuiviData,
  updatedAtIso: string
) {
  return sanitizeForFirestore({
    id: `workbook_${userId}`,
    userId,
    userEmail: userEmail || '',
    annee: data.generalInfo?.anneeReference || new Date().getFullYear(),
    generalInfo: data.generalInfo || {},
    objectifsAnnuels: data.objectifsAnnuels || [],
    jalonsCalendrier: data.jalonsCalendrier || [],
    journalTaches: data.journalTaches || [],
    interventions: data.interventions || [],
    maintenances: data.maintenances || [],
    reseauEquipements: data.reseauEquipements || [],
    reseauIncidents: data.reseauIncidents || [],
    reseauTestsDebit: data.reseauTestsDebit || [],
    parcEquipements: data.parcEquipements || [],
    logicielsLicences: data.logicielsLicences || [],
    sauvegardes: data.sauvegardes || [],
    incidentsSecurite: data.incidentsSecurite || [],
    consommables: data.consommables || [],
    demandesAchat: data.demandesAchat || [],
    rapportsMensuels: data.rapportsMensuels || [],
    bilansTrimestriels: data.bilansTrimestriels || [],
    bilanAnnuel: data.bilanAnnuel || {},
    updatedAt: updatedAtIso,
    serverUpdatedAt: serverTimestamp(),
  });
}

/**
 * Sauvegarde le cahier de suivi dans Firestore pour un utilisateur
 */
export async function saveWorkbookToFirestore(
  userId: string,
  userEmail: string,
  data: CahierSuiviData
): Promise<string> {
  const path = `workbooks/workbook_${userId}`;
  const docRef = doc(db, 'workbooks', `workbook_${userId}`);
  const now = new Date().toISOString();
  const payload = buildWorkbookPayload(userId, userEmail, data, now);

  try {
    await setDoc(docRef, payload, { merge: true });
    return now;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Récupère le cahier de suivi depuis Firestore (one-shot)
 */
export async function fetchWorkbookFromFirestore(
  userId: string
): Promise<CloudWorkbookSnapshot | null> {
  const path = `workbooks/workbook_${userId}`;
  const docRef = doc(db, 'workbooks', `workbook_${userId}`);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const raw = snap.data();
    return {
      data: extractWorkbookData(raw),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Écoute en temps réel le cahier de suivi d'un utilisateur
 */
export function subscribeToWorkbook(
  userId: string,
  onData: (snapshot: CloudWorkbookSnapshot | null) => void,
  onError: (error: unknown) => void
): Unsubscribe {
  const path = `workbooks/workbook_${userId}`;
  const docRef = doc(db, 'workbooks', `workbook_${userId}`);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data();
        onData({
          data: extractWorkbookData(raw),
          updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
        });
      } else {
        onData(null);
      }
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, path);
      } catch (structuredError) {
        onError(structuredError);
      }
    }
  );
}

/**
 * Archive un exercice annuel dans la sous-collection `workbooks/workbook_{userId}/archives/{annee}`
 */
export async function archiveWorkbookYearToFirestore(
  userId: string,
  userEmail: string,
  data: CahierSuiviData,
  archiveYear?: number
): Promise<WorkbookArchiveRecord> {
  const annee = archiveYear || data.generalInfo?.anneeReference || new Date().getFullYear();
  const workbookId = `workbook_${userId}`;
  const archiveId = String(annee);
  const archivePath = `workbooks/${workbookId}/archives/${archiveId}`;
  const now = new Date().toISOString();

  // Garantir l'existence du document parent pour que les règles get() sur parent réussissent
  const parentRef = doc(db, 'workbooks', workbookId);
  const parentSnap = await getDoc(parentRef);
  if (!parentSnap.exists()) {
    await saveWorkbookToFirestore(userId, userEmail, data);
  }

  const record: WorkbookArchiveRecord = {
    id: archiveId,
    workbookId,
    userId,
    annee,
    archivedAt: now,
    summaryStats: {
      interventionsCount: data.interventions?.length || 0,
      tasksCount: data.journalTaches?.length || 0,
      parcCount: data.parcEquipements?.length || 0,
      licencesCount: data.logicielsLicences?.length || 0,
      consommablesCount: data.consommables?.length || 0,
    },
    data: normalizeWorkbookData(data),
  };

  try {
    const archiveRef = doc(db, 'workbooks', workbookId, 'archives', archiveId);
    await setDoc(
      archiveRef,
      sanitizeForFirestore({
        ...record,
        serverArchivedAt: serverTimestamp(),
      })
    );
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, archivePath);
  }
}

/**
 * Récupère toutes les archives annuelles d'un utilisateur (triées par année décroissante)
 */
export async function fetchWorkbookArchivesFromFirestore(
  userId: string
): Promise<WorkbookArchiveRecord[]> {
  const workbookId = `workbook_${userId}`;
  const path = `workbooks/${workbookId}/archives`;
  try {
    const collRef = collection(db, 'workbooks', workbookId, 'archives');
    const q = query(collRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs
      .map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          workbookId: String(d.workbookId || workbookId),
          userId: String(d.userId || userId),
          annee: Number(d.annee) || parseInt(docSnap.id, 10) || new Date().getFullYear(),
          archivedAt: String(d.archivedAt || ''),
          summaryStats: {
            interventionsCount: Number(d.summaryStats?.interventionsCount) || 0,
            tasksCount: Number(d.summaryStats?.tasksCount) || 0,
            parcCount: Number(d.summaryStats?.parcCount) || 0,
            licencesCount: Number(d.summaryStats?.licencesCount) || 0,
            consommablesCount: Number(d.summaryStats?.consommablesCount) || 0,
          },
          data: extractWorkbookData((d.data || {}) as Record<string, unknown>),
        };
      })
      .sort((a, b) => b.annee - a.annee);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Supprime une archive annuelle spécifique dans Firestore
 */
export async function deleteWorkbookArchiveFromFirestore(
  userId: string,
  archiveId: string
): Promise<void> {
  const workbookId = `workbook_${userId}`;
  const path = `workbooks/${workbookId}/archives/${archiveId}`;
  try {
    const archiveRef = doc(db, 'workbooks', workbookId, 'archives', archiveId);
    await deleteDoc(archiveRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Récupère la liste des cahiers (pour l'administrateur)
 */
export async function fetchAllWorkbooks(): Promise<
  Array<{ id: string; userEmail: string; updatedAt: string; data: CahierSuiviData }>
> {
  try {
    const collRef = collection(db, 'workbooks');
    const snap = await getDocs(collRef);
    return snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        userEmail: d.userEmail || 'Inconnu',
        updatedAt: d.updatedAt || '',
        data: extractWorkbookData(d),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'workbooks');
  }
}

// Extraction sécurisée des champs pour respecter le typage CahierSuiviData
function extractWorkbookData(raw: Record<string, unknown>): CahierSuiviData {
  return normalizeWorkbookData(raw);
}
