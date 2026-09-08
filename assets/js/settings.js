htvInitPage("parametres.html");

const user = htvCurrentUser();
if (!user) window.location.href = "connexion.html";

/* --------------------------------- Navigation ------------------------------ */
document.querySelectorAll(".htv-settings-nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".htv-settings-nav button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".htv-settings-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.panel).classList.add("active");
  });
});

/* ------------------------------ Infos personnelles -------------------------- */
const DAY = 86400000;
document.getElementById("input-nickname").value = user.nickname;
document.getElementById("input-username").value = user.username;

const nicknameDaysLeft = Math.max(0, 7 - Math.floor((Date.now() - (user.lastNicknameChange || 0)) / DAY));
const usernameDaysLeft = Math.max(0, 30 - Math.floor((Date.now() - (user.lastUsernameChange || 0)) / DAY));
document.getElementById("nickname-hint").textContent = nicknameDaysLeft > 0
  ? `Modifiable à nouveau dans ${nicknameDaysLeft} jour(s).` : "Modifiable maintenant.";
document.getElementById("username-hint").textContent = usernameDaysLeft > 0
  ? `Modifiable à nouveau dans ${usernameDaysLeft} jour(s).` : "Modifiable maintenant.";
document.getElementById("btn-save-nickname").disabled = nicknameDaysLeft > 0;
document.getElementById("btn-save-username").disabled = usernameDaysLeft > 0;

function htvUpdateUserField(field, value, stampField) {
  const users = htvGetUsers();
  const idx = users.findIndex((u) => u.contact === user.contact);
  if (idx >= 0) {
    users[idx][field] = value;
    if (stampField) users[idx][stampField] = Date.now();
    htvSaveUsers(users);
    localStorage.setItem("htv_user", JSON.stringify(users[idx]));
  }
}
document.getElementById("btn-save-nickname").addEventListener("click", () => {
  htvUpdateUserField("nickname", document.getElementById("input-nickname").value, "lastNicknameChange");
  alert("Surnom mis à jour."); location.reload();
});
document.getElementById("btn-save-username").addEventListener("click", () => {
  htvUpdateUserField("username", document.getElementById("input-username").value, "lastUsernameChange");
  alert("Username mis à jour."); location.reload();
});

/* ------------------------------ Infos sensibles ----------------------------- */
document.getElementById("btn-unlock-private").addEventListener("click", () => {
  const pwd = document.getElementById("private-password-check").value;
  if (pwd !== user.password) { alert("Mot de passe incorrect."); return; }
  document.getElementById("private-locked").style.display = "none";
  document.getElementById("private-unlocked").style.display = "block";
  document.getElementById("private-phone-card").style.display = "block";
  document.getElementById("private-password-card").style.display = "block";
  document.getElementById("input-email").value = user.usingPhone ? "" : user.contact;
  document.getElementById("input-phone").value = user.usingPhone ? user.contact : "";
});
document.getElementById("btn-save-email").addEventListener("click", () => {
  htvUpdateUserField("contact", document.getElementById("input-email").value);
  htvUpdateUserField("usingPhone", false);
  alert("Courriel mis à jour.");
});
document.getElementById("btn-save-phone").addEventListener("click", () => {
  htvUpdateUserField("contact", document.getElementById("input-phone").value);
  htvUpdateUserField("usingPhone", true);
  alert("Numéro de téléphone mis à jour.");
});
document.getElementById("btn-save-password").addEventListener("click", () => {
  htvUpdateUserField("password", document.getElementById("input-new-password").value);
  alert("Mot de passe changé.");
});

/* -------------------------------- Cookies / algo ----------------------------- */
function refreshCookieStats() {
  document.getElementById("cookie-count").textContent = htvLoadHistory().length;
  document.getElementById("cookie-size").textContent = `${htvHistorySizeBytes()} o`;
}
refreshCookieStats();
document.getElementById("btn-download-cookies").addEventListener("click", htvDownloadHistory);

const deleteModal = document.getElementById("delete-modal");
document.getElementById("btn-delete-cookies").addEventListener("click", () => deleteModal.classList.add("open"));
document.getElementById("cancel-delete").addEventListener("click", () => deleteModal.classList.remove("open"));
document.getElementById("confirm-delete").addEventListener("click", () => {
  htvClearHistory();
  deleteModal.classList.remove("open");
  refreshCookieStats();
});

/* ------------------------------------ Sécurité -------------------------------- */
document.getElementById("connections-body").innerHTML = (user.connections || []).map((c) => `
  <tr><td>${c.ip}</td><td>${c.location}</td><td>${c.device}</td><td>${new Date(c.date).toLocaleString("fr-CA")}</td></tr>
`).join("");

/* -------------------------------------- Thème ---------------------------------- */
const themeSwitch = document.getElementById("theme-switch");
themeSwitch.checked = (localStorage.getItem("htv_theme") || "sombre") === "clair";
themeSwitch.addEventListener("change", htvToggleTheme);
