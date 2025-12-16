// @ts-nocheck
/// <reference types="https://deno.land/std@0.224.0/types.d.ts" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Envia email via Brevo
async function sendEmail(payload: { to: string; subject: string; text: string; html: string }) {
  const smtpKey = Deno.env.get("SMTP_USERNAME");
  const senderEmail = Deno.env.get("SMTP_SENDER_EMAIL");
  const senderName = Deno.env.get("SMTP_SENDER_NAME") ?? "Recover";

  if (!smtpKey || !senderEmail) {
    console.error("[send-sighting-email] Missing Brevo env vars");
    throw new Error("Brevo configuration is incomplete");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": smtpKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: payload.to }],
      subject: payload.subject,
      textContent: payload.text,
      htmlContent: payload.html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[send-sighting-email] Brevo API error:", error);
    throw new Error(`Failed to send email: ${response.status}`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const record = payload.record;

    if (!record) {
      console.warn("[send-sighting-email] Missing record in payload");
      return new Response(JSON.stringify({ error: "Missing record" }), { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SB_URL");
    const serviceRoleKey = Deno.env.get("SB_SERVICE_ROLE_KEY");
    const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "https://recover.app";

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[send-sighting-email] Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Buscar item para obter proprietário
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("owner_id, title")
      .eq("id", record.item_id)
      .single();

    if (itemError || !item?.owner_id) {
      console.error("[send-sighting-email] Item fetch error", itemError);
      return new Response(JSON.stringify({ error: "Item not found" }), { status: 400, headers: corsHeaders });
    }

    // Buscar email do proprietário (profiles)
    const ownerId = String(item.owner_id);
    const { data: ownerProfile, error: ownerError } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", ownerId)
      .single();

    if (ownerError || !ownerProfile?.email) {
      console.error("[send-sighting-email] Owner fetch error", ownerError);
      return new Response(JSON.stringify({ error: "Owner not found" }), { status: 400, headers: corsHeaders });
    }

    const itemTitle = item.title ?? "(sem título)";
    const sightingPage = `${frontendUrl}/item/${record.item_id}`;

    const subject = `[TCC Recover] Avistamento do item: ${itemTitle}`;
    const description = record.description?.trim() || "(sem descrição)";
    const location = record.location?.trim() || "(não informado)";
    const photoHtml = record.photo_url ? `<p><img src="${record.photo_url}" alt="Foto do avistamento" style="max-width: 100%; height: auto; border-radius: 8px;" /></p>` : "";

    const text =
`Você recebeu um novo avistamento para seu item "${itemTitle}".

Descrição:
${description}

Local:
${location}

Contato do usuário:
${record.contact_info || "(não fornecido)"}

Veja mais detalhes:
${sightingPage}
`;

    const html =
`<p>Você recebeu um novo avistamento para seu item <strong>${escapeHtml(itemTitle)}</strong>.</p>
<p><strong>Descrição:</strong><br>${escapeHtml(description)}</p>
<p><strong>Local:</strong><br>${escapeHtml(location)}</p>
${record.contact_info ? `<p><strong>Contato:</strong><br>${escapeHtml(record.contact_info)}</p>` : ""}
${photoHtml}
<p><a href="${sightingPage}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Ver detalhes</a></p>`;

    await sendEmail({
      to: ownerProfile.email,
      subject,
      text,
      html,
    });

    console.log(`[send-sighting-email] Email sent to ${ownerProfile.email} for sighting ${record.id}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("[send-sighting-email] Error", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), { status: 500, headers: corsHeaders });
  }
});

