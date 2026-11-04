import React, { createContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile, FirebaseConfigStatus } from '@/types';
import {
  registerWithEmail,
  loginWithEmail,
  logOutUser,
  subscribeToAuthState,
  updateAuthDisplayName,
  resendVerificationEmail,
  reloadCurrentUserAndToken,
  checkUserIsAdmin,
} from '@/services/firebase/auth';
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  ensureUserProfileExists,
} from '@/services/firebase/firestore';
import { getFirebaseConfigStatus, isFirebaseReady } from '@/services/firebase/firebase';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  configStatus: FirebaseConfigStatus;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    pass: string,
    displayName?: string
  ) => Promise<{ success: boolean; error?: string; profileCreated?: boolean }>;
  logout: () => Promise<void>;
  sendVerification: () => Promise<{ success: boolean; error?: string }>;
  reloadUser: () => Promise<{ success: boolean; isVerified: boolean; error?: string }>;
  updateDisplayName: (newName: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  retryCreateProfile: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const isRegisteringRef = useRef(false);

  const configStatus = useMemo(() => getFirebaseConfigStatus(), []);
  const isAuthenticated = Boolean(user);
  const isEmailVerified = Boolean(user?.emailVerified);

  // Safely check and sync custom claim { admin: true }
  const syncAdminClaim = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }
    const adminStatus = await checkUserIsAdmin(currentUser);
    setIsAdmin(adminStatus);
  }, []);

  // Safely fetch or self-heal Firestore user profile
  const syncProfile = useCallback(async (currentUser: User) => {
    try {
      const res = await getUserProfile(currentUser.uid);
      if (res.data) {
        setProfile(res.data);
      } else if (currentUser.emailVerified) {
        // Self-healing path: create profile in Firestore once email verification is verified
        const created = await ensureUserProfileExists(
          currentUser.uid,
          currentUser.email || '',
          currentUser.displayName
        );
        if (created.data) {
          setProfile(created.data);
        }
      }
    } catch (err) {
      console.warn('[BirQidir Auth] Could not sync user profile:', err);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseReady) {
      setLoading(false);
      return;
    }

    // Subscribe to Firebase onAuthStateChanged
    const unsubscribe = subscribeToAuthState(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncAdminClaim(currentUser);
        if (!isRegisteringRef.current) {
          await syncProfile(currentUser);
        }
      } else {
        setIsAdmin(false);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncProfile, syncAdminClaim]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    const result = await loginWithEmail(email, pass);
    if (result.error) {
      setLoading(false);
      return { success: false, error: result.error };
    }

    if (result.data) {
      setUser(result.data);
      await syncAdminClaim(result.data);
      if (result.data.emailVerified) {
        await syncProfile(result.data);
      } else {
        const existing = await getUserProfile(result.data.uid);
        if (existing.data) setProfile(existing.data);
      }
    }
    setLoading(false);
    return { success: true };
  };

  const register = async (email: string, pass: string, displayName?: string) => {
    setLoading(true);
    isRegisteringRef.current = true;
    try {
      const result = await registerWithEmail(email, pass, displayName);
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }

      let profileCreated = false;
      if (result.data) {
        setUser(result.data);

        // If email is already verified (rare in standard register), attempt profile write immediately
        if (result.data.emailVerified) {
          const profileResult = await createUserProfile({
            uid: result.data.uid,
            email: result.data.email || email,
            displayName: displayName?.trim() || null,
          });

          if (profileResult.data) {
            setProfile(profileResult.data);
            profileCreated = true;
          }
        }
      }

      setLoading(false);
      return { success: true, profileCreated };
    } finally {
      isRegisteringRef.current = false;
    }
  };

  const logout = async () => {
    setLoading(true);
    await logOutUser();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setLoading(false);
  };

  const sendVerification = async () => {
    if (!user) {
      return { success: false, error: 'Foydalanuvchi tizimga kirmagan.' };
    }
    const res = await resendVerificationEmail(user);
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true };
  };

  const reloadUser = async () => {
    if (!user) {
      return { success: false, isVerified: false, error: 'Foydalanuvchi tizimga kirmagan.' };
    }
    const res = await reloadCurrentUserAndToken();
    if (res.error) {
      return { success: false, isVerified: Boolean(user.emailVerified), error: res.error };
    }

    if (res.data) {
      const refreshedUser = res.data.user;
      setUser(refreshedUser);
      await syncAdminClaim(refreshedUser);

      // Once verified, ensure the Firestore profile exists
      if (res.data.isEmailVerified) {
        await syncProfile(refreshedUser);
      }

      return { success: true, isVerified: res.data.isEmailVerified };
    }

    return { success: false, isVerified: false };
  };

  // Synchronize display name across both Firebase Auth and Cloud Firestore
  const updateDisplayName = async (newName: string) => {
    if (!user) {
      return { success: false, error: 'Foydalanuvchi tizimga kirmagan.' };
    }

    if (!user.emailVerified) {
      return {
        success: false,
        error: 'Profilni tahrirlash uchun avval elektron pochtangizni tasdiqlang.',
      };
    }

    // 1. Update Cloud Firestore
    const fsRes = await updateUserProfile(user.uid, { displayName: newName });
    if (fsRes.error) {
      return { success: false, error: fsRes.error };
    }

    // 2. Update Firebase Auth displayName
    await updateAuthDisplayName(newName);

    if (fsRes.data) {
      setProfile(fsRes.data);
    }
    return { success: true };
  };

  const retryCreateProfile = async () => {
    if (!user) {
      return { success: false, error: 'Foydalanuvchi tizimga kirmagan.' };
    }
    const res = await ensureUserProfileExists(
      user.uid,
      user.email || '',
      user.displayName
    );
    if (res.data) {
      setProfile(res.data);
      return { success: true };
    }
    return { success: false, error: res.error || 'Profilni yaratishda xatolik.' };
  };

  const refreshProfile = async () => {
    if (user) {
      await syncProfile(user);
    }
  };

  const value = {
    user,
    profile,
    loading,
    isAuthenticated,
    isEmailVerified,
    isAdmin,
    isConfigured: isFirebaseReady,
    configStatus,
    login,
    register,
    logout,
    sendVerification,
    reloadUser,
    updateDisplayName,
    refreshProfile,
    retryCreateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
