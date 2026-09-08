htvInitPage("video.html");

const params = new URLSearchParams(window.location.search);
const videoId = params.get("id") || HTV_VIDEOS[0].id;
const video = HTV_VIDEOS.find((v) => v.id === videoId) || HTV_VIDEOS[0];

document.getElementById("htv-video-title").textContent = video.title;
document.getElementById("htv-video-meta").innerHTML =
  `<span>${htvFormatViews(video.views)} vues</span><span>${htvLikePercent(video)}% 👍</span>`;
document.getElementById("htv-video-desc").innerHTML =
  `<p>${video.description}</p><div class="htv-card-tags">${video.hashtags.map((h) => `<span class="htv-tag">#${h}</span>`).join("")}</div>`;
document.getElementById("htv-channel-name").textContent = video.channel;
document.getElementById("like-count").textContent = htvFormatViews(video.likes);

const player = document.getElementById("htv-player");
const [c1, c2] = video.thumbnailColors;
player.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
player.innerHTML = `<span class="algo-text" style="color:#fff">Lecteur vidéo — source gofile chargée à la demande</span>`;

/* ---------------------- Gate visiteur non connecté ------------------------ */
const loggedIn = htvIsLoggedIn();
const MAX_ANON_SECONDS = 150; // 2 min 30
const MAX_ANON_RATIO = 0.5;
const anonLimit = Math.min(MAX_ANON_SECONDS, video.duration * MAX_ANON_RATIO);

if (!loggedIn) {
  document.getElementById("htv-login-gate").innerHTML = `
    <div class="htv-gate">
      Tu peux regarder jusqu'à ${htvFormatDuration(Math.round(anonLimit))} sans compte
      (50 % max, plafonné à 2 min 30). <a href="inscription.html" class="strong" style="color:var(--green)">Connecte-toi</a>
      pour aimer, commenter, t'abonner et débloquer la vidéo en entier.
    </div>`;
  ["btn-like", "btn-dislike", "btn-save", "btn-favorite", "btn-subscribe"].forEach((id) => {
    document.getElementById(id).disabled = true;
  });
  document.getElementById("htv-comment-form-slot").innerHTML = `<p class="algo-text">Connecte-toi pour commenter.</p>`;
} else {
  document.getElementById("htv-comment-form-slot").innerHTML = `
    <div class="field"><textarea rows="2" placeholder="Ajouter un commentaire…"></textarea></div>
    <button class="btn btn-primary">Commenter</button>`;
}

/* ------------------------------ Session algo ------------------------------ */
htvLoadCategoryMap().then(() => htvStartSession(video));

let simulatedPosition = 0;
const tick = setInterval(() => {
  if (!htvCurrentSession || htvCurrentSession.paused) return;
  simulatedPosition += 1;
  if (!loggedIn && simulatedPosition >= anonLimit) {
    simulatedPosition = anonLimit;
    htvSetPaused(true);
    clearInterval(tick);
  }
  htvUpdatePosition(simulatedPosition);
}, 1000);

document.getElementById("btn-like").addEventListener("click", (e) => {
  const active = e.currentTarget.classList.toggle("btn-primary");
  htvSetLiked(active);
  if (active) document.getElementById("btn-dislike").classList.remove("btn-primary");
});
document.getElementById("btn-dislike").addEventListener("click", (e) => {
  const active = e.currentTarget.classList.toggle("btn-primary");
  htvSetDisliked(active);
  if (active) document.getElementById("btn-like").classList.remove("btn-primary");
});
document.getElementById("btn-save").addEventListener("click", (e) => htvSetSaved(e.currentTarget.classList.toggle("btn-primary")));
document.getElementById("btn-favorite").addEventListener("click", (e) => htvSetFavorited(e.currentTarget.classList.toggle("btn-primary")));
document.getElementById("btn-share").addEventListener("click", () => { htvRegisterShare(); alert("Lien copié !"); });
document.getElementById("btn-subscribe").addEventListener("click", (e) => {
  const nowSubscribed = e.currentTarget.textContent === "S'abonner";
  e.currentTarget.textContent = nowSubscribed ? "Abonné" : "S'abonner";
  htvRegisterSubscriptionAction(nowSubscribed ? "subscribed" : "unsubscribed");
});

window.addEventListener("beforeunload", htvCloseSession);
window.addEventListener("pagehide", htvCloseSession);

/* ---------------------------- Vidéos "à suivre" ---------------------------- */
htvLoadCategoryMap().then(() => {
  const related = htvRankVideos(HTV_VIDEOS.filter((v) => v.id !== video.id)).slice(0, 6).map((r) => r.video);
  document.getElementById("htv-related").innerHTML = related.map((v) => `
    <a class="htv-card" href="video.html?id=${v.id}" style="flex-direction:row;gap:10px;align-items:center">
      <div class="htv-thumb" style="width:140px;flex-shrink:0">
        <div class="htv-thumb-gradient" style="background:linear-gradient(135deg, ${v.thumbnailColors[0]}, ${v.thumbnailColors[2]})"></div>
        <span class="htv-thumb-duration">${htvFormatDuration(v.duration)}</span>
      </div>
      <div>
        <div class="htv-card-title">${v.title}</div>
        <div class="htv-card-meta"><span>${v.channel}</span></div>
      </div>
    </a>`).join("");
});
