// ====== 旧版を映す ======
// 旧版の札（球の上）で版を選ぶと、息吹の上に幕を下ろし、その版を手を入れずにそのまま中に映す。
// 後ろの息吹は止めておくだけで、戻ると同じ向き・同じ値のまま続きから動く。Esc か「息吹へ戻る」で戻る。

(() => {
  const el = document.createElement("div");
  el.className = "arc";
  el.hidden = true;
  el.innerHTML = `<div class="arc-bar"><span class="arc-name"></span><button type="button" class="arc-back">息吹へ戻る ←</button></div><iframe class="arc-frame" title="旧版"></iframe>`;
  document.body.appendChild(el);
  const name = el.querySelector(".arc-name"),
    back = el.querySelector(".arc-back"),
    frame = el.querySelector(".arc-frame"),
    FADE = 350;
  let token = 0,
    from = null; // 開く前に選んでいた物（戻ったら、そこへ戻す）

  function open(v) {
    const t = ++token;
    from = document.activeElement;
    name.textContent = `${v.label} の版を表示中`;
    frame.src = v.href;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("on"));
    // 幕が下りきったら、後ろの息吹を止める
    setTimeout(() => t === token && !el.hidden && (IVKY.paused = true), FADE);
    back.focus();
  }
  function close() {
    if (el.hidden) return;
    const t = ++token;
    IVKY.paused = false;
    el.classList.remove("on");
    setTimeout(() => {
      if (t !== token) return;
      el.hidden = true;
      frame.src = "about:blank";
    }, FADE);
    if (from && from.focus) from.focus();
  }
  back.addEventListener("click", close);
  document.addEventListener("keydown", (e) => e.key === "Escape" && close());

  IVKY.archive = { open, close };
})();
