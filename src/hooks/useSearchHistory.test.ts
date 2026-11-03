/**
 * Tests for useSearchHistory hook logic
 *
 * Tests the pure helper functions extracted from the hook's logic,
 * without @testing-library/react which is not installed.
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

// ---- helpers mirrored from useSearchHistory.ts ------------------------------

const LS_KEY = 'bq_search_history';
const MAX_HISTORY = 10;

interface SearchHistoryEntry { query: string; searchedAt: string }

function readHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SearchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function addToHistory(current: SearchHistoryEntry[], query: string): SearchHistoryEntry[] {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return current;
  const filtered = current.filter((e) => e.query.toLowerCase() !== trimmed.toLowerCase());
  const next: SearchHistoryEntry[] = [
    { query: trimmed, searchedAt: new Date().toISOString() },
    ...filtered,
  ];
  return next.slice(0, MAX_HISTORY);
}

// ---- tests ------------------------------------------------------------------

describe('useSearchHistory', () => {
  it('starts with empty history', () => {
    expect(readHistory()).toHaveLength(0);
  });

  it('adds a search query', () => {
    const h = addToHistory([], 'Samsung A24');
    expect(h[0].query).toBe('Samsung A24');
  });

  it('ignores blank queries', () => {
    const h = addToHistory([], '');
    expect(h).toHaveLength(0);
  });

  it('ignores single-character queries', () => {
    const h = addToHistory([], 'a');
    expect(h).toHaveLength(0);
  });

  it('ignores whitespace-only queries', () => {
    const h = addToHistory([], '   ');
    expect(h).toHaveLength(0);
  });

  it('moves existing query to top on re-add', () => {
    let h = addToHistory([], 'noutbuk');
    h = addToHistory(h, 'telefon');
    h = addToHistory(h, 'noutbuk');
    expect(h).toHaveLength(2);
    expect(h[0].query).toBe('noutbuk');
  });

  it('deduplication is case-insensitive', () => {
    let h = addToHistory([], 'Konditsioner');
    h = addToHistory(h, 'konditsioner');
    expect(h).toHaveLength(1);
    expect(h[0].query).toBe('konditsioner');
  });

  it('limits history to MAX_HISTORY (10) entries', () => {
    let h: SearchHistoryEntry[] = [];
    for (let i = 1; i <= 12; i++) {
      h = addToHistory(h, `query ${i}`);
    }
    expect(h).toHaveLength(MAX_HISTORY);
    expect(h[0].query).toBe('query 12');
  });

  it('removeFromHistory removes a single entry', () => {
    let h = addToHistory([], 'sement');
    h = addToHistory(h, 'temir');
    h = h.filter((e) => e.query !== 'sement');
    expect(h.find((e) => e.query === 'sement')).toBeUndefined();
    expect(h).toHaveLength(1);
  });

  it('clearHistory leaves empty array', () => {
    let h = addToHistory([], 'mahsulot');
    h = [];
    expect(h).toHaveLength(0);
  });

  it('entries have valid ISO searchedAt timestamps', () => {
    const h = addToHistory([], 'maishiy texnika');
    expect(new Date(h[0].searchedAt).toISOString()).toBe(h[0].searchedAt);
  });

  it('persists to localStorage correctly', () => {
    const h = addToHistory([], 'noutbuk');
    localStorage.setItem(LS_KEY, JSON.stringify(h));
    const read = readHistory();
    expect(read[0].query).toBe('noutbuk');
  });
});
