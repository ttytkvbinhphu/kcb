import { useState, useEffect, useCallback } from "react";
import {
  db,
  auth,
  doc,
  onSnapshot,
  setDoc,
  onAuthStateChanged,
  handleFirestoreError,
  OperationType,
} from "../firebase";

const STORAGE_KEY = "kcb_drug_favorites";

// In-memory cache of favorite drug IDs
let cachedFavorites: string[] = [];
let hasLoadedLocal = false;
let currentActiveUid: string | null = null;
let firestoreUnsubscribe: (() => void) | null = null;

// Global listeners for instant cross-component updates
const listeners = new Set<(ids: string[]) => void>();

function notifyListeners() {
  const current = [...cachedFavorites];
  listeners.forEach((cb) => {
    try {
      cb(current);
    } catch (e) {
      console.error("Error in favorites listener:", e);
    }
  });
}

function getActiveUserUid(): string | null {
  if (currentActiveUid) return currentActiveUid;
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  if (typeof localStorage !== "undefined") {
    try {
      const savedStaff = localStorage.getItem("staff_login_session");
      if (savedStaff) {
        const parsed = JSON.parse(savedStaff);
        if (parsed?.uid) return parsed.uid;
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

function getUserStorageKey(uid?: string | null): string {
  const targetUid = uid || getActiveUserUid();
  return targetUid ? `${STORAGE_KEY}_${targetUid}` : STORAGE_KEY;
}

function loadFavoritesFromStorage(): string[] {
  if (hasLoadedLocal && cachedFavorites.length > 0) return cachedFavorites;
  
  if (typeof localStorage === "undefined") return cachedFavorites;

  try {
    const userKey = getUserStorageKey();
    let saved = localStorage.getItem(userKey);
    // Fallback to legacy global key if user-specific key is empty
    if (!saved && userKey !== STORAGE_KEY) {
      saved = localStorage.getItem(STORAGE_KEY);
    }

    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        cachedFavorites = parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load drug favorites from localStorage:", err);
  }
  hasLoadedLocal = true;
  return cachedFavorites;
}

function saveFavoritesToLocalStorage(ids: string[], uid?: string | null) {
  cachedFavorites = ids;
  if (typeof localStorage !== "undefined") {
    try {
      const userKey = getUserStorageKey(uid);
      localStorage.setItem(userKey, JSON.stringify(ids));
      // Also update default key for general access
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));

      // Update staff_login_session if matching
      const targetUid = uid || getActiveUserUid();
      const savedStaff = localStorage.getItem("staff_login_session");
      if (savedStaff && targetUid) {
        const parsed = JSON.parse(savedStaff);
        if (parsed.uid === targetUid) {
          parsed.favoriteDrugIds = ids;
          localStorage.setItem("staff_login_session", JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.error("Failed to save drug favorites to localStorage:", err);
    }
  }
  notifyListeners();
}

/**
 * Persist favorites to Firestore asynchronously
 */
async function syncFavoritesToFirestore(ids: string[], targetUid?: string | null) {
  const uid = targetUid || getActiveUserUid();
  if (!uid) return;

  try {
    await setDoc(
      doc(db, "users", uid),
      {
        favoriteDrugIds: ids,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Failed to sync favorites to Firestore:", error);
    try {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    } catch (e) {
      // Ignored non-fatal logging
    }
  }
}

/**
 * Setup Realtime Firestore Listener for the active user
 */
export function setCurrentUserUidForFavorites(uid: string | null) {
  if (uid === currentActiveUid && firestoreUnsubscribe) return;

  // Teardown previous listener
  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }

  currentActiveUid = uid;

  if (!uid) {
    // If logged out, reload local default
    hasLoadedLocal = false;
    loadFavoritesFromStorage();
    notifyListeners();
    return;
  }

  // Load user-specific local cache first for instant feedback
  hasLoadedLocal = false;
  loadFavoritesFromStorage();
  notifyListeners();

  // Attach Firestore realtime listener
  try {
    const userDocRef = doc(db, "users", uid);
    firestoreUnsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        const cloudFavorites = data?.favoriteDrugIds;

        if (Array.isArray(cloudFavorites)) {
          // Compare with current local to prevent unnecessary re-renders
          const isIdentical =
            cloudFavorites.length === cachedFavorites.length &&
            cloudFavorites.every((id, idx) => id === cachedFavorites[idx]);

          if (!isIdentical) {
            cachedFavorites = cloudFavorites;
            saveFavoritesToLocalStorage(cloudFavorites, uid);
          }
        } else if (cachedFavorites.length > 0) {
          // Cloud has no favoriteDrugIds field yet, but local device has saved favorites:
          // Sync local favorites up to cloud so the user doesn't lose existing favorites!
          syncFavoritesToFirestore(cachedFavorites, uid);
        }
      },
      (error) => {
        console.warn("Realtime favorites sync listener error:", error);
      }
    );
  } catch (err) {
    console.error("Error setting up Firestore favorites listener:", err);
  }
}

// Auto-initialize with Firebase Auth listener in browser environments
if (typeof window !== "undefined") {
  loadFavoritesFromStorage();

  onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser?.uid) {
      setCurrentUserUidForFavorites(firebaseUser.uid);
    } else {
      const activeUid = getActiveUserUid();
      setCurrentUserUidForFavorites(activeUid);
    }
  });

  // Listen to cross-tab storage changes
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || (e.key && e.key.startsWith(`${STORAGE_KEY}_`))) {
      hasLoadedLocal = false;
      loadFavoritesFromStorage();
      notifyListeners();
    }
  });
}

