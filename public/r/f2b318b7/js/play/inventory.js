import{SKI_MODELS as ga,skiThumbURL as ma,makeSkiRig as pn,styleSkiRig as hn,rememberSkiId as ba,SKI_DEFAULT as wa}from"./ski.js";import{GLIDER_MODELS as _a,GLIDER_DEFAULT as va,rememberGliderId as ya}from"./glider.js";import{BIKE_MODELS as xa,BIKE_DEFAULT as Sa,bikeThumbURL as Ea,rememberBikeId as Ta,makeBikeRig as Ma,styleBikeRig as Aa,getBikeModel as La,bikeRider as Ia}from"./bike.js";import{SLED_MODELS as Oa,SLED_DEFAULT as Pa,sledThumbURL as Ca,rememberSledId as Ra,resolveSledId as qa,makeSledRig as Fa,styleSledRig as Na}from"./sled.js";import{SNOWMOBILE_MODELS as za,SNOWMOBILE_DEFAULT as Da,snowmobileThumbURL as Ba,rememberSnowmobileId as ja,resolveSnowmobileId as Ua,makeSnowmobileRig as Wa,styleSnowmobileRig as Ka}from"./snowmobile.js";import{BIKE_GEAR as Ha,BRAND as un}from"./flags.js";import{OUTFITS as vt,byCode as Ga,previewOutfit as je,toggleOf as Va,rememberOutfit as Ya,resolveOutfit as Za,PARTS as Ue,parseLook as yt,serialise as Qa,paint as fn,swatch as xt,cloneRig as $a,rigOf as Xa}from"./rider.js";import{R as kn,C as gn}from"./atlas.js";import mn from"./outfits/after.js";import{KNOBS as Ja,get as We,set as ei}from"./settings.js";import{ACTIONS as bn,DEFAULTS as ti,label as Ke,codesOf as wn,keyName as ni,mouseCode as ai,bind as ii,reset as oi,isDefault as St,isWelded as ri}from"./bindings.js";import{hudSurf as Et}from"./hud.js";const si=parseInt(Et.cream.slice(1),16);import{waypointIndex as li,ALIASES as di}from"./spawn.js";const ci={wing:{base:"#dd6a2a",ink:"#6b4a2a",accent:"#f2c98a"},rocket:{base:"#1b1c22",ink:"#0b0b0e",accent:"#b9bec4"}},s=(t,o,p)=>{const u=document.createElement(t);return o&&(u.className=o),p!=null&&(u.textContent=p),u},_n="poi-lab.play.locker.",pi=(t,o)=>{try{localStorage.setItem(_n+t,o)}catch{}},hi=t=>{try{return localStorage.getItem(_n+t)}catch{return null}},vn=t=>t<0?0:t>1?1:t;function ui(t){const o=t.replace("#","");return o.length===3?o.split("").map(u=>parseInt(u+u,16)):[parseInt(o.slice(0,2),16),parseInt(o.slice(2,4),16),parseInt(o.slice(4,6),16)]}const He=(t,o)=>{const[p,u,g]=ui(t);return`rgba(${p},${u},${g},${o})`};function fi(t){let o=0;for(let p=0;p<t.length;p++)o=o*31+t.charCodeAt(p)>>>0;return o%360}const ki=t=>{const u=r=>(r+t/30)%12,g=.62*Math.min(.62,.38),h=r=>Math.round(255*(.62-g*Math.max(-1,Math.min(u(r)-3,Math.min(9-u(r),1)))));return"#"+[h(0),h(8),h(4)].map(r=>r.toString(16).padStart(2,"0")).join("")},yn={lab:"#8fa3b8",race:"#ff3b5c",freeride:"#2ec4b6",trail:"#54d17a",jump:"#ffb020",fun:"#c77dff",dh:"#ff6b3d",xc:"#5ad1e6"},Tt=t=>yn[t]||(yn[t]=ki(fi(String(t||"x")))),xn={ski:'<path d="M5.4 20.6 8.9 5.1c.3-1.4 1.5-2.1 2.6-1.7"/><path d="M12.6 20.6 16.1 5.1c.3-1.4 1.5-2.1 2.6-1.7"/><path d="M4.2 20.9h5.1"/><path d="M11.4 20.9h5.1"/>',bike:'<circle cx="5.9" cy="16.4" r="4.1"/><circle cx="18.1" cy="16.4" r="4.1"/><path d="M5.9 16.4 10.2 8.2h6.1l1.8 8.2"/><path d="M9.4 8.2h4.4"/><path d="M16.3 8.2 17.5 5.4h2.2"/>',glider:'<path d="M12 3.4 2.6 13.9c3.4-1.4 6.4-.7 9.4 6.7 3-7.4 6-8.1 9.4-6.7z"/><path d="M12 3.4v17.2"/>',boots:'<path d="M8.2 3.4h4.3v8.4c0 1.3.8 2.4 2 2.9l4.1 1.8v4.1H6.4V3.4z"/><path d="M6.6 17.1h12"/>',crate:'<path d="M12 2.7 20.2 7v10L12 21.3 3.8 17V7z"/><path d="M3.8 7 12 11.4 20.2 7"/><path d="M12 11.4v9.9"/>',trail:'<path d="M2.6 19.4 8.4 9.1l3.3 5.1 2.6-3.9 5.1 9.1z"/><path d="M15.4 3.1h5.6v3.6h-5.6z"/><path d="M15.4 3.1V10"/>',sled:'<path d="M3.2 13.9h12.9c2.1 0 3.5-1.3 3.5-3 0-1.3-1-2.3-2.2-2.3s-2.2 1-2.2 2.3"/><path d="M4.4 18.2h12.2"/><path d="M5.8 13.9v4.3"/><path d="M13.9 13.9v4.3"/>',snowmobile:'<rect x="2.5" y="14.2" width="10.2" height="4.3" rx="2.1"/><path d="M12.7 16.3h3.5l2.4-2.3"/><path d="M8.4 14.2 10.1 9.6h3.8l1.3 2.7"/><path d="M14 9.6 16.1 7.2"/><path d="M17.2 18.5h3.3"/><path d="M18.9 13.4v5.1"/>',outfit:'<path d="M9 3.2h6l4.1 2.3-1.6 4.4-1.9-.8v11.7H7.4V9.1l-1.9.8L3.9 5.5z"/><path d="M9 3.2 12 6.4 15 3.2"/>',gear:'<circle cx="12" cy="12" r="6.6"/><circle cx="12" cy="12" r="2.9"/><path d="M18.6 12h2.2"/><path d="M5.4 12H3.2"/><path d="M12 5.4V3.2"/><path d="M12 18.6v2.2"/><path d="M16.67 7.33 18.22 5.78"/><path d="M7.33 16.67 5.78 18.22"/><path d="M16.67 16.67 18.22 18.22"/><path d="M7.33 7.33 5.78 5.78"/>',keys:'<rect x="2.6" y="6.2" width="18.8" height="11.6" rx="1.8"/><path d="M6.2 9.6h1.4"/><path d="M11.3 9.6h1.4"/><path d="M16.4 9.6h1.4"/><path d="M8.1 14.3h7.8"/>'};function gi(t){return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(xn[t]||xn.crate)+"</svg>"}const mi=[{key:"speed",label:"speed",unit:!0,src:"term",suffix:" m/s"},{key:"turn",label:"handling",unit:!0,src:"steer",suffix:" rad/s"},{key:"stab",label:"stability",unit:!0},{key:"pop",label:"pop",unit:!0},{key:"spinTorque",label:"spin",unit:!1,suffix:" rad/s"}],Mt=t=>typeof t=="number"&&isFinite(t);function bi(t){const o=[];for(const p of mi){const u=t.map(g=>g.stats?g.stats[p.key]:void 0);!u.length||!u.every(Mt)||o.push({...p,min:Math.min(...u),max:Math.max(...u),n:t.length})}return o}function Sn(t,o){const p=t.max-t.min;return t.unit&&t.n<4?vn(o):p>1e-6?.08+.92*((o-t.min)/p):t.unit?vn(o):.5}const $=new Map;function En(t,o,p){if($.has(t))return $.get(t);const u=300,g=58,h=document.createElement("canvas");h.width=u,h.height=g;const r=h.getContext("2d");if(r.fillStyle=o.base,r.fillRect(0,0,u,g),r.strokeStyle=o.accent,r.lineWidth=3,r.lineCap="round",r.lineJoin="round",r.fillStyle=o.accent,p==="bike")r.beginPath(),r.arc(96,34,17,0,7),r.stroke(),r.beginPath(),r.arc(204,34,17,0,7),r.stroke(),r.beginPath(),r.moveTo(96,34),r.lineTo(140,18),r.lineTo(186,18),r.lineTo(204,34),r.lineTo(150,34),r.closePath(),r.stroke(),r.beginPath(),r.moveTo(186,18),r.lineTo(196,8),r.lineTo(212,8),r.stroke();else if(p==="rocket"){r.fillStyle=o.ink,r.fillRect(132,12,36,30);for(const y of[110,190])r.fillStyle=o.accent,r.fillRect(y-17,9,34,33),r.beginPath(),r.ellipse(y,9,17,7,0,0,7),r.fill(),r.fillStyle=o.ink,r.fillRect(y-17,22,34,7),r.beginPath(),r.moveTo(y-11,42),r.lineTo(y+11,42),r.lineTo(y+17,51),r.lineTo(y-17,51),r.closePath(),r.fill(),r.fillStyle="#ffb347",r.beginPath(),r.moveTo(y-13,52),r.lineTo(y+13,52),r.lineTo(y,58),r.closePath(),r.fill()}else if(p==="wing")r.beginPath(),r.moveTo(150,8),r.quadraticCurveTo(74,20,34,46),r.quadraticCurveTo(96,40,150,50),r.quadraticCurveTo(204,40,266,46),r.quadraticCurveTo(226,20,150,8),r.closePath(),r.fill(),r.strokeStyle=o.ink,r.lineWidth=2,r.beginPath(),r.moveTo(150,4),r.lineTo(150,54),r.stroke();else{r.beginPath(),r.moveTo(112,8),r.lineTo(160,8),r.lineTo(166,34),r.lineTo(198,42),r.lineTo(198,52),r.lineTo(108,52),r.closePath(),r.fill(),r.fillStyle=o.ink;for(let y=0;y<3;y++)r.fillRect(118,14+y*10,40,4)}const E=h.toDataURL("image/png");return $.set(t,E),E}const wi=[["chinBar","chin bar"],["visor","visor"],["hood","hood"],["guards","guards"],["spine","spine plates"],["belt","belt"]],Tn={race:"Cut for the gates: one skin, no slack, nothing on it the clock has to carry.",shell:"A jacket and pants built for the weather first and the lift queue second.",freeride:"Bib pants under a short jacket, cut wide enough to sit down in the trees.",retro:"The loudest page of an old catalogue, reprinted without one apology for it.",armour:"Plated where a fall lands — spine, chin and hands — worn over the suit."},At=t=>"#"+(t&16777215).toString(16).padStart(6,"0"),Ge=t=>(.2126*(t>>16&255)+.7152*(t>>8&255)+.0722*(t&255))/255,_i='900 %px "Helvetica Neue", Helvetica, Arial, sans-serif',Mn=new Map;function vi(t){const o=Mn.get(t.code);if(o)return o;const p=300,u=58,g=t.palette,h=document.createElement("canvas");h.width=p,h.height=u;const r=h.getContext("2d"),E=g.jacket,y=[[0,150,E],[150,230,g.pants],[230,275,g.helmet],[275,300,g.accent!=null?g.accent:g.strap!=null?g.strap:g.glove]];for(const[T,c,k]of y)r.fillStyle=At(k??E),r.fillRect(T,0,c-T,u);An(r,t,E,u);const S=h.toDataURL("image/png");return Mn.set(t.code,S),S}function An(t,o,p,u,g=126){const h=Ve(o).toUpperCase(),r=1.4;for(let y=22;y>9&&(t.font=_i.replace("%",y),!(t.measureText(h).width+r*(h.length-1)<=g));y--);t.fillStyle=Math.abs(Ge(p)-Ge(si))>=Math.abs(Ge(p)-Ge(1513498))?Et.cream:"#17181a",t.textBaseline="middle";let E=12;for(const y of h)t.fillText(y,E,u/2),E+=t.measureText(y).width+r}const yi=t=>wi.filter(([o])=>t[o]).map(([,o])=>o),Ve=t=>t.house==="POI-LAB"?un:t.house;function xi(t){const o=t.flags,p=yi(o),u=Ve(t);return{id:t.code,name:t.name,brand:u,tag:t.family,group:t.family,after:mn[t.code]||"",thumb:vi(t),spec:[`${o.torso} torso · ${o.helmet} helmet`,...p].join(" · "),facts:[["house",u],["family",t.family],["torso",o.torso],["helmet",o.helmet],["extras",p.join(", ")||"—"]],blurb:`${u} ${t.name}. ${Tn[t.family]||""}`.trim()}}const Te=["looks",...Ue],Si={helmet:t=>[t.helmet,t.chinBar&&"chin bar",t.visor&&"visor",t.head==="robot"&&"robot head",t.mask&&"mask",t.collar==="stand"&&"stand collar"],goggles:t=>[t.goggles===!1||t.goggles==="none"?"no goggles":t.goggles==="rimless"&&"rimless"],jacket:t=>[t.torso+" torso",t.hood&&"hood",t.spine&&"spine plates",t.hem&&t.hem+" hem",t.puffy&&"puffy",t.anorak&&"anorak",t.chestPlate&&"chest plate",t.pauldrons&&"pauldrons",t.kitFerrum&&"Ferrum kit",t.kitUmbra&&"Umbra kit",t.kitPhantom&&"Phantom kit",t.kitDuke&&"Duke kit"],pants:t=>[t.pants&&t.pants+" fit",t.belt&&"belt",t.hipPlate&&"hip plate",t.bloused&&"bloused",t.beltBoxes&&"belt boxes"],gloves:t=>[t.guards&&"arm guards",t.poleGuards&&"pole guards"],boots:t=>[t.boot&&t.boot+" boot",t.shinGuards&&"shin guards"],poles:()=>[]},Ei={helmet:"helmet",goggles:"lens",jacket:"jacket",pants:"pants",gloves:"glove",boots:"boot",poles:"pole"},Ti={helmet:[["helmet",0,0,300,58]],goggles:[["lens",0,0,300,29],["strap",0,29,300,29]],jacket:[["chestFront",0,0,110,58],["back",110,0,110,58],["sleeveL",220,0,80,58]],pants:[["legL",0,0,200,58],["belt",200,0,100,58]],gloves:[["glove",0,0,200,58],["poleGuards",200,0,100,58]]},Mi={boots:["boot"],poles:["pole","poleBand"]},Ln=22,In=t=>kn[t]?kn[t].slice(0,4):[gn[t][0],gn[t][1],Ln,Ln];let On=!1,Pn=0;function Ai(){const t=performance.now();for(const o of vt){const{canvas:p}=fn(o.code,null,{cache:!1});for(const u of Ue){const g=document.createElement("canvas");g.width=300,g.height=58;const h=g.getContext("2d"),r=Mi[u];if(r){const E=300/r.length;r.forEach((y,S)=>{h.fillStyle=At(xt(o.palette,y)),h.fillRect(S*E,0,E,58)}),An(h,o,xt(o.palette,r[0]),58)}else for(const[E,y,S,T,c]of Ti[u]){const[k,v,b,m]=In(E);h.drawImage(p,k,v,b,m,y,S,T,c)}$.set(u+":"+o.code,g.toDataURL("image/png"))}}On=!0,Pn=Math.round(performance.now()-t)}function Li(t,o){return On||Ai(),$.get(o+":"+t.code)}function Ii(t,o){const p=Ve(t);return{id:t.code,name:t.name,brand:p,group:t.family,tag:o,after:mn[t.code]||"",thumb:Li(t,o),spec:Si[o](t.flags).filter(Boolean).join(" · ")||"—",facts:[["house",p],["family",t.family],["part",o],["colour",At(xt(t.palette,Ei[o]))]],blurb:`${p} ${t.name} — ${o}. ${Tn[t.family]||""}`.trim()}}const Cn="x";function Oi(){const t="goggles:"+Cn;if(!$.has(t)){const{canvas:o}=fn("g00",null,{cache:!1}),p=document.createElement("canvas");p.width=300,p.height=58;const[u,g,h,r]=In("face");p.getContext("2d").drawImage(o,u,g,h,r,0,0,300,58),$.set(t,p.toDataURL("image/png"))}return $.get(t)}const Pi=()=>({id:Cn,name:"No goggles",brand:"—",tag:"goggles",thumb:Oi(),spec:"bare face",facts:[["house","—"],["part","goggles"],["colour","—"]],blurb:"No goggles. The band comes off and the face is the face."}),R=[{id:"skis",label:"skis",gear:"skis",kind:"ski",icon:"ski",accent:"#4cc9f0",items:()=>ga.map(t=>({id:t.id,name:t.name,brand:t.brand,tag:t.disc,group:t.group,blurb:t.blurb,stats:t.stats,thumb:ma(t),spec:`${t.len} cm · ${t.waist} mm waist · R${t.radius}`,facts:[["length",t.len+" cm"],["waist",t.waist+" mm"],["radius","R"+t.radius],["top speed",t.stats.term.toFixed(1)+" m/s"],["turn rate",t.stats.steer.toFixed(2)+" rad/s"],["chatter",t.stats.chatterSpeed===1/0?"never":t.stats.chatterSpeed+" m/s"],["spin",t.stats.spinTorque.toFixed(1)+" rad/s"],["pop","×"+t.stats.popMul.toFixed(2)]]}))},...Ha?[{id:"bike",label:"bikes",gear:"bike",kind:"bike",icon:"bike",accent:"#ff7a29",items:()=>xa.map(t=>({id:t.id,name:t.name,brand:t.brand,tag:t.disc,group:t.group,blurb:t.blurb,stats:t.stats,thumb:Ea(t),spec:`${t.spec.travel} travel · ${t.spec.head.toFixed(1)}° head · ${t.spec.mass} · ${t.spec.wheel}`,facts:[["travel",t.spec.travel],["head angle",t.spec.head.toFixed(1)+"°"],["wheelbase",t.spec.wb+" mm"],["weight",t.spec.mass],["wheels",t.spec.wheel],["top speed",t.stats.term.toFixed(1)+" m/s"],["pedal cap",t.stats.pedalMax.toFixed(1)+" m/s"],["spin",t.stats.spinTorque.toFixed(1)+" rad/s"],["pop",t.stats.popFull.toFixed(1)+" m/s"]]}))}]:[],{id:"glider",label:"glider",gear:"glider",kind:"glider",icon:"glider",accent:"#a78bfa",items:()=>_a.map(t=>({id:t.id,name:t.name,brand:t.brand,tag:t.tag,group:t.group,blurb:t.blurb,stats:t.stats,facts:t.facts,gear:t.gear,preview:t.preview,spec:t.facts&&t.facts.length?t.facts.slice(0,3).map(([o,p])=>`${o} ${p}`).join(" · "):"",thumb:En("glider-"+t.id,ci[t.glyph],t.glyph)}))},{id:"sled",label:"sled",gear:"sled",kind:"sled",icon:"sled",accent:"#c98a3f",remember:Ra,apply:t=>window.__player?.setSledModel?.(t),items:()=>Oa.map(t=>({id:t.id,name:t.name,brand:t.brand,tag:t.disc,group:t.group,blurb:t.blurb,stats:t.stats,thumb:Ca(t),spec:`${t.spec.length} · ${t.spec.deck} · ${t.spec.mass}`,facts:[["length",t.spec.length],["width",t.spec.width],["deck",t.spec.deck],["runners",t.spec.runners],["weight",t.spec.mass],["top speed",t.stats.term.toFixed(1)+" m/s"],["turn rate",t.stats.steer.toFixed(2)+" rad/s"],["wipe tolerance",(t.stats.wipeTol*180/Math.PI).toFixed(0)+"°"],["stalls below",t.stats.stallSpeed.toFixed(1)+" m/s"]]}))},{id:"snowmobile",label:"snowmobile",gear:"snowmobile",kind:"snowmobile",icon:"snowmobile",accent:"#ff6a1f",remember:ja,apply:t=>window.__player?.setSnowmobileModel?.(t),items:()=>za.map(t=>({id:t.id,name:t.name,brand:t.brand,tag:t.disc,group:t.group,blurb:t.blurb,stats:t.stats,thumb:Ba(t),spec:`${t.spec.engine} · ${t.spec.mass}`,facts:[["engine",t.spec.engine],["track",t.spec.track],["weight",t.spec.mass],["suspension",t.spec.suspension],["top speed",t.stats.term.toFixed(1)+" m/s"],["climbs to",t.stats.climbDeg.toFixed(1)+"°"],["reverse",t.stats.reverseMax.toFixed(1)+" m/s"],["brake",t.stats.brake.toFixed(0)+" m/s²"]]}))},{id:"boots",label:"boots",gear:"boots",kind:"boots",icon:"boots",accent:"#e0b166",items:()=>[{id:"boots",name:"Boots",brand:un,tag:"on foot",group:"lab",blurb:"The Quake-ish walk controller, untouched since the first commit. Walk, sprint, jump, step over anything under 55 cm. Nothing you equip can change how this feels.",stats:{turn:1,speed:.1,stab:1,pop:.2},thumb:En("boots",{base:"#26231f",ink:"#12110f",accent:"#cdc7ba"},"boot"),spec:"walk 4.5 m/s · sprint 8.0 m/s · step 0.55 m",facts:[["walk","4.5 m/s"],["sprint","8.0 m/s"],["jump","4.5 m/s"],["step up","0.55 m"]]}]},{id:"outfit",label:"outfit",kind:"outfit",icon:"outfit",accent:"#ff5c8a",remember:Ya,apply:(t,o)=>window.__player?.setOutfit?.(o&&o!=="looks"?{[o]:t}:t),items:t=>!t||t==="looks"?vt.map(xi):[...t==="goggles"?[Pi()]:[],...vt.map(o=>Ii(o,t))]},{id:"trails",label:"trails",kind:"trail",icon:"trail",accent:"#4cc9f0",items:()=>Rn(It,Ot)},{id:"settings",label:"settings",kind:"settings",icon:"gear",accent:"#4fd6a9",items:()=>Ja.map(t=>({id:t.key,key:t.key,name:t.label,desc:t.desc,def:!!t.def}))},...typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches?[]:[{id:"keys",label:"keys",kind:"keys",icon:"keys",accent:"#e8a13f",items:()=>[...bn.map(t=>({id:t.id,action:t.id,name:t.name})),{id:"__reset",name:"RESET TO DEFAULTS",isReset:!0}]}]],Ye={double:4,black:3,blue:2,green:1},Lt={green:{cls:"is-circ",label:"green circle"},blue:{cls:"is-sq",label:"blue square"},black:{cls:"is-dia",label:"black diamond"},double:{cls:"is-dia2",label:"double diamond"}},Ci={"ski-run":"run","bike-trail":"trail",lift:"lift",venue:"venue",landmark:"landmark",notice:"notice"};function Rn(t,o){if(!t)return[];let p=null;try{p=li(t,o==="z"?"z":"y")}catch{return[]}if(!p||!p.size)return[];const u=new Map;for(const c of Array.isArray(t.markers)?t.markers:[])c&&c.id&&u.set(c.id,{diff:c.diff||null,kind:Ci[c.kind]||c.kind||null});const g=new Map,h=new Set;for(const c of Array.isArray(t.runs)?t.runs:[]){if(!c||!c.id||!Array.isArray(c.pts)||!c.pts.length)continue;h.add(c.id);const k=c.family?String(c.family):null,v=String(k&&c.familyName||c.name||c.id),b=k?`f:${k}`:`i:${c.id}`,m=c.pts[0],j={id:c.id,n:c.pts.length,at:{x:+m[0],y:+m[1],z:+m[2]}};let q=g.get(b);q||(q={name:v,kind:"run",section:"runs",diff:null,segments:[],slugs:[],names:[]},g.set(b,q)),q.segments.push(j),q.names.push(String(c.name||c.id));const K=c.diff||(u.get(c.id)||{}).diff||null;K&&(Ye[K]||0)>(Ye[q.diff]||0)&&(q.diff=K)}const r=[];for(const c of g.values()){c.segments.sort((v,b)=>b.at.y-v.at.y);const k=c.segments[0];r.push({id:k.id,slug:k.id,name:c.name,at:k.at,diff:c.diff,kind:"run",viaSign:!1,section:"runs",segments:c.segments.map(v=>v.id),canEquip:c.segments.reduce((v,b)=>v+b.n,0)>=4,slugs:[],names:c.names.slice()})}const E=new Map;for(const[c,k]of p){if(!k||!k.id||h.has(k.id)||E.has(k.id))continue;const v=u.get(k.id)||{};E.set(k.id,{id:k.id,slug:c,name:k.name||k.id,at:k.at,diff:v.diff||null,kind:v.kind||k.kind||null,viaSign:k.kind==="marker",section:"places",segments:[],canEquip:!1,slugs:[],names:[]})}const y=new Map;for(const c of r)for(const k of c.segments)y.set(k,c);for(const c of E.values())y.set(c.id,c);for(const[c,k]of Object.entries(di)){const v=y.get(k);v&&c!==v.slug&&!v.slugs.includes(c)&&v.slugs.push(c)}const S=(c,k)=>(Ye[k.diff]||0)-(Ye[c.diff]||0)||String(c.name).localeCompare(String(k.name));r.sort(S);const T=[...E.values()].sort(S);return[...r,...T].map(c=>({id:c.id,slug:c.slug,name:c.name,at:c.at,diff:c.diff,kind:c.kind,viaSign:c.viaSign,canEquip:c.canEquip,section:c.section,segments:c.segments.slice(),also:c.slugs.slice(0,2).join(" · "),names:(c.names||[]).slice()}))}const Ri=16,qn=12,qi=8,Fn=-3,Nn=-1,Fi=(t,o)=>o===0||!/[a-z0-9]/i.test(t[o-1]);function zn(t,o){const p=String(t||""),u=String(o||"").replace(/\s+/g,"");if(!u||u.length>p.length)return null;const g=p.toLowerCase(),h=u.toLowerCase(),r=p.length;let E=new Float64Array(r).fill(-1/0);const y=[];for(let k=0;k<h.length;k++){const v=new Float64Array(r).fill(-1/0),b=new Int32Array(r).fill(-1);for(let m=k;m<r;m++){if(g[m]!==h[k])continue;let j=Ri;if(Fi(p,m)&&(j+=k===0?qn*2:qn),k===0){v[m]=j+(m?Fn+Nn*(m-1):0),b[m]=-1;continue}for(let q=k-1;q<m;q++){if(E[q]===-1/0)continue;const K=m-q-1,F=E[q]+j+(K===0?qi:Fn+Nn*(K-1));F>v[m]&&(v[m]=F,b[m]=q)}}y.push(b),E=v}let S=-1,T=-1/0;for(let k=0;k<r;k++)E[k]>T&&(T=E[k],S=k);if(S<0||T===-1/0)return null;const c=[];for(let k=h.length-1,v=S;k>=0&&v>=0;k--)c.unshift(v),v=y[k][v];return{score:T-p.length*.05,pos:c}}function Ni(t,o){const p=zn(t.name,o);let u=p?p.score:-1/0;for(const g of[...t.names||[],t.also||"",t.slug||""]){if(!g||g===t.name)continue;const h=zn(g,o);h&&h.score-20>u&&(u=h.score-20)}return u===-1/0?null:{score:u,pos:p?p.pos:[]}}const Dn="/r/f2b318b7/assets/trail-map/palisades-2400.67aace95.webp",fe=2400,ke=1625,Bn=6,zi="data:image/webp;base64,UklGRlAFAABXRUJQVlA4IEQFAACwFgCdASpgAEEAPtVUkUWkoozOqqomBqJwBk/EeXCyAMYv//w/8O9tyt5/vT8noR9onU93ryn+BGk7Zy/uZ8qzKDHQO+V0IVHzqZ+tMtxxX6FEdH5ZT8ad4k9np8fjP4rzKn9riMcogvQEyWYyNEkBLB7YIwRaeNqKh4T2XfgH4ekzaH6iwuWdDqGvPduty3aYEuBIY0os+H/8IcuFtOoXf+MTEYmb74/7vZCu52VFOkU5OW+fV6X9WsMfFzoAANFgyuALM0T6f/56Z+ifU1du5//WV/8yv/lL/D7rpCItbFKKASvjKFOefw7nSo6MPJvOspw6yTLBs6osovKIILt87nm6KC0kHvg9Eb22ahOVQW2iRajqxnUSZOqp9zZ23f1ZQbM08rHPj1m9db5KQPJaX9e8Z0M8Sfrv3DhhglC8+PpocNatN41SIkqiiIQRk4XQWXLK1HDO4ipNVykecBhYgsQz1oYfGcJK9c4JzXc7ghf1yN2pcO+MY/KVq03jMSUp2opIx0PKQky+YTkjsS2Q7gVK8CWdggN5YrTzllV9M2KyE3AF6/8bgqH8xi6a8tQ4fJxA3Y02fjUjR8tzbeegk4KVhNNcgK2SxvxZuoqRvq/P3PadI4LX0VHYsvArkZH77xuw0MlgBkvnXb/zFxlKduMGxwKgFFUtH9u2dNb4ZDPE9irLX94azImRAfMRcNKms/zu6plO7yNz6uVzHDqRkdPN0S39t56NZV8zZeFjk9XnDDV1H10oYeVSa1oqJPOq85VfLO7Jh3/B7DPrFkScIXbJhT2Z86h7Mz/4ahObXnEyKN3b20TbcHuU5FdPA2BGWdlwHOnCV9nrAkN8eMCGkclayZdYdkVX6YaCMFAGrwpyfeegMFRte+MxJ29ybAT1zLxvvM6lNixzfDwb6uqTqAj9mZr+FVfosx+JJCw6b68Yc9LOmkFMZtuhUvaieyRFXQYEouYB26ky6Ylkzo7A8wjCU7G8ITddQij6WJcTjhJDy0jEd2rh9WO1pHgj6WV7/iyu1LSet8WJNfBoF43zEGmC3i3QfOXvYf//6E7aU2hJ43sD5YfEQnv7nSIVobncRAleSo4uy9kh1UjkJgWbPFJ3hyo1QbBsq3HLro+C4cV+5saEnbRrMmyqylMEQOkkl9rsPNUdDsu2jiZmAOui/NcTvXRZEint77eRvXz0BUAyodyJFS26xidhp2a0qhLFazC5WHjeVdn0K7c13tr5HwZXZtcrDFAG793leNbXaK3GjN4rTnBuHUo212Xn9Gh2rlABce3B/HKis8jtBbesmGMAwjfBKz7glMX/01MF0ECcAHeYccE+/o2GimoOdnJiwUxyTAynviHe3Y9caGQuocavcNvGaljf2IxJ1dZPn0Oj1GDcZGHlUZKU/Vz5mts9jhkriobRNd8YbRfnsPljQZjAhsURfennIKSgOHl6R+iEt5wg+F8BKLm5qdtpQZQwGrO6WwHMB6eJlzeZzCXKpyi1ugEDkSzyRqBJ2QYYEIvHF7OVKpQ2UUbg5ruhVVIz7r1pja+cBLDIhApH+YsDxPt4Hu7rdaTfZPhZ2yRd8Id7MFxB/zk1OVjnsjfQP+hNnm9dkmA4zbgvVK4KvvhMEBTHl6ottxyDBB5+MB74KcSLwE1qZZPsT5qJVsWL1O1dnEj55rmC2TCcdCyeetARVcaAnUbwS32kA5b3903EwrBoBKjoJObgvkm6a25SwynGVfj947qgZEtgwUe4LfjKogEiUHQXryxJWpPce4ptcAezJzDLceTbBIgQo6Sd17LewAAA";let Z=null;try{Z=new Image,Z.src=zi,Z.decode&&Z.decode().catch(()=>{})}catch{Z=null}let Me=null,Ze=null,Ae=null,jn=0;function Di(){if(Ze)return Ze;const t=typeof performance<"u"?performance.now():Date.now();return Ze=fetch(Dn).then(o=>{if(!o.ok)throw new Error("HTTP "+o.status);return o.blob()}).then(o=>typeof createImageBitmap=="function"?createImageBitmap(o):new Promise((p,u)=>{const g=URL.createObjectURL(o),h=new Image;h.onload=()=>{URL.revokeObjectURL(g),p(h)},h.onerror=()=>{URL.revokeObjectURL(g),u(new Error("decode failed"))},h.src=g})).then(o=>(Me=o,jn=+((typeof performance<"u"?performance.now():Date.now())-t).toFixed(1),o)).catch(o=>(Ae=String(o&&o.message||o),null)),Ze}function ge(t,o){return Math.min(t/fe,o/ke)}function Qe(t,o,p){const u=ge(o,p);t.scale=Math.max(u,Math.min(u*Bn,t.scale));const g=fe*t.scale,h=ke*t.scale;return t.ox=g<=o?(o-g)/2:Math.max(o-g,Math.min(0,t.ox)),t.oy=h<=p?(p-h)/2:Math.max(p-h,Math.min(0,t.oy)),t}function Bi(t,o){const p=ge(t,o);return{scale:p,ox:(t-fe*p)/2,oy:(o-ke*p)/2}}function $e(t,o){const p=typeof performance<"u"?performance.now():Date.now(),u=t.getContext&&t.getContext("2d");if(!u)return null;let g=1;try{g=Math.min(2,window.devicePixelRatio||1)}catch{g=1}const h=Math.max(60,Math.round(t.clientWidth||300)),r=Math.max(60,Math.round(t.clientHeight||240));(t.width!==Math.round(h*g)||t.height!==Math.round(r*g))&&(t.width=Math.round(h*g),t.height=Math.round(r*g)),u.setTransform(g,0,0,g,0,0),u.fillStyle=Et.cream,u.fillRect(0,0,h,r),u.imageSmoothingEnabled=!0;try{u.imageSmoothingQuality="high"}catch{}const E=Me||(Z&&Z.complete&&Z.naturalWidth?Z:null),y=!Me&&!!E;if(E)try{u.drawImage(E,o.ox,o.oy,fe*o.scale,ke*o.scale)}catch{}const S=typeof performance<"u"?performance.now():Date.now(),T=fe*o.scale,c=ke*o.scale;return{ms:+(S-p).toFixed(2),w:h,h:r,dpr:g,loaded:!!Me,placeholder:y,err:Ae,fetchMs:jn,scale:+o.scale.toFixed(5),fit:+ge(h,r).toFixed(5),zoom:+(o.scale/ge(h,r)).toFixed(3),ox:+o.ox.toFixed(1),oy:+o.oy.toFixed(1),lbx:+Math.max(0,(h-T)/h).toFixed(4),lby:+Math.max(0,(r-c)/r).toFixed(4)}}const ji=`
/* ================ specs/0055 §5.2 (Greg 2026-09-06: locker themed) ==========
   THE WHOLE LOCKER IS THE MAP BOARD NOW. Greg, 2026-09-06: "You can theme the
   whole inventory to the theme of the trails, just make sure that we can 1 see
   the player preview and 2 see the item previews that are being equipped." That
   supersedes the earlier "inventory stays as it is" pick and §10.8's
   byte-identical clause, and the register it names is the one W4 already built
   for the TRAIL QUICK-TRAVEL tab below: cream board, ink type, hairline rows,
   ink selection. Every tab now wears it — skis, bikes, glider, sled,
   snowmobile, boots, outfit, settings, trails.

   THE TWO THINGS THAT MAY NOT MOVE, and how they are kept:
     1. THE PLAYER PREVIEW. The mannequin stage is an INK BOARD under a 2 px
        mounting rule — §1.6's second surface, not a third slab — and it grew
        from 300 px to 320 px wide when the deck column did.
     2. THE ITEM PREVIEWS. Every thumb canvas and swatch this screen ever drew
        is still drawn, at the same size, on the same near-black ground it had:
        \`.lk__art\` and \`.lk__hero\` are ink boards, so the art reads exactly as
        it did. Only the FRAME around them changed — ink board, mounting rule,
        kind accent — and the cards' dark plates became cream ones.

   D19 — NO NEW SLAB. Cream \`--p-cream\` and ink \`--p-ink\` are §1.6's two
   surfaces and this file adds none. Every name below is a local alias for a
   token W1 published on \`:root\` (hud.js), read and never redeclared. The
   literals left are the ink written out with an alpha — the scrim at 55 % and
   the row wash at 7 %, both §1.6's ink and neither a new surface — and the
   muted grey W4's trail rows already carried, so no colour is new to this file
   either (specs/0055 D19, the fix round's item 3). */
.lk {
  --lk-acc: #4cc9f0;                    /* the tab's own colour — JS sets it */
  --lk-scrim: rgba(23, 22, 20, .55);    /* ink at 55 %, the lookbook A cell */
  --lk-board: var(--p-cream);
  --lk-plate: var(--p-ink);             /* the ink board every preview sits on */
  --lk-sig: var(--p-k-lift);            /* §1.7 — the one accent, and it means EQUIPPED */
  /* specs/0055 D19 / §11.3 — the hover is THE INK, NOT A THIRD SLAB. It read
     \`#e6e2d8\` — a colour that is in neither §1.6 surface and that no \`:root\`
     name publishes, so the gate counted it as a slab added without a sign-off.
     It is the ink at 7 % over the cream board, so that is what it now says:
     the same literal \`--lk-scrim\` above already reads, at a wash alpha instead
     of a scrim's. Over \`--p-cream\` it renders within four levels of the old
     value on one channel, and it can never drift away from the two surfaces. */
  --lk-wash: rgba(23, 22, 20, .07);     /* the trail rows' own hover — ink at 7 % */
  --lk-line: var(--p-seam);
  --lk-line-2: var(--p-sub);
  --lk-ink: var(--p-ink);
  --lk-ink-2: var(--p-sub);
  --lk-ink-3: #8f887a;
  --lk-good: var(--p-diff-green);
  --lk-bad: var(--p-diff-red);
  --lk-mono: var(--p-mono);
  --lk-sans: var(--p-fam);
  position: fixed; inset: 0; z-index: 50;
  display: grid; place-items: center; padding: 16px;
  background: var(--lk-scrim);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  font-family: var(--lk-sans);
  color: var(--lk-ink);
  pointer-events: auto;
  opacity: 0;
  /* §6 — the locker RISEs and FALLs, and it invents neither duration */
  transition: opacity var(--p-fall) linear;
}
.lk[hidden] { display: none; }
.lk.is-in { opacity: 1; transition: opacity var(--p-rise) var(--p-rise-ease); }
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
  /* the map board: ONE colour, 2 px radius, and the shadow that lifts it off
     the slope. No chrome gradient, no inset highlight — a printed board has
     neither and the lookbook's \`.map\` is exactly this rule. */
  background: var(--lk-board);
  border-radius: var(--p-r);
  box-shadow: 0 12px 40px rgba(0,0,0,.42);
  overflow: hidden;
  transform: translateY(10px);
  opacity: 0;
  transition: transform var(--p-fall) linear, opacity var(--p-fall) linear;
}
.lk.is-in .lk__panel {
  transform: none; opacity: 1;
  transition: transform var(--p-rise) var(--p-rise-ease), opacity var(--p-rise) var(--p-rise-ease);
}
/* the accent hairline is gone: the header's own 2 px mounting rule is the
   board's top edge now, and one rule is the register's answer to two */
.lk__panel::before { content: none; }

/* ----------------------------------------------------------------- header
   The lookbook's \`.map__hd\`, measured at 1:1: the name in the board face at
   14 px oblique, the 2 px ink mounting rule under it, and the mono strip on the
   right — which is where the loadout already sat. */
.lk__hd {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 14px;
  border-bottom: var(--p-rule) solid var(--p-ink);
}
.lk__title {
  font-family: var(--lk-sans); font-size: 14px; font-weight: var(--p-weight);
  font-style: var(--p-oblique);
  letter-spacing: .1em; text-transform: uppercase; color: var(--lk-ink);
}
.lk__title b { font-weight: var(--p-weight); }
.lk__spacer { flex: 1 1 auto; }
.lk__load { display: flex; align-items: center; gap: 14px; }
.lk__load-i { display: flex; align-items: baseline; gap: 6px; }
.lk__load-k {
  font-family: var(--lk-mono); font-size: 9px; letter-spacing: .16em;
  text-transform: uppercase; color: var(--lk-ink-3);
}
.lk__load-v {
  font-family: var(--lk-mono); font-size: 9.5px; letter-spacing: .04em; color: var(--lk-ink-2);
  max-width: 19ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ------------------------------------------------------------------- tabs */
/* The lookbook's \`.tabbar\`: no gaps, no rounded caps, a 2 px ink rule under the
   strip, and the ACTIVE TAB IS AN INK PLATE rather than a coloured underline —
   the same object as a selected trail row, one register up. */
.lk__tabs {
  display: flex; align-items: stretch; gap: 0;
  padding: 0 14px; border-bottom: var(--p-rule) solid var(--p-ink);
}
/* NOTHING that says "this is the active tab" is transitioned. A CSS transition
   is driven by the document's animation clock, and on a frame-starved deck —
   a heavy world behind the panel, a software rasteriser — that clock can stall
   long enough for the strip to keep advertising the tab you just left. Colour
   changes here snap; only the decorative hover lift below animates. */
/* specs/0055 §8 P5 — 44 px, AND THE PREVIEW DOES NOT PAY FOR IT. The strip was
   33 px (a 15 px glyph in 9 px of padding), the one shipped control on this
   screen under the touch floor. \`min-height\` rather than more padding, because
   padding would also push the label away from the glyph on a rack tab whose
   count sits tight against it; \`.lk *\` is border-box, so 44 is 44. The 11 px
   the strip takes are given back by \`.lk__main\` below — its vertical padding
   drops 12 -> 6 — so \`.lk__stage\` and the mannequin canvas inside it come out
   a pixel LARGER than the 305 x 407 §10.8(b) records, not smaller. */
.lk__tab {
  position: relative;
  display: flex; align-items: center; gap: 7px;
  min-height: 44px;
  padding: 9px 11px; cursor: pointer;
  border-radius: 0;
  color: var(--lk-ink-2);
}
.lk__tab svg { width: 15px; height: 15px; flex: none; }
.lk__tab-l {
  font-family: var(--lk-mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
}
.lk__tab-n {
  font-family: var(--lk-mono); font-size: 9.5px; font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 0; border-radius: 0; background: none;
  color: inherit; opacity: .6;
}
.lk__tab::after { content: none; }
.lk__tab:hover { color: var(--lk-ink); background: var(--lk-wash); }
.lk__tab.is-on { color: var(--p-cream); background: var(--p-ink); }
.lk__tab.is-on .lk__tab-n { background: none; color: inherit; opacity: .6; }
.lk__tab.is-on svg { color: inherit; }

/* ------------------------------------------------------------------- body */
.lk__main {
  display: grid; gap: 14px; min-height: 0;
  /* the two side decks grow with the panel instead of pinning at 320/340, so a
     2560-wide deck spends its extra width on the preview and the spec sheet
     rather than on ever-wider cards */
  /* the preview column's floor rises 300 -> 320 px with the theme: constraint 1
     says the player preview may not shrink, and on a 1280 deck this is the one
     column that can grow without costing the card grid a column */
  grid-template-columns: minmax(320px, 23%) minmax(0, 1fr) minmax(330px, 23%);
  grid-template-areas: "pv grid det";
  /* specs/0055 §8 P5 — 6 px, not 12: the vertical half of this padding is what
     pays for the tab strip's 44 px above, and it is the cheapest 12 px on the
     screen. Under a 2 px ink mounting rule the body wants a hairline of air,
     not a margin; the horizontal 14 is untouched. */
  padding: 6px 14px;
  gap: 0;
}

/* ---- left: THE PLAYER PREVIEW (constraint 1).
   The mannequin keeps its stage, its size and its renderer; the stage is now
   §1.6's OTHER surface — an ink board under a 2 px mounting rule in the tab's
   own colour — because a cream ground would put a cream helmet on cream. This
   is the same two-surface board the trail tab already stands on, read the other
   way up, and it is not a third slab. */
.lk__pv {
  grid-area: pv; display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 10px;
  min-height: 0; padding-right: 14px;
  border-right: var(--p-hairline) solid var(--lk-line);
}
.lk__stage {
  position: relative; min-height: 0; border-radius: var(--p-r); overflow: hidden;
  border: 0; border-bottom: var(--p-rule) solid var(--lk-acc);
  background: var(--lk-plate);
}
/* the floor: one soft ellipse the figure stands on, drawn in CSS so the
   preview scene stays two lights and a turntable. On ink it is a LIGHT
   ellipse — §1.10's hairline-on-ink token, spread — where it used to be a
   dark one on a dark ground. */
.lk__stage::after {
  content: ""; position: absolute; left: 50%; bottom: 12%; width: 62%; height: 9%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, var(--p-hair), transparent 78%);
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
/* the caption under the mannequin: the board's own type, no card around it —
   one hairline holds it to the stage the way a blade is held to its post */
.lk__plate {
  display: grid; gap: 2px; padding: 8px 2px 0;
  border: 0; border-radius: 0; background: none;
  /* specs/0012 §C — no left stripe. The brand line above the name is already
     accent-coloured; the plate did not need a second one turned on its side. */
}
.lk__plate-brand {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase; color: var(--lk-ink-2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lk__plate-name {
  font-family: var(--lk-sans); font-size: 15px; font-weight: var(--p-weight);
  font-style: var(--p-oblique); text-transform: uppercase;
  letter-spacing: .06em; line-height: 1.18; color: var(--lk-ink);
}
.lk__plate-tag {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: var(--lk-ink-3);
}

/* ---- middle: filters + the card grid */
.lk__mid {
  grid-area: grid; display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px;
  min-height: 0; padding: 0 14px;
}
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
/* The lookbook A cell's filter line: WORDS with an ink underline, not pills.
   The pill was the dark screen's idea of a chip; on the board a filter is a
   caption that is either struck under or it is not. The group's tint stays as
   the 7 px mark in front of it — that dot is information, not decoration. */
.lk__chip {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 4px 2px; border-radius: 0;
  border: 0; border-bottom: var(--p-rule) solid transparent;
  background: none;
  font-family: var(--lk-mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: var(--lk-ink-2);
}
.lk__chip i { font-style: normal; font-variant-numeric: tabular-nums; opacity: .7; letter-spacing: 0; }
.lk__chip::before {
  content: ""; width: 7px; height: 7px; border-radius: var(--p-r); flex: none;
  background: var(--g, var(--lk-ink-3)); align-self: center;
}
.lk__chip:hover { color: var(--lk-ink); }
.lk__chip.is-on { color: var(--lk-ink); border-bottom-color: var(--p-ink); background: none; }
.lk__chip.is-on::before { background: var(--g, var(--lk-ink)); }
.lk__filters, .lk__subs { gap: 6px 16px; }

/* ---- specs/0061 S: the search line.
   A LOCKER ROW, NOT A SLAB (0055 §5.3, D19). The cream board is already under
   it and the only mark it adds is the hairline the filter chips already wear
   under a live one — \`--lk-line-2\` idle, ink on focus. The type is the row's
   own oblique caps, so the field reads as the first line of the list rather
   than as a widget parked above it, and the placeholder is the muted grey W4's
   trail rows already carried (\`--lk-ink-3\`). No plate, no fill, no radius. */
.lk__tsearch { display: flex; align-items: baseline; gap: 8px; }
.lk__tsearch[hidden] { display: none; }
.lk__tsearch-ic, .lk__tsearch-n {
  flex: none; font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: var(--lk-ink-3);
  font-variant-numeric: tabular-nums;
}
.lk__tsearch-i {
  flex: 1 1 auto; min-width: 0;
  padding: 4px 2px; margin: 0;
  border: 0; border-bottom: var(--p-rule) solid var(--lk-line-2);
  background: none; border-radius: 0; outline: none; box-shadow: none;
  font-family: var(--lk-sans); font-size: 13px;
  font-weight: var(--p-weight); font-style: var(--p-oblique);
  letter-spacing: .05em; text-transform: uppercase; color: var(--p-ink);
}
.lk__tsearch-i::placeholder { color: var(--lk-ink-3); opacity: 1; text-transform: uppercase; }
/* FOCUS IS THE HAIRLINE, NOT A BOX. te.css:234 puts \`outline: 2px solid
   var(--accent)\` on every focused input in the bench, at a specificity
   (\`input:focus\`) that beats a bare class — which drew a 2 px orange rectangle
   round the field, a plate this register does not own (D19) and the one shape
   0055 §5.3 spent its whole fidelity round taking OFF the locker. Three classes
   deep is what it takes to say no, and what says "live" instead is the rule
   under the field going to the accent: the same mark \`.lk__chip.is-on\` already
   uses for the filter that is on, in the same colour as the matched letters. */
.lk .lk__tsearch .lk__tsearch-i:focus { outline: none; border-bottom-color: var(--lk-sig); }
/* The matched letters, in the locker's ONE accent (\`--lk-sig\`, §1.7's lift
   orange) — the only accent this register publishes for ink on the cream
   board, and no colour new to this file. It is carried by WEIGHT as well as by
   hue so the match still reads where the hue does not. */
.lk__hl { font-style: inherit; font-weight: 800; color: var(--lk-sig); }

.lk__grid {
  display: grid; align-content: start;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  overflow-y: auto; overflow-x: hidden;
  min-height: 0; padding: 2px 10px 10px 0;
  scrollbar-color: var(--lk-line-2) transparent;
}
.lk__grid::-webkit-scrollbar { width: 9px; }
.lk__grid::-webkit-scrollbar-track { background: transparent; }
.lk__grid::-webkit-scrollbar-thumb { background: var(--lk-line-2); border-radius: 0; border: 3px solid transparent; background-clip: content-box; }
.lk__grid::-webkit-scrollbar-thumb:hover { background: var(--lk-ink); background-clip: content-box; }
.lk__grid.is-swap { animation: lk-swap var(--p-rise) var(--p-rise-ease); }
@keyframes lk-swap { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

/* ---- the card */
/* The card on the board: a cream plate, a hairline, 2 px radius, and NO LIFT —
   register 3 has no hover choreography, and a printed card does not levitate.
   Selection is the ink rule the trail rows use, turned all the way round the
   card; EQUIPPED is the one accent (§1.7's lift orange), spent on a word and
   never on a surface. */
.lk__card {
  position: relative; display: grid; gap: 6px; cursor: pointer; text-align: left;
  padding: 8px;
  border: var(--p-hairline) solid var(--lk-line);
  border-radius: var(--p-r);
  background: var(--lk-board);
  /* border-color is the selection ring and is deliberately NOT transitioned —
     see the note on .lk__tab. Nothing else here animates any more. */
  transition: none;
}
.lk__card:hover { background: var(--lk-wash); border-color: var(--lk-line-2); }
.lk__card.is-sel {
  background: var(--lk-wash);
  border-color: var(--p-ink);
  box-shadow: inset var(--p-spine) 0 0 var(--p-ink);
}
.lk__card.is-eq { background: var(--lk-wash); }
.lk__card.is-go { animation: lk-equip var(--p-snap) linear; }
@keyframes lk-equip {
  0% { transform: scale(.96); }
  100% { transform: none; }
}
/* THE ITEM PREVIEW (constraint 2). Every thumb this screen ever drew is still
   drawn here, at the same size, on the same near-black ground it always had —
   \`.lk__art\` was a dark plate before the theme and it is §1.6's ink board
   after it, so a ski topsheet, an outfit's four bands and a boot swatch all
   read exactly as they did. Only the frame changed: 2 px radius, and a
   mounting rule in the item's OWN kind colour under it. */
.lk__art {
  position: relative; display: grid; place-items: center;
  height: 78px; border-radius: var(--p-r); overflow: hidden;
  background: var(--lk-plate);
  border-bottom: var(--p-rule) solid var(--g, var(--lk-acc));
  box-shadow: none;
}
.lk__img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
/* the group word is a CAPTION in the group's colour, not a pill: on the ink
   board the tint carries itself, and the register spends no surface on it */
.lk__gchip {
  position: absolute; top: 5px; right: 6px;
  font-family: var(--lk-mono); font-size: 8px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  padding: 0; border-radius: 0;
  background: none; color: var(--g);
}
.lk__brand {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase; color: var(--lk-ink-2);
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
     "Trek Ticket DJ" with "Specialized Epic Hardtail" still rules a level grid.
     The board's own face, obliqued and capped — the trail rows' name, one size
     down because a card is not a row. */
  font-family: var(--lk-sans); font-size: 12.5px; font-weight: var(--p-weight);
  font-style: var(--p-oblique); text-transform: uppercase;
  letter-spacing: .04em; line-height: 1.24; min-height: 2.48em;
  color: var(--lk-ink);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.lk__tag {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--lk-ink-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* EQUIPPED sits on the art in the game's one accent — the lookbook A cell's
   rule: the orange stays a signal and never becomes a surface. It gets the ink
   plate under it because the art it lies on is a PICTURE, and a picture is the
   one ground a caption cannot count on (an orange ski under orange type). */
.lk__eq {
  position: absolute; left: 8px; top: 8px;
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--lk-mono); font-size: 8px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  padding: 3px 6px; border-radius: 0;
  background: var(--p-ink); color: var(--lk-sig);
  box-shadow: none;
}
.lk__eq::before { content: "\\2713"; font-size: 9px; letter-spacing: 0; }

/* ---- specs/0019: the settings rows.
   The same grid element the cards live in, switched to one full-width column,
   so the scrolling, the keyboard selection and the swap animation are the ones
   that already work rather than a second implementation of them. */
.lk__grid.is-rows { grid-template-columns: minmax(0, 1fr); gap: 0; }
.lk__row {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center;
  gap: 8px 16px; cursor: pointer; text-align: left;
  padding: 12px 10px;
  border: 0; border-bottom: var(--p-hairline) solid var(--lk-line); border-radius: 0;
  background: none;
  /* the selection is the ink rule, not transitioned — same note as .lk__tab */
  transition: none;
}
.lk__row:hover { background: var(--lk-wash); }
.lk__row.is-sel {
  background: var(--lk-wash);
  box-shadow: inset var(--p-spine) 0 0 var(--p-ink);
}
.lk__row.is-go { animation: lk-equip var(--p-snap) linear; }
/* both are SPANS in a <button> (a button may not contain a <div>), so they have
   to be told to be blocks — left inline they set as one paragraph and the label
   runs straight into the sentence after it */
.lk__row-t {
  display: block;
  font-family: var(--lk-sans); font-size: 15px; font-weight: var(--p-weight);
  font-style: var(--p-oblique);
  letter-spacing: .04em; text-transform: uppercase; color: var(--lk-ink);
}
/* §1.2 — prose is roman, sentence case, and never oblique */
.lk__row-d {
  display: block; font-family: var(--lk-sans); font-size: var(--p-prose);
  font-style: normal; letter-spacing: 0; line-height: 1.45;
  color: var(--lk-ink-2); margin-top: 4px;
}
.lk__row-txt { display: block; min-width: 0; }
/* the switch: a track, a plate, and a word. NOTHING here is transitioned, and
   that is the .lk__tab note applied to the one control on this screen where
   being wrong for a moment is worst: a transition runs on the document's
   animation clock, and on a frame-starved deck (a heavy world behind the panel,
   a software rasteriser) that clock stalls — the first cut animated the knob's
   travel and photographed a switch reading ON with its knob still hard left.
   A switch may not lie about its state for even one frame.

   specs/0055 5.3 — LOCKER SETTINGS **A** (D14). The pill and its round knob are
   gone: the control is A SQUARE INK PLATE SLIDING IN A CREAM TRACK, 1.10's plate
   at 18 px, so the settings switch is the same object as a lift sign's plate
   and not a borrowed OS control. No switch component is introduced — this is
   the plate, the track and the ON/OFF word, and the knobs keep their full
   verbatim blurbs above (settings.js:38-52, untouched). */
.lk__sw { display: inline-flex; align-items: center; gap: 10px; }
.lk__sw-t {
  position: relative; width: 34px; height: 18px; border-radius: var(--p-r); flex: none;
  background: var(--p-cream);
  box-shadow: inset 0 0 0 1px var(--p-ink);
}
.lk__sw-t::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
  border-radius: 0; background: #8f887a;
}
.lk__sw-v {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: var(--lk-ink-3);
  width: 3ch;
}
.lk__sw.is-on .lk__sw-t::after { background: var(--p-ink); transform: translateX(16px); }
.lk__sw.is-on .lk__sw-v { color: var(--lk-sig); }

/* ---- specs/0068: the KEYS rows.
   A SIBLING OF THE ROWS ABOVE, not a new surface (D19): the board, the
   hairline, the wash, the ink selection spine and the 15 px oblique label are
   \`.lk__row\`'s, and the only thing this block adds is the CHIP. The chip is
   §1.10's plate at row size with the key's name on it — the same object the ESC
   board, the intro card and the bottom strip print a key on — so the settings
   page reads as one page whichever of its two tabs you are on.
   NOTHING HERE IS TRANSITIONED, for the .lk__sw reason exactly: a chip that is
   still showing the old key for a frame after a swap is a control lying about
   its state, and the swap is the one moment this screen must not lie. */
.lk__kchip {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  padding: 5px 9px; border-radius: var(--p-r);
  background: var(--p-ink); color: var(--p-cream);
  min-width: 76px; text-align: center; white-space: nowrap;
  transition: none;
}
/* "PRESS A KEY" — the active colour is the tab's own accent, and the plate
   inverts so the row that is listening is the one thing on the board wearing a
   colour. It says the words rather than blinking: a chip that blinks is a chip
   you have to watch, and this one has to be read. */
.lk__kchip.is-live { background: var(--lk-acc); color: var(--p-ink); }
/* a binding the player moved — the accent as a 2 px underscore on the plate,
   the same "this one is yours" spine the equipped trail row wears */
.lk__krow.is-rebound .lk__kchip { box-shadow: inset 0 -2px 0 var(--lk-acc); }
/* the foot row is an ACTION, not a binding, so its plate is drawn rather than
   filled — it must not read as a key you could press */
.lk__krow.is-rst .lk__kchip {
  background: none; color: var(--p-ink); box-shadow: inset 0 0 0 1px var(--p-ink);
}

/* W1 TOOK THE HAND-OFF (specs/0055 1.1). W4 typed the cream, the ink and the
   seam here because the :root block did not exist yet; it does, so the two
   blocks below read --p-cream / --p-ink / --p-seam and this file names no
   colour of its own. hud.js's sheet is injected at import time, which is before
   this stylesheet paints anything, so there is no first-frame gap.

   ---- specs/0055 5.2: THE TRAIL QUICK-TRAVEL TAB.
   The lookbook's trail selector — and as of Greg's 2026-09-06 pick it is no
   longer the one board in a dark screen: it is the register the WHOLE locker
   now wears. So this block keeps only what is particular to a trail row (the
   four-column rhythm, the severity mark, the slug) and inherits the board, the
   hairline, the wash and the ink selection from \`.lk__row\` above. */
.lk__grid.is-trails { gap: 0; background: none; padding: 2px 10px 10px 0; border-radius: 0; }
.lk__trow {
  display: grid; align-items: center;
  grid-template-columns: 22px minmax(0, 1fr) 74px 132px;
  gap: 0 12px;
  /* P5 — 12 px of padding on a 20 px row is a 44 px tap target, and the 9 px
     W4 shipped was 38. Every row on this screen clears 44 now. */
  padding: 12px 8px; margin: 0;
  text-align: left; cursor: pointer;
}
.lk__trow.is-go { animation: none; }
.lk__trow-n {
  display: block; font-family: var(--lk-sans); font-size: 15px;
  font-weight: var(--p-weight); font-style: var(--p-oblique);
  letter-spacing: .04em; text-transform: uppercase; color: var(--p-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lk__trow-a, .lk__trow-k, .lk__trow-s {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: var(--lk-ink-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lk__trow-a { display: block; margin-top: 2px; color: #a49c8d; }
.lk__trow-k { color: var(--p-sub); }
.lk__trow-s { text-align: right; }

/* ---- specs/0061 §1.3: the row's one state.
   specs/0061 (one click, 2026-09-06) — AND THE GO PLATE IS GONE WITH ITS CELL.
   The plate carried the fast travel the row body had given up; the body equips
   AND travels again, so the fifth column and the ink rectangle in it went back
   where they came from and the row is the four-column rhythm W4 shipped.
   The EQUIPPED row keeps the mounting rule as a left spine — the same 3 px inset
   the selected row already wears, in the tab's accent instead of ink, so
   "selected" and "equipped" read apart. No new surface: cream board, nothing
   else.
   GATE-0055 CLOSEOUT, 2026-09-06 (row 8(d)) — the ground here was a raw hex
   literal (specs/0055 §5.2 names it), which under D19 reads as a third surface
   however close to the wash it sat. It is \`--lk-wash\` now — the locker's own
   ground for a row that is ON: the token \`.lk__row:hover\`, \`.lk__row.is-sel\`
   and \`.lk__card.is-eq\` already use, ink at 7 % over \`--p-cream\`, resolving to
   \`#e5e2db\`. The literal was within four levels on one channel, so the row does
   not change colour. The state is still told apart the way this block always
   told it — EQUIPPED keeps the accent spine where a selected row wears the ink
   one, plus the \`· equipped\` caption below — so nothing is carried by a colour
   that can drift off §1.6's two surfaces. */
.lk__trow.is-eqt { background: var(--lk-wash); box-shadow: inset 3px 0 0 var(--lk-acc); }
.lk__trow.is-eqt.is-sel { box-shadow: inset 3px 0 0 var(--lk-acc); }
.lk__trow.is-eqt .lk__trow-n::after {
  content: "· equipped"; margin-left: 8px;
  font-family: var(--lk-mono); font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; color: #8f887a;
}

/* ---- specs/0069 §3.3 / 0061 §3.1: the map board. It sits in the hero's slot,
   which the trail tab already leaves empty (0055 §5.2), so no slab is added
   (D19): this is the cream surface the rows are already on, under §1.10's 2 px
   mounting rule. The canvas fills it and paints itself.

   specs/0069 §3.2 — the CURSOR is the one thing about the board that changed
   with the sheet. 0061's \`crosshair\` said "pick a line"; nothing on this board
   is picked, and everything on it is dragged. \`touch-action: none\` is what
   makes the pinch work: without it the browser takes the two-finger gesture for
   a page zoom before pointermove ever fires. */
.lk__map {
  position: relative; height: clamp(190px, 26vh, 330px);
  background: var(--p-cream);
  border: 0; border-bottom: var(--p-rule, 2px) solid var(--p-ink);
  border-radius: 2px 2px 0 0;
  overflow: hidden; cursor: grab;
  touch-action: none;
  -webkit-user-select: none; user-select: none;
}
.lk__map.is-drag { cursor: grabbing; }
/* THREE CLASSES, for the reason \`.lk__canvas\` above needs them: play.css's
   \`body.play canvas { position: fixed; left: 0; top: 0 }\` is (0,1,2) and
   outranks any two-part selector, so an unqualified rule here leaves the map
   pinned to the viewport at full screen size, painting cream over the whole
   locker. */
.lk .lk__map .lk__mapcv {
  position: absolute; inset: 0; display: block; width: 100%; height: 100%;
}
/* specs/0061 §1.6 — the section seam. Mono caps on the cream board over the
   3 px blade spine (§1.10), which is the rule the trail blades already use for
   "a heading, not a row". No surface of its own. */
.lk__tsec {
  font-family: var(--lk-mono); font-size: 8.5px; font-weight: 700;
  letter-spacing: .2em; text-transform: uppercase; color: #8f887a;
  padding: 12px 8px 5px; margin: 0;
  border-bottom: 1px solid var(--p-ink);
}
.lk__grid.is-trails > .lk__tsec:first-child { padding-top: 2px; }
/* specs/0069 §3.3 — the stamp keeps 0061's type and gains the CREAM PLATE it
   now needs: 0061's board was cream, so muted ink on it was the register; the
   sheet's own sky is behind it here, and mono caps at 8 px over a photograph
   are not a caption, they are noise. The plate is \`--p-cream\`, which is one of
   §1.6's two surfaces and not a third (D19), and the sheet under it is still
   unmodified — nothing is drawn ON the picture, this sits over it. */
.lk__map-t {
  position: absolute; left: 6px; top: 6px;
  font-family: var(--lk-mono); font-size: 8px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase; color: #8f887a;
  background: var(--p-cream); padding: 3px 6px 2px;
  border-bottom: 1px solid var(--p-ink);
  pointer-events: none;
}

/* 1.8's severity alphabet, one CSS class per shape. Colours are the ones the
   world already uses: green circle, blue square, black diamond, double. */
.lk__mark { display: block; width: 13px; height: 13px; justify-self: center; }
.lk__mark.is-circ { border-radius: 50%; background: var(--p-diff-green); }
.lk__mark.is-sq { background: var(--p-diff-blue); }
.lk__mark.is-dia { background: var(--p-ink); transform: rotate(45deg); width: 11px; height: 11px; }
/* a double diamond is TWO diamonds, so it is two rotated boxes on one element
   rather than a clipped bar — the same shape the atlas draws, at row size */
.lk__mark.is-dia2 { width: 22px; height: 11px; background: none; position: relative; transform: none; }
.lk__mark.is-dia2::before,
.lk__mark.is-dia2::after {
  content: ""; position: absolute; top: 1px; width: 9px; height: 9px;
  background: var(--p-ink); transform: rotate(45deg);
}
.lk__mark.is-dia2::before { left: 0; }
.lk__mark.is-dia2::after { right: 0; }
/* an unrated place gets an empty cell, not a neutral glyph (1.8) */

/* ---- right: the detail panel */
.lk__det {
  grid-area: det; min-height: 0;
  display: grid; grid-template-rows: auto auto auto auto minmax(0, 1fr); gap: 10px;
  padding: 0 0 0 14px;
  border: 0; border-left: var(--p-hairline) solid var(--lk-line); border-radius: 0;
  background: none;
  overflow: hidden;
}
/* THE ITEM PREVIEW, BLOWN UP (constraint 2, second surface). The deck's hero is
   the same ink board the cards' art is, at 2 px radius under a mounting rule in
   the item's kind colour — so the thing you are about to equip is the largest
   picture on the screen after the rider. */
.lk__hero {
  /* the art grows into whatever height the deck has spare — 132 px at 720p,
     ~190 px at 1080p — instead of leaving the panel's foot empty */
  position: relative; height: clamp(132px, 18vh, 216px);
  border-radius: var(--p-r); overflow: hidden;
  display: grid; place-items: center;
  background: var(--lk-plate);
  border: 0; border-bottom: var(--p-rule) solid var(--g, var(--lk-acc));
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
  padding: 3px 6px; border-radius: 0;
  background: var(--p-ink); color: var(--lk-sig);
}
.lk__d-head { display: grid; gap: 2px; }
.lk__d-brand {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .2em; text-transform: uppercase; color: var(--lk-ink-2);
}
.lk__d-name {
  font-family: var(--lk-sans); font-size: 24px; font-weight: var(--p-weight);
  font-style: var(--p-oblique); text-transform: uppercase;
  letter-spacing: .06em; line-height: 1.12; color: var(--lk-ink);
}
.lk__d-spec {
  font-family: var(--lk-mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase; color: var(--lk-ink-2);
}
/* §1.2 — the blurb is the one run of roman prose on this screen */
.lk__d-blurb {
  font-family: var(--lk-sans); font-size: 12.5px; font-style: normal; letter-spacing: 0;
  line-height: 1.45; color: var(--lk-ink);
  display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
}

/* ---- stat bars, with the delta against what is equipped */
.lk__stats { display: grid; gap: 6px; align-content: start; overflow-y: auto; padding-right: 4px; min-height: 0; }
.lk__stats::-webkit-scrollbar { width: 7px; }
.lk__stats::-webkit-scrollbar-thumb { background: var(--lk-line-2); border-radius: 0; }
.lk__stat { display: grid; grid-template-columns: 68px minmax(0, 1fr) 30px 34px; align-items: center; gap: 8px; }
.lk__stat-k {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: var(--lk-ink-2);
}
/* §1.10 — ONE 2 px gauge serves every bar in the game, and a stat bar is one
   of them: the seam is the track, ink is the fill, and the delta keeps the
   severity alphabet's green and red. No pill, no glow, no gradient. */
.lk__stat-t {
  position: relative; height: 4px; border-radius: 0; overflow: hidden;
  background: var(--lk-line); box-shadow: none;
}
.lk__stat-t i, .lk__stat-t u {
  position: absolute; top: 0; bottom: 0; display: block;
  transition: left .18s ease-out, width .18s ease-out, background .2s;
}
/* the bar itself stops at the SHARED value; the delta segment carries the sign */
.lk__stat-t i { left: 0; width: 0; background: var(--p-ink); }
.lk__stat-t u { width: 0; text-decoration: none; }
.lk__stat-t u.is-up { background: var(--lk-good); box-shadow: none; }
.lk__stat-t u.is-down {
  background: repeating-linear-gradient(-45deg, var(--lk-bad) 0 3px, transparent 3px 6px);
}
.lk__stat-v {
  font-family: var(--lk-mono); font-size: 10px; font-weight: 700;
  font-variant-numeric: tabular-nums;
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
.lk__cmp::before { content: ""; flex: 1 1 auto; height: var(--p-hairline); background: var(--lk-line); }

.lk__facts {
  display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px;
  align-content: start; overflow-y: auto; padding-right: 4px; min-height: 0;
  border-top: var(--p-hairline) solid var(--lk-line); padding-top: 9px;
}
.lk__facts::-webkit-scrollbar { width: 7px; }
.lk__facts::-webkit-scrollbar-thumb { background: var(--lk-line-2); border-radius: 0; }
.lk__fact { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.lk__fact .k {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; color: var(--lk-ink-3);
}
.lk__fact .v {
  font-family: var(--lk-mono); font-size: 10px; font-weight: 700;
  color: var(--lk-ink); font-variant-numeric: tabular-nums;
}

/* ---------------------------------------------------------------- hint bar */
.lk__foot {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 9px 14px; border-top: var(--p-hairline) solid var(--lk-line);
  background: none;
}
.lk__hint { display: inline-flex; align-items: center; gap: 7px; }
.lk__hint span {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700; letter-spacing: .16em;
  text-transform: uppercase; color: var(--lk-ink-2);
}
/* the lookbook's \`.cap--inv\`: an outlined ink key cap, 2 px radius, no bevel */
.lk__key {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 18px; padding: 0 5px;
  border: var(--p-hairline) solid var(--p-ink); border-radius: var(--p-r);
  background: none;
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .04em; color: var(--lk-ink);
}
.lk__foot-sp { flex: 1 1 auto; }

/* ------------------------------------------------------------ narrow decks */
@media (max-width: 1180px) {
  .lk__main {
    grid-template-columns: 260px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 250px);
    grid-template-areas: "pv grid" "det det";
  }
  /* the deck moves under the grid, so its hairline turns with it */
  .lk__det {
    border-left: 0; border-top: var(--p-hairline) solid var(--lk-line);
    padding: 12px 0 0;
  }
  .lk__mid { padding: 0 0 0 14px; }
  .lk__hero { height: 96px; }
  .lk__det { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas: "hero head" "hero blurb" "stats facts"; column-gap: 14px; }
  .lk__hero { grid-area: hero; height: 100%; }
  /* specs/0061 §3.1 — the map takes the hero's cell here too, because on this
     tab the hero is the thing that is hidden */
  .lk__map { grid-area: hero; height: 100%; }
  .lk__d-head { grid-area: head; align-self: end; }
  .lk__d-blurb { grid-area: blurb; -webkit-line-clamp: 3; }
  .lk__stats { grid-area: stats; }
  .lk__facts { grid-area: facts; }
}
@media (max-width: 860px) {
  .lk__main { grid-template-columns: minmax(0, 1fr); grid-template-areas: "pv" "grid" "det"; grid-template-rows: 190px minmax(0,1fr) 220px; }
  .lk__load { display: none; }
  /* one column: every hairline is a horizontal one */
  .lk__pv { border-right: 0; padding-right: 0; padding-bottom: 12px;
    border-bottom: var(--p-hairline) solid var(--lk-line); }
  .lk__mid { padding: 12px 0 0; }
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
`;let Un=!1;function Ui(){if(Un||typeof document>"u")return;Un=!0;const t=document.createElement("style");t.id="lk-css",t.textContent=ji,document.head.appendChild(t)}let It=null,Ot="y",Pt=null;const Wn=()=>{if(Pt)return Pt;let t=null;try{t=window.__guide||null}catch{t=null}return!t||!t.layTrail?null:{lay:(o,p)=>t.layTrail(o,p||{}),clear:()=>t.clearTrail(),state:()=>t.trailState()}},Xe=()=>{const t=Wn();return t?t.state():null};function ao({THREE:t,model:o,unitScale:p,ctrl:u,onEquip:g,initial:h,world:r,upAxis:E,trail:y}){Ui(),r&&(It=r,Ot=E==="z"?"z":"y"),y&&(Pt=y);const S=p||1;let T=!1,c=0,k="all",v="looks",b=0,m=[],j="",q=new Map,K=null;try{K=new URLSearchParams(location.search)}catch{K=null}const F={skis:h&&h.skis||wa,glider:h&&h.glider||va,bike:h&&h.bike||Sa,sled:h&&h.sled||(K?qa(K):Pa),snowmobile:h&&h.snowmobile||(K?Ua(K):Da),boots:hi("boots")||"boots",outfit:h&&h.outfit||Za()},N=s("div","lk");N.hidden=!0;const Ct=s("section","lk__panel"),Rt=s("div","lk__hd"),qt=s("div","lk__title");qt.innerHTML="equipment <b>locker</b>";const Ft=s("div","lk__load"),Le={};for(const e of R){if(e.id==="boots"||e.kind==="settings"||e.kind==="trail"||e.kind==="keys")continue;const n=s("div","lk__load-i"),a=s("span","lk__load-v","—");n.append(s("span","lk__load-k",e.label),a),Ft.append(n),Le[e.id]=a}Rt.append(qt,s("span","lk__spacer"),Ft);const Nt=s("div","lk__tabs"),Je=R.map((e,n)=>{const a=s("button","lk__tab");a.type="button",a.style.setProperty("--lk-tab-acc",e.accent||"#4cc9f0");const i=s("span","lk__tab-ic");i.innerHTML=gi(e.icon);const d=s("span","lk__tab-n","0");return a.append(i.firstChild,s("span","lk__tab-l",e.label),d),a.addEventListener("click",f=>{f.stopPropagation(),he(n)}),Nt.append(a),{b:a,n:d}}),zt=s("div","lk__main"),Dt=s("div","lk__pv"),me=s("div","lk__stage"),be=s("div","lk__eqflash");me.append(be);const Bt=s("div","lk__plate"),jt=s("div","lk__plate-brand",""),Ut=s("div","lk__plate-name","—"),Wt=s("div","lk__plate-tag","");Bt.append(jt,Ut,Wt),Dt.append(me,Bt);const Kt=s("div","lk__mid"),oe=s("div","lk__subs");oe.hidden=!0;const Ie=s("div","lk__filters"),re=s("div","lk__tsearch"),A=s("input","lk__tsearch-i");A.type="text",A.placeholder="search runs",A.spellcheck=!1,A.autocomplete="off",A.autocapitalize="off",A.setAttribute("aria-label","search runs");const Ht=s("span","lk__tsearch-n","");re.append(s("span","lk__tsearch-ic","/"),A,Ht),re.hidden=!0;const Gt=s("div","lk__bars");Gt.append(oe,Ie,re);const U=s("div","lk__grid");Kt.append(Gt,U);const se=s("div","lk__det"),le=s("div","lk__hero"),we=s("div","lk__hero-bg"),X=s("img","lk__hero-img");X.alt="";const de=s("div","lk__hero-eq","equipped");de.hidden=!0,le.append(we,X,de);const I=s("div","lk__map"),W=s("canvas","lk__mapcv");W.setAttribute("data-map","trails");const et=s("div","lk__map-t","palisades · winter 2025-26");I.append(W,et),I.hidden=!0;let P=null,M=null,tt=0,nt=0,at=null;const Vt=s("div","lk__d-head"),_e=s("div","lk__d-brand",""),it=s("div","lk__d-after",""),ve=s("div","lk__d-name","—"),ce=s("div","lk__d-spec","");Vt.append(_e,it,ve,ce);const pe=s("div","lk__d-blurb",""),J=s("div","lk__stats"),Yt=s("div","lk__cmp"),V=s("div","lk__facts");se.append(le,I,Vt,pe,J,V);function ee(){if(!T||x().kind!=="trail"||I.hidden)return null;const e=W.clientWidth||I.clientWidth||300,n=Math.round(Math.max(140,Math.min(330,e*(ke/fe))));Math.abs(I.clientHeight-n)>4&&(I.style.height=n+"px");const a=Math.max(60,Math.round(W.clientWidth||e)),i=Math.max(60,Math.round(W.clientHeight||n));return(!M||a!==tt||i!==nt)&&(M=Bi(a,i),tt=a,nt=i),Qe(M,a,i),P=$e(W,M),!at&&P&&(at=P),!Me&&!Ae?Di().then(()=>{et.textContent=Ae?"sheet unavailable":"palisades · winter 2025-26",T&&x().kind==="trail"&&!I.hidden&&ee()}):Ae&&(et.textContent="sheet unavailable"),P}const G=new Map;let ye=0;const ot=e=>{const n=W.getBoundingClientRect();return{x:e.clientX-n.left,y:e.clientY-n.top}};function rt(e,n,a){if(!M)return;const i=P?P.w:W.clientWidth,d=P?P.h:W.clientHeight,f=M.scale,w=Math.max(ge(i,d),Math.min(ge(i,d)*Bn,f*a));w!==f&&(M.ox=e-(e-M.ox)*(w/f),M.oy=n-(n-M.oy)*(w/f),M.scale=w,Qe(M,i,d),P=$e(W,M))}I.addEventListener("wheel",e=>{if(I.hidden||!M)return;e.preventDefault();const n=ot(e);rt(n.x,n.y,Math.exp(-e.deltaY*.0022))},{passive:!1}),I.addEventListener("pointerdown",e=>{if(!I.hidden){if(G.set(e.pointerId,ot(e)),G.size===2){const[n,a]=[...G.values()];ye=Math.hypot(n.x-a.x,n.y-a.y)||0}try{I.setPointerCapture(e.pointerId)}catch{}I.classList.add("is-drag")}}),I.addEventListener("pointermove",e=>{const n=G.get(e.pointerId);if(!n||!M)return;const a=ot(e);G.set(e.pointerId,a);const i=P?P.w:W.clientWidth,d=P?P.h:W.clientHeight;if(G.size>=2){const[f,w]=[...G.values()],_=Math.hypot(f.x-w.x,f.y-w.y);ye>4&&_>4&&rt((f.x+w.x)/2,(f.y+w.y)/2,_/ye),ye=_;return}M.ox+=a.x-n.x,M.oy+=a.y-n.y,Qe(M,i,d),P=$e(W,M)});const Zt=e=>{G.delete(e.pointerId),G.size<2&&(ye=0),G.size||I.classList.remove("is-drag");try{I.releasePointerCapture(e.pointerId)}catch{}};I.addEventListener("pointerup",Zt),I.addEventListener("pointercancel",Zt),I.addEventListener("dblclick",e=>{I.hidden||(e.preventDefault(),M=null,ee())}),zt.append(Dt,Kt,se);const xe=s("div","lk__foot"),Kn=[[["←","→","↑","↓"],"navigate"],[["enter"],"equip"],[["q","e"],"tabs"],[["f"],"filter"],[["1-9"],"quick equip"]];for(const[e,n]of Kn){const a=s("span","lk__hint");for(const i of e)a.append(s("kbd","lk__key",i));a.append(s("span",null,n)),xe.append(a)}const Se=s("span","lk__hint");Se.append(s("kbd","lk__key","t"),s("span",null,"go there")),Se.hidden=!0,xe.append(Se),xe.append(s("span","lk__foot-sp"));const Qt=s("span","lk__hint");Qt.append(s("kbd","lk__key","esc"),s("span",null,"close")),xe.append(Qt),Ct.append(Rt,Nt,zt,xe),N.append(Ct),document.body.appendChild(N);let l=null;function Hn(){const e=new t.Scene;e.add(new t.HemisphereLight(16777215,3816004,1.35));const n=new t.DirectionalLight(16777215,1.05);n.position.set(3,5,4);const a=new t.DirectionalLight(16767432,.5);a.position.set(-4,2,-3),e.add(n,a);const i=new t.Group;e.add(i);const d=o?o.clone(!0):new t.Group,f=o&&o.getObjectByName("play:body"),w=f?Xa(f):null,_=w?$a(w):null;if(_){const L=d.getObjectByName("play:body");L&&L.parent?(L.parent.add(_.model),L.parent.remove(L)):d.add(_.model),_.skeleton.pose(),_.model.updateMatrixWorld(!0)}d.position.set(0,0,0),d.rotation.set(0,0,0);const C=[];d.traverse(L=>{const cn=Va(L.name||"")!=null&&o.getObjectByName(L.name);cn?C.push([L,cn]):L.visible=!0});const H=new Set;_&&_.model.traverse(L=>{L.isMesh&&/^rider:/.test(L.name||"")&&L.material&&H.add(L.material)});const B=_?new Map([..._.riderMats].filter(([,L])=>H.has(L))):new Map,ft=_?_.riderToggles:[],ae=/^play:(?:fp-|tp-)|^play:ski-[lr]$|^play:rocket-pack$/;d.traverse(L=>{L.name&&ae.test(L.name)&&(L.visible=!1)});const De=d.getObjectByName("play:tp-glider"),ie=d.getObjectByName("play:body"),ua=d.getObjectByName("play:rocket-pack"),kt=ie?ie.getObjectByName("rider:body"):null,fa=kt?new t.AnimationMixer(kt):null,dn=new Map;for(const L of ie&&ie.animations||[])dn.set(L.name,L);i.add(d);const gt=pn(t,S),mt=pn(t,S);gt.position.set(-.15*S,.02*S,0),mt.position.set(.15*S,.02*S,0),i.add(gt,mt);const bt=Ma(t,S);bt.visible=!1,i.add(bt);const wt=Fa(t,S);wt.visible=!1,i.add(wt);const _t=Wa(t,S,{model:F.snowmobile});_t.visible=!1,i.add(_t);const ka=new t.PerspectiveCamera(34,1,.05*S,80*S),Be=new t.WebGLRenderer({alpha:!0,antialias:!0});Be.setPixelRatio(Math.min(2,window.devicePixelRatio||1)),Be.domElement.className="lk__canvas",me.insertBefore(Be.domElement,be),l={scene:e,camera:ka,renderer:Be,turntable:i,skiL:gt,skiR:mt,bike:bt,sled:wt,snow:_t,cGlide:De,cBody:ie,cPack:ua,cSkin:kt,mixer:fa,clips:dn,clip:null,want:null,riderPairs:C,riderMats:B,riderToggles:ft,tryOn:null,t:0,kick:0},Oe()}function Oe(){if(!l)return;const e=Math.max(80,me.clientWidth),n=Math.max(80,me.clientHeight),a=Math.max(80,Math.min(n,Math.round(e*4/3)));l.renderer.setSize(e,a,!1),l.renderer.domElement.style.height=a+"px",l.renderer.domElement.style.top=Math.round((n-a)/2)+"px",l.camera.aspect=e/a,l.camera.updateProjectionMatrix()}function Gn(e){if(!l||!l.mixer||l.want===e)return;l.want=e;const n=l.clips.get(e)||l.clips.get("idle-boots")||l.clips.get("ski-stance");if(!n||l.clip===n.name)return;l.mixer.stopAllAction();const a=l.mixer.clipAction(n);a.reset(),a.enabled=!0,a.setEffectiveWeight(1),a.play(),l.clip=n.name,l.mixer.setTime(0)}function Vn(e,n){if(!l)return;const a=e.kind==="outfit",i=e.kind==="ski"||a,d=e.kind==="glider"&&n?n.preview:null,f=d==="wing",w=e.kind==="bike",_=e.kind==="sled",C=e.kind==="snowmobile",H=w||_||C;if(l.skiL.visible=l.skiR.visible=i,l.cGlide&&(l.cGlide.visible=f),l.cBody&&(l.cBody.visible=!0),l.cPack&&(l.cPack.visible=d==="pack"),Gn(w?"seat-bike":_?"seat-sled":C?"seat-snowmobile":f?"prone-glider":"idle-boots"),l.cBody&&(l.cBody.position.set(0,f?1.05*S:0,0),l.cBody.rotation.x=l.cBody.rotation.y=l.cBody.rotation.z=0,w&&n)){const B=Ia(La(n.id));l.cBody.position.y+=(B.hip[0]-1.053)*S,l.cBody.position.z+=(B.hip[1]-.305)*S}if(l.bike.visible=w,l.sled.visible=_,l.snow.visible=C,w&&n&&Aa(t,l.bike,n.id),_&&n&&Na(t,l.sled,n.id),C&&n&&Ka(t,l.snow,n.id),i&&n){const B=a?F.skis:n.id;hn(t,l.skiL,B),hn(t,l.skiR,B)}if(a&&n){const B=v==="looks"?n.id:Zn(n.id);je(t,l,B),l.tryOn=B}else l.tryOn!=null&&(je(t,l,window.__player?.outfit),l.tryOn=null)}const Yn=.28;let Pe=0,st=0;function $t(e){if(!T){Pe=0;return}Pe=requestAnimationFrame($t);const n=Math.min(.05,(e-st)/1e3||0);if(st=e,!l)return;l.hold==null&&(l.t+=n),l.turntable.rotation.y=l.hold==null?l.turntable.rotation.y+n*(Yn+l.kick):l.hold,l.mixer&&(l.hold==null?l.mixer.update(n):l.mixer.setTime(0)),l.kick*=Math.exp(-n*3.4),l.kick<.001&&(l.kick=0);const a=Math.tan(l.camera.fov*Math.PI/180/2),i=Math.max(1.12/a,1.3/(a*Math.max(.25,l.camera.aspect)))*S;if(l.camera.position.set(0,(1.3+.012*Math.sin(l.t*.7))*S,i),l.camera.lookAt(0,.86*S,0),l.tryOn==null)for(const[d,f]of l.riderPairs)d.visible=f.visible;l.renderer.render(l.scene,l.camera)}const x=()=>R[c],Y=new Set;function Q(e){try{const n=e.items(e.kind==="outfit"?v:void 0);if(Array.isArray(n))return Y.delete(e.id),n}catch(n){Y.has(e.id)||console.warn(`[locker] rack "${e.id}" unavailable:`,n&&n.message)}return Y.add(e.id),[]}function Xt(e){const n=[];for(const a of e)a.group&&!n.includes(a.group)&&n.push(a.group);return n}function Ce(){const e=x();if(e.kind!=="outfit")return F[e.id];const n=yt(F.outfit);return v==="looks"?n.every(a=>a===n[0])?n[0]:null:n[Ue.indexOf(v)]}const Zn=e=>Qa(yt(F.outfit).map((n,a)=>a===Ue.indexOf(v)?e:n));function Qn(){const e=x().kind==="outfit";if(oe.hidden=!e,!!e){oe.textContent="",oe.append(s("kbd","lk__key","g"));for(const n of Te){const a=s("button","lk__chip");a.type="button",a.style.setProperty("--g",x().accent||"#4cc9f0"),a.append(document.createTextNode(n)),a.classList.toggle("is-on",v===n),a.addEventListener("click",i=>{i.stopPropagation(),lt(n)}),oe.append(a)}}}function lt(e){return Te.includes(e)&&e!==v&&(v=e,b=0,Ee()),v}function $n(){const e=x().accent||"#4cc9f0";N.style.setProperty("--lk-acc",e),N.style.setProperty("--lk-acc-soft",He(e,.18)),N.style.setProperty("--lk-acc-dim",He(e,.34))}function Xn(){R.forEach((e,n)=>{Je[n].n.textContent=String(Q(e).length),Je[n].b.hidden=Y.has(e.id)})}function dt(){for(const e of R){if(!Le[e.id])continue;const n=Q(e).find(a=>a.id===F[e.id]);Le[e.id].parentElement.hidden=Y.has(e.id),Le[e.id].textContent=e.kind==="outfit"?Jn():n?n.name:"—"}}function Jn(){const e=[...new Set(yt(F.outfit))];if(e.length>1)return"mix · "+e.length+" houses";const n=Ga[e[0]];return n?Ve(n)+" · "+n.name:"—"}function ea(){const e=Q(x()),n=Xt(e);if(Ie.textContent="",Ie.hidden=n.length<2,n.length<2)return;const a={all:e.length};for(const i of n)a[i]=e.filter(d=>d.group===i).length;for(const i of["all",...n]){const d=s("button","lk__chip");d.type="button",d.style.setProperty("--g",i==="all"?x().accent||"#4cc9f0":Tt(i)),d.append(document.createTextNode(i),s("i",null,String(a[i]))),d.classList.toggle("is-on",k===i),d.addEventListener("click",f=>{f.stopPropagation(),k=i,b=0,Ee()}),Ie.append(d)}}const Jt=new WeakMap;function en(e,n){const a=Jt.get(e);if(!a)return;const i=We(n);a.el.classList.toggle("is-on",i),a.v.textContent=i?"on":"off",e.setAttribute("aria-checked",i?"true":"false")}function ta(e,n){const a=s("button","lk__row");a.type="button",a.setAttribute("role","switch");const i=s("span","lk__row-txt");i.append(s("span","lk__row-t",e.name),s("span","lk__row-d",e.desc||""));const d=s("span","lk__sw"),f=s("span","lk__sw-v","off");return d.append(s("span","lk__sw-t"),f),Jt.set(a,{el:d,v:f}),a.append(i,d),en(a,e.key),a.addEventListener("click",w=>{w.stopPropagation(),b=n,O(),te()}),a.addEventListener("mouseenter",()=>{b=n,O()}),U.append(a),a}function Re(e){let n=null;try{n=window.__playMarkers&&window.__playMarkers.fastTravel(e.slug)}catch{n=null}if(!n&&e.at&&window.__player&&typeof window.__player.teleport=="function")try{window.__player.teleport(e.at.x,e.at.y,e.at.z),n=!0}catch{n=null}return ue(),!!n}function na(e){if(!e)return null;if(!e.canEquip)return Re(e);const n=Wn();if(!n)return Re(e);const a=n.lay(e.segments&&e.segments.length>1?e.segments:e.id,{name:e.name});if(Ne(),Re(e),a&&a.start&&Number.isFinite(a.start.yaw))try{window.__player.setYaw(a.start.yaw)}catch{}return a}let ct=!1;U.addEventListener("pointermove",()=>{ct=!0},{passive:!0});function aa(e){const n=String(e.name||""),a=q.get(e);if(!a||!a.length)return s("span","lk__trow-n",n);const i=s("span","lk__trow-n"),d=new Set(a);let f="",w=d.has(0);for(let _=0;_<=n.length;_++){const C=_<n.length&&d.has(_);(_===n.length||C!==w)&&(f&&i.append(w?s("i","lk__hl",f):document.createTextNode(f)),f="",w=C),_<n.length&&(f+=n[_])}return i}function ia(e,n){const a=!!j.trim(),i=m[n-1];!a&&(!i||i.section!==e.section)&&U.append(s("div","lk__tsec",e.section==="places"?"places · fast travel":"runs · equip a trail"));const d=s("button","lk__row lk__trow");d.type="button",d.setAttribute("data-slug",e.slug),d.setAttribute("data-id",e.id),d.setAttribute("data-sec",e.section||"runs");const f=Lt[e.diff]||null,w=s("span","lk__mark"+(f?" "+f.cls:""));f&&w.setAttribute("aria-label",f.label);const _=s("span","lk__row-txt");_.append(aa(e)),e.also&&_.append(s("span","lk__trow-a",e.also)),d.append(w,_,s("span","lk__trow-k",e.kind||""),s("span","lk__trow-s",e.slug));const C=Xe();return C&&C.id===e.id&&d.classList.add("is-eqt"),d.addEventListener("click",H=>{H.stopPropagation(),b=n,O(),te()}),d.addEventListener("mouseenter",()=>{ct&&(b=n,O())}),U.append(d),d}let z=null,qe=!1;const tn=new WeakMap,oa=new Set(["Escape","Tab","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"]);function nn(e,n){const a=tn.get(e);if(!a||!n)return;if(n.isReset){a.textContent="RESET";return}const i=z===n.action;a.textContent=i?"PRESS A KEY":Ke(n.action),a.classList.toggle("is-live",i),e.classList.toggle("is-rebound",!i&&!St(n.action))}function Fe(){x().kind==="keys"&&D.forEach((e,n)=>nn(e,m[n]))}function an(){z!==null&&(z=null,Fe(),O())}function on(e){const n=z;z=null,n&&ii(n,e),Fe(),O()}function ra(e){if(z!==null){if(e.preventDefault(),e.stopPropagation(),e.type!=="pointerdown")return;qe=!0;const n=ai(e.button);n?on(n):an();return}if(e.type==="pointerdown"){qe=!1;return}qe&&(e.preventDefault(),e.stopPropagation(),e.type==="click"&&(qe=!1))}for(const e of["pointerdown","pointerup","click","contextmenu"])N.addEventListener(e,ra,!0);function sa(e,n){const a=s("button","lk__row lk__krow"+(e.isReset?" is-rst":""));a.type="button",a.setAttribute("data-action",e.action||"reset");const i=s("span","lk__row-txt");i.append(s("span","lk__row-t",e.name));const d=s("span","lk__kchip");return a.append(i,d),tn.set(a,d),nn(a,e),a.addEventListener("click",f=>{f.stopPropagation(),b=n,O(),te()}),a.addEventListener("mouseenter",()=>{z===null&&(b=n,O())}),U.append(a),a}let D=[],pt=[];function Ne(){const e=x(),n=Q(e);pt=bi(n),m=k==="all"?n:n.filter(i=>i.group===k),m.length||(m=n),q=new Map,ct=!1;const a=m.length;if(e.kind==="trail"&&j.trim()){const i=[];for(const d of m){const f=Ni(d,j.trim());f&&i.push({it:d,m:f})}i.sort((d,f)=>f.m.score-d.m.score||String(d.it.name).length-String(f.it.name).length||String(d.it.name).localeCompare(String(f.it.name))),m=i.map(d=>(q.set(d.it,d.m.pos),d.it))}if(Ht.textContent=e.kind==="trail"&&j.trim()?`${m.length}/${a}`:"",b=Math.max(0,Math.min(b,m.length-1)),U.textContent="",U.classList.toggle("is-rows",e.kind==="settings"||e.kind==="trail"||e.kind==="keys"),U.classList.toggle("is-trails",e.kind==="trail"),e.kind==="settings"){D=m.map(ta),O();return}if(e.kind==="trail"){D=m.map(ia),O();return}if(e.kind==="keys"){D=m.map(sa),O();return}D=m.map((i,d)=>{const f=Tt(i.group),w=s("button","lk__card");w.type="button",w.style.setProperty("--g",f),w.style.setProperty("--g-wash",He(f,.16)),w.style.setProperty("--g-glow",He(f,.55));const _=s("span","lk__art"),C=s("img","lk__img");C.alt="",i.thumb?C.src=i.thumb:C.hidden=!0,_.append(C),i.group&&_.append(s("span","lk__gchip",i.group));const H=[s("span","lk__brand",i.brand||"")];return i.after&&H.push(s("span","lk__after",i.after)),w.append(_,...H,s("span","lk__name",i.name),s("span","lk__tag",i.tag||"")),Ce()===i.id&&(w.append(s("span","lk__eq","equipped")),w.classList.add("is-eq")),w.addEventListener("click",B=>{B.stopPropagation(),b=d,O(),te()}),w.addEventListener("mouseenter",()=>{b=d,O()}),U.append(w),w}),O()}const rn=[];function la(e){const n=Q(x()).find(i=>i.id===F[x().id])||null,a=n&&n.id===e.id;J.textContent="",rn.length=0;for(const i of pt){const d=Sn(i,e.stats[i.key]),f=n&&Mt(n.stats[i.key])?Sn(i,n.stats[i.key]):d,w=s("div","lk__stat"),_=s("span","lk__stat-t"),C=s("i"),H=s("u"),B=Math.min(d,f);C.style.width=(B*100).toFixed(1)+"%",!a&&Math.abs(d-f)>.004?(H.style.left=(B*100).toFixed(1)+"%",H.style.width=(Math.abs(d-f)*100).toFixed(1)+"%",H.classList.add(d>f?"is-up":"is-down")):C.style.width=(d*100).toFixed(1)+"%",_.append(C,H);const ft=s("span","lk__stat-v",String(Math.round(d*100))),ae=Math.round((d-f)*100),De=s("span","lk__stat-d",a||ae===0?"":(ae>0?"+":"−")+Math.abs(ae));!a&&ae!==0&&De.classList.add(ae>0?"is-up":"is-down");const ie=i.src&&Mt(e.stats[i.src])?e.stats[i.src]:e.stats[i.key];w.title=`${i.label}: ${ie.toFixed(2)}${i.suffix||""}`,w.append(s("span","lk__stat-k",i.label),_,ft,De),J.append(w),rn.push(w)}pt.length&&(Yt.textContent=a||!n?"equipped":"vs "+n.name,J.append(Yt))}function da(e){se.style.setProperty("--g",x().accent),X.hidden=!0,we.style.backgroundImage="none",de.hidden=!0,le.hidden=!0,J.textContent="",_e.textContent="settings",ve.textContent=e.name,ce.textContent=We(e.key)?"on":"off",pe.textContent=e.desc||"",V.textContent="";for(const[n,a]of[["state",We(e.key)?"on":"off"],["default",e.def?"on":"off"]]){const i=s("div","lk__fact");i.append(s("span","k",n),s("span","v",a)),V.append(i)}}function ca(e){if(se.style.setProperty("--g",x().accent),X.hidden=!0,we.style.backgroundImage="none",de.hidden=!0,le.hidden=!0,J.textContent="",_e.textContent="keybind",ve.textContent=e.name,V.textContent="",e.isReset){ce.textContent="every action",pe.textContent="Puts all nineteen controls back to the keys this build ships with, and clears the saved layout from this device.";return}const n=z===e.action;ce.textContent=n?"press a key":Ke(e.action);const a=ri(e.action);pe.textContent=n?"Press any key, or a mouse button, to bind it. If that key is already doing another job the two SWAP — nothing is left without a key. Escape cancels.":a?"Click the row to rebind the SECOND key. ESC opens the board on every machine and cannot be moved or taken, so it stays; the key beside it is yours, it swaps with whatever already holds it, and every legend follows.":"Click the row to rebind. A key already in use swaps with this one, and every legend in the game — the intro card, the ESC board, the strip along the bottom — follows what you bind.";const i=(ti[e.action]||[]).map(ni);for(const[d,f]of[["key",Ke(e.action)],["default",[...new Set(i)].join(" · ")||"—"],["code",wn(e.action).join(" · ")||"—"],["saved",St(e.action)?"shipped":"yours"]]){const w=s("div","lk__fact");w.append(s("span","k",d),s("span","v",String(f))),V.append(w)}}function pa(e){se.style.setProperty("--g",x().accent),X.hidden=!0,we.style.backgroundImage="none",de.hidden=!0,le.hidden=!0,I.hidden=!1,J.textContent="",_e.textContent=e.kind||"waypoint",ve.textContent=e.name,ce.textContent=e.diff?Lt[e.diff]?Lt[e.diff].label:e.diff:"unrated";const n=Xe(),a=!!(n&&n.id===e.id);pe.textContent=e.canEquip?a?"Equipped. The dye and the chevrons are down this run. Click it again to go back to the top. F clears them — unless you are standing at a lift base, where F still boards.":"One click equips this run and drops you in at the top of it: dye and chevrons the whole way down, and the locker gets out of the way.":"Fast travel. You arrive short of the sign, on the floor, looking at it. T does the same.",V.textContent="";const i=e.at||{},d=[["slug",e.slug],["also",e.also||"—"],["road",e.viaSign?"sign · T":"waypoint"],["east",Number.isFinite(i.x)?Math.round(i.x)+" m":"—"],["north",Number.isFinite(i.z)?Math.round(-i.z)+" m":"—"]];a?(d.push(["trail",Math.round(n.lengthM)+" m"]),d.push(["chevrons",n.arrows+" · every "+n.spacingM+" m"]),d.push(["dye",n.widthM+" m wide"])):e.canEquip&&d.push(["trail","click to equip · go"]);for(const[f,w]of d){const _=s("div","lk__fact");_.append(s("span","k",f),s("span","v",String(w))),V.append(_)}ee()}function O(){D.forEach((i,d)=>i.classList.toggle("is-sel",d===b));const e=m[b];if(Se.hidden=x().kind!=="trail"||!e||!!e.canEquip,!e)return;if(D[b]&&D[b].scrollIntoView&&D[b].scrollIntoView({block:"nearest"}),I.hidden=x().kind!=="trail",x().kind==="keys"){ca(e);return}if(x().kind==="settings"){da(e);return}if(x().kind==="trail"){pa(e);return}le.hidden=!1;const n=Tt(e.group);se.style.setProperty("--g",n);const a=Ce()===e.id;X.hidden=!e.thumb,e.thumb&&(X.src=e.thumb),we.style.backgroundImage=e.thumb?`url(${e.thumb})`:"none",de.hidden=!a,_e.textContent=e.brand||"",it.textContent=e.after||"",it.hidden=!e.after,ve.textContent=e.name,ce.textContent=e.spec||e.tag||"",pe.textContent=e.blurb||"",jt.textContent=e.brand||"",Ut.textContent=e.name,Wt.textContent=(e.tag||"")+(a?" · equipped":""),la(e),V.textContent="";for(const[i,d]of e.facts||[]){const f=s("div","lk__fact");f.append(s("span","k",i),s("span","v",String(d))),V.append(f)}Vn(x(),e)}function Ee(){Je.forEach((e,n)=>e.b.classList.toggle("is-on",n===c)),Se.hidden=!0,$n(),Xn(),Qn(),ea(),re.hidden=x().kind!=="trail",Ne(),dt()}function ht(e){const n=String(e??"");A.value!==n&&(A.value=n),j!==n&&(j=n,b=0,Ne())}const sn=()=>{try{return typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches}catch{return!1}};function ze(e){if(re.hidden||!e&&sn())return!1;try{A.focus({preventScroll:!0}),A.select()}catch{return!1}return document.activeElement===A}A.addEventListener("keydown",e=>{e.stopPropagation();const n=e.code;if(n==="Escape"){if(e.preventDefault(),A.value){ht("");return}A.blur(),ue();return}if(n==="Enter"||n==="NumpadEnter"){e.preventDefault(),m.length&&te();return}if(n==="ArrowDown"||n==="ArrowUp"){if(e.preventDefault(),!m.length)return;b=n==="ArrowDown"?Math.min(m.length-1,b+1):Math.max(0,b-1),O();return}n==="Tab"&&e.preventDefault()}),A.addEventListener("input",()=>ht(A.value)),A.addEventListener("click",e=>e.stopPropagation());function he(e,n=1){const a=c;z=null;let i=(e%R.length+R.length)%R.length;for(let _=0;_<R.length&&(Q(R[i]),!!Y.has(R[i].id));_++)i=((i+n)%R.length+R.length)%R.length;c=i,k="all",R[i].kind!=="trail"&&(j="",A.value="",A.blur());const d=Xe(),f=R[i].kind==="trail"&&d?d.id:Ce(),w=Q(x());b=Math.max(0,w.findIndex(_=>_.id===f)),Ee(),a!==c&&(U.classList.remove("is-swap"),U.offsetWidth,U.classList.add("is-swap"))}function te(){const e=x(),n=m[b];if(!n)return;if(e.kind==="trail"){na(n);return}if(e.kind==="keys"){const d=D[b];n.isReset?(oi(),z=null,Fe(),d&&(d.classList.remove("is-go"),d.offsetWidth,d.classList.add("is-go"))):(z=z===n.action?null:n.action,Fe()),O();return}if(e.kind==="settings"){ei(n.key,!We(n.key));const d=D[b];d&&(en(d,n.key),d.classList.remove("is-go"),d.offsetWidth,d.classList.add("is-go")),O();return}F[e.id]=n.id,e.remember?e.remember(n.id):e.kind==="ski"?ba(n.id):e.kind==="glider"?ya(n.id):e.kind==="bike"?Ta(n.id):pi(e.id,n.id),e.apply&&e.apply(n.id,e.kind==="outfit"?v:void 0),e.kind==="outfit"&&(F.outfit=window.__player&&window.__player.outfit||n.id);const a=e.kind==="outfit"?n.brand+" "+(v==="looks"?n.name:n.tag):n.name;g&&g({tab:e.id,gear:n.gear||e.gear||u&&u.mode,kind:e.kind,id:n.id,name:a}),ha(),O(),dt(),l&&e.kind==="outfit"&&l.tryOn===F.outfit&&(l.tryOn=null);const i=D[b];i&&(i.classList.remove("is-go"),i.offsetWidth,i.classList.add("is-go")),be.classList.remove("is-go"),be.offsetWidth,be.classList.add("is-go"),l&&(l.kick=2.6)}function ha(){D.forEach((e,n)=>{const a=e.querySelector(".lk__eq"),i=Ce()===m[n].id;i&&!a?e.append(s("span","lk__eq","equipped")):!i&&a&&a.remove(),e.classList.toggle("is-eq",i)})}function ln(){if(x().kind==="settings"||x().kind==="trail"||x().kind==="keys"||!D.length)return 1;const e=D[0].offsetWidth||1,n=10;return Math.max(1,Math.round((U.clientWidth+n)/(e+n)))}let ne=0;function ut(){T||(T=!0,ne&&(clearTimeout(ne),ne=0),N.hidden=!1,N.classList.remove("is-out"),M=null,tt=0,nt=0,l?Oe():Hn(),l&&(je(t,l,window.__player?.outfit),l.tryOn=null),window.__player&&window.__player.outfit&&(F.outfit=window.__player.outfit),he(c),N.offsetWidth,N.classList.add("is-in"),st=performance.now(),Pe||(Pe=requestAnimationFrame($t)),requestAnimationFrame(()=>{Oe(),ee()}))}function ue(){T&&(T=!1,z=null,j="",A.value="",A.blur(),l&&(l.hold=null),l&&l.tryOn!=null&&(je(t,l,window.__player?.outfit),l.tryOn=null),N.classList.remove("is-in"),N.classList.add("is-out"),ne&&clearTimeout(ne),ne=setTimeout(()=>{ne=0,T||(N.hidden=!0,N.classList.remove("is-out"))},150))}return addEventListener("resize",()=>{T&&(Oe(),ee())}),window.__locker=Object.assign(window.__locker||{},{turntable(e){return ut(),l.hold=e==null?null:Number(e),l.t=0,new Promise(n=>requestAnimationFrame(()=>requestAnimationFrame(()=>n(l.turntable.rotation.y))))},tryOn:()=>l?l.tryOn:null,mannequin:()=>l?{body:l.cBody,skin:l.cSkin,clip:l.clip,want:l.want,baked:[...l.clips.keys()],pairs:l.riderPairs.length,mats:l.riderMats.size,toggles:l.riderToggles.length,pos:l.cBody?[l.cBody.position.x,l.cBody.position.y,l.cBody.position.z]:null,visible:!!(l.cBody&&l.cBody.visible),pack:!!(l.cPack&&l.cPack.visible),glider:!!(l.cGlide&&l.cGlide.visible)}:null,sub:()=>v,setSub:lt,thumbMs:()=>Pn,mapSheet:()=>P?{...P,url:Dn,first:at}:null,mapDraw:()=>ee(),mapZoomAt:(e,n,a)=>(rt(e,n,a),P),mapPanBy:(e,n)=>!M||!P?null:(M.ox+=e,M.oy+=n,Qe(M,P.w,P.h),P=$e(W,M),P),mapReset:()=>(M=null,ee()),trail:()=>Xe(),keys:()=>({listening:z,rows:bn.map(e=>({id:e.id,name:e.name,chip:Ke(e.id),codes:wn(e.id),isDefault:St(e.id)}))}),rows:()=>Rn(It,Ot).map(e=>({id:e.id,name:e.name,diff:e.diff,section:e.section,segments:e.segments.slice(),canEquip:e.canEquip})),search:()=>({shown:!re.hidden,focused:document.activeElement===A,q:A.value,placeholder:A.placeholder,n:m.length,names:m.map(e=>e.name),hl:m.map(e=>(q.get(e)||[]).map(n=>String(e.name)[n]).join("")),sel:m[b]?m[b].name:null,coarse:sn()}),setSearch:e=>(ht(e),m.map(n=>n.name)),focusSearch:e=>ze(e!==!1)}),{root:N,isOpen:()=>T,open:ut,close:ue,toggle(){return T?ue():ut(),T},key(e){if(!T)return!1;if(z!==null)return e==="Escape"?(an(),!0):(oa.has(e)||on(e),!0);if(e==="Escape"||e==="KeyI")return ue(),!0;if(e==="KeyM"){if(x().kind==="trail")return ue(),!0;const a=R.findIndex(i=>i.kind==="trail"&&!Y.has(i.id));return a>=0&&(he(a),ze()),!0}if(e==="Slash")return x().kind==="trail"&&ze(!0),!0;if(e==="KeyQ")return he(c-1,-1),!0;if(e==="KeyE"||e==="Tab")return he(c+1,1),!0;if(e==="KeyF"){const a=["all",...Xt(Q(x()))];return k=a[(a.indexOf(k)+1)%a.length],b=0,Ee(),!0}if(e==="KeyG")return x().kind==="outfit"&&lt(Te[(Te.indexOf(v)+1)%Te.length]),!0;if(e==="KeyT"){const a=m[b];return x().kind==="trail"&&a&&!a.canEquip&&Re(a),!0}if(!m.length)return!0;if(e==="ArrowLeft"||e==="KeyA")return b=(b+m.length-1)%m.length,O(),!0;if(e==="ArrowRight"||e==="KeyD")return b=(b+1)%m.length,O(),!0;if(e==="ArrowUp"||e==="KeyW")return b=Math.max(0,b-ln()),O(),!0;if(e==="ArrowDown"||e==="KeyS")return b=Math.min(m.length-1,b+ln()),O(),!0;if(e==="Enter"||e==="Space")return te(),!0;const n=/^(?:Digit|Numpad)([1-9])$/.exec(e);if(n){const a=Number(n[1])-1;return a<m.length&&(b=a,O(),te()),!0}return!0},tabs:()=>R.filter(e=>!Y.has(e.id)&&e.gear).map(e=>e.id),pages:()=>R.filter(e=>!Y.has(e.id)&&!e.gear).map(e=>e.id),tab:()=>x().id,setTab:(e,n)=>{const a=R.findIndex(i=>i.id===e);return a>=0&&he(a),n&&n.search&&ze(),x().id},filter:()=>k,setFilter:e=>(k=e,b=0,Ee(),k),items:()=>m.map(e=>e.id),selected:()=>m[b]?m[b].id:null,equipped:()=>({...F}),noteEquipped(e,n){F[e]!==void 0&&(F[e]=n,T&&(Ne(),dt()))}}}export{ao as createInventory,zn as fzfMatch};
