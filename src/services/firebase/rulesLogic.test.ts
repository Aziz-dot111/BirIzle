import { describe, it, expect } from 'vitest';

/**
 * Direct evaluation model of the exact CEL logic implemented in firestore.rules
 * Used to verify rule invariants and prevent regression when Firebase Local Emulator (Java)
 * is not running on the local host.
 */

interface MockAuth {
  uid: string;
  token: {
    email?: string;
    email_verified?: boolean;
    admin?: boolean;
  };
}

interface MockRequest {
  auth: MockAuth | null;
  time: string; // ISO string representing request.time
  resource?: {
    data: Record<string, unknown>;
  };
}

// Helper functions matching firestore.rules
function isAuthenticated(req: MockRequest): boolean {
  return req.auth !== null;
}

function isEmailVerified(req: MockRequest): boolean {
  return isAuthenticated(req) && req.auth?.token.email_verified === true;
}

function isOwner(req: MockRequest, userId: string): boolean {
  return isAuthenticated(req) && req.auth?.uid === userId;
}

function isValidDisplayName(data: Record<string, unknown>): boolean {
  if (!('displayName' in data) || data.displayName === null) return true;
  if (typeof data.displayName !== 'string') return false;
  return data.displayName.length >= 2 && data.displayName.length <= 60;
}

function isValidPhotoURL(data: Record<string, unknown>): boolean {
  if (!('photoURL' in data) || data.photoURL === null) return true;
  if (typeof data.photoURL !== 'string') return false;
  return data.photoURL.length <= 500 && /^https?:\/\/.*/.test(data.photoURL);
}

function isValidPhoneNumber(data: Record<string, unknown>): boolean {
  if (!('phoneNumber' in data) || data.phoneNumber === null) return true;
  if (typeof data.phoneNumber !== 'string') return false;
  return (
    data.phoneNumber.length >= 7 &&
    data.phoneNumber.length <= 20 &&
    /^\+?[0-9\s\-()]{7,20}$/.test(data.phoneNumber)
  );
}

function hasOnlyValidProfileKeys(data: Record<string, unknown>): boolean {
  const allowed = new Set([
    'uid',
    'email',
    'displayName',
    'photoURL',
    'phoneNumber',
    'createdAt',
    'updatedAt',
  ]);
  return Object.keys(data).every((k) => allowed.has(k));
}

function hasRequiredProfileKeys(data: Record<string, unknown>): boolean {
  const required = ['uid', 'email', 'createdAt', 'updatedAt'];
  return required.every((k) => k in data);
}

function isValidCreateTimestamps(data: Record<string, unknown>, reqTime: string): boolean {
  return data.createdAt === reqTime && data.updatedAt === reqTime;
}

function isValidUpdateTimestamps(
  data: Record<string, unknown>,
  existing: Record<string, unknown>,
  reqTime: string
): boolean {
  return data.updatedAt === reqTime && data.createdAt === existing.createdAt;
}

function isValidUserProfile(data: Record<string, unknown>, req: MockRequest): boolean {
  return (
    hasOnlyValidProfileKeys(data) &&
    typeof data.uid === 'string' &&
    data.uid === req.auth?.uid &&
    typeof data.email === 'string' &&
    data.email === req.auth?.token.email &&
    isValidDisplayName(data) &&
    isValidPhotoURL(data) &&
    isValidPhoneNumber(data)
  );
}

// Rules decision evaluators
function evaluateCreateUser(req: MockRequest, userId: string, data: Record<string, unknown>): boolean {
  return (
    isOwner(req, userId) &&
    isEmailVerified(req) &&
    data.uid === userId &&
    hasRequiredProfileKeys(data) &&
    isValidUserProfile(data, req) &&
    isValidCreateTimestamps(data, req.time)
  );
}

function evaluateUpdateUser(
  req: MockRequest,
  userId: string,
  existingData: Record<string, unknown>,
  newData: Record<string, unknown>
): boolean {
  if (!isOwner(req, userId) || !isEmailVerified(req) || newData.uid !== userId) {
    return false;
  }
  if (!isValidUserProfile(newData, req)) {
    return false;
  }
  if (!isValidUpdateTimestamps(newData, existingData, req.time)) {
    return false;
  }

  // Calculate affected keys
  const affectedKeys = Object.keys(newData).filter((k) => newData[k] !== existingData[k]);
  const allowedUpdateKeys = new Set(['displayName', 'updatedAt', 'photoURL', 'phoneNumber']);
  if (!affectedKeys.every((k) => allowedUpdateKeys.has(k))) {
    return false;
  }

  if (newData.uid !== existingData.uid || newData.email !== existingData.email) {
    return false;
  }

  return true;
}

function evaluateReadUser(req: MockRequest, userId: string): boolean {
  return isOwner(req, userId);
}

function evaluateListUsers(): boolean {
  return false; // Denied by rule: allow list: if false;
}

function evaluateDeleteUser(): boolean {
  return false; // Denied by rule: allow delete: if false;
}

function evaluateArbitraryCollection(): boolean {
  return false; // Denied by rule: match /{document=**} { allow read, write: if false; }
}

function isAdmin(req: MockRequest): boolean {
  return isAuthenticated(req) && req.auth?.token.admin === true;
}

function isStoreBlockedForPublic(data: Record<string, unknown>): boolean {
  return 'status' in data && ['pending', 'archived', 'inactive', 'suspended'].includes(data.status as string);
}

function isStorePubliclyReadable(data: Record<string, unknown>): boolean {
  if (isStoreBlockedForPublic(data)) return false;
  return (
    data.status === 'active' ||
    data.isVerified === true ||
    data.isDemo === true ||
    data.sourceType === 'openstreetmap' ||
    (!('status' in data) && !('ownerId' in data))
  );
}

function evaluateStoreGet(req: MockRequest, storeData: Record<string, unknown>): boolean {
  if (isAdmin(req)) return true;
  if (isStorePubliclyReadable(storeData)) return true;
  if (isAuthenticated(req) && req.auth?.uid === storeData.ownerId) {
    return true;
  }
  return false;
}

function evaluateStoreList(
  req: MockRequest,
  queryFilter: {
    status?: string;
    isVerified?: boolean;
    ownerId?: string;
    limit?: number;
  },
  storeData: Record<string, unknown>
): boolean {
  if (isAdmin(req)) return true;

  // Explicit mandatory limit <= 25 for non-admin queries
  if (typeof queryFilter.limit !== 'number' || queryFilter.limit <= 0 || queryFilter.limit > 25) {
    return false;
  }

  // Merchant querying their own stores (including pending)
  if (
    isAuthenticated(req) &&
    queryFilter.ownerId &&
    queryFilter.ownerId === req.auth?.uid &&
    storeData.ownerId === req.auth?.uid
  ) {
    return true;
  }

  // Public customer query strictly for active stores
  if (queryFilter.status === 'active' && storeData.status === 'active') {
    return true;
  }

  return false;
}

function evaluateUserGet(req: MockRequest, targetUserId: string): boolean {
  return isAuthenticated(req) && req.auth?.uid === targetUserId;
}

function evaluateUserList(): boolean {
  return false;
}

interface MockSubmissionStoreDoc {
  ownerId?: string | null;
  status?: string;
  isVerified?: boolean;
}

function isCurrentActiveStoreOwnerMock(req: MockRequest, store: MockSubmissionStoreDoc | null | undefined): boolean {
  if (!isAuthenticated(req) || !store) return false;
  const isOwner = store.ownerId === req.auth?.uid;
  const isActive = store.status === 'active' || (!('status' in store) && store.isVerified === true);
  return isOwner && isActive;
}

function hasOnlyValidProductSubmissionKeysMock(data: Record<string, unknown>): boolean {
  const allowed = new Set([
    'merchantUid', 'merchantEmail', 'storeId', 'name', 'category',
    'brand', 'model', 'barcode', 'imageUrl', 'description',
    'variant', 'specifications', 'proposedPrice',
    'status', 'adminNotes', 'reviewedBy', 'reviewedAt',
    'approvedProductId', 'createdAt', 'updatedAt'
  ]);
  return Object.keys(data).every((k) => allowed.has(k));
}

function hasRequiredProductSubmissionKeysMock(data: Record<string, unknown>): boolean {
  const required = [
    'merchantUid', 'merchantEmail', 'storeId', 'name', 'category',
    'status', 'createdAt', 'updatedAt'
  ];
  return required.every((k) => k in data);
}

function evaluateProductSubmissionCreate(
  req: MockRequest,
  data: Record<string, unknown>,
  store: MockSubmissionStoreDoc | null | undefined
): boolean {
  if (!isAuthenticated(req)) return false;
  if (!isEmailVerified(req)) return false;
  if (!hasRequiredProductSubmissionKeysMock(data)) return false;
  if (!hasOnlyValidProductSubmissionKeysMock(data)) return false;

  if (data.merchantUid !== req.auth?.uid) return false;
  if (data.merchantEmail !== req.auth?.token?.email) return false;
  if (data.status !== 'pending') return false;

  if ('adminNotes' in data && data.adminNotes !== null) return false;
  if ('reviewedBy' in data && data.reviewedBy !== null) return false;
  if ('reviewedAt' in data && data.reviewedAt !== null) return false;
  if ('approvedProductId' in data && data.approvedProductId !== null) return false;

  if (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 150) return false;
  if (typeof data.category !== 'string' || data.category.length < 2 || data.category.length > 100) return false;
  if ('proposedPrice' in data && data.proposedPrice !== null && (typeof data.proposedPrice !== 'number' || data.proposedPrice <= 0)) {
    return false;
  }

  if (data.createdAt !== req.time || data.updatedAt !== req.time) return false;
  if (!isCurrentActiveStoreOwnerMock(req, store)) return false;

  return true;
}

function evaluateProductSubmissionGet(
  req: MockRequest,
  data: Record<string, unknown>,
  store: MockSubmissionStoreDoc | null | undefined
): boolean {
  if (isAdmin(req)) return true;
  if (!isAuthenticated(req)) return false;
  if (data.merchantUid === req.auth?.uid) return true;
  if (store && store.ownerId === req.auth?.uid) return true;
  return false;
}

function evaluateProductSubmissionList(
  req: MockRequest,
  queryFilter: { merchantUid?: string; storeId?: string; limit?: number },
  data: Record<string, unknown>
): boolean {
  if (isAdmin(req)) return true;
  if (!isAuthenticated(req)) return false;
  if (typeof queryFilter.limit !== 'number' || queryFilter.limit <= 0 || queryFilter.limit > 25) {
    return false;
  }
  return queryFilter.merchantUid === req.auth?.uid && data.merchantUid === req.auth?.uid;
}

function evaluateProductSubmissionUpdate(req: MockRequest): boolean {
  return isAdmin(req);
}

function evaluateProductSubmissionDelete(): boolean {
  return false;
}

// Offer Submissions Mocks
function hasOnlyValidOfferSubmissionKeysMock(data: Record<string, unknown>): boolean {
  const allowed = new Set([
    'merchantUid', 'merchantEmail', 'storeId', 'productId', 'variantId',
    'targetOfferId', 'version', 'price', 'currency', 'availability',
    'warrantyMonths', 'deliveryAvailable', 'notes',
    'status', 'adminNotes', 'reviewedBy', 'reviewedAt',
    'approvedOfferId', 'createdAt', 'updatedAt'
  ]);
  return Object.keys(data).every((k) => allowed.has(k));
}

