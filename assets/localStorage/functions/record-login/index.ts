// supabase/functions/record-login/index.ts
// Appelée juste après une connexion réussie côté client, avec le JWT de
// l'usager en en-tête Authorization. On lit l'IP réelle depuis les en-têtes
// de la requête (le navigateur ne peut pas la connaître de façon fiable
// lui-même), on géolocalise avec un service gratuit, et on insère la ligne
// dans login_connections.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: userData, error } = await supabase.auth.getUser(jwt);
    if (error || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "unauthenticated" }), { status: 401 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "inconnue";
    const userAgent = req.headers.get("user-agent") || "inconnu";

    let location = "Localisation inconnue";
    try {
      const geoResp = await fetch(`https://ip-api.com/json/${ip}?fields=city,regionName,country`);
      if (geoResp.ok) {
        const geo = await geoResp.json();
        location = [geo.city, geo.regionName, geo.country].filter(Boolean).join(", ") || location;
      }
    } catch (_e) { /* géolocalisation best-effort */ }

    await supabase.from("login_connections").insert({
      user_id: userData.user.id,
      ip,
      location,
      device: userAgent,
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
