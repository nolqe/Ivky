// ====== メニュー（ダイヤルから撃つ流れ星） ======
// 息吹（index.html）が読みます。
// 入口は MENU と書いたダイヤルで、縁の外の三角が流れ星の向きです。
// 真ん中のつまみを持つとダイヤルごと好きな所へ動かせ、縁を持つと 360° 回せます。押すだけなら撃ちます。
// 動かしたり回したりしても、ページを読み込むたびに元の場所（右上の角で、真下から少し左へ向けた向き）に戻ります。
// 押すと流れ星が画面の外から飛んできて、ダイヤルの下をくぐり、三角の先から三角の向きへ振り出されます。
// そこから彗星のように惑星（画面の中心）へ吸い込まれて加速し、背景のリングに乗って半周ほど回ってから、また画面の外へ遠ざかります。
// 外へ向けて撃っても、引力で弧を描いて戻ってきます。
// 狙いでリングへの入り方と回る向きが変わり、球の緯度が大きいとリングの外を大回りしたり内側でループしたりします。
// 跡の上に行き先の点と文字が残ります。ダイヤルに近いところから詰めて並び、MENU の順で、最後が旧版（data.js の VERSIONS）です。
// 何度でも撃てて、前の流れ星も最後まで飛ぶので、連打するといくつも同時に飛びます。
// 撃ち直すと、新しい流れ星が通ったところで項目が今の場所から新しい跡へ滑って移ります。
// 跡は流れ星が通ったそばから薄れて消え、項目が並ぶ区間だけが茎として残ります（撃ち直すか戻すと、前の茎も消えます）。
// メニューは幕ではありません。開いている間も後ろ（球・パネル・操作盤）は普通に触れます。
// 流れ星が飛んでいる間だけ、画面の明暗が反転します（写真と動画はそのまま）。その間は項目の枝も太くなります。
// 項目に触れずにしばらく経つか、項目の外をダブルクリックするか、Esc で元に戻ります。
// 跡と項目の線は、背景の線（index.html の drawBg・drawConnections）の仲間として描きます。同じ変数が同じように効きます：
//   RADIUS … 惑星（リング）の大きさ。撃った後に変えると跡もリングと一緒に伸び縮みする。負（裏返り）だと跡もリングと同じく破線・反対の色相になる
//   PERSP  … リングの傾き。軌道はリングと同じ傾いた面の上で、リングに沿って回る。項目のパースの強さも
//   RATE   … 跡は背景のヘリックスと同じ巻き方の 2 本のより線になる（0 なら 1 本に重なる）。呼吸の速さ
//   AMP    … 線の濃さ、呼吸の深さ
//   HUE・NOISE … 色相と、線のガタつき（背景と同じ式）
//   LON・LAT … 緯度で横へ流される向き。球を回すと、より線の位相も背景と一緒に回る
// 開いている間、項目は球と同じ呼吸をし、緯度経度の動きに合わせて面がわずかに傾きます。
// 項目の点からは枝が生えます。枝は跡の流れに沿って出て、しなりながら文字の下へ回り込み、そのまま下線になって文字を支えます。
// 太さは筆のように根元で細く、下線へ入るところで太く、端で抜けます。流れ星が通ると枝が伸び、伸びきるころに文字が出ます。
// 文字は板を敷かず水平に置き、白く細い字に下へ落ちる影を付けて後ろから浮かせます。パースは球のパネルと同じやり方で、中心では正面を向き、外ほど縁へ寝ます。
// はっきりした色は、流れ星と三角、選んでいる項目にだけ付きます。
// 行き先は MENU と、その後ろに足す旧版。どれもページは移りません。押すと、球がその行き先を正面に向け（一覧の物なら、球が大きくなってその間に現れ）、メニューは閉じます。

