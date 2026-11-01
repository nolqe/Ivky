// ====== 息吹：球・背景・操作盤 ======
// 球の上にパネルを貼り、背景の線（光・より線・リング）と、パネルどうしを結ぶ線を描く。下の操作盤で球の大きさ・遠近・揺れ・向きを変える。
// 実績一覧・自主制作・依頼・相談・旧版も、同じ球の上にある（置き場所は data.js の PLACES）。ページは移らない。
// ふだんの球（半径 R0）には、店先に出している物（win）だけが見えている。球が大きくなるにつれて、その間に残りの物が霞の中から現れる。
// 一覧を開く・閉じるのは、球の半径を動かすことと同じ。操作盤の RADIUS で大きくしても、同じように現れる。
// 時間はフレームで進む（呼吸・自動回転・慣性・色の巡り・飛び出し）。画面のリフレッシュレートによって速さが変わるのは、そのままにしてある。
// 描くのは 1 フレームに 1 回だけ。入力は状態（向き Q と値 P）を変えるだけで、step で状態を進め、render で描く。

// 球の値と向き。メニュー（menu.js）もここを読む
let P = {
  radiusBase: 520,
  radius: 520,
  perspective: 3000,
  friction: 0.995,
  speed: 1.2,
  lfoRate: 0,
  lfoAmp: 0,
  hue: 0,
  noise: 0,
};
let Q = [1, 0, 0, 0];
const IVKY = (window.IVKY = window.IVKY || {});
IVKY.P = P;
IVKY.getQ = () => Q;
IVKY.paused = false; // 旧版を映している間は、後ろの息吹を止めておく（archive.js）

