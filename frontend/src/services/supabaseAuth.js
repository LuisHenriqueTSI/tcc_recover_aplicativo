import { supabase } from '../supabaseClient';

export async function signUp(email, password, name) {
  console.log('[signUp] Iniciando registro com confirmação de email...');
  
  try {
    // Configuração do signUp com confirmação de email obrigatória
    const signUpOptions = {
      email,
      password,
      options: {
        data: {
          name: name
        },
        emailRedirectTo: `${window.location.origin}/login`
      }
    };

    console.log('[signUp] Chamando supabase.auth.signUp...');
    
    // Remover timeout - deixar o Supabase processar quanto tempo precisar
    const res = await supabase.auth.signUp(signUpOptions);
    
    console.log('[signUp] Resposta do Supabase:', res);

    // Se houver erro, retornar
    if (res?.error) {
      console.error('[signUp] Erro no signup:', {
        message: res.error?.message,
        status: res.error?.status,
        name: res.error?.name,
        cause: res.error?.cause
      });
      return res;
    }

    // Criar perfil na tabela profiles
    const user = res?.data?.user;
    if (user && user.id) {
      console.log('[signUp] Criando perfil para usuário:', user.id);
      try {
        await supabase
          .from('profiles')
          .upsert({ 
            id: user.id, 
            name,
            email: user.email,
            email_confirmed: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        console.log('[signUp] Perfil criado com sucesso');
      } catch (profileError) {
        console.error('[signUp] Erro ao criar perfil:', profileError);
        // Não falhar o signup se o perfil não for criado
      }
    }

    return res;
  } catch (error) {
    console.error('[signUp] Exceção durante signup:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    return { error };
  }
}

export async function signIn(email, password) {
  // First, try to sign in
  const res = await supabase.auth.signInWithPassword({ email, password });
  
  // If there's an error from auth, return it immediately
  if (res?.error) {
    return res;
  }
  
  // If sign in was successful, check if account is deleted
  if (res?.data?.user) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', res.data.user.id)
        .single();
      
      if (error) {
        console.debug('[signIn] Error fetching profile status:', error);
        // If profile doesn't exist, allow login anyway
        return res;
      }
      
      // If account is marked as deleted, sign out and return error
      if (profile?.status === 'deleted') {
        console.warn('[signIn] User account is deleted:', res.data.user.id);
        await supabase.auth.signOut();
        // Return error object instead of throwing
        return {
          data: null,
          error: new Error('Não existe essa conta')
        };
      }
    } catch (e) {
      console.debug('[signIn] Error checking account status:', e);
      // Continue on other errors - don't block login for status check issues
    }
  }
  
  return res;
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user;
}

export async function signOut() {
  return await supabase.auth.signOut();
}

// Permite reenviar o email de confirmação caso o primeiro falhe ou não chegue
export async function resendConfirmation(email) {
  try {
    console.log('[resendConfirmation] Reenviando email de confirmação para:', email);
    const res = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login`
      }
    });
    console.log('[resendConfirmation] Resultado:', res);
    return res;
  } catch (error) {
    console.error('[resendConfirmation] Exceção ao reenviar:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    return { error };
  }
}
