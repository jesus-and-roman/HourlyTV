/* =========================================================================
   HourlyTV — moteur d'algorithme
   -------------------------------------------------------------------------
   Tout l'historique d'écoute vit dans un cookie ("htv_history"). Chaque
   entrée n'est JAMAIS supprimée automatiquement, on ne fait qu'ajouter
   (append-only), conformément à la spec. L'utilisateur peut vider ce
   cookie manuellement depuis Paramètres, avec un avertissement.

   NOTE TECHNIQUE IMPORTANTE : un cookie est limité à ~4 Ko par le
   navigateur. Un historique d'écoute qui grossit indéfiniment va
   dépasser cette limite après quelques dizaines de vidéos. Ce fichier
   respecte la consigne "stocké dans les cookies" pour le comportement
   observable (lisible/exportable comme un cookie classique), mais utilise
   en interne un fallback automatique vers localStorage dès que le cookie
   dépasse la taille sécuritaire, pour ne jamais perdre de données. Le
   format exporté (bouton "télécharger l'algorithme") est identique dans
   les deux cas : un fichier JSON, un événement par ligne.
   ========================================================================= */

const HTV_COOKIE_NAME = "htv_history";
const HTV_COOKIE_MAX_BYTES = 3800; // marge sous la limite ~4096
const HTV_LS_KEY = "htv_history_overflow";

/* ---------------------------- Familles de couleurs ---------------------- */
// On ne compare pas des hex individuels : on classe chaque couleur dans une
// famille (teinte). Deux hex proches en teinte (vert forêt, vert pomme...)
// tombent dans la même famille.
const HTV_COLOR_FAMILIES = [
  { name: "rouge", hue: 0 },
  { name: "orange", hue: 30 },
  { name: "jaune", hue: 55 },
  { name: "vert", hue: 130 },
  { name: "turquoise", hue: 175 },
  { name: "bleu", hue: 220 },
  { name: "violet", hue: 270 },
  { name: "rose", hue: 320 },
  { name: "gris", hue: -1 }, // cas spécial, faible saturation
];

function hexToHsl(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = 0; s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function colorFamily(hex) {
  const { h, s } = hexToHsl(hex);
  if (s < 0.15) return "gris";
  let best = HTV_COLOR_FAMILIES[0], bestDist = Infinity;
  for (const fam of HTV_COLOR_FAMILIES) {
    if (fam.hue < 0) continue;
    const dist = Math.min(Math.abs(h - fam.hue), 360 - Math.abs(h - fam.hue));
    if (dist < bestDist) { bestDist = dist; best = fam; }
  }
  return best.name;
}

/* --------------------------- Lecture / écriture cookie ------------------ */
function htvSetCookie(name, value, days = 400) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
function htvGetCookie(name) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}
function htvDeleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function htvLoadHistory() {
  const raw = htvGetCookie(HTV_COOKIE_NAME);
  const overflow = localStorage.getItem(HTV_LS_KEY);
  let base = [];
  try { base = raw ? JSON.parse(raw) : []; } catch (e) { base = []; }
  let extra = [];
  try { extra = overflow ? JSON.parse(overflow) : []; } catch (e) { extra = []; }
  return base.concat(extra);
}

function htvAppendHistory(entry) {
  const raw = htvGetCookie(HTV_COOKIE_NAME);
  let list = [];
  try { list = raw ? JSON.parse(raw) : []; } catch (e) { list = []; }
  list.push(entry);
  const serialized = JSON.stringify(list);
  if (serialized.length < HTV_COOKIE_MAX_BYTES) {
    htvSetCookie(HTV_COOKIE_NAME, serialized);
  } else {
    // le cookie déborde : on garde le cookie tel quel et on continue
    // l'ajout (append-only) dans le fallback localStorage.
    let overflow = [];
    try { overflow = JSON.parse(localStorage.getItem(HTV_LS_KEY) || "[]"); } catch (e) {}
    overflow.push(entry);
    localStorage.setItem(HTV_LS_KEY, JSON.stringify(overflow));
  }
}

function htvClearHistory() {
  htvDeleteCookie(HTV_COOKIE_NAME);
  localStorage.removeItem(HTV_LS_KEY);
}

function htvHistorySizeBytes() {
  const raw = htvGetCookie(HTV_COOKIE_NAME) || "";
  const overflow = localStorage.getItem(HTV_LS_KEY) || "";
  return new Blob([raw]).size + new Blob([overflow]).size;
}

