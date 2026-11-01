// ====== 一覧の型（描き方） ======
// works.html の実績一覧と自主制作の部が共通で使う。見た目は list.css。
// 部ごとに、データ（works.js / personal.js）と部の名前で renderList(データ, 名前) を呼ぶだけ。
// 名前が works なら、#works-list に並べて #works-count に件数を出す。
// 1件の項目は name / status / date / desc / tags / ytId / img / links（index.html の work スロットと同じ）。
// date（YYYY-MM-DD）は無くてよい。無い物は年を出さない。

function esc(s) {
  if (s == null) return "";
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML.replace(/\n/g, "<br>");
}
function ytB(id, customImg) {
  const c = id ? "yt" : "yt is-disabled";

  let bgStyle = "";
  if (customImg) {
    bgStyle = `style="background-image: url('${esc(customImg)}'); background-size: contain; background-position: center; background-repeat: no-repeat; background-color: transparent;"`;
  } else if (id) {
    bgStyle = `style="background-image: url('https://img.youtube.com/vi/${id}/hqdefault.jpg'); background-size: cover; background-position: center;"`;
  }

  const classStr = (customImg || id) ? `${c} has-img` : c;
  return `<div class="${classStr}" ${bgStyle} data-yt="${esc(id || '')}" ${id ? 'onclick="loadYT(this)"' : ''}><div class="yt-play"><svg width="12" height="12" viewBox="0 0 14 14" fill="none"><polygon points="3,1 13,7 3,13"/></svg></div></div>`;
}
// 番号の行に公開年を足している。サムネイルを左に、ほかを右にまとめる
function itemHTML(w) {
  const year = (w.date || "").slice(0, 4);
  const head = `<div class="whead"><span class="wnum">${String(w.n).padStart(2, '0')}</span>${year ? `<span class="wyear">${esc(year)}</span>` : ""}</div>`;
  const st = w.status ? `<div class="wmeta">${esc(w.status)}</div>` : "";
  const lk = (w.links || []).length > 0 ? `<div class="wlinks">${w.links.map((l) => (l.url ? `<a href="${esc(l.url)}" class="wlink" target="_blank">${esc(l.label)} →</a>` : `<span class="wghost">${esc(l.label)}</span>`)).join("")}</div>` : "";
  const tagsHtml = (w.tags || []).length > 0 ? `<div class="wtags">${w.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : "";

  let mediaHtml = "";
  if (w.ytId) {
    mediaHtml = ytB(w.ytId, w.img);
  } else if (w.img) {
    // has-img：メニューの反転中も、絵は元の色のまま（menu.js）
    mediaHtml = `<div class="thumb has-img" style="background-image: url('${esc(w.img)}')"></div>`;
  } else if ("ytId" in w) {
    mediaHtml = ytB("");
  }

  return `<li class="work${mediaHtml ? "" : " no-media"}">${mediaHtml}<div class="winfo">${head}<div class="wname">${esc(w.name || "")}</div>${st}<div class="wdesc">${esc(w.desc || "")}</div>${tagsHtml}${lk}</div></li>`;
}

// 新しい順に並べ、古い方から番号を振る（公開日の無い物は、書いた順のまま最後に並ぶ）
function renderList(items, key) {
  const list = items
    .map((w, i) => ({ ...w, _i: i }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a._i - b._i)
    .map((w, i, all) => ({ ...w, n: all.length - i }));
  document.getElementById(key + "-list").innerHTML = list.map(itemHTML).join("");

  const years = list.map((w) => (w.date || "").slice(0, 4)).filter(Boolean);
  const span = years.length ? (years[0] === years[years.length - 1] ? years[0] : `${years[years.length - 1]} — ${years[0]}`) : "";
  document.getElementById(key + "-count").textContent = `${String(list.length).padStart(2, "0")} works${span ? " · " + span : ""}`;
}

window.loadYT = (el) => {
  const id = el.dataset.yt;
  if (!id) return;
  el.closest(".work")?.classList.add("playing");
  el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" allow="autoplay;encrypted-media" allowfullscreen></iframe>`;
};
