import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile, FirebaseConfigStatus } from '@/types';
import {
  registerWithEmail,
  loginWithEmail,
  logOutUser,
  subscribeToAuthState,
  updateAuthDisplayName,
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
  isConfigured: boolean;
  configStatus: FirebaseConfigStatus;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    pass: string,
    displayName?: string
  ) => Promise<{ success: boolean; error?: string; profileCreated?: boolean }>;
  logout: () => Promise<void>;
  updateDisplayName: (newName: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  retryCreateProfile: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const configStatus = useMemo(() => getFirebaseConfigStatus(), []);
  const isAuthenticated = Boolean(user);

  // Safely fetch or self-heal Firestore user profile
  const syncProfile = useCallback(async (currentUser: User) => {
    try {
      const res = await getUserProfile(currentUser.uid);
      if (res.data) {
        setProfile(res.data);
      } else {
        // Self-healing path: profile document does not exist yet in Firestore
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
        await syncProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncProfile]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    const result = await loginWithEmail(email, pass);
    if (result.error) {
      setLoading(false);
      return { success: false, error: result.error };
    }

    if (result.data) {
      setUser(result.data);
      await syncProfile(result.data);
    }
    setLoading(false);
    return { success: true };
  };

  const register = async (email: string, pass: string, displayName?: string) => {
    setLoading(true);
    const result = await registerWithEmail(email, pass, displayName);
    if (result.error) {
      setLoading(false);
      return { success: false, error: result.error };
    }

    let profileCreated = false;
    if (result.data) {
      setUser(result.data);

      // Attempt creating profile in Firestore
      const profileResult = await createUserProfile({
        uid: result.data.uid,
        email: result.data.email || email,
        displayName: displayName || null,
      });

      if (profileResult.data) {
        setProfile(profileResult.data);
        profileCreated = true;
      } else {
        console.warn(
          '[BirQidir Auth] Account created in Firebase Auth, but initial Firestore profile creation failed:',
          profileResult.error
        );
      }
    }

    setLoading(false);
    return { success: true, profileCreated };
  };

  const logout = async () => {
    setLoading(true);
    await logOutUser();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  // Synchronize display name across both Firebase Auth and Cloud Firestore
  const updateDisplayName = async (newName: string) => {
    if (!user) {
      return { success: false, error: 'Foydalanuvchi tizimga kirmagan.' };
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
    isConfigured: isFirebaseReady,
    configStatus,
    login,
    register,
    logout,
    updateDisplayName,
    refreshProfile,
    retryCreateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
