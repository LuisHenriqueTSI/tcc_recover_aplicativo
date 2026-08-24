import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

function normalizeWhatsAppNumber(phone) {
  if (!phone) return null;

  const cleaned = String(phone).trim();
  if (!cleaned) return null;

  const digitsOnly = cleaned.replace(/\D/g, '');
  if (!digitsOnly) return null;

  if (cleaned.startsWith('+')) {
    const withoutPlus = digitsOnly;
    if (withoutPlus.startsWith('55')) {
      return `+${withoutPlus}`;
    }
    if (withoutPlus.length === 10 || withoutPlus.length === 11) {
      return `+55${withoutPlus}`;
    }
    return `+${withoutPlus}`;
  }

  if (digitsOnly.startsWith('00')) {
    const withoutCountryCode = digitsOnly.slice(2);
    return `+${withoutCountryCode}`;
  }

  if (digitsOnly.startsWith('55')) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return `+55${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}

const EVOLUTION_API_URL = process.env.EXPO_PUBLIC_EVOLUTION_API_URL || 'https://wefind-whatsapp-api.onrender.com';
const EVOLUTION_API_KEY = process.env.EXPO_PUBLIC_EVOLUTION_API_KEY || 'wefind_secret_token_123';
const EVOLUTION_INSTANCE = process.env.EXPO_PUBLIC_EVOLUTION_INSTANCE || 'wefind';

export async function sendWhatsAppMessage({ phone, title, message, text }) {
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  if (!normalizedPhone) return { sent: false, reason: 'invalid-phone' };

  let rawDigits = normalizedPhone.replace(/\D/g, '');
  if (rawDigits.startsWith('55') && rawDigits.length === 13 && rawDigits[4] === '9') {
    rawDigits = `${rawDigits.slice(0, 4)}${rawDigits.slice(5)}`;
  }

  const content = message || text || '';
  const messageText = title ? `*${title}*\n\n${content}` : content;

  try {
    const url = `${EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${EVOLUTION_INSTANCE}`;
    console.log('[whatsapp-notifications] Enviando direto via Evolution API:', { url, phone: rawDigits });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: rawDigits,
        text: messageText,
      }),
    });

    const responseText = await response.text();
    console.log('[whatsapp-notifications] Resposta Evolution API:', { status: response.status, body: responseText });

    return { sent: response.ok, status: response.status, data: responseText };
  } catch (err) {
    console.warn('[whatsapp-notifications] Erro no envio direto Evolution API:', err);
    return { sent: false, error: err.message };
  }
}

export async function dispatchSystemNotificationToWhatsApp({ userId, title, message, type }) {
  console.log('[dispatchSystemNotificationToWhatsApp] ➡️ Iniciando envio para userId:', userId, { title, type });

  if (!userId || !title || !message) {
    console.warn('[dispatchSystemNotificationToWhatsApp] ❌ Dados insuficientes:', { userId, title, message });
    return { sent: false, reason: 'missing-data' };
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('whatsapp, phone, whatsapp_notifications_enabled')
      .eq('id', userId)
      .maybeSingle();

    console.log('[dispatchSystemNotificationToWhatsApp] 👤 Perfil obtido:', { profile, profileError });

    if (profileError) {
      console.warn('[whatsapp-notifications] Falha ao buscar perfil:', profileError);
      return { sent: false, reason: 'profile-error', error: profileError };
    }

    if (profile?.whatsapp_notifications_enabled === false) {
      console.log('[whatsapp-notifications] ⚠️ Usuário optou por não receber notificações por WhatsApp:', userId);
      return { sent: false, reason: 'user-opted-out' };
    }

    const rawPhone = profile?.whatsapp || profile?.phone;
    const phone = normalizeWhatsAppNumber(rawPhone);
    console.log('[dispatchSystemNotificationToWhatsApp] 📞 Telefone processado:', { rawPhone, normalized: phone });

    if (!phone) {
      console.warn('[whatsapp-notifications] ❌ Nenhum WhatsApp/telefone encontrado para o usuário:', userId);
      return { sent: false, reason: 'missing-whatsapp' };
    }

    // 1. Tenta envio direto para Evolution API
    console.log('[dispatchSystemNotificationToWhatsApp] 🚀 Disparando sendWhatsAppMessage direto...');
    const directResult = await sendWhatsAppMessage({ phone, title, message });
    console.log('[dispatchSystemNotificationToWhatsApp] 📡 Resultado envio direto:', directResult);

    if (directResult.sent) {
      return directResult;
    }

    // 2. Fallback via Edge Function
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      console.log('[whatsapp-notifications] Tentando via edge function:', { userId, phone, title, message, type });

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

      if (response.ok) {
        return { sent: true, data: responseBody };
      }
    }

    return directResult;
  } catch (error) {
    console.warn('[whatsapp-notifications] Exceção ao encaminhar para WhatsApp:', error);
    return { sent: false, reason: 'exception', error };
  }
}

