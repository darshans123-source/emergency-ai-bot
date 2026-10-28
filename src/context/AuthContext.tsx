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

export const DEFAULT_USER: User = {
  id: 'USR-OPERATOR-01',
  name: 'Marcus Vance',
  email: 'operator@emergency.gov',
  role: 'operator',
  organization: 'Central Incident Dispatch Hub',
  createdAt: '2026-01-01T00:00:00.000Z'
};

export const ROLE_PROFILES: Record<UserRole, User> = {
  operator: {
    id: 'USR-OPERATOR-01',
    name: 'Marcus Vance',
    email: 'operator@emergency.gov',
    role: 'operator',
    organization: 'Central Incident Dispatch Hub',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  admin: {
    id: 'USR-ADMIN-01',
    name: 'Director Eleanor Vance',
    email: 'admin@emergency.gov',
    role: 'admin',
    organization: 'Metro Emergency Command HQ',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  reporter: {
    id: 'USR-REPORTER-01',
    name: 'Alex Rivera',
    email: 'citizen@metro.org',
    role: 'reporter',
    organization: 'Public Safety Volunteer Corps',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
};

interface AuthContextType {
  user: User;
  token: string | null;
  isLoading: boolean;
  firebaseUser: FirebaseUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, organization?: string, role?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('er_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_USER;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('er_token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribeFirebase = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const syncedUser = await syncUserProfile(fbUser, 'operator');
          setUser(syncedUser);
          localStorage.setItem('er_user', JSON.stringify(syncedUser));
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
          const { user: remoteUser } = await api.getMe();
          setUser(remoteUser);
          localStorage.setItem('er_user', JSON.stringify(remoteUser));
        } catch {
          // Keep default user active so app never breaks
          localStorage.removeItem('er_token');
          setToken(null);
        }
      }
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
      localStorage.setItem('er_user', JSON.stringify(syncedUser));
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
    try {
      const res = await api.login({ email, password });
      localStorage.setItem('er_token', res.token);
      localStorage.setItem('er_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    } catch {
      // In standalone / splash mode, still allow role selection
      const matchedUser = Object.values(ROLE_PROFILES).find(p => p.email.toLowerCase() === email.toLowerCase()) || DEFAULT_USER;
      setUser(matchedUser);
      localStorage.setItem('er_user', JSON.stringify(matchedUser));
    }
  };

  const register = async (name: string, email: string, password: string, organization?: string, role?: string) => {
    try {
      const res = await api.register({ name, email, password, organization, role });
      localStorage.setItem('er_token', res.token);
      localStorage.setItem('er_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    } catch {
      const newUser: User = {
        id: `USR-${Date.now()}`,
        name,
        email,
        role: (role as UserRole) || 'reporter',
        organization: organization || 'Public Community',
        createdAt: new Date().toISOString()
      };
      setUser(newUser);
      localStorage.setItem('er_user', JSON.stringify(newUser));
    }
  };

  const switchRole = (role: UserRole) => {
    const newUser = ROLE_PROFILES[role] || DEFAULT_USER;
    setUser(newUser);
    localStorage.setItem('er_user', JSON.stringify(newUser));
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
      localStorage.removeItem('er_user');
      sessionStorage.removeItem('aegis_splash_dismissed');
      setUser(DEFAULT_USER);
      setToken(null);
      setFirebaseUser(null);
    }
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const quickDemoLogin = async (role: UserRole) => {
    switchRole(role);
    let email = 'operator@emergency.gov';
    let pass = 'OperatorPass2026!';
    if (role === 'admin') {
      email = 'admin@emergency.gov';
      pass = 'AdminPass2026!';
    } else if (role === 'reporter') {
      email = 'citizen@metro.org';
      pass = 'ReporterPass2026!';
    }
    try {
      await login(email, pass);
    } catch {
      // Safe fallback
    }
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
        quickDemoLogin,
        switchRole
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