function htvDownloadHistory() {
  const history = htvLoadHistory();
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hourlytv-algorithme.json";
  a.click();
  URL.revokeObjectURL(url);
}

function htvImportHistory(jsonText) {
  // "en ajouter" — l'import ajoute des entrées sans jamais rien retirer.
  let incoming = [];
  try { incoming = JSON.parse(jsonText); } catch (e) { return false; }
  if (!Array.isArray(incoming)) return false;
  incoming.forEach(htvAppendHistory);
  return true;
}

/* ------------------------------ Session courante ------------------------ */
// Événements en cours de visionnage (pause, seeks) avant la clôture de
// l'entrée d'historique quand la vidéo change / la page est actualisée.
let htvCurrentSession = null;

function htvStartSession(video) {
  htvCurrentSession = {
    videoId: video.id,
    title: video.title,
    description: video.description,
    hashtags: video.hashtags,
    colors: video.thumbnailColors.map(colorFamily),
    duration: video.duration,
    startedAt: Date.now(),
    watchedSeconds: 0,
    lastPosition: 0,
    paused: false,
    seeks: [], // {from, to}
    liked: false,
    disliked: false,
    saved: false,
    favorited: false,
    shares: 0,
    subscriptionAction: null, // "subscribed" | "unsubscribed" | null
    countedInAlgorithm: false,
  };
  return htvCurrentSession;
}

function htvUpdatePosition(newPosition) {
  if (!htvCurrentSession) return;
  const s = htvCurrentSession;
  const delta = newPosition - s.lastPosition;
  if (delta > 0 && delta < 2) {
    // lecture normale qui avance
    s.watchedSeconds += delta;
  } else if (Math.abs(delta) >= 2) {
    // saut en avant ou en arrière -> on note le seek
    s.seeks.push({ from: s.lastPosition, to: newPosition });
  }
  s.lastPosition = newPosition;
  // Règle du 1% : une fois ce seuil franchi, la vidéo entre dans l'algorithme.
  if (!s.countedInAlgorithm && s.watchedSeconds / s.duration >= 0.01) {
    s.countedInAlgorithm = true;
  }
}

function htvSetPaused(paused) { if (htvCurrentSession) htvCurrentSession.paused = paused; }
function htvSetLiked(v) { if (htvCurrentSession) { htvCurrentSession.liked = v; if (v) htvCurrentSession.disliked = false; } }
function htvSetDisliked(v) { if (htvCurrentSession) { htvCurrentSession.disliked = v; if (v) htvCurrentSession.liked = false; } }
function htvSetSaved(v) { if (htvCurrentSession) htvCurrentSession.saved = v; }
function htvSetFavorited(v) { if (htvCurrentSession) htvCurrentSession.favorited = v; }
function htvRegisterShare() { if (htvCurrentSession) htvCurrentSession.shares += 1; }
function htvRegisterSubscriptionAction(action) { if (htvCurrentSession) htvCurrentSession.subscriptionAction = action; }

function htvCloseSession() {
  if (!htvCurrentSession) return;
  const s = htvCurrentSession;
  if (s.countedInAlgorithm) {
    htvAppendHistory({
      videoId: s.videoId,
      title: s.title,
      description: s.description,
      hashtags: s.hashtags,
      colors: s.colors,
      duration: s.duration,
      watchedSeconds: Math.round(s.watchedSeconds),
      watchPercent: Math.min(1, s.watchedSeconds / s.duration),
      paused: s.paused,
      seeks: s.seeks,
      liked: s.liked,
      disliked: s.disliked,
      saved: s.saved,
      favorited: s.favorited,
      shares: s.shares,
      subscriptionAction: s.subscriptionAction,
      timestamp: Date.now(),
    });
  }
  htvCurrentSession = null;
}

