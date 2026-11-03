/**
 * useSearchHistory — localStorage-backed search history.
 *
 * Stores the last MAX_HISTORY unique search queries under the key
 * `bq_search_history` in localStorage.
 *
 * Queries are stored normalised (trimmed) to avoid near-duplicate entries.
 * No Firebase writes; no user-identifiable data leaves the device.
 */

import { useState, useCallback, useEffect } from 'react';

const LS_KEY = 'bq_search_history';
const MAX_HISTORY = 10;

export interface SearchHistoryEntry {
  query: string;
  searchedAt: string; // ISO-8601
}

// ---- helpers ----------------------------------------------------------------

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

function writeHistory(history: SearchHistoryEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(history));
  } catch {
    // localStorage full or disabled — fail silently
  }
}

// ---- hook -------------------------------------------------------------------

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(() => readHistory());

  // Persist to localStorage on change
  useEffect(() => {
    writeHistory(history);
  }, [history]);

  /**
   * Add a query to the history.
   * If the same query (case-insensitive trim) already exists, it is moved to the top.
   */
  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    setHistory((prev) => {
      const filtered = prev.filter(
        (e) => e.query.toLowerCase() !== trimmed.toLowerCase()
      );
      const next: SearchHistoryEntry[] = [
        { query: trimmed, searchedAt: new Date().toISOString() },
        ...filtered,
      ];
      return next.slice(0, MAX_HISTORY);
    });
  }, []);

  /** Remove a single entry by query string */
  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => prev.filter((e) => e.query !== query));
  }, []);

  /** Remove all history entries */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}

