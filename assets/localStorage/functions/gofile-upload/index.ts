// supabase/functions/gofile-upload/index.ts
//
// Le token de compte gofile ne doit JAMAIS être envoyé au navigateur : si un
// visiteur l'obtenait, il pourrait gérer/supprimer tous les fichiers de ton
// compte gofile. Cette fonction fait donc le pont : le navigateur lui envoie
// le fichier, elle le relaie à gofile avec le token gardé côté serveur, puis
// renvoie l'identifiant + le lien de téléchargement à insérer dans `videos`.
//
// LIMITE IMPORTANTE : les Edge Functions Supabase ont une limite de taille
// de requête et de temps d'exécution (variable selon le plan). Pour des
// vidéos de plusieurs centaines de Mo, ce proxy peut ne pas suffire.
// Si tu frappes cette limite, la seule vraie solution est d'accepter le
// compromis inverse : un compte gofile DÉDIÉ à HourlyTV (jamais ton compte
// personnel) dont le token est distribué au navigateur uniquement pour
// l'upload, ce qui borne les dégâts en cas de fuite au contenu de ce compte
// dédié. Dis-moi si tu veux ce script alternatif, je te le donne.
//
// Secrets requis : GOFILE_API_TOKEN

const GOFILE_TOKEN = Deno.env.get("GOFILE_API_TOKEN")!;

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405 });
    }

    // 1) Demande un serveur d'upload disponible
    const serverResp = await fetch("https://api.gofile.io/servers");
    const serverJson = await serverResp.json();
    const server = serverJson?.data?.servers?.[0]?.name;
    if (!server) throw new Error("Impossible d'obtenir un serveur gofile.");

    // 2) Relaie le fichier reçu du navigateur vers gofile
    const incomingForm = await req.formData();
    const file = incomingForm.get("file");
    if (!file) return new Response(JSON.stringify({ ok: false, error: "missing_file" }), { status: 400 });

    const outgoingForm = new FormData();
    outgoingForm.append("file", file as File);
    outgoingForm.append("token", GOFILE_TOKEN);

    const uploadResp = await fetch(`https://${server}.gofile.io/uploadFile`, {
      method: "POST",
      body: outgoingForm,
    });
    const uploadJson = await uploadResp.json();

    if (uploadJson.status !== "ok") {
      return new Response(JSON.stringify({ ok: false, error: uploadJson }), { status: 500 });
    }

    return new Response(JSON.stringify({
      ok: true,
      fileId: uploadJson.data.fileId,
      downloadPage: uploadJson.data.downloadPage,
      directLink: uploadJson.data.directLink ?? null,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
