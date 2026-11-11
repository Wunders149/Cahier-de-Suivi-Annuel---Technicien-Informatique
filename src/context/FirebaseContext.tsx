import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  User,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider, testFirestoreConnection } from '../firebase/config';
import {
  UserProfile,
  syncUserProfile,
  saveWorkbookToFirestore,
  subscribeToWorkbook,
  ADMIN_EMAIL
} from '../firebase/firestoreService';
import { CahierSuiviData } from '../types/it-tracker';

export type SyncStatus = 'synced' | 'saving' | 'local' | 'error';

interface FirebaseContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoadingAuth: boolean;
  isFirestoreConnected: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  errorMessage: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveDataToCloud: (data: CahierSuiviData) => Promise<void>;
  dismissError: () => void;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

interface FirebaseProviderProps {
  children: React.ReactNode;
  onCloudDataReceived?: (data: CahierSuiviData) => void;
  currentLocalData: CahierSuiviData;
}

export function FirebaseProvider({
  children,
  onCloudDataReceived,
  currentLocalData
}: FirebaseProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pour éviter des boucles d'écoutes
  const isSavingRef = useRef(false);
  const currentLocalDataRef = useRef(currentLocalData);
  currentLocalDataRef.current = currentLocalData;

  // 1. Tester la connexion Firestore au montage
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      setIsFirestoreConnected(connected);
    });
  }, []);

  // 2. Écouter l'état d'authentification Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userProf = await syncUserProfile(currentUser);
          setProfile(userProf);
          setSyncStatus('synced');
        } catch (err) {
          console.error('Erreur profil utilisateur:', err);
        }
      } else {
        setProfile(null);
        setSyncStatus('local');
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Écouter en temps réel les changements du cahier sur Firestore
  useEffect(() => {
    if (!user) return;

    let initialLoadDone = false;

    const unsubscribeDoc = subscribeToWorkbook(
      user.uid,
      async (cloudData) => {
        if (!initialLoadDone) {
          initialLoadDone = true;
          if (cloudData) {
            // Document distant existant -> mise à jour locale
            if (onCloudDataReceived) {
              onCloudDataReceived(cloudData);
            }
            setSyncStatus('synced');
            setLastSyncTime(new Date());
          } else {
            // Aucun document dans le cloud -> sauvegarde automatique des données locales actuelles
            try {
              setSyncStatus('saving');
              await saveWorkbookToFirestore(
                user.uid,
                user.email || '',
                currentLocalDataRef.current
              );
              setSyncStatus('synced');
              setLastSyncTime(new Date());
            } catch (err) {
              console.error('Erreur premier envoi du cahier vers le Cloud:', err);
              setSyncStatus('error');
            }
          }
          return;
        }

        // Mises à jour distantes ultérieures (multi-onglets / multi-appareils)
        if (cloudData && !isSavingRef.current) {
          if (onCloudDataReceived) {
            onCloudDataReceived(cloudData);
          }
          setSyncStatus('synced');
          setLastSyncTime(new Date());
        }
      },
      (err) => {
        console.error('Erreur écoute temps réel Firestore:', err);
        setSyncStatus('error');
        setErrorMessage('Erreur de synchronisation avec le Cloud Firestore.');
      }
    );

    return () => unsubscribeDoc();
  }, [user, onCloudDataReceived]);

  // Sauvegarde explicite ou programmée dans le Cloud
  const saveDataToCloud = useCallback(async (dataToSave: CahierSuiviData) => {
    if (!user) {
      setSyncStatus('local');
      return;
    }

    try {
      isSavingRef.current = true;
      setSyncStatus('saving');
      await saveWorkbookToFirestore(user.uid, user.email || '', dataToSave);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Erreur sauvegarde Cloud:', err);
      setSyncStatus('error');
      setErrorMessage('Impossible d\'enregistrer dans le Cloud. Vérifiez votre connexion.');
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 500);
    }
  }, [user]);

  // Connexion Google
  const signInWithGoogle = async () => {
    try {
      setErrorMessage(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Erreur connexion Google:', err);
      const e = err as { code?: string; message?: string };
      if (e.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(`Connexion échouée : ${e.message || 'Erreur inconnue'}`);
      }
    }
  };

  // Déconnexion
  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setSyncStatus('local');
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    }
  };

  const isAdmin = Boolean(
    user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  return (
    <FirebaseContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isLoadingAuth,
        isFirestoreConnected,
        syncStatus,
        lastSyncTime,
        errorMessage,
        signInWithGoogle,
        signOut,
        saveDataToCloud,
        dismissError: () => setErrorMessage(null),
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase doit être utilisé au sein d\'un FirebaseProvider');
  }
  return context;
}
