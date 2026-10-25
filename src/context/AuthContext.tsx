import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import {
  auth,
  onAuthStateChanged,
  signInWithGooglePopup,
  signOutFirebase,
  syncUserProfile,
  FirebaseUser
} from '../services/firebase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  firebaseUser: FirebaseUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, organization?: string, role?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  quickDemoLogin: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('er_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribeFirebase = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const syncedUser = await syncUserProfile(fbUser, 'operator');
          setUser(syncedUser);
          const idToken = await fbUser.getIdToken();
          setToken(idToken);
          localStorage.setItem('er_token', idToken);
        } catch (err) {
          console.error('Error synchronizing Firebase user profile:', err);
        }
      }
    });

    async function loadSavedSession() {
      const savedToken = localStorage.getItem('er_token');
      if (savedToken && !auth.currentUser) {
        try {
          const { user } = await api.getMe();
          setUser(user);
        } catch {
          // invalid/expired token
          localStorage.removeItem('er_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }

    loadSavedSession();

    return () => {
      unsubscribeFirebase();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      const fbUser = await signInWithGooglePopup();
      const syncedUser = await syncUserProfile(fbUser, 'operator');
      setUser(syncedUser);
      const idToken = await fbUser.getIdToken();
      setToken(idToken);
      localStorage.setItem('er_token', idToken);
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('er_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, password: string, organization?: string, role?: string) => {
    const res = await api.register({ name, email, password, organization, role });
    localStorage.setItem('er_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await signOutFirebase();
      }
      if (token) {
        await api.logout();
      }
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('er_token');
      setToken(null);
      setUser(null);
      setFirebaseUser(null);
    }
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const quickDemoLogin = async (role: UserRole) => {
    let email = 'operator@emergency.gov';
    let pass = 'OperatorPass2026!';
    if (role === 'admin') {
      email = 'admin@emergency.gov';
      pass = 'AdminPass2026!';
    } else if (role === 'reporter') {
      email = 'citizen@metro.org';
      pass = 'ReporterPass2026!';
    }
    await login(email, pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        firebaseUser,
        login,
        register,
        loginWithGoogle,
        logout,
        hasRole,
        quickDemoLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
