import type { InventoryOffer, Store } from '@/types';

/**
 * Encodes a key segment (storeId, productId, variantId) for safe inclusion in
 * Firestore document IDs and canonical composite keys without separator collisions.
 */
export function encodeOfferKey(value: string): string {
  if (!value) return '';
  return encodeURIComponent(value.trim());
}

/**
 * Safely decodes an encoded key segment back to its original string.
 */
export function decodeOfferKey(value: string): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Generates the new canonical Firestore document ID for an InventoryOffer.
 *
 * FORMATS:
 * - Standard: `offer|s:encodedStoreId|p:encodedProductId`
 * - With Variant: `offer|s:encodedStoreId|p:encodedProductId|v:encodedVariantId`
 */
export function getCanonicalOfferId(
  storeId: string,
  productId: string,
  variantId?: string | null
): string {
  const encStore = encodeOfferKey(storeId);
  const encProduct = encodeOfferKey(productId);

  if (variantId && variantId.trim()) {
    const encVariant = encodeOfferKey(variantId);
    return `offer|s:${encStore}|p:${encProduct}|v:${encVariant}`;
  }

  return `offer|s:${encStore}|p:${encProduct}`;
}

/**
 * Generates the previous legacy underscore canonical ID format:
 * `offer_storeId_productId` or `offer_storeId_productId_variantId`
 */
export function getLegacyUnderscoreOfferId(
  storeId: string,
  productId: string,
  variantId?: string | null
): string {
  const cleanStore = (storeId || '').trim();
  const cleanProduct = (productId || '').trim();

  if (variantId && variantId.trim()) {
    return `offer_${cleanStore}_${cleanProduct}_${variantId.trim()}`;
  }

  return `offer_${cleanStore}_${cleanProduct}`;
}

/**
 * Generates a collision-free composite key for offer deduplication.
 * Uses percent-encoding on each component and strictly separates base offers (v:0)
 * from variant offers (v:1:<encodedVariantId>) so that neither delimiter collisions,
 * special characters, nor literal variant names (such as '_base_', 'base', or '0') can collide.
 */
export function getOfferDedupeKey(
  storeId: string,
  productId: string,
  variantId?: string | null
): string {
  const cleanStore = typeof storeId === 'string' ? storeId.trim() : '';
  const cleanProduct = typeof productId === 'string' ? productId.trim() : '';
  const cleanVariant = typeof variantId === 'string' && variantId.trim() ? variantId.trim() : '';

  const encStore = encodeOfferKey(cleanStore);
  const encProduct = encodeOfferKey(cleanProduct);

  if (cleanVariant) {
    const encVariant = encodeOfferKey(cleanVariant);
    return `tuple|s:${encStore}|p:${encProduct}|v:1:${encVariant}`;
  }

  return `tuple|s:${encStore}|p:${encProduct}|v:0`;
}

/**
 * Checks whether a given document ID follows the new canonical format.
 */
export function isCanonicalOfferId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^offer\|s:[^|]+\|p:[^|]+(\|v:[^|]+)?$/.test(id);
}

/**
 * Checks whether a given document ID follows the previous underscore canonical format.
 */
export function isLegacyUnderscoreOfferId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^offer_[^_]+_[^_]+.*$/.test(id);
}

export interface ParsedOfferId {
  id: string;
  format: 'canonical' | 'legacy_underscore' | 'legacy_random';
  isCanonical: boolean;
  storeId?: string;
  productId?: string;
  variantId?: string;
}

/**
 * Parses an offer document ID to determine its schema version and extract referenced entity IDs.
 */
export function parseOfferId(id: string): ParsedOfferId {
  if (!id || typeof id !== 'string') {
    return { id: '', format: 'legacy_random', isCanonical: false };
  }

  if (isCanonicalOfferId(id)) {
    const parts = id.split('|');
    let storeId: string | undefined;
    let productId: string | undefined;
    let variantId: string | undefined;

    for (const part of parts) {
      if (part.startsWith('s:')) {
        storeId = decodeOfferKey(part.slice(2));
      } else if (part.startsWith('p:')) {
        productId = decodeOfferKey(part.slice(2));
      } else if (part.startsWith('v:')) {
        variantId = decodeOfferKey(part.slice(2));
      }
    }

    return {
      id,
      format: 'canonical',
      isCanonical: true,
      storeId,
      productId,
      variantId,
    };
  }

  if (isLegacyUnderscoreOfferId(id)) {
    const rawParts = id.replace(/^offer_/, '').split('_');
    const storeId = rawParts[0];
    const productId = rawParts[1];
    const variantId = rawParts.slice(2).join('_') || undefined;

    return {
      id,
      format: 'legacy_underscore',
      isCanonical: false,
      storeId,
      productId,
      variantId,
    };
  }

  return {
    id,
    format: 'legacy_random',
    isCanonical: false,
  };
}

