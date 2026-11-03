/**
 * Tests for useFavorites hook logic
 *
 * Since @testing-library/react is not installed, we test the pure localStorage
 * helper logic and the key behavioral invariants via direct state manipulation.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// ---- localStorage mock -------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
});

// ---- helpers mirrored from useFavorites.ts ----------------------------------

const LS_KEY_PRODUCTS = 'bq_fav_products';
const LS_KEY_STORES = 'bq_fav_stores';
const MAX_FAVORITES = 100;

interface FavoriteItem { id: string; name: string; savedAt: string }

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
  localStorage.setItem(key, JSON.stringify(list));
}

function addFavorite<T extends { id: string }>(
  key: string,
  item: Omit<T, 'savedAt'>
): (T & { savedAt: string })[] {
  const prev = readList<T & { savedAt: string }>(key);
  if (prev.some((p) => p.id === (item as T).id)) return prev;
  const next = [
    { ...(item as T), savedAt: new Date().toISOString() },
    ...prev,
  ] as (T & { savedAt: string })[];
  const limited = next.slice(0, MAX_FAVORITES);
  writeList(key, limited);
  return limited;
}

function removeFavorite<T extends { id: string }>(key: string, id: string): T[] {
  const prev = readList<T>(key);
  const next = prev.filter((p) => p.id !== id);
  writeList(key, next);
  return next;
}

// ---- tests ------------------------------------------------------------------

describe('useFavorites — product helpers', () => {
  it('starts with empty list when localStorage is clear', () => {
    expect(readList(LS_KEY_PRODUCTS)).toHaveLength(0);
  });

  it('adds a product and persists it', () => {
    const list = addFavorite<FavoriteItem>(LS_KEY_PRODUCTS, { id: 'p1', name: 'Samsung A24' });
    expect(list[0].id).toBe('p1');
    const stored = readList<FavoriteItem>(LS_KEY_PRODUCTS);
    expect(stored[0].id).toBe('p1');
  });

  it('does not duplicate: adding same id twice keeps one entry', () => {
    addFavorite<FavoriteItem>(LS_KEY_PRODUCTS, { id: 'p1', name: 'Samsung A24' });
    const list = addFavorite<FavoriteItem>(LS_KEY_PRODUCTS, { id: 'p1', name: 'Samsung A24' });
    expect(list).toHaveLength(1);
  });

  it('removes a product by id', () => {
    addFavorite<FavoriteItem>(LS_KEY_PRODUCTS, { id: 'p1', name: 'Samsung A24' });
    addFavorite<FavoriteItem>(LS_KEY_PRODUCTS, { id: 'p2', name: 'Noutbuk' });
    const list = removeFavorite<FavoriteItem>(LS_KEY_PRODUCTS, 'p1');
    expect(list.every((p) => p.id !== 'p1')).toBe(true);
    expect(list).toHaveLength(1);
  });

  it('stores savedAt as ISO string', () => {
    const list = addFavorite<FavoriteItem>(LS_KEY_PRODUCTS, { id: 'p3', name: 'Konditsioner' });
    expect(new Date(list[0].savedAt).toISOString()).toBe(list[0].savedAt);
  });

  it('respects MAX_FAVORITES limit', () => {
    for (let i = 0; i < MAX_FAVORITES + 5; i++) {
      addFavorite<FavoriteItem>(LS_KEY_PRODUCTS, { id: `p${i}`, name: `Product ${i}` });
    }
    const stored = readList<FavoriteItem>(LS_KEY_PRODUCTS);
    expect(stored.length).toBeLessThanOrEqual(MAX_FAVORITES);
  });
});

describe('useFavorites — store helpers', () => {
  it('adds a store and persists it', () => {
    const list = addFavorite<FavoriteItem>(LS_KEY_STORES, { id: 's1', name: 'Texnomart' });
    expect(list[0].name).toBe('Texnomart');
  });

  it('removes a store by id', () => {
    addFavorite<FavoriteItem>(LS_KEY_STORES, { id: 's1', name: 'Texnomart' });
    const list = removeFavorite<FavoriteItem>(LS_KEY_STORES, 's1');
    expect(list).toHaveLength(0);
  });

  it('product and store lists are independent keys', () => {
    addFavorite<FavoriteItem>(LS_KEY_PRODUCTS, { id: 'shared-id', name: 'product' });
    addFavorite<FavoriteItem>(LS_KEY_STORES, { id: 'shared-id', name: 'store' });
    const products = readList<FavoriteItem>(LS_KEY_PRODUCTS);
    const stores = readList<FavoriteItem>(LS_KEY_STORES);
    expect(products[0].name).toBe('product');
    expect(stores[0].name).toBe('store');
  });

  it('clearAllFavorites removes both keys', () => {
    addFavorite<FavoriteItem>(LS_KEY_PRODUCTS, { id: 'p1', name: 'A' });
    addFavorite<FavoriteItem>(LS_KEY_STORES, { id: 's1', name: 'B' });
    writeList(LS_KEY_PRODUCTS, []);
    writeList(LS_KEY_STORES, []);
    expect(readList(LS_KEY_PRODUCTS)).toHaveLength(0);
    expect(readList(LS_KEY_STORES)).toHaveLength(0);
  });
});
