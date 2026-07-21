import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

const expoExtra = Constants.expoConfig?.extra || {};
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  expoExtra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  expoExtra.SUPABASE_KEY ||
  '';

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


// Exclui o usuário autenticado via Edge Function
export const deleteUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) throw new Error('Usuário não autenticado');

  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    expoExtra.EXPO_PUBLIC_SUPABASE_URL ||
    expoExtra.SUPABASE_URL ||
    '';

  if (!supabaseUrl) {
    throw new Error('Supabase URL não encontrada para excluir usuário. Verifique a configuração.');
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/delete-user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir conta');
  return data;
};

export const getUser = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('[getUser] session error:', sessionError.message);
    }

    if (session?.user) {
      return session.user;
    }

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

    // Bloqueia login se email não estiver confirmado
    if (!data.user.confirmed_at) {
      console.log('[signIn] Email não confirmado. Bloqueando acesso.');
      throw new Error('Por favor, confirme seu email antes de fazer login.');
    }

    console.log('[signIn] Login bem-sucedido');
    return { user: data.user, session: data.session };
  } catch (error) {
    console.log('[signIn] Exceção:', error.message);
    throw error;
  }
};

export const signUp = async (email, password, name, city, state) => {
  try {
    console.log('[signUp] Iniciando registro...');

    const supabaseUrl =
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      expoExtra.EXPO_PUBLIC_SUPABASE_URL ||
      expoExtra.SUPABASE_URL ||
      '';

    if (!supabaseUrl || !supabaseAnonKey) {
      const missingKey = !supabaseAnonKey ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY' : 'EXPO_PUBLIC_SUPABASE_URL';
      throw new Error(`Supabase config não encontrada. Verifique ${missingKey} e tente novamente.`);
    }

    const functionUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/create-user`;

    let payload = null;
    let response;

    try {
      response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ email, password, name, city, state }),
      });

      try {
        payload = await response.json();
      } catch (parseError) {
        const text = await response.text();
        payload = { error: text || parseError.message };
      }

      console.log('[signUp] Função URL:', functionUrl, 'status:', response.status, 'payload:', payload);
    } catch (networkError) {
      console.log('[signUp] Erro de rede:', networkError.message);
      throw new Error('Não foi possível conectar à função de cadastro do Supabase. Verifique se a Edge Function foi implantada.');
    }

    if (!response.ok) {
      const message = payload?.error || `Falha ao criar conta. Status ${response.status}`;
      console.log('[signUp] Erro auth:', message);
      if (response.status === 404 || message.toLowerCase().includes('requested function was not found')) {
        console.log('[signUp] Função não encontrada, tentando cadastro direto pelo Supabase Auth');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, city, state },
          },
        });

        if (error) {
          console.log('[signUp] Erro ao cadastrar diretamente:', error.message);
          throw error;
        }

        return { user: data.user, session: data.session };
      }

      throw new Error(message);
    }

    console.log('[signUp] Usuário criado pela função:', payload?.user?.id);
    return { user: payload.user, session: null };
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

export const sendPasswordReset = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'recover://reset-password',
    });
    return error;
  } catch (error) {
    return error;
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
