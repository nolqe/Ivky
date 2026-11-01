// ====== 紙の右の目盛 ======
// works.html（実績一覧・自主制作・依頼・相談が上から続く一枚の紙）の右端に、紙の長さを写した縦の目盛を置きます。
// 縦の線は引かず、左右対称の刻みだけを縦に並べます。見出しは縦書きで刻みの列の上に乗り、部の頭の位置から下へ伸びて、
// そのまま大きな区切りになります。文字一つ分の幅で済むので、スマホでも広い画面でも同じ形で読めて押せます。
// 刻みは、見出しと見出しの間に、どの見出しからも同じだけ空けて割り付けます。
// 今読んでいる所を針が指し、そのまわりの刻みが長く濃く立ち上がって、その膨らみが息をします（下の「息遣い」）。
// 送った側の刻みは少し濃くなり、今いる部の見出しが濃くなります。
// 見出しを押すと、その部の頭へ滑って移ります。部は .part[data-label] から拾います（見た目は list.css）。

(() => {
  const parts = [...document.querySelectorAll(".part[data-label]")];
  if (!parts.length) return;
  const nav = document.createElement("nav");
  nav.className = "scale";
  nav.setAttribute("aria-label", "この紙の見出し");
  nav.innerHTML =
    `<canvas class="scale-ticks"></canvas>` +
    parts.map((p) => `<a class="scale-head" href="#${p.id}"><span>${p.dataset.label}</span></a>`).join("");
  document.body.appendChild(nav);
  const heads = [...nav.querySelectorAll(".scale-head")],
    cv = nav.querySelector(".scale-ticks"),
    ctx = cv.getContext("2d");

  // 部の頭が上の帯の下（scroll-margin-top）に来るときのスクロール量を、紙を送れる長さに対する割合で目盛に写す。
  // 写す長さ（span）は、最後の見出しの下端が目盛の下端にちょうど来る長さ（目盛の高さは超えない）。どの見出しも部の頭の位置に乗り、
  // どの部でも、頭まで送ると針が見出しの真上に来る。最後の部では、針は見出しの文字の横を下りていく。
  // 前の見出しに重なるなら下へずらし、それで下端からはみ出すなら上へ押し戻す
  const GAP = 8, // 見出しどうしの最小の間（px）
    PAD = 8; // 見出しの文字と、いちばん近い刻みの間（px）
  let max = 1,
    h = 1,
    span = 1,
    dpr = 1,
    texts = [], // 見出しの文字がある所 [上端, 下端]
    ticks = []; // 刻みの位置
  function measure() {
    max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    h = nav.clientHeight;
    dpr = devicePixelRatio || 1;
    const len = heads.map((a) => a.offsetHeight);
    const rs = parts.map((p) => {
      const s = p.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(p).scrollMarginTop || 0);
      return Math.min(max, Math.max(0, s)) / max;
    });
    const rl = rs[rs.length - 1];
    span = rl > 0 ? Math.min(h, (h - len[len.length - 1]) / rl) : h;
    const ys = rs.map((r) => r * span);
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + len[i - 1] + GAP);
    for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], (i === ys.length - 1 ? h : ys[i + 1] - GAP) - len[i]);
    heads.forEach((a, i) => (a.style.top = ys[i] + "px"));
    // 文字の上下の空きは同じ（list.css で字間の分を下の余白から引いてある）
    texts = heads.map((a, i) => {
      const s = a.firstElementChild,
        pad = parseFloat(getComputedStyle(s).paddingTop),
        top = ys[i] + s.offsetTop;
      return [top + pad, top + s.offsetHeight - pad];
    });
    // 上端と最初の見出しの間、見出しと見出しの間、最後の見出しと下端の間に、刻みを STEP 前後の間隔で両端を揃えて割り付ける。
    // 間が STEP に満たない所には描かない
    ticks = [];
    const lay = (a, b) => {
      if (b - a < STEP) return;
      const n = Math.round((b - a) / STEP);
      for (let k = 0; k <= n; k++) ticks.push(Math.round((a + ((b - a) * k) / n) * dpr) / dpr);
    };
    let from = 0;
    texts.forEach(([a, b]) => {
      lay(from, a - PAD);
      from = b + PAD;
    });
    lay(from, h);
    cv.width = W * dpr;
    cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // 今読んでいる部は、頭が画面の上 3 分の 1 より上に来ている最後の部。紙の下端まで来たら最後の部
  function update() {
    let cur = 0;
    parts.forEach((p, i) => {
      if (p.getBoundingClientRect().top < innerHeight / 3) cur = i;
    });
    if (scrollY >= max - 2) cur = parts.length - 1;
    heads.forEach((a, i) => a.classList.toggle("is-here", i === cur));
  }

  // ── 息遣い ──
  // 刻みは、線の無い軸から左右へ同じ長さで伸びる。針に近いほど長く濃い（膨らみ）。膨らみは息吹の球の呼吸と同じ周期
  // （index.html の lfoT×0.7。1 秒に 0.67 ラジアンで、約 9.4 秒）でゆっくり膨らんで縮む。
  // 紙を送ると、送った速さの分だけ息を吸うように膨らみが大きく広くなり、止まると吐くように戻る。
  // 針の色は、メニューのダイヤルの三角と同じ（hsl(15, 48%, 63%)）。針が見出しの文字にかかる所では、文字を避けて左右だけに出す。
  // 動きを減らす設定のときは、呼吸も勢いも止めて、膨らみだけを残す
  const HALF = 12, // 刻みが軸から片側へ伸びられる長さ（px）
    W = HALF * 2 + 1,
    STEP = 6,
    CLEAR = 8; // 針が見出しの文字を避けるときの、軸から片側の空き（px）
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let vel = 0,
    lastY = scrollY,
    prev = performance.now();
  function draw(now) {
    vel *= Math.exp(-(now - prev) / 600);
    prev = now;
    const breath = still.matches ? 0.5 : 0.5 + 0.5 * Math.sin((now / 1000) * 0.672),
      v = still.matches ? 0 : vel,
      my = Math.round(Math.min(1, scrollY / max) * span * dpr) / dpr,
      sigma = 16 + 10 * breath + 48 * v,
      amp = 0.55 + 0.2 * breath + 0.6 * v;
    ctx.clearRect(0, 0, W, h);
    for (const y of ticks) {
      const d = (y - my) / sigma,
        k = Math.exp(-d * d) * amp;
      ctx.fillStyle = `rgba(106, 106, 101, ${(y < my ? 0.42 : 0.3) + 0.58 * Math.min(1, k)})`;
      const len = Math.min(HALF, Math.round(2 + 7 * k));
      ctx.fillRect(HALF - len, y, len * 2 + 1, 1);
    }
    let nl = Math.min(HALF, Math.round(3 + 6 * amp));
    ctx.fillStyle = "hsl(15, 48%, 63%)";
    if (texts.some(([a, b]) => my > a - 3 && my < b + 3)) {
      nl = HALF;
      ctx.fillRect(HALF - nl, my, nl - CLEAR, 1);
      ctx.fillRect(HALF + 1 + CLEAR, my, nl - CLEAR, 1);
    } else ctx.fillRect(HALF - nl, my, nl * 2 + 1, 1);
    requestAnimationFrame(draw);
  }

  const refresh = () => (measure(), update());
  addEventListener(
    "scroll",
    () => {
      vel = Math.min(1, vel + Math.abs(scrollY - lastY) / 500);
      lastY = scrollY;
      update();
    },
    { passive: true }
  );
  addEventListener("resize", refresh);
  // 一覧の画像や動画、文字の読み込みで紙の長さが変わったら測り直す
  new ResizeObserver(refresh).observe(document.body);
  refresh();
  requestAnimationFrame(draw);
})();
