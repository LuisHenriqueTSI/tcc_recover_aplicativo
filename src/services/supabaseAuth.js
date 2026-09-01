import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

const supabaseAnonKey = SUPABASE_ANON_KEY;

const normalizeWhatsapp = (whatsapp = '') => {
  const digits = String(whatsapp || '').replace(/\D/g, '');
  if (!digits) return '';

  let normalized = digits;

  if (normalized.startsWith('55')) {
    normalized = normalized.slice(2);
  }

  // No Brasil, para instâncias do WhatsApp (Baileys), números de 11 dígitos com o 9 após o DDD
  // são registrados no WhatsApp com 10 dígitos (DDD + 8 dígitos).
  if (normalized.length === 11 && normalized[2] === '9') {
    normalized = `${normalized.slice(0, 2)}${normalized.slice(3)}`;
  }

  return normalized;
};

const getSupabaseUrl = () => SUPABASE_URL;

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
    console.log('[signUp] Gerando código de verificação por WhatsApp...');

    const payloadWhatsapp = normalizeWhatsapp(whatsapp);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const normalizedPhone = payloadWhatsapp.startsWith('55') ? `+${payloadWhatsapp}` : `+55${payloadWhatsapp}`;

    // 1. Grava no banco de dados signup_verifications como fonte única da verdade
    const { error: storeError } = await supabase.from('signup_verifications').upsert({
      email: email.trim().toLowerCase(),
      code: code,
      whatsapp: normalizedPhone,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }, { onConflict: 'email' });

    if (storeError) {
      console.warn('[signUp] Erro ao gravar verificação em signup_verifications:', storeError.message);
    }

    // 2. Dispara a mensagem com o código exato via Evolution API
    try {
      const { sendWhatsAppMessage } = require('./whatsappNotifications');
      console.log('[signUp] Disparando código via Evolution API para:', payloadWhatsapp, 'código:', code);
      await sendWhatsAppMessage({
        phone: payloadWhatsapp,
        title: 'Código de Confirmação WeFIND',
        text: `Seu código de verificação é:\n\n*${code}*\n\nInforme este código no aplicativo para concluir o seu cadastro.`,
      });
    } catch (directErr) {
      console.warn('[signUp] Erro no envio direto Evolution API:', directErr.message);
    }

    return {
      pendingVerification: true,
      phone: payloadWhatsapp,
      whatsappSent: true,
      code,
      devCode: null,
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

export const confirmSignUp = async ({ email, password, name, city, state, whatsapp, whatsapp_notifications_enabled = true, verificationCode }) => {
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
        whatsapp_notifications_enabled,
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
      redirectTo: 'wefind://reset-password',
    });
    return error;
  } catch (error) {
    return error;
  }
};

/**
 * Solicita código de 6 dígitos no WhatsApp para redefinir senha
 */
export const requestPasswordResetByWhatsApp = async (whatsapp, userId = null) => {
  try {
    console.log('[requestPasswordResetByWhatsApp] Solicitando código para:', whatsapp, 'userId:', userId);
    const payloadWhatsapp = normalizeWhatsapp(whatsapp);
    if (!payloadWhatsapp) {
      throw new Error('Informe um número de WhatsApp válido com DDD.');
    }

    const functionUrl = getCreateUserFunctionUrl();
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'send-reset-code',
        whatsapp: payloadWhatsapp,
        userId: userId || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.message || data.error || 'Não foi possível enviar o código para este WhatsApp.');
    }

    return {
      success: true,
      pendingVerification: true,
      maskedPhone: data.maskedPhone || `(XX) *****-${payloadWhatsapp.slice(-4)}`,
      whatsapp: payloadWhatsapp,
      accounts: data.accounts || [],
      hasMultipleAccounts: Boolean(data.hasMultipleAccounts),
    };
  } catch (error) {
    console.warn('[requestPasswordResetByWhatsApp] Erro:', error.message);
    throw error;
  }
};

/**
 * Valida o código de 6 dígitos do WhatsApp e obtém o reset_token temporário
 */
