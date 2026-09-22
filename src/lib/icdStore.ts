import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, getDocs, doc, getDoc, updateDoc, setDoc } from '../firebase';
import { ICD10 } from '../types';
import { sanitizeFirestoreData } from './utils';

export interface IndexedICD10 {
  raw: ICD10;
  codeLower: string;
  codeNoAccents: string;
  searchContentLower: string;
  searchContentNoAccents: string;
  guideLower: string;
  guideNoAccents: string;
  hasGuide: boolean;
  firstChar: string;
  categories: string[];
  statuses: string[];
  cleanCode: string;
}

export const removeAccents = (str?: string) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
};

let cachedIcdList: ICD10[] = [];
let cachedIndexedIcdList: IndexedICD10[] = [];
let hasLoadedFromLocalStorage = false;

export function buildIndexedIcdList(list: ICD10[]): IndexedICD10[] {
  if (!list || list.length === 0) return [];
  
  // Pre-sort list once with fast ascii comparison
  const sorted = [...list].sort((a, b) => {
    const codeA = a.code || '';
    const codeB = b.code || '';
    return codeA < codeB ? -1 : (codeA > codeB ? 1 : 0);
  });

  return sorted.map((icd) => {
    const code = icd.code || '';
    const desc = icd.description || '';
    const oldName = icd.oldName || '';
    const notes = icd.notes || '';
    const chapter = icd.chapterName || '';
    const block = icd.blockName || '';
    const guide = icd.guide || '';
    const hasGuide = !!(guide && guide.trim() !== '');

    const codeLower = code.toLowerCase();
    const codeNoAccents = removeAccents(code);

    const groupCode = icd.groupCode || '';
    const fullSearch = `${desc} ${oldName} ${notes} ${chapter} ${block} ${groupCode}`;
    const searchContentLower = fullSearch.toLowerCase();
    const searchContentNoAccents = removeAccents(fullSearch);

    const guideLower = guide.toLowerCase();
    const guideNoAccents = hasGuide ? removeAccents(guide) : '';

    const firstChar = code[0]?.toUpperCase() || '';

    const categories: string[] = [];
    if (icd.isAppendixA2) categories.push('appendix_a2');
    if (icd.isAppendixA3) categories.push('appendix_a3');
    if (icd.isRestricted) categories.push('restricted');
    if (icd.isAppendixA4) categories.push('appendix_a4');
    if (icd.isAppendixA5) categories.push('appendix_a5');
    if (icd.isAppendixA6) categories.push('appendix_a6');
    if (icd.isTT26) categories.push('tt26');
    if (categories.length === 0) categories.push('normal');

    const statuses: string[] = [];
    if (icd.isExpired) {
      statuses.push('expired');
    } else {
      statuses.push('valid');
      if (icd.isNew) statuses.push('new');
      if (oldName && oldName.trim() !== '') statuses.push('new_name');
    }

    return {
      raw: icd,
      codeLower,
      codeNoAccents,
      searchContentLower,
      searchContentNoAccents,
      guideLower,
      guideNoAccents,
      hasGuide,
      firstChar,
      categories,
      statuses,
      cleanCode: code.trim().toUpperCase(),
    };
  });
}

// Load from localStorage on module evaluation
function loadFromLocalStorage(): ICD10[] {
  if (hasLoadedFromLocalStorage) return cachedIcdList;
  try {
    const saved = localStorage.getItem('kcb_offline_icd10');
    if (saved) {
      cachedIcdList = JSON.parse(saved);
      cachedIndexedIcdList = buildIndexedIcdList(cachedIcdList);
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
      const data = sanitizeFirestoreData(doc.data());
      return { ...data, code: data.code || doc.id, id: doc.id } as ICD10;
    });

    cachedIcdList = list;
    cachedIndexedIcdList = buildIndexedIcdList(list);

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
 * Returns pre-indexed and pre-sorted ICD-10 list directly from memory with 0ms compute overhead.
 */
export function getOfflineIndexedICD10(): IndexedICD10[] {
  loadFromLocalStorage();
  if (cachedIndexedIcdList.length === 0 && cachedIcdList.length > 0) {
    cachedIndexedIcdList = buildIndexedIcdList(cachedIcdList);
  }
  return cachedIndexedIcdList;
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
