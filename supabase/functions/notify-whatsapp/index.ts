import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? '';

serve(async (req) => {
  try {
    const body = await req.json();
    const { phone, title, message, type } = body ?? {};

    if (!phone || !message) {
      return new Response(JSON.stringify({ ok: false, reason: 'missing-params' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = `${title ? `${title}\n\n` : ''}${message}`;

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
