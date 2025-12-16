// Atualiza o email do usuário autenticado
export const updateEmail = async (newEmail) => {
  try {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      throw error;
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// Exclui o usuário autenticado
export const deleteUser = async () => {
  try {
    // Supabase só permite exclusão via função admin ou extensão, aqui placeholder
    // Pode ser implementado via edge function ou RPC
    throw new Error('Exclusão de conta não está disponível nesta versão.');
  } catch (error) {
    throw error;
  }
};
import { supabase } from '../lib/supabase';

export const getUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.log('[getUser] auth error:', error.message);
      return null;
    }
    return user;
  } catch (error) {
    console.log('[getUser] Error fetching user:', error.message);
    return null;
  }
};

export const signIn = async (email, password) => {
  try {
    console.log('[signIn] Iniciando login com email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('[signIn] Erro:', error.message);
      throw error;
    }

    console.log('[signIn] Login bem-sucedido');
    return { user: data.user, session: data.session };
  } catch (error) {
    console.log('[signIn] Exceção:', error.message);
    throw error;
  }
};

export const signUp = async (email, password, name) => {
  try {
    console.log('[signUp] Iniciando registro...');
    console.log('[signUp] Chamando supabase.auth.signUp...');

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (authError) {
      console.log('[signUp] Erro auth:', authError.message);
      throw authError;
    }

    console.log('[signUp] Resposta do Supabase:', JSON.stringify(data));
    const userId = data.user.id;

    // Create user profile
    console.log('[signUp] Criando perfil para usuário:', userId);
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: name,
        email: email,
        points: 0,
        level: 1,
      })
      .select()
      .single();

    if (profileError) {
      console.log('[signUp] Erro ao criar perfil:', profileError.message);
      throw profileError;
    }

    console.log('[signUp] Perfil criado com sucesso');
    return { user: data.user, session: data.session };
  } catch (error) {
    console.log('[signUp] Exceção:', error.message);
    throw error;
  }
};

export const signOut = async () => {
  try {
    console.log('[signOut] Fazendo logout...');
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log('[signOut] Erro:', error.message);
      throw error;
    }

    console.log('[signOut] Logout bem-sucedido');
    return { success: true };
  } catch (error) {
    console.log('[signOut] Exceção:', error.message);
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    console.log('[resetPassword] Enviando email de recuperação para:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'recover://reset-password',
    });

    if (error) {
      console.log('[resetPassword] Erro:', error.message);
      throw error;
    }

    console.log('[resetPassword] Email enviado com sucesso');
    return { success: true };
  } catch (error) {
    console.log('[resetPassword] Exceção:', error.message);
    throw error;
  }
};

export const updatePassword = async (newPassword) => {
  try {
    console.log('[updatePassword] Atualizando senha...');
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.log('[updatePassword] Erro:', error.message);
      throw error;
    }

    console.log('[updatePassword] Senha atualizada com sucesso');
    return { success: true };
  } catch (error) {
    console.log('[updatePassword] Exceção:', error.message);
    throw error;
  }
};
