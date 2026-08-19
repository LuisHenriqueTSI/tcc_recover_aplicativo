import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

const expoExtra = Constants.expoConfig?.extra || {};
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  expoExtra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  expoExtra.SUPABASE_KEY ||
  '';

const normalizeWhatsapp = (whatsapp = '') => {
  const digits = String(whatsapp || '').replace(/\D/g, '');
  if (!digits) return '';

  let normalized = digits;

  if (normalized.startsWith('55')) {
    normalized = normalized.slice(2);
  }

  // No Brasil, muitas pessoas digitam o número com o 9 do celular.
  // Para o sistema do app, o valor salvo deve ficar no formato DDD + número sem esse dígito extra.
  if (normalized.length === 11 && normalized[2] === '9') {
    normalized = `${normalized.slice(0, 2)}${normalized.slice(3)}`;
  }

  return normalized;
};

const getSupabaseUrl = () =>
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  expoExtra.EXPO_PUBLIC_SUPABASE_URL ||
  expoExtra.SUPABASE_URL ||
  '';

const getCreateUserFunctionUrl = () => {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error('Supabase URL não encontrada. Verifique EXPO_PUBLIC_SUPABASE_URL.');
  }
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/create-user`;
};

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

export const signUp = async (email, password, name, city, state, whatsapp = '') => {
  try {
    console.log('[signUp] Enviando código de verificação por WhatsApp...');

    const payloadWhatsapp = normalizeWhatsapp(whatsapp);
    const functionUrl = getCreateUserFunctionUrl();
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'send-verification',
        email,
        password,
        name,
        city,
        state,
        whatsapp: payloadWhatsapp,
      }),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (parseError) {
      const text = await response.text();
      payload = { error: text || parseError.message };
    }

    console.log('[signUp] Função URL:', functionUrl, 'status:', response.status, 'payload:', payload);

    if (!response.ok) {
      throw new Error(payload?.error || 'Falha ao enviar código de verificação.');
    }

    return {
      pendingVerification: true,
      phone: payload?.phone || payloadWhatsapp,
      whatsappSent: payload?.whatsappSent,
      email,
      password,
      name,
      city,
      state,
      whatsapp: payloadWhatsapp,
    };
  } catch (error) {
    console.log('[signUp] Exceção:', error.message);
    throw error;
  }
};

export const confirmSignUp = async ({ email, password, name, city, state, whatsapp, verificationCode }) => {
  try {
    console.log('[confirmSignUp] Confirmando cadastro com código...');

    const payloadWhatsapp = normalizeWhatsapp(whatsapp);
    const functionUrl = getCreateUserFunctionUrl();
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'create-user',
        email,
        password,
        name,
        city,
        state,
        whatsapp: payloadWhatsapp,
        verificationCode,
      }),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (parseError) {
      const text = await response.text();
      payload = { error: text || parseError.message };
    }

    console.log('[confirmSignUp] Função URL:', functionUrl, 'status:', response.status, 'payload:', payload);

    if (!response.ok) {
      throw new Error(payload?.error || 'Falha ao confirmar o código de verificação.');
    }

    return { user: payload?.user, ok: true };
  } catch (error) {
    console.log('[confirmSignUp] Exceção:', error.message);
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
