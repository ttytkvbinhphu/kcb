import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, getDocs, doc, getDoc, updateDoc, setDoc } from '../firebase';
import { ICD10 } from '../types';

let cachedIcdList: ICD10[] = [];
let hasLoadedFromLocalStorage = false;

// Load from localStorage on module evaluation
function loadFromLocalStorage(): ICD10[] {
  if (hasLoadedFromLocalStorage) return cachedIcdList;
  try {
    const saved = localStorage.getItem('kcb_offline_icd10');
    if (saved) {
      cachedIcdList = JSON.parse(saved);
      console.log(`Loaded ${cachedIcdList.length} ICD-10 item(s) from local storage offline cache.`);
    }
  } catch (error) {
    console.error('Failed to parse cached ICD-10 directory:', error);
  }
  hasLoadedFromLocalStorage = true;
  return cachedIcdList;
}

// Global active subscription management
const icdListeners = new Set<(list: ICD10[]) => void>();
let unsubscribeSettings: (() => void) | null = null;
let syncInProgress = false;

/**
 * Updates the sync timestamp on system_settings/main.
 * Call this when modifying ICD-10.
 */
export async function triggerIcd10Sync() {
  try {
    const settingsRef = doc(db, 'system_settings', 'main');
    const settingsSnap = await getDoc(settingsRef);
    const newTimestamp = Date.now().toString();
    if (settingsSnap.exists()) {
      await updateDoc(settingsRef, {
        icd10SyncTimestamp: newTimestamp
      });
    } else {
      await setDoc(settingsRef, {
        icd10SyncTimestamp: newTimestamp
      });
    }
    console.log('Successfully updated remote ICD-10 sync timestamp to:', newTimestamp);
  } catch (err) {
    console.error('Error triggering ICD-10 sync:', err);
  }
}

/**
 * Subscribes to changes in the 'icd10' collection via a smart offline-first synchronization process.
 * Listens to a single lightweight document 'system_settings/main' for changes in sync timestamp,
 * and performs a one-time query to fetch full ICD-10 lists to cache offline ONLY when a difference is detected.
 */
export function subscribeICD10(callback: (list: ICD10[]) => void): () => void {
  // Ensure local storage cache is evaluated
  loadFromLocalStorage();

  // Save callback
  icdListeners.add(callback);

  // Return the current cached state immediately so the calling component gets instantaneous rendered data!
  callback(cachedIcdList);

  // Create physical settings listener if not yet active
  if (!unsubscribeSettings) {
    console.log('Establishing smart Offline-First metadata sync listener for "system_settings/main"...');
    try {
      unsubscribeSettings = onSnapshot(
        doc(db, 'system_settings', 'main'),
        async (snapshot) => {
          if (!snapshot.exists()) {
            // If settings don't exist, check if local cache has values, otherwise fetch once
            if (cachedIcdList.length === 0 && !syncInProgress) {
              await fetchFullIcdCollection("initial-no-settings");
            }
            return;
          }

          const settings = snapshot.data();
          const remoteTimestamp = settings?.icd10SyncTimestamp;
          const localTimestamp = localStorage.getItem('kcb_offline_icd10_timestamp');

          // If cache is empty OR timestamps differ, trigger a one-time synchronization query
          if (cachedIcdList.length === 0 || !remoteTimestamp || localTimestamp !== remoteTimestamp) {
            if (!syncInProgress) {
              await fetchFullIcdCollection(remoteTimestamp || 'force-init');
            }
          }
        },
        (error) => {
          console.error('Firestore settings sync listener error for ICD-10:', error);
        }
      );
    } catch (e) {
      console.error('Failed to establish offline-sync onSnapshot wrapper:', e);
    }
  }

  // Return clean handle to detach
  return () => {
    icdListeners.delete(callback);
    // If there are zero active listeners left, wait 5 seconds before closing connection (in case of transitions)
    if (icdListeners.size === 0 && unsubscribeSettings) {
      console.log('No active UI subscribers for "icd10". Detaching metadata sync listener.');
      unsubscribeSettings();
      unsubscribeSettings = null;
    }
  };
}

/**
 * Fetch ICD-10 documents from Firebase and update local caches
 */
async function fetchFullIcdCollection(targetTimestamp: string) {
  syncInProgress = true;
  console.log(`[ICD-10 Sync] Syncing database offline... Fetching from Firestore server (Timestamp: ${targetTimestamp})`);
  try {
    const querySnapshot = await getDocs(collection(db, 'icd10'));
    const list = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return { ...data, code: data.code || doc.id, id: doc.id } as ICD10;
    });

    cachedIcdList = list;

    // Save copy to local disk for robust offline capability
    try {
      localStorage.setItem('kcb_offline_icd10', JSON.stringify(list));
      localStorage.setItem('kcb_offline_icd10_timestamp', targetTimestamp);
      console.log(`[ICD-10 Sync] Successfully cached ${list.length} items to LocalStorage. Sync complete.`);
    } catch (e) {
      console.error('Failed to cache ICD-10 directory to LocalStorage:', e);
    }

    // Broadcast state to all listeners
    icdListeners.forEach((listener) => {
      try {
        listener(list);
      } catch (err) {
        console.error('Error executing ICD-10 broadcast observer:', err);
      }
    });
  } catch (error) {
    console.error('[ICD-10 Sync] Failed to synchronize ICD-10 collection from remote:', error);
  } finally {
    syncInProgress = false;
  }
}

/**
 * Returns currently cached ICD-10 data synchronously from in-memory / LocalStorage cache.
 */
export function getOfflineICD10(): ICD10[] {
  loadFromLocalStorage();
  return cachedIcdList;
}

/**
 * Custom React hook that loads ICD-10 data from offline cache immediately on mount
 * and listens for live remote updates in a shared manner.
 */
export function useICD10() {
  const [icdList, setIcdList] = useState<ICD10[]>(() => {
    loadFromLocalStorage();
    return cachedIcdList;
  });
  const [loading, setLoading] = useState(() => {
    // If we already have offline cached items, we don't block with a loading spinner
    return cachedIcdList.length === 0;
  });

  useEffect(() => {
    const unsub = subscribeICD10((list) => {
      setIcdList(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { icdList, loading };
}
