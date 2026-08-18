const FULL = 6400;
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const rad = mil => mil * 2 * Math.PI / FULL;
const mil = r => normMil(r * FULL / (2*Math.PI));
const normMil = v => ((v % FULL) + FULL) % FULL;
const parseN = v => {
  const n = Number(String(v).trim().replace(",", "."));
  if (!Number.isFinite(n)) throw new Error("Minden mezőbe érvényes számot adj meg.");
  return n;
};
const fmt = (v,d=3) => Number(v).toLocaleString("hu-HU",{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
const cross = (a,b) => a.x*b.y-a.y*b.x;

// Geodéziai tengelykonvenció:
// 0 MIL = +X (észak/felfelé)
// 1600 MIL = +Y (kelet/jobbra)
const vecFromMil = d => ({x:Math.cos(rad(d)), y:Math.sin(rad(d))});

const titles = {
  home:["Geodézia","6400 MILS"],
  reverse:["Fordított geodéziai feladat","Két koordináta → irányszög és távolság"],
  direct:["Egyszerű geodéziai feladat","Ismert pont + irányszög + távolság"],
  oriented:["Kétpontos tájolt metszés","Két ismert pont + két abszolút irány"],
  arc:["Ívmetszés","Két ismert pont + két távolság"],
  tienstra:["Hárompontos metszés","Tienstra-féle megoldás"]
};

function openScreen(id){
  $$(".screen").forEach(s=>s.classList.remove("active"));
  $("#"+id).classList.add("active");
  $("#pageTitle").textContent=titles[id][0];
  $("#pageSubtitle").textContent=titles[id][1];
  $("#backBtn").classList.toggle("hidden", id==="home");
  window.scrollTo({top:0,behavior:"instant"});
}
$$("[data-open]").forEach(b=>b.addEventListener("click",()=>openScreen(b.dataset.open)));
$("#backBtn").addEventListener("click",()=>openScreen("home"));

function values(form){
  return Object.fromEntries(new FormData(form).entries());
}
function resultBox(name, html, isError=false){
  const box=$(`[data-result="${name}"]`);
  box.innerHTML=isError?`<div class="error"><strong>Hiba:</strong> ${html}</div>`:html;
}
function grid(rows){
  return `<div class="result-grid">${rows.map(([a,b])=>`<span>${a}</span><strong>${b}</strong>`).join("")}</div>`;
}

// 1) Fordított geodéziai
$('[data-calc="reverse"]').addEventListener("submit",e=>{
  e.preventDefault();
  try{
    const v=values(e.target), ax=parseN(v.ax), ay=parseN(v.ay), bx=parseN(v.bx), by=parseN(v.by);
    const dx=bx-ax, dy=by-ay, d=Math.hypot(dx,dy);
    if(d<1e-12) throw new Error("A két pont nem lehet azonos.");
    const dir=mil(Math.atan2(dy,dx));
    resultBox("reverse",`<h3>Eredmény</h3>${grid([["Távolság",fmt(d)+" m"],["Irányszög",fmt(dir,2)+" MIL"]])}`);
  }catch(err){resultBox("reverse",err.message,true)}
});

// 2) Egyszerű geodéziai
$('[data-calc="direct"]').addEventListener("submit",e=>{
  e.preventDefault();
  try{
    const v=values(e.target);
    const x=parseN(v.x);
    const y=parseN(v.y);
    const rawDir=parseN(v.dir);
    const d=parseN(v.dist);

    if(d<0) throw new Error("A távolság nem lehet negatív.");

    const measureType = v.measureType || "target";
    const dir = measureType === "known"
      ? normMil(rawDir + 3200)
      : normMil(rawDir);

    // FONTOS:
    // X függőleges (észak), Y vízszintes (kelet).
    // Ezért 1600 MIL esetén ΔY = +d és ΔX = 0.
    const deltaX = d * Math.cos(rad(dir));
    const deltaY = d * Math.sin(rad(dir));

    const px = x + deltaX;
    const py = y + deltaY;

    const title = measureType === "known" ? "Álláspont koordinátái" : "Cél koordinátái";
    const extra = measureType === "known"
      ? `<p class="hint">A megadott irányszög automatikusan 3200 MIL-lel meg lett fordítva: ${fmt(dir,2)} MIL.</p>`
      : "";

    resultBox("direct",
      `<h3>${title}</h3>` +
      `<div class="coord-line"><strong>Y ${fmt(py)}</strong><strong>X ${fmt(px)}</strong></div>` +
      extra
    );
  }catch(err){resultBox("direct",err.message,true)}
});

// 3) Kétpontos tájolt metszés
$('[data-calc="oriented"]').addEventListener("submit",e=>{
  e.preventDefault();
  try{
    const v=values(e.target);
    const A={x:parseN(v.ax),y:parseN(v.ay)}, B={x:parseN(v.bx),y:parseN(v.by)};
    const pToA=parseN(v.dirA), pToB=parseN(v.dirB);
    const u=vecFromMil(normMil(pToA+3200));
    const w=vecFromMil(normMil(pToB+3200));
    const den=cross(u,w);
    if(Math.abs(den)<1e-10) throw new Error("A két irány párhuzamos vagy közel párhuzamos; nincs stabil metszés.");
    const BA={x:B.x-A.x,y:B.y-A.y};
    const t=cross(BA,w)/den;
    const P={x:A.x+t*u.x,y:A.y+t*u.y};
    resultBox("oriented",`<h3>Álláspont koordinátái</h3>${grid([["Y",fmt(P.y)],["X",fmt(P.x)]])}`);
  }catch(err){resultBox("oriented",err.message,true)}
});

// 4) Ívmetszés
$('[data-calc="arc"]').addEventListener("submit",e=>{
  e.preventDefault();
  try{
    const v=values(e.target);
    const A={x:parseN(v.ax),y:parseN(v.ay)}, B={x:parseN(v.bx),y:parseN(v.by)};
    const r0=parseN(v.ra), r1=parseN(v.rb);
    if(r0<0||r1<0) throw new Error("A távolság nem lehet negatív.");
    const dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy);
    if(d<1e-12) throw new Error("A két ismert pont nem lehet azonos.");
    if(d>r0+r1+1e-10) throw new Error("A két kör nem metszi egymást: a pontok túl messze vannak.");
    if(d<Math.abs(r0-r1)-1e-10) throw new Error("A két kör nem metszi egymást: az egyik kör a másik belsejében van.");
    const a=(r0*r0-r1*r1+d*d)/(2*d);
    let h2=r0*r0-a*a;
    if(h2<0 && h2>-1e-8) h2=0;
    if(h2<0) throw new Error("Nincs valós metszéspont.");
    const h=Math.sqrt(h2);
    const xm=A.x+a*dx/d, ym=A.y+a*dy/d;
    const rx=-dy*(h/d), ry=dx*(h/d);
    const P1={x:xm+rx,y:ym+ry}, P2={x:xm-rx,y:ym-ry};
    let rows=[["1. megoldás Y",fmt(P1.y)],["1. megoldás X",fmt(P1.x)]];
    if(h>1e-8) rows.push(["2. megoldás Y",fmt(P2.y)],["2. megoldás X",fmt(P2.x)]);
    resultBox("arc",`<h3>${h>1e-8?"Két lehetséges álláspont":"Érintési pont"}</h3>${grid(rows)}${h>1e-8?'<p class="hint">A terepi helyzet alapján válaszd ki a helyes megoldást.</p>':''}`);
  }catch(err){resultBox("arc",err.message,true)}
});

function angleAt(A,B,C){
  const u={x:B.x-A.x,y:B.y-A.y}, v={x:C.x-A.x,y:C.y-A.y};
  const nu=Math.hypot(u.x,u.y), nv=Math.hypot(v.x,v.y);
  if(nu<1e-12||nv<1e-12) throw new Error("Az ismert pontok között van azonos pont.");
  const c=Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/(nu*nv)));
  return Math.acos(c);
}
const cot = x => Math.cos(x)/Math.sin(x);

