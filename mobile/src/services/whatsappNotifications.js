import { supabase } from '../lib/supabase';

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
      return { sent: false, reason: 'missing-whatsapp' };
    }

    const { data, error } = await supabase.functions.invoke('notify-whatsapp', {
      body: {
        userId,
        phone,
        title,
        message,
        type,
      },
    });

    if (error) {
      console.warn('[whatsapp-notifications] Falha ao chamar edge function:', error);
      return { sent: false, reason: 'function-error', error };
    }

    return { sent: true, data };
  } catch (error) {
    console.warn('[whatsapp-notifications] Exceção ao encaminhar para WhatsApp:', error);
    return { sent: false, reason: 'exception', error };
  }
}
