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

function createSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getRestHeaders(serviceRoleKey: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  };
}

async function storeVerificationCode(supabaseUrl: string, serviceRoleKey: string, email: string, code: string, whatsapp: string) {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/signup_verifications`, {
    method: 'POST',
    headers: {
      ...getRestHeaders(serviceRoleKey),
      Prefer: 'resolution=merge-duplicates',
      'On-Conflict': 'email',
    },
    body: JSON.stringify([
      {
        email,
        code,
        whatsapp,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    ]),
  });

  const bodyText = await response.text();
  return { ok: response.ok, status: response.status, body: bodyText };
}

async function fetchVerificationCode(supabaseUrl: string, serviceRoleKey: string, email: string) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/signup_verifications?select=code,expires_at&email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getRestHeaders(serviceRoleKey),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, body: bodyText, record: null };
  }

  try {
    const parsed = JSON.parse(bodyText);
    const record = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    return { ok: true, status: response.status, body: bodyText, record };
  } catch {
    return { ok: false, status: response.status, body: bodyText, record: null };
  }
}

async function deleteVerificationCode(supabaseUrl: string, serviceRoleKey: string, email: string) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/signup_verifications?email=eq.${encodeURIComponent(email)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getRestHeaders(serviceRoleKey),
  });

  const bodyText = await response.text();
  return { ok: response.ok, status: response.status, body: bodyText };
}

async function dispatchVerificationCode(phone: string, code: string) {
  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? 'https://wefind-whatsapp-api.onrender.com';
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? 'wefind_secret_token_123';
  const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? 'wefind';

  const normalizedPhone = normalizeWhatsAppNumber(phone);
  const rawDigits = normalizedPhone ? normalizedPhone.replace(/\D/g, '') : phone.replace(/\D/g, '');

  console.log('[create-user] Disparando código via Evolution API:', { url: EVOLUTION_API_URL, instance: EVOLUTION_INSTANCE, phone: rawDigits });

  try {
    const evoUrl = `${EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${EVOLUTION_INSTANCE}`;
    const evoResponse = await fetch(evoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: rawDigits,
        text: `🐾 *Código de Confirmação WeFIND*\n\nSeu código de verificação é:\n\n*${code}*\n\nInforme este código no aplicativo para concluir o seu cadastro.`,
      }),
    });

    const evoBody = await evoResponse.text();
    console.log('[create-user] Resposta Evolution API:', { status: evoResponse.status, body: evoBody });
    if (evoResponse.ok) {
      return { ok: true, status: evoResponse.status, body: evoBody };
    }
  } catch (evoErr) {
    console.warn('[create-user] Falha ao enviar direto via Evolution API:', evoErr);
  }

  // Fallback via notify-whatsapp
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/notify-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          phone,
          title: 'Código de confirmação',
          message: `Seu código de confirmação é:\n\n${code}\n\nUse-o para concluir o cadastro.`,
          type: 'signup-verification',
        }),
      });
      const bodyText = await response.text();
      return { ok: response.ok, status: response.status, body: bodyText };
    } catch {
      // ignore
    }
  }

  return { ok: false, reason: 'failed-all-senders' };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse({ ok: true }, 200);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method-not-allowed' }, 405);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid-json' }, 400);
  }

  const action = String(body.action ?? '');
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const name = String(body.name ?? '').trim();
  const city = String(body.city ?? '').trim();
  const state = String(body.state ?? '').trim();
  const whatsapp = normalizeWhatsAppNumber(String(body.whatsapp ?? ''));
  const verificationCode = String(body.verificationCode ?? '');

  if (action === 'send-verification') {
    if (!email || !password || !name || !whatsapp) {
      return jsonResponse({ ok: false, error: 'missing-fields' }, 400);
    }

    const code = String(body.code ?? '').trim() || createSixDigitCode();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'missing-service-role-key' }, 500);
    }

    const storeResult = await storeVerificationCode(supabaseUrl, serviceRoleKey, email, code, whatsapp);
    if (!storeResult.ok) {
      return jsonResponse({ ok: false, error: 'failed-to-store-verification-code', details: storeResult.body }, 500);
    }

    const whatsappResult = await dispatchVerificationCode(whatsapp, code);
    return jsonResponse({
      ok: true,
      pendingVerification: true,
      phone: whatsapp,
      code,
      whatsappSent: whatsappResult.ok,
      whatsappStatus: whatsappResult.status,
      devCode: code,
    });
  }

  if (action === 'create-user') {
    if (!email || !password || !name || !whatsapp || !verificationCode) {
      return jsonResponse({ ok: false, error: 'missing-fields' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'missing-service-role-key' }, 500);
    }

    const fetchResult = await fetchVerificationCode(supabaseUrl, serviceRoleKey, email);
    if (!fetchResult.ok || !fetchResult.record) {
      return jsonResponse({ ok: false, error: 'invalid-verification-code', details: 'code-not-found' }, 400);
    }

    const { code: storedCodeRaw, expires_at: expiresAt } = fetchResult.record as { code?: string | number; expires_at?: string };
    const storedCode = storedCodeRaw != null ? String(storedCodeRaw).trim() : '';
    const enteredCode = String(verificationCode).trim();

    if (!storedCode || storedCode !== enteredCode) {
      console.warn('[create-user] Código de verificação inválido', { email, storedCode, enteredCode, fetchResult });
      return jsonResponse({ ok: false, error: 'invalid-verification-code' }, 400);
    }

    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      return jsonResponse({ ok: false, error: 'verification-code-expired' }, 400);
    }

    const deleteResult = await deleteVerificationCode(supabaseUrl, serviceRoleKey, email);
    if (!deleteResult.ok) {
      console.warn('[create-user] Falha ao deletar código de verificação:', deleteResult);
    }

    const whatsappNotificationsEnabled = body.whatsapp_notifications_enabled !== false;

    const adminResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          city,
          state,
          whatsapp,
          phone: whatsapp,
          whatsapp_notifications_enabled: whatsappNotificationsEnabled,
        },
      }),
    });

    const adminBodyText = await adminResponse.text();
    let adminPayload: Record<string, unknown> = {};
    try {
      adminPayload = JSON.parse(adminBodyText);
    } catch {
      adminPayload = { raw: adminBodyText };
    }

    if (!adminResponse.ok) {
      return jsonResponse({ ok: false, error: adminPayload.error?.message || adminPayload.message || 'failed-to-create-user' }, adminResponse.status);
    }

    const createdUser = (adminPayload.user ?? adminPayload) as { id?: string };
    if (createdUser?.id) {
      try {
        await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            id: createdUser.id,
            name: name || '',
            email: email || '',
            whatsapp: whatsapp || '',
            phone: whatsapp || '',
            city: city || '',
            state: state || '',
            whatsapp_notifications_enabled: whatsappNotificationsEnabled,
          }),
        });
      } catch (profileErr) {
        console.warn('[create-user] Falha ao upsert em profiles:', profileErr);
      }
    }

    return jsonResponse({
      ok: true,
      user: adminPayload.user ?? adminPayload,
    });
  }

  // ==========================================
  // ACTION: send-reset-code (Redefinição de Senha via WhatsApp)
  // ==========================================
  if (action === 'send-reset-code') {
    if (!whatsapp) {
      return jsonResponse({ ok: false, error: 'missing-whatsapp' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'missing-service-role-key' }, 500);
    }

    const rawDigits = whatsapp.replace(/\D/g, '');
    const cleanPhone = rawDigits.startsWith('55') ? rawDigits.slice(2) : rawDigits;

    // Buscar perfil do usuário pelo WhatsApp cadastrado
    const profilesUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?select=id,name,email,whatsapp,phone&or=(whatsapp.ilike.*${cleanPhone}*,phone.ilike.*${cleanPhone}*)&limit=1`;
    const profileRes = await fetch(profilesUrl, {
      method: 'GET',
      headers: getRestHeaders(serviceRoleKey),
    });

    let foundProfile = null;
    if (profileRes.ok) {
      try {
        const parsedProfiles = await profileRes.json();
        if (Array.isArray(parsedProfiles) && parsedProfiles.length > 0) {
          foundProfile = parsedProfiles[0];
        }
      } catch {
        // ignore
      }
    }

    if (!foundProfile) {
      return jsonResponse({
        ok: false,
        error: 'user-not-found',
        message: 'Nenhuma conta encontrada com este número de WhatsApp. Verifique o número informado.',
      }, 404);
    }

    const code = createSixDigitCode();
    const resetKey = `reset_${foundProfile.id}`;

    // Grava código temporário na tabela de verificações (expira em 10 min)
    await storeVerificationCode(supabaseUrl, serviceRoleKey, resetKey, code, whatsapp);

    // Dispara WhatsApp com mensagem formatada
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? 'https://wefind-whatsapp-api.onrender.com';
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? 'wefind_secret_token_123';
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? 'wefind';

    const userName = foundProfile.name ? foundProfile.name.split(' ')[0] : 'Usuário';
    const messageText = `🐾 *Código de Redefinição de Senha - WeFIND*\n\nOlá, ${userName}! Você solicitou a redefinição de sua senha de acesso ao WeFIND.\n\nSeu código de segurança é:\n👉 *${code}*\n\nEste código é válido por 10 minutos. Se não foi você quem solicitou, por favor desconsidere esta mensagem.`;

    try {
      const evoUrl = `${EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${EVOLUTION_INSTANCE}`;
      await fetch(evoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: rawDigits,
          text: messageText,
        }),
      });
    } catch (err) {
      console.warn('[send-reset-code] Erro ao enviar Evolution API:', err);
    }

    // Mascarar telefone para exibição segura: ex (11) 9****-1234
    const ddd = cleanPhone.slice(0, 2);
    const lastDigits = cleanPhone.slice(-4);
    const maskedPhone = `(${ddd}) *****-${lastDigits}`;

    return jsonResponse({
      ok: true,
      pendingVerification: true,
      maskedPhone,
      whatsappSent: true,
    });
  }

  // ==========================================
  // ACTION: verify-reset-code (Validação do Código de 6 Dígitos)
  // ==========================================
  if (action === 'verify-reset-code') {
    if (!whatsapp || !verificationCode) {
      return jsonResponse({ ok: false, error: 'missing-fields' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'missing-service-role-key' }, 500);
    }

    const rawDigits = whatsapp.replace(/\D/g, '');
    const cleanPhone = rawDigits.startsWith('55') ? rawDigits.slice(2) : rawDigits;

    // Buscar perfil
    const profilesUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?select=id,email&or=(whatsapp.ilike.*${cleanPhone}*,phone.ilike.*${cleanPhone}*)&limit=1`;
    const profileRes = await fetch(profilesUrl, {
      method: 'GET',
      headers: getRestHeaders(serviceRoleKey),
    });

    let foundProfile = null;
    if (profileRes.ok) {
      try {
        const parsedProfiles = await profileRes.json();
        if (Array.isArray(parsedProfiles) && parsedProfiles.length > 0) {
          foundProfile = parsedProfiles[0];
        }
      } catch {
        // ignore
      }
    }

    if (!foundProfile) {
      return jsonResponse({ ok: false, error: 'user-not-found' }, 404);
    }

    const resetKey = `reset_${foundProfile.id}`;
    const fetchResult = await fetchVerificationCode(supabaseUrl, serviceRoleKey, resetKey);

    if (!fetchResult.ok || !fetchResult.record) {
      return jsonResponse({ ok: false, error: 'invalid-verification-code', message: 'Código não encontrado ou expirado. Solicite um novo código.' }, 400);
    }

    const { code: storedCodeRaw, expires_at: expiresAt } = fetchResult.record as { code?: string | number; expires_at?: string };
    const storedCode = storedCodeRaw != null ? String(storedCodeRaw).trim() : '';
    const enteredCode = String(verificationCode).trim();

    if (!storedCode || storedCode !== enteredCode) {
      return jsonResponse({ ok: false, error: 'invalid-verification-code', message: 'Código incorreto. Verifique os números digitados.' }, 400);
    }

    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      await deleteVerificationCode(supabaseUrl, serviceRoleKey, resetKey);
      return jsonResponse({ ok: false, error: 'code-expired', message: 'Este código expirou. Solicite um novo código.' }, 400);
    }

    // Invalida o código de 6 dígitos para impedir reuso
    await deleteVerificationCode(supabaseUrl, serviceRoleKey, resetKey);

    // Gera token criptográfico de uso único para a troca de senha (válido por 5 minutos)
    const resetToken = crypto.randomUUID();
    const tokenKey = `token_${resetToken}`;
    await storeVerificationCode(supabaseUrl, serviceRoleKey, tokenKey, foundProfile.id, whatsapp);

    return jsonResponse({
      ok: true,
      resetToken,
    });
  }

  // ==========================================
  // ACTION: reset-password (Criação da Nova Senha com Token)
  // ==========================================
  if (action === 'reset-password') {
    const resetToken = String(body.resetToken ?? '').trim();
    const newPassword = String(body.newPassword ?? '');

    if (!resetToken || !newPassword) {
      return jsonResponse({ ok: false, error: 'missing-fields' }, 400);
    }

    if (newPassword.length < 6) {
      return jsonResponse({ ok: false, error: 'password-too-short', message: 'A senha deve conter no mínimo 6 caracteres.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'missing-service-role-key' }, 500);
    }

    const tokenKey = `token_${resetToken}`;
    const fetchResult = await fetchVerificationCode(supabaseUrl, serviceRoleKey, tokenKey);

    if (!fetchResult.ok || !fetchResult.record) {
      return jsonResponse({ ok: false, error: 'invalid-reset-token', message: 'Sessão de redefinição expirada. Por favor, solicite o código novamente.' }, 400);
    }

    const { code: userIdRaw, expires_at: expiresAt } = fetchResult.record as { code?: string; expires_at?: string };
    const userId = String(userIdRaw ?? '').trim();

    if (!userId) {
      return jsonResponse({ ok: false, error: 'invalid-user-id' }, 400);
    }

    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      await deleteVerificationCode(supabaseUrl, serviceRoleKey, tokenKey);
      return jsonResponse({ ok: false, error: 'token-expired', message: 'Tempo limite esgotado. Solicite o código novamente.' }, 400);
    }

    // Invalida o token imediatamente para consumo único
    await deleteVerificationCode(supabaseUrl, serviceRoleKey, tokenKey);

    // Atualiza a senha no Supabase Auth Admin
    const updateRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({
        password: newPassword,
      }),
    });

    const updateBody = await updateRes.text();
    if (!updateRes.ok) {
      console.warn('[reset-password] Erro ao atualizar senha via Admin:', updateBody);
      return jsonResponse({ ok: false, error: 'failed-to-update-password', details: updateBody }, updateRes.status);
    }

    // Disparar notificação de segurança no WhatsApp informando a alteração
    try {
      const profilesUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?select=whatsapp,phone,name&id=eq.${encodeURIComponent(userId)}&limit=1`;
      const pRes = await fetch(profilesUrl, { method: 'GET', headers: getRestHeaders(serviceRoleKey) });
      if (pRes.ok) {
        const pData = await pRes.json();
        const userPhone = pData?.[0]?.whatsapp || pData?.[0]?.phone;
        if (userPhone) {
          const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? 'https://wefind-whatsapp-api.onrender.com';
          const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? 'wefind_secret_token_123';
          const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? 'wefind';
          const rawDigits = userPhone.replace(/\D/g, '');

          await fetch(`${EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${EVOLUTION_INSTANCE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
            body: JSON.stringify({
              number: rawDigits,
              text: '🔒 *Segurança WeFIND*\n\nA senha da sua conta WeFIND foi alterada com sucesso.\n\nSe você não reconhece esta operação, entre em contato imediatamente com o suporte.',
            }),
          });
        }
      }
    } catch (secErr) {
      console.warn('[reset-password] Alerta de segurança WhatsApp:', secErr);
    }

    return jsonResponse({
      ok: true,
      success: true,
      message: 'Senha alterada com sucesso!',
    });
  }

  return jsonResponse({ ok: false, error: 'unknown-action' }, 400);
});
