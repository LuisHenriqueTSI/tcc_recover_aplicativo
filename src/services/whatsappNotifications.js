import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

function normalizeWhatsAppNumber(phone) {
  if (!phone) return null;

  const cleaned = String(phone).trim();
  if (!cleaned) return null;

  const digitsOnly = cleaned.replace(/\D/g, '');
  if (!digitsOnly) return null;

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (digitsOnly.startsWith('00')) {
    return `+${digitsOnly.slice(2)}`;
  }

  if (digitsOnly.length >= 10) {
    return `+55${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}

export async function dispatchSystemNotificationToWhatsApp({ userId, title, message, type }) {
  if (!userId || !title || !message) {
    return { sent: false, reason: 'missing-data' };
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('whatsapp, phone')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.warn('[whatsapp-notifications] Falha ao buscar perfil:', profileError);
      return { sent: false, reason: 'profile-error', error: profileError };
    }

    const phone = normalizeWhatsAppNumber(profile?.whatsapp || profile?.phone);
    if (!phone) {
      console.warn('[whatsapp-notifications] Nenhum WhatsApp/telefone encontrado para o usuário:', userId);
      return { sent: false, reason: 'missing-whatsapp' };
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('[whatsapp-notifications] Configuração do Supabase ausente para chamar a edge function.');
      return { sent: false, reason: 'missing-supabase-config' };
    }

    console.log('[whatsapp-notifications] Enviando para WhatsApp:', { userId, phone, title, message, type });

    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        userId,
        phone,
        title,
        message,
        type,
      }),
    });

    const responseBody = await response.text();
    console.log('[whatsapp-notifications] Resposta da edge function:', { status: response.status, body: responseBody });

    if (!response.ok) {
      return { sent: false, reason: 'function-error', status: response.status, body: responseBody };
    }

    return { sent: true, data: responseBody };
  } catch (error) {
    console.warn('[whatsapp-notifications] Exceção ao encaminhar para WhatsApp:', error);
    return { sent: false, reason: 'exception', error };
  }
}
