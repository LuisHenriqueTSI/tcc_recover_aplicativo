import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as supabaseAuth from '../services/supabaseAuth';
import * as userService from '../services/user';
import { supabase } from '../lib/supabase';
import { useTheme } from './ThemeContext';

export const AuthContext = createContext();

const profileIsAdmin = (profile) => (
  profile?.adm === true ||
  profile?.adm === 'true' ||
  profile?.role === 'admin'
);

export const AuthProvider = ({ children }) => {
  const { setThemeMode, resetThemeToLight } = useTheme();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('[Auth] Iniciando verificação de sessão...');
        const currentUser = await supabaseAuth.getUser();
        
        if (currentUser) {
          console.log('[Auth] Usuário encontrado:', currentUser.id);
          setUser(currentUser);

          // Garante que o perfil exista após restaurar a sessão
          const userPhone = currentUser.user_metadata?.whatsapp || currentUser.user_metadata?.phone || '';
          const profile = await userService.createProfileIfMissing(currentUser.id, {
            name: currentUser.user_metadata?.name,
            email: currentUser.email,
            city: currentUser.user_metadata?.city,
            state: currentUser.user_metadata?.state,
            whatsapp: userPhone,
            phone: userPhone,
          });
          if (profile) {
            setUserProfile(profile);
            setIsAdmin(profileIsAdmin(profile));
            console.log('[Auth] Perfil carregado, isAdmin:', profileIsAdmin(profile));
          }
        } else {
          console.log('[Auth] Nenhum usuário autenticado');
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.log('[Auth] Erro ao inicializar:', error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event);
        
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (session?.user) {
            setUser(session.user);
            const sessionPhone = session.user.user_metadata?.whatsapp || session.user.user_metadata?.phone || '';
            const profile = await userService.createProfileIfMissing(session.user.id, {
              name: session.user.user_metadata?.name,
              email: session.user.email,
              city: session.user.user_metadata?.city,
              state: session.user.user_metadata?.state,
              whatsapp: sessionPhone,
              phone: sessionPhone,
            });
            if (profile) {
              setUserProfile(profile);
              setIsAdmin(profileIsAdmin(profile));
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
          if (typeof resetThemeToLight === 'function') {
            resetThemeToLight();
          } else if (typeof setThemeMode === 'function') {
            setThemeMode('light');
          }
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [resetThemeToLight, setThemeMode]);

  const signUp = useCallback(async (email, password, name, city, state, whatsapp) => {
    try {
      console.log('[signUp] Registrando novo usuário...');
      const result = await supabaseAuth.signUp(email, password, name, city, state, whatsapp);
      return result;
    } catch (error) {
      console.log('[signUp] Erro:', error.message);
      throw error;
    }
  }, []);

  const confirmSignUp = useCallback(async (payload) => {
    try {
      console.log('[confirmSignUp] Confirmando cadastro...');
      const result = await supabaseAuth.confirmSignUp(payload);
      return result;
    } catch (error) {
      console.log('[confirmSignUp] Erro:', error.message);
      throw error;
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      console.log('[signIn] Fazendo login...');
      const result = await supabaseAuth.signIn(email, password);
      setUser(result.user);
      
      // Garante que o perfil exista após autenticação válida
      const profile = await userService.createProfileIfMissing(result.user.id, {
        name: result.user.user_metadata?.name,
        email: result.user.email,
        city: result.user.user_metadata?.city,
        state: result.user.user_metadata?.state,
      });
      if (profile) {
        setUserProfile(profile);
        setIsAdmin(profileIsAdmin(profile));
      }
      
      return result;
    } catch (error) {
      console.log('[signIn] Erro:', error.message);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('[signOut] Fazendo logout...');
      await supabaseAuth.signOut();
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      if (typeof resetThemeToLight === 'function') {
        await resetThemeToLight();
      } else if (typeof setThemeMode === 'function') {
        await setThemeMode('light');
      }
    } catch (error) {
      console.log('[signOut] Erro:', error.message);
      throw error;
    }
  }, [resetThemeToLight, setThemeMode]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        const profile = await userService.getUser(user.id);
        if (profile) {
          setUserProfile(profile);
          setIsAdmin(profileIsAdmin(profile));
        }
      } catch (error) {
        console.log('[refreshProfile] Erro:', error.message);
      }
    }
  }, [user]);

  const value = {
    user,
    userProfile,
    setUserProfile,
    loading,
    isAdmin,
    signUp,
    confirmSignUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
