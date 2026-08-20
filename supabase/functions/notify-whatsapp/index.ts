const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? 'recover';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? '';

function normalizeWhatsAppNumber(phone: string | undefined | null) {
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
    if (withoutPlus.length === 11) {
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

  if (digitsOnly.length === 11) {
    return `+55${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+55${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}

async function sendViaEvolutionApi(phone: string, text: string) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { ok: false, reason: 'missing-evolution-env' };
  }

  const rawDigits = phone.replace(/\D/g, '');
  const url = `${EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${EVOLUTION_INSTANCE}`;

  console.log('[notify-whatsapp] Enviando via Evolution API:', { url, phone: rawDigits });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: rawDigits,
      text,
    }),
  });

  const responseText = await response.text();
  console.log('[notify-whatsapp] Resposta Evolution API:', { status: response.status, body: responseText });
  return { ok: response.ok, status: response.status, body: responseText };
}

async function sendViaTwilio(phone: string, text: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return { ok: false, reason: 'missing-twilio-env' };
  }

  console.log('[notify-whatsapp] Enviando via Twilio:', { phone, from: TWILIO_WHATSAPP_FROM });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: `whatsapp:${phone}`,
      From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      Body: text,
    }).toString(),
  });

  const responseText = await response.text();
  console.log('[notify-whatsapp] Resposta Twilio:', { status: response.status, body: responseText });
  return { ok: response.ok, status: response.status, body: responseText };
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();
    const { phone, title, message, type } = body ?? {};
    const normalizedPhone = normalizeWhatsAppNumber(phone);

    console.log('[notify-whatsapp] Payload recebido:', { phone, normalizedPhone, title, message, type });

    if (!normalizedPhone || !message) {
      return new Response(JSON.stringify({ ok: false, reason: 'missing-params' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = `${title ? `*${title}*\n\n` : ''}${message}`;

    // 1. Tenta enviar via Evolution API (100% gratuito e sem restrição Sandbox)
    if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
      const evoResult = await sendViaEvolutionApi(normalizedPhone, text);
      if (evoResult.ok) {
        return new Response(JSON.stringify({ ok: true, provider: 'evolution', response: evoResult.body }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.warn('[notify-whatsapp] Evolution API falhou, tentando fallback Twilio...');
    }

    // 2. Fallback via Twilio
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      const twilioResult = await sendViaTwilio(normalizedPhone, text);
      if (twilioResult.ok) {
        return new Response(JSON.stringify({ ok: true, provider: 'twilio', response: twilioResult.body }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: false, provider: 'twilio', response: twilioResult.body }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: false, reason: 'no-whatsapp-provider-configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
