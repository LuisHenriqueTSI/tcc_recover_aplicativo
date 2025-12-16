import { createContext, useContext, useState, useEffect } from 'react';
import { getUser as getUserProfile } from '../services/user';
import { signOut } from '../services/supabaseAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Retry loop: try a few times before giving up (handles transient failures)
      const maxAttempts = 3;
      let attempt = 0;
      let lastError = null;
      for (; attempt < maxAttempts; attempt++) {
        try {
          const u = await getUserProfile();
          console.debug('[Auth] loaded user:', u, 'attempt:', attempt + 1);
          // If user is null, it means not authenticated (not an error)
          if (u === null) {
            setUser(null);
            setIsAdmin(false);
            break;
          }
          setUser(u);
          if (u && (u.email === 'admin@email.com' || u.role === 'admin')) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
          lastError = null;
          break;
        } catch (e) {
          lastError = e;
          console.debug('[Auth] load user attempt failed', attempt + 1, e);
          // backoff
          await new Promise(res => setTimeout(res, 200 * (attempt + 1)));
        }
      }
      if (lastError) {
        console.debug('[Auth] failed to load user after attempts', lastError);
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Accepts optional user to avoid race conditions when logging in
  const login = async (incomingUser = null) => {
    if (incomingUser) {
      console.debug('[Auth] setting incoming user immediately');
      setUser(incomingUser);
      if (incomingUser && (incomingUser.email === 'admin@email.com' || incomingUser.role === 'admin')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      return;
    }

    // Try to load profile from Supabase immediately
    try {
      console.debug('[Auth] fetching profile immediately');
      const u = await getUserProfile();
      console.debug('[Auth] fetched profile on login:', u);
      setUser(u);
      if (u && (u.email === 'admin@email.com' || u.role === 'admin')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (e) {
      console.debug('[Auth] immediate profile fetch failed', e);
      // the effect will attempt to load on next render
    }
  };

  const logout = async () => {
    // Clear user state immediately so UI updates
    setUser(null);
    setIsAdmin(false);
    console.debug('[Auth] logout performed, user cleared');
    // Sign out from supabase in background (don't block UI)
    try {
      await signOut();
    } catch (e) {
      console.debug('[Auth] signOut failed', e);
    }
  };

  const reloadProfile = async () => {
    try {
      const u = await getUserProfile();
      console.debug('[Auth] reloaded profile:', u);
      setUser(u);
      if (u && (u.email === 'admin@email.com' || u.role === 'admin')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (e) {
      console.debug('[Auth] reload profile failed', e);
    }
  };

  const value = { user, isAdmin, login, logout, loading, reloadProfile };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth must be used within an AuthProvider');
    // Return a default context to prevent crashes
    return { 
      user: null, 
      isAdmin: false, 
      loading: true, 
      login: async () => {}, 
      logout: async () => {}, 
      reloadProfile: async () => {} 
    };
  }
  return context;
}
