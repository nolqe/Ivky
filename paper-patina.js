// 紙に触れた跡。紙面の座標に保持し、入力の方向・速さ・接触で擦れ方を変える。
// 描画は見えている一画面だけ。待機中のアニメーションループは持たない。
(() => {
  const paper = document.getElementById("paper");
  if (!paper) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  class PaperPatina {
    constructor() {
      this.paper = paper;
      this.marks = [];
      this.queue = [];
      this.revision = 0;
      this.offset = 0;
      this.frame = 0;
      this.last = null;
      this.down = false;
      this.touched = 0;
      this.lastWheel = 0;
      this.lastInput = 0;
      // 色相は CSS で紙と一緒に回す。粒の形は一度だけ作る。
      this.stamps = [0, 8, 15].map((offset, i) =>
        this.stamp(`hsl(${offset}, 22%, 44%)`, i + 1));
      this.light = this.stamp("hsl(0, 45%, 97%)", 7);
      [this.ink, this.sheen] = this.layers();
      paper.append(this.ink, this.sheen);
      try {
        const saved = JSON.parse(sessionStorage.getItem("ivky-paper-patina") || "[]");
        this.marks = saved.filter(m => [m.x,m.y,m.rx,m.ry,m.angle,m.force].every(Number.isFinite))
          .slice(-180).map(m => ({ ...m, born: -10000 }));
      } catch {}
      document.addEventListener("pointerdown", e => {
        if (e.pointerType === "touch" || !paper.contains(e.target)) return;
        this.down = true;
        this.last = null;
        this.enqueue(e, "press");
      }, { passive: true });
      document.addEventListener("pointermove", e => {
        if (e.pointerType === "touch") return;
        if (!paper.contains(e.target)) { this.last = null; return; }
        const samples = e.getCoalescedEvents?.() || [];
        for (const p of (samples.length ? samples : [e]).slice(-12)) this.enqueue(p, this.down ? "rub" : "graze");
      }, { passive: true });
      addEventListener("pointerup", () => { this.down = false; this.last = null; }, { passive: true });
      addEventListener("pointercancel", () => { this.down = false; this.last = null; }, { passive: true });
      document.addEventListener("touchstart", e => {
        if (e.touches.length !== 1 || !paper.contains(e.target)) return;
        this.last = null;
        this.touched = performance.now();
        this.enqueue(e.touches[0], "press", 0.7);
      }, { passive: true });
      document.addEventListener("touchmove", e => {
        if (e.touches.length !== 1 || !paper.contains(e.target)) return;
        this.touched = performance.now();
        this.enqueue(e.touches[0], "touch", 0.7);
      }, { passive: true });
      document.addEventListener("touchend", () => { this.last = null; }, { passive: true });
      document.addEventListener("wheel", e => {
        const now = performance.now();
        if (now - this.lastWheel < 55 || document.documentElement.classList.contains("turning")) return;
        this.lastWheel = now;
        const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
        this.enqueue(e, "wheel", clamp(Math.hypot(e.deltaX, e.deltaY) * k / 200, 0.2, 1), [e.deltaX, e.deltaY]);
      }, { passive: true });
      document.addEventListener("keydown", e => {
        if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input,textarea,[contenteditable]")) return;
        const dirs = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0], PageUp:[0,-1], PageDown:[0,1], Home:[0,-1], End:[0,1], " ":[0,1], Tab:[1,0] };
        const direction = dirs[e.key];
        if (!direction) return;
        const r = e.target.getBoundingClientRect?.(), focused = e.target !== document.body && r?.width && r?.height;
        this.enqueue({ clientX: focused ? r.left+r.width/2 : innerWidth/2,
          clientY: focused ? r.top+r.height/2 : innerHeight*(direction[1]<0 ? 0.3 : 0.7) }, "key", 0.65, direction);
      }, { passive: true });
      document.addEventListener("click", e => {
        if (!e.detail && paper.contains(e.target)) this.enqueue(e, "press", 0.6);
      }, { passive: true });
      addEventListener("scroll", () => this.request(), { passive: true });
      addEventListener("resize", () => this.request(), { passive: true });
      addEventListener("pagehide", () => {
        this.flush(performance.now());
        try { sessionStorage.setItem("ivky-paper-patina", JSON.stringify(this.marks.filter(m => m.kind !== "graze").slice(-180))); } catch {}
        cancelAnimationFrame(this.frame);
      });
      this.request();
    }
    stamp(color, seed) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 128, 128);
      const data = ctx.getImageData(0, 0, 128, 128);
      let n = seed * 1337;
      const rnd = () => ((n = (Math.imul(n,1664525)+1013904223)>>>0) / 4294967296);
      for (let y=0;y<128;y++) for (let x=0;x<128;x++) {
        const u=(x-63.5)/64, v=(y-63.5)/64, r=u*u+v*v,
          fiber=0.55+0.45*Math.sin(y*2.3+Math.sin(x*0.09)*1.8), i=(y*128+x)*4;
        data.data[i+3]=255*Math.pow(Math.max(0,1-r),1.7)*(0.2+0.8*rnd())*fiber;
      }
      ctx.putImageData(data,0,0);
      return c;
    }
    layers() {
      return ["ink","sheen"].map(kind => {
        const c=document.createElement("canvas");
        c.className="paper-patina paper-patina--"+kind;
        c.setAttribute("aria-hidden","true");
        return c;
      });
    }
    enqueue(e,kind,force,direction) {
      if (document.documentElement.classList.contains("turning")) return;
      this.queue.push({x:e.clientX,y:e.clientY,kind,force:force??(e.pressure||0.5),direction,time:performance.now()});
      if(this.queue.length>40)this.queue.splice(0,this.queue.length-40);
      this.lastInput=performance.now();
      this.request();
    }
    request() {
      if (!this.frame) this.frame=requestAnimationFrame(now => { this.frame=0; this.flush(now); });
    }
    // 射影された紙面を逆に辿る。傾いても、跡がカーソルからずれない。
    mapping() {
      const slot=document.getElementById("paper-slot").getBoundingClientRect(),
        origin=paper.style.transformOrigin.split(" ").map(parseFloat), ox=origin[0]||0, oy=origin[1]||0,
        m=new DOMMatrix().translate(ox,oy).multiply(new DOMMatrix(paper.style.transform||"none")).translate(-ox,-oy);
      return (x,y) => {
        const X=x-slot.left,Y=y-slot.top,a=m.m11-X*m.m14,b=m.m21-X*m.m24,
          c=m.m12-Y*m.m14,d=m.m22-Y*m.m24,u=X*m.m44-m.m41,v=Y*m.m44-m.m42,det=a*d-b*c;
        return Math.abs(det)>0.0001 ? [(u*d-b*v)/det,(a*v-u*c)/det] : [X,Y];
      };
    }
    flush(now) {
      const w=paper.offsetWidth, h=paper.offsetHeight;
      if (!w || !h) return;
      const map=this.queue.length ? this.mapping() : null;
      for(const e of this.queue) {
        const p=map(e.x,e.y);
        if(p[0]<0||p[0]>w||p[1]<0||p[1]>h) {this.last=null;continue;}
        const contact=e.kind==="rub"||e.kind==="touch",
          before=this.last, delta=before&&(contact||e.time-before.time<180) ? [p[0]-before.x,p[1]-before.y] : [0,0],
          distance=Math.hypot(...delta), dir=e.direction||delta, angle=Math.hypot(...dir)>0.1?Math.atan2(dir[1],dir[0]):-0.3;
        if(e.kind==="graze"&&distance<8) {
          if(!before || e.time-before.time>=180)this.last={x:p[0],y:p[1],time:e.time};
          continue;
        }
        const strong=e.kind==="rub"||e.kind==="touch", isWheel=e.kind==="wheel"||e.kind==="key",
          steps=strong ? Math.min(48,Math.max(1,Math.ceil(distance/11))) : 1,
          speed=distance/Math.max(8,e.time-(before?.time??e.time));
        for(let i=1;i<=steps;i++) {
          const t=i/steps,x=strong&&before?before.x+delta[0]*t:p[0],y=strong&&before?before.y+delta[1]*t:p[1],
            rx=e.kind==="press"?25:strong?24+e.force*18:isWheel?28+e.force*24:17,
            ry=e.kind==="press"?19:strong?18+e.force*10:isWheel?15+e.force*9:8,
            force=e.kind==="press"?0.36:strong?0.19*clamp(1.2-speed*0.08,0.65,1.2):isWheel?0.24:0.07;
          this.marks.push({x:x/w,y,rx,ry,angle,force,kind:e.kind,color:isWheel?1:e.kind==="press"?2:Math.abs(dir[1])>Math.abs(dir[0])?1:0,born:now});
        }
        this.last={x:p[0],y:p[1],time:e.time};
      }
      this.queue.length=0;
      while(this.marks.length>220) {
        const weak=this.marks.findIndex(m=>m.kind==="graze");
        this.marks.splice(weak<0?0:weak,1);
      }
      this.offset=clamp(scrollY-document.getElementById("zone-top").offsetHeight,0,Math.max(0,h-innerHeight));
      const top=Math.max(0,this.offset-80), height=Math.min(h-top,innerHeight+160);
      this.ink.style.top=this.sheen.style.top=top+"px";
      this.paint(this.ink,this.sheen,top,height,w,now,Math.min(1.25,devicePixelRatio||1));
      this.revision++;
      dispatchEvent(new Event("paper-patina"));
      if(this.marks.some(m=>now-m.born<700)) this.request();
    }
    paint(ink,sheen,top,height,width,now=performance.now(),dpr=1) {
      const contexts=[ink,sheen].map(c=>{
        const w=Math.ceil(width*dpr),h=Math.ceil(height*dpr);
        if(c.width!==w||c.height!==h){c.width=w;c.height=h;c.style.height=height+"px";}
        const ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);return ctx;
      });
      for(const m of this.marks) {
        if(m.y+m.rx<top||m.y-m.rx>top+height)continue;
        const alpha=m.force*(0.48+0.52*Math.exp(-Math.max(0,now-m.born)/160));
        contexts.forEach((ctx,i)=>{
          ctx.save();ctx.globalAlpha=alpha*(i?0.9:1);ctx.translate(m.x*width,m.y-top+(i?-2:1));
          ctx.rotate(m.angle);ctx.scale(m.rx,m.ry);ctx.drawImage(i?this.light:this.stamps[m.color%3],-1,-1,2,2);ctx.restore();
        });
      }
    }
    snapshot(width,height,top) {
      const layers=this.layers();
      this.paint(...layers,top,height,width);
      return layers;
    }
  }
  window.paperPatina=new PaperPatina();
})();