$('[data-calc="tienstra"]').addEventListener("submit",e=>{
  e.preventDefault();
  try{
    const v=values(e.target);
    const A={x:parseN(v.ax),y:parseN(v.ay)};
    const B={x:parseN(v.bx),y:parseN(v.by)};
    const C={x:parseN(v.cx),y:parseN(v.cy)};
    const alpha=rad(parseN(v.alpha)), beta=rad(parseN(v.beta)), gamma=rad(parseN(v.gamma));
    if(alpha<=0||beta<=0||gamma<=0) throw new Error("A mért szögeknek pozitívnak kell lenniük.");

    const Aang=angleAt(A,B,C);
    const Bang=angleAt(B,C,A);
    const Cang=angleAt(C,A,B);

    const d1=cot(Aang)-cot(alpha);
    const d2=cot(Bang)-cot(beta);
    const d3=cot(Cang)-cot(gamma);
    if([d1,d2,d3].some(x=>Math.abs(x)<1e-10)) throw new Error("Kritikus geometriai helyzet: a Tienstra-képlet egyik nevezője közel nulla.");

    const K1=1/d1, K2=1/d2, K3=1/d3;
    const sum=K1+K2+K3;
    if(Math.abs(sum)<1e-10) throw new Error("A geometria instabil; a súlyok összege közel nulla.");

    const P={
      x:(K1*A.x+K2*B.x+K3*C.x)/sum,
      y:(K1*A.y+K2*B.y+K3*C.y)/sum
    };

    const sumMeasured=(alpha+beta+gamma)*FULL/(2*Math.PI);
    const warning=Math.abs(sumMeasured-FULL)>2
      ? `<p class="hint error">Figyelem: a megadott három állásponti szög összege ${fmt(sumMeasured,2)} MIL, nem 6400 MIL. Ellenőrizd a sorrendet/mérést.</p>`:"";

    resultBox("tienstra",`<h3>Álláspont koordinátái</h3>${grid([["Y",fmt(P.y)],["X",fmt(P.x)]])}${warning}`);
  }catch(err){resultBox("tienstra",err.message,true)}
});

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{}));
}
