/**
 * useFavorites — localStorage-backed favorites for products and stores.
 *
 * Data is stored in localStorage under two keys:
 *   bq_fav_products  →  FavoriteProduct[]
 *   bq_fav_stores    →  FavoriteStore[]
 *
 * No Firebase writes are performed; user consent is implicit through the action
 * of pressing a heart/bookmark button.
 */

import { useState, useCallback, useEffect } from 'react';

const LS_KEY_PRODUCTS = 'bq_fav_products';
const LS_KEY_STORES = 'bq_fav_stores';
const MAX_FAVORITES = 100;

export interface FavoriteProduct {
  id: string;
  name: string;
  category?: string;
  imageUrl?: string;
  savedAt: string; // ISO-8601
}

export interface FavoriteStore {
  id: string;
  name: string;
  city?: string;
  address?: string;
  category?: string;
  phone?: string;
  savedAt: string; // ISO-8601
}

// ---- helpers ----------------------------------------------------------------

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // localStorage might be full or disabled — fail silently
  }
}

// ---- hook -------------------------------------------------------------------

export function useFavorites() {
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>(
    () => readList<FavoriteProduct>(LS_KEY_PRODUCTS)
  );
  const [favoriteStores, setFavoriteStores] = useState<FavoriteStore[]>(
    () => readList<FavoriteStore>(LS_KEY_STORES)
  );

  // Sync to localStorage whenever state changes
  useEffect(() => {
    writeList(LS_KEY_PRODUCTS, favoriteProducts);
  }, [favoriteProducts]);

  useEffect(() => {
    writeList(LS_KEY_STORES, favoriteStores);
  }, [favoriteStores]);

  // ---- product favorites ----

  const isProductFavorite = useCallback(
    (productId: string) => favoriteProducts.some((p) => p.id === productId),
    [favoriteProducts]
  );

  const addProductFavorite = useCallback((product: Omit<FavoriteProduct, 'savedAt'>) => {
    setFavoriteProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev; // already saved
      const next = [{ ...product, savedAt: new Date().toISOString() }, ...prev];
      return next.slice(0, MAX_FAVORITES);
    });
  }, []);

  const removeProductFavorite = useCallback((productId: string) => {
    setFavoriteProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const toggleProductFavorite = useCallback(
    (product: Omit<FavoriteProduct, 'savedAt'>) => {
      if (isProductFavorite(product.id)) {
        removeProductFavorite(product.id);
      } else {
        addProductFavorite(product);
      }
    },
    [isProductFavorite, addProductFavorite, removeProductFavorite]
  );

  // ---- store favorites ----

  const isStoreFavorite = useCallback(
    (storeId: string) => favoriteStores.some((s) => s.id === storeId),
    [favoriteStores]
  );

  const addStoreFavorite = useCallback((store: Omit<FavoriteStore, 'savedAt'>) => {
    setFavoriteStores((prev) => {
      if (prev.some((s) => s.id === store.id)) return prev;
      const next = [{ ...store, savedAt: new Date().toISOString() }, ...prev];
      return next.slice(0, MAX_FAVORITES);
    });
  }, []);

  const removeStoreFavorite = useCallback((storeId: string) => {
    setFavoriteStores((prev) => prev.filter((s) => s.id !== storeId));
  }, []);

  const toggleStoreFavorite = useCallback(
    (store: Omit<FavoriteStore, 'savedAt'>) => {
      if (isStoreFavorite(store.id)) {
        removeStoreFavorite(store.id);
      } else {
        addStoreFavorite(store);
      }
    },
    [isStoreFavorite, addStoreFavorite, removeStoreFavorite]
  );

  // ---- clear all ----

  const clearAllFavorites = useCallback(() => {
    setFavoriteProducts([]);
    setFavoriteStores([]);
  }, []);

  return {
    // data
    favoriteProducts,
    favoriteStores,
    totalFavorites: favoriteProducts.length + favoriteStores.length,
    // product helpers
    isProductFavorite,
    addProductFavorite,
    removeProductFavorite,
    toggleProductFavorite,
    // store helpers
    isStoreFavorite,
    addStoreFavorite,
    removeStoreFavorite,
    toggleStoreFavorite,
    // misc
    clearAllFavorites,
  };
}

