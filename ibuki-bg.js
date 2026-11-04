// ====== 息吹の背景（光・より線・輪） ======
// index.html の背景（drawBg）と、works.html の紙が回った先に見える息吹の面（turn.js）は、この同じ式で描きます。
// 画面を移る前後で、背景の寸法・色・位相を引き継ぐための共通描画です。
// bx は描く先の 2D コンテキスト、W・H は端末の画素での大きさ、P は息吹の値（半径・遠近・色相・ノイズ・Rate・Amp）、
// hP は球の経度（より線と輪の位相）です。
function advanceIbukiColor(P, lfoT, frames = 1) {
  const rate = Math.abs(P.lfoRate), amp = Math.abs(P.lfoAmp);
  P.hue = (P.hue + (rate * 2.5 + amp) * frames) % 360;
  P.noise = Math.min(0.55, amp * 0.15 + rate * 0.03 + Math.abs(Math.sin(lfoT * 0.7)) * amp * 0.1);
}

function drawIbukiBg(bx, W, H, dpr, P, hP) {
  const hsl = (h, s, l, a) => `hsla(${h},${s}%,${l}%,${a})`;
  bx.clearRect(0, 0, W, H);
  const cx = W / 2,
    cy = H / 2,
    mn = Math.min(W, H),
    h = P.hue,
    ns = P.noise,
    // 同じ位置は同じ揺れにする。紙の下と息吹側で描き直しても、線の位相が跳ねないための座標固定ノイズ。
    nj = (i, stream) => {
      const x = Math.sin((i + 1) * 127.1 + stream * 311.7 + hP * 74.7 + h * 0.13) * 43758.5453123;
      return (x - Math.floor(x) - 0.5) * ns * mn * 0.02;
    };
  const rN = P.radius / 520,
    rateN = P.lfoRate,
    ampN = P.lfoAmp;
  const hAmp = mn * (0.12 + Math.min(Math.abs(rateN), 4) * 0.06),
    hDir = rateN >= 0 ? 1 : -1;
  const hTurns = Math.abs(rateN) * 1.2;
  // persp→ring tilt angle: map persp(-300..8000) to ring angle(0.8..-0.2)
  const pNorm = (P.perspective + 300) / (8000 + 300); // 0..1
  const ringTiltBase = 0.8 - pNorm * 1.0; // ~0.8 at min persp, ~-0.2 at max
  const ringR = mn * (0.15 + Math.min(Math.abs(rN), 2.5) * 0.1),
    ringNeg = rN < 0;
  const bA = 0.42 + Math.min(Math.abs(ampN), 2) * 0.2;
  // glow
  const gR = mn * (0.35 + Math.abs(rN) * 0.12);
  const glow = bx.createRadialGradient(cx, cy, mn * 0.04, cx, cy, gR);
  glow.addColorStop(0, hsl(h, 20, 92, 0));
  glow.addColorStop(0.3, hsl(h, 30, 78, 0.22 + Math.abs(ampN) * 0.1));
  glow.addColorStop(0.7, hsl(h, 20, 85, 0.12));
  glow.addColorStop(1, hsl(h, 10, 95, 0));
  bx.fillStyle = glow;
  bx.fillRect(0, 0, W, H);
  // helix
  for (let s = 0; s < 2; s++) {
    const off = s * Math.PI;
    bx.beginPath();
    for (let i = 0; i <= 260; i++) {
      const t = i / 260,
        y = (t - 0.5) * H * 1.2 + cy + nj(i, s * 2),
        a =
          hTurns > 0.01
            ? t * hTurns * Math.PI * 2 * hDir + hP * 0.42 + off
            : off,
          x = cx + Math.sin(a) * hAmp + nj(i, s * 2 + 1);
      i === 0 ? bx.moveTo(x, y) : bx.lineTo(x, y);
    }
    bx.strokeStyle = hsl(h + s * 15, 18, 72, s === 0 ? bA : bA * 0.7);
    bx.lineWidth = dpr * (1.3 + s * 0.2);
    bx.stroke();
  }
  const rc = Math.max(8, Math.round(12 + Math.abs(rateN) * 5));
  for (let i = 0; i < rc; i++) {
    const t = (i + 0.5) / rc,
        y = (t - 0.5) * H * 1.2 + cy + nj(i, 80),
      a1 =
        hTurns > 0.01 ? t * hTurns * Math.PI * 2 * hDir + hP * 0.42 : 0,
      a2 = a1 + Math.PI,
      avg = (Math.cos(a1) + Math.cos(a2)) / 2;
    if (avg > -0.55) {
      bx.beginPath();
      bx.moveTo(cx + Math.sin(a1) * hAmp + nj(i, 81), y + nj(i, 82));
      bx.lineTo(cx + Math.sin(a2) * hAmp + nj(i, 83), y + nj(i, 82));
      bx.strokeStyle = hsl(h + 10, 12, 76, 0.06 + (avg + 1) * 0.07);
      bx.lineWidth = dpr * 0.7;
      bx.stroke();
    }
  }
  // rings — diagonal, persp-linked tilt
  const phase = hP * 0.15;
  bx.save();
  bx.translate(cx, cy);
  bx.rotate(0.52);
  for (let ring = 0; ring < 3; ring++) {
    const sc = 0.92 + ring * 0.1,
      ti = ringTiltBase * (1 - ring * 0.08) * (ringNeg ? -1 : 1);
    const alpha = ringNeg
      ? 0.28 + ring * 0.04
      : 0.18 + Math.abs(rN) * 0.06 - ring * 0.02;
    const rH = ringNeg ? h + 180 : h + ring * 8;
    bx.beginPath();
    if (ringNeg) bx.setLineDash([dpr * 6, dpr * 4]);
    else bx.setLineDash([]);
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2 + phase + ring * 0.2,
        rx = Math.cos(a) * ringR * sc + nj(i, 100 + ring * 2),
        ry = Math.sin(a) * ringR * sc * ti + nj(i, 101 + ring * 2);
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
