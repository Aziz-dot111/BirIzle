import type {
  Coordinates,
  CreateStoreInput,
  UpdateStoreInput,
  CreateProductInput,
  CreateOfferInput,
  UpdateOfferInput,
  CreateStoreApplicationInput,
  CreateProductSubmissionInput,
  CreateOfferSubmissionInput,
} from '@/types';
import type { ValidationResult } from './validation';

/**
 * Normalizes a text string for search indexing and consistent comparison:
 * Lowercases, normalizes Uzbek apostrophes (o‘, g‘, ’, '), trims and strips excessive punctuation.
 */
export function normalizeSearchTerm(term: string): string {
  if (!term) return '';
  return term
    .toLowerCase()
    .replace(/[‘`ʻ’]/g, "'")
    .replace(/[^\w\s'а-яёўқғҳa-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates search keyword tokens from product fields for Firestore array-contains search
 */
export function generateSearchKeywords(
  name: string,
  category?: string,
  brand?: string,
  barcode?: string
): string[] {
  const combined = [name, category, brand, barcode]
    .filter(Boolean)
    .join(' ');

  const normalized = normalizeSearchTerm(combined);
  const words = normalized.split(/\s+/).filter((w) => w.length >= 2);

  const keywordsSet = new Set<string>();

  for (const word of words) {
    keywordsSet.add(word);
    // Add partial prefixes for word stems (up to 3-10 chars) to allow prefix search
    if (word.length >= 3) {
      for (let i = 3; i <= Math.min(word.length, 10); i++) {
        keywordsSet.add(word.slice(0, i));
      }
    }
  }

  // Also include the normalized full name
  const nameNorm = normalizeSearchTerm(name);
  if (nameNorm) keywordsSet.add(nameNorm);

  return Array.from(keywordsSet);
}

/**
 * Validates geographic coordinates
 */
export function validateCoordinates(coords?: Coordinates | null): ValidationResult {
  if (!coords || typeof coords !== 'object') {
    return { isValid: false, error: 'Geografik koordinatalar ko‘rsatilmadi.' };
  }

  const { lat, lng } = coords;

  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { isValid: false, error: 'Koordinatalar haqiqiy sonlar bo‘lishi kerak.' };
  }

  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Kenglik (latitude) -90 va +90 daraja oralig‘ida bo‘lishi shart.' };
  }

  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Uzunlik (longitude) -180 va +180 daraja oralig‘ida bo‘lishi shart.' };
  }

  return { isValid: true };
}

/**
 * Validates whether a URL has a safe http:// or https:// scheme.
 * Prevents javascript:, data:, and other dangerous protocol injection.
 */
export function isValidHttpUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return false;
  return /^https?:\/\/.+/i.test(trimmed);
}

/**
 * Validates input for creating a Store in Nukus marketplace
 */
export function validateStoreInput(
  input?: Partial<CreateStoreInput> | null,
  options?: { allowOptionalContact?: boolean }
): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Do‘kon ma’lumotlari kiritilmadi.' };
  }

  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { isValid: false, error: 'Do‘kon nomi kamida 2 ta belgidan iborat bo‘lishi kerak.' };
  }
  if (name.length > 100) {
    return { isValid: false, error: 'Do‘kon nomi 100 ta belgidan oshmasligi kerak.' };
  }

  const city = input.city?.trim();
  if (!city || city.length < 2) {
    return { isValid: false, error: 'Shahar nomi (masalan: Nukus) kiritilishi shart.' };
  }

  const address = input.address?.trim();
  if (!address || address.length < 3) {
    return { isValid: false, error: 'Do‘kon manzili kamida 3 ta belgidan iborat bo‘lishi kerak.' };
  }

  const category = input.category?.trim();
  if (!category) {
    return { isValid: false, error: 'Do‘kon toifasi tanlanishi kerak.' };
  }

  const phone = input.phone?.trim();
  if (phone) {
    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phoneRegex.test(phone)) {
      return { isValid: false, error: 'Telefon raqami formati noto‘g‘ri (masalan: +998901234567).' };
    }
  } else if (!options?.allowOptionalContact) {
    return { isValid: false, error: 'Do‘kon telefon raqami kiritilishi shart.' };
  }

  const openingHours = input.openingHours?.trim();
  if (openingHours) {
    if (openingHours.length < 3) {
      return { isValid: false, error: 'Ish tartibi va soatlari kamida 3 ta belgidan iborat bo‘lishi kerak.' };
    }
  } else if (!options?.allowOptionalContact) {
    return { isValid: false, error: 'Ish tartibi va soatlari kiritilishi shart (masalan: 09:00 - 20:00).' };
  }

  if (input.website !== undefined && input.website !== null && input.website.trim() !== '') {
    const websiteTrimmed = input.website.trim();
    if (websiteTrimmed.length > 200) {
      return { isValid: false, error: 'Do‘kon veb-sayti manzili 200 ta belgidan oshmasligi kerak.' };
    }
    if (!isValidHttpUrl(websiteTrimmed)) {
      return {
        isValid: false,
        error: 'Do‘kon veb-sayti manzili faqat http:// yoki https:// bilan boshlanishi kerak (xavfsiz URL).',
      };
    }
  }

  const coordsCheck = validateCoordinates(input.coordinates);
  if (!coordsCheck.isValid) {
    return coordsCheck;
  }

  return { isValid: true };
}

/**
 * Validates input for creating a ProductItem
 */
export function validateProductInput(input?: Partial<CreateProductInput> | null): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Mahsulot ma’lumotlari kiritilmadi.' };
  }

  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { isValid: false, error: 'Mahsulot nomi kamida 2 ta belgidan iborat bo‘lishi kerak.' };
  }
  if (name.length > 150) {
    return { isValid: false, error: 'Mahsulot nomi 150 ta belgidan oshmasligi kerak.' };
  }

  const category = input.category?.trim();
  if (!category) {
    return { isValid: false, error: 'Mahsulot toifasi ko‘rsatilishi shart.' };
  }

  if (input.barcode !== undefined && input.barcode !== null) {
    const bc = input.barcode.trim();
    if (bc.length > 0 && !/^[0-9]{8,14}$/.test(bc)) {
      return { isValid: false, error: 'Shtrixkod 8 tadan 14 tagacha raqamdan iborat bo‘lishi kerak.' };
    }
  }

  if (input.imageUrl) {
    if (!/^https?:\/\/.+/i.test(input.imageUrl.trim())) {
      return { isValid: false, error: 'Mahsulot rasm manzili haqiqiy http:// yoki https:// URL bo‘lishi kerak.' };
    }
  }

  return { isValid: true };
}

/**
 * Validates an InventoryOffer price and store linkage
 */
export function validateOfferInput(input?: Partial<CreateOfferInput> | null): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Taklif ma’lumotlari kiritilmadi.' };
  }

  const storeId = input.storeId?.trim();
  if (!storeId) {
    return { isValid: false, error: 'Do‘kon identifikatori (storeId) ko‘rsatilmadi.' };
  }

  const productId = input.productId?.trim();
  if (!productId) {
    return { isValid: false, error: 'Mahsulot identifikatori (productId) ko‘rsatilmadi.' };
  }

  if (typeof input.price !== 'number' || !Number.isFinite(input.price)) {
    return { isValid: false, error: 'Mahsulot narxi to‘g‘ri raqam bilan ko‘rsatilishi shart.' };
  }

  // Strict constraint: Disallow negative or zero prices (must be > 0)
  if (input.price <= 0) {
    return { isValid: false, error: 'Mahsulot narxi 0 dan katta bo‘lishi shart (manfiy yoki nol bo‘lishi mumkin emas).' };
  }

  if (input.currency && !['UZS', 'USD'].includes(input.currency)) {
    return { isValid: false, error: 'Valyuta turi faqat UZS yoki USD bo‘lishi mumkin.' };
  }

  const validAvailabilities = ['in_stock', 'out_of_stock', 'pre_order', 'on_demand'];
  if (input.availability && !validAvailabilities.includes(input.availability)) {
    return { isValid: false, error: 'Mavjudlik holati noto‘g‘ri ko‘rsatildi.' };
  }

  if (input.warrantyMonths !== undefined && input.warrantyMonths !== null) {
    if (
      typeof input.warrantyMonths !== 'number' ||
      !Number.isInteger(input.warrantyMonths) ||
      input.warrantyMonths < 0 ||
      input.warrantyMonths > 120
    ) {
      return { isValid: false, error: 'Kafolat muddati 0 dan 120 oygacha butun son bo‘lishi kerak.' };
    }
  }

  return { isValid: true };
}

/**
 * Validates partial input when updating an existing inventory offer
 */
export function validateUpdateOfferInput(input?: Partial<UpdateOfferInput> | null): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Yangilash ma’lumotlari kiritilmadi.' };
  }

  if (input.price !== undefined) {
    if (typeof input.price !== 'number' || !Number.isFinite(input.price)) {
      return { isValid: false, error: 'Mahsulot narxi to‘g‘ri raqam bilan ko‘rsatilishi shart.' };
    }
    if (input.price <= 0) {
      return { isValid: false, error: 'Mahsulot narxi 0 dan katta bo‘lishi shart (manfiy yoki nol bo‘lishi mumkin emas).' };
    }
  }

  if (input.currency !== undefined && !['UZS', 'USD'].includes(input.currency)) {
    return { isValid: false, error: 'Valyuta turi faqat UZS yoki USD bo‘lishi mumkin.' };
  }

  const validAvailabilities = ['in_stock', 'out_of_stock', 'pre_order', 'on_demand'];
  if (input.availability !== undefined && !validAvailabilities.includes(input.availability)) {
    return { isValid: false, error: 'Mavjudlik holati noto‘g‘ri ko‘rsatildi.' };
  }

  if (input.warrantyMonths !== undefined && input.warrantyMonths !== null) {
    if (
      typeof input.warrantyMonths !== 'number' ||
      !Number.isInteger(input.warrantyMonths) ||
      input.warrantyMonths < 0 ||
      input.warrantyMonths > 120
    ) {
      return { isValid: false, error: 'Kafolat muddati 0 dan 120 oygacha butun son bo‘lishi kerak.' };
    }
  }

  return { isValid: true };
}

/**
 * Validates partial input when updating a store document
 */
export function validateUpdateStoreInput(input?: Partial<UpdateStoreInput> | null): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Yangilash ma’lumotlari kiritilmadi.' };
  }

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) {
      return { isValid: false, error: 'Do‘kon nomi kamida 2 ta belgidan iborat bo‘lishi kerak.' };
    }
    if (name.length > 100) {
      return { isValid: false, error: 'Do‘kon nomi 100 ta belgidan oshmasligi kerak.' };
    }
  }

  if (input.city !== undefined && input.city.trim().length < 2) {
    return { isValid: false, error: 'Shahar nomi kamida 2 ta belgidan iborat bo‘lishi kerak.' };
  }

  if (input.address !== undefined && input.address.trim().length < 3) {
    return { isValid: false, error: 'Do‘kon manzili kamida 3 ta belgidan iborat bo‘lishi kerak.' };
  }

  if (input.phone !== undefined && input.phone.trim().length > 0) {
    const phone = input.phone.trim();
    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phoneRegex.test(phone)) {
      return { isValid: false, error: 'Telefon raqami formati noto‘g‘ri (masalan: +998901234567).' };
    }
  }

  if (input.openingHours !== undefined && input.openingHours.trim().length > 0 && input.openingHours.trim().length < 3) {
    return { isValid: false, error: 'Ish tartibi va soatlari kiritilishi shart (masalan: 09:00 - 20:00).' };
  }

  if (input.coordinates !== undefined) {
    const coordsCheck = validateCoordinates(input.coordinates);
    if (!coordsCheck.isValid) {
      return coordsCheck;
    }
  }

  return { isValid: true };
}

/**
 * Validates input for creating a StoreApplication
 * Delegates to existing validateStoreInput for consistent store schema validation.
 */
export function validateStoreApplicationInput(
  input?: Partial<CreateStoreApplicationInput> | null
): ValidationResult {
  return validateStoreInput(input);
}

/**
 * Validates input for a ProductSubmission
 */
export function validateProductSubmissionInput(
  input?: Partial<CreateProductSubmissionInput> | null
): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Mahsulot arizasi ma’lumotlari kiritilmadi.' };
  }

  const storeId = input.storeId?.trim();
  if (!storeId || storeId.length < 2) {
    return { isValid: false, error: 'Do‘kon identifikatori (storeId) ko‘rsatilmadi.' };
  }

  // Validate core product fields
  const productValidation = validateProductInput(input);
  if (!productValidation.isValid) {
    return productValidation;
  }

  // Validate optional proposedPrice
  if (input.proposedPrice !== undefined && input.proposedPrice !== null) {
    if (typeof input.proposedPrice !== 'number' || !Number.isFinite(input.proposedPrice)) {
      return { isValid: false, error: 'Taklif etilgan narx to‘g‘ri raqam bo‘lishi shart.' };
    }
    if (input.proposedPrice <= 0) {
      return { isValid: false, error: 'Taklif etilgan narx 0 dan katta bo‘lishi shart (manfiy yoki nol bo‘lishi mumkin emas).' };
    }
  }

  return { isValid: true };
}

/**
 * Validates input for an OfferSubmission
 * Delegates to validateOfferInput to ensure consistent constraints across pricing, warranty, and currency.
 */
export function validateOfferSubmissionInput(
  input?: Partial<CreateOfferSubmissionInput> | null
): ValidationResult {
  return validateOfferInput(input);
}

/**
 * Validates an admin review moderation decision on any submission
 */
export function validateReviewSubmissionInput(
  input?: { status?: unknown; adminNotes?: unknown } | null
): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Moderatsiya qarori kiritilmadi.' };
  }

  if (input.status !== 'approved' && input.status !== 'rejected') {
    return { isValid: false, error: 'Moderatsiya statusi faqat "approved" yoki "rejected" bo‘lishi kerak.' };
  }

  if (input.adminNotes !== undefined && input.adminNotes !== null) {
    if (typeof input.adminNotes !== 'string') {
      return { isValid: false, error: 'Admin izohi matn bo‘lishi kerak.' };
    }
    if (input.adminNotes.length > 500) {
      return { isValid: false, error: 'Admin izohi 500 ta belgidan oshmasligi kerak.' };
    }
  }

  return { isValid: true };
}
