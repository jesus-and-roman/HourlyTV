/* =========================================================================
   Authentification — démonstration front-end uniquement.
   En production, tout ceci est remplacé par Supabase Auth (email/OTP,
   RLS, tables `users`) + un fournisseur SMS pour le flux téléphone.
   Ici on simule avec localStorage pour illustrer le parcours complet :
   inscription -> vérification -> connexion -> mot de passe oublié.
   ========================================================================= */

const HTV_USERS_KEY = "htv_users_demo";
const HTV_QUOTA_KEY = "htv_quota_demo";

function htvGetUsers() {
  try { return JSON.parse(localStorage.getItem(HTV_USERS_KEY) || "[]"); } catch (e) { return []; }
}
function htvSaveUsers(users) { localStorage.setItem(HTV_USERS_KEY, JSON.stringify(users)); }

/* --------------------------------- Quotas --------------------------------- */
// Simule un quota horaire d'envois email/SMS partagé par le fournisseur.
function htvCheckQuota() {
  const data = JSON.parse(localStorage.getItem(HTV_QUOTA_KEY) || "{}");
  const now = Date.now();
  const windowStart = data.windowStart || now;
  if (now - windowStart > 3600_000) {
    localStorage.setItem(HTV_QUOTA_KEY, JSON.stringify({ windowStart: now, email: 0, sms: 0 }));
    return { emailOk: true, smsOk: true };
  }
  return { emailOk: (data.email || 0) < 50, smsOk: (data.sms || 0) < 50 };
}
function htvConsumeQuota(kind) {
  const data = JSON.parse(localStorage.getItem(HTV_QUOTA_KEY) || "{}");
  const now = Date.now();
  const windowStart = data.windowStart || now;
  const fresh = now - windowStart > 3600_000;
  const next = fresh ? { windowStart: now, email: 0, sms: 0 } : data;
  next[kind] = (next[kind] || 0) + 1;
  localStorage.setItem(HTV_QUOTA_KEY, JSON.stringify(next));
}

/* ------------------------------- Inscription ------------------------------ */
function htvRegisterPending(payload) {
  htvConsumeQuota(payload.usingPhone ? "sms" : "email");
  localStorage.setItem("htv_pending_signup", JSON.stringify(payload));
}

function htvCompletePendingRegistration() {
  const pending = JSON.parse(localStorage.getItem("htv_pending_signup") || "null");
  if (!pending) return false;
  const users = htvGetUsers();
  users.push({
    contact: pending.contact,
    usingPhone: pending.usingPhone,
    nickname: pending.nickname,
    username: pending.username,
    password: pending.password, // démo uniquement — jamais en clair en prod
    createdAt: Date.now(),
    lastNicknameChange: Date.now(),
    lastUsernameChange: Date.now(),
    bio: "",
    banner: null,
    pfp: null,
    connections: [{ ip: "192.0.2.10", location: "Saguenay, QC, CA", device: "Navigateur web", date: Date.now() }],
  });
  htvSaveUsers(users);
  localStorage.removeItem("htv_pending_signup");
  return true;
}

/* -------------------------------- Connexion -------------------------------- */
function htvLogin(email, password) {
  const users = htvGetUsers();
  const user = users.find((u) => u.contact === email && u.password === password);
  if (!user) return { ok: false, error: "Identifiants invalides." };
  localStorage.setItem("htv_user", JSON.stringify(user));
  return { ok: true };
}
function htvLogout() { localStorage.removeItem("htv_user"); }

/* --------------------------- Mot de passe oublié --------------------------- */
function htvGenerateResetCode(target) {
  htvConsumeQuota(target.includes("@") ? "email" : "sms");
  const code = String(Math.floor(10000 + Math.random() * 90000));
  sessionStorage.setItem("htv_reset_target", target);
  sessionStorage.setItem("htv_reset_code", code);
  return code;
}
function htvResetPassword(newPassword) {
  const target = sessionStorage.getItem("htv_reset_target");
  const users = htvGetUsers();
  const idx = users.findIndex((u) => u.contact === target);
  if (idx >= 0) { users[idx].password = newPassword; htvSaveUsers(users); }
  sessionStorage.removeItem("htv_reset_target");
  sessionStorage.removeItem("htv_reset_code");
}
