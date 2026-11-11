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
      await setDoc(userRef, {
        ...userProfile,
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });
    } else {
      const data = existing.data() as UserProfile;
      userProfile.role = isAdmin ? 'admin' : (data.role || 'technician');
      userProfile.createdAt = data.createdAt || now;
      await setDoc(userRef, {
        ...userProfile,
        serverUpdatedAt: serverTimestamp(),
      }, { merge: true });
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

  const payload = {
    id: `workbook_${userId}`,
    userId,
    userEmail,
    annee: data.generalInfo.anneeReference,
    generalInfo: data.generalInfo,
    objectifsAnnuels: data.objectifsAnnuels,
    jalonsCalendrier: data.jalonsCalendrier,
    journalTaches: data.journalTaches,
    interventions: data.interventions,
    maintenances: data.maintenances,
    reseauEquipements: data.reseauEquipements,
    reseauIncidents: data.reseauIncidents,
    reseauTestsDebit: data.reseauTestsDebit,
    parcEquipements: data.parcEquipements,
    logicielsLicences: data.logicielsLicences,
    sauvegardes: data.sauvegardes,
    incidentsSecurite: data.incidentsSecurite,
    consommables: data.consommables,
    demandesAchat: data.demandesAchat,
    rapportsMensuels: data.rapportsMensuels,
    bilansTrimestriels: data.bilansTrimestriels,
    bilanAnnuel: data.bilanAnnuel,
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  };

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
  return {
    generalInfo: raw.generalInfo as CahierSuiviData['generalInfo'],
    objectifsAnnuels: (raw.objectifsAnnuels || []) as CahierSuiviData['objectifsAnnuels'],
    jalonsCalendrier: (raw.jalonsCalendrier || []) as CahierSuiviData['jalonsCalendrier'],
    journalTaches: (raw.journalTaches || []) as CahierSuiviData['journalTaches'],
    interventions: (raw.interventions || []) as CahierSuiviData['interventions'],
    maintenances: (raw.maintenances || []) as CahierSuiviData['maintenances'],
    reseauEquipements: (raw.reseauEquipements || []) as CahierSuiviData['reseauEquipements'],
    reseauIncidents: (raw.reseauIncidents || []) as CahierSuiviData['reseauIncidents'],
    reseauTestsDebit: (raw.reseauTestsDebit || []) as CahierSuiviData['reseauTestsDebit'],
    parcEquipements: (raw.parcEquipements || []) as CahierSuiviData['parcEquipements'],
    logicielsLicences: (raw.logicielsLicences || []) as CahierSuiviData['logicielsLicences'],
    sauvegardes: (raw.sauvegardes || []) as CahierSuiviData['sauvegardes'],
    incidentsSecurite: (raw.incidentsSecurite || []) as CahierSuiviData['incidentsSecurite'],
    consommables: (raw.consommables || []) as CahierSuiviData['consommables'],
    demandesAchat: (raw.demandesAchat || []) as CahierSuiviData['demandesAchat'],
    rapportsMensuels: (raw.rapportsMensuels || []) as CahierSuiviData['rapportsMensuels'],
    bilansTrimestriels: (raw.bilansTrimestriels || []) as CahierSuiviData['bilansTrimestriels'],
    bilanAnnuel: raw.bilanAnnuel as CahierSuiviData['bilanAnnuel'],
  };
}
