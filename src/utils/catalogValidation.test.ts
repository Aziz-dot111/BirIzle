import { describe, it, expect } from 'vitest';
import {
  validateCoordinates,
  validateStoreInput,
  validateUpdateStoreInput,
  validateProductInput,
  validateOfferInput,
  validateUpdateOfferInput,
  normalizeSearchTerm,
  generateSearchKeywords,
  validateStoreApplicationInput,
  validateProductSubmissionInput,
  validateOfferSubmissionInput,
  validateReviewSubmissionInput,
} from './catalogValidation';

describe('Catalog Validation Utilities', () => {
  describe('validateCoordinates', () => {
    it('accepts valid Nukus city coordinates', () => {
      const nukusCoords = { lat: 42.4619, lng: 59.6166 };
      expect(validateCoordinates(nukusCoords).isValid).toBe(true);
    });

    it('rejects coordinates with missing or non-number values', () => {
      expect(validateCoordinates(null).isValid).toBe(false);
      // @ts-expect-error Testing invalid types
      expect(validateCoordinates({ lat: '42.46', lng: 59.61 }).isValid).toBe(false);
      expect(validateCoordinates({ lat: NaN, lng: 59.61 }).isValid).toBe(false);
    });

    it('rejects out of range latitude (< -90 or > 90)', () => {
      expect(validateCoordinates({ lat: 91.5, lng: 59.61 }).isValid).toBe(false);
      expect(validateCoordinates({ lat: -95, lng: 59.61 }).isValid).toBe(false);
    });

    it('rejects out of range longitude (< -180 or > 180)', () => {
      expect(validateCoordinates({ lat: 42.46, lng: 181 }).isValid).toBe(false);
      expect(validateCoordinates({ lat: 42.46, lng: -190 }).isValid).toBe(false);
    });
  });

  describe('normalizeSearchTerm', () => {
    it('lowercases and normalizes Uzbek apostrophes and whitespace', () => {
      expect(normalizeSearchTerm('  O‘zbekiston   Go‘zalligi  ')).toBe("o'zbekiston go'zalligi");
      expect(normalizeSearchTerm('SAMSUNG Galaxy A55 5G!')).toBe('samsung galaxy a55 5g');
    });
  });

  describe('generateSearchKeywords', () => {
    it('generates distinct searchable token prefixes from product name and brand', () => {
      const keywords = generateSearchKeywords('Samsung Galaxy A55', 'phones', 'Samsung');
      expect(keywords).toContain('samsung');
      expect(keywords).toContain('galaxy');
      expect(keywords).toContain('a55');
      expect(keywords).toContain('phones');
      expect(keywords).toContain('sam'); // Prefix token
    });
  });

  describe('validateStoreInput', () => {
    const validStore = {
      name: 'Nukus Texno Markaz',
      city: 'Nukus',
      address: 'Qoraqalpog‘iston ko‘chasi, 12-uy',
      category: 'electronics',
      phone: '+998612220001',
      openingHours: '09:00 - 20:00',
      coordinates: { lat: 42.4619, lng: 59.6166 },
    };

    it('accepts valid store input', () => {
      const res = validateStoreInput(validStore);
      expect(res.isValid).toBe(true);
    });

    it('rejects store with empty or short name', () => {
      expect(validateStoreInput({ ...validStore, name: 'A' }).isValid).toBe(false);
      expect(validateStoreInput({ ...validStore, name: '' }).isValid).toBe(false);
    });

    it('rejects store with missing city', () => {
      expect(validateStoreInput({ ...validStore, city: '' }).isValid).toBe(false);
    });

    it('rejects store with invalid phone format', () => {
      expect(validateStoreInput({ ...validStore, phone: 'abc123' }).isValid).toBe(false);
    });

    it('rejects store with invalid coordinates', () => {
      expect(
        validateStoreInput({
          ...validStore,
          coordinates: { lat: 100, lng: 59.6166 },
        }).isValid
      ).toBe(false);
    });
  });

  describe('validateProductInput', () => {
    const validProduct = {
      name: 'Smartfon 128GB',
      category: 'phones',
      brand: 'Samsung',
      barcode: '8806091234567',
      imageUrl: 'https://example.com/phone.jpg',
    };

    it('accepts valid product input', () => {
      expect(validateProductInput(validProduct).isValid).toBe(true);
    });

    it('rejects product with missing name or category', () => {
      expect(validateProductInput({ ...validProduct, name: '' }).isValid).toBe(false);
      expect(validateProductInput({ ...validProduct, category: '' }).isValid).toBe(false);
    });

    it('rejects invalid barcode format (letters or wrong length)', () => {
      expect(validateProductInput({ ...validProduct, barcode: '123' }).isValid).toBe(false);
      expect(validateProductInput({ ...validProduct, barcode: 'abcdefghijk' }).isValid).toBe(false);
    });

    it('rejects non-http imageUrl', () => {
      expect(validateProductInput({ ...validProduct, imageUrl: 'ftp://files/img.png' }).isValid).toBe(false);
    });
  });

  describe('validateOfferInput', () => {
    const validOffer = {
      storeId: 'store_nukus_01',
      productId: 'prod_phone_01',
      price: 4200000,
      currency: 'UZS' as const,
      availability: 'in_stock' as const,
    };

    it('accepts a valid inventory offer', () => {
      expect(validateOfferInput(validOffer).isValid).toBe(true);
    });

    it('STRICT: rejects negative price (price < 0)', () => {
      const negativeOffer = { ...validOffer, price: -50000 };
      const res = validateOfferInput(negativeOffer);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('manfiy');
    });

    it('rejects NaN or non-finite price', () => {
      expect(validateOfferInput({ ...validOffer, price: NaN }).isValid).toBe(false);
      expect(validateOfferInput({ ...validOffer, price: Infinity }).isValid).toBe(false);
    });

    it('rejects missing storeId or productId', () => {
      expect(validateOfferInput({ ...validOffer, storeId: '' }).isValid).toBe(false);
      expect(validateOfferInput({ ...validOffer, productId: '' }).isValid).toBe(false);
    });

    it('rejects invalid currency code', () => {
      // @ts-expect-error Testing invalid currency
      expect(validateOfferInput({ ...validOffer, currency: 'EUR' }).isValid).toBe(false);
    });

    it('rejects negative warranty months or warranty months > 120 or non-integer', () => {
      expect(validateOfferInput({ ...validOffer, warrantyMonths: -6 }).isValid).toBe(false);
      expect(validateOfferInput({ ...validOffer, warrantyMonths: 150 }).isValid).toBe(false);
      expect(validateOfferInput({ ...validOffer, warrantyMonths: 12.5 }).isValid).toBe(false);
      expect(validateOfferInput({ ...validOffer, warrantyMonths: 24 }).isValid).toBe(true);
    });
  });

  describe('validateUpdateOfferInput', () => {
    it('accepts valid partial offer update', () => {
      expect(validateUpdateOfferInput({ price: 3900000, availability: 'out_of_stock' }).isValid).toBe(true);
      expect(validateUpdateOfferInput({ warrantyMonths: 12 }).isValid).toBe(true);
    });

    it('rejects negative price in update', () => {
      expect(validateUpdateOfferInput({ price: -100 }).isValid).toBe(false);
    });

    it('rejects warranty months > 120 or non-integer', () => {
      expect(validateUpdateOfferInput({ warrantyMonths: 125 }).isValid).toBe(false);
      expect(validateUpdateOfferInput({ warrantyMonths: 10.5 }).isValid).toBe(false);
    });

    it('rejects invalid availability in update', () => {
      // @ts-expect-error testing invalid status
      expect(validateUpdateOfferInput({ availability: 'invalid_status' }).isValid).toBe(false);
    });
  });

  describe('validateUpdateStoreInput', () => {
    it('accepts valid partial store update', () => {
      expect(validateUpdateStoreInput({ phone: '+998901234567', openingHours: '08:00 - 22:00' }).isValid).toBe(true);
    });

    it('rejects invalid phone in update', () => {
      expect(validateUpdateStoreInput({ phone: 'bad_number' }).isValid).toBe(false);
    });

    it('rejects short name in update', () => {
      expect(validateUpdateStoreInput({ name: 'A' }).isValid).toBe(false);
    });
  });

  describe('validateStoreApplicationInput', () => {
    const validApplication = {
      name: 'Nukus Savdo Markazi',
      city: 'Nukus',
      district: 'Nukus shahri',
      address: 'Dosnazarov ko‘chasi, 12',
      coordinates: { lat: 42.4619, lng: 59.6166 },
      category: 'electronics',
      phone: '+998612221111',
      openingHours: '09:00 - 20:00',
    };

    it('accepts valid store application input', () => {
      expect(validateStoreApplicationInput(validApplication).isValid).toBe(true);
    });

    it('rejects store application with missing or short name', () => {
      expect(validateStoreApplicationInput({ ...validApplication, name: '' }).isValid).toBe(false);
      expect(validateStoreApplicationInput({ ...validApplication, name: 'A' }).isValid).toBe(false);
    });

    it('rejects store application with invalid coordinates', () => {
      expect(validateStoreApplicationInput({ ...validApplication, coordinates: { lat: 95, lng: 59 } }).isValid).toBe(false);
    });
  });

  describe('validateProductSubmissionInput', () => {
    const validProductSub = {
      storeId: 'store_123',
      name: 'Inverter Konditsioner 12',
      category: 'appliances',
      brand: 'Artel',
      proposedPrice: 4500000,
    };

    it('accepts valid product submission', () => {
      expect(validateProductSubmissionInput(validProductSub).isValid).toBe(true);
    });

    it('rejects product submission without storeId', () => {
      expect(validateProductSubmissionInput({ ...validProductSub, storeId: '' }).isValid).toBe(false);
    });

    it('rejects product submission with negative proposed price', () => {
      expect(validateProductSubmissionInput({ ...validProductSub, proposedPrice: -100 }).isValid).toBe(false);
    });

    it('rejects product submission with invalid image URL', () => {
      expect(validateProductSubmissionInput({ ...validProductSub, imageUrl: 'invalid_url' }).isValid).toBe(false);
    });
  });

  describe('validateOfferSubmissionInput', () => {
    const validOfferSub = {
      storeId: 'store_123',
      productId: 'prod_456',
      price: 3200000,
      currency: 'UZS' as const,
      availability: 'in_stock' as const,
      warrantyMonths: 12,
      deliveryAvailable: true,
    };

    it('accepts valid offer submission', () => {
      expect(validateOfferSubmissionInput(validOfferSub).isValid).toBe(true);
    });

    it('rejects offer submission with negative price', () => {
      expect(validateOfferSubmissionInput({ ...validOfferSub, price: -5000 }).isValid).toBe(false);
    });

    it('rejects offer submission with invalid currency or availability', () => {
      // @ts-expect-error Testing invalid currency
      expect(validateOfferSubmissionInput({ ...validOfferSub, currency: 'EUR' }).isValid).toBe(false);
      // @ts-expect-error Testing invalid availability
      expect(validateOfferSubmissionInput({ ...validOfferSub, availability: 'unknown' }).isValid).toBe(false);
    });
  });

  describe('validateReviewSubmissionInput', () => {
    it('accepts approved and rejected moderation statuses', () => {
      expect(validateReviewSubmissionInput({ status: 'approved' }).isValid).toBe(true);
      expect(validateReviewSubmissionInput({ status: 'rejected', adminNotes: 'Hujjatlar yetarli emas' }).isValid).toBe(true);
    });

    it('rejects invalid or pending moderation status for final decision', () => {
      expect(validateReviewSubmissionInput({ status: 'pending' }).isValid).toBe(false);
      expect(validateReviewSubmissionInput({ status: 'unknown' }).isValid).toBe(false);
      expect(validateReviewSubmissionInput(null).isValid).toBe(false);
    });

    it('rejects excessively long admin notes (> 500 characters)', () => {
      const longNote = 'A'.repeat(501);
      expect(validateReviewSubmissionInput({ status: 'rejected', adminNotes: longNote }).isValid).toBe(false);
    });
  });
});
