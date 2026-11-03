/**
 * Normalizes text for search tolerance across Uzbek, Karakalpak, Russian,
 * Latin, Cyrillic alphabets and diverse apostrophe characters.
 */

// Cyrillic to Latin mapping for basic phonetic equivalence
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh',
  ъ: '',
  ы: 'i',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  // Karakalpak / Uzbek specific Cyrillic
  ғ: 'g',
  қ: 'q',
  ў: 'o',
  ҳ: 'h',
  ү: 'u',
  ә: 'a',
  ң: 'n',
  ө: 'o',
};

/**
 * Converts Cyrillic letters to Latin phonetic equivalents
 */
export function cyrillicToLatinUzbek(text?: string | null): string {
  if (!text) return '';
  const lower = text.toLowerCase();
  let converted = '';
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    converted += CYRILLIC_TO_LATIN[char] !== undefined ? CYRILLIC_TO_LATIN[char] : char;
  }
  return converted;
}

/**
 * Strips diacritics, unifies apostrophes, converts cyrillic to latin and removes noise.
 */
export function normalizeSearchQuery(text?: string | null): string {
  if (!text) return '';

  let normalized = text.toLowerCase().trim();

  // Convert Karakalpak / Uzbek specific latin characters before decomposition
  normalized = normalized
    .replace(/[óòö]/g, 'o')
    .replace(/[ıíìï]/g, 'i')
    .replace(/[ńñ]/g, 'n')
    .replace(/[ǵğ]/g, 'g')
    .replace(/[úùü]/g, 'u')
    .replace(/[áàä]/g, 'a');

  // Normalize Unicode and strip combining diacritics
  normalized = normalized.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // Convert Cyrillic letters to Latin
  normalized = cyrillicToLatinUzbek(normalized);

  // Unify all apostrophes and quote variants to standard single quote or remove
  normalized = normalized.replace(/[`ʻ’‘'´]/g, '');

  // Collapse multiple whitespaces and strip non-alphanumeric except spaces
  normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Phonetically simplifies Latin text so that cross-lingual variants like:
 * 'sement' <-> 'tsement' <-> 'cement'
 * 'telefon' <-> 'telephone'
 * match seamlessly.
 */
export function simplifyPhonetics(text: string): string {
  return text
    .replace(/ts/g, 's')
    .replace(/tc/g, 's')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/ck/g, 'k')
    .replace(/ph/g, 'f')
    .replace(/kh/g, 'x')
    .replace(/gh/g, 'g');
}

/**
 * Checks whether target text matches the search query using tolerant fuzzy-token matching.
 * Tolerant to Uzbek, Karakalpak, Russian Cyrillic/Latin, and phonetic variants.
 */
export function matchesSearchQuery(
  targetText: string,
  searchQuery: string
): boolean {
  if (!searchQuery.trim()) return true;
  if (!targetText.trim()) return false;

  const normalizedTarget = normalizeSearchQuery(targetText);
  const normalizedQuery = normalizeSearchQuery(searchQuery);

  if (!normalizedQuery) return true;

  // Direct substring match
  if (normalizedTarget.includes(normalizedQuery)) {
    return true;
  }

  // Multi-token match (all query words must appear in target)
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const allTokensMatch = queryTokens.every((token) => normalizedTarget.includes(token));
  if (allTokensMatch) {
    return true;
  }

  // Phonetic tolerance match (e.g. 'цемент' -> 'tsement' vs 'sement', 'telefon' vs 'телефон')
  const phoneticTarget = simplifyPhonetics(normalizedTarget);
  const phoneticQuery = simplifyPhonetics(normalizedQuery);

  if (phoneticTarget.includes(phoneticQuery)) {
    return true;
  }

  const phoneticTokens = phoneticQuery.split(/\s+/).filter(Boolean);
  return phoneticTokens.every((token) => phoneticTarget.includes(token));
}

/**
 * Checks if a ProductItem comprehensively matches a search query across:
 * - name
 * - category
 * - brand
 * - searchKeywords
 * - description
 */
export function productMatchesQuery(
  product: {
    name: string;
    category?: string;
    brand?: string;
    description?: string;
    searchKeywords?: string[];
    normalizedName?: string;
  },
  searchQuery: string
): boolean {
  const query = searchQuery.trim();
  if (!query) return true;

  // 1. Direct name match
  if (matchesSearchQuery(product.name, query)) return true;

  // 2. Normalized name check
  if (product.normalizedName && matchesSearchQuery(product.normalizedName, query)) return true;

  // 3. Search keywords match
  if (product.searchKeywords && product.searchKeywords.length > 0) {
    const joinedKeywords = product.searchKeywords.join(' ');
    if (matchesSearchQuery(joinedKeywords, query)) return true;
  }

  // 4. Brand match
  if (product.brand && matchesSearchQuery(product.brand, query)) return true;

  // 5. Category match
  if (product.category && matchesSearchQuery(product.category, query)) return true;

  // 6. Description match
  if (product.description && matchesSearchQuery(product.description, query)) return true;

  return false;
}

/**
 * Alias for tolerant token matching
 */
export const fuzzyMatchTokens = matchesSearchQuery;

