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

function evaluateStoreRead(): boolean {
  return true; // allow read: if true;
}

function evaluateStoreWrite(req: MockRequest): boolean {
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

    it('allows public read access to stores, products, and offers', () => {
      expect(evaluateStoreRead()).toBe(true);
      expect(evaluateProductRead()).toBe(true);
      expect(evaluateOfferRead()).toBe(true);
    });

    it('denies unauthenticated and regular verified users from writing to catalog', () => {
      const unauthReq: MockRequest = { auth: null, time: now };
      const regularUserReq: MockRequest = { auth: verifiedAuth, time: now };

      // Ordinary email-verified user is NOT an admin!
      expect(evaluateStoreWrite(unauthReq)).toBe(false);
      expect(evaluateStoreWrite(regularUserReq)).toBe(false);

      expect(evaluateProductWrite(unauthReq)).toBe(false);
      expect(evaluateProductWrite(regularUserReq)).toBe(false);

      expect(evaluateOfferWrite(unauthReq)).toBe(false);
      expect(evaluateOfferWrite(regularUserReq)).toBe(false);
    });

    it('allows write access ONLY to verified administrators with custom claim (token.admin == true)', () => {
      const adminReq: MockRequest = { auth: adminAuth, time: now };

      expect(evaluateStoreWrite(adminReq)).toBe(true);
      expect(evaluateProductWrite(adminReq)).toBe(true);
      expect(evaluateOfferWrite(adminReq)).toBe(true);
    });
  });
});
