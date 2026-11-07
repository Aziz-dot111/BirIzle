import { describe, it, expect } from 'vitest';
import {
  encodeOfferKey,
  decodeOfferKey,
  getCanonicalOfferId,
  getLegacyUnderscoreOfferId,
  isCanonicalOfferId,
  isLegacyUnderscoreOfferId,
  parseOfferId,
  deduplicateOffers,
  getOfferDedupeKey,
  isOfferActiveForCustomer,
  isStoreVisibleToCustomer,
} from './canonicalOffer';
import type { InventoryOffer, Store } from '@/types';

describe('Canonical Offer ID & Compatibility Utilities', () => {
  describe('Encoding & Formatting', () => {
    it('encodeOfferKey and decodeOfferKey safely round-trip special characters and delimiters', () => {
      const complexKey = 'store:central|branch/1 #2';
      const encoded = encodeOfferKey(complexKey);

      expect(encoded).not.toContain('|');
      expect(encoded).not.toContain(':');
      expect(encoded).not.toContain('/');

      const decoded = decodeOfferKey(encoded);
      expect(decoded).toBe(complexKey);
    });

    it('generates standard canonical ID format: offer|s:storeId|p:productId', () => {
      const id = getCanonicalOfferId('store_nukus_1', 'phone_galaxy_a24');
      expect(id).toBe('offer|s:store_nukus_1|p:phone_galaxy_a24');
      expect(isCanonicalOfferId(id)).toBe(true);
      expect(isLegacyUnderscoreOfferId(id)).toBe(false);
    });

    it('generates variant canonical ID format: offer|s:storeId|p:productId|v:variantId', () => {
      const id = getCanonicalOfferId('store_nukus_1', 'phone_galaxy_a24', 'black-128gb');
      expect(id).toBe('offer|s:store_nukus_1|p:phone_galaxy_a24|v:black-128gb');
      expect(isCanonicalOfferId(id)).toBe(true);
    });

    it('generates legacy underscore ID format for backwards compatibility', () => {
      expect(getLegacyUnderscoreOfferId('store1', 'prod1')).toBe('offer_store1_prod1');
      expect(getLegacyUnderscoreOfferId('store1', 'prod1', 'red')).toBe('offer_store1_prod1_red');
      expect(isLegacyUnderscoreOfferId('offer_store1_prod1')).toBe(true);
    });

    it('correctly classifies canonical, legacy underscore, and random IDs', () => {
      expect(isCanonicalOfferId('offer|s:s1|p:p1')).toBe(true);
      expect(isCanonicalOfferId('offer|s:s1|p:p1|v:v1')).toBe(true);
      expect(isCanonicalOfferId('offer_store1_prod1')).toBe(false);
      expect(isCanonicalOfferId('random_doc_id_999')).toBe(false);

      expect(isLegacyUnderscoreOfferId('offer_store1_prod1')).toBe(true);
      expect(isLegacyUnderscoreOfferId('offer_store1_prod1_v1')).toBe(true);
      expect(isLegacyUnderscoreOfferId('offer|s:s1|p:p1')).toBe(false);
      expect(isLegacyUnderscoreOfferId('random_doc_id_999')).toBe(false);
    });

    it('parseOfferId extracts components correctly from canonical IDs', () => {
      const parsedWithVariant = parseOfferId('offer|s:store%3A1|p:prod%7C1|v:black');
      expect(parsedWithVariant.format).toBe('canonical');
      expect(parsedWithVariant.isCanonical).toBe(true);
      expect(parsedWithVariant.storeId).toBe('store:1');
      expect(parsedWithVariant.productId).toBe('prod|1');
      expect(parsedWithVariant.variantId).toBe('black');

      const parsedStandard = parseOfferId('offer|s:store1|p:prod1');
      expect(parsedStandard.format).toBe('canonical');
      expect(parsedStandard.isCanonical).toBe(true);
      expect(parsedStandard.storeId).toBe('store1');
      expect(parsedStandard.productId).toBe('prod1');
      expect(parsedStandard.variantId).toBeUndefined();
    });

    it('parseOfferId identifies legacy underscore IDs and legacy random IDs', () => {
      const parsedUnderscore = parseOfferId('offer_store1_prod1_64gb');
      expect(parsedUnderscore.format).toBe('legacy_underscore');
      expect(parsedUnderscore.isCanonical).toBe(false);
      expect(parsedUnderscore.storeId).toBe('store1');
      expect(parsedUnderscore.productId).toBe('prod1');
      expect(parsedUnderscore.variantId).toBe('64gb');

      const parsedRandom = parseOfferId('XkJ9982aZb1');
      expect(parsedRandom.format).toBe('legacy_random');
      expect(parsedRandom.isCanonical).toBe(false);
      expect(parsedRandom.storeId).toBeUndefined();
    });
  });

  describe('deduplicateOffers (Requirement 7, 8, 10)', () => {
    it('deduplicates legacy random ID and new canonical ID for the same store-product', () => {
      const legacyOffer: InventoryOffer = {
        id: 'legacy_random_123',
        storeId: 'store_1',
        productId: 'prod_1',
        price: 3500000,
        currency: 'UZS',
        availability: 'in_stock',
        version: 1,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      };

      const canonicalOffer: InventoryOffer = {
        id: 'offer|s:store_1|p:prod_1',
        storeId: 'store_1',
        productId: 'prod_1',
        price: 3400000,
        currency: 'UZS',
        availability: 'in_stock',
        version: 2,
        createdAt: '2026-10-05T12:00:00.000Z',
        updatedAt: '2026-10-05T12:00:00.000Z',
      };

      const result = deduplicateOffers([legacyOffer, canonicalOffer]);

      expect(result).toHaveLength(1);
      const unified = result[0];
      // Winner is canonicalOffer because version 2 > version 1
      expect(unified.id).toBe('offer|s:store_1|p:prod_1');
      expect(unified.price).toBe(3400000);
      expect(unified.version).toBe(2);
      // Preserves original earliest createdAt from legacy document
      expect(unified.createdAt).toBe('2026-10-01T10:00:00.000Z');
      // Preserves traceability to legacy document ID
      expect(unified.legacyId).toBe('legacy_random_123');
    });

    it('preserves legacy createdAt when older version was canonical but earlier creation was legacy', () => {
      const legacyDoc: InventoryOffer = {
        id: 'offer_legacy_abc',
        storeId: 'store_A',
        productId: 'prod_X',
        price: 100000,
        currency: 'UZS',
        availability: 'in_stock',
        createdAt: '2026-09-15T08:00:00.000Z',
        updatedAt: '2026-09-15T08:00:00.000Z',
      };

      const canonicalDoc: InventoryOffer = {
        id: 'offer|s:store_A|p:prod_X',
        storeId: 'store_A',
        productId: 'prod_X',
        price: 110000,
        currency: 'UZS',
        availability: 'in_stock',
        version: 3,
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      };

      const result = deduplicateOffers([canonicalDoc, legacyDoc]);
      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBe('2026-09-15T08:00:00.000Z');
      expect(result[0].version).toBe(3);
    });

    it('NEVER merges offers with different variantId or variant vs non-variant', () => {
      const baseOffer: InventoryOffer = {
        id: 'offer|s:store_1|p:phone_1',
        storeId: 'store_1',
        productId: 'phone_1',
        price: 2000000,
        currency: 'UZS',
        availability: 'in_stock',
        updatedAt: '2026-10-25T00:00:00.000Z',
      };

      const variant128: InventoryOffer = {
        id: 'offer|s:store_1|p:phone_1|v:128gb',
        storeId: 'store_1',
        productId: 'phone_1',
        variantId: '128gb',
        price: 2200000,
        currency: 'UZS',
        availability: 'in_stock',
        updatedAt: '2026-10-25T00:00:00.000Z',
      };

      const variant256: InventoryOffer = {
        id: 'offer|s:store_1|p:phone_1|v:256gb',
        storeId: 'store_1',
        productId: 'phone_1',
        variantId: '256gb',
        price: 2600000,
        currency: 'UZS',
        availability: 'in_stock',
        updatedAt: '2026-10-25T00:00:00.000Z',
      };

      const result = deduplicateOffers([baseOffer, variant128, variant256]);
      expect(result).toHaveLength(3);

      const prices = result.map((o) => o.price).sort((a, b) => a - b);
      expect(prices).toEqual([2000000, 2200000, 2600000]);
    });

    it('resolves equal version duplicates by updatedAt, then canonical ID preference', () => {
      const legacyOlder: InventoryOffer = {
        id: 'offer_s1_p1',
        storeId: 's1',
        productId: 'p1',
        price: 50000,
        currency: 'UZS',
        availability: 'in_stock',
        version: 1,
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      const legacyNewer: InventoryOffer = {
        id: 'legacy_random_doc',
        storeId: 's1',
        productId: 'p1',
        price: 45000,
        currency: 'UZS',
        availability: 'in_stock',
        version: 1,
        updatedAt: '2026-10-15T00:00:00.000Z',
      };

      const res1 = deduplicateOffers([legacyOlder, legacyNewer]);
      expect(res1).toHaveLength(1);
      expect(res1[0].price).toBe(45000); // Newer updatedAt won

      // Tied timestamps: canonical ID format wins
      const canonicalTied: InventoryOffer = {
        id: 'offer|s:s1|p:p1',
        storeId: 's1',
        productId: 'p1',
        price: 44000,
        currency: 'UZS',
        availability: 'in_stock',
        version: 1,
        updatedAt: '2026-10-15T00:00:00.000Z',
      };

      const res2 = deduplicateOffers([legacyNewer, canonicalTied]);
      expect(res2).toHaveLength(1);
      expect(res2[0].id).toBe('offer|s:s1|p:p1');
      expect(res2[0].price).toBe(44000);
    });

    it('handles malformed or invalid entries without throwing or corrupting valid records', () => {
      const valid: InventoryOffer = {
        id: 'offer|s:s1|p:p1',
        storeId: 's1',
        productId: 'p1',
        price: 10000,
        currency: 'UZS',
        availability: 'in_stock',
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      const corrupt1 = null as unknown as InventoryOffer;
      const corrupt2 = { id: 'c2', price: 500 } as unknown as InventoryOffer; // missing storeId & productId
      const corrupt3 = { storeId: '   ', productId: 'p1' } as unknown as InventoryOffer; // blank storeId

      const result = deduplicateOffers([corrupt1, valid, corrupt2, corrupt3]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('offer|s:s1|p:p1');
    });

    it('returns empty array when input is not an array', () => {
      expect(deduplicateOffers(null as unknown as InventoryOffer[])).toEqual([]);
      expect(deduplicateOffers(undefined as unknown as InventoryOffer[])).toEqual([]);
    });

    it('deduplicateOffers prevents collision when components contain ":::" separators', () => {
      // Offer 1 has storeId "s:::p" and productId "1"
      const offer1: InventoryOffer = {
        id: 'legacy_coll_1',
        storeId: 's:::p',
        productId: '1',
        price: 100000,
        currency: 'UZS',
        availability: 'in_stock',
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      // Offer 2 has storeId "s" and productId "p:::1"
      const offer2: InventoryOffer = {
        id: 'legacy_coll_2',
        storeId: 's',
        productId: 'p:::1',
        price: 200000,
        currency: 'UZS',
        availability: 'in_stock',
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      const result = deduplicateOffers([offer1, offer2]);
      // Must NOT collide into 1 item! Both must be preserved!
      expect(result).toHaveLength(2);
      expect(result.map((o) => o.price)).toContain(100000);
      expect(result.map((o) => o.price)).toContain(200000);
    });

    it('deduplicateOffers correctly handles 10 mixed legacy and canonical offers across 2 products', () => {
      const offers: InventoryOffer[] = [
        { id: 'leg_a1', storeId: 's1', productId: 'pA', price: 100, currency: 'UZS', availability: 'in_stock', version: 1, updatedAt: '2026-10-01T00:00:00Z' },
        { id: 'leg_a2', storeId: 's1', productId: 'pA', price: 95, currency: 'UZS', availability: 'in_stock', version: 2, updatedAt: '2026-10-02T00:00:00Z' },
        { id: 'can_a3', storeId: 's1', productId: 'pA', price: 90, currency: 'UZS', availability: 'in_stock', version: 3, updatedAt: '2026-10-03T00:00:00Z' },
        { id: 'leg_b1', storeId: 's1', productId: 'pB', price: 500, currency: 'UZS', availability: 'in_stock', version: 1, updatedAt: '2026-10-01T00:00:00Z' },
        { id: 'can_b2', storeId: 's1', productId: 'pB', price: 480, currency: 'UZS', availability: 'in_stock', version: 2, updatedAt: '2026-10-04T00:00:00Z' },
        { id: 'leg_s2_a1', storeId: 's2', productId: 'pA', price: 105, currency: 'UZS', availability: 'in_stock', version: 1, updatedAt: '2026-10-01T00:00:00Z' },
        { id: 'can_s2_a2', storeId: 's2', productId: 'pA', price: 99, currency: 'UZS', availability: 'in_stock', version: 2, updatedAt: '2026-10-05T00:00:00Z' },
        { id: 'leg_s2_b1', storeId: 's2', productId: 'pB', price: 510, currency: 'UZS', availability: 'in_stock', version: 1, updatedAt: '2026-10-01T00:00:00Z' },
        { id: 'can_s2_b2', storeId: 's2', productId: 'pB', price: 490, currency: 'UZS', availability: 'in_stock', version: 2, updatedAt: '2026-10-06T00:00:00Z' },
        { id: 'can_s2_b3', storeId: 's2', productId: 'pB', price: 485, currency: 'UZS', availability: 'in_stock', version: 3, updatedAt: '2026-10-07T00:00:00Z' },
      ];

      const deduped = deduplicateOffers(offers);
      // (s1, pA), (s1, pB), (s2, pA), (s2, pB) => exactly 4 unique offers
      expect(deduped).toHaveLength(4);

      const s1pA = deduped.find((o) => o.storeId === 's1' && o.productId === 'pA');
      expect(s1pA?.version).toBe(3);
      expect(s1pA?.price).toBe(90);

      const s2pB = deduped.find((o) => o.storeId === 's2' && o.productId === 'pB');
      expect(s2pB?.version).toBe(3);
      expect(s2pB?.price).toBe(485);
    });

    it('deduplicateOffers preserves 4 distinct variants of the same product without merging', () => {
      const vRed: InventoryOffer = { id: 'o1', storeId: 's1', productId: 'p1', variantId: 'red', price: 100, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' };
      const vBlue: InventoryOffer = { id: 'o2', storeId: 's1', productId: 'p1', variantId: 'blue', price: 105, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' };
      const vGreen: InventoryOffer = { id: 'o3', storeId: 's1', productId: 'p1', variantId: 'green', price: 110, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' };
      const vBase: InventoryOffer = { id: 'o4', storeId: 's1', productId: 'p1', price: 95, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' };

      const result = deduplicateOffers([vRed, vBlue, vGreen, vBase]);
      expect(result).toHaveLength(4);
    });

    it('deduplicateOffers merges availability updates cleanly', () => {
      const o1: InventoryOffer = { id: 'leg_1', storeId: 's1', productId: 'p1', price: 100, currency: 'UZS', availability: 'out_of_stock', version: 1, updatedAt: '2026-10-01T00:00:00Z' };
      const o2: InventoryOffer = { id: 'can_1', storeId: 's1', productId: 'p1', price: 100, currency: 'UZS', availability: 'in_stock', version: 2, updatedAt: '2026-10-05T00:00:00Z' };

      const result = deduplicateOffers([o1, o2]);
      expect(result).toHaveLength(1);
      expect(result[0].availability).toBe('in_stock');
    });

    it('deduplicateOffers handles extreme timestamps safely', () => {
      const oEpoch: InventoryOffer = { id: 'epoch', storeId: 's1', productId: 'p1', price: 100, currency: 'UZS', availability: 'in_stock', version: 1, updatedAt: '1970-01-01T00:00:00.000Z' };
      const oFuture: InventoryOffer = { id: 'future', storeId: 's1', productId: 'p1', price: 150, currency: 'UZS', availability: 'in_stock', version: 1, updatedAt: '2099-12-31T23:59:59.000Z' };

      const result = deduplicateOffers([oEpoch, oFuture]);
      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(150);
    });

    it('deduplicateOffers safely handles zero price without dropping record', () => {
      const oFree: InventoryOffer = { id: 'free_offer', storeId: 's1', productId: 'p1', price: 0, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' };
      const result = deduplicateOffers([oFree]);
      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(0);
    });

    it('deduplicateOffers ensures immutability and returns new object references', () => {
      const original: InventoryOffer = { id: 'o1', storeId: 's1', productId: 'p1', price: 100, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' };
      const result = deduplicateOffers([original]);
      expect(result[0]).not.toBe(original);
      expect(result[0]).toEqual(original);
    });

    it('deduplicateOffers handles whitespace in storeId or productId safely', () => {
      const o1: InventoryOffer = { id: 'o1', storeId: ' store_1 ', productId: ' prod_1 ', price: 100, currency: 'UZS', availability: 'in_stock', version: 1, updatedAt: '2026-10-01T00:00:00Z' };
      const o2: InventoryOffer = { id: 'o2', storeId: 'store_1', productId: 'prod_1', price: 120, currency: 'UZS', availability: 'in_stock', version: 2, updatedAt: '2026-10-02T00:00:00Z' };

      const result = deduplicateOffers([o1, o2]);
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe(2);
    });
  });

  describe('Tuple Collision Resistance (getOfferDedupeKey)', () => {
    it('differentiates storeId with ":::" from productId with ":::"', () => {
      const key1 = getOfferDedupeKey('s:::p', '1', '');
      const key2 = getOfferDedupeKey('s', 'p:::1', '');
      expect(key1).not.toBe(key2);
    });

    it('differentiates productId with ":::" from variantId with ":::"', () => {
      const key1 = getOfferDedupeKey('s', 'p:::v', '1');
      const key2 = getOfferDedupeKey('s', 'p', 'v:::1');
      expect(key1).not.toBe(key2);
    });

    it('encodes pipe "|" characters inside storeId and productId', () => {
      const key = getOfferDedupeKey('store|branch', 'prod|item');
      expect(key).not.toContain('store|branch');
      expect(key).toContain('store%7Cbranch');
      expect(key).toContain('prod%7Citem');
    });

    it('encodes colons ":" inside storeId and productId', () => {
      const key = getOfferDedupeKey('store:1', 'prod:a');
      expect(key).toContain('store%3A1');
      expect(key).toContain('prod%3Aa');
    });

    it('encodes forward slashes "/" inside storeId and productId', () => {
      const key = getOfferDedupeKey('store/central', 'category/prod');
      expect(key).toContain('store%2Fcentral');
      expect(key).toContain('category%2Fprod');
    });

    it('encodes whitespace inside storeId and productId', () => {
      const key = getOfferDedupeKey('Nukus Texno Markaz', 'Galaxy A24 Black');
      expect(key).toContain('Nukus%20Texno%20Markaz');
      expect(key).toContain('Galaxy%20A24%20Black');
    });

    it('safely encodes Karakalpak and Uzbek characters in tuple keys', () => {
      const key = getOfferDedupeKey('Qo‘ng‘irot Savdo', 'G‘o‘za yog‘i');
      expect(key).toBeDefined();
      expect(key.startsWith('tuple|s:')).toBe(true);
    });

    it('treats undefined, null, and empty string variantId identically as base product', () => {
      const key1 = getOfferDedupeKey('s1', 'p1', undefined);
      const key2 = getOfferDedupeKey('s1', 'p1', null);
      const key3 = getOfferDedupeKey('s1', 'p1', '');
      const key4 = getOfferDedupeKey('s1', 'p1', '   ');

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
      expect(key3).toBe(key4);
    });

    it('trims leading and trailing whitespace from components', () => {
      const key1 = getOfferDedupeKey('  s1  ', '  p1  ', '  v1  ');
      const key2 = getOfferDedupeKey('s1', 'p1', 'v1');
      expect(key1).toBe(key2);
    });

    it('returns valid tuple string even when fields are empty', () => {
      const key = getOfferDedupeKey('', '');
      expect(key).toBe('tuple|s:|p:|v:0');
    });

    it('encodes percent "%" characters properly without double encoding errors', () => {
      const key = getOfferDedupeKey('store%20discount', 'prod%99');
      expect(key).toContain('store%2520discount');
      expect(key).toContain('prod%2599');
    });

    it('encodeOfferKey returns empty string for empty string or whitespace', () => {
      expect(encodeOfferKey('')).toBe('');
      expect(encodeOfferKey('   ')).toBe('');
    });

    it('decodeOfferKey returns input if not URI encoded', () => {
      expect(decodeOfferKey('plain_text')).toBe('plain_text');
      expect(decodeOfferKey('')).toBe('');
    });

    it('decodeOfferKey recovers original special string from encoded form', () => {
      const original = 's:1|p/2#3';
      const encoded = encodeOfferKey(original);
      expect(decodeOfferKey(encoded)).toBe(original);
    });

    it('parseOfferId returns format canonical for valid canonical strings', () => {
      const res = parseOfferId('offer|s:store1|p:prod1|v:v1');
      expect(res.format).toBe('canonical');
      expect(res.isCanonical).toBe(true);
      expect(res.variantId).toBe('v1');
    });

    it('parseOfferId returns format legacy_underscore for valid underscore strings', () => {
      const res = parseOfferId('offer_s1_p1');
      expect(res.format).toBe('legacy_underscore');
      expect(res.isCanonical).toBe(false);
      expect(res.storeId).toBe('s1');
      expect(res.productId).toBe('p1');
    });

    it('parseOfferId returns format legacy_random for random uuid strings', () => {
      const res = parseOfferId('a8f9c10e-5432-11ef-9382-0242ac120002');
      expect(res.format).toBe('legacy_random');
      expect(res.isCanonical).toBe(false);
    });

    it('parseOfferId safely handles empty string or non-string inputs', () => {
      expect(parseOfferId('')).toEqual({ id: '', format: 'legacy_random', isCanonical: false });
      expect(parseOfferId(null as unknown as string)).toEqual({ id: '', format: 'legacy_random', isCanonical: false });
    });
  });

  describe('Variant Deduplication Collision Fix (Phase 3.7 Final Fix)', () => {
    it('differentiates base offer (without variant) from offer with variantId "_base_"', () => {
      const keyBase = getOfferDedupeKey('s1', 'p1', undefined);
      const keyVariant = getOfferDedupeKey('s1', 'p1', '_base_');

      expect(keyBase).toBe('tuple|s:s1|p:p1|v:0');
      expect(keyVariant).toBe('tuple|s:s1|p:p1|v:1:_base_');
      expect(keyBase).not.toBe(keyVariant);
    });

    it('differentiates base offer (without variant) from offer with variantId "base"', () => {
      const keyBase = getOfferDedupeKey('s1', 'p1');
      const keyVariant = getOfferDedupeKey('s1', 'p1', 'base');

      expect(keyBase).toBe('tuple|s:s1|p:p1|v:0');
      expect(keyVariant).toBe('tuple|s:s1|p:p1|v:1:base');
      expect(keyBase).not.toBe(keyVariant);
    });

    it('differentiates base offer (without variant) from offer with variantId "0"', () => {
      const keyBase = getOfferDedupeKey('s1', 'p1', undefined);
      const keyVariantZero = getOfferDedupeKey('s1', 'p1', '0');

      expect(keyBase).toBe('tuple|s:s1|p:p1|v:0');
      expect(keyVariantZero).toBe('tuple|s:s1|p:p1|v:1:0');
      expect(keyBase).not.toBe(keyVariantZero);
    });

    it('normalizes undefined, null, empty string, and whitespace-only variantId to v:0', () => {
      const k1 = getOfferDedupeKey('store_1', 'prod_1', undefined);
      const k2 = getOfferDedupeKey('store_1', 'prod_1', null);
      const k3 = getOfferDedupeKey('store_1', 'prod_1', '');
      const k4 = getOfferDedupeKey('store_1', 'prod_1', '   ');
      const k5 = getOfferDedupeKey('store_1', 'prod_1', '\t\n');

      expect(k1).toBe('tuple|s:store_1|p:prod_1|v:0');
      expect(k2).toBe(k1);
      expect(k3).toBe(k1);
      expect(k4).toBe(k1);
      expect(k5).toBe(k1);
    });

    it('prevents collision across :::, |, :, /, %, _, and Unicode characters in variant IDs', () => {
      const keyColon = getOfferDedupeKey('s1', 'p1', ':::');
      const keyPipe = getOfferDedupeKey('s1', 'p1', '|');
      const keyV0 = getOfferDedupeKey('s1', 'p1', 'v:0');
      const keyV1 = getOfferDedupeKey('s1', 'p1', 'v:1:foo');
      const keySlash = getOfferDedupeKey('s1', 'p1', 'a/b');
      const keyPercent = getOfferDedupeKey('s1', 'p1', '100%');
      const keyUnderscore = getOfferDedupeKey('s1', 'p1', '__special__');
      const keyUnicode = getOfferDedupeKey('s1', 'p1', 'G‘o‘za');

      const allKeys = [
        getOfferDedupeKey('s1', 'p1', undefined),
        keyColon,
        keyPipe,
        keyV0,
        keyV1,
        keySlash,
        keyPercent,
        keyUnderscore,
        keyUnicode,
      ];

      const uniqueKeys = new Set(allKeys);
      expect(uniqueKeys.size).toBe(allKeys.length);
    });

    it('is strictly deterministic: identical inputs always return identical keys', () => {
      const keyA1 = getOfferDedupeKey('store_abc', 'prod_xyz', 'black-128gb');
      const keyA2 = getOfferDedupeKey('store_abc', 'prod_xyz', 'black-128gb');
      expect(keyA1).toBe(keyA2);

      const keyB1 = getOfferDedupeKey('store_abc', 'prod_xyz', null);
      const keyB2 = getOfferDedupeKey('store_abc', 'prod_xyz', undefined);
      expect(keyB1).toBe(keyB2);
    });

    it('assigns distinct keys to different variants of the same product', () => {
      const red = getOfferDedupeKey('s1', 'p1', 'red');
      const blue = getOfferDedupeKey('s1', 'p1', 'blue');
      const v64 = getOfferDedupeKey('s1', 'p1', '64gb');
      const v128 = getOfferDedupeKey('s1', 'p1', '128gb');

      const variantSet = new Set([red, blue, v64, v128]);
      expect(variantSet.size).toBe(4);
    });

    it('deduplicateOffers preserves both base offer and "_base_" variant offer as separate items', () => {
      const baseOffer: InventoryOffer = {
        id: 'canonical_base',
        storeId: 's1',
        productId: 'p1',
        price: 100000,
        currency: 'UZS',
        availability: 'in_stock',
        updatedAt: '2026-02-01T00:00:00Z',
      };
      const variantBaseOffer: InventoryOffer = {
        id: 'canonical_variant_base',
        storeId: 's1',
        productId: 'p1',
        variantId: '_base_',
        price: 120000,
        currency: 'UZS',
        availability: 'in_stock',
        updatedAt: '2026-02-01T00:00:00Z',
      };

      const result = deduplicateOffers([baseOffer, variantBaseOffer]);
      expect(result).toHaveLength(2);

      const foundBase = result.find((o) => !o.variantId);
      const foundVariant = result.find((o) => o.variantId === '_base_');
      expect(foundBase).toBeDefined();
      expect(foundVariant).toBeDefined();
      expect(foundBase?.price).toBe(100000);
      expect(foundVariant?.price).toBe(120000);
    });

    it('deduplicateOffers preserves base offer and "base" variant offer as separate items', () => {
      const baseOffer: InventoryOffer = {
        id: 'offer_base',
        storeId: 's1',
        productId: 'p1',
        price: 50000,
        currency: 'UZS',
        availability: 'in_stock',
        updatedAt: '2026-02-01T00:00:00Z',
      };
      const variantOffer: InventoryOffer = {
        id: 'offer_variant_base',
        storeId: 's1',
        productId: 'p1',
        variantId: 'base',
        price: 60000,
        currency: 'UZS',
        availability: 'in_stock',
        updatedAt: '2026-02-01T00:00:00Z',
      };

      const result = deduplicateOffers([baseOffer, variantOffer]);
      expect(result).toHaveLength(2);
      expect(result.some((o) => !o.variantId && o.price === 50000)).toBe(true);
      expect(result.some((o) => o.variantId === 'base' && o.price === 60000)).toBe(true);
    });

    it('deduplicateOffers merges duplicates within the same variant while keeping legacy compatibility', () => {
      const legacyBaseOffer: InventoryOffer = {
        id: 'offer_s1_p1',
        storeId: 's1',
        productId: 'p1',
        price: 200000,
        currency: 'UZS',
        availability: 'in_stock',
        version: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const canonicalBaseOffer: InventoryOffer = {
        id: 'offer|s:s1|p:p1',
        storeId: 's1',
        productId: 'p1',
        price: 190000,
        currency: 'UZS',
        availability: 'in_stock',
        version: 2,
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      };
      const variantBaseOffer: InventoryOffer = {
        id: 'offer|s:s1|p:p1|v:_base_',
        storeId: 's1',
        productId: 'p1',
        variantId: '_base_',
        price: 220000,
        currency: 'UZS',
        availability: 'in_stock',
        version: 1,
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
      };

      const result = deduplicateOffers([legacyBaseOffer, canonicalBaseOffer, variantBaseOffer]);

      // Exactly 2 offers: 1 base offer (deduplicated between legacy and canonical) and 1 '_base_' variant offer
      expect(result).toHaveLength(2);

      const baseWinner = result.find((o) => !o.variantId);
      expect(baseWinner).toBeDefined();
      expect(baseWinner?.price).toBe(190000);
      expect(baseWinner?.version).toBe(2);
      expect(baseWinner?.createdAt).toBe('2025-01-01T00:00:00Z'); // Earliest preserved
      expect(baseWinner?.legacyId).toBe('offer_s1_p1');

      const variantWinner = result.find((o) => o.variantId === '_base_');
      expect(variantWinner).toBeDefined();
      expect(variantWinner?.price).toBe(220000);
    });
  });

  describe('Phase 4 Acceptance Audit: isOfferActiveForCustomer & isStoreVisibleToCustomer', () => {
    describe('isOfferActiveForCustomer', () => {
      it('returns true for an active offer with valid positive price', () => {
        const offer: InventoryOffer = {
          id: 'offer_1',
          storeId: 's1',
          productId: 'p1',
          price: 250000,
          currency: 'UZS',
          availability: 'in_stock',
          status: 'active',
          updatedAt: '2026-11-01T00:00:00Z',
        };
        expect(isOfferActiveForCustomer(offer)).toBe(true);
      });

      it('returns true for a legacy offer omitting status (legacy compatibility)', () => {
        const legacyOffer: InventoryOffer = {
          id: 'offer_legacy_random',
          storeId: 's1',
          productId: 'p1',
          price: 150000,
          currency: 'UZS',
          availability: 'in_stock',
          updatedAt: '2026-11-01T00:00:00Z',
        };
        expect(isOfferActiveForCustomer(legacyOffer)).toBe(true);
      });

      it('returns false when status is "superseded"', () => {
        const offer: InventoryOffer = {
          id: 'offer_old',
          storeId: 's1',
          productId: 'p1',
          price: 200000,
          currency: 'UZS',
          availability: 'in_stock',
          status: 'superseded',
          updatedAt: '2026-11-01T00:00:00Z',
        };
        expect(isOfferActiveForCustomer(offer)).toBe(false);
      });

      it('returns false when isSuperseded is true even if status is active', () => {
        const offer: InventoryOffer = {
          id: 'offer_flagged',
          storeId: 's1',
          productId: 'p1',
          price: 200000,
          currency: 'UZS',
          availability: 'in_stock',
          status: 'active',
          isSuperseded: true,
          updatedAt: '2026-11-01T00:00:00Z',
        };
        expect(isOfferActiveForCustomer(offer)).toBe(false);
      });

      it('returns false when status is "archived"', () => {
        const offer: InventoryOffer = {
          id: 'offer_arch',
          storeId: 's1',
          productId: 'p1',
          price: 200000,
          currency: 'UZS',
          availability: 'in_stock',
          status: 'archived',
          updatedAt: '2026-11-01T00:00:00Z',
        };
        expect(isOfferActiveForCustomer(offer)).toBe(false);
      });

      it('returns false when status is "pending"', () => {
        const offer: InventoryOffer = {
          id: 'offer_pending',
          storeId: 's1',
          productId: 'p1',
          price: 200000,
          currency: 'UZS',
          availability: 'in_stock',
          status: 'pending',
          updatedAt: '2026-11-01T00:00:00Z',
        };
        expect(isOfferActiveForCustomer(offer)).toBe(false);
      });

      it('returns false for zero, negative, or invalid prices', () => {
        expect(isOfferActiveForCustomer({ id: '1', storeId: 's', productId: 'p', price: 0, currency: 'UZS', availability: 'in_stock', updatedAt: '' })).toBe(false);
        expect(isOfferActiveForCustomer({ id: '2', storeId: 's', productId: 'p', price: -500, currency: 'UZS', availability: 'in_stock', updatedAt: '' })).toBe(false);
        expect(isOfferActiveForCustomer({ id: '3', storeId: 's', productId: 'p', price: NaN, currency: 'UZS', availability: 'in_stock', updatedAt: '' })).toBe(false);
      });

      it('returns false for null or undefined input', () => {
        expect(isOfferActiveForCustomer(null)).toBe(false);
        expect(isOfferActiveForCustomer(undefined)).toBe(false);
      });
    });

    describe('isStoreVisibleToCustomer', () => {
      it('returns true for active verified store', () => {
        const store: Store = {
          id: 's_active',
          name: 'Nukus Texno',
          city: 'Nukus',
          address: 'Markaz',
          coordinates: { lat: 42.46, lng: 59.61 },
          category: 'electronics',
          phone: '+998612220000',
          openingHours: '09:00 - 18:00',
          isVerified: true,
          status: 'active',
          createdAt: '',
          updatedAt: '',
        };
        expect(isStoreVisibleToCustomer(store)).toBe(true);
      });

      it('returns true for admin-created unclaimed store (isVerified: true, ownershipStatus: unclaimed)', () => {
        const adminStore: Store = {
          id: 's_admin_created',
          name: 'Nukus Bozor Filiali',
          city: 'Nukus',
          address: 'Bozor 12',
          coordinates: { lat: 42.45, lng: 59.61 },
          category: 'appliances',
          phone: '',
          openingHours: '',
          isVerified: true,
          status: 'active',
          ownershipStatus: 'unclaimed',
          createdAt: '',
          updatedAt: '',
        };
        expect(isStoreVisibleToCustomer(adminStore)).toBe(true);
      });

      it('returns true for OpenStreetMap Karakalpakstan places (sourceType: openstreetmap)', () => {
        const osmStore: Store = {
          id: 'osm_node_1',
          name: 'Qo‘ng‘irot Markaziy Bozor',
          city: 'Qo‘ng‘irot',
          address: 'Temir yo‘l ko‘chasi',
          coordinates: { lat: 43.04, lng: 58.84 },
          category: 'market',
          phone: '',
          openingHours: '',
          isVerified: false,
          sourceType: 'openstreetmap',
          createdAt: '',
          updatedAt: '',
        };
        expect(isStoreVisibleToCustomer(osmStore)).toBe(true);
      });

      it('returns true for development demo stores (isDemo: true)', () => {
        const demoStore: Store = {
          id: 'demo_store_1',
          name: 'Demo Texno',
          city: 'Nukus',
          address: 'Markaz',
          coordinates: { lat: 42.46, lng: 59.61 },
          category: 'electronics',
          phone: '',
          openingHours: '',
          isVerified: false,
          isDemo: true,
          createdAt: '',
          updatedAt: '',
        };
        expect(isStoreVisibleToCustomer(demoStore)).toBe(true);
      });

      it('returns false for archived stores', () => {
        const archivedStore: Store = {
          id: 's_archived',
          name: 'Yopilgan Filial',
          city: 'Nukus',
          address: 'Eski shahar',
          coordinates: { lat: 42.46, lng: 59.61 },
          category: 'electronics',
          phone: '',
          openingHours: '',
          status: 'archived',
          isVerified: false,
          createdAt: '',
          updatedAt: '',
        };
        expect(isStoreVisibleToCustomer(archivedStore)).toBe(false);
      });

      it('returns false for inactive stores (status: "inactive")', () => {
        const inactiveStore: Store = {
          id: 's_inactive',
          name: 'Nofaol Do‘kon',
          city: 'Nukus',
          address: 'Eski bozor',
          coordinates: { lat: 42.46, lng: 59.61 },
          category: 'electronics',
          phone: '',
          openingHours: '',
          status: 'inactive',
          isVerified: true,
          createdAt: '',
          updatedAt: '',
        };
        expect(isStoreVisibleToCustomer(inactiveStore)).toBe(false);
      });

      it('returns false for suspended stores (status: "suspended")', () => {
        const suspendedStore: Store = {
          id: 's_suspended',
          name: 'Vaqtincha To‘xtatilgan Do‘kon',
          city: 'Nukus',
          address: 'Markaz',
          coordinates: { lat: 42.46, lng: 59.61 },
          category: 'appliances',
          phone: '',
          openingHours: '',
          status: 'suspended',
          isVerified: true,
          createdAt: '',
          updatedAt: '',
        };
        expect(isStoreVisibleToCustomer(suspendedStore)).toBe(false);
      });

      it('returns true for legacy stores where status is omitted (undefined)', () => {
        const legacyStore: Store = {
          id: 's_legacy',
          name: 'Eski Do‘kon Hujjati',
          city: 'Nukus',
          address: 'Markaziy ko‘cha',
          coordinates: { lat: 42.46, lng: 59.61 },
          category: 'electronics',
          phone: '',
          openingHours: '',
          isVerified: true,
          createdAt: '',
          updatedAt: '',
        };
        expect(isStoreVisibleToCustomer(legacyStore)).toBe(true);
      });

      it('returns false for unverified pending merchant store applications', () => {
        const pendingStore: Store = {
          id: 's_merchant_pending',
          name: 'Yangi Ariza Do‘koni',
          city: 'Nukus',
          address: 'Do‘stlik 5',
          coordinates: { lat: 42.46, lng: 59.61 },
          category: 'phones',
          phone: '+998901234567',
          openingHours: '09:00 - 18:00',
          status: 'pending',
          isVerified: false,
          isDemo: false,
          createdAt: '',
          updatedAt: '',
        };
        expect(isStoreVisibleToCustomer(pendingStore)).toBe(false);
      });

      it('returns false for null or undefined store input', () => {
        expect(isStoreVisibleToCustomer(null)).toBe(false);
        expect(isStoreVisibleToCustomer(undefined)).toBe(false);
      });
    });

    describe('deduplicateOffers: demo & superseded isolation', () => {
      it('strictly prioritizes real offer price over demo fixture even if demo has higher version and newer timestamp', () => {
        const realOffer: InventoryOffer = {
          id: 'offer|s:store_1|p:prod_1',
          storeId: 'store_1',
          productId: 'prod_1',
          price: 2500000, // Genuine merchant price
          currency: 'UZS',
          availability: 'in_stock',
          version: 1, // Lower version
          isDemo: false,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z', // Older timestamp
        };
        const demoOffer: InventoryOffer = {
          id: 'demo_offer_store_1_prod_1',
          storeId: 'store_1',
          productId: 'prod_1',
          price: 1800000, // Fake demo price
          currency: 'UZS',
          availability: 'in_stock',
          version: 10, // Higher version counter!
          isDemo: true,
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z', // Newer timestamp!
        };

        // Real first, demo second
        const result1 = deduplicateOffers([realOffer, demoOffer]);
        expect(result1).toHaveLength(1);
        expect(result1[0].isDemo).toBe(false);
        expect(result1[0].price).toBe(2500000); // Real price strictly retained!
        expect(result1[0].version).toBe(1); // Real version counter retained!
        expect(result1[0].createdAt).toBe('2026-01-01T00:00:00Z');

        // Demo first, real second (order independence)
        const result2 = deduplicateOffers([demoOffer, realOffer]);
        expect(result2).toHaveLength(1);
        expect(result2[0].isDemo).toBe(false);
        expect(result2[0].price).toBe(2500000);
        expect(result2[0].version).toBe(1);
        expect(result2[0].createdAt).toBe('2026-01-01T00:00:00Z');
      });

      it('does not use isDemo: false to convert a standalone demo price into a pseudo-real offer', () => {
        const demoOfferOnly: InventoryOffer = {
          id: 'demo_offer_s1_p1',
          storeId: 'store_1',
          productId: 'prod_1',
          price: 1800000,
          currency: 'UZS',
          availability: 'in_stock',
          version: 3,
          isDemo: true,
          updatedAt: '2026-11-01T00:00:00Z',
        };

        const result = deduplicateOffers([demoOfferOnly]);
        expect(result).toHaveLength(1);
        expect(result[0].isDemo).toBe(true);
        expect(result[0].price).toBe(1800000);
      });

      it('retains isDemo: false when real offer is merged with a demo fixture', () => {
        const realOffer: InventoryOffer = {
          id: 'offer|s:s1|p:p1',
          storeId: 's1',
          productId: 'p1',
          price: 200000,
          currency: 'UZS',
          availability: 'in_stock',
          version: 2,
          isDemo: false,
          updatedAt: '2026-11-01T00:00:00Z',
        };
        const demoOffer: InventoryOffer = {
          id: 'demo_offer_s1_p1',
          storeId: 's1',
          productId: 'p1',
          price: 180000,
          currency: 'UZS',
          availability: 'in_stock',
          version: 1,
          isDemo: true,
          updatedAt: '2026-10-01T00:00:00Z',
        };

        const result = deduplicateOffers([realOffer, demoOffer]);
        expect(result).toHaveLength(1);
        expect(result[0].isDemo).toBe(false);
        expect(result[0].price).toBe(200000);
      });

      it('preserves isSuperseded flag on merged offer when winner is superseded', () => {
        const olderActive: InventoryOffer = {
          id: 'offer_v1',
          storeId: 's1',
          productId: 'p1',
          price: 150000,
          currency: 'UZS',
          availability: 'in_stock',
          version: 1,
          status: 'active',
          updatedAt: '2026-01-01T00:00:00Z',
        };
        const newerSuperseded: InventoryOffer = {
          id: 'offer_v2',
          storeId: 's1',
          productId: 'p1',
          price: 160000,
          currency: 'UZS',
          availability: 'in_stock',
          version: 2,
          status: 'superseded',
          isSuperseded: true,
          updatedAt: '2026-02-01T00:00:00Z',
        };

        const result = deduplicateOffers([olderActive, newerSuperseded]);
        expect(result).toHaveLength(1);
        expect(result[0].isSuperseded).toBe(true);
        expect(isOfferActiveForCustomer(result[0])).toBe(false);
      });
    });
  });
});

