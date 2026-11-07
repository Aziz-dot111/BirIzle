import { describe, it, expect } from 'vitest';
import {
  validateCreateOrderInput,
  validateUpdateOrderStatusInput,
  validateOrderStatusTransition,
} from './orderValidation';
import type { CreateOrderInput } from '@/types/order';

describe('Order Validation & State Machine Unit Tests', () => {
  const validOrderInput: CreateOrderInput = {
    storeId: 'store_nukus_1',
    productId: 'prod_samsung_1',
    offerId: 'offer_store_prod_1',
    quantity: 2,
    customerName: 'Azamat Berdiyev',
    customerPhone: '+998901234567',
    customerNote: 'Eshik tagiga olib kelib bering.',
  };

  describe('validateCreateOrderInput', () => {
    it('accepts valid order creation input', () => {
      const res = validateCreateOrderInput(validOrderInput);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rejects missing or empty storeId, productId, offerId', () => {
      expect(validateCreateOrderInput({ ...validOrderInput, storeId: '' }).isValid).toBe(false);
      expect(validateCreateOrderInput({ ...validOrderInput, productId: '' }).isValid).toBe(false);
      expect(validateCreateOrderInput({ ...validOrderInput, offerId: '' }).isValid).toBe(false);
    });

    it('rejects invalid quantity (zero, negative, above 99, non-integer)', () => {
      expect(validateCreateOrderInput({ ...validOrderInput, quantity: 0 }).isValid).toBe(false);
      expect(validateCreateOrderInput({ ...validOrderInput, quantity: -1 }).isValid).toBe(false);
      expect(validateCreateOrderInput({ ...validOrderInput, quantity: 100 }).isValid).toBe(false);
      expect(validateCreateOrderInput({ ...validOrderInput, quantity: 2.5 }).isValid).toBe(false);
      expect(validateCreateOrderInput({ ...validOrderInput, quantity: NaN }).isValid).toBe(false);
    });

    it('accepts boundary quantities (1 and 99)', () => {
      expect(validateCreateOrderInput({ ...validOrderInput, quantity: 1 }).isValid).toBe(true);
      expect(validateCreateOrderInput({ ...validOrderInput, quantity: 99 }).isValid).toBe(true);
    });

    it('rejects short customer name (< 2 chars) or excessively long (> 100 chars)', () => {
      expect(validateCreateOrderInput({ ...validOrderInput, customerName: 'A' }).isValid).toBe(false);
      expect(
        validateCreateOrderInput({ ...validOrderInput, customerName: 'x'.repeat(101) }).isValid
      ).toBe(false);
    });

    it('rejects invalid customer phone number', () => {
      expect(validateCreateOrderInput({ ...validOrderInput, customerPhone: '' }).isValid).toBe(false);
      expect(validateCreateOrderInput({ ...validOrderInput, customerPhone: 'abc123' }).isValid).toBe(false);
      expect(validateCreateOrderInput({ ...validOrderInput, customerPhone: '123' }).isValid).toBe(false);
    });

    it('accepts valid phone numbers (+998 90 123-45-67, 998901234567)', () => {
      expect(validateCreateOrderInput({ ...validOrderInput, customerPhone: '+998 90 123 45 67' }).isValid).toBe(true);
      expect(validateCreateOrderInput({ ...validOrderInput, customerPhone: '+998-90-123-45-67' }).isValid).toBe(true);
      expect(validateCreateOrderInput({ ...validOrderInput, customerPhone: '998901234567' }).isValid).toBe(true);
    });

    it('rejects customer note longer than 500 characters', () => {
      const longNote = 'a'.repeat(501);
      const res = validateCreateOrderInput({ ...validOrderInput, customerNote: longNote });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('500');
    });

    it('accepts order without customer note or optional variantId', () => {
      const { customerNote: _customerNote, ...minimal } = validOrderInput;
      expect(validateCreateOrderInput(minimal).isValid).toBe(true);
      expect(validateCreateOrderInput({ ...validOrderInput, variantId: 'black-128gb' }).isValid).toBe(true);
    });
  });

  describe('validateUpdateOrderStatusInput', () => {
    it('accepts valid status values', () => {
      expect(validateUpdateOrderStatusInput({ status: 'pending' }).isValid).toBe(true);
      expect(validateUpdateOrderStatusInput({ status: 'accepted' }).isValid).toBe(true);
      expect(validateUpdateOrderStatusInput({ status: 'rejected' }).isValid).toBe(true);
      expect(validateUpdateOrderStatusInput({ status: 'completed' }).isValid).toBe(true);
      expect(validateUpdateOrderStatusInput({ status: 'cancelled' }).isValid).toBe(true);
    });

    it('rejects unknown status string', () => {
      // @ts-expect-error testing invalid status
      expect(validateUpdateOrderStatusInput({ status: 'unknown_status' }).isValid).toBe(false);
    });

    it('rejects merchantNotes longer than 500 characters', () => {
      const res = validateUpdateOrderStatusInput({
        status: 'rejected',
        merchantNotes: 'x'.repeat(501),
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('500');
    });
  });

  describe('validateOrderStatusTransition State Machine', () => {
    const customerActor = {
      uid: 'customer_1',
      customerUid: 'customer_1',
      storeOwnerId: 'merchant_1',
    };

    const merchantActor = {
      uid: 'merchant_1',
      customerUid: 'customer_1',
      storeOwnerId: 'merchant_1',
    };

    const strangerActor = {
      uid: 'stranger_99',
      customerUid: 'customer_1',
      storeOwnerId: 'merchant_1',
    };

    const adminActor = {
      uid: 'admin_1',
      customerUid: 'customer_1',
      storeOwnerId: 'merchant_1',
      isAdmin: true,
    };

    it('rejects unauthorized actor from changing order status', () => {
      const res = validateOrderStatusTransition('pending', 'accepted', strangerActor);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('ruxsat mavjud emas');
    });

    it('allows customer to cancel their own pending order', () => {
      const res = validateOrderStatusTransition('pending', 'cancelled', customerActor);
      expect(res.isValid).toBe(true);
    });

    it('prevents customer from accepting, rejecting, or completing order', () => {
      expect(validateOrderStatusTransition('pending', 'accepted', customerActor).isValid).toBe(false);
      expect(validateOrderStatusTransition('pending', 'rejected', customerActor).isValid).toBe(false);
      expect(validateOrderStatusTransition('accepted', 'completed', customerActor).isValid).toBe(false);
    });

    it('prevents customer from cancelling an already accepted order', () => {
      const res = validateOrderStatusTransition('accepted', 'cancelled', customerActor);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('completed');
    });

    it('allows merchant to accept or reject pending order', () => {
      expect(validateOrderStatusTransition('pending', 'accepted', merchantActor).isValid).toBe(true);
      expect(validateOrderStatusTransition('pending', 'rejected', merchantActor).isValid).toBe(true);
    });

    it('allows merchant to complete accepted order', () => {
      expect(validateOrderStatusTransition('accepted', 'completed', merchantActor).isValid).toBe(true);
    });

    it('prevents direct transition from pending to completed (must accept first)', () => {
      const res = validateOrderStatusTransition('pending', 'completed', merchantActor);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('to‘g‘ridan-to‘g‘ri');
    });

    it('prevents transition out of terminal states (rejected, cancelled, completed)', () => {
      expect(validateOrderStatusTransition('rejected', 'accepted', merchantActor).isValid).toBe(false);
      expect(validateOrderStatusTransition('rejected', 'pending', merchantActor).isValid).toBe(false);
      expect(validateOrderStatusTransition('cancelled', 'pending', customerActor).isValid).toBe(false);
      expect(validateOrderStatusTransition('completed', 'pending', merchantActor).isValid).toBe(false);
    });

    it('allows admin to perform valid status transitions as superuser', () => {
      expect(validateOrderStatusTransition('pending', 'cancelled', adminActor).isValid).toBe(true);
      expect(validateOrderStatusTransition('pending', 'accepted', adminActor).isValid).toBe(true);
      expect(validateOrderStatusTransition('accepted', 'completed', adminActor).isValid).toBe(true);
    });
  });
});
