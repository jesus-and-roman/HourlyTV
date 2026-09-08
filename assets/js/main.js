htvInitPage("index.html");
htvLoadCategoryMap().then(renderHome);

function htvCardHtml(video) {
  const [c1, c2, c3] = video.thumbnailColors;
  return `
    <a class="htv-card" href="video.html?id=${video.id}">
      <div class="htv-thumb">
        <div class="htv-thumb-gradient" style="background: linear-gradient(135deg, ${c1}, ${c2} 55%, ${c3})"></div>
        <span class="htv-thumb-duration">${htvFormatDuration(video.duration)}</span>
      </div>
      <div class="htv-card-title">${video.title}</div>
      <div class="htv-card-desc">${video.description.slice(0, 20)}${video.description.length > 20 ? "…" : ""}</div>
      <div class="htv-card-tags">${video.hashtags.slice(0, 2).map((h) => `<span class="htv-tag">#${h}</span>`).join("")}</div>
      <div class="htv-card-meta"><span>${htvFormatViews(video.views)} vues</span><span>${htvLikePercent(video)}% 👍</span></div>
    </a>`;
}

function renderHome() {
  const ranked = htvRankVideos(HTV_VIDEOS);
  const recoVideos = ranked.slice(0, 24).map((r) => r.video); // 6 lignes de 4
  const recoIds = new Set(recoVideos.map((v) => v.id));

  document.getElementById("htv-reco-grid").innerHTML = recoVideos.map(htvCardHtml).join("");

  function renderDomain() {
    const domainVideos = htvDomainShiftVideos(HTV_VIDEOS, recoIds, 4);
    document.getElementById("htv-domain-row").innerHTML = domainVideos.length
      ? domainVideos.map(htvCardHtml).join("")
      : `<div class="htv-empty">Pas assez d'historique pour identifier un nouveau domaine — regarde quelques vidéos pour débloquer cette section.</div>`;
  }
  function renderRandom() {
    const excluded = new Set([...recoIds]);
    document.querySelectorAll("#htv-domain-row .htv-card").forEach((el) => {
      const id = new URL(el.href).searchParams.get("id");
      excluded.add(id);
    });
    const randomVideos = htvRandomVideos(HTV_VIDEOS, excluded, 4);
    document.getElementById("htv-random-row").innerHTML = randomVideos.map(htvCardHtml).join("");
  }

  renderDomain();
  renderRandom();

  document.getElementById("htv-shuffle-domain").addEventListener("click", renderDomain);
  document.getElementById("htv-shuffle-random").addEventListener("click", renderRandom);
}
