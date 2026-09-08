/* Composants communs à toutes les pages : en-tête, barre latérale, thème. */

const HTV_SIDEBAR_LINKS = [
  { href: "index.html", label: "Accueil", icon: "home" },
  { href: "abonnements.html", label: "Abonnements", icon: "users" },
  { href: "notifications.html", label: "Notifications", icon: "bell" },
  { href: "historique.html", label: "Historique", icon: "clock" },
  { href: "enregistrements.html", label: "Enregistré", icon: "bookmark" },
  { sep: true },
  { href: "compte.html", label: "Mon compte", icon: "user" },
  { href: "parametres.html", label: "Paramètres", icon: "settings" },
  { href: "statistiques.html", label: "Statistiques", icon: "chart" },
  { href: "publier.html", label: "Publier une vidéo", icon: "upload" },
];

const HTV_ICONS = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14a5.5 5.5 0 0 1 5.5 6"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V19a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1z"/>',
  chart: '<path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/>',
  upload: '<path d="M12 16V4"/><path d="M6 10l6-6 6 6"/><path d="M4 20h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  bell_ring: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/>',
};

function htvIcon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${HTV_ICONS[name] || ""}</svg>`;
}

function htvApplyTheme() {
  const theme = localStorage.getItem("htv_theme") || "sombre";
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}

function htvToggleTheme() {
  const current = localStorage.getItem("htv_theme") || "sombre";
  const next = current === "sombre" ? "clair" : "sombre";
  localStorage.setItem("htv_theme", next);
  document.documentElement.setAttribute("data-theme", next);
  const icon = document.getElementById("htv-theme-icon");
  if (icon) icon.innerHTML = htvIcon(next === "sombre" ? "moon" : "sun");
}

function htvIsLoggedIn() { return !!localStorage.getItem("htv_user"); }
function htvCurrentUser() {
  try { return JSON.parse(localStorage.getItem("htv_user")); } catch (e) { return null; }
}

function htvRenderHeader(activePage) {
  const loggedIn = htvIsLoggedIn();
  const user = htvCurrentUser();
  const theme = htvApplyTheme();

  const header = document.createElement("header");
  header.className = "htv-header";
  header.innerHTML = `
    <a href="index.html" class="htv-logo">
      <span class="htv-logo-mark">
        <svg viewBox="0 0 32 24" fill="none" stroke="currentColor" stroke-width="1.6" style="color:var(--green)">
          <rect x="2" y="3" width="20" height="14" rx="1.5"/>
          <path d="M9 3 6 0.5M15 3l3-2.5"/>
          <circle cx="12" cy="10" r="3.2"/>
          <rect x="24" y="9" width="6" height="12" rx="1.5"/>
          <circle cx="27" cy="12.5" r="0.8" fill="currentColor"/>
        </svg>
      </span>
      <span class="htv-logo-text">HOURLY<span>TV</span></span>
    </a>

    <div class="htv-search">
      <form id="htv-search-form" autocomplete="off">
        <input id="htv-search-input" type="text" placeholder="Rechercher • /@usager • /#=motclé • /?=id" />
        <button type="submit">${htvIcon("search")}</button>
      </form>
      <div class="htv-search-history" id="htv-search-history"></div>
    </div>

    <div class="htv-header-actions">
      <button class="htv-icon-btn" id="htv-theme-btn" title="Changer de thème">
        <span id="htv-theme-icon">${htvIcon(theme === "sombre" ? "moon" : "sun")}</span>
      </button>
      <a class="htv-icon-btn" href="parametres.html" title="Paramètres">${htvIcon("settings")}</a>
      <a class="htv-avatar" href="${loggedIn ? "compte.html" : "inscription.html"}" title="${loggedIn ? "Mon compte" : "Se connecter"}">
        ${loggedIn && user?.pfp ? `<img src="${user.pfp}" alt="">` : htvIcon("user")}
      </a>
    </div>
  `;
  document.body.prepend(header);

  header.querySelector("#htv-theme-btn").addEventListener("click", htvToggleTheme);

  const form = header.querySelector("#htv-search-form");
  const input = header.querySelector("#htv-search-input");
  const historyBox = header.querySelector("#htv-search-history");

  function renderSearchHistory() {
    const hist = JSON.parse(localStorage.getItem("htv_search_history") || "[]");
    if (!hist.length) { historyBox.classList.remove("open"); return; }
    historyBox.innerHTML = hist.slice(0, 3).map((q) => `<button type="button">${q}</button>`).join("");
    historyBox.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => { input.value = b.textContent; historyBox.classList.remove("open"); form.requestSubmit(); });
    });
  }
  input.addEventListener("focus", () => { renderSearchHistory(); historyBox.classList.add("open"); });
  document.addEventListener("click", (e) => { if (!header.contains(e.target)) historyBox.classList.remove("open"); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    if (q.startsWith("/@")) { window.location.href = `profil.html?u=${encodeURIComponent(q.slice(2))}`; return; }
    if (q.startsWith("/?=")) { window.location.href = `video.html?id=${encodeURIComponent(q.slice(3))}`; return; }
    let query = q.startsWith("/#=") ? q.slice(3) : q;
    let hist = JSON.parse(localStorage.getItem("htv_search_history") || "[]");
    hist = [query, ...hist.filter((h) => h !== query)].slice(0, 3);
    localStorage.setItem("htv_search_history", JSON.stringify(hist));
    window.location.href = `recherche.html?q=${encodeURIComponent(query)}`;
  });

  return header;
}

function htvRenderSidebar(activePage) {
  const shell = document.querySelector(".htv-shell");
  if (!shell) return;
  const nav = document.createElement("nav");
  nav.className = "htv-sidebar";
  nav.innerHTML = HTV_SIDEBAR_LINKS.map((item) => {
    if (item.sep) return "<hr>";
    const active = item.href === activePage ? "active" : "";
    return `<a href="${item.href}" class="${active}">${htvIcon(item.icon)}<span>${item.label}</span></a>`;
  }).join("");
  shell.prepend(nav);
}

function htvInitPage(activePage) {
  htvApplyTheme();
  htvRenderHeader(activePage);
  htvRenderSidebar(activePage);
}
