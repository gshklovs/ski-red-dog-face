import{SKI_MODELS as Qt,skiThumbURL as Ht,makeSkiRig as pt,styleSkiRig as ft,rememberSkiId as Zt,SKI_DEFAULT as ea}from"./ski.js";import{GLIDER_MODELS as ta,GLIDER_DEFAULT as aa,rememberGliderId as na}from"./glider.js";import{BIKE_MODELS as ia,BIKE_DEFAULT as oa,bikeThumbURL as ra,rememberBikeId as sa,makeBikeRig as la,styleBikeRig as da,getBikeModel as ca,bikeRider as pa}from"./bike.js";import{SLED_MODELS as fa,SLED_DEFAULT as ka,sledThumbURL as ha,rememberSledId as ga,resolveSledId as ua,makeSledRig as ma,styleSledRig as ba}from"./sled.js";import{SNOWMOBILE_MODELS as _a,SNOWMOBILE_DEFAULT as xa,snowmobileThumbURL as va,rememberSnowmobileId as wa,resolveSnowmobileId as ya,makeSnowmobileRig as Sa,styleSnowmobileRig as Ma}from"./snowmobile.js";import{BIKE_GEAR as La,BRAND as kt}from"./flags.js";import{OUTFITS as Ie,byCode as Ta,previewOutfit as le,toggleOf as Pa,rememberOutfit as Oa,resolveOutfit as Ca,PARTS as de,parseLook as qe,serialise as Ba,paint as ht,swatch as Fe,cloneRig as za,rigOf as Aa}from"./rider.js";import{R as gt,C as ut}from"./atlas.js";import mt from"./outfits/after.js";import{KNOBS as Ia,get as ce,set as qa}from"./settings.js";const Fa={wing:{base:"#dd6a2a",ink:"#6b4a2a",accent:"#f2c98a"},rocket:{base:"#1b1c22",ink:"#0b0b0e",accent:"#b9bec4"}},r=(e,s,c)=>{const p=document.createElement(e);return s&&(p.className=s),c!=null&&(p.textContent=c),p},bt="poi-lab.play.locker.",Ra=(e,s)=>{try{localStorage.setItem(bt+e,s)}catch{}},Na=e=>{try{return localStorage.getItem(bt+e)}catch{return null}},_t=e=>e<0?0:e>1?1:e;function Da(e){const s=e.replace("#","");return s.length===3?s.split("").map(p=>parseInt(p+p,16)):[parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]}const pe=(e,s)=>{const[c,p,u]=Da(e);return`rgba(${c},${p},${u},${s})`};function $a(e){let s=0;for(let c=0;c<e.length;c++)s=s*31+e.charCodeAt(c)>>>0;return s%360}const ja=e=>{const p=n=>(n+e/30)%12,u=.62*Math.min(.62,.38),k=n=>Math.round(255*(.62-u*Math.max(-1,Math.min(p(n)-3,Math.min(9-p(n),1)))));return"#"+[k(0),k(8),k(4)].map(n=>n.toString(16).padStart(2,"0")).join("")},xt={lab:"#8fa3b8",race:"#ff3b5c",freeride:"#2ec4b6",trail:"#54d17a",jump:"#ffb020",fun:"#c77dff",dh:"#ff6b3d",xc:"#5ad1e6"},Re=e=>xt[e]||(xt[e]=ja($a(String(e||"x")))),vt={ski:'<path d="M5.4 20.6 8.9 5.1c.3-1.4 1.5-2.1 2.6-1.7"/><path d="M12.6 20.6 16.1 5.1c.3-1.4 1.5-2.1 2.6-1.7"/><path d="M4.2 20.9h5.1"/><path d="M11.4 20.9h5.1"/>',bike:'<circle cx="5.9" cy="16.4" r="4.1"/><circle cx="18.1" cy="16.4" r="4.1"/><path d="M5.9 16.4 10.2 8.2h6.1l1.8 8.2"/><path d="M9.4 8.2h4.4"/><path d="M16.3 8.2 17.5 5.4h2.2"/>',glider:'<path d="M12 3.4 2.6 13.9c3.4-1.4 6.4-.7 9.4 6.7 3-7.4 6-8.1 9.4-6.7z"/><path d="M12 3.4v17.2"/>',boots:'<path d="M8.2 3.4h4.3v8.4c0 1.3.8 2.4 2 2.9l4.1 1.8v4.1H6.4V3.4z"/><path d="M6.6 17.1h12"/>',crate:'<path d="M12 2.7 20.2 7v10L12 21.3 3.8 17V7z"/><path d="M3.8 7 12 11.4 20.2 7"/><path d="M12 11.4v9.9"/>',sled:'<path d="M3.2 13.9h12.9c2.1 0 3.5-1.3 3.5-3 0-1.3-1-2.3-2.2-2.3s-2.2 1-2.2 2.3"/><path d="M4.4 18.2h12.2"/><path d="M5.8 13.9v4.3"/><path d="M13.9 13.9v4.3"/>',snowmobile:'<rect x="2.5" y="14.2" width="10.2" height="4.3" rx="2.1"/><path d="M12.7 16.3h3.5l2.4-2.3"/><path d="M8.4 14.2 10.1 9.6h3.8l1.3 2.7"/><path d="M14 9.6 16.1 7.2"/><path d="M17.2 18.5h3.3"/><path d="M18.9 13.4v5.1"/>',outfit:'<path d="M9 3.2h6l4.1 2.3-1.6 4.4-1.9-.8v11.7H7.4V9.1l-1.9.8L3.9 5.5z"/><path d="M9 3.2 12 6.4 15 3.2"/>',gear:'<circle cx="12" cy="12" r="6.6"/><circle cx="12" cy="12" r="2.9"/><path d="M18.6 12h2.2"/><path d="M5.4 12H3.2"/><path d="M12 5.4V3.2"/><path d="M12 18.6v2.2"/><path d="M16.67 7.33 18.22 5.78"/><path d="M7.33 16.67 5.78 18.22"/><path d="M16.67 16.67 18.22 18.22"/><path d="M7.33 7.33 5.78 5.78"/>'};function Ea(e){return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(vt[e]||vt.crate)+"</svg>"}const Ga=[{key:"speed",label:"speed",unit:!0,src:"term",suffix:" m/s"},{key:"turn",label:"handling",unit:!0,src:"steer",suffix:" rad/s"},{key:"stab",label:"stability",unit:!0},{key:"pop",label:"pop",unit:!0},{key:"spinTorque",label:"spin",unit:!1,suffix:" rad/s"}],Ne=e=>typeof e=="number"&&isFinite(e);function Ua(e){const s=[];for(const c of Ga){const p=e.map(u=>u.stats?u.stats[c.key]:void 0);!p.length||!p.every(Ne)||s.push({...c,min:Math.min(...p),max:Math.max(...p),n:e.length})}return s}function wt(e,s){const c=e.max-e.min;return e.unit&&e.n<4?_t(s):c>1e-6?.08+.92*((s-e.min)/c):e.unit?_t(s):.5}const R=new Map;function yt(e,s,c){if(R.has(e))return R.get(e);const p=300,u=58,k=document.createElement("canvas");k.width=p,k.height=u;const n=k.getContext("2d");if(n.fillStyle=s.base,n.fillRect(0,0,p,u),n.strokeStyle=s.accent,n.lineWidth=3,n.lineCap="round",n.lineJoin="round",n.fillStyle=s.accent,c==="bike")n.beginPath(),n.arc(96,34,17,0,7),n.stroke(),n.beginPath(),n.arc(204,34,17,0,7),n.stroke(),n.beginPath(),n.moveTo(96,34),n.lineTo(140,18),n.lineTo(186,18),n.lineTo(204,34),n.lineTo(150,34),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(186,18),n.lineTo(196,8),n.lineTo(212,8),n.stroke();else if(c==="rocket"){n.fillStyle=s.ink,n.fillRect(132,12,36,30);for(const h of[110,190])n.fillStyle=s.accent,n.fillRect(h-17,9,34,33),n.beginPath(),n.ellipse(h,9,17,7,0,0,7),n.fill(),n.fillStyle=s.ink,n.fillRect(h-17,22,34,7),n.beginPath(),n.moveTo(h-11,42),n.lineTo(h+11,42),n.lineTo(h+17,51),n.lineTo(h-17,51),n.closePath(),n.fill(),n.fillStyle="#ffb347",n.beginPath(),n.moveTo(h-13,52),n.lineTo(h+13,52),n.lineTo(h,58),n.closePath(),n.fill()}else if(c==="wing")n.beginPath(),n.moveTo(150,8),n.quadraticCurveTo(74,20,34,46),n.quadraticCurveTo(96,40,150,50),n.quadraticCurveTo(204,40,266,46),n.quadraticCurveTo(226,20,150,8),n.closePath(),n.fill(),n.strokeStyle=s.ink,n.lineWidth=2,n.beginPath(),n.moveTo(150,4),n.lineTo(150,54),n.stroke();else{n.beginPath(),n.moveTo(112,8),n.lineTo(160,8),n.lineTo(166,34),n.lineTo(198,42),n.lineTo(198,52),n.lineTo(108,52),n.closePath(),n.fill(),n.fillStyle=s.ink;for(let h=0;h<3;h++)n.fillRect(118,14+h*10,40,4)}const m=k.toDataURL("image/png");return R.set(e,m),m}const Wa=[["chinBar","chin bar"],["visor","visor"],["hood","hood"],["guards","guards"],["spine","spine plates"],["belt","belt"]],St={race:"Cut for the gates: one skin, no slack, nothing on it the clock has to carry.",shell:"A jacket and pants built for the weather first and the lift queue second.",freeride:"Bib pants under a short jacket, cut wide enough to sit down in the trees.",retro:"The loudest page of an old catalogue, reprinted without one apology for it.",armour:"Plated where a fall lands — spine, chin and hands — worn over the suit."},De=e=>"#"+(e&16777215).toString(16).padStart(6,"0"),fe=e=>(.2126*(e>>16&255)+.7152*(e>>8&255)+.0722*(e&255))/255,Ka='900 %px "Helvetica Neue", Helvetica, Arial, sans-serif',Mt=new Map;function Ya(e){const s=Mt.get(e.code);if(s)return s;const c=300,p=58,u=e.palette,k=document.createElement("canvas");k.width=c,k.height=p;const n=k.getContext("2d"),m=u.jacket,h=[[0,150,m],[150,230,u.pants],[230,275,u.helmet],[275,300,u.accent!=null?u.accent:u.strap!=null?u.strap:u.glove]];for(const[w,g,v]of h)n.fillStyle=De(v??m),n.fillRect(w,0,g-w,p);Lt(n,e,m,p);const S=k.toDataURL("image/png");return Mt.set(e.code,S),S}function Lt(e,s,c,p,u=126){const k=ke(s).toUpperCase(),n=1.4;for(let h=22;h>9&&(e.font=Ka.replace("%",h),!(e.measureText(k).width+n*(k.length-1)<=u));h--);e.fillStyle=Math.abs(fe(c)-fe(16052714))>=Math.abs(fe(c)-fe(1513498))?"#f4f1ea":"#17181a",e.textBaseline="middle";let m=12;for(const h of k)e.fillText(h,m,p/2),m+=e.measureText(h).width+n}const Va=e=>Wa.filter(([s])=>e[s]).map(([,s])=>s),ke=e=>e.house==="POI-LAB"?kt:e.house;function Xa(e){const s=e.flags,c=Va(s),p=ke(e);return{id:e.code,name:e.name,brand:p,tag:e.family,group:e.family,after:mt[e.code]||"",thumb:Ya(e),spec:[`${s.torso} torso · ${s.helmet} helmet`,...c].join(" · "),facts:[["house",p],["family",e.family],["torso",s.torso],["helmet",s.helmet],["extras",c.join(", ")||"—"]],blurb:`${p} ${e.name}. ${St[e.family]||""}`.trim()}}const X=["looks",...de],Ja={helmet:e=>[e.helmet,e.chinBar&&"chin bar",e.visor&&"visor",e.head==="robot"&&"robot head",e.mask&&"mask",e.collar==="stand"&&"stand collar"],goggles:e=>[e.goggles===!1||e.goggles==="none"?"no goggles":e.goggles==="rimless"&&"rimless"],jacket:e=>[e.torso+" torso",e.hood&&"hood",e.spine&&"spine plates",e.hem&&e.hem+" hem",e.puffy&&"puffy",e.anorak&&"anorak",e.chestPlate&&"chest plate",e.pauldrons&&"pauldrons",e.kitFerrum&&"Ferrum kit",e.kitUmbra&&"Umbra kit",e.kitPhantom&&"Phantom kit",e.kitDuke&&"Duke kit"],pants:e=>[e.pants&&e.pants+" fit",e.belt&&"belt",e.hipPlate&&"hip plate",e.bloused&&"bloused",e.beltBoxes&&"belt boxes"],gloves:e=>[e.guards&&"arm guards",e.poleGuards&&"pole guards"],boots:e=>[e.boot&&e.boot+" boot",e.shinGuards&&"shin guards"],poles:()=>[]},Qa={helmet:"helmet",goggles:"lens",jacket:"jacket",pants:"pants",gloves:"glove",boots:"boot",poles:"pole"},Ha={helmet:[["helmet",0,0,300,58]],goggles:[["lens",0,0,300,29],["strap",0,29,300,29]],jacket:[["chestFront",0,0,110,58],["back",110,0,110,58],["sleeveL",220,0,80,58]],pants:[["legL",0,0,200,58],["belt",200,0,100,58]],gloves:[["glove",0,0,200,58],["poleGuards",200,0,100,58]]},Za={boots:["boot"],poles:["pole","poleBand"]},Tt=22,Pt=e=>gt[e]?gt[e].slice(0,4):[ut[e][0],ut[e][1],Tt,Tt];let Ot=!1,Ct=0;function en(){const e=performance.now();for(const s of Ie){const{canvas:c}=ht(s.code,null,{cache:!1});for(const p of de){const u=document.createElement("canvas");u.width=300,u.height=58;const k=u.getContext("2d"),n=Za[p];if(n){const m=300/n.length;n.forEach((h,S)=>{k.fillStyle=De(Fe(s.palette,h)),k.fillRect(S*m,0,m,58)}),Lt(k,s,Fe(s.palette,n[0]),58)}else for(const[m,h,S,w,g]of Ha[p]){const[v,I,M,L]=Pt(m);k.drawImage(c,v,I,M,L,h,S,w,g)}R.set(p+":"+s.code,u.toDataURL("image/png"))}}Ot=!0,Ct=Math.round(performance.now()-e)}function tn(e,s){return Ot||en(),R.get(s+":"+e.code)}function an(e,s){const c=ke(e);return{id:e.code,name:e.name,brand:c,group:e.family,tag:s,after:mt[e.code]||"",thumb:tn(e,s),spec:Ja[s](e.flags).filter(Boolean).join(" · ")||"—",facts:[["house",c],["family",e.family],["part",s],["colour",De(Fe(e.palette,Qa[s]))]],blurb:`${c} ${e.name} — ${s}. ${St[e.family]||""}`.trim()}}const Bt="x";function nn(){const e="goggles:"+Bt;if(!R.has(e)){const{canvas:s}=ht("g00",null,{cache:!1}),c=document.createElement("canvas");c.width=300,c.height=58;const[p,u,k,n]=Pt("face");c.getContext("2d").drawImage(s,p,u,k,n,0,0,300,58),R.set(e,c.toDataURL("image/png"))}return R.get(e)}const on=()=>({id:Bt,name:"No goggles",brand:"—",tag:"goggles",thumb:nn(),spec:"bare face",facts:[["house","—"],["part","goggles"],["colour","—"]],blurb:"No goggles. The band comes off and the face is the face."}),T=[{id:"skis",label:"skis",gear:"skis",kind:"ski",icon:"ski",accent:"#4cc9f0",items:()=>Qt.map(e=>({id:e.id,name:e.name,brand:e.brand,tag:e.disc,group:e.group,blurb:e.blurb,stats:e.stats,thumb:Ht(e),spec:`${e.len} cm · ${e.waist} mm waist · R${e.radius}`,facts:[["length",e.len+" cm"],["waist",e.waist+" mm"],["radius","R"+e.radius],["top speed",e.stats.term.toFixed(1)+" m/s"],["turn rate",e.stats.steer.toFixed(2)+" rad/s"],["chatter",e.stats.chatterSpeed===1/0?"never":e.stats.chatterSpeed+" m/s"],["spin",e.stats.spinTorque.toFixed(1)+" rad/s"],["pop","×"+e.stats.popMul.toFixed(2)]]}))},...La?[{id:"bike",label:"bikes",gear:"bike",kind:"bike",icon:"bike",accent:"#ff7a29",items:()=>ia.map(e=>({id:e.id,name:e.name,brand:e.brand,tag:e.disc,group:e.group,blurb:e.blurb,stats:e.stats,thumb:ra(e),spec:`${e.spec.travel} travel · ${e.spec.head.toFixed(1)}° head · ${e.spec.mass} · ${e.spec.wheel}`,facts:[["travel",e.spec.travel],["head angle",e.spec.head.toFixed(1)+"°"],["wheelbase",e.spec.wb+" mm"],["weight",e.spec.mass],["wheels",e.spec.wheel],["top speed",e.stats.term.toFixed(1)+" m/s"],["pedal cap",e.stats.pedalMax.toFixed(1)+" m/s"],["spin",e.stats.spinTorque.toFixed(1)+" rad/s"],["pop",e.stats.popFull.toFixed(1)+" m/s"]]}))}]:[],{id:"glider",label:"glider",gear:"glider",kind:"glider",icon:"glider",accent:"#a78bfa",items:()=>ta.map(e=>({id:e.id,name:e.name,brand:e.brand,tag:e.tag,group:e.group,blurb:e.blurb,stats:e.stats,facts:e.facts,gear:e.gear,preview:e.preview,spec:e.facts&&e.facts.length?e.facts.slice(0,3).map(([s,c])=>`${s} ${c}`).join(" · "):"",thumb:yt("glider-"+e.id,Fa[e.glyph],e.glyph)}))},{id:"sled",label:"sled",gear:"sled",kind:"sled",icon:"sled",accent:"#c98a3f",remember:ga,apply:e=>window.__player?.setSledModel?.(e),items:()=>fa.map(e=>({id:e.id,name:e.name,brand:e.brand,tag:e.disc,group:e.group,blurb:e.blurb,stats:e.stats,thumb:ha(e),spec:`${e.spec.length} · ${e.spec.deck} · ${e.spec.mass}`,facts:[["length",e.spec.length],["width",e.spec.width],["deck",e.spec.deck],["runners",e.spec.runners],["weight",e.spec.mass],["top speed",e.stats.term.toFixed(1)+" m/s"],["turn rate",e.stats.steer.toFixed(2)+" rad/s"],["wipe tolerance",(e.stats.wipeTol*180/Math.PI).toFixed(0)+"°"],["stalls below",e.stats.stallSpeed.toFixed(1)+" m/s"]]}))},{id:"snowmobile",label:"snowmobile",gear:"snowmobile",kind:"snowmobile",icon:"snowmobile",accent:"#ff6a1f",remember:wa,apply:e=>window.__player?.setSnowmobileModel?.(e),items:()=>_a.map(e=>({id:e.id,name:e.name,brand:e.brand,tag:e.disc,group:e.group,blurb:e.blurb,stats:e.stats,thumb:va(e),spec:`${e.spec.engine} · ${e.spec.mass}`,facts:[["engine",e.spec.engine],["track",e.spec.track],["weight",e.spec.mass],["suspension",e.spec.suspension],["top speed",e.stats.term.toFixed(1)+" m/s"],["climbs to",e.stats.climbDeg.toFixed(1)+"°"],["reverse",e.stats.reverseMax.toFixed(1)+" m/s"],["brake",e.stats.brake.toFixed(0)+" m/s²"]]}))},{id:"boots",label:"boots",gear:"boots",kind:"boots",icon:"boots",accent:"#e0b166",items:()=>[{id:"boots",name:"Boots",brand:kt,tag:"on foot",group:"lab",blurb:"The Quake-ish walk controller, untouched since the first commit. Walk, sprint, jump, step over anything under 55 cm. Nothing you equip can change how this feels.",stats:{turn:1,speed:.1,stab:1,pop:.2},thumb:yt("boots",{base:"#26231f",ink:"#12110f",accent:"#cdc7ba"},"boot"),spec:"walk 4.5 m/s · sprint 8.0 m/s · step 0.55 m",facts:[["walk","4.5 m/s"],["sprint","8.0 m/s"],["jump","4.5 m/s"],["step up","0.55 m"]]}]},{id:"outfit",label:"outfit",kind:"outfit",icon:"outfit",accent:"#ff5c8a",remember:Oa,apply:(e,s)=>window.__player?.setOutfit?.(s&&s!=="looks"?{[s]:e}:e),items:e=>!e||e==="looks"?Ie.map(Xa):[...e==="goggles"?[on()]:[],...Ie.map(s=>an(s,e))]},{id:"settings",label:"settings",kind:"settings",icon:"gear",accent:"#4fd6a9",items:()=>Ia.map(e=>({id:e.key,key:e.key,name:e.label,desc:e.desc}))}],rn=`
.lk {
  --lk-acc: #4cc9f0;
  --lk-scrim: rgba(6, 9, 14, .66);
  --lk-panel: #12161d;
  --lk-panel-2: #191f28;
  --lk-panel-3: #212936;
  --lk-line: #2a3341;
  --lk-line-2: #3a4655;
  --lk-ink: #eef4fa;
  --lk-ink-2: #a6b4c4;
  --lk-ink-3: #6b7a8c;
  --lk-good: #56d97f;
  --lk-bad: #ff6b6b;
  --lk-mono: ui-monospace, "Cascadia Mono", Consolas, "Segoe UI Mono", "DejaVu Sans Mono", monospace;
  --lk-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  position: fixed; inset: 0; z-index: 50;
  display: grid; place-items: center; padding: 16px;
  background: var(--lk-scrim);
  backdrop-filter: blur(6px) saturate(.9);
  -webkit-backdrop-filter: blur(6px) saturate(.9);
  font-family: var(--lk-sans);
  color: var(--lk-ink);
  pointer-events: auto;
  opacity: 0;
  transition: opacity .16s ease-out;
}
.lk[hidden] { display: none; }
.lk.is-in { opacity: 1; }
.lk.is-out { pointer-events: none; }
.lk *, .lk *::before, .lk *::after { box-sizing: border-box; }
/* the display rules below are all author-level, so [hidden] needs to shout */
.lk [hidden] { display: none !important; }
.lk button { font: inherit; color: inherit; background: none; border: 0; margin: 0; }

/* ------------------------------------------------------------------ panel */
.lk__panel {
  position: relative;
  width: min(1560px, 96vw); height: min(880px, 92vh);
  display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto;
  min-height: 0;
  background:
    radial-gradient(120% 90% at 50% -20%, rgba(255,255,255,.055), transparent 60%),
    linear-gradient(180deg, #141a22 0%, var(--lk-panel) 42%, #0f141a 100%);
  border: 1px solid var(--lk-line);
  border-radius: 14px;
  box-shadow: 0 30px 80px rgba(0,0,0,.62), 0 0 0 1px rgba(255,255,255,.03) inset;
  overflow: hidden;
  transform: translateY(16px) scale(.982);
  opacity: 0;
  transition: transform .2s cubic-bezier(.2,.8,.25,1), opacity .16s ease-out;
}
.lk.is-in .lk__panel { transform: none; opacity: 1; }
/* the accent hairline across the top — the one place the tab colour shouts */
.lk__panel::before {
  content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--lk-acc) 18%, var(--lk-acc) 82%, transparent);
  opacity: .9;
}

/* ----------------------------------------------------------------- header */
.lk__hd {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 18px 11px;
  border-bottom: 1px solid var(--lk-line);
}
.lk__title {
  font-family: var(--lk-mono); font-size: 11px; font-weight: 700;
  letter-spacing: .22em; text-transform: uppercase; color: var(--lk-ink);
}
.lk__title b { color: var(--lk-acc); }
.lk__spacer { flex: 1 1 auto; }
.lk__load { display: flex; align-items: center; gap: 14px; }
.lk__load-i { display: flex; align-items: baseline; gap: 6px; }
.lk__load-k {
  font-family: var(--lk-mono); font-size: 9px; letter-spacing: .16em;
  text-transform: uppercase; color: var(--lk-ink-3);
}
.lk__load-v {
  font-family: var(--lk-mono); font-size: 10.5px; letter-spacing: .04em; color: var(--lk-ink-2);
  max-width: 19ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ------------------------------------------------------------------- tabs */
.lk__tabs {
  display: flex; align-items: stretch; gap: 6px;
  padding: 10px 18px 0; border-bottom: 1px solid var(--lk-line);
}
/* NOTHING that says "this is the active tab" is transitioned. A CSS transition
   is driven by the document's animation clock, and on a frame-starved deck —
   a heavy world behind the panel, a software rasteriser — that clock can stall
   long enough for the strip to keep advertising the tab you just left. Colour
   changes here snap; only the decorative hover lift below animates. */
.lk__tab {
  position: relative;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px 10px; cursor: pointer;
  border-radius: 8px 8px 0 0;
  color: var(--lk-ink-3);
}
.lk__tab svg { width: 17px; height: 17px; flex: none; }
.lk__tab-l {
  font-family: var(--lk-mono); font-size: 11px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
}
.lk__tab-n {
  font-family: var(--lk-mono); font-size: 9.5px; font-variant-numeric: tabular-nums;
  padding: 1px 5px; border-radius: 999px;
  background: var(--lk-panel-3); color: var(--lk-ink-3);
}
.lk__tab::after {
  content: ""; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 2px;
  background: var(--lk-tab-acc, var(--lk-acc)); border-radius: 2px 2px 0 0;
  transform: scaleX(0); transform-origin: 50% 100%;
}
.lk__tab:hover { color: var(--lk-ink-2); background: rgba(255,255,255,.035); }
.lk__tab.is-on { color: var(--lk-ink); background: rgba(255,255,255,.05); }
.lk__tab.is-on::after { transform: scaleX(1); }
.lk__tab.is-on .lk__tab-n { background: var(--lk-tab-acc, var(--lk-acc)); color: #08111a; }
.lk__tab.is-on svg { color: var(--lk-tab-acc, var(--lk-acc)); }

/* ------------------------------------------------------------------- body */
.lk__main {
  display: grid; gap: 14px; min-height: 0;
  /* the two side decks grow with the panel instead of pinning at 320/340, so a
     2560-wide deck spends its extra width on the preview and the spec sheet
     rather than on ever-wider cards */
  grid-template-columns: minmax(300px, 23%) minmax(0, 1fr) minmax(330px, 23%);
  grid-template-areas: "pv grid det";
  padding: 14px 18px;
}

/* ---- left: the mannequin */
.lk__pv { grid-area: pv; display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 10px; min-height: 0; }
.lk__stage {
  position: relative; min-height: 0; border-radius: 12px; overflow: hidden;
  border: 1px solid var(--lk-line);
  background:
    radial-gradient(78% 52% at 50% 92%, var(--lk-acc-soft, rgba(76,201,240,.16)), transparent 68%),
    radial-gradient(120% 80% at 50% 8%, rgba(255,255,255,.05), transparent 62%),
    linear-gradient(180deg, #0d1218 0%, #10161e 60%, #0a0e13 100%);
}
/* the floor: one soft ellipse the figure stands on, drawn in CSS so the
   preview scene stays two lights and a turntable */
.lk__stage::after {
  content: ""; position: absolute; left: 50%; bottom: 12%; width: 62%; height: 9%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0,0,0,.55), transparent 78%);
  pointer-events: none;
}
/* play.css carries \`body.play canvas { position: fixed; left: 0; top: 0 }\` for the
   world's own canvas, and that selector (0,1,2) outranks a single class. The
   preview renderer is a canvas in this document too, so it needs three classes
   to stay inside its box — without them it paints over the whole viewport. */
.lk .lk__stage .lk__canvas {
  display: block; position: absolute; left: 0; width: 100%; z-index: 1;
  /* height and top come from resizePreview(), which caps the 3D viewport to a
     3:4 band centred in the stage — see the comment there */
}
.lk__eqflash {
  position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: 0;
  background: radial-gradient(58% 42% at 50% 62%, var(--lk-acc), transparent 70%);
  mix-blend-mode: screen;
}
.lk__eqflash.is-go { animation: lk-flash .5s ease-out; }
@keyframes lk-flash {
  0% { opacity: 0; transform: scale(.86); }
  22% { opacity: .55; }
  100% { opacity: 0; transform: scale(1.06); }
}
.lk__plate {
  display: grid; gap: 3px; padding: 10px 12px;
  border: 1px solid var(--lk-line); border-radius: 10px;
  background: linear-gradient(180deg, var(--lk-panel-2), var(--lk-panel));
  /* specs/0012 §C — no left stripe. The brand line above the name is already
     accent-coloured; the plate did not need a second one turned on its side. */
}
.lk__plate-brand {
  font-family: var(--lk-mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: .2em; text-transform: uppercase; color: var(--lk-acc);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lk__plate-name { font-size: 16px; font-weight: 680; letter-spacing: -.01em; line-height: 1.15; }
.lk__plate-tag {
  font-family: var(--lk-mono); font-size: 9.5px; letter-spacing: .14em;
  text-transform: uppercase; color: var(--lk-ink-3);
}

/* ---- middle: filters + the card grid */
.lk__mid { grid-area: grid; display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px; min-height: 0; }
/* specs/0039 — the sub-strip and the family filters are ONE grid row between
   them, so a tab that shows neither (every rack but the outfit one shows only
   the filters) collapses to nothing and the card grid keeps its own row. */
.lk__bars { display: grid; gap: 8px; }
.lk__filters, .lk__subs { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.lk__filters[hidden], .lk__subs[hidden] { display: none; }
/* the sub-tabs are chips in the tab's own accent; the group dot the family chips
   carry says nothing here, so it stands down */
.lk__subs .lk__chip::before { display: none; }
.lk__subs .lk__key { margin-right: 3px; }
.lk__chip {
  display: inline-flex; align-items: baseline; gap: 6px; cursor: pointer;
  padding: 5px 10px; border-radius: 999px;
  border: 1px solid var(--lk-line-2);
  background: rgba(255,255,255,.02);
  font-family: var(--lk-mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: var(--lk-ink-3);
}
.lk__chip i { font-style: normal; font-variant-numeric: tabular-nums; opacity: .7; letter-spacing: 0; }
.lk__chip::before {
  content: ""; width: 7px; height: 7px; border-radius: 2px; flex: none;
  background: var(--g, var(--lk-ink-3)); align-self: center;
}
.lk__chip:hover { color: var(--lk-ink); border-color: var(--g, var(--lk-line-2)); }
.lk__chip.is-on {
  color: #08111a; border-color: var(--g, var(--lk-acc));
  background: var(--g, var(--lk-acc));
}
.lk__chip.is-on::before { background: rgba(0,0,0,.42); }

.lk__grid {
  display: grid; align-content: start;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  overflow-y: auto; overflow-x: hidden;
  min-height: 0; padding: 8px 10px 14px 6px;
  scrollbar-color: var(--lk-line-2) transparent;
}
.lk__grid::-webkit-scrollbar { width: 9px; }
.lk__grid::-webkit-scrollbar-track { background: transparent; }
.lk__grid::-webkit-scrollbar-thumb { background: var(--lk-line-2); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
.lk__grid::-webkit-scrollbar-thumb:hover { background: var(--lk-ink-3); background-clip: content-box; }
.lk__grid.is-swap { animation: lk-swap .22s ease-out; }
@keyframes lk-swap { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: none; } }

/* ---- the card */
.lk__card {
  position: relative; display: grid; gap: 7px; cursor: pointer; text-align: left;
  padding: 9px 9px 10px;
  border: 1px solid var(--lk-line);
  border-radius: 11px;
  background:
    linear-gradient(158deg, var(--g-wash) 0%, var(--lk-panel-2) 58%, var(--lk-panel-2) 100%);
  /* border-color is the selection ring and is deliberately NOT transitioned —
     see the note on .lk__tab. The lift and the glow are decoration and may lag. */
  transition: transform .14s cubic-bezier(.2,.8,.25,1), box-shadow .18s;
}
.lk__card:hover {
  transform: translateY(-3px);
  border-color: var(--g);
  box-shadow: 0 12px 26px rgba(0,0,0,.5), 0 0 22px -8px var(--g-glow);
}
.lk__card.is-sel {
  transform: translateY(-3px);
  border-color: var(--lk-acc);
  box-shadow: 0 0 0 1px var(--lk-acc), 0 14px 30px rgba(0,0,0,.55), 0 0 26px -6px var(--lk-acc);
}
.lk__card.is-eq { background: linear-gradient(158deg, var(--g-wash) 0%, var(--lk-panel-3) 62%, var(--lk-panel-2) 100%); }
.lk__card.is-go { animation: lk-equip .42s cubic-bezier(.2,.9,.25,1); }
@keyframes lk-equip {
  0% { transform: translateY(-3px) scale(1); }
  34% { transform: translateY(-6px) scale(1.045); }
  100% { transform: translateY(-3px) scale(1); }
}
.lk__art {
  position: relative; display: grid; place-items: center;
  height: 78px; border-radius: 8px; overflow: hidden;
  background: linear-gradient(180deg, rgba(0,0,0,.34), rgba(0,0,0,.16));
  box-shadow: 0 1px 0 rgba(255,255,255,.045) inset;
}
.lk__img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
.lk__gchip {
  position: absolute; top: 6px; right: 6px;
  font-family: var(--lk-mono); font-size: 8px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  padding: 2px 6px; border-radius: 999px;
  background: var(--g); color: #08111a;
}
.lk__brand {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase; color: var(--g);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* specs/0042 — the real thing under the invented house. The muted card text, one
   size down from .lk__tag, no accent, and NOT uppercased: POC, EA7 and Arc’teryx
   carry their own case and the lowercase "after" keeps it off the house line. */
.lk__after, .lk__d-after {
  font-family: var(--lk-mono); font-size: 8px; letter-spacing: .1em; color: var(--lk-ink-3);
  margin-top: -4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lk__d-after { font-size: 9px; letter-spacing: .06em; margin-top: 0; }
.lk__name {
  /* two lines' worth whether the name needs them or not, so a rack that mixes
     "Trek Ticket DJ" with "Specialized Epic Hardtail" still rules a level grid */
  font-size: 12.5px; font-weight: 640; line-height: 1.22; min-height: 2.44em;
  color: var(--lk-ink);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.lk__tag {
  font-family: var(--lk-mono); font-size: 9px; letter-spacing: .12em;
  text-transform: uppercase; color: var(--lk-ink-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lk__eq {
  position: absolute; left: 9px; top: 9px;
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--lk-mono); font-size: 8px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  padding: 3px 7px 3px 5px; border-radius: 999px;
  background: var(--lk-acc); color: #08111a;
  box-shadow: 0 2px 10px rgba(0,0,0,.4);
}
.lk__eq::before { content: "\\2713"; font-size: 9px; letter-spacing: 0; }

/* ---- specs/0019: the settings rows.
   The same grid element the cards live in, switched to one full-width column,
   so the scrolling, the keyboard selection and the swap animation are the ones
   that already work rather than a second implementation of them. */
.lk__grid.is-rows { grid-template-columns: minmax(0, 1fr); gap: 8px; }
.lk__row {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center;
  gap: 8px 16px; cursor: pointer; text-align: left;
  padding: 13px 15px;
  border: 1px solid var(--lk-line); border-radius: 11px;
  background: linear-gradient(158deg, rgba(255,255,255,.03) 0%, var(--lk-panel-2) 62%, var(--lk-panel-2) 100%);
  /* border-color is the selection ring: not transitioned, same note as .lk__tab */
  transition: transform .14s cubic-bezier(.2,.8,.25,1), box-shadow .18s;
}
.lk__row:hover { transform: translateY(-2px); border-color: var(--lk-line-2); }
.lk__row.is-sel {
  transform: translateY(-2px);
  border-color: var(--lk-acc);
  box-shadow: 0 0 0 1px var(--lk-acc), 0 12px 26px rgba(0,0,0,.5);
}
.lk__row.is-go { animation: lk-equip .42s cubic-bezier(.2,.9,.25,1); }
/* both are SPANS in a <button> (a button may not contain a <div>), so they have
   to be told to be blocks — left inline they set as one paragraph and the label
   runs straight into the sentence after it */
.lk__row-t {
  display: block;
  font-family: var(--lk-mono); font-size: 11px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: var(--lk-ink);
}
.lk__row-d { display: block; font-size: 11.5px; line-height: 1.45; color: var(--lk-ink-2); margin-top: 5px; }
.lk__row-txt { display: block; min-width: 0; }
/* the switch: a track, a knob, and a word. NOTHING here is transitioned, and
   that is the .lk__tab note applied to the one control on this screen where
   being wrong for a moment is worst: a transition runs on the document's
   animation clock, and on a frame-starved deck (a heavy world behind the panel,
   a software rasteriser) that clock stalls — the first cut animated the knob's
   travel and photographed a switch reading ON with its knob still hard left.
   A switch may not lie about its state for even one frame. */
.lk__sw { display: inline-flex; align-items: center; gap: 9px; }
.lk__sw-t {
  position: relative; width: 42px; height: 22px; border-radius: 999px; flex: none;
  background: var(--lk-panel-3);
  border: 1px solid var(--lk-line-2);
}
.lk__sw-t::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: var(--lk-ink-3);
}
.lk__sw-v {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: var(--lk-ink-3);
  width: 3ch;
}
.lk__sw.is-on .lk__sw-t { background: var(--lk-acc); border-color: var(--lk-acc); }
.lk__sw.is-on .lk__sw-t::after { background: #08111a; transform: translateX(20px); }
.lk__sw.is-on .lk__sw-v { color: var(--lk-acc); }

/* ---- right: the detail panel */
.lk__det {
  grid-area: det; min-height: 0;
  display: grid; grid-template-rows: auto auto auto auto minmax(0, 1fr); gap: 11px;
  padding: 12px; border: 1px solid var(--lk-line); border-radius: 12px;
  background: linear-gradient(180deg, var(--lk-panel-2) 0%, var(--lk-panel) 100%);
  overflow: hidden;
}
.lk__hero {
  /* the art grows into whatever height the deck has spare — 132 px at 720p,
     ~190 px at 1080p — instead of leaving the panel's foot empty */
  position: relative; height: clamp(132px, 18vh, 216px);
  border-radius: 10px; overflow: hidden;
  display: grid; place-items: center;
  background: linear-gradient(180deg, rgba(0,0,0,.4), rgba(0,0,0,.2));
  border: 1px solid var(--lk-line);
}
/* the same art, blown up and blurred, as its own backdrop — depth for free */
.lk__hero-bg {
  position: absolute; inset: -18%;
  background-position: center; background-repeat: no-repeat; background-size: cover;
  filter: blur(20px) saturate(1.5); opacity: .38; transform: scale(1.1);
}
.lk__hero-img { position: relative; max-width: 92%; max-height: 82%; object-fit: contain; filter: drop-shadow(0 6px 14px rgba(0,0,0,.55)); }
.lk__hero-eq {
  position: absolute; right: 8px; top: 8px;
  font-family: var(--lk-mono); font-size: 8px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px;
  background: var(--lk-acc); color: #08111a;
}
.lk__d-head { display: grid; gap: 3px; }
.lk__d-brand {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .2em; text-transform: uppercase; color: var(--g, var(--lk-acc));
}
.lk__d-name { font-size: 17px; font-weight: 680; letter-spacing: -.012em; line-height: 1.14; }
.lk__d-spec {
  font-family: var(--lk-mono); font-size: 10px; letter-spacing: .02em; color: var(--lk-ink-2);
}
.lk__d-blurb {
  font-size: 11.5px; line-height: 1.5; color: var(--lk-ink-2);
  display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
}

/* ---- stat bars, with the delta against what is equipped */
.lk__stats { display: grid; gap: 6px; align-content: start; overflow-y: auto; padding-right: 4px; min-height: 0; }
.lk__stats::-webkit-scrollbar { width: 7px; }
.lk__stats::-webkit-scrollbar-thumb { background: var(--lk-line-2); border-radius: 999px; }
.lk__stat { display: grid; grid-template-columns: 68px minmax(0, 1fr) 30px 34px; align-items: center; gap: 8px; }
.lk__stat-k {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: var(--lk-ink-3);
}
.lk__stat-t {
  position: relative; height: 7px; border-radius: 999px; overflow: hidden;
  background: var(--lk-panel-3); box-shadow: 0 0 0 1px rgba(255,255,255,.04) inset;
}
.lk__stat-t i, .lk__stat-t u {
  position: absolute; top: 0; bottom: 0; display: block;
  transition: left .18s ease-out, width .18s ease-out, background .2s;
}
/* the bar itself stops at the SHARED value; the delta segment carries the sign */
.lk__stat-t i { left: 0; width: 0; background: linear-gradient(90deg, var(--lk-acc-dim, #2a6f88), var(--lk-acc)); }
.lk__stat-t u { width: 0; text-decoration: none; }
.lk__stat-t u.is-up { background: var(--lk-good); box-shadow: 0 0 10px -1px var(--lk-good); }
.lk__stat-t u.is-down {
  background: repeating-linear-gradient(-45deg, var(--lk-bad) 0 3px, rgba(255,107,107,.45) 3px 6px);
}
.lk__stat-v {
  font-family: var(--lk-mono); font-size: 10px; font-variant-numeric: tabular-nums;
  text-align: right; color: var(--lk-ink);
}
.lk__stat-d {
  font-family: var(--lk-mono); font-size: 9.5px; font-variant-numeric: tabular-nums;
  text-align: right; color: var(--lk-ink-3);
}
.lk__stat-d.is-up { color: var(--lk-good); }
.lk__stat-d.is-down { color: var(--lk-bad); }
.lk__cmp {
  font-family: var(--lk-mono); font-size: 8.5px; letter-spacing: .14em;
  text-transform: uppercase; color: var(--lk-ink-3);
  display: flex; align-items: center; gap: 6px;
}
.lk__cmp::before { content: ""; flex: 1 1 auto; height: 1px; background: var(--lk-line); }

.lk__facts {
  display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px;
  align-content: start; overflow-y: auto; padding-right: 4px; min-height: 0;
  border-top: 1px solid var(--lk-line); padding-top: 9px;
}
.lk__facts::-webkit-scrollbar { width: 7px; }
.lk__facts::-webkit-scrollbar-thumb { background: var(--lk-line-2); border-radius: 999px; }
.lk__fact { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.lk__fact .k {
  font-family: var(--lk-mono); font-size: 9px; letter-spacing: .1em;
  text-transform: uppercase; color: var(--lk-ink-3);
}
.lk__fact .v { font-family: var(--lk-mono); font-size: 10px; color: var(--lk-ink-2); font-variant-numeric: tabular-nums; }

/* ---------------------------------------------------------------- hint bar */
.lk__foot {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 9px 18px 10px; border-top: 1px solid var(--lk-line);
  background: rgba(0,0,0,.22);
}
.lk__hint { display: inline-flex; align-items: center; gap: 7px; }
.lk__hint span {
  font-family: var(--lk-mono); font-size: 9px; letter-spacing: .16em;
  text-transform: uppercase; color: var(--lk-ink-3);
}
.lk__key {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 19px; padding: 0 5px;
  border: 1px solid var(--lk-line-2); border-bottom-width: 2px; border-radius: 5px;
  background: linear-gradient(180deg, var(--lk-panel-3), var(--lk-panel-2));
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .04em; color: var(--lk-ink-2);
}
.lk__foot-sp { flex: 1 1 auto; }

/* ------------------------------------------------------------ narrow decks */
@media (max-width: 1180px) {
  .lk__main {
    grid-template-columns: 250px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 250px);
    grid-template-areas: "pv grid" "det det";
  }
  .lk__hero { height: 96px; }
  .lk__det { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas: "hero head" "hero blurb" "stats facts"; column-gap: 14px; }
  .lk__hero { grid-area: hero; height: 100%; }
  .lk__d-head { grid-area: head; align-self: end; }
  .lk__d-blurb { grid-area: blurb; -webkit-line-clamp: 3; }
  .lk__stats { grid-area: stats; }
  .lk__facts { grid-area: facts; }
}
@media (max-width: 860px) {
  .lk__main { grid-template-columns: minmax(0, 1fr); grid-template-areas: "pv" "grid" "det"; grid-template-rows: 190px minmax(0,1fr) 220px; }
  .lk__load { display: none; }
}
@media (max-height: 760px) {
  .lk__hero { height: 104px; }
  .lk__d-blurb { -webkit-line-clamp: 3; }
}

@media (prefers-reduced-motion: reduce) {
  .lk, .lk *, .lk *::before, .lk *::after {
    transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important;
  }
}
`;let zt=!1;function sn(){if(zt||typeof document>"u")return;zt=!0;const e=document.createElement("style");e.id="lk-css",e.textContent=rn,document.head.appendChild(e)}function _n({THREE:e,model:s,unitScale:c,ctrl:p,onEquip:u,initial:k}){sn();const n=c||1;let m=!1,h=0,S="all",w="looks",g=0,v=[],I=null;try{I=new URLSearchParams(location.search)}catch{I=null}const M={skis:k&&k.skis||ea,glider:k&&k.glider||aa,bike:k&&k.bike||oa,sled:k&&k.sled||(I?ua(I):ka),snowmobile:k&&k.snowmobile||(I?ya(I):xa),boots:Na("boots")||"boots",outfit:k&&k.outfit||Ca()},L=r("div","lk");L.hidden=!0;const $e=r("section","lk__panel"),je=r("div","lk__hd"),Ee=r("div","lk__title");Ee.innerHTML="equipment <b>locker</b>";const Ge=r("div","lk__load"),J={};for(const t of T){if(t.id==="boots"||t.kind==="settings")continue;const a=r("div","lk__load-i"),o=r("span","lk__load-v","—");a.append(r("span","lk__load-k",t.label),o),Ge.append(a),J[t.id]=o}je.append(Ee,r("span","lk__spacer"),Ge);const Ue=r("div","lk__tabs"),he=T.map((t,a)=>{const o=r("button","lk__tab");o.type="button",o.style.setProperty("--lk-tab-acc",t.accent||"#4cc9f0");const l=r("span","lk__tab-ic");l.innerHTML=Ea(t.icon);const d=r("span","lk__tab-n","0");return o.append(l.firstChild,r("span","lk__tab-l",t.label),d),o.addEventListener("click",f=>{f.stopPropagation(),V(a)}),Ue.append(o),{b:o,n:d}}),We=r("div","lk__main"),Ke=r("div","lk__pv"),E=r("div","lk__stage"),G=r("div","lk__eqflash");E.append(G);const Ye=r("div","lk__plate"),Ve=r("div","lk__plate-brand",""),Xe=r("div","lk__plate-name","—"),Je=r("div","lk__plate-tag","");Ye.append(Ve,Xe,Je),Ke.append(E,Ye);const Qe=r("div","lk__mid"),j=r("div","lk__subs");j.hidden=!0;const Q=r("div","lk__filters"),He=r("div","lk__bars");He.append(j,Q);const A=r("div","lk__grid");Qe.append(He,A);const H=r("div","lk__det"),Z=r("div","lk__hero"),ge=r("div","lk__hero-bg"),U=r("img","lk__hero-img");U.alt="";const ee=r("div","lk__hero-eq","equipped");ee.hidden=!0,Z.append(ge,U,ee);const Ze=r("div","lk__d-head"),ue=r("div","lk__d-brand",""),me=r("div","lk__d-after",""),be=r("div","lk__d-name","—"),_e=r("div","lk__d-spec","");Ze.append(ue,me,be,_e);const xe=r("div","lk__d-blurb",""),W=r("div","lk__stats"),et=r("div","lk__cmp"),K=r("div","lk__facts");H.append(Z,Ze,xe,W,K),We.append(Ke,Qe,H);const te=r("div","lk__foot"),At=[[["←","→","↑","↓"],"navigate"],[["enter"],"equip"],[["q","e"],"tabs"],[["f"],"filter"],[["1-9"],"quick equip"]];for(const[t,a]of At){const o=r("span","lk__hint");for(const l of t)o.append(r("kbd","lk__key",l));o.append(r("span",null,a)),te.append(o)}te.append(r("span","lk__foot-sp"));const tt=r("span","lk__hint");tt.append(r("kbd","lk__key","esc"),r("span",null,"close")),te.append(tt),$e.append(je,Ue,We,te),L.append($e),document.body.appendChild(L);let i=null;function It(){const t=new e.Scene;t.add(new e.HemisphereLight(16777215,3816004,1.35));const a=new e.DirectionalLight(16777215,1.05);a.position.set(3,5,4);const o=new e.DirectionalLight(16767432,.5);o.position.set(-4,2,-3),t.add(a,o);const l=new e.Group;t.add(l);const d=s?s.clone(!0):new e.Group,f=s&&s.getObjectByName("play:body"),b=f?Aa(f):null,_=b?za(b):null;if(_){const x=d.getObjectByName("play:body");x&&x.parent?(x.parent.add(_.model),x.parent.remove(x)):d.add(_.model),_.skeleton.pose(),_.model.updateMatrixWorld(!0)}d.position.set(0,0,0),d.rotation.set(0,0,0);const P=[];d.traverse(x=>{const ct=Pa(x.name||"")!=null&&s.getObjectByName(x.name);ct?P.push([x,ct]):x.visible=!0});const z=new Set;_&&_.model.traverse(x=>{x.isMesh&&/^rider:/.test(x.name||"")&&x.material&&z.add(x.material)});const C=_?new Map([..._.riderMats].filter(([,x])=>z.has(x))):new Map,Te=_?_.riderToggles:[],D=/^play:(?:fp-|tp-)|^play:ski-[lr]$|^play:rocket-pack$/;d.traverse(x=>{x.name&&D.test(x.name)&&(x.visible=!1)});const re=d.getObjectByName("play:tp-glider"),$=d.getObjectByName("play:body"),Vt=d.getObjectByName("play:rocket-pack"),Pe=$?$.getObjectByName("rider:body"):null,Xt=Pe?new e.AnimationMixer(Pe):null,dt=new Map;for(const x of $&&$.animations||[])dt.set(x.name,x);l.add(d);const Oe=pt(e,n),Ce=pt(e,n);Oe.position.set(-.15*n,.02*n,0),Ce.position.set(.15*n,.02*n,0),l.add(Oe,Ce);const Be=la(e,n);Be.visible=!1,l.add(Be);const ze=ma(e,n);ze.visible=!1,l.add(ze);const Ae=Sa(e,n,{model:M.snowmobile});Ae.visible=!1,l.add(Ae);const Jt=new e.PerspectiveCamera(34,1,.05*n,80*n),se=new e.WebGLRenderer({alpha:!0,antialias:!0});se.setPixelRatio(Math.min(2,window.devicePixelRatio||1)),se.domElement.className="lk__canvas",E.insertBefore(se.domElement,G),i={scene:t,camera:Jt,renderer:se,turntable:l,skiL:Oe,skiR:Ce,bike:Be,sled:ze,snow:Ae,cGlide:re,cBody:$,cPack:Vt,cSkin:Pe,mixer:Xt,clips:dt,clip:null,want:null,riderPairs:P,riderMats:C,riderToggles:Te,tryOn:null,t:0,kick:0},ae()}function ae(){if(!i)return;const t=Math.max(80,E.clientWidth),a=Math.max(80,E.clientHeight),o=Math.max(80,Math.min(a,Math.round(t*4/3)));i.renderer.setSize(t,o,!1),i.renderer.domElement.style.height=o+"px",i.renderer.domElement.style.top=Math.round((a-o)/2)+"px",i.camera.aspect=t/o,i.camera.updateProjectionMatrix()}function qt(t){if(!i||!i.mixer||i.want===t)return;i.want=t;const a=i.clips.get(t)||i.clips.get("idle-boots")||i.clips.get("ski-stance");if(!a||i.clip===a.name)return;i.mixer.stopAllAction();const o=i.mixer.clipAction(a);o.reset(),o.enabled=!0,o.setEffectiveWeight(1),o.play(),i.clip=a.name,i.mixer.setTime(0)}function Ft(t,a){if(!i)return;const o=t.kind==="outfit",l=t.kind==="ski"||o,d=t.kind==="glider"&&a?a.preview:null,f=d==="wing",b=t.kind==="bike",_=t.kind==="sled",P=t.kind==="snowmobile",z=b||_||P;if(i.skiL.visible=i.skiR.visible=l,i.cGlide&&(i.cGlide.visible=f),i.cBody&&(i.cBody.visible=!0),i.cPack&&(i.cPack.visible=d==="pack"),qt(b?"seat-bike":_?"seat-sled":P?"seat-snowmobile":f?"prone-glider":"idle-boots"),i.cBody&&(i.cBody.position.set(0,f?1.05*n:0,0),i.cBody.rotation.x=i.cBody.rotation.y=i.cBody.rotation.z=0,b&&a)){const C=pa(ca(a.id));i.cBody.position.y+=(C.hip[0]-1.053)*n,i.cBody.position.z+=(C.hip[1]-.305)*n}if(i.bike.visible=b,i.sled.visible=_,i.snow.visible=P,b&&a&&da(e,i.bike,a.id),_&&a&&ba(e,i.sled,a.id),P&&a&&Ma(e,i.snow,a.id),l&&a){const C=o?M.skis:a.id;ft(e,i.skiL,C),ft(e,i.skiR,C)}if(o&&a){const C=w==="looks"?a.id:Nt(a.id);le(e,i,C),i.tryOn=C}else i.tryOn!=null&&(le(e,i,window.__player?.outfit),i.tryOn=null)}const Rt=.28;let ne=0,ve=0;function at(t){if(!m){ne=0;return}ne=requestAnimationFrame(at);const a=Math.min(.05,(t-ve)/1e3||0);if(ve=t,!i)return;i.hold==null&&(i.t+=a),i.turntable.rotation.y=i.hold==null?i.turntable.rotation.y+a*(Rt+i.kick):i.hold,i.mixer&&(i.hold==null?i.mixer.update(a):i.mixer.setTime(0)),i.kick*=Math.exp(-a*3.4),i.kick<.001&&(i.kick=0);const o=Math.tan(i.camera.fov*Math.PI/180/2),l=Math.max(1.12/o,1.3/(o*Math.max(.25,i.camera.aspect)))*n;if(i.camera.position.set(0,(1.3+.012*Math.sin(i.t*.7))*n,l),i.camera.lookAt(0,.86*n,0),i.tryOn==null)for(const[d,f]of i.riderPairs)d.visible=f.visible;i.renderer.render(i.scene,i.camera)}const y=()=>T[h],q=new Set;function F(t){try{const a=t.items(t.kind==="outfit"?w:void 0);if(Array.isArray(a))return q.delete(t.id),a}catch(a){q.has(t.id)||console.warn(`[locker] rack "${t.id}" unavailable:`,a&&a.message)}return q.add(t.id),[]}function nt(t){const a=[];for(const o of t)o.group&&!a.includes(o.group)&&a.push(o.group);return a}function ie(){const t=y();if(t.kind!=="outfit")return M[t.id];const a=qe(M.outfit);return w==="looks"?a.every(o=>o===a[0])?a[0]:null:a[de.indexOf(w)]}const Nt=t=>Ba(qe(M.outfit).map((a,o)=>o===de.indexOf(w)?t:a));function Dt(){const t=y().kind==="outfit";if(j.hidden=!t,!!t){j.textContent="",j.append(r("kbd","lk__key","g"));for(const a of X){const o=r("button","lk__chip");o.type="button",o.style.setProperty("--g",y().accent||"#4cc9f0"),o.append(document.createTextNode(a)),o.classList.toggle("is-on",w===a),o.addEventListener("click",l=>{l.stopPropagation(),we(a)}),j.append(o)}}}function we(t){return X.includes(t)&&t!==w&&(w=t,g=0,Y()),w}function $t(){const t=y().accent||"#4cc9f0";L.style.setProperty("--lk-acc",t),L.style.setProperty("--lk-acc-soft",pe(t,.18)),L.style.setProperty("--lk-acc-dim",pe(t,.34))}function jt(){T.forEach((t,a)=>{he[a].n.textContent=String(F(t).length),he[a].b.hidden=q.has(t.id)})}function ye(){for(const t of T){if(!J[t.id])continue;const a=F(t).find(o=>o.id===M[t.id]);J[t.id].parentElement.hidden=q.has(t.id),J[t.id].textContent=t.kind==="outfit"?Et():a?a.name:"—"}}function Et(){const t=[...new Set(qe(M.outfit))];if(t.length>1)return"mix · "+t.length+" houses";const a=Ta[t[0]];return a?ke(a)+" · "+a.name:"—"}function Gt(){const t=F(y()),a=nt(t);if(Q.textContent="",Q.hidden=a.length<2,a.length<2)return;const o={all:t.length};for(const l of a)o[l]=t.filter(d=>d.group===l).length;for(const l of["all",...a]){const d=r("button","lk__chip");d.type="button",d.style.setProperty("--g",l==="all"?y().accent||"#4cc9f0":Re(l)),d.append(document.createTextNode(l),r("i",null,String(o[l]))),d.classList.toggle("is-on",S===l),d.addEventListener("click",f=>{f.stopPropagation(),S=l,g=0,Y()}),Q.append(d)}}const it=new WeakMap;function ot(t,a){const o=it.get(t);if(!o)return;const l=ce(a);o.el.classList.toggle("is-on",l),o.v.textContent=l?"on":"off",t.setAttribute("aria-checked",l?"true":"false")}function Ut(t,a){const o=r("button","lk__row");o.type="button",o.setAttribute("role","switch");const l=r("span","lk__row-txt");l.append(r("span","lk__row-t",t.name),r("span","lk__row-d",t.desc||""));const d=r("span","lk__sw"),f=r("span","lk__sw-v","off");return d.append(r("span","lk__sw-t"),f),it.set(o,{el:d,v:f}),o.append(l,d),ot(o,t.key),o.addEventListener("click",b=>{b.stopPropagation(),g=a,O(),oe()}),o.addEventListener("mouseenter",()=>{g=a,O()}),A.append(o),o}let B=[],Se=[];function rt(){const t=y(),a=F(t);if(Se=Ua(a),v=S==="all"?a:a.filter(o=>o.group===S),v.length||(v=a),g=Math.max(0,Math.min(g,v.length-1)),A.textContent="",A.classList.toggle("is-rows",t.kind==="settings"),t.kind==="settings"){B=v.map(Ut),O();return}B=v.map((o,l)=>{const d=Re(o.group),f=r("button","lk__card");f.type="button",f.style.setProperty("--g",d),f.style.setProperty("--g-wash",pe(d,.16)),f.style.setProperty("--g-glow",pe(d,.55));const b=r("span","lk__art"),_=r("img","lk__img");_.alt="",o.thumb?_.src=o.thumb:_.hidden=!0,b.append(_),o.group&&b.append(r("span","lk__gchip",o.group));const P=[r("span","lk__brand",o.brand||"")];return o.after&&P.push(r("span","lk__after",o.after)),f.append(b,...P,r("span","lk__name",o.name),r("span","lk__tag",o.tag||"")),ie()===o.id&&(f.append(r("span","lk__eq","equipped")),f.classList.add("is-eq")),f.addEventListener("click",z=>{z.stopPropagation(),g=l,O(),oe()}),f.addEventListener("mouseenter",()=>{g=l,O()}),A.append(f),f}),O()}const st=[];function Wt(t){const a=F(y()).find(l=>l.id===M[y().id])||null,o=a&&a.id===t.id;W.textContent="",st.length=0;for(const l of Se){const d=wt(l,t.stats[l.key]),f=a&&Ne(a.stats[l.key])?wt(l,a.stats[l.key]):d,b=r("div","lk__stat"),_=r("span","lk__stat-t"),P=r("i"),z=r("u"),C=Math.min(d,f);P.style.width=(C*100).toFixed(1)+"%",!o&&Math.abs(d-f)>.004?(z.style.left=(C*100).toFixed(1)+"%",z.style.width=(Math.abs(d-f)*100).toFixed(1)+"%",z.classList.add(d>f?"is-up":"is-down")):P.style.width=(d*100).toFixed(1)+"%",_.append(P,z);const Te=r("span","lk__stat-v",String(Math.round(d*100))),D=Math.round((d-f)*100),re=r("span","lk__stat-d",o||D===0?"":(D>0?"+":"−")+Math.abs(D));!o&&D!==0&&re.classList.add(D>0?"is-up":"is-down");const $=l.src&&Ne(t.stats[l.src])?t.stats[l.src]:t.stats[l.key];b.title=`${l.label}: ${$.toFixed(2)}${l.suffix||""}`,b.append(r("span","lk__stat-k",l.label),_,Te,re),W.append(b),st.push(b)}Se.length&&(et.textContent=o||!a?"equipped":"vs "+a.name,W.append(et))}function Kt(t){H.style.setProperty("--g",y().accent),U.hidden=!0,ge.style.backgroundImage="none",ee.hidden=!0,Z.hidden=!0,W.textContent="",ue.textContent="settings",be.textContent=t.name,_e.textContent=ce(t.key)?"on":"off",xe.textContent=t.desc||"",K.textContent="";for(const[a,o]of[["state",ce(t.key)?"on":"off"],["default","off"]]){const l=r("div","lk__fact");l.append(r("span","k",a),r("span","v",o)),K.append(l)}}function O(){B.forEach((l,d)=>l.classList.toggle("is-sel",d===g));const t=v[g];if(!t)return;if(B[g]&&B[g].scrollIntoView&&B[g].scrollIntoView({block:"nearest"}),y().kind==="settings"){Kt(t);return}Z.hidden=!1;const a=Re(t.group);H.style.setProperty("--g",a);const o=ie()===t.id;U.hidden=!t.thumb,t.thumb&&(U.src=t.thumb),ge.style.backgroundImage=t.thumb?`url(${t.thumb})`:"none",ee.hidden=!o,ue.textContent=t.brand||"",me.textContent=t.after||"",me.hidden=!t.after,be.textContent=t.name,_e.textContent=t.spec||t.tag||"",xe.textContent=t.blurb||"",Ve.textContent=t.brand||"",Xe.textContent=t.name,Je.textContent=(t.tag||"")+(o?" · equipped":""),Wt(t),K.textContent="";for(const[l,d]of t.facts||[]){const f=r("div","lk__fact");f.append(r("span","k",l),r("span","v",String(d))),K.append(f)}Ft(y(),t)}function Y(){he.forEach((t,a)=>t.b.classList.toggle("is-on",a===h)),$t(),jt(),Dt(),Gt(),rt(),ye()}function V(t,a=1){const o=h;let l=(t%T.length+T.length)%T.length;for(let b=0;b<T.length&&(F(T[l]),!!q.has(T[l].id));b++)l=((l+a)%T.length+T.length)%T.length;h=l,S="all";const d=ie(),f=F(y());g=Math.max(0,f.findIndex(b=>b.id===d)),Y(),o!==h&&(A.classList.remove("is-swap"),A.offsetWidth,A.classList.add("is-swap"))}function oe(){const t=y(),a=v[g];if(!a)return;if(t.kind==="settings"){qa(a.key,!ce(a.key));const d=B[g];d&&(ot(d,a.key),d.classList.remove("is-go"),d.offsetWidth,d.classList.add("is-go")),O();return}M[t.id]=a.id,t.remember?t.remember(a.id):t.kind==="ski"?Zt(a.id):t.kind==="glider"?na(a.id):t.kind==="bike"?sa(a.id):Ra(t.id,a.id),t.apply&&t.apply(a.id,t.kind==="outfit"?w:void 0),t.kind==="outfit"&&(M.outfit=window.__player&&window.__player.outfit||a.id);const o=t.kind==="outfit"?a.brand+" "+(w==="looks"?a.name:a.tag):a.name;u&&u({tab:t.id,gear:a.gear||t.gear||p&&p.mode,kind:t.kind,id:a.id,name:o}),Yt(),O(),ye(),i&&t.kind==="outfit"&&i.tryOn===M.outfit&&(i.tryOn=null);const l=B[g];l&&(l.classList.remove("is-go"),l.offsetWidth,l.classList.add("is-go")),G.classList.remove("is-go"),G.offsetWidth,G.classList.add("is-go"),i&&(i.kick=2.6)}function Yt(){B.forEach((t,a)=>{const o=t.querySelector(".lk__eq"),l=ie()===v[a].id;l&&!o?t.append(r("span","lk__eq","equipped")):!l&&o&&o.remove(),t.classList.toggle("is-eq",l)})}function lt(){if(y().kind==="settings"||!B.length)return 1;const t=B[0].offsetWidth||1,a=10;return Math.max(1,Math.round((A.clientWidth+a)/(t+a)))}let N=0;function Me(){m||(m=!0,N&&(clearTimeout(N),N=0),L.hidden=!1,L.classList.remove("is-out"),i?ae():It(),i&&(le(e,i,window.__player?.outfit),i.tryOn=null),window.__player&&window.__player.outfit&&(M.outfit=window.__player.outfit),V(h),L.offsetWidth,L.classList.add("is-in"),ve=performance.now(),ne||(ne=requestAnimationFrame(at)),requestAnimationFrame(ae))}function Le(){m&&(m=!1,i&&(i.hold=null),i&&i.tryOn!=null&&(le(e,i,window.__player?.outfit),i.tryOn=null),L.classList.remove("is-in"),L.classList.add("is-out"),N&&clearTimeout(N),N=setTimeout(()=>{N=0,m||(L.hidden=!0,L.classList.remove("is-out"))},150))}return addEventListener("resize",()=>{m&&ae()}),window.__locker=Object.assign(window.__locker||{},{turntable(t){return Me(),i.hold=t==null?null:Number(t),i.t=0,new Promise(a=>requestAnimationFrame(()=>requestAnimationFrame(()=>a(i.turntable.rotation.y))))},tryOn:()=>i?i.tryOn:null,mannequin:()=>i?{body:i.cBody,skin:i.cSkin,clip:i.clip,want:i.want,baked:[...i.clips.keys()],pairs:i.riderPairs.length,mats:i.riderMats.size,toggles:i.riderToggles.length,pos:i.cBody?[i.cBody.position.x,i.cBody.position.y,i.cBody.position.z]:null,visible:!!(i.cBody&&i.cBody.visible),pack:!!(i.cPack&&i.cPack.visible),glider:!!(i.cGlide&&i.cGlide.visible)}:null,sub:()=>w,setSub:we,thumbMs:()=>Ct}),{root:L,isOpen:()=>m,open:Me,close:Le,toggle(){return m?Le():Me(),m},key(t){if(!m)return!1;if(t==="Escape"||t==="KeyI")return Le(),!0;if(t==="KeyQ")return V(h-1,-1),!0;if(t==="KeyE"||t==="Tab")return V(h+1,1),!0;if(t==="KeyF"){const o=["all",...nt(F(y()))];return S=o[(o.indexOf(S)+1)%o.length],g=0,Y(),!0}if(t==="KeyG")return y().kind==="outfit"&&we(X[(X.indexOf(w)+1)%X.length]),!0;if(!v.length)return!0;if(t==="ArrowLeft"||t==="KeyA")return g=(g+v.length-1)%v.length,O(),!0;if(t==="ArrowRight"||t==="KeyD")return g=(g+1)%v.length,O(),!0;if(t==="ArrowUp"||t==="KeyW")return g=Math.max(0,g-lt()),O(),!0;if(t==="ArrowDown"||t==="KeyS")return g=Math.min(v.length-1,g+lt()),O(),!0;if(t==="Enter"||t==="Space")return oe(),!0;const a=/^(?:Digit|Numpad)([1-9])$/.exec(t);if(a){const o=Number(a[1])-1;return o<v.length&&(g=o,O(),oe()),!0}return!0},tabs:()=>T.filter(t=>!q.has(t.id)&&t.gear).map(t=>t.id),pages:()=>T.filter(t=>!q.has(t.id)&&!t.gear).map(t=>t.id),tab:()=>y().id,setTab:t=>{const a=T.findIndex(o=>o.id===t);return a>=0&&V(a),y().id},filter:()=>S,setFilter:t=>(S=t,g=0,Y(),S),items:()=>v.map(t=>t.id),selected:()=>v[g]?v[g].id:null,equipped:()=>({...M}),noteEquipped(t,a){M[t]!==void 0&&(M[t]=a,m&&(rt(),ye()))}}}export{_n as createInventory};