function hasRequiredOfferSubmissionKeysMock(data: Record<string, unknown>): boolean {
  const required = [
    'merchantUid', 'merchantEmail', 'storeId', 'productId',
    'price', 'currency', 'availability',
    'status', 'createdAt', 'updatedAt'
  ];
  return required.every((k) => k in data);
}

function evaluateOfferSubmissionCreate(
  req: MockRequest,
  data: Record<string, unknown>,
  store: MockSubmissionStoreDoc | null | undefined,
  productExists: boolean
): boolean {
  if (!isAuthenticated(req)) return false;
  if (!isEmailVerified(req)) return false;
  if (!hasRequiredOfferSubmissionKeysMock(data)) return false;
  if (!hasOnlyValidOfferSubmissionKeysMock(data)) return false;

  if (data.merchantUid !== req.auth?.uid) return false;
  if (data.merchantEmail !== req.auth?.token?.email) return false;
  if (data.status !== 'pending') return false;

  if ('adminNotes' in data && data.adminNotes !== null) return false;
  if ('reviewedBy' in data && data.reviewedBy !== null) return false;
  if ('reviewedAt' in data && data.reviewedAt !== null) return false;
  if ('approvedOfferId' in data && data.approvedOfferId !== null) return false;

  if (typeof data.price !== 'number' || data.price <= 0) return false;
  if (typeof data.currency !== 'string' || !['UZS', 'USD'].includes(data.currency)) return false;
  if (
    typeof data.availability !== 'string' ||
    !['in_stock', 'out_of_stock', 'pre_order', 'on_demand'].includes(data.availability)
  ) {
    return false;
  }
  if (
    'warrantyMonths' in data &&
    data.warrantyMonths !== null &&
    (typeof data.warrantyMonths !== 'number' || data.warrantyMonths < 0 || data.warrantyMonths > 120)
  ) {
    return false;
  }

  if (data.createdAt !== req.time || data.updatedAt !== req.time) return false;
  if (!isCurrentActiveStoreOwnerMock(req, store)) return false;
  if (!productExists) return false;

  return true;
}

function evaluateOfferSubmissionGet(
  req: MockRequest,
  data: Record<string, unknown>,
  store: MockSubmissionStoreDoc | null | undefined
): boolean {
  if (isAdmin(req)) return true;
  if (!isAuthenticated(req)) return false;
  if (data.merchantUid === req.auth?.uid) return true;
  if (store && store.ownerId === req.auth?.uid) return true;
  return false;
}

function evaluateOfferSubmissionList(
  req: MockRequest,
  queryFilter: { merchantUid?: string; storeId?: string; limit?: number },
  data: Record<string, unknown>
): boolean {
  if (isAdmin(req)) return true;
  if (!isAuthenticated(req)) return false;
  if (typeof queryFilter.limit !== 'number' || queryFilter.limit <= 0 || queryFilter.limit > 25) {
    return false;
  }
  return queryFilter.merchantUid === req.auth?.uid && data.merchantUid === req.auth?.uid;
}

function evaluateOfferSubmissionUpdate(req: MockRequest): boolean {
  return isAdmin(req);
}

function evaluateOfferSubmissionDelete(): boolean {
  return false;
}

function hasOnlyValidStoreKeys(data: Record<string, unknown>): boolean {
  const allowed = new Set([
    'name',
    'city',
    'district',
    'address',
    'coordinates',
    'category',
    'phone',
    'openingHours',
    'description',
    'website',
    'placeType',
    'ownerId',
    'isVerified',
    'status',
    'sourceType',
    'isDemo',
    'ownershipStatus',
    'createdAt',
    'updatedAt',
  ]);
  return Object.keys(data).every((k) => allowed.has(k));
}

function hasRequiredStoreKeys(data: Record<string, unknown>): boolean {
  const required = [
    'name',
    'city',
    'address',
    'coordinates',
    'category',
    'phone',
    'openingHours',
    'placeType',
    'ownerId',
    'isVerified',
    'status',
    'sourceType',
    'isDemo',
    'createdAt',
    'updatedAt',
  ];
  return required.every((k) => k in data);
}

function isValidMerchantStoreCreate(req: MockRequest, data: Record<string, unknown>): boolean {
  if (!hasRequiredStoreKeys(data)) return false;
  if (!hasOnlyValidStoreKeys(data)) return false;

  if (data.ownerId !== req.auth?.uid) return false;
  if (data.isVerified !== false) return false;
  if (data.status !== 'pending') return false;
  if (data.isDemo !== false) return false;
  if (data.sourceType !== 'birqidir') return false;
  if ('ownershipStatus' in data && data.ownershipStatus !== 'claimed') return false;

  if (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 100) return false;
  if (typeof data.city !== 'string' || data.city.length < 2 || data.city.length > 100) return false;
  if (
    'district' in data &&
    data.district !== null &&
    (typeof data.district !== 'string' || data.district.length > 100)
  ) {
    return false;
  }
  if (typeof data.address !== 'string' || data.address.length < 5 || data.address.length > 200) return false;
  if (typeof data.category !== 'string' || data.category.length < 2 || data.category.length > 100) return false;
  if (typeof data.phone !== 'string' || data.phone.length < 7 || data.phone.length > 25) return false;
  if (typeof data.openingHours !== 'string' || data.openingHours.length < 3 || data.openingHours.length > 100) return false;
  if (
    'description' in data &&
    data.description !== null &&
    (typeof data.description !== 'string' || data.description.length > 1000)
  ) {
    return false;
  }
  if (
    'website' in data &&
    data.website !== null &&
    data.website !== '' &&
    (typeof data.website !== 'string' ||
      data.website.length > 200 ||
      !/^https?:\/\/.+/i.test(data.website))
  ) {
    return false;
  }
  if (
    typeof data.placeType !== 'string' ||
    !['store', 'service', 'pharmacy', 'workshop', 'market'].includes(data.placeType)
  ) {
    return false;
  }

  if (typeof data.coordinates !== 'object' || data.coordinates === null) return false;
  const coords = data.coordinates as { lat?: unknown; lng?: unknown };
  if (typeof coords.lat !== 'number' || coords.lat < -90 || coords.lat > 90) return false;
  if (typeof coords.lng !== 'number' || coords.lng < -180 || coords.lng > 180) return false;

  if (data.createdAt !== req.time || data.updatedAt !== req.time) return false;

  return true;
}

function evaluateStoreCreate(req: MockRequest, data: Record<string, unknown>): boolean {
  if (isAdmin(req)) return true;
  return isAuthenticated(req) && isEmailVerified(req) && isValidMerchantStoreCreate(req, data);
}

function evaluateStoreUpdate(req: MockRequest): boolean {
  return isAdmin(req);
}

function evaluateStoreDelete(req: MockRequest): boolean {
  return isAdmin(req);
}

function evaluateProductRead(): boolean {
  return true; // allow read: if true;
}

function evaluateProductWrite(req: MockRequest): boolean {
  return isAdmin(req);
}

function evaluateOfferRead(): boolean {
  return true; // allow read: if true;
}

function evaluateOfferWrite(req: MockRequest): boolean {
  return isAdmin(req);
}

