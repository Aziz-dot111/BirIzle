import type { CreateOrderInput, OrderStatus, UpdateOrderStatusInput } from '@/types/order';
import type { ValidationResult } from './validation';

/**
 * Validates customer order creation input fields
 */
export function validateCreateOrderInput(
  input?: Partial<CreateOrderInput> | null
): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Buyurtma ma’lumotlari kiritilmadi.' };
  }

  const storeId = input.storeId?.trim();
  if (!storeId || storeId.length < 2) {
    return { isValid: false, error: 'Do‘kon identifikatori (storeId) ko‘rsatilmadi.' };
  }

  const productId = input.productId?.trim();
  if (!productId || productId.length < 2) {
    return { isValid: false, error: 'Mahsulot identifikatori (productId) ko‘rsatilmadi.' };
  }

  const offerId = input.offerId?.trim();
  if (!offerId || offerId.length < 2) {
    return { isValid: false, error: 'Taklif identifikatori (offerId) ko‘rsatilmadi.' };
  }

  // Validate Quantity: strict integer between 1 and 99
  const quantity = input.quantity;
  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  ) {
    return {
      isValid: false,
      error: 'Mahsulot miqdori 1 dan 99 gacha butun son bo‘lishi shart.',
    };
  }

  // Validate Customer Name: min 2, max 100
  const customerName = input.customerName?.trim();
  if (!customerName || customerName.length < 2) {
    return {
      isValid: false,
      error: 'Ismingiz kamida 2 ta belgidan iborat bo‘lishi kerak.',
    };
  }
  if (customerName.length > 100) {
    return {
      isValid: false,
      error: 'Ism 100 ta belgidan oshmasligi kerak.',
    };
  }

  // Validate Customer Phone: 7 to 20 chars with international / local format support
  const customerPhone = input.customerPhone?.trim();
  if (!customerPhone) {
    return {
      isValid: false,
      error: 'Aloqa uchun telefon raqamingiz kiritilishi shart.',
    };
  }
  const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
  if (!phoneRegex.test(customerPhone)) {
    return {
      isValid: false,
      error: 'Telefon raqami formati noto‘g‘ri (masalan: +998 90 123 45 67).',
    };
  }

  // Validate Optional Customer Note: max 500 chars
  if (input.customerNote !== undefined && input.customerNote !== null) {
    if (typeof input.customerNote !== 'string') {
      return { isValid: false, error: 'Buyurtma izohi matn ko‘rinishida bo‘lishi kerak.' };
    }
    if (input.customerNote.trim().length > 500) {
      return {
        isValid: false,
        error: 'Buyurtma izohi 500 ta belgidan oshmasligi kerak.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates partial input when updating order status
 */
export function validateUpdateOrderStatusInput(
  input?: Partial<UpdateOrderStatusInput> | null
): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Buyurtma holatini yangilash ma’lumotlari kiritilmadi.' };
  }

  const validStatuses: OrderStatus[] = [
    'pending',
    'accepted',
    'rejected',
    'completed',
    'cancelled',
  ];

  if (!input.status || !validStatuses.includes(input.status)) {
    return {
      isValid: false,
      error: 'Noto‘g‘ri buyurtma holati ko‘rsatildi.',
    };
  }

  if (input.merchantNotes !== undefined && input.merchantNotes !== null) {
    if (typeof input.merchantNotes !== 'string') {
      return { isValid: false, error: 'Do‘kon izohi matn bo‘lishi kerak.' };
    }
    if (input.merchantNotes.trim().length > 500) {
      return { isValid: false, error: 'Do‘kon izohi 500 ta belgidan oshmasligi kerak.' };
    }
  }

  return { isValid: true };
}

export interface OrderTransitionActor {
  uid: string;
  customerUid: string;
  storeOwnerId: string;
  isAdmin?: boolean;
}

/**
 * State machine validator for OneShop Order lifecycle.
 *
 * ALLOWED TRANSITIONS:
 * - pending -> accepted   (Store Owner or Admin)
 * - pending -> rejected   (Store Owner or Admin)
 * - pending -> cancelled  (Customer who placed the order or Admin)
 * - accepted -> completed (Store Owner or Admin)
 *
 * FORBIDDEN TRANSITIONS:
 * - rejected -> *         (Terminal state)
 * - cancelled -> *        (Terminal state)
 * - completed -> *        (Terminal state)
 * - pending -> completed  (Must be accepted first)
 * - accepted -> cancelled (Customer cannot cancel after merchant accepts)
 * - accepted -> rejected  (Merchant cannot reject after accepting)
 */
export function validateOrderStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  actor: OrderTransitionActor
): ValidationResult {
  const isCustomer = actor.uid === actor.customerUid;
  const isMerchant = actor.uid === actor.storeOwnerId;
  const isAdmin = Boolean(actor.isAdmin);

  if (!isCustomer && !isMerchant && !isAdmin) {
    return {
      isValid: false,
      error: 'Ushbu buyurtma holatini o‘zgartirish uchun sizda ruxsat mavjud emas.',
    };
  }

  if (currentStatus === newStatus) {
    return {
      isValid: false,
      error: 'Buyurtma allaqachon ushbu holatda.',
    };
  }

  // Terminal states cannot be transitioned further
  if (currentStatus === 'rejected') {
    return {
      isValid: false,
      error: 'Rad etilgan buyurtma holatini qayta o‘zgartirib bo‘lmaydi.',
    };
  }
  if (currentStatus === 'cancelled') {
    return {
      isValid: false,
      error: 'Bekor qilingan buyurtma holatini qayta o‘zgartirib bo‘lmaydi.',
    };
  }
  if (currentStatus === 'completed') {
    return {
      isValid: false,
      error: 'Bajarilgan buyurtma holatini qayta o‘zgartirib bo‘lmaydi.',
    };
  }

  // Transitions from 'pending'
  if (currentStatus === 'pending') {
    if (newStatus === 'cancelled') {
      if (!isCustomer && !isAdmin) {
        return {
          isValid: false,
          error: 'Faqat buyurtma bergan xaridor yoki admin buyurtmani bekor qilishi mumkin.',
        };
      }
      return { isValid: true };
    }

    if (newStatus === 'accepted' || newStatus === 'rejected') {
      if (!isMerchant && !isAdmin) {
        return {
          isValid: false,
          error: 'Faqat do‘kon egasi yoki admin buyurtmani qabul qilishi yoki rad etishi mumkin.',
        };
      }
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `Buyurtmani 'pending' holatidan to‘g‘ridan-to‘g‘ri '${newStatus}' holatiga o‘tkazib bo‘lmaydi.`,
    };
  }

  // Transitions from 'accepted'
  if (currentStatus === 'accepted') {
    if (newStatus === 'completed') {
      if (!isMerchant && !isAdmin) {
        return {
          isValid: false,
          error: 'Faqat do‘kon egasi yoki admin buyurtmani bajarildi deb belgilashi mumkin.',
        };
      }
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `Qabul qilingan buyurtmani faqat 'completed' holatiga o‘tkazish mumkin.`,
    };
  }

  return {
    isValid: false,
    error: `Ruxsat etilmagan holat o‘tishi: ${currentStatus} -> ${newStatus}.`,
  };
}