(() => {
  const D = IVKY_DATA;
  const R0 = 520, // ふだんの球の半径
    R_STORE = 1040, // 一覧を開いたときの半径
    SHOW_A = 620, // 半径がここを超えると、一覧の物が現れはじめる
    SHOW_B = 960; // ここで現れきる
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t) => ((t = clamp(t, 0, 1)), t * t * (3 - 2 * t));
  const storeK = (r) => smooth((Math.abs(r) - SHOW_A) / (SHOW_B - SHOW_A));

  // ══════════════════ 四元数 [w,x,y,z] ══════════════════
  function qMul(a, b) {
    return [
      a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
      a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
      a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
      a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
    ];
  }
  function qN(q) {
    const l = Math.hypot(...q);
    return q.map((v) => v / l);
  }
  function qAx(x, y, z, a) {
    const s = Math.sin(a / 2),
      c = Math.cos(a / 2);
    return qN([c, x * s, y * s, z * s]);
  }
  function qM(q) {
    const [w, x, y, z] = q;
    return [
      1 - 2 * (y * y + z * z),
      2 * (x * y - w * z),
      2 * (x * z + w * y),
      2 * (x * y + w * z),
      1 - 2 * (x * x + z * z),
      2 * (y * z - w * x),
      2 * (x * z - w * y),
      2 * (y * z + w * x),
      1 - 2 * (x * x + y * y),
    ];
  }
  function mA(m, v) {
    return [
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
    ];
  }
  // 画面の横（dx）・縦（dy）の動きで球を回す
  function aR(dx, dy) {
    if (Math.abs(dx) > 1e-4) Q = qN(qMul(qAx(0, 1, 0, dx), Q));
    if (Math.abs(dy) > 1e-4) Q = qN(qMul(qAx(1, 0, 0, dy), Q));
  }
  function slerpQ(a, b, t) {
    let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (dot < 0) {
      b = b.map((v) => -v);
      dot = -dot;
    }
    if (dot > 0.9995) return qN(a.map((v, i) => v + t * (b[i] - v)));
    const theta = Math.acos(Math.min(1, dot)),
      sinT = Math.sin(theta),
      wa = Math.sin((1 - t) * theta) / sinT,
      wb = Math.sin(t * theta) / sinT;
    return qN(a.map((v, i) => v * wa + b[i] * wb));
  }
  const lonOf = (q) => Math.atan2(2 * (q[0] * q[2] + q[1] * q[3]), 1 - 2 * (q[2] * q[2] + q[3] * q[3]));
  const latOf = (q) => Math.asin(clamp(2 * (q[0] * q[1] - q[3] * q[2]), -1, 1));

  // ══════════════════ パネルの中身 ══════════════════
  function esc(s) {
    if (s == null) return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML.replace(/\n/g, "<br>");
  }
  const pad2 = (n) => String(n).padStart(2, "0");
  // 属性に入れる文字。改行は改行のまま残す（依頼テンプレートのコピーで、改行が <br> にならないように）
  const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/\n/g, "&#10;");
  const PLAY = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><polygon points="3,1 13,7 3,13"/></svg>`;
  // 画像。一覧の物（lazy）は、球の上に現れるまで読み込まない
  const img = (src, cls, lazy) => `<img class="${cls}" alt="" decoding="async" ${lazy ? "data-src" : "src"}="${esc(src)}">`;
  // 動画の入口。サムネイルは大きい物を読み、無い動画（120px の灰色が返る）は中くらいの物に替える
  function ytB(id, lazy) {
    if (!id) return `<div class="yt is-disabled"><div class="yt-play">${PLAY}</div></div>`;
    return `<div class="yt has-img" data-yt="${esc(id)}" role="button" tabindex="0" aria-label="動画を再生">${img(`https://img.youtube.com/vi/${id}/maxresdefault.jpg`, "yt-img", lazy)}<div class="yt-play">${PLAY}</div></div>`;
  }
  const links = (ls) =>
    (ls || []).length
      ? `<div class="wlinks">${ls.map((l) => (l.url ? `<a href="${esc(l.url)}" class="wlink" target="_blank" rel="noopener">${esc(l.label)} →</a>` : `<span class="wghost">${esc(l.label)}</span>`)).join("")}</div>`
      : "";
  const tags = (ts) => ((ts || []).length ? `<div class="wtags">${ts.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : "");

  // 実績一覧の番号は、公開日の古い方から
  const workNo = new Map(
    D.WORKS.map((w, i) => ({ w, i }))
      .sort((a, b) => (a.w.date || "").localeCompare(b.w.date || "") || a.i - b.i)
      .map(({ w }, k) => [w.id, k + 1]),
  );
  const ITEMS = new Map();
  D.WORKS.forEach((w) => ITEMS.set(w.id, { kind: "work", ...w, no: workNo.get(w.id) }));
  D.PERSONAL.forEach((w) => ITEMS.set(w.id, { kind: w.kind || "work", ...w }));
  ITEMS.set("title", { kind: "pole", name: D.TITLE.name, sub: D.TITLE.sub });
  ITEMS.set("icon", { kind: "note", img: D.ICON });
  ITEMS.set("home", { kind: "home", ...D.HOME });
  ITEMS.set("works", { kind: "works" });
  ITEMS.set("price", { kind: "price" });
  ITEMS.set("poem", { kind: "filler", lines: D.POEM });
  ITEMS.set("contact", { kind: "contact" });
  ITEMS.set("reach", { kind: "pole", name: `Discord : ${D.CONTACT.discord}`, sub: D.CONTACT.mail });
  ITEMS.set("archive", { kind: "archive" });

  const yearSpan = (list) => {
    const ys = list.map((w) => (w.date || "").slice(0, 4)).filter(Boolean).sort();
    return ys.length ? (ys[0] === ys[ys.length - 1] ? ys[0] : `${ys[0]} — ${ys[ys.length - 1]}`) : "";
  };

  function html(s, lazy) {
    switch (s.kind) {
      case "pole":
        return `<div class="pole-card"><div class="pole-name">${esc(s.name)}</div><div class="pole-sub">${esc(s.sub)}</div><div class="pole-line"></div></div>`;
      case "home": {
        const chips = (s.chips || []).length ? `<div class="chips">${s.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : "";
        const sign = s.signImg ? img(s.signImg, "sign-img", lazy) : "";
        return `<div style="max-width:320px"><div class="home-header"><h1>${esc(s.name)}</h1>${sign}</div><div class="sub">${esc(s.handle)} — ${esc(s.role)}</div><p class="lead">${esc(s.lead)}</p>${chips}</div>`;
      }
      case "work": {
        const year = (s.date || "").slice(0, 4);
        const head = `<div class="whead"><span class="wnum">${s.no ? pad2(s.no) : ""}</span>${year ? `<span class="wyear">${esc(year)}</span>` : ""}</div>`;
        const st = s.status ? `<div class="wmeta">${esc(s.status)}</div>` : "";
        const media = s.ytId ? ytB(s.ytId, lazy) : s.img ? img(s.img, "work-img", lazy) : "ytId" in s ? ytB("") : "";
        return `<div class="work-card">${head}<div class="wname">${esc(s.name)}</div>${st}<div class="wdesc">${esc(s.desc || "")}</div>${tags(s.tags)}${media}${links(s.links)}</div>`;
      }
      case "works": {
        const span = yearSpan(D.WORKS);
        return `<div class="work-card"><div class="wnum">WORKS</div><div class="wname">実績一覧</div><div class="wmeta">${pad2(D.WORKS.length)} works${span ? " · " + esc(span) : ""}</div><div class="wlinks"><button type="button" class="wlink" data-act="toggle">一覧を見る →</button></div></div>`;
      }
      case "archive":
        return `<div class="work-card"><div class="wnum">ARCHIVE</div><div class="wname">旧版</div><div class="wmeta">${pad2(D.VERSIONS.length)} versions</div><div class="wlinks">${D.VERSIONS.map((v) => `<button type="button" class="wlink" data-arc="${esc(v.id)}">${esc(v.label)} の版 →</button>`).join("")}</div></div>`;
      case "note": {
        const link = s.url ? `<a href="${esc(s.url)}" class="nlink" target="_blank" rel="noopener">${esc(s.linkLabel || "リンクを開く →")}</a>` : "";
        return `<div class="note-stack"><div class="note-item"><span class="ntitle">${esc(s.title || "")}</span>${s.meta ? `<div class="nmeta">${esc(s.meta)}</div>` : ""}${s.img ? img(s.img, "note-img", lazy) : ""}${link}</div></div>`;
      }
      case "price":
        return (
          `<div><div class="sec-head">料金目安</div><div class="price-stack">` +
          D.PRICE.map((p) =>
            p.isGroup
              ? `<div class="pr-block"><div class="pr-group-name">${esc(p.name)}</div><div class="pr-sub-list">${(p.subs || []).map((sub) => `<div class="pr-sub-row"><div class="pr-sub-amt">${esc(sub.amount)}</div><div class="pr-sub-desc">${esc(sub.desc)}</div></div>`).join("")}</div></div>`
              : `<div class="pr-block"><div class="pr-single-row"><div class="pr-single-name">${esc(p.name)}</div><div class="pr-single-amt">${esc(p.amount)}</div></div></div>`,
          ).join("") +
          `</div></div>`
        );
      case "contact": {
        const c = D.CONTACT,
          tpl = c.template || [];
        const tb = tpl.map((t) => `<div class="tpl-row"><span class="tpl-lbl">${esc(t.label)}</span><span class="tpl-val">${esc(t.ph)}</span></div>`).join("");
        const tp = tpl.map((t) => t.label + "：").join("\n");
        return `<div><div class="sec-head">Contact</div><div class="contact-w"><p class="clead">${esc(c.lead)}</p><a href="${esc(c.dmUrl || "#")}" class="dmlink" target="_blank" rel="noopener">${esc(c.dmLabel || "DMを送る →")}</a><div class="tpl"><div class="tpl-label">依頼テンプレート（任意）</div><div class="tpl-body">${tb}</div><button type="button" class="cbtn" data-tpl="${attr(tp)}">コピーする ↗</button></div></div></div>`;
      }
      case "filler":
        return `<div class="filler-card"><div class="filler-text">${(s.lines || []).map(esc).join("<br>")}</div></div>`;
      default:
        return "";
    }
  }

  // ══════════════════ 球 ══════════════════
  const app = document.getElementById("app"),
    globe = document.getElementById("globe"),
    vp = document.getElementById("sphere-vp");
  globe.style.transform = "translate(-50%,-50%)";
  const DEG = Math.PI / 180;
  const panels = D.PLACES.map((pl) => {
    const it = ITEMS.get(pl.id);
    if (!it) throw new Error(`data.js の PLACES にある "${pl.id}" が見つからない`);
    const lon = pl.lon * DEG,
      bp = [Math.cos(pl.lat) * Math.sin(lon), Math.sin(pl.lat), Math.cos(pl.lat) * Math.cos(lon)];
    const el = document.createElement("div");
    el.className = "panel";
    el.dataset.id = pl.id;
    el.innerHTML = `<div class="panel-inner">${html(it, !pl.win)}</div>`;
    globe.appendChild(el);
    return { id: pl.id, el, bp, win: !!pl.win, loaded: !!pl.win, vis: pl.win ? 1 : 0, s: {} };
  });
  const byId = new Map(panels.map((p) => [p.id, p]));
  // 一覧の物の画像は、球の上に現れはじめたときに読み込む
  function load(p) {
    p.loaded = true;
    p.el.querySelectorAll("img[data-src]").forEach((im) => {
      im.src = im.dataset.src;
      im.removeAttribute("data-src");
    });
  }
  // 大きいサムネイルが無い動画は、120px の灰色が返ってくる。そのときは中くらいの物にする
  // それも読めなければ、画像は出さずに地の色のままにする（壊れた画像の印を出さない）
  const hq = (im) => {
    const m = /\/vi\/([^/]+)\/maxresdefault/.exec(im.src);
    if (m) im.src = `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
    else im.style.visibility = "hidden";
  };
  globe.addEventListener("load", (e) => e.target.matches?.("img.yt-img") && e.target.naturalWidth <= 120 && hq(e.target), true);
  globe.addEventListener("error", (e) => e.target.matches?.("img") && (e.target.matches("img.yt-img") ? hq(e.target) : (e.target.style.visibility = "hidden")), true);

  // パネルどうしを結ぶ線：球の上で近い（56° くらいまで）組。一覧の物を結ぶ線は、その物と一緒に現れる
  const edges = [];
  for (let i = 0; i < panels.length; i++)
    for (let j = i + 1; j < panels.length; j++) {
      const a = panels[i].bp,
        b = panels[j].bp;
      if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] > 0.55) edges.push([i, j]);
    }

  // ── 押したとき ──
  function copyText(s) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(s);
    return new Promise((ok, ng) => {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.style.cssText = "position:fixed;opacity:0;user-select:text;-webkit-user-select:text";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy") ? ok() : ng();
      } catch (er) {
        ng(er);
      }
      ta.remove();
    });
  }
  function play(yt) {
    const id = yt.dataset.yt;
    if (!id) return;
    yt.className = "yt playing";
    yt.removeAttribute("data-yt");
    yt.removeAttribute("role");
    yt.removeAttribute("tabindex");
    yt.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  }
  let clkX = 0,
    clkY = 0;
  globe.addEventListener("pointerdown", (e) => {
    clkX = e.clientX;
    clkY = e.clientY;
  });
  globe.addEventListener("click", (e) => {
    const t = e.target;
    const cb = t.closest(".cbtn[data-tpl]");
    if (cb)
      return void copyText(cb.dataset.tpl).then(() => {
        cb.textContent = "コピーしました ✓";
        setTimeout(() => (cb.textContent = "コピーする ↗"), 1500);
      }, () => {});
    const yt = t.closest(".yt[data-yt]");
    if (yt) return play(yt);
    if (t.closest("[data-act=toggle]")) return toggleStore();
    const av = t.closest("[data-arc]");
    if (av) {
      const v = D.VERSIONS.find((x) => x.id === av.dataset.arc);
      if (v && IVKY.archive) IVKY.archive.open(v);
      return;
    }
    // パネルのほかの所を押すと、そのパネルが正面に来る（動かした後の click は除く）
    if (Math.hypot(e.clientX - clkX, e.clientY - clkY) > 5) return;
    if (t.closest("a, button, iframe")) return;
    const panel = t.closest(".panel");
    if (panel) focusPanel(byId.get(panel.dataset.id));
  });
  globe.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".yt[data-yt]")) {
      e.preventDefault();
      play(e.target);
    }
  });

  // ── 向きを変える：正面へ・一覧を開く・閉じる ──
  let anim = null, // 向き（と半径）を目当てまで動かしている間
    inertia = null; // 手を離した後の惰性
  // パネル p を正面に向ける向き
  function faceQ(p) {
    const w = mA(qM(Q), p.bp),
      axLen = Math.hypot(w[1], w[0]);
    const angle = Math.acos(clamp(w[2], -1, 1));
    if (angle < 0.05) return Q.slice();
    if (axLen < 1e-3) return qN(qMul(qAx(0, 1, 0, Math.PI), Q));
    return qN(qMul(qAx(w[1] / axLen, -w[0] / axLen, 0, angle), Q));
  }
  function animate(q1, r1, dur) {
    inertia = null;
    anim = { t0: performance.now(), dur: reduce ? 0 : dur, q0: Q.slice(), q1, r0: P.radiusBase, r1 };
    resetIdle();
  }
  function focusPanel(p) {
    if (p) animate(faceQ(p), P.radiusBase, 650);
  }
  const isOpen = () => storeK(P.radiusBase) > 0.5;
  // 行き先：home（息吹）・works・personal・request・archive
  function go(act) {
    const p = byId.get(D.ANCHOR[act]);
    if (!p) return;
    let r1 = P.radiusBase;
    const sign = P.radiusBase < 0 ? -1 : 1;
    if (act === "home") r1 = R0;
    else if (!p.win && Math.abs(P.radiusBase) < R_STORE * 0.9) r1 = sign * R_STORE;
    animate(faceQ(p), r1, r1 !== P.radiusBase ? 1100 : 650);
    setHash(act === "home" ? "" : act);
  }
  // 実績一覧の札：開いていなければ一覧を開き、開いていれば閉じて札を正面に置く
  function toggleStore() {
    if (isOpen()) {
      animate(faceQ(byId.get("works")), R0, 1100);
      setHash("");
    } else go("works");
  }
  function setHash(h) {
    try {
      history.replaceState(null, "", h ? `#${h}` : location.pathname + location.search);
    } catch {}
  }

  // ══════════════════ 背景 ══════════════════
  const bgC = document.getElementById("bg"),
    bx = bgC.getContext("2d"),
    conC = document.getElementById("connections"),
    conX = conC.getContext("2d");
  let BW = 1,
    BH = 1,
    hP = 0;
  const hsl = (h, s, l, a) => `hsla(${h},${s}%,${l}%,${a})`;
  function drawBg() {
    const dpr = devicePixelRatio || 1,
      W = BW,
      H = BH;
    bx.clearRect(0, 0, W, H);
    const cx = W / 2,
      cy = H / 2,
      mn = Math.min(W, H),
      h = P.hue,
      ns = P.noise,
      nj = () => ns * (Math.random() - 0.5) * mn * 0.02;
    const rN = P.radius / 520,
      rateN = P.lfoRate,
      ampN = P.lfoAmp;
    const hAmp = mn * (0.12 + Math.min(Math.abs(rateN), 4) * 0.06),
      hDir = rateN >= 0 ? 1 : -1,
      hTurns = Math.abs(rateN) * 1.2;
    // 遠近 → リングの傾き：persp(-300..8000) を 0.8..-0.2 に写す
    const pNorm = (P.perspective + 300) / (8000 + 300),
      ringTiltBase = 0.8 - pNorm * 1.0;
    const ringR = mn * (0.15 + Math.min(Math.abs(rN), 2.5) * 0.1),
      ringNeg = rN < 0;
    const bA = 0.42 + Math.min(Math.abs(ampN), 2) * 0.2;
    // 光
    const gR = mn * (0.35 + Math.abs(rN) * 0.12);
    const glow = bx.createRadialGradient(cx, cy, mn * 0.04, cx, cy, gR);
    glow.addColorStop(0, hsl(h, 20, 92, 0));
    glow.addColorStop(0.3, hsl(h, 30, 78, 0.22 + Math.abs(ampN) * 0.1));
    glow.addColorStop(0.7, hsl(h, 20, 85, 0.12));
    glow.addColorStop(1, hsl(h, 10, 95, 0));
    bx.fillStyle = glow;
    bx.fillRect(0, 0, W, H);
    // より線
    for (let s = 0; s < 2; s++) {
      const off = s * Math.PI;
      bx.beginPath();
      for (let i = 0; i <= 260; i++) {
        const t = i / 260,
          y = (t - 0.5) * H * 1.2 + cy + nj(),
          a = hTurns > 0.01 ? t * hTurns * Math.PI * 2 * hDir + hP * 0.42 + off : off,
          x = cx + Math.sin(a) * hAmp + nj();
        i === 0 ? bx.moveTo(x, y) : bx.lineTo(x, y);
      }
      bx.strokeStyle = hsl(h + s * 15, 18, 72, s === 0 ? bA : bA * 0.7);
      bx.lineWidth = dpr * (1.3 + s * 0.2);
      bx.stroke();
    }
    // 横木
    const rc = Math.max(8, Math.round(12 + Math.abs(rateN) * 5));
    for (let i = 0; i < rc; i++) {
      const t = (i + 0.5) / rc,
        y = (t - 0.5) * H * 1.2 + cy,
        a1 = hTurns > 0.01 ? t * hTurns * Math.PI * 2 * hDir + hP * 0.42 : 0,
        a2 = a1 + Math.PI,
        avg = (Math.cos(a1) + Math.cos(a2)) / 2;
      if (avg > -0.55) {
        bx.beginPath();
        bx.moveTo(cx + Math.sin(a1) * hAmp + nj(), y + nj());
        bx.lineTo(cx + Math.sin(a2) * hAmp + nj(), y + nj());
        bx.strokeStyle = hsl(h + 10, 12, 76, 0.06 + (avg + 1) * 0.07);
        bx.lineWidth = dpr * 0.7;
        bx.stroke();
      }
    }
    // リング：斜めに置き、遠近で傾く
    const phase = hP * 0.15;
    bx.save();
    bx.translate(cx, cy);
    bx.rotate(0.52);
    for (let ring = 0; ring < 3; ring++) {
      const sc = 0.92 + ring * 0.1,
        ti = ringTiltBase * (1 - ring * 0.08) * (ringNeg ? -1 : 1);
      const alpha = ringNeg ? 0.28 + ring * 0.04 : 0.18 + Math.abs(rN) * 0.06 - ring * 0.02;
      const rH = ringNeg ? h + 180 : h + ring * 8;
      bx.beginPath();
      bx.setLineDash(ringNeg ? [dpr * 6, dpr * 4] : []);
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2 + phase + ring * 0.2,
          rx = Math.cos(a) * ringR * sc + nj(),
          ry = Math.sin(a) * ringR * sc * ti + nj();
        i === 0 ? bx.moveTo(rx, ry) : bx.lineTo(rx, ry);
      }
      bx.closePath();
      bx.strokeStyle = hsl(rH, 15, 74, alpha);
      bx.lineWidth = dpr * (ring === 0 ? 1.8 : ring === 1 ? 1.2 : 0.6);
      bx.stroke();
    }
    bx.setLineDash([]);
    bx.restore();
  }
  function drawConnections(pw, r) {
    const dpr = devicePixelRatio || 1,
      W = BW,
      H = BH;
    conX.clearRect(0, 0, W, H);
    const cx = W / 2,
      cy = H / 2,
      h = P.hue;
    const proj = pw.map((w) => ({ x: cx + w[0] * r * dpr, y: cy - w[1] * r * dpr, wz: w[2] }));
    conX.lineWidth = dpr * 1.1;
    for (const [i, j] of edges) {
      // 一覧の物につながる線は、店先どうしの線の半分の濃さ（球が大きくなると線が長く伸びるので）
      const a = proj[i],
        b = proj[j],
        v = Math.min(panels[i].vis, panels[j].vis) * (panels[i].win && panels[j].win ? 1 : 0.5);
      if (v < 0.01) continue;
      const minZ = Math.min(a.wz, b.wz);
      if (minZ < -0.3) continue;
      const alpha = Math.max(0, Math.min(0.35, (minZ + 0.3) * 0.55)) * v;
      conX.beginPath();
      conX.moveTo(a.x, a.y);
      conX.lineTo(b.x, b.y);
      conX.strokeStyle = `hsla(${h + 15},18%,62%,${alpha.toFixed(3)})`;
      conX.stroke();
      for (const p of [a, b])
        if (p.wz > 0.1) {
          conX.beginPath();
          conX.arc(p.x, p.y, dpr * 2.2, 0, Math.PI * 2);
          conX.fillStyle = `hsla(${h + 15},18%,62%,${(alpha * 0.7).toFixed(3)})`;
          conX.fill();
        }
    }
  }

  // ══════════════════ トラックボール ══════════════════
  const tbC = document.getElementById("tb-canvas"),
    tx = tbC.getContext("2d");
  let tbQ = null; // 最後に描いたときの向き（変わっていなければ描き直さない）
  function drawTb() {
    if (tbQ && tbQ[0] === Q[0] && tbQ[1] === Q[1] && tbQ[2] === Q[2] && tbQ[3] === Q[3]) return;
    tbQ = Q.slice();
    const s = tbC.width / 2,
      cx = s,
      cy = s,
      r = s * 0.82,
      mat = qM(Q);
    tx.clearRect(0, 0, s * 2, s * 2);
    tx.beginPath();
    tx.arc(cx, cy, r, 0, Math.PI * 2);
    tx.fillStyle = "#f0f0ee";
    tx.fill();
    tx.strokeStyle = "#d0d0cc";
    tx.lineWidth = 1;
    tx.stroke();
    const lines = [[], [], []];
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      lines[0].push([Math.cos(a), 0, Math.sin(a)]);
      lines[1].push([0, Math.cos(a), Math.sin(a)]);
      lines[2].push([Math.cos(a), Math.sin(a), 0]);
    }
    ["rgba(24,24,22,0.12)", "rgba(24,24,22,0.08)", "rgba(24,24,22,0.08)"].forEach((col, li) => {
      tx.beginPath();
      let st = false;
      lines[li].forEach((p) => {
        const [wx, wy, wz] = mA(mat, p),
          x = cx + wx * r * 0.85,
          y = cy - wy * r * 0.85;
        if (wz > -0.1) {
          if (!st) {
            tx.moveTo(x, y);
            st = true;
          } else tx.lineTo(x, y);
        } else st = false;
      });
      tx.strokeStyle = col;
      tx.lineWidth = 1.2;
      tx.stroke();
    });
    tx.beginPath();
    tx.arc(cx, cy, 3, 0, Math.PI * 2);
    tx.fillStyle = "rgba(24,24,22,0.5)";
    tx.fill();
  }

  // ══════════════════ 経度・緯度のダイヤル ══════════════════
  ["sd-x", "sd-y"].forEach((id) => {
    const g = document.getElementById(id + "-knurl");
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2,
        l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", 24 + 19 * Math.cos(a));
      l.setAttribute("y1", 24 + 19 * Math.sin(a));
      l.setAttribute("x2", 24 + 21 * Math.cos(a));
      l.setAttribute("y2", 24 + 21 * Math.sin(a));
      l.setAttribute("stroke", "#d0d0cc");
      l.setAttribute("stroke-width", "0.3");
      g.appendChild(l);
    }
  });
  let lfoLon = false,
    lfoLat = false;
  const lonVal = document.getElementById("sd-x-val"),
    latVal = document.getElementById("sd-y-val");
  const showLon = () => (lonVal.textContent = Math.round((lonOf(Q) * 180) / Math.PI) + "°");
  const showLat = () => (latVal.textContent = Math.round((latOf(Q) * 180) / Math.PI) + "°");
  const SD = [
    { id: "sd-x", ap: (d) => (aR(-d * 0.02, 0), showLon()), getLfo: () => lfoLon, setLfo: (v) => (lfoLon = v) },
    { id: "sd-y", ap: (d) => (aR(0, d * 0.02), showLat()), getLfo: () => lfoLat, setLfo: (v) => (lfoLat = v) },
  ];
  const sdAngle = (svg, e) => {
    const r = svg.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const needle = (sd) => sd.ndl.setAttribute("transform", `rotate(${sd.na.toFixed(1)},24,24)`);
  SD.forEach((sd) => {
    sd.sv = document.getElementById(sd.id + "-svg");
    sd.ndl = document.getElementById(sd.id + "-needle");
    sd.na = 0;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lfo-btn";
    btn.textContent = "LFO";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const nv = !sd.getLfo();
      sd.setLfo(nv);
      btn.classList.toggle("active", nv);
    });
    sd.sv.closest(".sub-dial-ch").appendChild(btn);
    sd.sv.addEventListener("pointerdown", (e) => {
      startDrag("dial", e, { sd, a0: sdAngle(sd.sv, e) });
      e.preventDefault();
    });
    document.getElementById(sd.id).addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const d = e.deltaY > 0 ? 5 : -5;
        sd.na += d * 3;
        needle(sd);
        sd.ap(d);
      },
      { passive: false },
    );
  });

  // ══════════════════ XY パッド ══════════════════
  // 値が変わったときだけ描き直す。ダブルクリックで、負にもなる値を 0 に戻す
  function createPad(id, xDef, yDef) {
    const cv = document.getElementById(id),
      cx = cv.getContext("2d");
    const pad = { cv, xDef, yDef, lx: NaN, ly: NaN, dirty: true };
    pad.resize = () => {
      const dpr = devicePixelRatio || 1,
        w = Math.max(1, Math.round(cv.offsetWidth * dpr)),
        h = Math.max(1, Math.round(cv.offsetHeight * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      pad.dirty = true;
    };
    pad.draw = () => {
      const x = xDef.get(),
        y = yDef.get();
      if (!pad.dirty && x === pad.lx && y === pad.ly) return;
      pad.lx = x;
      pad.ly = y;
      pad.dirty = false;
      const dpr = devicePixelRatio || 1,
        w = cv.width,
        h = cv.height;
      cx.clearRect(0, 0, w, h);
      cx.fillStyle = "rgba(240,240,238,0.7)";
      cx.fillRect(0, 0, w, h);
      const zx = ((0 - xDef.min) / (xDef.max - xDef.min)) * w,
        zy = (1 - (0 - yDef.min) / (yDef.max - yDef.min)) * h;
      cx.strokeStyle = "rgba(24,24,22,0.1)";
      cx.lineWidth = dpr * 0.8;
      if (xDef.min < 0 && xDef.max > 0) {
        cx.beginPath();
        cx.moveTo(zx, 0);
        cx.lineTo(zx, h);
        cx.stroke();
      }
      if (yDef.min < 0 && yDef.max > 0) {
        cx.beginPath();
        cx.moveTo(0, zy);
        cx.lineTo(w, zy);
        cx.stroke();
      }
      cx.strokeStyle = "rgba(212,212,208,0.2)";
      cx.lineWidth = dpr * 0.3;
      for (let i = 1; i < 4; i++) {
        cx.beginPath();
        cx.moveTo((w * i) / 4, 0);
        cx.lineTo((w * i) / 4, h);
        cx.stroke();
        cx.beginPath();
        cx.moveTo(0, (h * i) / 4);
        cx.lineTo(w, (h * i) / 4);
        cx.stroke();
      }
      const dx = ((x - xDef.min) / (xDef.max - xDef.min)) * w,
        dy = (1 - (y - yDef.min) / (yDef.max - yDef.min)) * h;
      cx.setLineDash([dpr * 2, dpr * 2]);
      cx.strokeStyle = "rgba(24,24,22,0.08)";
      cx.lineWidth = dpr * 0.4;
      cx.beginPath();
      cx.moveTo(dx, 0);
      cx.lineTo(dx, h);
      cx.moveTo(0, dy);
      cx.lineTo(w, dy);
      cx.stroke();
      cx.setLineDash([]);
      cx.beginPath();
      cx.arc(dx, dy, dpr * 4, 0, Math.PI * 2);
      cx.fillStyle = "rgba(24,24,22,0.6)";
      cx.fill();
      cx.font = `${dpr * 7}px 'DM Mono',monospace`;
      cx.fillStyle = "rgba(24,24,22,0.3)";
      cx.textAlign = "right";
      cx.fillText(xDef.fmt(x), w - dpr * 2, h - dpr * 2);
      cx.textAlign = "left";
      cx.fillText(yDef.fmt(y), dpr * 2, dpr * 8);
    };
    // 0 の近く（幅の 3%）は 0 に吸い付く
    const snap = (d, v) => (d.min < 0 && d.max > 0 && Math.abs(v) < (d.max - d.min) * 0.03 ? 0 : v);
    pad.set = (e) => {
      const r = cv.getBoundingClientRect();
      xDef.set(snap(xDef, xDef.min + clamp((e.clientX - r.left) / r.width, 0, 1) * (xDef.max - xDef.min)));
      yDef.set(snap(yDef, yDef.max - clamp((e.clientY - r.top) / r.height, 0, 1) * (yDef.max - yDef.min)));
    };
    cv.addEventListener("pointerdown", (e) => {
      startDrag("pad", e, { pad, keep: true });
      pad.set(e);
      e.preventDefault();
      e.stopPropagation();
    });
    cv.addEventListener("dblclick", () => {
      if (xDef.min < 0) xDef.set(0);
      if (yDef.min < 0) yDef.set(0);
    });
    return pad;
  }
  const fmt = (k, d) => (v) => k + ":" + (v >= 0 ? "+" : "") + (d ? v.toFixed(d) : Math.round(v));
  const pads = [
    createPad(
      "padL-c",
      { min: -1200, max: 1200, get: () => P.radiusBase, set: (v) => ((anim = null), (P.radiusBase = v)), fmt: fmt("R") },
      { min: -1000, max: 5000, get: () => P.perspective, set: (v) => (P.perspective = v), fmt: fmt("P") },
    ),
    createPad(
      "padR-c",
      { min: -4, max: 4, get: () => P.lfoRate, set: (v) => (P.lfoRate = v), fmt: fmt("R", 1) },
      { min: -2, max: 2, get: () => P.lfoAmp, set: (v) => (P.lfoAmp = v), fmt: fmt("A", 1) },
    ),
  ];

  // ══════════════════ 手の動き ══════════════════
  // 球の面・トラックボール・ダイヤル・パッドを持って動かす。指でもマウスでも同じ（ポインタ）。持てるのは一度に 1 つ
  let drag = null,
    lastInteract = performance.now(),
    vpW = 1,
    tbW = 90;
  const resetIdle = () => (lastInteract = performance.now());
  function startDrag(kind, e, extra) {
    if (drag) return;
    drag = { kind, id: e.pointerId, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0, ...extra };
    anim = null;
    if (!extra || !extra.keep) inertia = null;
    resetIdle();
  }
  vp.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    if (e.target.closest(".panel-inner a, .panel-inner button, .panel-inner .yt, .panel-inner iframe")) return;
    startDrag("vp", e);
    e.preventDefault();
  });
  tbC.addEventListener("pointerdown", (e) => {
    startDrag("tb", e);
    e.preventDefault();
  });
  addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now(),
      dx = e.clientX - drag.lx,
      dy = e.clientY - drag.ly,
      dt = now - drag.lt;
    if (dt > 0) {
      drag.vx = dx / dt;
      drag.vy = dy / dt;
    }
    drag.lx = e.clientX;
    drag.ly = e.clientY;
    drag.lt = now;
    if (drag.kind === "vp") {
      const s = (Math.PI * 0.4) / vpW;
      aR(dx * s, -dy * s);
    } else if (drag.kind === "tb") {
      const s = Math.PI / (tbW * 1.5);
      aR(-dx * s, dy * s);
    } else if (drag.kind === "dial") {
      const a = sdAngle(drag.sd.sv, e);
      let d = a - drag.a0;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      drag.a0 = a;
      drag.sd.na += d;
      needle(drag.sd);
      drag.sd.ap(d);
    } else if (drag.kind === "pad") drag.pad.set(e);
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    // 離したときの速さが残っていれば、惰性で回り続ける（摩擦はフレームごと）
    if (Math.abs(d.vx) > 0.05 || Math.abs(d.vy) > 0.05) {
      if (d.kind === "vp") inertia = { vx: d.vx * 8, vy: d.vy * 8, s: (Math.PI * 0.4) / vpW, sx: 1, sy: -1, min: 0.2 };
      else if (d.kind === "tb") inertia = { vx: d.vx * 6, vy: d.vy * 6, s: Math.PI / (tbW * 1.5), sx: -1, sy: 1, min: 0.15 };
    }
  }
  addEventListener("pointerup", endDrag);
  addEventListener("pointercancel", endDrag);
  addEventListener("pointerdown", resetIdle);
  vp.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      resetIdle();
      inertia = anim = null;
      const s = (Math.PI * 0.3) / vpW;
      aR(e.deltaY * P.speed * s, -e.deltaX * P.speed * s);
    },
    { passive: false },
  );
  // ← → ↑ ↓ で回す（メニューのダイヤルを選んでいる間は、ダイヤルの向きが変わるので除く）
  addEventListener("keydown", (e) => {
    const t = e.target;
    if (t.closest && t.closest("input, textarea, .orb-entry, .orb-labels")) return;
    resetIdle();
    const step = 0.12,
      m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!m) return;
    inertia = anim = null;
    aR(m[0], m[1]);
    e.preventDefault();
  });

  // ══════════════════ 大きさ ══════════════════
  function resize() {
    const dpr = devicePixelRatio || 1;
    BW = Math.max(1, Math.round(app.clientWidth * dpr));
    BH = Math.max(1, Math.round(app.clientHeight * dpr));
    for (const c of [bgC, conC])
      if (c.width !== BW || c.height !== BH) {
        c.width = BW;
        c.height = BH;
      }
    vpW = vp.offsetWidth || app.clientWidth || 1;
    tbW = tbC.getBoundingClientRect().width || 90;
    pads.forEach((p) => p.resize());
  }
  addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(app);
  if (document.fonts) document.fonts.ready.then(() => pads.forEach((p) => (p.dirty = true)));
  resize();

  // ══════════════════ 進める（1 フレームぶん） ══════════════════
  let lfoT = 0,
    introT = reduce ? 1 : 0;
  function step(now) {
    lfoT += 0.016;
    // 読み込み直後：球が飛び出して少し縮む（easeOutBack・控えめに。約 71 フレームで落ち着く）
    introT = Math.min(1, introT + 0.014);
    const t = introT - 1,
      b = t * t * (2.2 * t + 1.2) + 1;
    const rate = P.lfoRate,
      amp = P.lfoAmp,
      baseSpeed = rate * 0.008;
    // 向き（と半径）を目当てへ
    if (anim) {
      const k = anim.dur ? clamp((now - anim.t0) / anim.dur, 0, 1) : 1,
        e = 1 - Math.pow(1 - k, 3);
      Q = slerpQ(anim.q0, anim.q1, e);
      P.radiusBase = anim.r0 + (anim.r1 - anim.r0) * e;
      if (k >= 1) anim = null;
    }
    // 呼吸：いつも微かに膨らんだり縮んだりする。AMP で振幅が大きくなる
    const breath = Math.sin(lfoT * (0.7 + Math.abs(rate) * 0.9)) * (1.2 + Math.abs(amp) * 8);
    // 負の半径（裏返り）もそのまま
    P.radius = P.radiusBase * b + breath * Math.max(0, b);
    // 8 秒触れないと、とてもゆっくり回りだす
    const idle = now - lastInteract;
    if (!reduce && idle > 8000 && !drag && !anim) {
      const f = Math.min(1, (idle - 8000) / 3000);
      aR(0.0008 * f, 0.00015 * f);
    }
    // 惰性
    if (inertia) {
      inertia.vx *= P.friction;
      inertia.vy *= P.friction;
      if (Math.abs(inertia.vx) < inertia.min && Math.abs(inertia.vy) < inertia.min) inertia = null;
      else aR(inertia.sx * inertia.vx * inertia.s, inertia.sy * inertia.vy * inertia.s);
    }
    // LFO：経度・緯度を自分で回す
    const lonD = baseSpeed + amp * Math.sin(lfoT * Math.abs(rate) * 1.7) * 0.015,
      latD = baseSpeed * 0.7 + amp * Math.sin(lfoT * Math.abs(rate) * 1.3 + 1.2) * 0.015;
    if (lfoLon) {
      aR(lonD, 0);
      SD[0].na += lonD * 60;
      needle(SD[0]);
      showLon();
    }
    if (lfoLat) {
      aR(0, latD);
      SD[1].na += latD * 60;
      needle(SD[1]);
      showLat();
    }
    const absR = Math.abs(rate),
      absA = Math.abs(amp);
    P.hue = (P.hue + absR * 2.5 + absA * 1) % 360;
    P.noise = Math.min(0.55, absA * 0.15 + absR * 0.03 + Math.abs(Math.sin(lfoT * 0.7)) * absA * 0.1);
  }

  // ══════════════════ 描く ══════════════════
  const toggles = [...globe.querySelectorAll("[data-act=toggle]")];
  let lastPersp = null,
    lastOpen = null;
  function render() {
    const r = P.radius,
      mat = qM(Q),
      k = storeK(r);
    if (P.perspective !== lastPersp) vp.style.perspective = (lastPersp = P.perspective) + "px";
    const pw = [];
    for (const p of panels) {
      const w = mA(mat, p.bp),
        [wx, wy, wz] = w;
      pw.push(w);
      const vis = p.win ? 1 : k;
      p.vis = vis;
      if (!p.loaded && vis > 0.01) load(p);
      const x = wx * r,
        y = -wy * r,
        z = -(1 - wz) * r * 0.86,
        rY = (Math.atan2(wx, wz) * 180) / Math.PI,
        rX = (-Math.asin(clamp(wy, -1, 1)) * 180) / Math.PI,
        dm = (wz + 1) / 2,
        op = wz > -0.78 ? (0.16 + dm * 0.84) * vis : 0,
        sc = (0.8 + dm * 0.2) * (p.win ? 1 : 0.86 + 0.14 * vis),
        s = p.s;
      // 前のフレームと同じ値は書かない
      const tf = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${rY.toFixed(2)}deg) rotateX(${rX.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      if (tf !== s.tf) p.el.style.transform = s.tf = tf;
      const hidden = op < 0.002;
      if (hidden !== s.hidden) p.el.style.visibility = (s.hidden = hidden) ? "hidden" : "";
      if (!hidden) {
        const o = op.toFixed(3);
        if (o !== s.o) p.el.style.opacity = s.o = o;
        // 奥ほどぼける。一覧の物は、現れるまで霞の中
        const bl = `blur(${((1 - dm) * 1.4 + (1 - vis) * 3).toFixed(2)}px)`;
        if (bl !== s.bl) p.el.style.filter = s.bl = bl;
        const zi = String(Math.round(dm * 1000));
        if (zi !== s.z) p.el.style.zIndex = s.z = zi;
      }
      // 触れるのは、手前にあって、現れきっている物だけ（キーでも選べない）
      const live = !hidden && wz > 0.12 && vis > 0.6;
      if (live !== s.live) {
        s.live = live;
        p.el.style.pointerEvents = live ? "auto" : "none";
        p.el.inert = !live;
      }
    }
    const open = isOpen();
    if (open !== lastOpen) {
      lastOpen = open;
      toggles.forEach((b) => (b.textContent = open ? "一覧を閉じる ←" : "一覧を見る →"));
    }
    hP = lonOf(Q);
    drawBg();
    drawConnections(pw, r);
    drawTb();
    pads.forEach((p) => p.draw());
  }

  function frame(now) {
    if (!IVKY.paused) {
      step(now);
      render();
    }
    requestAnimationFrame(frame);
  }
  step(performance.now());
  render();
  requestAnimationFrame(frame);

  // ══════════════════ 外から ══════════════════
  // #works・#personal・#request・#archive で来たら、球が飛び出した後にそこを正面に出す
  function fromHash() {
    const a = location.hash.slice(1);
    if (a && a !== "home" && D.ANCHOR[a]) go(a);
  }
  setTimeout(fromHash, reduce ? 0 : 900);
  addEventListener("hashchange", fromHash);

  IVKY.world = { go, toggleStore, isOpen, focus: (id) => focusPanel(byId.get(id)) };
})();
