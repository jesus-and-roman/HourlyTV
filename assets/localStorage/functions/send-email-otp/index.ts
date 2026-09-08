// supabase/functions/send-email-otp/index.ts
// Déploiement : supabase functions deploy send-email-otp
// Secrets requis (supabase secrets set) :
//   RESEND_API_KEY        -> clé API Resend (ou remplace par ton fournisseur)
//   SUPABASE_URL           -> déjà fourni automatiquement par Supabase
//   SUPABASE_SERVICE_ROLE_KEY -> déjà fourni automatiquement par Supabase
//
// Cette fonction tourne côté serveur : c'est la seule à connaître la clé
// service_role et la clé Resend. Le navigateur ne voit jamais ces secrets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const { email, userId, purpose } = await req.json();
    // purpose: "verify_signup" | "reset_password"

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Vérifie/consomme le quota horaire partagé (table send_quota, migration 0003)
    const { data: quotaOk } = await supabase.rpc("check_and_consume_quota", { p_channel: "email" });
    if (!quotaOk) {
      return new Response(
        JSON.stringify({ ok: false, error: "quota_exceeded" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const code = String(Math.floor(10000 + Math.random() * 90000));

    if (purpose === "reset_password") {
      await supabase.from("password_reset_codes").insert({
        user_id: userId,
        code,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
    }
    // Pour "verify_signup", le code peut être vérifié directement côté
    // client via un appel séparé (voir verify-signup côté RPC) ou stocké
    // dans la même table password_reset_codes en réutilisant le mécanisme.

    const subject = purpose === "reset_password"
      ? "Ton code de réinitialisation HourlyTV"
      : "Vérifie ton compte HourlyTV";

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HourlyTV <no-reply@tondomaine.example>",
        to: [email],
        subject,
        html: `<p>Ton code HourlyTV : <strong style="font-size:20px">${code}</strong></p>
               <p>Ce code expire dans 10 minutes. Si tu n'es pas à l'origine de cette demande, ignore ce message.</p>`,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      return new Response(JSON.stringify({ ok: false, error: errText }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
