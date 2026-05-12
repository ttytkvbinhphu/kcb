import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer, 
  collection, 
  getDocs, 
  setDoc as firestoreSetDoc, 
  updateDoc as firestoreUpdateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  deleteDoc, 
  enableIndexedDbPersistence, 
  addDoc as firestoreAddDoc, 
  writeBatch as firestoreWriteBatch,
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: Browser not supported');
    }
  });
}

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function sanitizeData(data: any, seen = new WeakSet()): any {
  if (data === undefined) return null;
  if (data === null) return null;
  
  if (typeof data === 'object') {
    // Basic types that should be returned as is
    if (data instanceof Date) return data;
    if (data instanceof File || data instanceof Blob) return null; // Cannot save Files to Firestore directly
    
    // Firestore specific types (checked by constructor name to avoid circular dependencies)
    if (data.constructor && (data.constructor.name === 'FieldValue' || data.constructor.name === 'Timestamp')) {
      return data;
    }

    // Handle circular references
    if (seen.has(data)) return null;
    seen.add(data);

    if (Array.isArray(data)) {
      return data.map(v => sanitizeData(v, seen));
    }

    const cleaned: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const val = data[key];
        if (val !== undefined) {
          cleaned[key] = sanitizeData(val, seen);
        }
      }
    }
    return cleaned;
  }
  return data;
}

export async function setDoc(reference: any, data: any, options?: any) {
  return firestoreSetDoc(reference, sanitizeData(data), options);
}

export async function updateDoc(reference: any, data: any) {
  return firestoreUpdateDoc(reference, sanitizeData(data));
}

export async function addDoc(reference: any, data: any) {
  return firestoreAddDoc(reference, sanitizeData(data));
}

export function writeBatch(db: any) {
  const batch = firestoreWriteBatch(db);
  return {
    set: (docRef: any, data: any, options?: any) => batch.set(docRef, sanitizeData(data), options),
    update: (docRef: any, data: any) => batch.update(docRef, sanitizeData(data)),
    delete: (docRef: any) => batch.delete(docRef),
    commit: () => batch.commit()
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export async function signOut(auth: any) {
  return firebaseSignOut(auth);
}

export { signInWithPopup, onAuthStateChanged, collection, getDocs, onSnapshot, query, where, orderBy, limit, doc, getDoc, deleteDoc, serverTimestamp, increment };
export type { User };
