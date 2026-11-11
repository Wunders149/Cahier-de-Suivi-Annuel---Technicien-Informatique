import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Toujours spécifier firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export function handleFirestoreError(error: unknown, operation: string, path: string) {
  const err = error as { code?: string; message?: string };
  const errorDetails = {
    operation,
    path,
    code: err?.code || 'unknown',
    message: err?.message || String(error),
    timestamp: new Date().toISOString()
  };
  console.error('Erreur Firestore:', JSON.stringify(errorDetails, null, 2));
  return errorDetails;
}

// Test de connectivité au démarrage
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(db, '_connection_test', 'ping');
    await getDocFromServer(testDocRef);
    return true;
  } catch (error) {
    const err = error as { code?: string; message?: string };
    // Permission-denied or not-found still validates server contact
    if (err?.code === 'permission-denied' || err?.code === 'not-found') {
      return true;
    }
    console.warn('Test de connexion Firestore:', err?.message || error);
    return false;
  }
}

export default app;