/* ------------------------- Catégories de hashtags ------------------------ */
let htvCategoryMap = null; // hashtag(minuscule) -> catégorie
async function htvLoadCategoryMap() {
  if (htvCategoryMap) return htvCategoryMap;
  htvCategoryMap = {};
  try {
    const res = await fetch("assets/lib/algorithm.txt");
    const text = await res.text();
    let currentCategory = null;
    text.split("\n").forEach((line) => {
      line = line.trim();
      if (!line) return;
      const catMatch = line.match(/^#"(.+)"$/);
      const tagMatch = line.match(/^;"(.+)"$/);
      if (catMatch) currentCategory = catMatch[1].toLowerCase();
      else if (tagMatch && currentCategory) {
        htvCategoryMap[tagMatch[1].toLowerCase()] = currentCategory;
      }
    });
  } catch (e) {
    console.warn("Impossible de charger assets/lib/algorithm.txt", e);
  }
  return htvCategoryMap;
}

// Étend une liste de mots-clés avec leur catégorie ET les autres tags de la
// même catégorie (avec un poids réduit, pour la relation "sens inverse").
function htvExpandTerms(rawTerms) {
  const weighted = {}; // terme -> poids additionnel
  rawTerms.forEach((term) => {
    term = term.toLowerCase();
    weighted[term] = (weighted[term] || 0) + 1;
    const cat = htvCategoryMap ? htvCategoryMap[term] : null;
    if (cat) {
      weighted[cat] = (weighted[cat] || 0) + 1; // le tag alimente sa catégorie
    }
  });
  // catégorie -> alimente aussi ses tags (avec poids plus faible), et
  // chercher "gaming" doit faire remonter gta6 / gta 5 plus faiblement.
  Object.keys(weighted).forEach((term) => {
    if (htvCategoryMap) {
      Object.entries(htvCategoryMap).forEach(([tag, cat]) => {
        if (cat === term) weighted[tag] = (weighted[tag] || 0) + weighted[term] * 0.35;
      });
    }
  });
  return weighted;
}

function htvTextTerms(video) {
  const words = `${video.title} ${video.description}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s#]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return [...words, ...video.hashtags.map((h) => h.toLowerCase())];
}

/* --------------------------------- Poids --------------------------------- */
const HTV_WEIGHTS = {
  colors: 0.05,
  duration: 0.05,
  watchTime: 0.10,
  topTerms: 0.40,
  manualActions: 0.40,
};
const HTV_TOPTERMS_RANK_WEIGHTS = [10, 7, 5.5, 4, 3.5, 3, 2.5, 2, 1.5, 1]; // sur 40, en %
const HTV_ACTION_WEIGHTS = {
  likeDislike: 15,
  saveForLater: 5,
  shared: 5,
  subscription: 10,
  favorite: 5,
}; // total 40

/* ---------------------------- Construction profil ------------------------ */
function htvBuildProfile(history) {
  const colorCounts = {};
  const durations = [];
  const watchPercents = [];
  const termCounts = {}; // pour le "top 10"
  const actionTermCounts = {}; // pondéré par action manuelle

  history.forEach((h) => {
    (h.colors || []).forEach((c) => (colorCounts[c] = (colorCounts[c] || 0) + 1));
    durations.push(h.duration);
    watchPercents.push(h.watchPercent);

    const terms = htvExpandTerms([...(h.hashtags || []), ...`${h.title} ${h.description}`
      .toLowerCase().replace(/[^\p{L}\p{N}\s#]/gu, " ").split(/\s+/).filter((w) => w.length > 3)]);
    Object.entries(terms).forEach(([t, w]) => (termCounts[t] = (termCounts[t] || 0) + w));

    let actionWeight = 0;
    if (h.liked || h.disliked) actionWeight += HTV_ACTION_WEIGHTS.likeDislike * (h.liked ? 1 : -1);
    if (h.saved) actionWeight += HTV_ACTION_WEIGHTS.saveForLater;
    if (h.shares > 0) actionWeight += HTV_ACTION_WEIGHTS.shared;
    if (h.subscriptionAction === "subscribed") actionWeight += HTV_ACTION_WEIGHTS.subscription;
    if (h.subscriptionAction === "unsubscribed") actionWeight -= HTV_ACTION_WEIGHTS.subscription;
    if (h.favorited) actionWeight += HTV_ACTION_WEIGHTS.favorite;

    if (actionWeight !== 0) {
      Object.keys(terms).forEach((t) => (actionTermCounts[t] = (actionTermCounts[t] || 0) + actionWeight));
    }
  });

  // top 10 termes, poids décroissants selon le barème donné
  const topTerms = Object.entries(termCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topTermWeights = {};
  topTerms.forEach(([term], i) => (topTermWeights[term] = HTV_TOPTERMS_RANK_WEIGHTS[i]));

  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const avgWatchPercent = watchPercents.length ? watchPercents.reduce((a, b) => a + b, 0) / watchPercents.length : null;

  return { colorCounts, avgDuration, avgWatchPercent, topTermWeights, actionTermCounts, historyCount: history.length };
}

/* ------------------------------ Score par vidéo --------------------------- */
function htvScoreVideo(video, profile, searchQuery = null) {
  if (profile.historyCount === 0 && !searchQuery) {
    // aucun historique : score neutre basé sur la popularité seulement
    return { score: 0, components: {} };
  }

  // 1) couleurs — 5%
  let colorScore = 0;
  const totalColorHits = Object.values(profile.colorCounts).reduce((a, b) => a + b, 0) || 1;
  const vidFamilies = video.thumbnailColors.map(colorFamily);
  vidFamilies.forEach((fam) => { colorScore += (profile.colorCounts[fam] || 0) / totalColorHits; });
  colorScore = Math.min(1, colorScore / 3);

  // 2) durée complète — 5%
  let durationScore = 0;
  if (profile.avgDuration) {
    const diff = Math.abs(video.duration - profile.avgDuration) / Math.max(video.duration, profile.avgDuration);
    durationScore = Math.max(0, 1 - diff);
  }

  // 3) watch time — 10% (affinité avec le taux de complétion habituel de l'utilisateur)
  let watchTimeScore = profile.avgWatchPercent != null ? profile.avgWatchPercent : 0;

  // 4) top 10 termes titre/description/hashtags — 40%
  const vidTerms = htvExpandTerms(htvTextTerms(video));
  let topTermsScore = 0;
  Object.entries(profile.topTermWeights).forEach(([term, weight]) => {
    if (vidTerms[term]) topTermsScore += weight; // weight déjà en "points sur 40"
  });
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const qTerms = htvExpandTerms([q]);
    let searchHit = 0;
    Object.keys(qTerms).forEach((t) => { if (vidTerms[t]) searchHit += qTerms[t]; });
    topTermsScore = searchHit > 0 ? Math.max(topTermsScore, 40) : topTermsScore;
  }
  topTermsScore = Math.min(40, topTermsScore);

  // 5) actions manuelles — 40%
  let actionScore = 0;
  Object.entries(profile.actionTermCounts).forEach(([term, weight]) => {
    if (vidTerms[term]) actionScore += weight;
  });
  actionScore = Math.max(0, Math.min(40, actionScore));

  const total =
    colorScore * (HTV_WEIGHTS.colors * 100) +
    durationScore * (HTV_WEIGHTS.duration * 100) +
    watchTimeScore * (HTV_WEIGHTS.watchTime * 100) +
    topTermsScore +
    actionScore;

  // Barème 90/10 quand une recherche est active
  let finalScore = total;
  if (searchQuery) finalScore = total * 0.1 + (topTermsScore >= 40 ? 90 : 0);

  return {
    score: Number(((finalScore / 100) * 1000).toFixed(4)),
    components: { colorScore, durationScore, watchTimeScore, topTermsScore, actionScore },
  };
}

function htvRankVideos(videos, searchQuery = null) {
  const history = htvLoadHistory();
  const profile = htvBuildProfile(history);
  return videos
    .map((v) => ({ video: v, ...htvScoreVideo(v, profile, searchQuery) }))
    .sort((a, b) => b.score - a.score);
}

/* Vidéos "changer de domaine d'écoute" : 10% à 20% d'affinité, hors du top */
function htvDomainShiftVideos(videos, excludeIds, count = 4) {
  const ranked = htvRankVideos(videos).filter((r) => !excludeIds.has(r.video.id));
  const maxScore = ranked.length ? ranked[0].score : 1000;
  const candidates = ranked.filter((r) => {
    const pct = maxScore ? r.score / maxScore : 0;
    return pct >= 0.10 && pct <= 0.20;
  });
  const pool = candidates.length >= count ? candidates : ranked.slice(-Math.max(count, ranked.length));
  return htvShuffle(pool).slice(0, count).map((r) => r.video);
}

/* Vidéos "au hasard" : vraiment aléatoire, hors des deux autres sections */
function htvRandomVideos(videos, excludeIds, count = 4) {
  const pool = videos.filter((v) => !excludeIds.has(v.id));
  return htvShuffle(pool).slice(0, count);
}

function htvShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
