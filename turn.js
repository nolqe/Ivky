// 記録の紙と息吹の往復。スクロールが紙の回り込み量になり、同じ場の息吹へつながる。
(() => {
  const root = document.documentElement,
    paper = document.getElementById("paper"),
    slot = document.getElementById("paper-slot"),
    zoneTop = document.getElementById("zone-top"),
    zoneBottom = document.getElementById("zone-bottom"),
    cv = document.querySelector(".ibuki"),
    ctx = cv.getContext("2d"),
    still = matchMedia("(prefers-reduced-motion: reduce)");
  // 息吹の場面を保持し、紙が回る間だけ現在の色へ更新する。
  const sceneFrame = document.createElement("iframe");
  sceneFrame.className = "ibuki-scene";
  sceneFrame.title = "息吹の場面";
  sceneFrame.setAttribute("aria-hidden", "true");
  sceneFrame.setAttribute("inert", "");
  sceneFrame.tabIndex = -1;
  let sceneLoaded = false, resolveScene;
  const sceneReady = new Promise((resolve) => { resolveScene = resolve; });
  function sceneIsReady() {
    if (sceneLoaded) return;
    sceneLoaded = true;
    root.classList.add("scene-ready");
    removeEventListener("message", onSceneMessage);
    syncSceneColor();
    resolveScene();
  }
  function onSceneMessage(e) {
    if (e.source === sceneFrame.contentWindow && e.origin === location.origin && e.data?.type === "ivky:scene-ready") sceneIsReady();
  }
  addEventListener("message", onSceneMessage);
  document.body.append(sceneFrame);
  const surface = new PaperSurface(paper, sceneFrame, cv);
  const KEY = "ivky-turn", POS = "ivky-paper",
    clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let came = null, look = null;
  try {
    came = JSON.parse(sessionStorage.getItem(KEY) || "null");
    sessionStorage.removeItem(KEY);
    look = JSON.parse(sessionStorage.getItem("ivky-look") || "null");
  } catch (e) {}
  const fromIbuki = came?.from === "ibuki" && Date.now() - came.at < 8000;
  surface.inverted = fromIbuki && !!look?.inverted;
  sceneFrame.src = "./?paper-scene=1&paper-inverted=" + (surface.inverted ? "1" : "0");
  const P = Object.assign({ radiusBase: 520, radius: 520, perspective: 3000, lfoRate: 0, lfoAmp: 0, hue: 0, noise: 0 }, look?.P || {});
  if (Number.isFinite(look?.radius)) P.radius = look.radius;
  const Q = Array.isArray(look?.Q) && look.Q.length === 4 ? look.Q : [1, 0, 0, 0],
    phase = Math.atan2(2 * (Q[0] * Q[2] + Q[1] * Q[3]), 1 - 2 * (Q[2] ** 2 + Q[3] ** 2));
  const pointer = {
    x: clamp(Number(look?.cursor?.x) || 0, -1, 1),
    y: clamp(Number(look?.cursor?.y) || 0, -1, 1),
    revision: 0,
  };
  const aim = { x: pointer.x, y: pointer.y };
  let colorPhase = Number.isFinite(look?.lfoT) ? look.lfoT : 0,
    colorTime = performance.now(), paletteTime = -Infinity, sceneHue = NaN, sceneNoise = NaN;
  P.hue = Number.isFinite(P.hue) ? ((P.hue % 360) + 360) % 360 : 0;
  function applyPalette() {
    const paperHue = (P.hue + (P.radius < 0 ? 180 : 0)) % 360;
    root.style.setProperty("--paper-hue", paperHue.toFixed(2));
    root.style.setProperty("--paper-light-hue", P.hue.toFixed(2));
    root.style.setProperty("--grain", (0.012 + Math.min(1, Math.abs(P.noise)) * 0.006).toFixed(3));
  }
  function advanceColor(now) {
    const frames = clamp(now - colorTime, 0, 64) / (1000 / 60);
    colorTime = now;
    colorPhase += frames * 0.016;
    advanceIbukiColor(P, colorPhase, frames);
    if (now - paletteTime < 1000 / 30) return false;
    paletteTime = now;
    applyPalette();
    return true;
  }
  function syncSceneColor() {
    if (sceneLoaded) sceneFrame.contentWindow.postMessage({
      type: "ivky:scene-color", hue: P.hue, noise: P.noise,
    }, location.origin);
  }
  applyPalette();

  let H = 1, Z = 1, Zb = 1, maxP = 0, dpr = 0,
    gutter = Math.max(0, innerWidth - root.clientWidth);
  function measure() {
    // バーを隠した時の再計測でも、紙の幅と文字の折返しを変えない。
    if (!root.classList.contains("turning")) gutter = Math.max(0, innerWidth - root.clientWidth);
    H = innerHeight;
    Z = zoneTop.offsetHeight;
    Zb = zoneBottom.offsetHeight;
    const width = Math.min(innerWidth - gutter - 24, 840),
      left = (innerWidth - gutter - width) / 2;
    slot.style.width = width + "px";
    const ph = paper.offsetHeight;
    maxP = Math.max(0, ph - H);
    slot.style.height = ph + "px";
    root.style.setProperty("--paper-x", left + "px");
    root.style.setProperty("--paper-w", width + "px");
    root.style.setProperty("--scene-h", H + "px");
    surface.resize(width, H, left);
    const d = devicePixelRatio || 1,
      w = Math.round(innerWidth * d), h = Math.round(H * d);
    // 紙の下の景色は保持する。内容を読む間は同じキャンバスを描き直さない。
    if (cv.width !== w || cv.height !== h || dpr !== d) {
      dpr = d;
      cv.width = w;
      cv.height = h;
      drawSceneColor();
    }
  }
  function drawSceneColor() {
    drawIbukiBg(ctx, cv.width, cv.height, dpr, P, phase);
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#f4f4f2";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = "source-over";
    sceneHue = P.hue;
    sceneNoise = P.noise;
    syncSceneColor();
  }
  const slice = () => clamp(scrollY - Z, 0, maxP);
  const at = (el) => {
    let y = 0;
    for (let n = el; n && n !== paper; n = n.offsetParent) y += n.offsetTop;
    return y;
  };
  function zone() {
    if (scrollY < Z) return [-1, clamp((Z - scrollY) / Z, 0, 1)];
    const over = scrollY - Z - maxP;
    return over > 0 ? [1, clamp(over / Zb, 0, 1)] : [0, 0];
  }

  let mode = "paper", armed = false, side = null, lastDir = 1,
    lastP = -1, lastOffset = -1, lastPointer = -1, lastPatina = -1, pointerTime = performance.now(),
    arrivalTo = null, arrivalDir = -1, autoTimer = 0, autoRaf = 0, scrollRaf = 0;
  function frame() {
    const now = performance.now(), follow = 1 - Math.exp(-Math.min(64, now - pointerTime) / 55);
    const colorChanged = advanceColor(now);
    pointerTime = now;
    const moving = Math.hypot(aim.x-pointer.x, aim.y-pointer.y) > 0.0001;
    if (moving) {
      pointer.x += (aim.x-pointer.x) * follow;
      pointer.y += (aim.y-pointer.y) * follow;
      pointer.revision++;
    }
    let [dir, p] = zone();
    // スクロールが丸めで先に終端へ着いても、選んだ紙面を保持する。
    // 本文の実際の位置へ移すのと同じ処理内で、通常表示に切り替える。
    if (arrivalTo && (!dir || p === 0)) { dir = arrivalDir; p = 0.0001; }
    if (dir && colorChanged && (P.hue !== sceneHue || P.noise !== sceneNoise)) drawSceneColor();
    if (dir !== side) {
      if (dir) surface.begin(P, Q);
      side = dir;
      lastP = -1;
      root.classList.toggle("turning", !!dir);
      root.classList.toggle("in-top", dir < 0);
      root.classList.toggle("in-bottom", dir > 0);
    }
    const offset = arrivalTo ? clamp(arrivalTo() - Z, 0, maxP) : dir > 0 ? maxP : dir < 0 ? 0 : slice(),
      moved = offset !== lastOffset;
    if (moved) {
      lastOffset = offset;
      root.style.setProperty("--paper-offset", -offset + "px");
    }
    if (p !== lastP || moved || lastPointer !== pointer.revision || lastPatina !== window.paperPatina?.revision) {
      lastP = p;
      lastPointer = pointer.revision;
      lastPatina = window.paperPatina?.revision;
      root.style.setProperty("--zp", p.toFixed(4));
      surface.render(dir, p, still.matches, offset, pointer);
    }
    if (!dir) armed = true;
    else lastDir = dir;
    if (dir && p >= 0.9995 && armed && mode === "paper") leave(dir);
    const colorMoving = P.lfoRate !== 0 || P.lfoAmp !== 0;
    if ((moving || colorMoving) && mode !== "gone" && !document.hidden) onScroll();
  }
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      frame();
    });
  }
  function onPointer(e) {
    const x = clamp(e.clientX / innerWidth * 2 - 1, -1, 1),
      y = clamp(e.clientY / innerHeight * 2 - 1, -1, 1);
    if (x === aim.x && y === aim.y) return;
    aim.x = x;
    aim.y = y;
    onScroll();
  }
  const jump = (y) => scrollTo({ top: y, behavior: "instant" });
  const end = (dir) => dir > 0 ? Z + maxP + Zb : 0;
  const hold = (e) => e.preventDefault();
  function unlock() {
    removeEventListener("wheel", hold);
    removeEventListener("touchmove", hold);
  }
  function stopAuto() {
    clearTimeout(autoTimer);
    autoTimer = 0;
    cancelAnimationFrame(autoRaf);
    autoRaf = 0;
    unlock();
  }
  function run(to, done) {
    stopAuto();
    mode = "auto";
    addEventListener("wheel", hold, { passive: false });
    addEventListener("touchmove", hold, { passive: false });
    const finish = () => {
      stopAuto();
      jump(to());
      frame();
      if (mode !== "gone") mode = "paper";
      done?.();
    };
    if (still.matches) return finish();
    const start = performance.now(), from = scrollY, duration = surface.motion?.duration || 1100;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration),
        ease = t * t * t * (10 + t * (-15 + 6 * t));
      jump(from + (to() - from) * ease);
      frame();
      if (t < 1) autoRaf = requestAnimationFrame(step);
      else finish();
    };
    autoTimer = setTimeout(finish, duration + 500);
    autoRaf = requestAnimationFrame(step);
  }
  function save() {
    try {
      sessionStorage.setItem(POS, JSON.stringify({ pos: slice(), dir: lastDir, left: mode === "gone" }));
    } catch (e) {}
  }
  function leave(dir) {
    if (mode === "gone") return;
    mode = "gone";
    lastDir = dir;
    save();
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ from: "paper", at: Date.now() }));
      sessionStorage.setItem("ivky-look", JSON.stringify({ P, Q, radius: P.radius, lfoT: colorPhase, inverted: false, cursor: { x: pointer.x, y: pointer.y } }));
    } catch (e) {}
    location.href = "./";
  }
  function arrive(dir, to) {
    // 選んだ部の一画面を最初から載せる。長い一覧を高速で通り抜けない。
    arrivalTo = to;
    arrivalDir = dir;
    armed = false;
    mode = "auto";
    jump(end(dir));
    frame();
    const start = () => {
      root.classList.remove("turn-in");
      markReady();
      run(() => dir < 0 ? Z : Z + maxP, () => {
        const dest = to();
        arrivalTo = null;
        jump(dest);
        frame();
      });
    };
    if (sceneLoaded) start();
    else Promise.race([sceneReady, new Promise((resolve) => setTimeout(resolve, 1800))]).then(start);
  }
  function markReady() {
    if (document.getElementById("turned")) return;
    const marker = document.createElement("i");
    marker.id = "turned";
    marker.hidden = true;
    document.body.append(marker);
  }

  document.querySelectorAll(".paper-return").forEach((a) => {
    a.addEventListener("click", (e) => {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (mode !== "paper") return;
      const dir = Number(a.dataset.return);
      run(() => end(dir), () => leave(dir));
    });
  });
  addEventListener("keydown", (e) => {
    if (e.altKey || e.target.closest?.("input, textarea, [contenteditable]")) return;
    if (e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    if (mode !== "paper") return;
    const dir = e.key === "Home" ? -1 : 1;
    const edge = dir < 0 ? Z : Z + maxP;
    if ((dir < 0 && scrollY > edge + 2) || (dir > 0 && scrollY < edge - 2)) {
      jump(edge);
      frame();
      return;
    }
    run(() => end(dir), () => leave(dir));
  });

  measure();
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(POS) || "null"); } catch (e) {}
  const nav = performance.getEntriesByType("navigation")[0],
    again = saved && (nav?.type === "back_forward" || nav?.type === "reload"),
    target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  let keep = !again && target ? target : null;
  const head = (el) => el.id === "works" ? 0 : at(el) - parseFloat(getComputedStyle(el).scrollMarginTop || 0);
  const want = () => Z + clamp(again ? saved.pos : keep ? head(keep) : 0, 0, maxP);
  function visitPart(el) {
    if (!el?.matches(".part[data-label]") || mode !== "paper") return;
    keep = null;
    // 傾いた見た目の矩形ではなく、紙の中の位置へ移動する。
    scrollTo({ top: Z + clamp(head(el), 0, maxP), behavior: still.matches ? "instant" : "smooth" });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!el?.matches(".part[data-label]") || mode !== "paper") return;
    e.preventDefault();
    history.pushState(null, "", a.hash);
    visitPart(el);
  });
  addEventListener("hashchange", () => visitPart(document.getElementById(decodeURIComponent(location.hash.slice(1)))));
  const manualEvents = ["wheel", "touchstart", "keydown", "pointerdown"];
  const release = () => {
    if (mode !== "paper") return;
    keep = null;
    manualEvents.forEach((event) => removeEventListener(event, release));
  };
  manualEvents.forEach((event) => addEventListener(event, release, { passive: true }));
  if (fromIbuki) arrive(came.dir === 1 ? 1 : -1, want);
  else if (again && saved.left) arrive(saved.dir === -1 ? -1 : 1, want);
  else {
    jump(want());
    root.classList.remove("turn-in");
    frame();
    Promise.race([sceneReady, new Promise((resolve) => setTimeout(resolve, 1800))]).then(markReady);
  }
  function refit() {
    const beforeH = H, beforeZ = Z, beforeW = surface.W,
      position = slice(), dir = side, progress = Math.max(0, lastP);
    measure();
    lastP = -1;
    if (mode === "paper") {
      if (keep) jump(want());
      else if (H !== beforeH || Z !== beforeZ || surface.W !== beforeW) {
        if (dir) jump(dir < 0 ? Z * (1 - progress) : Z + maxP + Zb * progress);
        else jump(Z + clamp(position, 0, maxP));
      }
    }
    frame();
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("paper-patina", onScroll);
  addEventListener("pointermove", onPointer, { passive: true });
  addEventListener("pointerdown", onPointer, { passive: true });
  addEventListener("wheel", onPointer, { passive: true });
  addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) onPointer(e.touches[0]);
  }, { passive: true });
  addEventListener("resize", refit);
  new ResizeObserver(refit).observe(paper);
  still.addEventListener("change", refit);
  addEventListener("visibilitychange", () => {
    colorTime = performance.now();
    if (!document.hidden) onScroll();
  });
  addEventListener("pagehide", () => {
    save();
    stopAuto();
    cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
  });
  addEventListener("pageshow", (e) => {
    colorTime = performance.now();
    if (!e.persisted || mode !== "gone") return;
    const pos = slice();
    arrive(lastDir, () => Z + pos);
  });
})();
