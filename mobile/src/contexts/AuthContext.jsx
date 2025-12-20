import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as supabaseAuth from '../services/supabaseAuth';
import * as userService from '../services/user';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
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

          // Fetch user profile
          const profile = await userService.getUser(currentUser.id);
          if (profile) {
            setUserProfile(profile);
            setIsAdmin(profile.role === 'admin');
            console.log('[Auth] Perfil carregado, isAdmin:', profile.role === 'admin');
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
            const profile = await userService.getUser(session.user.id);
            if (profile) {
              setUserProfile(profile);
              setIsAdmin(profile.role === 'admin');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email, password, name, city, state) => {
    try {
      console.log('[signUp] Registrando novo usuário...');
      const result = await supabaseAuth.signUp(email, password, name, city, state);
      // NÃO atualize o estado do usuário após registro
      // Removido setUser(result.user);
      // Não busca perfil nem define isAdmin
      return result;
    } catch (error) {
      console.log('[signUp] Erro:', error.message);
      throw error;
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      console.log('[signIn] Fazendo login...');
      const result = await supabaseAuth.signIn(email, password);
      setUser(result.user);
      
      // Fetch user profile
      const profile = await userService.getUser(result.user.id);
      if (profile) {
        setUserProfile(profile);
        setIsAdmin(profile.role === 'admin');
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
    } catch (error) {
      console.log('[signOut] Erro:', error.message);
      throw error;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        const profile = await userService.getUser(user.id);
        if (profile) {
          setUserProfile(profile);
          setIsAdmin(profile.role === 'admin');
        }
      } catch (error) {
        console.log('[refreshProfile] Erro:', error.message);
      }
    }
  }, [user]);

  const value = {
    user,
    userProfile,
    loading,
    isAdmin,
    signUp,
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
