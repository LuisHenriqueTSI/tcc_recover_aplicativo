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

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      return new Response(JSON.stringify({ ok: false, reason: 'missing-twilio-env' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = `${title ? `${title}\n\n` : ''}${message}`;

    console.log('[notify-whatsapp] Enviando mensagem para Twilio:', { phone: normalizedPhone, from: TWILIO_WHATSAPP_FROM, body: text });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: `whatsapp:${normalizedPhone}`,
        From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
        Body: text,
      }).toString(),
    });

    const responseText = await response.text();
    console.log('[notify-whatsapp] Resposta do Twilio:', responseText);

    if (!response.ok) {
      return new Response(JSON.stringify({ ok: false, response: responseText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, response: responseText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