describe('Firestore Security Rules Logic Audit', () => {
  const now = '2026-10-19T18:00:00.000Z';
  const validUid = 'user_abc_123';
  const validEmail = 'aziz@example.uz';

  const verifiedAuth: MockAuth = {
    uid: validUid,
    token: {
      email: validEmail,
      email_verified: true,
    },
  };

  const unverifiedAuth: MockAuth = {
    uid: validUid,
    token: {
      email: validEmail,
      email_verified: false,
    },
  };

  const validProfileData = {
    uid: validUid,
    email: validEmail,
    displayName: 'Azizbek Karimov',
    photoURL: 'https://example.com/avatar.jpg',
    phoneNumber: '+998901234567',
    createdAt: now,
    updatedAt: now,
  };

  describe('User Profile Creation (allow create)', () => {
    it('allows valid profile creation when user is verified and data is legitimate', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const allowed = evaluateCreateUser(req, validUid, validProfileData);
      expect(allowed).toBe(true);
    });

    it('denies creation when email in document does not match auth token email', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const fraudulentData = { ...validProfileData, email: 'attacker@evil.com' };
      const allowed = evaluateCreateUser(req, validUid, fraudulentData);
      expect(allowed).toBe(false);
    });

    it('denies creation when user email is not verified', () => {
      const req: MockRequest = { auth: unverifiedAuth, time: now };
      const allowed = evaluateCreateUser(req, validUid, validProfileData);
      expect(allowed).toBe(false);
    });

    it('denies creation when requester is unauthenticated', () => {
      const req: MockRequest = { auth: null, time: now };
      const allowed = evaluateCreateUser(req, validUid, validProfileData);
      expect(allowed).toBe(false);
    });

    it('denies creation when creating document for another user UID', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const allowed = evaluateCreateUser(req, 'other_uid', validProfileData);
      expect(allowed).toBe(false);
    });

    it('denies privilege escalation: injecting role, isAdmin, or permissions', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const hacked1 = { ...validProfileData, role: 'admin' };
      const hacked2 = { ...validProfileData, isAdmin: true };
      const hacked3 = { ...validProfileData, permissions: ['write_all'] };

      expect(evaluateCreateUser(req, validUid, hacked1)).toBe(false);
      expect(evaluateCreateUser(req, validUid, hacked2)).toBe(false);
      expect(evaluateCreateUser(req, validUid, hacked3)).toBe(false);
    });

    it('denies creation with invalid displayName (too short < 2 or too long > 60)', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const tooShort = { ...validProfileData, displayName: 'A' };
      const tooLong = { ...validProfileData, displayName: 'A'.repeat(61) };

      expect(evaluateCreateUser(req, validUid, tooShort)).toBe(false);
      expect(evaluateCreateUser(req, validUid, tooLong)).toBe(false);
    });

    it('denies creation with invalid photoURL (non-http format or too long)', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const invalidUrl = { ...validProfileData, photoURL: 'javascript:alert(1)' };
      const tooLongUrl = { ...validProfileData, photoURL: 'https://example.com/' + 'a'.repeat(500) };

      expect(evaluateCreateUser(req, validUid, invalidUrl)).toBe(false);
      expect(evaluateCreateUser(req, validUid, tooLongUrl)).toBe(false);
    });

    it('denies creation with invalid phoneNumber', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const invalidPhone = { ...validProfileData, phoneNumber: 'invalid_abc_phone' };
      const tooShortPhone = { ...validProfileData, phoneNumber: '123' };

      expect(evaluateCreateUser(req, validUid, invalidPhone)).toBe(false);
      expect(evaluateCreateUser(req, validUid, tooShortPhone)).toBe(false);
    });

    it('denies creation when timestamps do not match request.time (client forging date)', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const forgedTimestamp = { ...validProfileData, createdAt: '2020-01-01T00:00:00.000Z' };

      expect(evaluateCreateUser(req, validUid, forgedTimestamp)).toBe(false);
    });
  });

  describe('User Profile Updates (allow update)', () => {
    const existing = { ...validProfileData };
    const updateTime = '2026-10-19T18:05:00.000Z';

    it('allows verified user to update permitted fields (displayName, phoneNumber, updatedAt)', () => {
      const req: MockRequest = { auth: verifiedAuth, time: updateTime };
      const newData = {
        ...existing,
        displayName: 'Azizbek K. Yangilangan',
        phoneNumber: '+998912345678',
        updatedAt: updateTime,
      };

      const allowed = evaluateUpdateUser(req, validUid, existing, newData);
      expect(allowed).toBe(true);
    });

    it('denies update when attempting to change immutable uid, email, or createdAt', () => {
      const req: MockRequest = { auth: verifiedAuth, time: updateTime };
      const tamperedUid = { ...existing, uid: 'attacker_uid', updatedAt: updateTime };
      const tamperedEmail = { ...existing, email: 'attacker@evil.com', updatedAt: updateTime };
      const tamperedCreated = { ...existing, createdAt: updateTime, updatedAt: updateTime };

      expect(evaluateUpdateUser(req, validUid, existing, tamperedUid)).toBe(false);
      expect(evaluateUpdateUser(req, validUid, existing, tamperedEmail)).toBe(false);
      expect(evaluateUpdateUser(req, validUid, existing, tamperedCreated)).toBe(false);
    });

    it('denies update when email is not verified', () => {
      const req: MockRequest = { auth: unverifiedAuth, time: updateTime };
      const newData = { ...existing, displayName: 'Yangi Ism', updatedAt: updateTime };

      expect(evaluateUpdateUser(req, validUid, existing, newData)).toBe(false);
    });

    it('denies update by unauthorized third-party user', () => {
      const thirdPartyAuth: MockAuth = {
        uid: 'hacker_999',
        token: { email: 'hacker@evil.com', email_verified: true },
      };
      const req: MockRequest = { auth: thirdPartyAuth, time: updateTime };
      const newData = { ...existing, displayName: 'Hacked', updatedAt: updateTime };

      expect(evaluateUpdateUser(req, validUid, existing, newData)).toBe(false);
    });
  });

  describe('Read, List, Delete, and Collection Scoping', () => {
    it('allows owner to read their own profile (allow get)', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      expect(evaluateReadUser(req, validUid)).toBe(true);
    });

    it('denies non-owner from reading another user profile', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      expect(evaluateReadUser(req, 'victim_uid')).toBe(false);
    });

    it('denies bulk user listing (allow list: if false)', () => {
      expect(evaluateListUsers()).toBe(false);
    });

    it('denies document deletion (allow delete: if false)', () => {
      expect(evaluateDeleteUser()).toBe(false);
    });

    it('denies access to arbitrary unlisted collections (deny-by-default)', () => {
      expect(evaluateArbitraryCollection()).toBe(false);
    });
  });

  describe('Catalog Collections: Stores, Products, and Offers', () => {
    const adminAuth: MockAuth = {
      uid: 'admin_master',
      token: {
        email: 'admin@birqidir.uz',
        email_verified: true,
        admin: true,
      },
    };

    it('allows public read access to active stores, products, and offers', () => {
      expect(evaluateStoreGet({ auth: null, time: now }, { status: 'active' })).toBe(true);
      expect(evaluateProductRead()).toBe(true);
      expect(evaluateOfferRead()).toBe(true);
    });

    it('denies unauthenticated and regular verified users from updating or deleting stores and catalog items', () => {
      const unauthReq: MockRequest = { auth: null, time: now };
      const regularUserReq: MockRequest = { auth: verifiedAuth, time: now };

      // Ordinary email-verified user is NOT an admin!
      expect(evaluateStoreUpdate(unauthReq)).toBe(false);
      expect(evaluateStoreUpdate(regularUserReq)).toBe(false);
      expect(evaluateStoreDelete(unauthReq)).toBe(false);
      expect(evaluateStoreDelete(regularUserReq)).toBe(false);

      expect(evaluateProductWrite(unauthReq)).toBe(false);
      expect(evaluateProductWrite(regularUserReq)).toBe(false);

      expect(evaluateOfferWrite(unauthReq)).toBe(false);
      expect(evaluateOfferWrite(regularUserReq)).toBe(false);
    });

    it('allows catalog modification access ONLY to verified administrators with custom claim (token.admin == true)', () => {
      const adminReq: MockRequest = { auth: adminAuth, time: now };

      expect(evaluateStoreUpdate(adminReq)).toBe(true);
      expect(evaluateStoreDelete(adminReq)).toBe(true);
      expect(evaluateProductWrite(adminReq)).toBe(true);
      expect(evaluateOfferWrite(adminReq)).toBe(true);
    });
  });

  describe('/stores/{storeId} Store Application & Creation Security Rules', () => {
    const validStorePayload = {
      name: 'Nukus Media Do‘koni',
      city: 'Nukus',
      district: 'Nukus shahri',
      address: 'Dosnazarov ko‘chasi 15',
      coordinates: { lat: 42.4619, lng: 59.6166 },
      category: 'Elektronika va maishiy texnika',
      phone: '+998901234567',
      openingHours: '09:00 - 20:00',
      description: 'Zamonaviy smartfonlar do‘koni',
      website: 'https://nukusmedia.uz',
      placeType: 'store',
      ownerId: validUid, // matches verifiedAuth.uid
      ownershipStatus: 'claimed',
      isVerified: false,
      status: 'pending',
      sourceType: 'birqidir',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    it('allows verified merchant to submit a new store application with status: "pending" and isVerified: false', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      expect(evaluateStoreCreate(req, validStorePayload)).toBe(true);
    });

    it('denies store creation when user email is not verified', () => {
      const req: MockRequest = { auth: unverifiedAuth, time: now };
      expect(evaluateStoreCreate(req, validStorePayload)).toBe(false);
    });

    it('denies store creation when user is unauthenticated', () => {
      const req: MockRequest = { auth: null, time: now };
      expect(evaluateStoreCreate(req, validStorePayload)).toBe(false);
    });

    it('denies merchant from creating a store on behalf of another UID (fake ownerId)', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const forgedOwnerPayload = { ...validStorePayload, ownerId: 'victim_or_other_uid' };
      expect(evaluateStoreCreate(req, forgedOwnerPayload)).toBe(false);
    });

    it('denies privilege escalation: merchant setting isVerified: true', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const selfVerifiedPayload = { ...validStorePayload, isVerified: true };
      expect(evaluateStoreCreate(req, selfVerifiedPayload)).toBe(false);
    });

    it('denies privilege escalation: merchant setting status: "active"', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const activeStatusPayload = { ...validStorePayload, status: 'active' };
      expect(evaluateStoreCreate(req, activeStatusPayload)).toBe(false);
    });

    it('denies privilege escalation: merchant setting ownershipStatus: "verified"', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const verifiedOwnershipPayload = { ...validStorePayload, ownershipStatus: 'verified' };
      expect(evaluateStoreCreate(req, verifiedOwnershipPayload)).toBe(false);
    });

    it('denies privilege escalation: merchant attempting demo or openstreetmap store creation', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const demoPayload = { ...validStorePayload, isDemo: true };
      expect(evaluateStoreCreate(req, demoPayload)).toBe(false);

      const osmPayload = { ...validStorePayload, sourceType: 'openstreetmap' };
      expect(evaluateStoreCreate(req, osmPayload)).toBe(false);
    });

    it('denies store creation when client injects unauthorized fields (isAdmin, role, adminNotes)', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      expect(evaluateStoreCreate(req, { ...validStorePayload, isAdmin: true })).toBe(false);
      expect(evaluateStoreCreate(req, { ...validStorePayload, role: 'admin' })).toBe(false);
      expect(evaluateStoreCreate(req, { ...validStorePayload, adminNotes: 'auto approved' })).toBe(false);
      expect(evaluateStoreCreate(req, { ...validStorePayload, reviewedBy: 'admin_uid' })).toBe(false);
    });

    it('denies store creation with invalid coordinates or missing required fields', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      const badLat = { ...validStorePayload, coordinates: { lat: 95.0, lng: 59.6166 } };
      expect(evaluateStoreCreate(req, badLat)).toBe(false);

      const missingAddress = { ...validStorePayload };
      delete (missingAddress as { address?: string }).address;
      expect(evaluateStoreCreate(req, missingAddress)).toBe(false);
    });

    it('denies regular merchant from updating or deleting store document after creation (only admin can approve)', () => {
      const req: MockRequest = { auth: verifiedAuth, time: now };
      expect(evaluateStoreUpdate(req)).toBe(false);
      expect(evaluateStoreDelete(req)).toBe(false);
    });

    it('allows administrator with token.admin == true to create, update, or delete any store', () => {
      const adminReq: MockRequest = {
        auth: { uid: 'admin_1', token: { email: 'admin@oneshop.uz', email_verified: true, admin: true } },
        time: now,
      };
      expect(evaluateStoreCreate(adminReq, validStorePayload)).toBe(true);
      expect(evaluateStoreUpdate(adminReq)).toBe(true);
      expect(evaluateStoreDelete(adminReq)).toBe(true);
    });

    describe('Store Read & Query Privacy (Phase 5.2 Store Application Privacy Hardening)', () => {
      const pendingStoreDoc = {
        name: 'Maxfiy Pending Do‘kon',
        city: 'Nukus',
        address: 'Xususiy uy 12',
        phone: '+998901112233',
        ownerId: 'merchant_owner_1',
        status: 'pending',
        isVerified: false,
        sourceType: 'birqidir',
        isDemo: false,
      };

      const activeStoreDoc = {
        name: 'Faol Ommaviy Do‘kon',
        city: 'Nukus',
        address: 'Dosnazarov 10',
        phone: '+998612221111',
        ownerId: 'merchant_owner_1',
        status: 'active',
        isVerified: true,
        sourceType: 'birqidir',
        isDemo: false,
      };

      const merchantOwnerReq: MockRequest = {
        auth: { uid: 'merchant_owner_1', token: { email: 'owner@oneshop.uz', email_verified: true } },
        time: now,
      };

      const otherMerchantReq: MockRequest = {
        auth: { uid: 'other_merchant_2', token: { email: 'other@oneshop.uz', email_verified: true } },
        time: now,
      };

      const publicCustomerReq: MockRequest = {
        auth: { uid: 'customer_99', token: { email: 'customer@oneshop.uz', email_verified: true } },
        time: now,
      };

      const unauthenticatedReq: MockRequest = {
        auth: null,
        time: now,
      };

      const adminReq: MockRequest = {
        auth: { uid: 'admin_master', token: { email: 'admin@oneshop.uz', email_verified: true, admin: true } },
        time: now,
      };

      // =======================================================================
      // STORE PRIVACY FINAL HARDENING: 11 MANDATORY TEST CASES
      // =======================================================================

      // 1. Public + active store -> ALLOW
      it('Case 1: Public + active store -> ALLOW (GET and LIST)', () => {
        expect(evaluateStoreGet(publicCustomerReq, activeStoreDoc)).toBe(true);
        expect(evaluateStoreGet(unauthenticatedReq, activeStoreDoc)).toBe(true);
        expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, activeStoreDoc)).toBe(true);
        expect(evaluateStoreList(unauthenticatedReq, { status: 'active', limit: 25 }, activeStoreDoc)).toBe(true);
      });

      // 2. Public + pending store (hatto isVerified:true bo‘lsa ham) -> DENY
      it('Case 2: Public + pending store (hatto isVerified:true bo‘lsa ham) -> DENY (GET and LIST)', () => {
        const pendingVerifiedStore = {
          name: 'Tasdiqlangan Lekin Kutilayotgan Do‘kon',
          status: 'pending',
          isVerified: true,
          ownerId: 'merchant_owner_1',
        };
        expect(evaluateStoreGet(publicCustomerReq, pendingVerifiedStore)).toBe(false);
        expect(evaluateStoreGet(unauthenticatedReq, pendingVerifiedStore)).toBe(false);
        expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, pendingVerifiedStore)).toBe(false);
        expect(evaluateStoreList(unauthenticatedReq, { status: 'active', limit: 25 }, pendingVerifiedStore)).toBe(false);
      });

      // 3. Public + archived store -> DENY
      it('Case 3: Public + archived store -> DENY (GET and LIST)', () => {
        const archivedStore = {
          name: 'Arxivlangan Do‘kon',
          status: 'archived',
          isVerified: true,
          ownerId: 'merchant_owner_1',
        };
        expect(evaluateStoreGet(publicCustomerReq, archivedStore)).toBe(false);
        expect(evaluateStoreGet(unauthenticatedReq, archivedStore)).toBe(false);
        expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, archivedStore)).toBe(false);
        expect(evaluateStoreList(unauthenticatedReq, { status: 'active', limit: 25 }, archivedStore)).toBe(false);
      });

      // 4. Public + inactive store -> DENY
      it('Case 4: Public + inactive store -> DENY (GET and LIST)', () => {
        const inactiveStore = {
          name: 'Nofaol Do‘kon',
          status: 'inactive',
          isVerified: true,
        };
        expect(evaluateStoreGet(publicCustomerReq, inactiveStore)).toBe(false);
        expect(evaluateStoreGet(unauthenticatedReq, inactiveStore)).toBe(false);
        expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, inactiveStore)).toBe(false);
        expect(evaluateStoreList(unauthenticatedReq, { status: 'active', limit: 25 }, inactiveStore)).toBe(false);
      });

      // 5. Public + suspended store -> DENY
      it('Case 5: Public + suspended store -> DENY (GET and LIST)', () => {
        const suspendedStore = {
          name: 'Bloklangan Do‘kon',
          status: 'suspended',
          isVerified: true,
        };
        expect(evaluateStoreGet(publicCustomerReq, suspendedStore)).toBe(false);
        expect(evaluateStoreGet(unauthenticatedReq, suspendedStore)).toBe(false);
        expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, suspendedStore)).toBe(false);
        expect(evaluateStoreList(unauthenticatedReq, { status: 'active', limit: 25 }, suspendedStore)).toBe(false);
      });

      // 6. Public + active demo store -> ALLOW
      it('Case 6: Public + active demo store -> ALLOW (GET and LIST)', () => {
        const activeDemoStore = {
          name: 'Faol Demo Do‘kon',
          status: 'active',
          isDemo: true,
          sourceType: 'birqidir',
        };
        expect(evaluateStoreGet(publicCustomerReq, activeDemoStore)).toBe(true);
        expect(evaluateStoreGet(unauthenticatedReq, activeDemoStore)).toBe(true);
        expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, activeDemoStore)).toBe(true);
      });

      // 7. Public + demo store lekin pending/archived -> DENY
      it('Case 7: Public + demo store lekin pending/archived -> DENY (GET and LIST)', () => {
        const pendingDemoStore = {
          name: 'Pending Demo Do‘kon',
          status: 'pending',
          isDemo: true,
        };
        const archivedDemoStore = {
          name: 'Archived Demo Do‘kon',
          status: 'archived',
          isDemo: true,
        };
        expect(evaluateStoreGet(publicCustomerReq, pendingDemoStore)).toBe(false);
        expect(evaluateStoreGet(unauthenticatedReq, pendingDemoStore)).toBe(false);
        expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, pendingDemoStore)).toBe(false);

        expect(evaluateStoreGet(publicCustomerReq, archivedDemoStore)).toBe(false);
        expect(evaluateStoreGet(unauthenticatedReq, archivedDemoStore)).toBe(false);
        expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, archivedDemoStore)).toBe(false);
      });

      // 8. Public + active OSM place -> ALLOW
      it('Case 8: Public + active OSM place -> ALLOW (GET and LIST)', () => {
        const activeOsmPlace = {
          name: 'Nukus Markaziy Dorixona (OSM)',
          status: 'active',
          sourceType: 'openstreetmap',
        };
        expect(evaluateStoreGet(publicCustomerReq, activeOsmPlace)).toBe(true);
        expect(evaluateStoreGet(unauthenticatedReq, activeOsmPlace)).toBe(true);
        expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, activeOsmPlace)).toBe(true);
      });

      // 9. Public + verified legacy store (no status, no ownerId) -> ALLOW
      it('Case 9: Public + verified legacy store (no status, no ownerId) -> ALLOW (GET)', () => {
        const legacyVerified = { name: 'Legacy Verified Store', isVerified: true };
        const legacyDemo = { name: 'Legacy Demo Store', isDemo: true };
        const legacyOsm = { name: 'Legacy OSM Place', sourceType: 'openstreetmap' };
        const legacyUnclaimed = { name: 'Legacy Unclaimed Market' };
        const legacyUnverifiedApplicant = { name: 'Legacy Unverified App', ownerId: 'merchant_1', isVerified: false };

        expect(evaluateStoreGet(publicCustomerReq, legacyVerified)).toBe(true);
        expect(evaluateStoreGet(publicCustomerReq, legacyDemo)).toBe(true);
        expect(evaluateStoreGet(publicCustomerReq, legacyOsm)).toBe(true);
        expect(evaluateStoreGet(publicCustomerReq, legacyUnclaimed)).toBe(true);

        // An unverified store application with an ownerId but no verification is NOT public
        expect(evaluateStoreGet(publicCustomerReq, legacyUnverifiedApplicant)).toBe(false);
      });

      // 10. Merchant o‘zining pending/archived arizasi -> ALLOW (begona merchant -> DENY)
      it('Case 10: Merchant o‘zining pending/archived arizasi -> ALLOW, begona merchant -> DENY (GET and LIST)', () => {
        const merchantArchivedDoc = {
          name: 'Merchant Arxiv Hujjati',
          status: 'archived',
          ownerId: 'merchant_owner_1',
        };

        // Merchant o‘zining pending hujjati:
        expect(evaluateStoreGet(merchantOwnerReq, pendingStoreDoc)).toBe(true);
        expect(
          evaluateStoreList(
            merchantOwnerReq,
            { ownerId: 'merchant_owner_1', limit: 25 },
            pendingStoreDoc
          )
        ).toBe(true);

        // Merchant o‘zining archived hujjati:
        expect(evaluateStoreGet(merchantOwnerReq, merchantArchivedDoc)).toBe(true);
        expect(
          evaluateStoreList(
            merchantOwnerReq,
            { ownerId: 'merchant_owner_1', limit: 25 },
            merchantArchivedDoc
          )
        ).toBe(true);

        // Begona merchant uchun taqiqlanadi (DENY):
        expect(evaluateStoreGet(otherMerchantReq, pendingStoreDoc)).toBe(false);
        expect(evaluateStoreGet(otherMerchantReq, merchantArchivedDoc)).toBe(false);
        expect(
          evaluateStoreList(
            otherMerchantReq,
            { ownerId: 'other_merchant_2', limit: 25 },
            pendingStoreDoc
          )
        ).toBe(false);
      });

      // 11. Admin har qanday statusdagi do‘kon -> ALLOW
      it('Case 11: Admin har qanday statusdagi do‘kon -> ALLOW (GET and LIST)', () => {
        const archivedStore = { name: 'Arxiv', status: 'archived' };
        const suspendedStore = { name: 'To‘xtatilgan', status: 'suspended' };
        const inactiveStore = { name: 'Nofaol', status: 'inactive' };

        // GET: Admin reads all
        expect(evaluateStoreGet(adminReq, pendingStoreDoc)).toBe(true);
        expect(evaluateStoreGet(adminReq, activeStoreDoc)).toBe(true);
        expect(evaluateStoreGet(adminReq, archivedStore)).toBe(true);
        expect(evaluateStoreGet(adminReq, suspendedStore)).toBe(true);
        expect(evaluateStoreGet(adminReq, inactiveStore)).toBe(true);

        // LIST: Admin lists without restriction
        expect(evaluateStoreList(adminReq, {}, pendingStoreDoc)).toBe(true);
        expect(evaluateStoreList(adminReq, {}, archivedStore)).toBe(true);
        expect(evaluateStoreList(adminReq, {}, suspendedStore)).toBe(true);
        expect(evaluateStoreList(adminReq, {}, inactiveStore)).toBe(true);
      });

      // =======================================================================
      // STORE PRIVACY FINAL ACCEPTANCE PATCH AUDIT TESTS (SECTION 4)
      // =======================================================================
      describe('Section 4: Store Privacy Final Acceptance Patch Tests', () => {
        // 4.1. Public list limit 25 — PASS
        it('4.1. Public list limit 25 — PASS', () => {
          expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, activeStoreDoc)).toBe(true);
          expect(evaluateStoreList(unauthenticatedReq, { status: 'active', limit: 25 }, activeStoreDoc)).toBe(true);
          expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 10 }, activeStoreDoc)).toBe(true);
        });

        // 4.2. Public list limit 26 — DENY
        it('4.2. Public list limit 26 — DENY', () => {
          expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 26 }, activeStoreDoc)).toBe(false);
          expect(evaluateStoreList(unauthenticatedReq, { status: 'active', limit: 26 }, activeStoreDoc)).toBe(false);
          expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 50 }, activeStoreDoc)).toBe(false);
        });

        // 4.3. Public list limitsiz — DENY
        it('4.3. Public list limitsiz — DENY', () => {
          expect(evaluateStoreList(publicCustomerReq, { status: 'active' }, activeStoreDoc)).toBe(false);
          expect(evaluateStoreList(unauthenticatedReq, { status: 'active' }, activeStoreDoc)).toBe(false);
          expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 0 }, activeStoreDoc)).toBe(false);
          expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: -5 }, activeStoreDoc)).toBe(false);
        });

        // 4.4. Merchant query boshqa ownerId bilan — DENY
        it('4.4. Merchant query boshqa ownerId bilan — DENY', () => {
          // Merchant tries to query another owner's stores -> DENIED
          expect(
            evaluateStoreList(
              merchantOwnerReq,
              { ownerId: 'other_merchant_2', limit: 25 },
              pendingStoreDoc
            )
          ).toBe(false);

          // Merchant query with matching ownerId but limit 26 -> DENIED
          expect(
            evaluateStoreList(
              merchantOwnerReq,
              { ownerId: 'merchant_owner_1', limit: 26 },
              pendingStoreDoc
            )
          ).toBe(false);

          // Merchant query with matching ownerId but without limit -> DENIED
          expect(
            evaluateStoreList(
              merchantOwnerReq,
              { ownerId: 'merchant_owner_1' },
              pendingStoreDoc
            )
          ).toBe(false);

          // Merchant query with matching ownerId and valid limit 25 -> ALLOWED
          expect(
            evaluateStoreList(
              merchantOwnerReq,
              { ownerId: 'merchant_owner_1', limit: 25 },
              pendingStoreDoc
            )
          ).toBe(true);
        });

        // 4.5. Legacy store list compatibility
        it('4.5. Legacy store list compatibility: Firestore index query vs direct getDoc vs in-memory fallback', () => {
          const legacyStoreDocWithoutStatus = {
            name: 'Nukus Tarixiy Do‘kon',
            city: 'Nukus',
            isVerified: true,
          };

          // Firestore index equality query where('status', '==', 'active') excludes documents without 'status' field
          expect(
            evaluateStoreList(
              publicCustomerReq,
              { status: 'active', limit: 25 },
              legacyStoreDocWithoutStatus
            )
          ).toBe(false);

          // Direct getDoc continues to be allowed for legacy stores (GET compatibility)
          expect(evaluateStoreGet(publicCustomerReq, legacyStoreDocWithoutStatus)).toBe(true);
        });

        // 4.6. Active store public read va private UID himoyasi
        it('4.6. Active store public read va private UID himoyasi', () => {
          // Active store is readable publicly (GET and LIST with limit <= 25)
          expect(evaluateStoreGet(publicCustomerReq, activeStoreDoc)).toBe(true);
          expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, activeStoreDoc)).toBe(true);

          // But having the merchant's ownerId does NOT allow public customer to read private user profile
          const merchantUid = activeStoreDoc.ownerId; // 'merchant_owner_1'
          expect(evaluateUserGet(publicCustomerReq, merchantUid)).toBe(false);
          expect(evaluateUserGet(unauthenticatedReq, merchantUid)).toBe(false);

          // And /users listing is completely blocked for all clients
          expect(evaluateUserList()).toBe(false);

          // Document owner can read their own profile
          expect(evaluateUserGet(merchantOwnerReq, merchantUid)).toBe(true);
        });

        // 4.7. Pending/archived/inactive/suspended store privacy
        it('4.7. Pending/archived/inactive/suspended store privacy', () => {
          const nonActiveStatuses = ['pending', 'archived', 'inactive', 'suspended'];
          for (const st of nonActiveStatuses) {
            const doc = {
              name: `Store in ${st}`,
              status: st,
              isVerified: true, // even if marked verified
              isDemo: true, // even if marked demo
              sourceType: 'openstreetmap', // even if marked OSM
              ownerId: 'merchant_owner_1',
            };

            // Public GET is strictly denied
            expect(evaluateStoreGet(publicCustomerReq, doc)).toBe(false);
            expect(evaluateStoreGet(unauthenticatedReq, doc)).toBe(false);

            // Public LIST is strictly denied
            expect(evaluateStoreList(publicCustomerReq, { status: 'active', limit: 25 }, doc)).toBe(false);
            expect(evaluateStoreList(unauthenticatedReq, { status: 'active', limit: 25 }, doc)).toBe(false);
          }
        });
      });
    });
  });

  describe('/orders/{orderId} Collection Security Rules Evaluation (Phase 5.2 Final Gate)', () => {
    interface MockStoreData {
      ownerId?: string | null;
      name?: string;
      status?: string;
      isVerified?: boolean;
      isDemo?: boolean;
      sourceType?: string;
      ownershipStatus?: string;
    }

    interface MockProductData {
      name?: string;
      isDemo?: boolean;
      isArchived?: boolean;
    }

    interface MockOfferData {
      storeId?: string;
      productId?: string;
      variantId?: string | null;
      price?: number;
      currency?: string;
      status?: string;
      isSuperseded?: boolean;
      isDemo?: boolean;
    }

    const customerAuth: MockAuth = {
      uid: 'customer_1',
      token: { email: 'customer@oneshop.uz', email_verified: true },
    };

    const merchantAuth: MockAuth = {
      uid: 'merchant_1',
      token: { email: 'merchant@oneshop.uz', email_verified: true },
    };

    const newMerchantAuth: MockAuth = {
      uid: 'new_merchant_2',
      token: { email: 'new_merchant@oneshop.uz', email_verified: true },
    };

    const strangerAuth: MockAuth = {
      uid: 'stranger_99',
      token: { email: 'stranger@oneshop.uz', email_verified: true },
    };

    const adminAuth: MockAuth = {
      uid: 'admin_1',
      token: { email: 'admin@oneshop.uz', email_verified: true, admin: true },
    };

    const now = '2026-11-06T12:00:00.000Z';

    const defaultStore: MockStoreData = {
      ownerId: 'merchant_1',
      name: 'Media Store Nukus',
      status: 'active',
      isVerified: true,
      isDemo: false,
      sourceType: 'birqidir',
      ownershipStatus: 'claimed',
    };

    const defaultProduct: MockProductData = {
      name: 'Samsung Galaxy A55',
      isDemo: false,
      isArchived: false,
    };

    const defaultOffer: MockOfferData = {
      storeId: 'store_1',
      productId: 'prod_1',
      price: 3200000,
      currency: 'UZS',
      status: 'active',
      isSuperseded: false,
      isDemo: false,
    };

    const baseOrder: Record<string, unknown> = {
      customerUid: 'customer_1',
      customerEmail: 'customer@oneshop.uz',
      customerName: 'Alisher Berdiyev',
      customerPhone: '+998901234567',
      storeId: 'store_1',
      storeOwnerId: 'merchant_1',
      storeName: 'Media Store Nukus',
      productId: 'prod_1',
      productName: 'Samsung Galaxy A55',
      offerId: 'offer_1',
      price: 3200000,
      currency: 'UZS',
      quantity: 2,
      totalAmount: 6400000,
      customerNote: 'Eshik tagiga yetkazib bering',
      merchantNotes: null,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      statusChangedAt: now,
      statusChangedBy: 'customer_1',
    };

    function hasOnlyValidOrderKeys(data: Record<string, unknown>): boolean {
      const allowed = new Set([
        'customerUid',
        'customerEmail',
        'customerName',
        'customerPhone',
        'storeId',
        'storeOwnerId',
        'storeName',
        'productId',
        'productName',
        'offerId',
        'variantId',
        'price',
        'currency',
        'quantity',
        'totalAmount',
        'customerNote',
        'merchantNotes',
        'status',
        'statusChangedAt',
        'statusChangedBy',
        'createdAt',
        'updatedAt',
      ]);
      return Object.keys(data).every((k) => allowed.has(k));
    }

    function hasRequiredOrderKeys(data: Record<string, unknown>): boolean {
      const required = [
        'customerUid',
        'customerEmail',
        'customerName',
        'customerPhone',
        'storeId',
        'storeOwnerId',
        'storeName',
        'productId',
        'productName',
        'offerId',
        'price',
        'currency',
        'quantity',
        'totalAmount',
        'status',
        'statusChangedAt',
        'statusChangedBy',
        'createdAt',
        'updatedAt',
      ];
      return required.every((k) => k in data);
    }

    function isCurrentStoreOwner(store: MockStoreData | null, reqAuth: MockAuth | null): boolean {
      if (!reqAuth || !store || !store.ownerId) return false;
      return store.ownerId === reqAuth.uid;
    }

    function isValidStoreData(store: MockStoreData, storeOwnerId: string, storeName: string): boolean {
      return (
        store.ownerId === storeOwnerId &&
        store.name === storeName &&
        (store.status === 'active' || (!('status' in store) && store.isVerified === true)) &&
        (!('isDemo' in store) || store.isDemo !== true) &&
        (!('sourceType' in store) || store.sourceType !== 'openstreetmap') &&
        (!('ownershipStatus' in store) || store.ownershipStatus !== 'unclaimed')
      );
    }

    function isValidProductData(product: MockProductData, productName: string): boolean {
      return (
        product.name === productName &&
        (!('isDemo' in product) || product.isDemo !== true) &&
        (!('isArchived' in product) || product.isArchived !== true)
      );
    }

    function isValidOfferData(
      offer: MockOfferData,
      storeId: string,
      productId: string,
      price: number,
      currency: string,
      orderData: Record<string, unknown>
    ): boolean {
      if (offer.storeId !== storeId) return false;
      if (offer.productId !== productId) return false;
      if (offer.price !== price) return false;
      if (offer.currency !== currency) return false;
      if (offer.isSuperseded === true) return false;
      if (offer.status && ['archived', 'superseded', 'pending'].includes(offer.status)) return false;
      if (offer.isDemo === true) return false;

      const offerVariant = offer.variantId;
      const orderVariant = orderData.variantId;
      const offerHasVariant = offerVariant !== undefined && offerVariant !== null && offerVariant !== '';
      const orderHasVariant = orderVariant !== undefined && orderVariant !== null && orderVariant !== '';

      if (!offerHasVariant) {
        if (orderHasVariant) return false;
      } else {
        if (orderVariant !== offerVariant) return false;
      }

      return true;
    }

    function evaluateOrderGet(
      req: MockRequest,
      resourceData: Record<string, unknown>,
      currentStore: MockStoreData | null
    ): boolean {
      if (!req.auth) return false;
      if (req.auth.uid === resourceData.customerUid) return true;
      if (isCurrentStoreOwner(currentStore, req.auth)) return true;
      if (req.auth.token.admin === true) return true;
      return false;
    }

    function evaluateOrderList(
      req: MockRequest,
      queryFilter: { customerUid?: string; storeOwnerId?: string; limit: number },
      resourceData: Record<string, unknown>,
      currentStore: MockStoreData | null
    ): boolean {
      if (!req.auth) return false;
      if (queryFilter.limit > 25) return false;
      if (req.auth.token.admin === true) return true;

      if (queryFilter.customerUid && queryFilter.customerUid === req.auth.uid) {
        return resourceData.customerUid === req.auth.uid;
      }

      if (queryFilter.storeOwnerId && queryFilter.storeOwnerId === req.auth.uid) {
        return (
          resourceData.storeOwnerId === req.auth.uid &&
          isCurrentStoreOwner(currentStore, req.auth)
        );
      }

      return false;
    }

    function evaluateOrderCreate(
      req: MockRequest,
      createData: Record<string, unknown>,
      store: MockStoreData | null,
      product: MockProductData | null,
      offer: MockOfferData | null
    ): boolean {
      if (!req.auth) return false;
      if (req.auth.token.email_verified !== true) return false;
      if (!hasRequiredOrderKeys(createData)) return false;
      if (!hasOnlyValidOrderKeys(createData)) return false;

      if (createData.customerUid !== req.auth.uid) return false;
      if (createData.customerEmail !== req.auth.token.email) return false;
      if (createData.status !== 'pending') return false;
      if (createData.statusChangedBy !== req.auth.uid) return false;

      if (
        typeof createData.quantity !== 'number' ||
        !Number.isInteger(createData.quantity) ||
        createData.quantity < 1 ||
        createData.quantity > 99
      ) {
        return false;
      }

      if (typeof createData.price !== 'number' || createData.price <= 0) return false;
      if (!['UZS', 'USD'].includes(createData.currency as string)) return false;

      if (
        typeof createData.totalAmount !== 'number' ||
        createData.totalAmount !== (createData.price as number) * (createData.quantity as number)
      ) {
        return false;
      }

      if (
        typeof createData.customerName !== 'string' ||
        createData.customerName.length < 2 ||
        createData.customerName.length > 100
      ) {
        return false;
      }

      if (
        typeof createData.customerPhone !== 'string' ||
        createData.customerPhone.length < 7 ||
        createData.customerPhone.length > 20
      ) {
        return false;
      }

      if (
        'customerNote' in createData &&
        createData.customerNote !== null &&
        (typeof createData.customerNote !== 'string' || createData.customerNote.length > 500)
      ) {
        return false;
      }

      if ('merchantNotes' in createData && createData.merchantNotes !== null) {
        return false;
      }

      if (
        createData.createdAt !== req.time ||
        createData.updatedAt !== req.time ||
        createData.statusChangedAt !== req.time
      ) {
        return false;
      }

      // Cross-document reference validation
      if (!store || !isValidStoreData(store, createData.storeOwnerId as string, createData.storeName as string)) {
        return false;
      }

      if (!product || !isValidProductData(product, createData.productName as string)) {
        return false;
      }

      if (
        !offer ||
        !isValidOfferData(
          offer,
          createData.storeId as string,
          createData.productId as string,
          createData.price as number,
          createData.currency as string,
          createData
        )
      ) {
        return false;
      }

      return true;
    }

    function evaluateOrderUpdate(
      req: MockRequest,
      existing: Record<string, unknown>,
      updated: Record<string, unknown>,
      affectedKeys: string[],
      currentStore: MockStoreData | null
    ): boolean {
      if (!req.auth) return false;

      // Snapshot immutability
      if (updated.customerUid !== existing.customerUid) return false;
      if (updated.customerEmail !== existing.customerEmail) return false;
      if (updated.customerName !== existing.customerName) return false;
      if (updated.customerPhone !== existing.customerPhone) return false;
      if (updated.storeId !== existing.storeId) return false;
      if (updated.storeOwnerId !== existing.storeOwnerId) return false;
      if (updated.storeName !== existing.storeName) return false;
      if (updated.productId !== existing.productId) return false;
      if (updated.productName !== existing.productName) return false;
      if (updated.offerId !== existing.offerId) return false;

      const existingVariant = existing.variantId;
      const updatedVariant = updated.variantId;
      if (!existingVariant) {
        if (updatedVariant !== undefined && updatedVariant !== null) return false;
      } else {
        if (updatedVariant !== existingVariant) return false;
      }

      if (updated.price !== existing.price) return false;
      if (updated.currency !== existing.currency) return false;
      if (updated.quantity !== existing.quantity) return false;
      if (updated.totalAmount !== existing.totalAmount) return false;
      if (updated.createdAt !== existing.createdAt) return false;
      if (updated.updatedAt !== req.time || updated.statusChangedAt !== req.time) return false;
      if (updated.statusChangedBy !== req.auth.uid) return false;

      // Case A: Customer cancelling their own pending order
      if (
        req.auth.uid === existing.customerUid &&
        existing.status === 'pending' &&
        updated.status === 'cancelled'
      ) {
        const allowed = new Set(['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt']);
        return affectedKeys.every((k) => allowed.has(k));
      }

      // Case B: Current Store Owner accepting/rejecting pending order
      if (
        isCurrentStoreOwner(currentStore, req.auth) &&
        existing.status === 'pending' &&
        ['accepted', 'rejected'].includes(updated.status as string)
      ) {
        const allowed = new Set(['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt', 'merchantNotes']);
        if (!affectedKeys.every((k) => allowed.has(k))) return false;
        if (
          'merchantNotes' in updated &&
          updated.merchantNotes !== null &&
          (typeof updated.merchantNotes !== 'string' || (updated.merchantNotes as string).length > 500)
        ) {
          return false;
        }
        return true;
      }

      // Case C: Current Store Owner completing accepted order
      if (
        isCurrentStoreOwner(currentStore, req.auth) &&
        existing.status === 'accepted' &&
        updated.status === 'completed'
      ) {
        const allowed = new Set(['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt', 'merchantNotes']);
        if (!affectedKeys.every((k) => allowed.has(k))) return false;
        if (
          'merchantNotes' in updated &&
          updated.merchantNotes !== null &&
          (typeof updated.merchantNotes !== 'string' || (updated.merchantNotes as string).length > 500)
        ) {
          return false;
        }
        return true;
      }

      // Case D: Admin override
      if (req.auth.token.admin === true) return true;

      return false;
    }

    function evaluateOrderDelete(): boolean {
      return false; // Denied by rule: allow delete: if false;
    }

    describe('Baseline & Permission Checks', () => {
      it('allows read only to order customer, current store owner, and admin', () => {
        expect(evaluateOrderGet({ auth: customerAuth, time: now }, baseOrder, defaultStore)).toBe(true);
        expect(evaluateOrderGet({ auth: merchantAuth, time: now }, baseOrder, defaultStore)).toBe(true);
        expect(evaluateOrderGet({ auth: adminAuth, time: now }, baseOrder, defaultStore)).toBe(true);
        expect(evaluateOrderGet({ auth: strangerAuth, time: now }, baseOrder, defaultStore)).toBe(false);
        expect(evaluateOrderGet({ auth: null, time: now }, baseOrder, defaultStore)).toBe(false);
      });

      it('rejects order creation when customer is unverified', () => {
        const unverifiedReq: MockRequest = {
          auth: { uid: 'customer_1', token: { email: 'customer@oneshop.uz', email_verified: false } },
          time: now,
        };
        expect(
          evaluateOrderCreate(unverifiedReq, baseOrder, defaultStore, defaultProduct, defaultOffer)
        ).toBe(false);
      });

      it('allows valid order creation when all reference and snapshot checks match', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        expect(
          evaluateOrderCreate(validReq, baseOrder, defaultStore, defaultProduct, defaultOffer)
        ).toBe(true);
      });
    });

    describe('Attack Cases: References and Snapshot Tampering', () => {
      it('rejects order creation with fake or non-existent offerId', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, defaultProduct, null)).toBe(false);
      });

      it('rejects order creation when offer references a different storeId or productId', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        const crossStoreOffer: MockOfferData = { ...defaultOffer, storeId: 'store_other_99' };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, defaultProduct, crossStoreOffer)).toBe(false);

        const crossProductOffer: MockOfferData = { ...defaultOffer, productId: 'prod_other_99' };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, defaultProduct, crossProductOffer)).toBe(false);
      });

      it('rejects order creation when variantId does not match offer variantId', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        // Offer has variant 'blue-256gb', but order did not pass variant
        const variantOffer: MockOfferData = { ...defaultOffer, variantId: 'blue-256gb' };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, defaultProduct, variantOffer)).toBe(false);

        // Offer has no variant, but order injects variant
        const orderWithVariant = { ...baseOrder, variantId: 'blue-256gb' };
        expect(evaluateOrderCreate(validReq, orderWithVariant, defaultStore, defaultProduct, defaultOffer)).toBe(false);

        // Matching variants allow creation
        expect(evaluateOrderCreate(validReq, orderWithVariant, defaultStore, defaultProduct, variantOffer)).toBe(true);
      });

      it('rejects order creation if customer tries to inject a fake storeOwnerId', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        const tamperedOwner = { ...baseOrder, storeOwnerId: 'attacker_uid_99' };
        expect(evaluateOrderCreate(validReq, tamperedOwner, defaultStore, defaultProduct, defaultOffer)).toBe(false);
      });

      it('rejects order creation if customer tries to forge price or currency', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        // Customer tries to buy for 100 UZS instead of real 3,200,000 UZS
        expect(
          evaluateOrderCreate(validReq, { ...baseOrder, price: 100, totalAmount: 200 }, defaultStore, defaultProduct, defaultOffer)
        ).toBe(false);

        // Customer tries to switch currency to USD
        expect(
          evaluateOrderCreate(validReq, { ...baseOrder, currency: 'USD' }, defaultStore, defaultProduct, defaultOffer)
        ).toBe(false);
      });

      it('rejects order creation if customer tries to forge productName or storeName snapshot', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        const fakeProduct = { ...baseOrder, productName: 'Forged iPhone 15 Pro Max' };
        expect(evaluateOrderCreate(validReq, fakeProduct, defaultStore, defaultProduct, defaultOffer)).toBe(false);

        const fakeStore = { ...baseOrder, storeName: 'Forged Official Apple Store' };
        expect(evaluateOrderCreate(validReq, fakeStore, defaultStore, defaultProduct, defaultOffer)).toBe(false);
      });

      it('rejects order creation with zero or negative price', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        const zeroPriceOrder = { ...baseOrder, price: 0, totalAmount: 0 };
        expect(evaluateOrderCreate(validReq, zeroPriceOrder, defaultStore, defaultProduct, { ...defaultOffer, price: 0 })).toBe(false);

        const negativePriceOrder = { ...baseOrder, price: -500, totalAmount: -1000 };
        expect(evaluateOrderCreate(validReq, negativePriceOrder, defaultStore, defaultProduct, { ...defaultOffer, price: -500 })).toBe(false);
      });

      it('rejects order creation when totalAmount does not equal price * quantity', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        const forgedTotal = { ...baseOrder, totalAmount: 1000 }; // price 3,200,000 * 2 = 6,400,000 != 1000
        expect(evaluateOrderCreate(validReq, forgedTotal, defaultStore, defaultProduct, defaultOffer)).toBe(false);
      });
    });

    describe('Attack Cases: Store and Product Ineligibility', () => {
      it('rejects order creation for demo stores or OpenStreetMap points', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        const demoStore: MockStoreData = { ...defaultStore, isDemo: true };
        expect(evaluateOrderCreate(validReq, baseOrder, demoStore, defaultProduct, defaultOffer)).toBe(false);

        const osmStore: MockStoreData = { ...defaultStore, sourceType: 'openstreetmap' };
        expect(evaluateOrderCreate(validReq, baseOrder, osmStore, defaultProduct, defaultOffer)).toBe(false);
      });

      it('rejects order creation for unclaimed stores without a verified merchant', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        const unclaimedStore: MockStoreData = { ...defaultStore, ownershipStatus: 'unclaimed', ownerId: null };
        expect(evaluateOrderCreate(validReq, baseOrder, unclaimedStore, defaultProduct, defaultOffer)).toBe(false);
      });

      it('rejects order creation for archived, suspended, inactive, or pending stores', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        const archivedStore: MockStoreData = { ...defaultStore, status: 'archived' };
        expect(evaluateOrderCreate(validReq, baseOrder, archivedStore, defaultProduct, defaultOffer)).toBe(false);

        const suspendedStore: MockStoreData = { ...defaultStore, status: 'suspended' };
        expect(evaluateOrderCreate(validReq, baseOrder, suspendedStore, defaultProduct, defaultOffer)).toBe(false);

        const inactiveStore: MockStoreData = { ...defaultStore, status: 'inactive' };
        expect(evaluateOrderCreate(validReq, baseOrder, inactiveStore, defaultProduct, defaultOffer)).toBe(false);

        const pendingStore: MockStoreData = { ...defaultStore, status: 'pending' };
        expect(evaluateOrderCreate(validReq, baseOrder, pendingStore, defaultProduct, defaultOffer)).toBe(false);
      });

      it('rejects order creation for superseded, archived, pending, or demo offers', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        const supersededOffer1: MockOfferData = { ...defaultOffer, isSuperseded: true };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, defaultProduct, supersededOffer1)).toBe(false);

        const supersededOffer2: MockOfferData = { ...defaultOffer, status: 'superseded' };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, defaultProduct, supersededOffer2)).toBe(false);

        const archivedOffer: MockOfferData = { ...defaultOffer, status: 'archived' };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, defaultProduct, archivedOffer)).toBe(false);

        const pendingOffer: MockOfferData = { ...defaultOffer, status: 'pending' };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, defaultProduct, pendingOffer)).toBe(false);

        const demoOffer: MockOfferData = { ...defaultOffer, isDemo: true };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, defaultProduct, demoOffer)).toBe(false);
      });

      it('rejects order creation for archived, demo, or non-existent products', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        const archivedProduct: MockProductData = { ...defaultProduct, isArchived: true };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, archivedProduct, defaultOffer)).toBe(false);

        const demoProduct: MockProductData = { ...defaultProduct, isDemo: true };
        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, demoProduct, defaultOffer)).toBe(false);

        expect(evaluateOrderCreate(validReq, baseOrder, defaultStore, null, defaultOffer)).toBe(false);
      });
    });

    describe('Attack Cases: Privilege Escalation & Field Allowlist', () => {
      it('rejects order creation when customer injects unauthorized or administrative fields', () => {
        const validReq: MockRequest = { auth: customerAuth, time: now };
        expect(evaluateOrderCreate(validReq, { ...baseOrder, isAdmin: true }, defaultStore, defaultProduct, defaultOffer)).toBe(false);
        expect(evaluateOrderCreate(validReq, { ...baseOrder, adminNotes: 'verified by phone' }, defaultStore, defaultProduct, defaultOffer)).toBe(false);
        expect(evaluateOrderCreate(validReq, { ...baseOrder, role: 'superadmin' }, defaultStore, defaultProduct, defaultOffer)).toBe(false);
        expect(evaluateOrderCreate(validReq, { ...baseOrder, reviewedBy: 'admin_1' }, defaultStore, defaultProduct, defaultOffer)).toBe(false);
        expect(evaluateOrderCreate(validReq, { ...baseOrder, discount: 50 }, defaultStore, defaultProduct, defaultOffer)).toBe(false);
        expect(evaluateOrderCreate(validReq, { ...baseOrder, merchantNotes: 'Pre-approved discount' }, defaultStore, defaultProduct, defaultOffer)).toBe(false);
      });
    });

    describe('Customer Data Privacy & Ownership Transfer Security', () => {
      it('revokes access of former merchant to customer PII and orders when store ownership is transferred', () => {
        // Store ownership changes in the canonical store document from merchant_1 to new_merchant_2
        const transferredStore: MockStoreData = {
          ...defaultStore,
          ownerId: 'new_merchant_2',
        };

        // Former merchant tries to read historical order containing customer phone/name
        expect(evaluateOrderGet({ auth: merchantAuth, time: now }, baseOrder, transferredStore)).toBe(false);

        // Former merchant tries to query/list historical orders
        expect(
          evaluateOrderList(
            { auth: merchantAuth, time: now },
            { storeOwnerId: 'merchant_1', limit: 20 },
            baseOrder,
            transferredStore
          )
        ).toBe(false);

        // Former merchant tries to accept order after transfer
        const acceptPayload = {
          ...baseOrder,
          status: 'accepted',
          updatedAt: now,
          statusChangedAt: now,
          statusChangedBy: 'merchant_1',
        };
        expect(
          evaluateOrderUpdate(
            { auth: merchantAuth, time: now },
            baseOrder,
            acceptPayload,
            ['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt'],
            transferredStore
          )
        ).toBe(false);

        // New authorized owner CAN read customer order
        expect(evaluateOrderGet({ auth: newMerchantAuth, time: now }, baseOrder, transferredStore)).toBe(true);

        // New authorized owner CAN accept pending order
        const newOwnerAcceptPayload = {
          ...baseOrder,
          status: 'accepted',
          updatedAt: now,
          statusChangedAt: now,
          statusChangedBy: 'new_merchant_2',
        };
        expect(
          evaluateOrderUpdate(
            { auth: newMerchantAuth, time: now },
            baseOrder,
            newOwnerAcceptPayload,
            ['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt'],
            transferredStore
          )
        ).toBe(true);
      });
    });

    describe('State Machine & Status Transition Security', () => {
      it('allows customer to cancel their own pending order, but disallows modifying snapshot fields', () => {
        const cancelReq: MockRequest = { auth: customerAuth, time: '2026-11-06T12:05:00.000Z' };
        const updatedOrder = {
          ...baseOrder,
          status: 'cancelled',
          updatedAt: '2026-11-06T12:05:00.000Z',
          statusChangedAt: '2026-11-06T12:05:00.000Z',
          statusChangedBy: 'customer_1',
        };

        expect(
          evaluateOrderUpdate(cancelReq, baseOrder, updatedOrder, [
            'status',
            'statusChangedAt',
            'statusChangedBy',
            'updatedAt',
          ], defaultStore)
        ).toBe(true);

        // Attempting to alter price during cancellation is strictly blocked
        expect(
          evaluateOrderUpdate(cancelReq, baseOrder, { ...updatedOrder, price: 500 }, [
            'status',
            'statusChangedAt',
            'statusChangedBy',
            'updatedAt',
            'price',
          ], defaultStore)
        ).toBe(false);

        // Attempting to alter phone during cancellation is strictly blocked
        expect(
          evaluateOrderUpdate(cancelReq, baseOrder, { ...updatedOrder, customerPhone: '+998999999999' }, [
            'status',
            'statusChangedAt',
            'statusChangedBy',
            'updatedAt',
            'customerPhone',
          ], defaultStore)
        ).toBe(false);
      });

      it('allows merchant to accept/reject pending order, but disallows customer from doing so', () => {
        const acceptReq: MockRequest = { auth: merchantAuth, time: '2026-11-06T12:10:00.000Z' };
        const customerAcceptReq: MockRequest = { auth: customerAuth, time: '2026-11-06T12:10:00.000Z' };

        const acceptedOrder = {
          ...baseOrder,
          status: 'accepted',
          updatedAt: '2026-11-06T12:10:00.000Z',
          statusChangedAt: '2026-11-06T12:10:00.000Z',
          statusChangedBy: 'merchant_1',
        };

        expect(
          evaluateOrderUpdate(acceptReq, baseOrder, acceptedOrder, [
            'status',
            'statusChangedAt',
            'statusChangedBy',
            'updatedAt',
          ], defaultStore)
        ).toBe(true);

        // Customer cannot accept!
        expect(
          evaluateOrderUpdate(customerAcceptReq, baseOrder, { ...acceptedOrder, statusChangedBy: 'customer_1' }, [
            'status',
            'statusChangedAt',
            'statusChangedBy',
            'updatedAt',
          ], defaultStore)
        ).toBe(false);
      });

      it('disallows invalid or unauthorized status transitions across actors', () => {
        const updateTime = '2026-11-06T12:15:00.000Z';
        const acceptedOrder = {
          ...baseOrder,
          status: 'accepted',
        };

        // 1. Customer cannot complete order
        const customerCompleteReq: MockRequest = { auth: customerAuth, time: updateTime };
        expect(
          evaluateOrderUpdate(
            customerCompleteReq,
            acceptedOrder,
            { ...acceptedOrder, status: 'completed', updatedAt: updateTime, statusChangedAt: updateTime, statusChangedBy: 'customer_1' },
            ['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt'],
            defaultStore
          )
        ).toBe(false);

        // 2. Merchant cannot cancel customer order (only customer can cancel)
        const merchantCancelReq: MockRequest = { auth: merchantAuth, time: updateTime };
        expect(
          evaluateOrderUpdate(
            merchantCancelReq,
            baseOrder,
            { ...baseOrder, status: 'cancelled', updatedAt: updateTime, statusChangedAt: updateTime, statusChangedBy: 'merchant_1' },
            ['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt'],
            defaultStore
          )
        ).toBe(false);

        // 3. Customer cannot cancel already accepted order
        const customerCancelAcceptedReq: MockRequest = { auth: customerAuth, time: updateTime };
        expect(
          evaluateOrderUpdate(
            customerCancelAcceptedReq,
            acceptedOrder,
            { ...acceptedOrder, status: 'cancelled', updatedAt: updateTime, statusChangedAt: updateTime, statusChangedBy: 'customer_1' },
            ['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt'],
            defaultStore
          )
        ).toBe(false);

        // 4. Completed order cannot be re-opened to accepted or pending
        const completedOrder = { ...baseOrder, status: 'completed' };
        const merchantReopenReq: MockRequest = { auth: merchantAuth, time: updateTime };
        expect(
          evaluateOrderUpdate(
            merchantReopenReq,
            completedOrder,
            { ...completedOrder, status: 'accepted', updatedAt: updateTime, statusChangedAt: updateTime, statusChangedBy: 'merchant_1' },
            ['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt'],
            defaultStore
          )
        ).toBe(false);

        // 5. Illegal status value (e.g. 'refunded', 'in_transit') is rejected
        expect(
          evaluateOrderUpdate(
            merchantReopenReq,
            baseOrder,
            { ...baseOrder, status: 'refunded', updatedAt: updateTime, statusChangedAt: updateTime, statusChangedBy: 'merchant_1' },
            ['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt'],
            defaultStore
          )
        ).toBe(false);
      });

      it('strictly enforces merchantNotes length limit of 500 characters', () => {
        const updateTime = '2026-11-06T12:20:00.000Z';
        const rejectReq: MockRequest = { auth: merchantAuth, time: updateTime };

        const validNotesOrder = {
          ...baseOrder,
          status: 'rejected',
          merchantNotes: 'Afsuski, ushbu rangdagi model tugab qoldi.',
          updatedAt: updateTime,
          statusChangedAt: updateTime,
          statusChangedBy: 'merchant_1',
        };
        expect(
          evaluateOrderUpdate(
            rejectReq,
            baseOrder,
            validNotesOrder,
            ['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt', 'merchantNotes'],
            defaultStore
          )
        ).toBe(true);

        const excessiveNotesOrder = {
          ...validNotesOrder,
          merchantNotes: 'A'.repeat(501),
        };
        expect(
          evaluateOrderUpdate(
            rejectReq,
            baseOrder,
            excessiveNotesOrder,
            ['status', 'statusChangedAt', 'statusChangedBy', 'updatedAt', 'merchantNotes'],
            defaultStore
          )
        ).toBe(false);
      });
    });

    describe('Deletion & Query Limit Security', () => {
      it('strictly prohibits document deletion for all callers including admins (audit trail)', () => {
        expect(evaluateOrderDelete()).toBe(false);
      });

      it('enforces maximum pagination limit of 25 on list queries', () => {
        const req: MockRequest = { auth: customerAuth, time: now };
        // Limit <= 25 passes
        expect(evaluateOrderList(req, { customerUid: 'customer_1', limit: 20 }, baseOrder, defaultStore)).toBe(true);
        expect(evaluateOrderList(req, { customerUid: 'customer_1', limit: 25 }, baseOrder, defaultStore)).toBe(true);

        // Limit > 25 is rejected
        expect(evaluateOrderList(req, { customerUid: 'customer_1', limit: 26 }, baseOrder, defaultStore)).toBe(false);
        expect(evaluateOrderList(req, { customerUid: 'customer_1', limit: 100 }, baseOrder, defaultStore)).toBe(false);

        // Query without user's own UID filter is rejected
        expect(evaluateOrderList(req, { customerUid: 'stranger_uid', limit: 20 }, baseOrder, defaultStore)).toBe(false);
      });
    });
  });

  // =========================================================================
  // PHASE S.1.1: FIRESTORE RULES & SUBMISSION SECURITY REMEDIATION TESTS
  // =========================================================================
  describe('Phase S.1.1: Security Remediation (SEC-MED-01 & SEC-HIGH-01)', () => {
    const testNow = '2026-11-07T12:00:00.000Z';
    const merchantAuth: MockAuth = {
      uid: 'merchant_bob',
      token: { email: 'bob@oneshop.uz', email_verified: true },
    };
    const unverifiedAuth: MockAuth = {
      uid: 'merchant_unverified',
      token: { email: 'unverified@oneshop.uz', email_verified: false },
    };
    const foreignAuth: MockAuth = {
      uid: 'hacker_eve',
      token: { email: 'eve@oneshop.uz', email_verified: true },
    };
    const adminAuth: MockAuth = {
      uid: 'admin_super',
      token: { email: 'admin@oneshop.uz', email_verified: true, admin: true },
    };

    const activeMerchantStore: MockSubmissionStoreDoc = {
      ownerId: 'merchant_bob',
      status: 'active',
      isVerified: true,
    };

    const inactiveMerchantStore: MockSubmissionStoreDoc = {
      ownerId: 'merchant_bob',
      status: 'archived',
      isVerified: true,
    };

    const foreignStore: MockSubmissionStoreDoc = {
      ownerId: 'merchant_other',
      status: 'active',
      isVerified: true,
    };

    // -----------------------------------------------------------------------
    // SEC-MED-01: WEBSITE URL VALIDATION IN STORE CREATION
    // -----------------------------------------------------------------------
    describe('SEC-MED-01: Store Website URL Scheme Hardening', () => {
      const baseStoreCreate = {
        name: 'Nukus Savdo Markazi',
        city: 'Nukus',
        address: 'Dosnazarov ko‘chasi, 15',
        category: 'electronics',
        phone: '+998901234567',
        openingHours: '09:00 - 20:00',
        placeType: 'store',
        ownerId: 'merchant_bob',
        isVerified: false,
        status: 'pending',
        sourceType: 'birqidir',
        isDemo: false,
        coordinates: { lat: 42.4616, lng: 59.6166 },
        createdAt: testNow,
        updatedAt: testNow,
      };

      it('allows store creation with valid HTTPS website URL', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        const payload = { ...baseStoreCreate, website: 'https://nukus-shop.uz' };
        expect(isValidMerchantStoreCreate(req, payload)).toBe(true);
      });

      it('allows store creation with valid HTTP website URL', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        const payload = { ...baseStoreCreate, website: 'http://shop.karakalpak.uz' };
        expect(isValidMerchantStoreCreate(req, payload)).toBe(true);
      });

      it('strictly denies store creation with dangerous javascript: scheme', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        const payload = { ...baseStoreCreate, website: 'javascript:alert(document.cookie)' };
        expect(isValidMerchantStoreCreate(req, payload)).toBe(false);
      });

      it('strictly denies store creation with dangerous data: scheme', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        const payload = { ...baseStoreCreate, website: 'data:text/html,<script>alert(1)</script>' };
        expect(isValidMerchantStoreCreate(req, payload)).toBe(false);
      });

      it('allows store creation with null or omitted or empty website', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(isValidMerchantStoreCreate(req, { ...baseStoreCreate, website: null })).toBe(true);
        expect(isValidMerchantStoreCreate(req, { ...baseStoreCreate, website: '' })).toBe(true);
        const withoutWebsite = { ...baseStoreCreate };
        delete (withoutWebsite as { website?: string }).website;
        expect(isValidMerchantStoreCreate(req, withoutWebsite)).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // SEC-HIGH-01: PRODUCT SUBMISSIONS RULES
    // -----------------------------------------------------------------------
    describe('SEC-HIGH-01: Product Submissions Security Rules', () => {
      const validProdSub = {
        merchantUid: 'merchant_bob',
        merchantEmail: 'bob@oneshop.uz',
        storeId: 'store_bob_1',
        name: 'Samsung Galaxy S24 Ultra',
        category: 'smartphones',
        status: 'pending',
        proposedPrice: 12500000,
        createdAt: testNow,
        updatedAt: testNow,
      };

      it('allows verified merchant to create pending product submission for active owned store', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateProductSubmissionCreate(req, validProdSub, activeMerchantStore)).toBe(true);
      });

      it('denies unverified merchant from creating product submission', () => {
        const req: MockRequest = { auth: unverifiedAuth, time: testNow };
        const sub = { ...validProdSub, merchantUid: 'merchant_unverified', merchantEmail: 'unverified@oneshop.uz' };
        expect(evaluateProductSubmissionCreate(req, sub, activeMerchantStore)).toBe(false);
      });

      it('denies merchant submitting foreign merchant UID', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        const spoofedUidSub = { ...validProdSub, merchantUid: 'victim_merchant_99' };
        expect(evaluateProductSubmissionCreate(req, spoofedUidSub, activeMerchantStore)).toBe(false);
      });

      it('denies merchant submitting product submission for store they do not own', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateProductSubmissionCreate(req, validProdSub, foreignStore)).toBe(false);
      });

      it('denies product submission for inactive or archived store', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateProductSubmissionCreate(req, validProdSub, inactiveMerchantStore)).toBe(false);
      });

      it('denies merchant setting initial status other than pending (e.g. approved or rejected)', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateProductSubmissionCreate(req, { ...validProdSub, status: 'approved' }, activeMerchantStore)).toBe(false);
        expect(evaluateProductSubmissionCreate(req, { ...validProdSub, status: 'rejected' }, activeMerchantStore)).toBe(false);
      });

      it('denies merchant injecting unauthorized admin fields on product submission creation', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateProductSubmissionCreate(req, { ...validProdSub, adminNotes: 'Pre-approved' }, activeMerchantStore)).toBe(false);
        expect(evaluateProductSubmissionCreate(req, { ...validProdSub, reviewedBy: 'admin_1' }, activeMerchantStore)).toBe(false);
        expect(evaluateProductSubmissionCreate(req, { ...validProdSub, approvedProductId: 'prod_auto_1' }, activeMerchantStore)).toBe(false);
      });

      it('denies foreign merchant from reading another merchant’s product submission (GET & LIST)', () => {
        const foreignReq: MockRequest = { auth: foreignAuth, time: testNow };
        // GET
        expect(evaluateProductSubmissionGet(foreignReq, validProdSub, activeMerchantStore)).toBe(false);
        // LIST
        expect(
          evaluateProductSubmissionList(
            foreignReq,
            { merchantUid: 'merchant_bob', limit: 25 },
            validProdSub
          )
        ).toBe(false);
      });

      it('allows merchant to read their own product submissions (GET & LIST with limit <= 25)', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateProductSubmissionGet(req, validProdSub, activeMerchantStore)).toBe(true);
        expect(
          evaluateProductSubmissionList(
            req,
            { merchantUid: 'merchant_bob', limit: 25 },
            validProdSub
          )
        ).toBe(true);
      });

      it('denies list query without limit or limit > 25 for product submissions', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(
          evaluateProductSubmissionList(
            req,
            { merchantUid: 'merchant_bob', limit: 26 },
            validProdSub
          )
        ).toBe(false);
      });

      it('allows administrator to review and update product submission, strictly denies regular merchants', () => {
        const adminReq: MockRequest = { auth: adminAuth, time: testNow };
        const regularReq: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateProductSubmissionUpdate(adminReq)).toBe(true);
        expect(evaluateProductSubmissionUpdate(regularReq)).toBe(false);
      });

      it('strictly prohibits deletion of product submissions to maintain audit trail', () => {
        expect(evaluateProductSubmissionDelete()).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // SEC-HIGH-01: OFFER SUBMISSIONS RULES
    // -----------------------------------------------------------------------
    describe('SEC-HIGH-01: Offer Submissions Security Rules', () => {
      const validOfferSub = {
        merchantUid: 'merchant_bob',
        merchantEmail: 'bob@oneshop.uz',
        storeId: 'store_bob_1',
        productId: 'prod_existing_1',
        price: 11900000,
        currency: 'UZS',
        availability: 'in_stock',
        status: 'pending',
        createdAt: testNow,
        updatedAt: testNow,
      };

      it('allows verified merchant to create pending offer submission for active owned store & valid product', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateOfferSubmissionCreate(req, validOfferSub, activeMerchantStore, true)).toBe(true);
      });

      it('denies unverified merchant from creating offer submission', () => {
        const req: MockRequest = { auth: unverifiedAuth, time: testNow };
        const sub = { ...validOfferSub, merchantUid: 'merchant_unverified', merchantEmail: 'unverified@oneshop.uz' };
        expect(evaluateOfferSubmissionCreate(req, sub, activeMerchantStore, true)).toBe(false);
      });

      it('denies merchant submitting foreign merchant UID in offer submission', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        const sub = { ...validOfferSub, merchantUid: 'other_uid' };
        expect(evaluateOfferSubmissionCreate(req, sub, activeMerchantStore, true)).toBe(false);
      });

      it('denies merchant submitting offer submission for store they do not own', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateOfferSubmissionCreate(req, validOfferSub, foreignStore, true)).toBe(false);
      });

      it('denies offer submission for non-existent product in catalog', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateOfferSubmissionCreate(req, validOfferSub, activeMerchantStore, false)).toBe(false);
      });

      it('denies offer submission with zero or negative price', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateOfferSubmissionCreate(req, { ...validOfferSub, price: 0 }, activeMerchantStore, true)).toBe(false);
        expect(evaluateOfferSubmissionCreate(req, { ...validOfferSub, price: -500 }, activeMerchantStore, true)).toBe(false);
      });

      it('denies merchant injecting admin fields (approvedOfferId, adminNotes) on offer submission create', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateOfferSubmissionCreate(req, { ...validOfferSub, approvedOfferId: 'canonical_1' }, activeMerchantStore, true)).toBe(false);
        expect(evaluateOfferSubmissionCreate(req, { ...validOfferSub, adminNotes: 'Done' }, activeMerchantStore, true)).toBe(false);
      });

      it('denies foreign merchant from reading another merchant’s offer submission (GET & LIST)', () => {
        const foreignReq: MockRequest = { auth: foreignAuth, time: testNow };
        expect(evaluateOfferSubmissionGet(foreignReq, validOfferSub, activeMerchantStore)).toBe(false);
        expect(
          evaluateOfferSubmissionList(
            foreignReq,
            { merchantUid: 'merchant_bob', limit: 25 },
            validOfferSub
          )
        ).toBe(false);
      });

      it('allows merchant to read their own offer submissions (GET & LIST with limit <= 25)', () => {
        const req: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateOfferSubmissionGet(req, validOfferSub, activeMerchantStore)).toBe(true);
        expect(
          evaluateOfferSubmissionList(
            req,
            { merchantUid: 'merchant_bob', limit: 25 },
            validOfferSub
          )
        ).toBe(true);
      });

      it('allows administrator to review and update offer submission, strictly denies regular merchants', () => {
        const adminReq: MockRequest = { auth: adminAuth, time: testNow };
        const regularReq: MockRequest = { auth: merchantAuth, time: testNow };
        expect(evaluateOfferSubmissionUpdate(adminReq)).toBe(true);
        expect(evaluateOfferSubmissionUpdate(regularReq)).toBe(false);
      });

      it('strictly prohibits deletion of offer submissions to maintain audit trail', () => {
        expect(evaluateOfferSubmissionDelete()).toBe(false);
      });
    });
  });
});