/**
 * Deduplicates an array of InventoryOffers.
 *
 * INVARIANTS:
 * 1. Offers are partitioned strictly by `(storeId, productId, variantId || '')`.
 * 2. An offer with a variantId is NEVER merged into a base offer without a variantId.
 * 3. When duplicate entries exist for the same logical tuple (e.g., legacy random ID,
 *    legacy underscore ID, and new canonical ID):
 *    - Prefers the entry with the higher `version` counter.
 *    - If versions are equal, prefers the entry with the most recent `updatedAt` timestamp.
 *    - If timestamps match, prefers the canonical ID format (`offer|s:...`).
 *    - Always preserves the earliest original `createdAt` timestamp across all instances.
 *    - Maintains `legacyId` traceability when merging a legacy entry into a canonical view.
 * 4. Error Handling:
 *    - Does NOT use blind try/catch that swallows errors and produces corrupted or duplicate records.
 *    - Malformed offers missing storeId or productId are skipped with descriptive warnings.
 */
export function deduplicateOffers(offers: InventoryOffer[]): InventoryOffer[] {
  if (!Array.isArray(offers)) {
    return [];
  }

  const resultMap = new Map<string, InventoryOffer>();

  for (const offer of offers) {
    if (!offer || typeof offer !== 'object') {
      continue;
    }

    const storeId = typeof offer.storeId === 'string' ? offer.storeId.trim() : '';
    const productId = typeof offer.productId === 'string' ? offer.productId.trim() : '';
    const variantId =
      typeof offer.variantId === 'string' && offer.variantId.trim() ? offer.variantId.trim() : '';

    if (!storeId || !productId) {
      console.warn(
        '[OneShop Deduplication] Skipping invalid offer missing storeId or productId:',
        offer
      );
      continue;
    }

    // Collision-free tuple key encoding prevents delimiter collisions (e.g. if IDs contain ':::')
    const dedupeKey = getOfferDedupeKey(storeId, productId, variantId);

    const existing = resultMap.get(dedupeKey);
    if (!existing) {
      resultMap.set(dedupeKey, { ...offer });
      continue;
    }

    // A duplicate offer for the same (store, product, variant) was found!
    const existingVersion = typeof existing.version === 'number' ? existing.version : 1;
    const currentVersion = typeof offer.version === 'number' ? offer.version : 1;

    const existingIsCanonical = isCanonicalOfferId(existing.id);
    const currentIsCanonical = isCanonicalOfferId(offer.id);

    const existingTime = new Date(existing.updatedAt || 0).getTime();
    const currentTime = new Date(offer.updatedAt || 0).getTime();

    const existingIsDemo = Boolean(existing.isDemo);
    const currentIsDemo = Boolean(offer.isDemo);

    let winner: InventoryOffer;

    // REAL VS DEMO STRICT PRECEDENCE INVARIANT:
    // A real merchant offer MUST NEVER have its real price or data replaced by a demo fixture,
    // regardless of whether the demo fixture has a higher version counter or newer timestamp.
    if (!existingIsDemo && currentIsDemo) {
      // Existing is a real offer, incoming is a demo fixture -> real offer strictly wins
      winner = existing;
    } else if (existingIsDemo && !currentIsDemo) {
      // Existing is a demo fixture, incoming is a real offer -> incoming real offer strictly wins
      winner = offer;
    } else {
      // Both are real OR both are demo: compare version, then updatedAt, then canonical format
      if (currentVersion > existingVersion) {
        winner = offer;
      } else if (currentVersion < existingVersion) {
        winner = existing;
      } else {
        // Equal versions: check updatedAt
        if (currentTime > existingTime) {
          winner = offer;
        } else if (currentTime < existingTime) {
          winner = existing;
        } else {
          // Equal timestamps: prefer canonical format
          if (currentIsCanonical && !existingIsCanonical) {
            winner = offer;
          } else {
            winner = existing;
          }
        }
      }
    }

    // Preserve earliest original createdAt only among the same data class (real with real, demo with demo)
    let earliestCreatedAt: string | undefined;
    if (existingIsDemo && !currentIsDemo) {
      // Existing is demo, incoming is real -> genuine real createdAt
      earliestCreatedAt = offer.createdAt;
    } else if (!existingIsDemo && currentIsDemo) {
      // Existing is real, incoming is demo -> genuine real createdAt
      earliestCreatedAt = existing.createdAt;
    } else {
      // Both real or both demo -> earliest original createdAt
      earliestCreatedAt = existing.createdAt;
      if (offer.createdAt) {
        if (!earliestCreatedAt) {
          earliestCreatedAt = offer.createdAt;
        } else {
          const timeExisting = new Date(earliestCreatedAt).getTime();
          const timeOffer = new Date(offer.createdAt).getTime();
          if (timeOffer < timeExisting) {
            earliestCreatedAt = offer.createdAt;
          }
        }
      }
    }

    // Preserve legacyId pointer for auditability (do not inherit demo IDs into real offers)
    const legacyId =
      existingIsDemo !== currentIsDemo
        ? winner.legacyId || (!isCanonicalOfferId(winner.id) ? winner.id : undefined)
        : (!currentIsCanonical ? offer.id : undefined) ||
          (!existingIsCanonical ? existing.id : undefined) ||
          existing.legacyId ||
          offer.legacyId;

    // Version counter: real offer retains its genuine version, not inflated by demo counters
    const finalVersion =
      existingIsDemo !== currentIsDemo
        ? typeof winner.version === 'number'
          ? winner.version
          : 1
        : Math.max(existingVersion, currentVersion);

    const isDemo = Boolean(winner.isDemo);
    const isSuperseded = Boolean(winner.isSuperseded || winner.status === 'superseded');

    const merged: InventoryOffer = {
      ...winner,
      isDemo,
      isSuperseded,
      createdAt: earliestCreatedAt,
      version: finalVersion,
      legacyId,
    };

    resultMap.set(dedupeKey, merged);
  }

  return Array.from(resultMap.values());
}