export const verifyPasswordResetCode = async (whatsapp, code, userId = null) => {
  try {
    console.log('[verifyPasswordResetCode] Validando código...', { userId });
    const payloadWhatsapp = normalizeWhatsapp(whatsapp);
    const trimmedCode = String(code || '').trim();

    if (!trimmedCode || trimmedCode.length !== 6) {
      throw new Error('Informe o código de 6 dígitos recebido.');
    }

    const functionUrl = getCreateUserFunctionUrl();
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'verify-reset-code',
        whatsapp: payloadWhatsapp,
        verificationCode: trimmedCode,
        userId: userId || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.message || data.error || 'Código incorreto ou expirado. Tente novamente.');
    }

    return {
      success: true,
      resetToken: data.resetToken,
      user: data.user,
    };
  } catch (error) {
    console.warn('[verifyPasswordResetCode] Erro:', error.message);
    throw error;
  }
};

/**
 * Salva a nova senha utilizando o reset_token de uso único
 */
export const resetPasswordWithToken = async (resetToken, newPassword) => {
  try {
    console.log('[resetPasswordWithToken] Salvando nova senha...');
    if (!resetToken) {
      throw new Error('Sessão expirada. Solicite o código novamente.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
    }

    const functionUrl = getCreateUserFunctionUrl();
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'reset-password',
        resetToken,
        newPassword,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.message || data.error || 'Não foi possível atualizar a senha.');
    }

    return {
      success: true,
      message: 'Senha redefinida com sucesso!',
    };
  } catch (error) {
    console.warn('[resetPasswordWithToken] Erro:', error.message);
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

/**
 * Dispara código de verificação para validar a alteração de número de WhatsApp
 */
export const sendPhoneChangeVerificationCode = async (newWhatsapp, email) => {
  try {
    console.log('[sendPhoneChangeVerificationCode] Gerando código para alteração de número:', newWhatsapp);
    const payloadWhatsapp = normalizeWhatsapp(newWhatsapp);
    if (!payloadWhatsapp || payloadWhatsapp.length < 10) {
      throw new Error('Informe um número de WhatsApp válido com DDD.');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const normalizedPhone = payloadWhatsapp.startsWith('55') ? `+${payloadWhatsapp}` : `+55${payloadWhatsapp}`;
    const verificationKey = `phone-change:${String(email || '').trim().toLowerCase()}`;

    // Grava no banco signup_verifications
    const { error: storeError } = await supabase.from('signup_verifications').upsert({
      email: verificationKey,
      code: code,
      whatsapp: normalizedPhone,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }, { onConflict: 'email' });

    if (storeError) {
      console.warn('[sendPhoneChangeVerificationCode] Erro ao gravar verificação:', storeError.message);
    }

    // Dispara via Evolution API
    const { sendWhatsAppMessage } = require('./whatsappNotifications');
    console.log('[sendPhoneChangeVerificationCode] Enviando mensagem via WhatsApp para:', payloadWhatsapp);
    await sendWhatsAppMessage({
      phone: payloadWhatsapp,
      title: 'Código de Confirmação WeFIND',
      text: `Seu código para confirmar a alteração do seu WhatsApp é:\n\n*${code}*\n\nInforme este código no aplicativo para atualizar seu número com segurança.`,
    });

    return {
      success: true,
      code,
      phone: payloadWhatsapp,
    };
  } catch (error) {
    console.warn('[sendPhoneChangeVerificationCode] Erro:', error.message);
    throw error;
  }
};

/**
 * Valida o código de verificação para alteração de número de WhatsApp
 */
export const verifyPhoneChangeCode = async (email, inputCode) => {
  try {
    console.log('[verifyPhoneChangeCode] Verificando código de alteração de número...');
    const verificationKey = `phone-change:${String(email || '').trim().toLowerCase()}`;
    const cleanCode = String(inputCode || '').trim();

    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('Digite o código de 6 dígitos enviado ao seu WhatsApp.');
    }

    const { data, error } = await supabase
      .from('signup_verifications')
      .select('*')
      .eq('email', verificationKey)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Nenhum código recente encontrado. Solicite um novo código.');
    }

    if (data.code !== cleanCode) {
      throw new Error('Código incorreto. Verifique a mensagem recebida no WhatsApp.');
    }

    if (data.expires_at && new Date() > new Date(data.expires_at)) {
      throw new Error('Código expirado. Por favor, solicite um novo código.');
    }

    // Limpa o registro após validação com sucesso
    await supabase.from('signup_verifications').delete().eq('email', verificationKey);

    return {
      valid: true,
      whatsapp: data.whatsapp,
    };
  } catch (error) {
    console.warn('[verifyPhoneChangeCode] Erro:', error.message);
    throw error;
  }
};