// act は world.js の go() に渡す行き先
const MENU = [
  { label: "息吹", act: "home" },
  { label: "実績一覧", act: "works" },
  { label: "自主制作", act: "personal" },
  { label: "依頼・相談", act: "request" },
];

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const TAU = Math.PI * 2;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const versions = IVKY_DATA.VERSIONS;
  const strip = document.getElementById("ctrl-strip");

  // ── 球の向き（四元数 [w,x,y,z]。index.html と同じ並び）から経度・緯度を取る ──
  const lonOf = (q) => Math.atan2(2 * (q[0] * q[2] + q[1] * q[3]), 1 - 2 * (q[2] * q[2] + q[3] * q[3]));
  const latOf = (q) => Math.asin(Math.max(-1, Math.min(1, 2 * (q[0] * q[1] - q[3] * q[2]))));
  // 球（world.js の Q: 向き、P: 半径・遠近・色相など）
  function globe() {
    const P = IVKY.P;
    // 呼吸は半径の揺れ。読み込み直後は球が飛び出す演出で半径が大きく動くので、普段の呼吸の幅に収める
    return {
      q: IVKY.getQ(),
      breath: Math.max(-20, Math.min(20, P.radius - P.radiusBase)),
      f: Math.max(800, P.perspective) * 0.5,
      persp: P.perspective,
      hue: P.hue,
      rN: P.radius / 520,
      rate: P.lfoRate,
      amp: P.lfoAmp,
      noise: P.noise,
    };
  }
  // 背景の線の値。index.html の drawBg と同じ式（あちらは端末の画素、こちらは CSS の px で、比は同じ）
  function bgVars(gl) {
    const mn = Math.min(W, H),
      hTurns = Math.abs(gl.rate) * 1.2,
      neg = gl.rN < 0;
    return {
      mn,
      neg,
      hue: neg ? gl.hue + 180 : gl.hue, // 裏返ると、リングと同じく反対の色相
      hAmp: mn * (0.12 + Math.min(Math.abs(gl.rate), 4) * 0.06), // ヘリックスの振れ幅
      hDir: gl.rate >= 0 ? 1 : -1,
      hTurns,
      pitch: hTurns / (H * 1.2), // 1px あたりの巻き数（背景のヘリックスは画面の高さの 1.2 倍で hTurns 回巻く）
      rc: Math.max(8, Math.round(12 + Math.abs(gl.rate) * 5)), // 横木の数（同じ長さあたり）
      bA: 0.42 + Math.min(Math.abs(gl.amp), 2) * 0.2, // 線の濃さ
      tilt: (0.8 - (gl.persp + 300) / 8300) * (neg ? -1 : 1), // リングの傾き（縦のつぶれ方）
      hP: lonOf(gl.q), // ヘリックスとリングの位相（経度）
      nj: () => gl.noise * (Math.random() - 0.5) * mn * 0.02, // 線のガタつき
    };
  }

  const style = document.createElement("style");
  style.textContent = `
    /* メニューの文字は選べない（連打やダブルクリックで選択の色が付かないように。スマホの長押しのメニューも出さない） */
    .orb { --orb-hue: 0; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    /* 入口のダイヤル。置き場所は JS が transform で決める。触れる所は丸く（四角の角は後ろへ通す） */
    .orb-entry {
      position: fixed; left: 0; top: 0; z-index: 1002;
      width: 88px; height: 88px; padding: 0; border: 0; border-radius: 50%; background: none;
      clip-path: circle(50%); touch-action: none; -webkit-tap-highlight-color: transparent;
    }
    .orb-entry canvas { display: block; width: 100%; height: 100%; pointer-events: none; }
    .orb-entry:focus-visible { outline: 1px solid var(--text3); outline-offset: -14px; }

    /* 流れ星が飛んでいる間は、明暗を反転する（後ろは薄めず、触れるまま）。
       写真・動画・サムネイルはもう一度反転して元の色に戻す。
       跡と項目の点・線（.orb-trail・.orb-svg）は背景の線の仲間なので、後ろと一緒に反転する */
    html, body { transition: background-color 0.15s; }
    body > :not(.orb), body > :not(.orb) :is(img, video, iframe, .has-img), .orb-trail, .orb-svg { transition: filter 0.15s; }
    html.orb-inv, html.orb-inv body { background-color: #0b0b0d; }
    html.orb-inv body > :not(.orb):not(script),
    html.orb-inv body > :not(.orb) :is(img, video, iframe, .has-img),
    html.orb-inv .orb-trail, html.orb-inv .orb-svg { filter: invert(1); }

    .orb-trail, .orb-fx, .orb-svg, .orb-labels { position: fixed; inset: 0; z-index: 1001; width: 100%; height: 100%; pointer-events: none; }
    .orb-svg { overflow: visible; }
    .orb-labels { perspective-origin: 50% 50%; }

    .orb-sat, .orb-label { opacity: 0; transition: opacity 0.35s, color 0.15s; cursor: pointer; outline: none; }
    .orb-sat.lit, .orb-label.lit { opacity: 1; pointer-events: auto; }
    .orb-sat:not(.lit), .orb-label:not(.lit) { pointer-events: none; }
    /* 文字は、枝が伸びきるころに出る */
    .orb-label.lit { transition: opacity 0.35s 0.22s, color 0.15s; }
    /* 点と枝は、背景の接続線（パネルどうしを結ぶ線と、その端の点）と同じ色。枝は太さの変わる線を輪郭で塗る */
    .orb-sat { color: hsl(calc(var(--orb-hue) + 15), 18%, 62%); }
    .orb-sat .hit { fill: transparent; }
    .orb-sat .br, .orb-sat .p { fill: currentColor; }
    /* 文字は枝の先に乗る。色は枝（背景の接続線と同じ色相・彩度）に揃え、明るさだけ下げて地の上で読ませる。
       選ぶと枝と一緒に色付く。反転中の枝は後ろと一緒に裏返った色（選んだ枝だけは元の色）で見えるので、文字もその色の明るい側にする */
    .orb-label {
      position: absolute; left: 0; top: 0; transform-origin: 0 0; white-space: nowrap; line-height: 1;
      font-family: "Cormorant Garamond", serif; font-weight: 300; color: hsl(calc(var(--orb-hue) + 15), 18%, 40%);
    }
    .orb-label.hot { color: hsl(calc(var(--orb-hue) + 15), 48%, 48%); }
    html.orb-inv .orb-label { color: hsl(calc(var(--orb-hue) + 195), 18%, 64%); }
    html.orb-inv .orb-label.hot { color: hsl(calc(var(--orb-hue) + 15), 48%, 66%); }
    /* 白い影で、後ろの線や文字から字を切り離す。反転中は地の色で同じことをする */
    .orb-label span { display: block; padding: 0.12em 0.2em 0.16em; text-shadow: 0 0 2px #fff, 0 0 6px rgba(255, 255, 255, 0.9), 0 0 14px rgba(255, 255, 255, 0.6); }
    html.orb-inv .orb-label span { text-shadow: 0 0 2px #0b0b0d, 0 0 6px rgba(11, 11, 13, 0.9), 0 0 14px rgba(11, 11, 13, 0.6); }
    /* 旧版の年月。小さく等幅で、名前の後ろに添える */
    .orb-label small { font: 400 0.5em "DM Mono", monospace; letter-spacing: 0.08em; margin-left: 0.45em; vertical-align: 0.2em; opacity: 0.62; }
    .orb-sat.no-link, .orb-label.no-link { cursor: default; }
    /* 選んでいる項目：点と枝にはっきりした色（枝は太くもなる）。点と枝は後ろと一緒に反転するので、反転中は反対の色で書いておく */
    .orb-sat.hot { color: hsl(calc(var(--orb-hue) + 15), 48%, 63%); }
    html.orb-inv .orb-sat.hot { color: hsl(calc(var(--orb-hue) + 195), 48%, 37%); }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "orb";
  // 重なり順：跡（背景の線の仲間）、流れ星、点と線、文字、入口
  root.innerHTML = `
    <canvas class="orb-trail"></canvas>
    <canvas class="orb-fx"></canvas>
    <svg class="orb-svg"><g class="orb-items"></g></svg>
    <div class="orb-labels"></div>
    <button class="orb-entry" type="button" aria-label="メニュー" aria-expanded="false"><canvas></canvas></button>`;
  document.body.appendChild(root);

  const tc = root.querySelector(".orb-trail"),
    tx2 = tc.getContext("2d"),
    fx = root.querySelector(".orb-fx"),
    cx2 = fx.getContext("2d"),
    layer = root.querySelector(".orb-items"),
    labels = root.querySelector(".orb-labels"),
    entry = root.querySelector(".orb-entry"),
    ec = entry.querySelector("canvas"),
    ex = ec.getContext("2d");

  // 項目は、点と線（SVG）と文字（HTML。パネルと同じく CSS の 3D 変形でパースを付けるため）に分かれる。
  // 選んでいる印（hot）は、どちらにマウスを乗せても両方に付く。キーで選ぶのは文字の方
  let menuT = 0, // 最後にメニューを触った時刻（撃つ・項目に乗せる・項目を選ぶ）。ここからしばらく経つと元に戻す
    nSat = 0;
  // 項目ごとに決まった、少しずつ違う値。枝の長さ・しなり・下線の伸び・太さをばらして、同じ形の枝が並ばないようにする
  const rnd = (k) => (((Math.sin(k * 12.9898 + 78.233) * 43758.5453) % 1) + 1) % 1;
  function makeSat(m, cls, size) {
    const g = document.createElementNS(NS, "g"),
      el = document.createElement("div");
    g.setAttribute("class", "orb-sat");
    el.className = cls;
    const link = !!m.act;
    [g, el].forEach((n) => {
      if (!link) n.classList.add("no-link");
    });
    if (link) {
      el.tabIndex = 0;
      el.setAttribute("role", "link");
    }
    g.innerHTML = `<path class="br"/><circle class="hit" r="14"/><circle class="p" r="2.2"/>`;
    const [br, hit, p] = g.children;
    el.innerHTML = "<span></span>";
    const span = el.firstChild;
    span.textContent = m.label;
    if (m.sub) span.appendChild(document.createElement("small")).textContent = m.sub;
    el.style.fontSize = size + "px";
    layer.appendChild(g);
    labels.appendChild(el);
    // cur は今いる所、next は撃ち直した跡の上の行き先（流れ星が通ったら移る）、from は滑って移り始めた時の見た目。
    // w・h は文字の幅と高さ（文字の大きさに対する比）、gt0 は灯った時刻（枝がここから伸びる）、fk は反転中の強さ
    const k = nSat++,
      vr = { len: 0.75 + rnd(k * 5) * 0.6, b1: 0.3 + rnd(k * 5 + 1) * 0.5, b2: 0.25 + rnd(k * 5 + 2) * 0.45, tail: 0.1 + rnd(k * 5 + 3) * 0.45, wid: 0.85 + rnd(k * 5 + 4) * 0.3 };
    const it = { g, el, span, m, br, hit, p, link, size, vr, w: 0, h: 0, cur: null, next: null, from: null, disp: null, mt0: 0, gt0: 0, lit: false, over: 0, hot: false, hk: 1, fk: 0 };
    const sync = () => {
      menuT = performance.now();
      if (link) setHot(it, it.over > 0 || el.matches(":focus-visible"));
    };
    [g, el].forEach((n) => {
      n.addEventListener("pointerenter", () => (it.over++, sync()));
      n.addEventListener("pointerleave", () => ((it.over = Math.max(0, it.over - 1)), sync()));
    });
    if (link) {
      el.addEventListener("focus", sync);
      el.addEventListener("blur", sync);
    }
    return it;
  }
  const setHot = (it, on) => {
    it.hot = on;
    [it.g, it.el].forEach((n) => n.classList.toggle("hot", on));
  };
  const setLit = (it, on) => {
    if (on && !it.lit) it.gt0 = performance.now();
    it.lit = on;
    [it.g, it.el].forEach((n) => n.classList.toggle("lit", on));
  };
  const LS = 28.6; // 項目の文字の大きさ（px）
  const sats = MENU.map((m) => makeSat(m, "orb-label", LS));
  // 旧版は 1 つの項目にまとめる。押すと、球の上の旧版の札が正面に来る（旧版が 1 つなら、その年月を添える）
  const vers = versions.length ? [makeSat({ label: "旧版", sub: versions.length === 1 ? versions[0].label : "", act: "archive" }, "orb-label", LS)] : [];
  const all = [...sats, ...vers];

  // ── 寸法 ──
  let W, H, cx, cy, L;
  const E = 88, // 入口（ダイヤルと三角が収まる四角）の大きさ
    DR = 28, // ダイヤルの半径
    KR = 15, // 真ん中のつまみの半径（ここを持つと動かす。外側の縁を持つと回す）
    BR = 18, // 枝の長さ（跡から文字の下線まで）
    GROW = 420; // 枝が伸びきるまで（ms）
  // 文字を枝の先から右へ伸ばすか（start）左へ伸ばすか（end）。枝の出る向き nx で決め、ほぼ縦なら跡の進む向き tx で
  const ancOf = (nx, tx) => (nx > 0.2 ? "start" : nx < -0.2 ? "end" : tx >= 0 ? "start" : "end");
  function measure() {
    W = document.documentElement.clientWidth;
    H = innerHeight;
    cx = W / 2;
    cy = H / 2;
    L = Math.min(W, H) / 2;
    const dpr = devicePixelRatio || 1;
    [
      [tc, tx2],
      [fx, cx2],
    ].forEach(([c, x]) => {
      c.width = W * dpr;
      c.height = H * dpr;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }
  measure();

  // 惑星の大きさ（背景のリングの半径。index.html の drawBg と同じ式で、RADIUS で変わる）
  const ringR = (rN) => Math.min(W, H) * (0.15 + Math.min(Math.abs(rN), 2.5) * 0.1);

  // ── 入口：ダイヤル ──
  // dial は中心（画面の px）と向き a（rad。三角と流れ星の向き）。読み込むたびに右上の角に置き、真下から少し左（約 17°）へ向ける
  // （項目はダイヤルの下に、少し左へ流れて並ぶ）。動かした後に画面の大きさが変わったら、画面に対して同じ割合の所に置き直す
  // （動かしていない間は右上の角のまま）
  const dial = {},
    home = () => Object.assign(dial, { x: W - 56, y: 56, a: Math.PI / 2 + 0.3 });
  let moved = false;
  home();
  const saveDial = () => (moved = true);
  // 置ける所：画面の内側で、下の操作盤より上。リングの上には置けない（撃つ所がリングの内側になると軌道が成り立たない）ので、
  // リングの面で測って帯の外側まで押し戻す。RADIUS や PERSP でリングが変わると、ダイヤルもリングに押される。
  // 持って動かしているとき（from は動かす前の場所）は、押し戻す向きを前の場所の向きから少しずつしか変えない。
  // 指がリングの内側を横切っても、ダイヤルは向こう側へ飛ばずに、リングの縁を滑ってついてくる
  function clampDial(gl, from) {
    const m = DR + 14,
      bottom = H - (strip ? strip.offsetHeight : 0) - 16,
      { toS, fromS } = planeOf(bgVars(gl).tilt),
      far = ringR(gl.rN) * (RING_K + RING_W) + DR * 1.5;
    let [u, v] = fromS(dial.x - cx, dial.y - cy);
    const d = Math.hypot(u, v);
    if (d < far) {
      let t = d > 1e-6 ? Math.atan2(v, u) : 0;
      if (from) {
        const [pu, pv] = fromS(from[0] - cx, from[1] - cy),
          tp = Math.atan2(pv, pu),
          dt = t - tp - Math.round((t - tp) / TAU) * TAU;
        t = tp + Math.max(-0.35, Math.min(0.35, dt));
      }
      [u, v] = [far * Math.cos(t), far * Math.sin(t)];
      const [X, Y] = toS(u, v);
      dial.x = cx + X;
      dial.y = cy + Y;
    }
    dial.x = Math.max(m, Math.min(W - m, dial.x));
    dial.y = Math.max(m, Math.min(Math.max(m, bottom - m), dial.y));
  }
  let placed = "";
  function placeDial() {
    const t = `translate(${(dial.x - E / 2).toFixed(1)}px,${(dial.y - E / 2).toFixed(1)}px)`;
    if (t !== placed) entry.style.transform = placed = t;
  }
  let zone = null; // ポインタが乗っている所（"knob" つまみ / "rim" 縁）
  // 流れ星・三角・選んでいる項目の色（CSS の .hot と同じ値）
  const accent = (hue, a = 1) => `hsla(${hue + 15},48%,63%,${a})`;
  function drawEntry(gl) {
    const dpr = devicePixelRatio || 1,
      o = E / 2;
    if (ec.width !== E * dpr) ec.width = ec.height = E * dpr;
    ex.setTransform(dpr, 0, 0, dpr, 0, 0);
    ex.clearRect(0, 0, E, E);
    // 盤
    ex.beginPath();
    ex.arc(o, o, DR, 0, TAU);
    ex.fillStyle = "#efefec";
    ex.fill();
    ex.strokeStyle = "rgba(24,24,22,0.22)";
    ex.lineWidth = 0.8;
    ex.stroke();
    // 縁の目盛り（向きと一緒に回る。持つと濃くなる）
    ex.beginPath();
    for (let k = 0; k < 48; k++) {
      const a = dial.a + (k / 48) * TAU,
        l = k % 4 ? 3 : 5.5;
      ex.moveTo(o + (DR - 2) * Math.cos(a), o + (DR - 2) * Math.sin(a));
      ex.lineTo(o + (DR - 2 - l) * Math.cos(a), o + (DR - 2 - l) * Math.sin(a));
    }
    ex.strokeStyle = `rgba(24,24,22,${zone === "rim" ? 0.34 : 0.16})`;
    ex.lineWidth = 0.7;
    ex.stroke();
    // つまみと MENU の文字
    ex.beginPath();
    ex.arc(o, o, KR, 0, TAU);
    ex.fillStyle = "#f6f6f4";
    ex.fill();
    ex.strokeStyle = `rgba(24,24,22,${zone === "knob" ? 0.3 : 0.14})`;
    ex.lineWidth = 0.7;
    ex.stroke();
    ex.font = '400 7px "DM Mono", monospace';
    ex.textAlign = "center";
    ex.textBaseline = "middle";
    ex.fillStyle = "rgba(24,24,22,0.62)";
    ex.fillText("MENU", o + 0.4, o + 0.5);
    // 三角（流れ星の向き）
    const c = Math.cos(dial.a),
      s = Math.sin(dial.a),
      len = state === "open" ? 8 : zone ? 12 : 10;
    ex.beginPath();
    ex.moveTo(o + (DR + len) * c, o + (DR + len) * s);
    ex.lineTo(o + DR * c - 4.5 * s, o + DR * s + 4.5 * c);
    ex.lineTo(o + DR * c + 4.5 * s, o + DR * s - 4.5 * c);
    ex.closePath();
    ex.fillStyle = accent(gl.hue, state === "open" || zone ? 1 : 0.8);
    ex.fill();
  }

  // ── 流れ星：彗星のように惑星の力場へ吸い込まれ、リングに乗って回ってから遠ざかる ──
  // 力は 引力（逆二乗。中心のごく近くだけやわらげる）と、リングの近くで横へ流す力（向きと強さは緯度）。
  // 初速を引力に比べて遅くしてあるので、遠くではゆっくり、近づくほど速くなる。引力の強さは発射点の距離に合わせ、画面の大きさで軌道の形が変わらないようにする
  // （初速² × 距離 ÷ 引力。惑星へ向けて撃つと 1.3、外へ向けるほど小さくして早めに引き返させ、真反対で 0.45。2 で放物線）。
  // 外へ向けて撃つと一度画面の外へ出るが、引力で戻ってくる。回り続けないよう、長さに上限を置く。
  // 点は等時間に並べ、速いところは細かく分けて計算する。惑星のそばを通り過ぎるかリングに放された後、画面の外へ出たところで終わる（画面中心からの相対座標）
  // 軌道は背景のリングと同じ面の上を回る：リングは円を縦に tilt 倍つぶして RING_ROT 回した形なので、
  // 発射点と向きをその面へ戻して円い惑星のまわりで計算し、点を画面へ写す（つぶれすぎないよう 0.3 倍で止める）。
  // リングの帯（半径 RING_K 倍のあたり）に入ると、流れ星の向きはリングの接線へなめらかに寄って（曲がりに上限がある）、リングに沿って回る。
  // 中心のまわりを SWEEP だけ回ると帯は流れ星を放し、抜けられる速さ（FLING 倍）まで押し出す。捕まって回り続けないように
  const RING_ROT = 0.52,
    RING_K = 1.05, // 帯の半径（リングの何倍か。背景のリング 3 本の真ん中あたり）
    RING_W = 0.4, // 帯の幅
    RING_C = 0.6, // 曲がりのやわらかさ（大きいほど大回りに入る）
    SWEEP = Math.PI * 1.3,
    FLING = 1.15;
  // リングの面と画面の行き来（toS：面 → 画面、fromS：画面 → 面）
  function planeOf(tilt) {
    const t = (tilt < 0 ? -1 : 1) * Math.max(0.3, Math.min(1, Math.abs(tilt))),
      c = Math.cos(RING_ROT),
      s = Math.sin(RING_ROT);
    return { toS: (x, y) => [x * c - y * t * s, x * s + y * t * c], fromS: (X, Y) => [X * c + Y * s, (-X * s + Y * c) / t] };
  }
  function trajectory(px, py, ang, lat, rN, tilt) {
    const { toS, fromS } = planeOf(tilt);
    [px, py] = fromS(px, py);
    let [vx, vy] = fromS(Math.cos(ang), Math.sin(ang));
    const v0 = 0.015 * L, // 初速
      k0 = v0 / Math.hypot(vx, vy);
    vx *= k0;
    vy *= k0;
    const d0 = Math.hypot(px, py),
      toward = -(px * vx + py * vy) / (d0 * v0), // 1：惑星へ向かう、-1：真反対
      Rs = ringR(rN),
      rt = RING_K * Rs,
      b = Math.abs(px * vy - py * vx) / v0, // 撃った向きにまっすぐ進んだとき、惑星の中心をどれだけ外れるか
      // 横や斜め外へ向けて撃つと、引力が弱いままでは帯の外を回り続ける。いちばん近づく所が帯に届くだけの引力は残す
      GM = Math.max(
        (v0 * v0 * d0) / (1.3 * (0.35 + 0.65 * (1 + toward) * 0.5)),
        b > rt && d0 > rt ? (v0 * v0 * ((b * b) / (rt * rt) - 1)) / (2 * (1 / rt - 1 / d0)) : 0,
      ),
      e2 = (Rs * 0.15) ** 2,
      k = Math.max(-1, Math.min(1, lat)),
      DT = 0.12;
    const pts = [toS(px, py)],
      cum = [0];
    let swept = 0, // 帯の寄せが届く所（帯の幅の 2.2 倍まで）とその内側で、中心のまわりを回った角度
      free = false, // 帯が放した後
      near = d0; // いちばん惑星に近づいた距離
    for (let i = 0; i < 20000; i++) {
      const n = Math.min(60, Math.max(1, Math.ceil((Math.hypot(vx, vy) * DT) / Math.max(1.5, Math.hypot(px, py) * 0.04)))),
        h = DT / n;
      for (let s = 0; s < n; s++) {
        const d2 = px * px + py * py,
          d = Math.max(1e-6, Math.sqrt(d2)),
          f = -GM / Math.pow(d2 + e2, 1.5),
          side = ((free ? 0.3 : 1) * 0.0005 * L * Math.exp(-Math.abs(d - Rs) / (Rs * 0.5)) * k) / d;
        vx += (f * px + side * py) * h;
        vy += (f * py - side * px) * h;
        const v = Math.hypot(vx, vy),
          band = Math.exp(-(((d - RING_K * Rs) / (Rs * RING_W)) ** 2)) * Math.max(0, 1 - swept / SWEEP);
        if (band > 0.01 && v > 0) {
          // 今の回る向きの接線へ、1px あたり band ÷ (Rs × RING_C) rad まで向きを寄せる（速さは変えない）
          const cw = (vy * px - vx * py) / d >= 0 ? 1 : -1,
            tx = (py / d) * cw,
            ty = (-px / d) * cw,
            a = Math.atan2(vx * ty - vy * tx, vx * tx + vy * ty),
            r = -Math.sign(a) * Math.min(Math.abs(a), (band * v * h) / (Rs * RING_C)),
            cr = Math.cos(r),
            sr = Math.sin(r);
          [vx, vy] = [vx * cr - vy * sr, vx * sr + vy * cr];
        }
        if (swept >= SWEEP) free = true;
        if (free) {
          const ve = Math.sqrt((2 * GM) / Math.sqrt(d2 + e2)) * FLING;
          if (v < ve) {
            vx *= ve / v;
            vy *= ve / v;
          }
        }
        const nx = px + vx * h,
          ny = py + vy * h;
        if (d < Rs * (RING_K + 2.2 * RING_W)) swept += Math.abs(Math.atan2(px * ny - py * nx, px * nx + py * ny));
        px = nx;
        py = ny;
      }
      const [X, Y] = toS(px, py),
        [X0, Y0] = pts[i];
      cum.push(cum[i] + Math.hypot(X - X0, Y - Y0));
      pts.push([X, Y]);
      near = Math.min(near, Math.hypot(px, py));
      if (cum[i + 1] > L * 12) break;
      // 画面の外で終わるのは、惑星のそばを通り過ぎて遠ざかっているとき（外へ向けて撃った直後は、戻ってくるので続ける）
      const away = px * vx + py * vy > 0 && (free || near < d0 * 0.6);
      if (i > 40 && away && (Math.abs(X) > W / 2 + 60 || Math.abs(Y) > H / 2 + 60)) break;
    }
    return { pts, cum };
  }

  // 画面の外からダイヤルへ入ってくる道。ダイヤルの後ろ側（向き a の反対 ±75°）のうち、画面の外へいちばん早く出る向きから入る
  // （まっすぐ後ろを少しひいきする）。そこからダイヤルの中心をくぐって、三角の先 p0（撃つ所）で向き a につながる 3 次ベジェ。
  // 返すのは道の長さ len と、点を並べる at(n, step)。点は等時間に n 個並べる：入りは速く、ダイヤルに近づくほど遅くなって、
  // p0 で撃った時の速さ（1 点あたり step）になる。画面中心からの相対座標
  function incoming(a, p0) {
    const out = (th) => {
      const c = Math.cos(th),
        s = Math.sin(th);
      return Math.min(
        c > 1e-6 ? (W + 40 - dial.x) / c : c < -1e-6 ? (-40 - dial.x) / c : Infinity,
        s > 1e-6 ? (H + 40 - dial.y) / s : s < -1e-6 ? (-40 - dial.y) / s : Infinity,
      );
    };
    let th = a + Math.PI,
      D = out(th);
    for (let k = -5; k <= 5; k++) {
      const t = a + Math.PI + k * 0.26,
        d = out(t);
      if (d * (1 + Math.abs(k) * 0.06) < D) [th, D] = [t, d];
    }
    const ux = Math.cos(a),
      uy = Math.sin(a),
      ex = Math.cos(th),
      ey = Math.sin(th),
      E = [dial.x - cx + ex * D, dial.y - cy + ey * D],
      c1 = [E[0] - ex * D * 0.45, E[1] - ey * D * 0.45],
      k2 = DR + 10 + D * 0.3,
      c2 = [p0[0] - ux * k2, p0[1] - uy * k2],
      bz = (t) => {
        const u = 1 - t;
        return [0, 1].map((j) => u * u * u * E[j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t * t * t * p0[j]);
      };
    // 弧長で並べ直すための表
    const B = [E],
      cs = [0];
    for (let j = 1; j <= 64; j++) {
      B.push(bz(j / 64));
      cs.push(cs[j - 1] + Math.hypot(B[j][0] - B[j - 1][0], B[j][1] - B[j - 1][1]));
    }
    const Lin = cs[64];
    return {
      len: Lin,
      at: (n, step) => {
        const A = Math.min(1, (step * n) / (Lin || 1)),
          pts = [];
        for (let i = 0, j = 0; i < n; i++) {
          const t = i / n,
            s = Lin * (A * t + (1 - A) * t * (2 - t));
          while (j < 63 && cs[j + 1] < s) j++;
          const f = (s - cs[j]) / (cs[j + 1] - cs[j] || 1);
          pts.push([B[j][0] + (B[j + 1][0] - B[j][0]) * f, B[j][1] + (B[j + 1][1] - B[j][1]) * f]);
        }
        return pts;
      },
    };
  }

  // ── 撃つ・開く・戻す ──
  // trails は撃った跡（古い順）で、最後が一番新しい流れ星（shot。項目はこれに従って並ぶ）。end は戻したときに止めた所（点の番号）
  const STAY = 10000, // 項目に触れずにこれだけ経つと元に戻す（ms）
    IN = 360, // 流れ星が画面の外からダイヤルに着くまで（ms）
    FADE = 700, // 跡が、流れ星が通ってから薄れて消えるまでの目安（ms）
    STEM = 0.13, // 茎（項目が並ぶ区間の跡）の濃さ（飛んでいる間の跡は 0.24）
    STEM_OUT = 700; // 撃ち直したり戻したりしたときに、前の茎が消えるまで（ms）
  let state = "closed",
    shot = null,
    trails = [],
    closeT0 = 0,
    closeDur = 360;
  const headAt = (tr, now) => (tr.end != null ? tr.end : (tr.dur ? Math.max(0, Math.min(1, (now - tr.t0) / tr.dur)) : 1) * (tr.pts.length - 1));
  // 流れ星がまだ飛んでいるか（rAF の時刻は撃った時刻より前のことがある）。撃ち直しても前の流れ星は最後まで飛ぶ
  const flying = (tr, now, extra = 0) => tr.end == null && now < tr.t0 + tr.dur + extra;
  // 流れ星をそこで止めて、跡だけを残す（抜け終わっていれば、抜けた時刻から薄れていく）
  function cut(tr, now) {
    if (tr && tr.end == null) {
      tr.end = headAt(tr, now);
      tr.tEnd = Math.min(now, tr.t0 + tr.dur);
    }
  }
  function fire(now) {
    measure();
    const gl = globe(now),
      a = dial.a,
      tx = dial.x + (DR + 10) * Math.cos(a),
      ty = dial.y + (DR + 10) * Math.sin(a);
    const out = trajectory(tx - cx, ty - cy, a, latOf(gl.q), gl.rN, bgVars(gl).tilt);
    // 惑星のまわりを回って長くなった跡は、そのぶん時間をかけて飛ぶ（最大で倍）。その前に、画面の外からダイヤルまでの IN をつなぐ。
    // nIn は入ってくる道の点の数（点は等時間なので、IN の間に撃った後の道で進む点の数と同じ）。
    // 道が短いときは、撃った時の速さより遅くならないよう点を減らす（そのぶん早く着く）。R0 は撃った時の惑星の大きさ
    const len = out.cum[out.cum.length - 1],
      dOut = reduce ? 0 : 1500 * Math.max(1, Math.min(2, len / (L * 3))),
      path = incoming(a, out.pts[0]),
      step = out.cum[1] - out.cum[0],
      nIn = reduce ? 0 : Math.max(4, Math.min(Math.round((IN * (out.pts.length - 1)) / dOut), Math.floor(path.len / (step || 1)))),
      pts = [...(nIn ? path.at(nIn, step) : []), ...out.pts],
      cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    shot = { pts, cum, nIn, t0: now, R0: ringR(gl.rN), dur: reduce ? 0 : (dOut * (pts.length - 1)) / (out.pts.length - 1) };
    const tr = shot;
    // 項目は、跡のうち画面の端・下の操作盤から離れた所を、ダイヤルに近い方から使い、重ならない範囲で詰めて並べる。
    // 文字はみな跡の同じ側に出す。どちらの側にするかは、両方並べてみて、重なりと画面の端に押される量が少なく、短くまとまる方
    const bottom = H - (strip ? strip.offsetHeight : 0) - 16,
      ok = ([x, y]) => {
        const X = x + cx,
          Y = y + cy;
        return X > 36 && X < W - 36 && Y > 36 && Y < bottom && Math.hypot(X - dial.x, Y - dial.y) > DR + 30;
      };
    all.forEach((it) => {
      it.w = it.el.offsetWidth / it.size;
      it.h = it.el.offsetHeight / it.size;
    });
    const tanAt = (i) => {
      const a = tr.pts[Math.max(0, i - 1)],
        b = tr.pts[Math.min(tr.pts.length - 1, i + 1)],
        d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
    };
    // 跡の点 i に置いたときの点と文字の四角（撃った時の面で）。枝は跡から side の側（法線）へ出て、その先で文字の下線になる。
    // 文字の向き anc は ancOf で決め、画面の端に押し付けられるときは反対へ（drawItems はこの向きを使う）。fixed を渡すとその向きにする。
    // press は端に押されて枝の先から離れた量
    const boxAt = (i, it, side, fixed) => {
      const [x, y] = tr.pts[i],
        [tx, ty] = tanAt(i),
        nx = -ty * side,
        ny = tx * side,
        w = it.w * it.size,
        h = it.h * it.size,
        ll = BR * it.vr.len + Math.max(0, ny) * h,
        sx = cx + x + nx * ll,
        sy = cy + y + ny * ll;
      let anc = fixed || ancOf(nx, tx);
      if (!fixed && anc === "start" && sx + w > W - 10 && sx - w > 10) anc = "end";
      else if (!fixed && anc === "end" && sx - w < 10 && sx + w < W - 10) anc = "start";
      const want = anc === "start" ? sx : sx - w,
        x0 = Math.max(10, Math.min(W - 10 - w, want)),
        y1 = Math.max(10 + h, Math.min(H - 10, sy));
      return { anc, side, dot: [cx + x, cy + y], b: [x0, y1 - h, x0 + w, y1 + 2], press: Math.abs(x0 - want) + Math.abs(y1 - sy) };
    };
    const hits = (a, b, m) => a[0] < b[2] + m && b[0] < a[2] + m && a[1] < b[3] + m && b[1] < a[3] + m,
      dotBox = ([X, Y]) => [X - 5, Y - 5, X + 5, Y + 5],
      IG = 14, // 項目どうしの間（文字の箱と箱の間、px）
      clash = (c, placed) =>
        placed.filter(
          (o) =>
            hits(c.b, o.b, IG) ||
            hits(c.b, dotBox(o.dot), 0) ||
            hits(dotBox(c.dot), o.b, 0) ||
            Math.hypot(c.dot[0] - o.dot[0], c.dot[1] - o.dot[1]) < 20,
        ).length;
    // 跡に沿って side の側へ並べてみる。前の項目の少し先から、重ならない最初の所に置く。
    // 文字の向きは最初の項目で決めたものに揃える（跡が曲がっても、列から飛び出す項目が出ないように）。
    // ダイヤルも先に置いた物として扱い、文字がダイヤル（と三角）の下に入らないようにする
    const DB = DR + 12;
    const layout = (side) => {
      const placed = [{ dot: [dial.x, dial.y], b: [dial.x - DB, dial.y - DB, dial.x + DB, dial.y + DB] }],
        picks = [];
      let from = tr.nIn + 1,
        cost = 0,
        anc0 = null;
      all.forEach((it) => {
        let pick = -1,
          best = Infinity,
          bi = from;
        for (let i = from; i < tr.pts.length; i++) {
          if (!ok(tr.pts[i])) continue;
          const c = boxAt(i, it, side, anc0),
            n = clash(c, placed);
          if (n === 0) {
            pick = i;
            break;
          }
          if (n < best) {
            best = n;
            bi = i;
          }
        }
        if (pick < 0) {
          pick = bi;
          cost += best * 1e6;
        }
        const c = boxAt(pick, it, side, anc0);
        anc0 = c.anc;
        cost += c.press * 50;
        placed.push(c);
        picks.push({ i: pick, c });
        from = pick + 1;
      });
      return { picks, cost: cost + tr.cum[picks[picks.length - 1].i] };
    };
    const A = layout(1),
      B = layout(-1),
      { picks } = A.cost <= B.cost ? A : B;
    all.forEach((it, k) => {
      const { i, c } = picks[k],
        [tx, ty] = tanAt(i);
      // 行き先として持っておく。灯っている項目は、流れ星がここを通るまで今の場所に残る（drawItems）
      it.next = { x: tr.pts[i][0], y: tr.pts[i][1], s: tr.cum[i], anc: c.anc, side: c.side, tx, ty, tr: shot };
    });
    // 茎：項目が並ぶ区間（跡の上の長さで）。この区間の跡だけが残る
    shot.sA = Math.min(...picks.map((p) => tr.cum[p.i]));
    shot.sB = Math.max(...picks.map((p) => tr.cum[p.i]));
    // 前の跡の茎は、新しい流れ星がダイヤルに着くころから消していく（前の流れ星は最後まで飛ぶ）
    trails.forEach((t) => t.old == null && (t.old = now + IN));
    trails.push(shot);
    // 反転は撃った瞬間に入れる（戻すのは frame で、流れ星が抜けたとき）
    if (!reduce) {
      invOn = true;
      document.documentElement.classList.add("orb-inv");
    }
    menuT = now;
  }
  function open(now) {
    entry.setAttribute("aria-expanded", "true");
    root.classList.add("open");
    state = "open";
    fire(now);
  }
  // 元に戻す。dur は項目が消えるまでの長さ（放っておかれて戻るときはゆっくり）
  function close(dur) {
    if (state !== "open") return;
    const now = performance.now();
    trails.forEach((t) => {
      cut(t, now);
      if (t.old == null || t.old > now) t.old = now;
    });
    entry.setAttribute("aria-expanded", "false");
    root.classList.remove("open");
    state = "closing";
    closeT0 = now;
    closeDur = dur;
  }
  function finishClose() {
    state = "closed";
    all.forEach((it) => {
      setLit(it, false);
      it.over = 0;
      setHot(it, false);
      it.cur = it.next = it.from = it.disp = null;
    });
  }

  // 入口：つまみを持つと動かし、縁を持つと回す。6px 動かすまでは押しただけとみなし、離すと撃つ
  let drag = null,
    dragged = false; // 直前の操作が動かす・回すだった（そのあとに来る click では撃たない）
  const zoneAt = (e) => (Math.hypot(e.clientX - dial.x, e.clientY - dial.y) <= KR + 3 ? "knob" : "rim");
  entry.addEventListener("pointerdown", (e) => {
    drag = {
      zone: zoneAt(e),
      sx: e.clientX,
      sy: e.clientY,
      x0: dial.x,
      y0: dial.y,
      a0: dial.a,
      p0: Math.atan2(e.clientY - dial.y, e.clientX - dial.x),
      moved: false,
    };
    dragged = false;
    entry.setPointerCapture(e.pointerId);
  });
  entry.addEventListener("pointermove", (e) => {
    if (!drag) {
      zone = zoneAt(e);
      entry.style.cursor = zone === "knob" ? "move" : "grab";
      return;
    }
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    drag.moved = true;
    entry.style.cursor = drag.zone === "knob" ? "move" : "grabbing";
    const from = [dial.x, dial.y];
    if (drag.zone === "knob") {
      dial.x = drag.x0 + e.clientX - drag.sx;
      dial.y = drag.y0 + e.clientY - drag.sy;
    } else dial.a = drag.a0 + Math.atan2(e.clientY - dial.y, e.clientX - dial.x) - drag.p0;
    clampDial(globe(performance.now()), from);
    placeDial();
  });
  const endDrag = () => {
    if (drag && drag.moved) {
      dragged = true;
      setTimeout(() => (dragged = false)); // click が来なかったとき（指が外で離れたなど）にも残らないように
      saveDial();
    }
    drag = null;
  };
  entry.addEventListener("pointerup", endDrag);
  entry.addEventListener("pointercancel", endDrag);
  entry.addEventListener("pointerleave", () => {
    if (!drag) zone = null;
  });
  // 押すたびに撃つ（開いていれば撃ち直す）。キーでは Enter・Space で撃ち、← → で回す
  entry.addEventListener("click", () => {
    if (dragged) return (dragged = false);
    const now = performance.now();
    state === "open" ? fire(now) : open(now);
  });
  entry.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    dial.a += e.key === "ArrowLeft" ? -0.26 : 0.26;
    saveDial();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close(360);
  });
  // 項目の外をダブルクリックすると戻す（入口は連打で撃つので除く。操作盤はダブルクリックで値を戻すので除く）。
  // ダブルクリックで後ろの単語が選ばれるので、戻したときはその選択も消す
  document.addEventListener("dblclick", (e) => {
    if (state !== "open" || e.target.closest(".orb-entry, .orb-sat, .orb-label, #ctrl-strip")) return;
    close(360);
    getSelection()?.removeAllRanges();
  });
  // 幅が変わったら項目の置き場所が合わなくなるので、すぐ戻す（スマホでアドレスバーが出入りして高さだけ変わるときは戻さない）
  // ダイヤルは画面に対して同じ割合の所に置き直す
  let lastW = document.documentElement.clientWidth;
  window.addEventListener("resize", () => {
    const w = document.documentElement.clientWidth,
      fx = dial.x / W,
      fy = dial.y / H;
    if (w !== lastW && state === "open") close(1);
    lastW = w;
    measure();
    if (moved) {
      dial.x = fx * W;
      dial.y = fy * H;
    } else home();
  });
  // 選ぶと、球がその行き先を正面に向け、メニューは閉じる
  function activate(t) {
    const n = t.closest(".orb-sat, .orb-label"),
      s = n && all.find((s) => s.g === n || s.el === n);
    if (!s || !s.link) return;
    IVKY.world.go(s.m.act);
    close(360);
  }
  layer.addEventListener("click", (e) => activate(e.target));
  labels.addEventListener("click", (e) => activate(e.target));
  labels.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(e.target);
    }
  });

  // ── 描画 ──
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  // 跡を描く面：画面に平らに置く（撃った後に球を回しても、跡と項目は動かない）。
  // 撃った後に RADIUS を変えると、跡はリングと一緒に伸び縮みする（k。極端にならないよう 0.8〜1.25 倍）
  function projector(tr, gl) {
    const k = Math.max(0.8, Math.min(1.25, ringR(gl.rN) / tr.R0));
    return { k, proj: (x, y) => [cx + x * k, cy + y * k, 1] };
  }
  // 跡：背景のヘリックスと同じ巻き方・色の 2 本のより線（RATE が 0 なら 1 本に重なる）と、背景と同じ横木。
  // 巻きの位相も背景と同じく経度で回る。濃さは AMP で、ガタつきは NOISE で背景と一緒に変わる。
  // 流れ星が通ったそばから FADE ほどで薄れて消え、項目が並ぶ区間（茎。両端は 24px で細る）だけが STEM の濃さで残る。
  // 撃ち直すか戻すと、前の茎も STEM_OUT で消える。画面の外からダイヤルをくぐるまでの区間は色を持たない（彩度 0）。
  // 後ろと一緒に反転するので、色は反転していない時の値で書く
  function drawTrails(now, gl, bv) {
    tx2.clearRect(0, 0, W, H);
    const hold = (t) => (t.old == null ? 1 : Math.max(0, Math.min(1, 1 - (now - t.old) / STEM_OUT)));
    trails = trails.filter((t) => flying(t, now) || hold(t) > 0 || now - (t.end != null ? t.tEnd : t.t0 + t.dur) < FADE * 6);
    const amp = bv.hAmp * 0.05,
      twist = bv.hTurns > 0.01,
      gap = (H * 1.2) / bv.rc,
      kA = bv.bA / 0.42;
    tx2.setLineDash(bv.neg ? [6, 4] : []);
    trails.forEach((tr) => {
      const hi = headAt(tr, now);
      if (hi < 1) return;
      const { proj } = projector(tr, gl),
        h = hold(tr),
        N1 = tr.pts.length - 1,
        C = [],
        A = [],
        G = []; // ダイヤルを抜けた後か（色を持つか）
      for (let i = 0; i <= hi; i += 2) {
        const s = tr.cum[i],
          tp = tr.t0 + (tr.dur * i) / N1, // 流れ星がここを通った時刻
          stem = h * Math.max(0, 1 - Math.max(tr.sA - s, s - tr.sB, 0) / 24);
        C.push([...proj(...tr.pts[i]), s]);
        G.push(i >= tr.nIn);
        A.push(Math.min(0.5, Math.max(0.24 * Math.exp(-Math.max(0, now - tp) / FADE), STEM * stem) * kA));
      }
      if (C.length < 2 || A.every((a) => a < 0.004)) return;
      // 各点で跡に直交する向きへ、より線を振る
      const N = C.map((p, i) => {
        const p0 = C[Math.max(0, i - 1)],
          p1 = C[Math.min(C.length - 1, i + 1)],
          d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
        return [-(p1[1] - p0[1]) / d, (p1[0] - p0[0]) / d];
      });
      const at = (i, off) => {
        const o = Math.sin(twist ? C[i][3] * bv.pitch * TAU * bv.hDir + bv.hP * 0.42 + off : off) * amp;
        return [C[i][0] + N[i][0] * o + bv.nj(), C[i][1] + N[i][1] * o + bv.nj()];
      };
      const S = [0, Math.PI].map((off) => C.map((_, i) => at(i, off)));
      // 濃さと色の有無が点ごとに変わるので、それが同じ区間ごとにまとめて引く
      for (let s = 0; s < 2; s++) {
        tx2.lineWidth = 1.3 + s * 0.2;
        let q = 0;
        for (let i = 1; i < C.length; i++) {
          const b = Math.round(((A[i - 1] + A[i]) / 2) * (s ? 0.7 : 1) * 60),
            key = b && b * 2 + G[i];
          if (key !== q) {
            if (q) tx2.stroke();
            q = key;
            if (b) {
              tx2.beginPath();
              tx2.moveTo(...S[s][i - 1]);
              tx2.strokeStyle = `hsla(${bv.hue + s * 15},${G[i] ? 18 : 0}%,72%,${(b / 60).toFixed(3)})`;
            }
          }
          if (b) tx2.lineTo(...S[s][i]);
        }
        if (q) tx2.stroke();
      }
      if (!twist) return;
      tx2.lineWidth = 0.7;
      for (let i = 0, next = gap / 2; i < C.length; i++) {
        if (C[i][3] < next) continue;
        next += gap;
        if (A[i] < 0.004) continue;
        tx2.beginPath();
        tx2.moveTo(...S[0][i]);
        tx2.lineTo(...S[1][i]);
        tx2.strokeStyle = `hsla(${bv.hue + 10},${G[i] ? 12 : 0}%,76%,${(A[i] * 0.55).toFixed(3)})`;
        tx2.stroke();
      }
    });
    tx2.setLineDash([]);
  }
  // 流れ星（尾と核）。飛んでいるものは全部描く。反転しない。
  // 画面の外から来てダイヤルをくぐるまでは色を持たず（明るい灰）、三角の先を出たところから 24px ほどで、はっきりした色に変わる
  let cometOn = false;
  const tint = (tr, i) => Math.max(0, Math.min(1, (tr.cum[i] - tr.cum[tr.nIn]) / 24)),
    starCol = (hue, k, a = 1) => `hsla(${hue + 15},${(48 * k).toFixed(1)}%,${(84 - 21 * k).toFixed(1)}%,${a})`;
  function drawComet(now, gl) {
    const live = trails.filter((tr) => flying(tr, now));
    if (!live.length && !cometOn) return;
    cx2.clearRect(0, 0, W, H);
    cometOn = live.length > 0;
    live.forEach((tr) => {
      const hi = headAt(tr, now);
      if (hi < 1) return;
      const { proj } = projector(tr, gl),
        h0 = Math.floor(hi),
        head = tr.cum[h0],
        tail = L * 0.4;
      let prev = proj(...tr.pts[h0]);
      for (let i = h0 - 1; i >= 0; i--) {
        const u = (head - tr.cum[i]) / tail;
        if (u > 1) break;
        const p = proj(...tr.pts[i]);
        cx2.beginPath();
        cx2.moveTo(prev[0], prev[1]);
        cx2.lineTo(p[0], p[1]);
        cx2.strokeStyle = starCol(gl.hue, tint(tr, i), (0.85 * Math.pow(1 - u, 1.6)).toFixed(3));
        cx2.lineWidth = 2.4 * (1 - u) + 0.2;
        cx2.stroke();
        prev = p;
      }
      const [hx, hy] = proj(...tr.pts[h0]),
        kh = tint(tr, h0);
      cx2.beginPath();
      cx2.arc(hx, hy, 6, 0, TAU);
      cx2.fillStyle = starCol(gl.hue, kh, 0.22);
      cx2.fill();
      cx2.beginPath();
      cx2.arc(hx, hy, 2.3, 0, TAU);
      cx2.fillStyle = starCol(gl.hue, kh);
      cx2.fill();
    });
  }
  // 項目の見た目を、跡の上の場所 pos から出す。
  // 跡の上の点から枝が出る。枝は跡の進む向きに沿って生え、撃った時に決めた側（pos.side）へしなって、文字の下線になる。
  // 枝の長さは球と同じ呼吸でわずかに伸び縮みし、戻すときは根元へ縮む。
  // 文字は水平に置き、パースは index.html のパネルと同じ式で付ける。文字の位置を、メニュー用の球（画面の対角より一回り大きい）の上の点と見て、
  // その法線へ向けて傾ける。中心の文字は正面を向き、外ほど縁へ寝る。
  // ただし寝かせる角度は法線の角度の TILT 倍に抑える（隅でも 20° くらい）。パネルと同じだけ寝かせると、画面の端の文字が細く小さく見えて読みにくい。
  // 奥行き dm で薄く・ぼかすのはパネルと同じ。小さくするのは 6% まで（端の文字も小さくしすぎない）。
  // 回す順だけはパネルと逆（X→Y）。パネルの順（Y→X）だと斜めの位置で縦画が経線に沿って倒れ、斜体に見える。逆なら縦画は立ったまま、行が傾く
  const TILT = 0.4;
  function placeAt(it, pos, gl, kc) {
    const { k, proj } = projector(pos.tr, gl),
      RS = Math.hypot(W, H) / 2 / 0.8,
      nx = -pos.ty * pos.side,
      ny = pos.tx * pos.side,
      ll = (BR * it.vr.len + gl.breath * 0.4 + Math.max(0, ny) * it.h * it.size) * (1 - kc * 0.6),
      ax = pos.x + nx * ll,
      ay = pos.y + ny * ll,
      B = proj(pos.x, pos.y),
      T = proj(pos.x + pos.tx * 6, pos.y + pos.ty * 6),
      S = proj(ax, ay),
      tl = Math.hypot(T[0] - B[0], T[1] - B[1]) || 1,
      wx = (ax * k) / RS,
      wy = (-ay * k) / RS,
      [qx, qy, qz] = [wx, wy, Math.sqrt(Math.max(0, 1 - wx * wx - wy * wy))],
      dm = (qz + 1) / 2,
      sc = (0.94 + dm * 0.06) * S[2],
      fs = it.size * sc,
      w = it.w * fs,
      h = it.h * fs;
    // 文字は下端を枝の先にそろえ、anc の向きへ伸ばす（画面の端では内へ押す）
    let lx = S[0],
      ly = S[1] - h / 2;
    if (pos.anc === "start") lx = Math.max(10, Math.min(lx, W - 10 - w));
    else lx = Math.min(W - 10, Math.max(lx, 10 + w));
    ly = Math.max(10 + h / 2, Math.min(H - 10 - h / 2, ly));
    return {
      bx: B[0],
      by: B[1],
      tdx: (T[0] - B[0]) / tl, // 跡の進む向き（画面で）
      tdy: (T[1] - B[1]) / tl,
      lx,
      ly,
      tx: pos.anc === "start" ? 0 : -100, // 文字の端（枝が入る側）を軸に置く
      rX: (-Math.asin(Math.max(-1, Math.min(1, qy))) * 180 * TILT) / Math.PI,
      rY: (Math.atan2(qx, qz) * 180 * TILT) / Math.PI,
      sc: fs / it.size,
      dm,
    };
  }
  // 枝の形：点列 P（先頭から n1 番までが枝、その先が下線）を、太さの変わる線の輪郭にする。
  // 太さは根元で細く、下線へ入るところで一番太く、下線の端で抜ける（筆の入りと抜き）。伸びている間は grow の所まで描き、先を細める
  function branchPath(P, n1, W0, grow) {
    const cs = [0];
    for (let j = 1; j < P.length; j++) cs.push(cs[j - 1] + Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]));
    const Lt = cs[cs.length - 1] || 1,
      uS = cs[n1] / Lt,
      Q = [],
      U = [];
    for (let j = 0; j < P.length; j++) {
      const u = cs[j] / Lt;
      if (u <= grow) {
        Q.push(P[j]);
        U.push(u);
        continue;
      }
      const u0 = cs[j - 1] / Lt,
        f = (grow - u0) / (u - u0 || 1);
      Q.push([P[j - 1][0] + (P[j][0] - P[j - 1][0]) * f, P[j - 1][1] + (P[j][1] - P[j - 1][1]) * f]);
      U.push(grow);
      break;
    }
    if (Q.length < 2) return "";
    const wd = (u) =>
      W0 *
      (u < uS ? 0.3 + 0.7 * Math.pow(u / uS, 0.6) : Math.pow(Math.max(0, (1 - u) / (1 - uS)), 0.75)) *
      (grow >= 1 ? 1 : Math.min(1, (grow - u) / 0.06));
    const lft = [],
      rgt = [];
    for (let j = 0; j < Q.length; j++) {
      const a = Q[Math.max(0, j - 1)],
        b = Q[Math.min(Q.length - 1, j + 1)],
        d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
        r = wd(U[j]) / 2,
        ox = (-(b[1] - a[1]) / d) * r,
        oy = ((b[0] - a[0]) / d) * r;
      lft.push(`${(Q[j][0] + ox).toFixed(1)},${(Q[j][1] + oy).toFixed(1)}`);
      rgt.push(`${(Q[j][0] - ox).toFixed(1)},${(Q[j][1] - oy).toFixed(1)}`);
    }
    return `M${lft.join("L")}L${rgt.reverse().join("L")}Z`;
  }
  const GLIDE = 650; // 撃ち直したときに、項目が新しい跡へ滑って移る長さ（ms）
  function drawItems(now, gl, bv) {
    const head = shot.cum[Math.floor(headAt(shot, now))],
      kc = state === "closing" ? ease(Math.max(0, Math.min(1, (now - closeT0) / closeDur))) : 0;
    labels.style.perspective = gl.f + "px";
    all.forEach((it) => {
      // 流れ星が行き先を通ったら、そこへ移る（まだ灯っていなければ、そこで灯る）
      if (state === "open" && it.next && head >= it.next.s) {
        if (it.lit && it.disp) {
          it.from = it.disp;
          it.mt0 = now;
        } else setLit(it, true);
        it.cur = it.next;
        it.next = null;
      }
      if (!it.lit || !it.cur) return;
      let v = placeAt(it, it.cur, gl, kc);
      if (it.from) {
        const e = reduce ? 1 : ease(Math.max(0, Math.min(1, (now - it.mt0) / GLIDE))),
          f = it.from;
        if (e >= 1) it.from = null;
        else v = Object.fromEntries(Object.keys(v).map((key) => [key, f[key] + (v[key] - f[key]) * e]));
      }
      it.disp = v;
      it.g.style.opacity = it.el.style.opacity = kc ? String(1 - kc) : "";
      // 選んでいる項目は一回り大きく。流れ星が飛んでいる間（反転中）は枝が太くなる
      it.hk += ((it.hot ? 1.08 : 1) - it.hk) * 0.25;
      it.fk += ((invOn ? 1 : 0) - it.fk) * 0.12;
      const s = v.sc * it.hk;
      it.el.style.transform = `translate3d(${v.lx.toFixed(1)}px,${v.ly.toFixed(1)}px,0) rotateX(${v.rX.toFixed(2)}deg) rotateY(${v.rY.toFixed(2)}deg) scale(${s.toFixed(3)}) translate(${v.tx.toFixed(1)}%,-50%)`;
      const op = (0.16 + v.dm * 0.84).toFixed(3);
      it.span.style.opacity = it.br.style.opacity = op;
      it.span.style.filter = `blur(${((1 - v.dm) * 1.4).toFixed(2)}px)`;
      // 下線の両端：文字の下端を、文字と同じ変形とパースで画面へ写す。内側（枝が入る側）は文字の軸の端で、外側は少し先まで伸ばす
      const ew = it.w * it.size,
        eh = it.h * it.size,
        m = new DOMMatrix()
          .translate(v.lx, v.ly)
          .rotateAxisAngle(1, 0, 0, v.rX)
          .rotateAxisAngle(0, 1, 0, v.rY)
          .scale(s)
          .translate((v.tx / 100) * ew, -eh / 2),
        pr = (x, y) => {
          const q = m.transformPoint(new DOMPoint(x, y)),
            z = gl.f / (gl.f - q.z);
          return [cx + (q.x - cx) * z, cy + (q.y - cy) * z];
        },
        xi = (-v.tx / 100) * ew,
        xo = ew - xi + Math.sign(ew - 2 * xi) * it.size * it.vr.tail,
        yb = eh * 0.96,
        // 点と枝の根元・先は、背景の線と同じくガタつく（半分だけ。文字は動かさない）
        j = () => bv.nj() * 0.5,
        Bx = v.bx + j(),
        By = v.by + j(),
        Si = pr(xi, yb),
        So = pr(xo, yb);
      Si[0] += j();
      Si[1] += j();
      // 枝：根元から跡の進む向きへ出て、下線の向きで下線へ入る 3 次ベジェ。続けて下線
      const dd = Math.hypot(Si[0] - Bx, Si[1] - By),
        Dl = Math.hypot(So[0] - Si[0], So[1] - Si[1]) || 1,
        Dx = (So[0] - Si[0]) / Dl,
        Dy = (So[1] - Si[1]) / Dl,
        c1x = Bx + v.tdx * dd * it.vr.b1,
        c1y = By + v.tdy * dd * it.vr.b1,
        c2x = Si[0] - Dx * dd * it.vr.b2,
        c2y = Si[1] - Dy * dd * it.vr.b2,
        P = [];
      for (let q = 0; q <= 14; q++) {
        const t = q / 14,
          u = 1 - t;
        P.push([
          u * u * u * Bx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * Si[0],
          u * u * u * By + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * Si[1],
        ]);
      }
      for (let q = 1; q <= 6; q++) P.push([Si[0] + ((So[0] - Si[0]) * q) / 6, Si[1] + ((So[1] - Si[1]) * q) / 6]);
      // 伸びる：灯ってから GROW で伸びきる。戻すときは根元へ縮む
      const grow = kc ? 1 - kc : reduce ? 1 : ease(Math.max(0, Math.min(1, (now - it.gt0) / GROW))),
        W0 = 1.5 * it.vr.wid * (it.hot ? 1.45 : 1) * (1 + it.fk * 0.7);
      it.br.setAttribute("d", branchPath(P, 14, W0, grow));
      [it.p, it.hit].forEach((c) => {
        c.setAttribute("cx", Bx.toFixed(1));
        c.setAttribute("cy", By.toFixed(1));
      });
    });
    if (kc >= 1) finishClose();
  }

  let invOn = false;
  function frame(now) {
    // 旧版を映している間は、息吹と一緒に止めておく
    if (IVKY.paused) return requestAnimationFrame(frame);
    const gl = globe(now),
      bv = bgVars(gl);
    root.style.setProperty("--orb-hue", gl.hue.toFixed(1));
    // 明暗の反転は、流れ星が飛んでいる間だけ（撃つたびに入り、最後の流れ星が画面の外へ抜けると戻る）
    const inv = state === "open" && !reduce && trails.some((tr) => flying(tr, now, 200));
    if (inv !== invOn) document.documentElement.classList.toggle("orb-inv", (invOn = inv));
    // ダイヤルはリングが大きくなると押される（読み込み直後の球が飛び出す演出の間は、まだ押さない）
    if (!drag && Math.abs(gl.breath) < 20) clampDial(gl);
    placeDial();
    drawEntry(gl);
    if (trails.length) drawTrails(now, gl, bv);
    drawComet(now, gl);
    if (state !== "closed") drawItems(now, gl, bv);
    // 項目に触れずにしばらく経ったら戻す（項目に乗せている間・キーで選んでいる間は数えない）
    if (state === "open") {
      if (all.some((it) => it.over > 0 || it.el === document.activeElement)) menuT = now;
      if (now - menuT > STAY) close(1200);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