/**
 * Get the current list of favorite drug IDs
 */
export function getFavoriteDrugIds(): string[] {
  return loadFavoritesFromStorage();
}

/**
 * Check if a drug ID is in favorites
 */
export function isDrugFavorite(drugId: string | number): boolean {
  if (!drugId && drugId !== 0) return false;
  const targetId = String(drugId).trim();
  const favs = loadFavoritesFromStorage();
  return favs.some((id) => String(id).trim() === targetId);
}

/**
 * Toggle favorite status of a drug ID. Returns the new favorite state.
 */
export function toggleFavoriteDrug(drugId: string | number, customUid?: string): boolean {
  if (!drugId && drugId !== 0) return false;
  const targetId = String(drugId).trim();
  const favs = loadFavoritesFromStorage();
  const index = favs.findIndex((id) => String(id).trim() === targetId);
  let nextFavs: string[];
  let isNowFav = false;

  if (index >= 0) {
    nextFavs = favs.filter((id) => String(id).trim() !== targetId);
    isNowFav = false;
  } else {
    nextFavs = [targetId, ...favs.filter((id) => String(id).trim() !== targetId)];
    isNowFav = true;
  }

  const targetUid = customUid || getActiveUserUid();
  saveFavoritesToLocalStorage(nextFavs, targetUid);
  syncFavoritesToFirestore(nextFavs, targetUid);
  return isNowFav;
}

/**
 * Set explicit favorite status
 */
export function setFavoriteDrug(drugId: string | number, isFav: boolean, customUid?: string): void {
  if (!drugId && drugId !== 0) return;
  const targetId = String(drugId).trim();
  const favs = loadFavoritesFromStorage();
  const exists = favs.some((id) => String(id).trim() === targetId);

  let nextFavs = favs;
  if (isFav && !exists) {
    nextFavs = [targetId, ...favs];
  } else if (!isFav && exists) {
    nextFavs = favs.filter((id) => String(id).trim() !== targetId);
  } else {
    return;
  }

  const targetUid = customUid || getActiveUserUid();
  saveFavoritesToLocalStorage(nextFavs, targetUid);
  syncFavoritesToFirestore(nextFavs, targetUid);
}

/**
 * Subscribe to changes in favorite drugs
 */
export function subscribeFavorites(callback: (ids: string[]) => void): () => void {
  listeners.add(callback);
  callback(loadFavoritesFromStorage());
  return () => {
    listeners.delete(callback);
  };
}

/**
 * React Hook for using favorite drugs
 */
export function useFavoriteDrugs(userUid?: string) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavoritesFromStorage());

  useEffect(() => {
    if (userUid && userUid !== currentActiveUid) {
      setCurrentUserUidForFavorites(userUid);
    }
  }, [userUid]);

  useEffect(() => {
    return subscribeFavorites((ids) => {
      setFavoriteIds(ids);
    });
  }, []);

  const toggle = useCallback(
    (drugId: string | number) => {
      return toggleFavoriteDrug(drugId, userUid);
    },
    [userUid]
  );

  const setFav = useCallback(
    (drugId: string | number, isFav: boolean) => {
      setFavoriteDrug(drugId, isFav, userUid);
    },
    [userUid]
  );

  const checkIsFavorite = useCallback(
    (drugId: string | number) => {
      if (!drugId && drugId !== 0) return false;
      const targetId = String(drugId).trim();
      return favoriteIds.some((id) => String(id).trim() === targetId);
    },
    [favoriteIds]
  );

  return {
    favoriteIds,
    toggleFavorite: toggle,
    setFavorite: setFav,
    isFavorite: checkIsFavorite,
    count: favoriteIds.length,
  };
}
