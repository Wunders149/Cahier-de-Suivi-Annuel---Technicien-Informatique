import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError } from './config';
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
      await setDoc(userRef, sanitizeForFirestore({
        ...userProfile,
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      }));
    } else {
      const data = existing.data() as UserProfile;
      userProfile.role = isAdmin ? 'admin' : (data.role || 'technician');
      userProfile.createdAt = data.createdAt || now;
      await setDoc(userRef, sanitizeForFirestore({
        ...userProfile,
        serverUpdatedAt: serverTimestamp(),
      }), { merge: true });
    }
    return userProfile;
  } catch (error) {
    handleFirestoreError(error, 'syncUserProfile', `users/${user.uid}`);
    return userProfile;
  }
}

/**
 * Sauvegarde le cahier de suivi dans Firestore pour un utilisateur
 */
export async function saveWorkbookToFirestore(
  userId: string,
  userEmail: string,
  data: CahierSuiviData
): Promise<void> {
  const docRef = doc(db, 'workbooks', `workbook_${userId}`);
  const now = new Date().toISOString();

  const payload = sanitizeForFirestore({
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
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  });

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'saveWorkbookToFirestore', `workbooks/workbook_${userId}`);
    throw error;
  }
}

/**
 * Récupère le cahier de suivi depuis Firestore (one-shot)
 */
export async function fetchWorkbookFromFirestore(userId: string): Promise<CahierSuiviData | null> {
  const docRef = doc(db, 'workbooks', `workbook_${userId}`);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const raw = snap.data();
    return extractWorkbookData(raw);
  } catch (error) {
    handleFirestoreError(error, 'fetchWorkbookFromFirestore', `workbooks/workbook_${userId}`);
    return null;
  }
}

/**
 * Écoute en temps réel le cahier de suivi d'un utilisateur
 */
export function subscribeToWorkbook(
  userId: string,
  onData: (data: CahierSuiviData | null) => void,
  onError: (error: unknown) => void
): Unsubscribe {
  const docRef = doc(db, 'workbooks', `workbook_${userId}`);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data();
        onData(extractWorkbookData(raw));
      } else {
        onData(null);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeToWorkbook', `workbooks/workbook_${userId}`);
      onError(err);
    }
  );
}

/**
 * Récupère la liste des cahiers (pour l'administrateur)
 */
export async function fetchAllWorkbooks(): Promise<Array<{ id: string; userEmail: string; updatedAt: string; data: CahierSuiviData }>> {
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
    handleFirestoreError(error, 'fetchAllWorkbooks', 'workbooks');
    return [];
  }
}

// Extraction sécurisée des champs pour respecter le typage CahierSuiviData
function extractWorkbookData(raw: Record<string, unknown>): CahierSuiviData {
  return normalizeWorkbookData(raw);
}
