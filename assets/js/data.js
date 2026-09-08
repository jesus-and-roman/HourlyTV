/* =========================================================================
   Jeu de données de démonstration.
   En production, ce fichier est remplacé par un fetch vers Supabase
   (table `videos`), les miniatures viennent de gofile et les couleurs
   dominantes sont extraites côté client via <canvas> au premier chargement
   de la miniature, puis mises en cache. Ici on fixe des couleurs
   plausibles pour pouvoir démontrer l'algorithme sans traitement d'image.
   ========================================================================= */

const HTV_VIDEOS = [
  v("v001", "GTA 6 : tout ce qu'on sait avant la sortie", "Un tour complet des trailers, des fuites et des dates.", ["gta6", "gaming", "rockstar"], 742, 128000, 0.94, ["#3a7d44", "#0a0a0a", "#c9a227"], "Nova Games"),
  v("v002", "J'ai fini GTA 5 à 100% en une semaine", "Tous les collectibles, tous les défis, sans aucun DLC.", ["gta 5", "speedrun"], 1290, 54210, 0.88, ["#264653", "#2a9d8f", "#e9c46a"], "Nova Games"),
  v("v003", "Mon chihuahua rencontre la neige pour la première fois", "Réaction adorable garantie.", ["chihuahua", "animaux"], 96, 302000, 0.97, ["#e0e0e0", "#8d99ae", "#2b2d42"], "Poils & Compagnie"),
  v("v004", "Recette : pâte à pizza en 10 minutes", "Sans temps de repos, testée et approuvée.", ["recette", "cuisine"], 420, 87500, 0.91, ["#e76f51", "#f4a261", "#264653"], "Chef Mathis"),
  v("v005", "Remix Lo-Fi d'un thème de Zelda", "Une session chill pour étudier ou dormir.", ["remix", "musique"], 3600, 45300, 0.95, ["#22223b", "#4a4e69", "#9a8c98"], "Frequences"),
  v("v006", "Unboxing du dernier flagship 2026", "Vaut-il vraiment son prix ? On regarde tout.", ["unboxing", "technologie"], 612, 210000, 0.82, ["#0b0c10", "#66fcf1", "#45a29e"], "TechNorth"),
  v("v007", "Les 10 meilleurs buts de la saison", "Compilation commentée, but par but.", ["foot", "sport"], 540, 178000, 0.9, ["#1b4332", "#40916c", "#d8f3dc"], "Ballon Rond"),
  v("v008", "Van life : 3 mois seul sur les routes du Québec", "Budget réel, galères et paysages.", ["vanlife", "voyage"], 980, 63000, 0.93, ["#3d5a80", "#98c1d9", "#e0fbfc"], "Route Ouverte"),
  v("v009", "Bourse 101 : comprendre un ETF en 8 minutes", "Les bases, sans jargon inutile.", ["bourse", "finance"], 480, 39900, 0.86, ["#14213d", "#fca311", "#e5e5e5"], "Capital Simple"),
  v("v010", "Sketch : la réunion qui ne finit jamais", "Toute ressemblance avec votre bureau est fortuite.", ["sketch", "humour"], 210, 411000, 0.96, ["#ffb703", "#fb8500", "#023047"], "Studio Rire"),
  v("v011", "Critique sans spoiler du dernier blockbuster", "Ce qui marche, ce qui traîne en longueur.", ["critiquefilm", "cinema"], 660, 92000, 0.79, ["#240046", "#5a189a", "#e0aaff"], "Salle Obscure"),
  v("v012", "GTA6 leaks : on trie le vrai du faux", "Analyse image par image des dernières fuites.", ["gta6", "gaming"], 500, 71000, 0.85, ["#3a7d44", "#1d3557", "#f1faee"], "Nova Games"),
  v("v013", "Mon chaton contre un rouleau de papier", "3 minutes de chaos absolu.", ["chaton", "animaux"], 180, 520000, 0.98, ["#f2e9e4", "#c9ada7", "#4a4e69"], "Poils & Compagnie"),
  v("v014", "Streetfood à Mexico : 5 stands à ne pas manquer", "Tacos, elote et bien plus.", ["streetfood", "cuisine"], 720, 66000, 0.92, ["#d62828", "#f77f00", "#fcbf49"], "Chef Mathis"),
  v("v015", "Beatmaking en direct : un morceau en 20 minutes", "De zéro à l'export, sans coupure.", ["beatmaking", "musique"], 1250, 28900, 0.9, ["#1a1a2e", "#16213e", "#e94560"], "Frequences"),
  v("v016", "IA générative : le point sur 2026", "Ce qui a vraiment changé cette année.", ["ia", "technologie"], 900, 133000, 0.83, ["#001219", "#005f73", "#94d2bd"], "TechNorth"),
  v("v017", "Hockey : les plus grosses mises en échec", "Compilation brute, saison régulière.", ["hockey", "sport"], 360, 145000, 0.88, ["#1d3557", "#a8dadc", "#f1faee"], "Ballon Rond"),
  v("v018", "Backpacking en Asie du Sud-Est : mon budget réel", "Chaque dollar dépensé, détaillé.", ["backpacking", "voyage"], 1040, 51200, 0.91, ["#2a9d8f", "#e9c46a", "#264653"], "Route Ouverte"),
  v("v019", "Crypto : 5 erreurs de débutant à éviter", "Pas de conseil financier, juste du bon sens.", ["crypto", "finance"], 540, 47800, 0.81, ["#7209b7", "#3a0ca3", "#f72585"], "Capital Simple"),
  v("v020", "Prank : fausse alerte extraterrestre au bureau", "Réactions non scriptées, montage complet.", ["prank", "humour"], 300, 389000, 0.94, ["#ffba08", "#faa307", "#03071e"], "Studio Rire"),
  v("v021", "Top 5 anime de la saison", "Nos coups de cœur, sans spoiler majeur.", ["anime", "cinema"], 780, 102000, 0.89, ["#e63946", "#1d3557", "#f1faee"], "Salle Obscure"),
  v("v022", "Speedrun Minecraft any% en 12 minutes", "Nouveau record personnel, run commentée.", ["minecraft", "speedrun", "gaming"], 720, 61000, 0.9, ["#4d908e", "#277da1", "#f9c74f"], "Nova Games"),
  v("v023", "Musculation : programme débutant sur 4 semaines", "Sans matériel, à faire à la maison.", ["musculation", "sport"], 660, 74300, 0.87, ["#118ab2", "#073b4c", "#ef476f"], "Ballon Rond"),
  v("v024", "Immobilier : acheter ou louer en 2026 ?", "Les chiffres, marché par marché.", ["immobilier", "finance"], 900, 33200, 0.8, ["#2b2d42", "#8d99ae", "#edf2f4"], "Capital Simple"),
  v("v025", "Fortnite : les nouveautés du chapitre", "Skins, carte, armes : tour d'horizon rapide.", ["fortnite", "gaming"], 480, 96000, 0.86, ["#7400b8", "#6930c3", "#5e60ce"], "Nova Games"),
  v("v026", "Roadtrip Gaspésie en 5 jours", "Itinéraire complet, arrêts incontournables.", ["roadtrip", "voyage"], 860, 58000, 0.93, ["#386641", "#6a994e", "#a7c957"], "Route Ouverte"),
  v("v027", "Piano : apprendre un morceau en 15 minutes", "Méthode simple pour débutants.", ["piano", "musique"], 900, 41200, 0.92, ["#264653", "#e9c46a", "#f4a261"], "Frequences"),
  v("v028", "Standup : 10 minutes sur le télétravail", "Extrait d'un spectacle complet.", ["standup", "humour"], 600, 152000, 0.91, ["#f77f00", "#d62828", "#003049"], "Studio Rire"),
  v("v029", "Programmation : construire une API en Python", "De zéro à un endpoint fonctionnel.", ["programmation", "technologie"], 1500, 48700, 0.88, ["#0a0a0a", "#00b4d8", "#90e0ef"], "TechNorth"),
  v("v030", "Aquarium : installer un premier bac planté", "Matériel, plantes, premiers poissons.", ["aquarium", "animaux"], 780, 29500, 0.94, ["#003049", "#669bbc", "#c1121f"], "Poils & Compagnie"),
];

function v(id, title, description, hashtags, duration, views, likeRatio, thumbnailColors, channel) {
  const likes = Math.round(views * likeRatio * 0.06);
  const dislikes = Math.round(likes * (1 - likeRatio) / likeRatio) || 1;
  return { id, title, description, hashtags, duration, views, likes, dislikes, thumbnailColors, channel };
}

function htvFormatViews(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + " M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + " k";
  return String(n);
}

function htvFormatDuration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function htvLikePercent(video) {
  const total = video.likes + video.dislikes;
  return total ? Math.round((video.likes / total) * 100) : 0;
}
