// FoldingDOM (Daniel Velasquez / Codrops) の連続面・文面同期を参考にした紙の転換。
// https://tympanus.net/codrops/2020/01/14/3d-folding-technique/
// 一枚の紙を前後の面へつなぐ。画面の上下は紙の切断面にせず、長い紙面を保つ。
function paperFoldPoint(height, progress, direction, materialY, motion) {
  const v = materialY - height / 2,
    turn = -direction * Math.PI * progress,
    bend = -direction * Math.sin(Math.PI * progress) * motion.bend,
    at = (s) => turn + bend * Math.tanh(s / (height * 0.4));
  let y = 0, z = 0;
  // 面全体の回転に、前後の遅れを持つ曲がりを重ねる。
  const steps = 24, ds = v / steps;
  for (let i = 0; i < steps; i++) {
    const a = at((i + 0.5) * ds);
    y += ds * Math.cos(a);
    z += ds * Math.sin(a);
  }
  return {
    y: height / 2 + y + direction * height * 0.12 * Math.sin(Math.PI * progress),
    z: -height * motion.depth * Math.sin(progress * Math.PI / 2) + height * 0.9 * Math.tanh(z / (height * 0.9)),
    angle: at(v),
  };
}

class PaperSurface {
  constructor(paper, world, background) {
    this.paper = paper;
    this.world = world;
    this.background = background;
    this.inverted = false;
    this.lastInversion = -1;
    this.stage = document.createElement("div");
    this.stage.className = "turn-stage";
    this.stage.setAttribute("aria-hidden", "true");
    this.stage.setAttribute("inert", "");
    this.space = document.createElement("div");
    this.space.className = "turn-space";
    this.mesh = document.createElement("div");
    this.mesh.className = "paper-mesh";
    this.space.append(world, this.mesh);
    this.stage.append(this.space);
    document.body.append(this.stage);
    this.strips = [];
  }
  begin(P, Q) {
    this.perspective = P.perspective;
    const lon = Math.atan2(2 * (Q[0] * Q[2] + Q[1] * Q[3]), 1 - 2 * (Q[2] ** 2 + Q[3] ** 2)),
      lat = Math.asin(Math.max(-1, Math.min(1, 2 * (Q[0] * Q[1] - Q[3] * Q[2])))),
      variation = Math.random() * 2 - 1,
      amp = Math.min(2, Math.abs(P.lfoAmp)), noise = Math.min(1, Math.abs(P.noise));
    // 一回の往復中は固定する。スクロールを戻しても揺らぎの値は跳ばない。
    this.motion = {
      axis: Math.sin(lon) * 0.25 + Math.sin(lat * 2) * 0.18 + (variation < 0 ? -1 : 1) * (0.22 + Math.abs(variation) * 0.24),
      bank: Math.sin(lon + variation) * 0.12,
      drift: (Math.sin(lon) * 0.08 + variation * 0.1),
      bend: 0.65 + amp * 0.12 + noise * 0.1,
      depth: 0.95 + Math.min(2.5, Math.abs(P.radiusBase) / 520) * 0.1,
      duration: (1080 + variation * 80) / (1 + Math.min(4, Math.abs(P.lfoRate)) * 0.09),
    };
    this.distance = Math.max(this.H * 2, this.W * (2.2 + Math.max(0, Math.min(1, P.perspective / 5000))));
    this.stage.style.perspective = this.distance + "px";
  }
  resize(width, height, left) {
    if (this.W !== width || this.H !== height) this.clear();
    this.W = width;
    this.H = height;
    this.distance = Math.max(height * 2, width * (2.2 + Math.max(0, Math.min(1, (this.perspective ?? 3000) / 5000))));
    this.stage.style.perspective = this.distance + "px";
    this.mesh.style.left = left + "px";
    this.mesh.style.width = width + "px";
    const depth = height * 0.35;
    this.world.style.transform = "translateZ(" + -depth + "px) scale(" + (1 + depth / this.distance) + ")";
  }
  clear() {
    this.mesh.replaceChildren();
    this.strips = [];
    this.offset = null;
  }
  pose(progress, pointer) {
    const x = pointer.x, y = pointer.y, sweep = Math.sin(Math.PI * progress),
      motion = this.motion,
      // 紙が見えている間、カーソルに対する傾きは本文と同じ強さで効く。
      rx = -y * 0.18,
      ry = x * 0.26 + (motion?.bank || 0) * sweep,
      rz = x * y * 0.045 + (motion?.axis || 0) * sweep,
      dx = this.W * (x * 0.035 + (motion?.drift || 0) * sweep);
    return `translateX(${dx}px) rotateZ(${rz}rad) rotateX(${rx}rad) rotateY(${ry}rad)`;
  }
  capture(offset) {
    if (this.offset === offset && this.strips.length) return;
    this.clear();
    this.offset = offset;
    const { W, H, paper } = this, previous = paper.style.transform;
    paper.style.transform = "none";
    const origin = paper.getBoundingClientRect(),
      top = Math.max(-offset, -H * 1.5),
      bottom = Math.min(paper.offsetHeight - offset, H * 2.5),
      selector = ".paper-return, .part > .sec-head, .part > h1, .part > h2, .part > .count, .part > .lead, .part > .sec > .sec-head, #price > .pr-block, #ways > .way, .tpl, .work > .yt, .work > .thumb, .work > .winfo",
      blocks = Array.from(paper.querySelectorAll(selector)).map((el) => {
        const box = el.getBoundingClientRect(), heading = el.matches("h1,h2.title"),
          height = heading ? el.offsetHeight : box.height,
          y = (heading ? box.bottom - height : box.top) - origin.top - offset;
        return { el, x: box.left - origin.left, y, width: box.width, height, heading };
      }).filter((b) => b.y < bottom && b.y + b.height > top);
    for (const el of paper.querySelectorAll(".work, .works")) {
      const box = el.getBoundingClientRect(),
        y = (el.matches(".work") ? box.top : box.bottom - 1) - origin.top - offset;
      if (y >= top && y < bottom) blocks.push({ x: box.left - origin.left, y, width: box.width, height: 1, rule: true });
    }
    paper.style.transform = previous;
    const joints = [top, ...Array.from({ length: 17 }, (_, i) => H * i / 16).filter((y) => y > top && y < bottom), bottom],
      fragment = document.createDocumentFragment();
    for (let i = 0; i < joints.length - 1; i++) {
      const y = joints[i], end = joints[i + 1], height = end - y;
      if (height <= 0) continue;
      const strip = document.createElement("div"), front = document.createElement("div"),
        back = document.createElement("div"), frontInk = document.createElement("div");
      strip.className = "paper-strip";
      front.className = "paper-strip-front";
      back.className = "paper-strip-back";
      frontInk.className = "paper-front-ink";
      front.append(frontInk);
      strip.style.width = W + "px";
      strip.style.height = height + 0.7 + "px";
      strip.style.setProperty("--fiber-x", "0px");
      strip.style.setProperty("--fiber-y", -(offset + y) + "px");
      for (const b of blocks) {
        if (b.y >= end + 1 || b.y + b.height <= y - 1) continue;
        const copy = b.rule ? document.createElement("div") : b.el.cloneNode(true);
        if (b.rule) copy.className = "paper-snapshot-rule";
        else {
          for (const el of [copy, ...copy.querySelectorAll("*")]) {
            el.removeAttribute("id");
            el.removeAttribute("autofocus");
            for (const attr of Array.from(el.attributes)) if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
            if (el.matches("a,button,input,textarea,iframe")) el.setAttribute("tabindex", "-1");
          }
          for (const frame of copy.querySelectorAll("iframe")) {
            const placeholder = document.createElement("div"), yt = frame.closest(".yt"), id = yt?.dataset.yt;
            placeholder.className = "paper-video-still";
            if (id) placeholder.style.backgroundImage = "url(https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg)";
            frame.replaceWith(placeholder);
          }
          copy.classList.add("paper-snapshot-block");
        }
        Object.assign(copy.style, {
          position: "absolute", left: b.x + "px", top: b.y - y + "px",
          width: b.width + "px", height: b.height + "px", margin: "0",
          transform: b.heading ? "scaleY(0.86)" : "none",
        });
        frontInk.append(copy);
      }
      const ink = document.createElement("div");
      ink.className = "paper-back-ink";
      for (const block of frontInk.children) ink.append(block.cloneNode(true));
      back.append(ink);
      const patina = window.paperPatina?.snapshot(W, height + 0.7, offset + y);
      if (patina) frontInk.append(...patina);
      strip.append(front, back);
      fragment.append(strip);
      this.strips.push({ el: strip, top: y, height, patina, patinaRevision: window.paperPatina?.revision });
    }
    this.mesh.append(fragment);
  }
  render(dir, p, reduced, offset, pointer) {
    // 中央の約45%では静止し、外側でなめらかに効かせる。端で従来と同じ強さになる。
    // 読んでいる紙・回り込む面・曲がりへ、同じ反応を渡す。
    const edge = (v) => {
      const t = Math.max(0, Math.min(1, (Math.abs(v) - 0.45) / 0.55));
      return Math.sign(v) * t * t * (3 - 2 * t);
    };
    pointer = { x: edge(pointer.x), y: edge(pointer.y) };
    const sheen = (0.24 + Math.hypot(pointer.x, pointer.y) * 0.5).toFixed(3);
    this.paper.style.setProperty("--patina-sheen", sheen);
    this.mesh.style.setProperty("--patina-sheen", sheen);
    if (!dir || p <= 0) this.inverted = false;
    const theme = Math.max(0, Math.min(1, (p - 0.02) / 0.26)),
      inversion = this.inverted ? theme * theme * (3 - 2 * theme) : 0;
    if (inversion !== this.lastInversion) {
      this.lastInversion = inversion;
      this.background.style.filter = inversion ? "invert(" + inversion + ")" : "";
      this.world.contentDocument?.documentElement.style.setProperty("--scene-inversion", inversion.toFixed(4));
    }
    if (!dir || p <= 0 || reduced) {
      this.stage.style.visibility = reduced && dir ? "visible" : "hidden";
      this.mesh.style.visibility = "hidden";
      this.world.style.opacity = reduced && dir ? p : 0;
      this.paper.style.opacity = reduced && dir ? 1 - p : "";
      this.paper.style.transformOrigin = `${this.W / 2}px ${offset + this.H / 2}px`;
      this.paper.style.transform = reduced ? "" : `perspective(${this.distance}px) ${this.pose(0, pointer)}`;
      if (!dir && this.strips.length) this.clear();
      return;
    }
    this.paper.style.transform = "";
    this.capture(offset);
    this.stage.style.visibility = "visible";
    this.mesh.style.visibility = "visible";
    this.paper.style.opacity = "";
    const m = { ...this.motion, bend: this.motion.bend * (1 + pointer.y * 0.55) };
    this.mesh.style.transform = this.pose(p, pointer);
    const cross = Math.max(0, Math.min(1, (p - 0.26) / 0.6)),
      depth = this.H * 1.25 * (1 - cross * cross * (3 - 2 * cross));
    this.world.style.transform = depth < 0.01 ? "none" : `translateZ(${-depth}px) scale(${1 + depth / this.distance})`;
    const t = Math.max(0, Math.min(1, p / 0.16));
    this.world.style.opacity = t * t * (3 - 2 * t);
    const far = Math.max(0, Math.min(1, (p - 0.84) / 0.16)),
      visibility = 1 - far * far * (3 - 2 * far);
    for (const strip of this.strips) {
      if (strip.patina && strip.patinaRevision !== window.paperPatina?.revision) {
        window.paperPatina.paint(...strip.patina, offset + strip.top, strip.height + 0.7, this.W);
        strip.patinaRevision = window.paperPatina.revision;
      }
      const a = paperFoldPoint(this.H, p, dir, strip.top, m),
        b = paperFoldPoint(this.H, p, dir, strip.top + strip.height, m),
        middle = paperFoldPoint(this.H, p, dir, strip.top + strip.height / 2, m),
        angle = Math.atan2(b.z - a.z, b.y - a.y),
        scale = Math.hypot(b.y - a.y, b.z - a.z) / strip.height,
        normal = Math.cos(middle.angle),
        light = Math.abs(0.94 * normal - 0.24 * Math.sin(middle.angle));
      strip.el.style.transform = "translate3d(0," + a.y.toFixed(3) + "px," + a.z.toFixed(3) + "px) rotateX(" + angle + "rad) scaleY(" + scale + ")";
      strip.el.style.setProperty("--shade", Math.max(0, 0.18 * (0.94 - light)).toFixed(4));
      strip.el.style.setProperty("--paper-visibility", visibility.toFixed(4));
      const detail = Math.max(0, Math.min(1, (Math.abs(normal) - 0.06) / 0.22));
      strip.el.style.setProperty("--surface-detail", (detail * detail * (3 - 2 * detail)).toFixed(4));
    }
  }
}