/**
 * Determines whether an inventory offer is active and eligible for customer visibility.
 * Enforces Phase 4 Acceptance Audit invariants:
 * 1. Excludes superseded offers (status === 'superseded' or isSuperseded === true).
 * 2. Excludes archived offers (status === 'archived').
 * 3. Excludes unapproved pending offers (status === 'pending').
 * 4. Requires valid numerical price > 0.
 * 5. Preserves legacy offer compatibility (where status is omitted or 'active').
 */
export function isOfferActiveForCustomer(offer?: InventoryOffer | null): boolean {
  if (!offer) return false;
  if (offer.isSuperseded) return false;
  if (offer.status === 'archived' || offer.status === 'superseded' || offer.status === 'pending') {
    return false;
  }
  if (typeof offer.price !== 'number' || isNaN(offer.price) || offer.price <= 0) {
    return false;
  }
  return true;
}

/**
 * Determines whether a store is eligible for customer catalog and map visibility.
 * Enforces Phase 4 Acceptance Audit invariants:
 * 1. Excludes archived, inactive, and suspended stores (status === 'archived' | 'inactive' | 'suspended').
 * 2. Excludes unverified pending merchant stores (status === 'pending' && !isVerified && !isDemo).
 * 3. Permits admin-created unclaimed stores (isVerified: true, status: 'active', ownershipStatus: 'unclaimed').
 * 4. Permits Karakalpakstan OpenStreetMap reference places (sourceType: 'openstreetmap').
 * 5. Permits demo stores (isDemo: true) for development and mock mode.
 * 6. Preserves legacy stores without an explicit status field as active.
 */
export function isStoreVisibleToCustomer(store?: Store | null): boolean {
  if (!store) return false;
  const rawStatus = (store.status as string) || '';
  if (rawStatus === 'archived' || rawStatus === 'inactive' || rawStatus === 'suspended') {
    return false;
  }
  if (rawStatus === 'pending' && !store.isVerified && !store.isDemo) {
    return false;
  }
  return true;
}


