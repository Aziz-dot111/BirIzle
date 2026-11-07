import type { CurrencyCode } from './product';

/**
 * Universal lifecycle state of an order / lead in OneShop marketplace
 */
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'cancelled';

/**
 * Customer → Store Order / Lead entity stored in /orders/{orderId}
 * 
 * SECURITY & INTEGRITY INVARIANTS:
 * - Customer creates order with input: storeId, productId, offerId, variantId, quantity, name, phone, note.
 * - Server-trusted snapshots (storeOwnerId, storeName, productName, price, currency) are resolved
 *   directly from verified Store, Product, and Offer documents in Firestore, NEVER trusted from client.
 * - Status transitions follow strict state machine rules.
 * - Customer and Store Owner retain private read access scoped strictly by their UID.
 */
export interface Order {
  id: string;

  // Customer information (authenticated caller)
  customerUid: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;

  // Store information (verified store snapshot)
  storeId: string;
  storeOwnerId: string;
  storeName: string;

  // Product and Offer information (verified snapshot)
  productId: string;
  productName: string;
  offerId: string;
  variantId?: string;

  // Pricing & Quantity snapshots
  price: number; // Unit price from verified offer at creation time
  currency: CurrencyCode; // 'UZS' | 'USD'
  quantity: number; // 1 to 99 integer
  totalAmount?: number; // price * quantity calculated snapshot

  // Notes
  customerNote?: string;
  merchantNotes?: string;

  // Moderation / State Machine Lifecycle
  status: OrderStatus;
  statusChangedAt: string; // ISO 8601 string
  statusChangedBy: string; // UID of user who changed status (customer, merchant, admin)

  // System audit timestamps
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

/**
 * Input supplied by customer when creating a new order request
 */
export interface CreateOrderInput {
  storeId: string;
  productId: string;
  offerId: string;
  variantId?: string;
  quantity: number; // Integer between 1 and 99
  customerName: string;
  customerPhone: string;
  customerNote?: string;
}

/**
 * Input for updating order status by merchant, customer, or admin
 */
export interface UpdateOrderStatusInput {
  status: OrderStatus;
  merchantNotes?: string;
}

/**
 * Query filter options for orders retrieval
 */
export interface OrderFilterOptions {
  limitCount?: number;
  status?: OrderStatus;
}

