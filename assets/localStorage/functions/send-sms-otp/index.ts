// supabase/functions/send-sms-otp/index.ts
// Déploiement : supabase functions deploy send-sms-otp
// Secrets requis :
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
//   (remplaçables par n'importe quel fournisseur SMS — Twilio est un exemple)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const { phone, userId, purpose } = await req.json();

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: quotaOk } = await supabase.rpc("check_and_consume_quota", { p_channel: "sms" });
    if (!quotaOk) {
      return new Response(JSON.stringify({ ok: false, error: "quota_exceeded" }), { status: 429 });
    }

    const code = String(Math.floor(10000 + Math.random() * 90000));

    if (purpose === "reset_password") {
      await supabase.from("password_reset_codes").insert({
        user_id: userId,
        code,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
    }

    const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
    const body = new URLSearchParams({
      To: phone,
      From: TWILIO_FROM,
      Body: `Ton code HourlyTV : ${code} (valide 10 minutes)`,
    });

    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ ok: false, error: errText }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
