import{SKI_MODELS as Fa,skiThumbURL as za,makeSkiRig as yn,styleSkiRig as xn,rememberSkiId as Da,SKI_DEFAULT as Ba}from"./ski.js";import{GLIDER_MODELS as Ua,GLIDER_DEFAULT as ja,rememberGliderId as Ga}from"./glider.js";import{BIKE_MODELS as Wa,BIKE_DEFAULT as Ka,bikeThumbURL as Ha,rememberBikeId as Va,makeBikeRig as Ya,styleBikeRig as Za,getBikeModel as Qa,bikeRider as $a}from"./bike.js";import{SLED_MODELS as Xa,SLED_DEFAULT as Ja,sledThumbURL as ei,rememberSledId as ti,resolveSledId as ni,makeSledRig as ai,styleSledRig as ii}from"./sled.js";import{SNOWMOBILE_MODELS as oi,SNOWMOBILE_DEFAULT as ri,snowmobileThumbURL as si,rememberSnowmobileId as li,resolveSnowmobileId as di,makeSnowmobileRig as ci,styleSnowmobileRig as pi}from"./snowmobile.js";import{BIKE_GEAR as hi,BRAND as Sn}from"./flags.js";import{OUTFITS as Ot,byCode as ui,previewOutfit as He,toggleOf as fi,rememberOutfit as ki,resolveOutfit as gi,PARTS as Ve,parseLook as Ct,serialise as mi,paint as En,swatch as Nt,cloneRig as bi,rigOf as wi}from"./rider.js";import{R as Tn,C as An}from"./atlas.js";import Mn from"./outfits/after.js";import{KNOBS as _i,get as Ye,set as vi}from"./settings.js";import{ACTIONS as Ln,DEFAULTS as yi,label as Ze,codesOf as In,keyName as xi,mouseCode as Si,bind as Ei,reset as Ti,isDefault as Rt,isWelded as Ai}from"./bindings.js";import{hudSurf as Pt}from"./hud.js";const Mi=parseInt(Pt.cream.slice(1),16);import{waypointIndex as Li,ALIASES as Ii}from"./spawn.js";const Oi={wing:{base:"#dd6a2a",ink:"#6b4a2a",accent:"#f2c98a"},rocket:{base:"#1b1c22",ink:"#0b0b0e",accent:"#b9bec4"}},o=(t,r,u)=>{const p=document.createElement(t);return r&&(p.className=r),u!=null&&(p.textContent=u),p},On="poi-lab.play.locker.",Ci=(t,r)=>{try{localStorage.setItem(On+t,r)}catch{}},Ni=t=>{try{return localStorage.getItem(On+t)}catch{return null}},Cn=t=>t<0?0:t>1?1:t;function Ri(t){const r=t.replace("#","");return r.length===3?r.split("").map(p=>parseInt(p+p,16)):[parseInt(r.slice(0,2),16),parseInt(r.slice(2,4),16),parseInt(r.slice(4,6),16)]}const Qe=(t,r)=>{const[u,p,w]=Ri(t);return`rgba(${u},${p},${w},${r})`};function Pi(t){let r=0;for(let u=0;u<t.length;u++)r=r*31+t.charCodeAt(u)>>>0;return r%360}const qi=t=>{const p=l=>(l+t/30)%12,w=.62*Math.min(.62,.38),k=l=>Math.round(255*(.62-w*Math.max(-1,Math.min(p(l)-3,Math.min(9-p(l),1)))));return"#"+[k(0),k(8),k(4)].map(l=>l.toString(16).padStart(2,"0")).join("")},Nn={lab:"#8fa3b8",race:"#ff3b5c",freeride:"#2ec4b6",trail:"#54d17a",jump:"#ffb020",fun:"#c77dff",dh:"#ff6b3d",xc:"#5ad1e6"},qt=t=>Nn[t]||(Nn[t]=qi(Pi(String(t||"x")))),Rn={ski:'<path d="M5.4 20.6 8.9 5.1c.3-1.4 1.5-2.1 2.6-1.7"/><path d="M12.6 20.6 16.1 5.1c.3-1.4 1.5-2.1 2.6-1.7"/><path d="M4.2 20.9h5.1"/><path d="M11.4 20.9h5.1"/>',bike:'<circle cx="5.9" cy="16.4" r="4.1"/><circle cx="18.1" cy="16.4" r="4.1"/><path d="M5.9 16.4 10.2 8.2h6.1l1.8 8.2"/><path d="M9.4 8.2h4.4"/><path d="M16.3 8.2 17.5 5.4h2.2"/>',glider:'<path d="M12 3.4 2.6 13.9c3.4-1.4 6.4-.7 9.4 6.7 3-7.4 6-8.1 9.4-6.7z"/><path d="M12 3.4v17.2"/>',boots:'<path d="M8.2 3.4h4.3v8.4c0 1.3.8 2.4 2 2.9l4.1 1.8v4.1H6.4V3.4z"/><path d="M6.6 17.1h12"/>',crate:'<path d="M12 2.7 20.2 7v10L12 21.3 3.8 17V7z"/><path d="M3.8 7 12 11.4 20.2 7"/><path d="M12 11.4v9.9"/>',trail:'<path d="M2.6 19.4 8.4 9.1l3.3 5.1 2.6-3.9 5.1 9.1z"/><path d="M15.4 3.1h5.6v3.6h-5.6z"/><path d="M15.4 3.1V10"/>',sled:'<path d="M3.2 13.9h12.9c2.1 0 3.5-1.3 3.5-3 0-1.3-1-2.3-2.2-2.3s-2.2 1-2.2 2.3"/><path d="M4.4 18.2h12.2"/><path d="M5.8 13.9v4.3"/><path d="M13.9 13.9v4.3"/>',snowmobile:'<rect x="2.5" y="14.2" width="10.2" height="4.3" rx="2.1"/><path d="M12.7 16.3h3.5l2.4-2.3"/><path d="M8.4 14.2 10.1 9.6h3.8l1.3 2.7"/><path d="M14 9.6 16.1 7.2"/><path d="M17.2 18.5h3.3"/><path d="M18.9 13.4v5.1"/>',outfit:'<path d="M9 3.2h6l4.1 2.3-1.6 4.4-1.9-.8v11.7H7.4V9.1l-1.9.8L3.9 5.5z"/><path d="M9 3.2 12 6.4 15 3.2"/>',gear:'<circle cx="12" cy="12" r="6.6"/><circle cx="12" cy="12" r="2.9"/><path d="M18.6 12h2.2"/><path d="M5.4 12H3.2"/><path d="M12 5.4V3.2"/><path d="M12 18.6v2.2"/><path d="M16.67 7.33 18.22 5.78"/><path d="M7.33 16.67 5.78 18.22"/><path d="M16.67 16.67 18.22 18.22"/><path d="M7.33 7.33 5.78 5.78"/>',keys:'<rect x="2.6" y="6.2" width="18.8" height="11.6" rx="1.8"/><path d="M6.2 9.6h1.4"/><path d="M11.3 9.6h1.4"/><path d="M16.4 9.6h1.4"/><path d="M8.1 14.3h7.8"/>',board:'<rect x="9.2" y="4.6" width="5.6" height="15.8"/><rect x="2.6" y="10.4" width="6.6" height="10"/><rect x="14.8" y="13.2" width="6.6" height="7.2"/>'};function Fi(t){return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(Rn[t]||Rn.crate)+"</svg>"}const zi=[{key:"speed",label:"speed",unit:!0,src:"term",suffix:" m/s"},{key:"turn",label:"handling",unit:!0,src:"steer",suffix:" rad/s"},{key:"stab",label:"stability",unit:!0},{key:"pop",label:"pop",unit:!0},{key:"spinTorque",label:"spin",unit:!1,suffix:" rad/s"}],Ft=t=>typeof t=="number"&&isFinite(t);function Di(t){const r=[];for(const u of zi){const p=t.map(w=>w.stats?w.stats[u.key]:void 0);!p.length||!p.every(Ft)||r.push({...u,min:Math.min(...p),max:Math.max(...p),n:t.length})}return r}function Pn(t,r){const u=t.max-t.min;return t.unit&&t.n<4?Cn(r):u>1e-6?.08+.92*((r-t.min)/u):t.unit?Cn(r):.5}const ee=new Map;function qn(t,r,u){if(ee.has(t))return ee.get(t);const p=300,w=58,k=document.createElement("canvas");k.width=p,k.height=w;const l=k.getContext("2d");if(l.fillStyle=r.base,l.fillRect(0,0,p,w),l.strokeStyle=r.accent,l.lineWidth=3,l.lineCap="round",l.lineJoin="round",l.fillStyle=r.accent,u==="bike")l.beginPath(),l.arc(96,34,17,0,7),l.stroke(),l.beginPath(),l.arc(204,34,17,0,7),l.stroke(),l.beginPath(),l.moveTo(96,34),l.lineTo(140,18),l.lineTo(186,18),l.lineTo(204,34),l.lineTo(150,34),l.closePath(),l.stroke(),l.beginPath(),l.moveTo(186,18),l.lineTo(196,8),l.lineTo(212,8),l.stroke();else if(u==="rocket"){l.fillStyle=r.ink,l.fillRect(132,12,36,30);for(const v of[110,190])l.fillStyle=r.accent,l.fillRect(v-17,9,34,33),l.beginPath(),l.ellipse(v,9,17,7,0,0,7),l.fill(),l.fillStyle=r.ink,l.fillRect(v-17,22,34,7),l.beginPath(),l.moveTo(v-11,42),l.lineTo(v+11,42),l.lineTo(v+17,51),l.lineTo(v-17,51),l.closePath(),l.fill(),l.fillStyle="#ffb347",l.beginPath(),l.moveTo(v-13,52),l.lineTo(v+13,52),l.lineTo(v,58),l.closePath(),l.fill()}else if(u==="wing")l.beginPath(),l.moveTo(150,8),l.quadraticCurveTo(74,20,34,46),l.quadraticCurveTo(96,40,150,50),l.quadraticCurveTo(204,40,266,46),l.quadraticCurveTo(226,20,150,8),l.closePath(),l.fill(),l.strokeStyle=r.ink,l.lineWidth=2,l.beginPath(),l.moveTo(150,4),l.lineTo(150,54),l.stroke();else{l.beginPath(),l.moveTo(112,8),l.lineTo(160,8),l.lineTo(166,34),l.lineTo(198,42),l.lineTo(198,52),l.lineTo(108,52),l.closePath(),l.fill(),l.fillStyle=r.ink;for(let v=0;v<3;v++)l.fillRect(118,14+v*10,40,4)}const E=k.toDataURL("image/png");return ee.set(t,E),E}const Bi=[["chinBar","chin bar"],["visor","visor"],["hood","hood"],["guards","guards"],["spine","spine plates"],["belt","belt"]],Fn={race:"Cut for the gates: one skin, no slack, nothing on it the clock has to carry.",shell:"A jacket and pants built for the weather first and the lift queue second.",freeride:"Bib pants under a short jacket, cut wide enough to sit down in the trees.",retro:"The loudest page of an old catalogue, reprinted without one apology for it.",armour:"Plated where a fall lands — spine, chin and hands — worn over the suit."},zt=t=>"#"+(t&16777215).toString(16).padStart(6,"0"),$e=t=>(.2126*(t>>16&255)+.7152*(t>>8&255)+.0722*(t&255))/255,Ui='900 %px "Helvetica Neue", Helvetica, Arial, sans-serif',zn=new Map;function ji(t){const r=zn.get(t.code);if(r)return r;const u=300,p=58,w=t.palette,k=document.createElement("canvas");k.width=u,k.height=p;const l=k.getContext("2d"),E=w.jacket,v=[[0,150,E],[150,230,w.pants],[230,275,w.helmet],[275,300,w.accent!=null?w.accent:w.strap!=null?w.strap:w.glove]];for(const[A,q,c]of v)l.fillStyle=zt(c??E),l.fillRect(A,0,q-A,p);Dn(l,t,E,p);const x=k.toDataURL("image/png");return zn.set(t.code,x),x}function Dn(t,r,u,p,w=126){const k=Xe(r).toUpperCase(),l=1.4;for(let v=22;v>9&&(t.font=Ui.replace("%",v),!(t.measureText(k).width+l*(k.length-1)<=w));v--);t.fillStyle=Math.abs($e(u)-$e(Mi))>=Math.abs($e(u)-$e(1513498))?Pt.cream:"#17181a",t.textBaseline="middle";let E=12;for(const v of k)t.fillText(v,E,p/2),E+=t.measureText(v).width+l}const Gi=t=>Bi.filter(([r])=>t[r]).map(([,r])=>r),Xe=t=>t.house==="POI-LAB"?Sn:t.house;function Wi(t){const r=t.flags,u=Gi(r),p=Xe(t);return{id:t.code,name:t.name,brand:p,tag:t.family,group:t.family,after:Mn[t.code]||"",thumb:ji(t),spec:[`${r.torso} torso · ${r.helmet} helmet`,...u].join(" · "),facts:[["house",p],["family",t.family],["torso",r.torso],["helmet",r.helmet],["extras",u.join(", ")||"—"]],blurb:`${p} ${t.name}. ${Fn[t.family]||""}`.trim()}}const Oe=["looks",...Ve],Ki={helmet:t=>[t.helmet,t.chinBar&&"chin bar",t.visor&&"visor",t.head==="robot"&&"robot head",t.mask&&"mask",t.collar==="stand"&&"stand collar"],goggles:t=>[t.goggles===!1||t.goggles==="none"?"no goggles":t.goggles==="rimless"&&"rimless"],jacket:t=>[t.torso+" torso",t.hood&&"hood",t.spine&&"spine plates",t.hem&&t.hem+" hem",t.puffy&&"puffy",t.anorak&&"anorak",t.chestPlate&&"chest plate",t.pauldrons&&"pauldrons",t.kitFerrum&&"Ferrum kit",t.kitUmbra&&"Umbra kit",t.kitPhantom&&"Phantom kit",t.kitDuke&&"Duke kit"],pants:t=>[t.pants&&t.pants+" fit",t.belt&&"belt",t.hipPlate&&"hip plate",t.bloused&&"bloused",t.beltBoxes&&"belt boxes"],gloves:t=>[t.guards&&"arm guards",t.poleGuards&&"pole guards"],boots:t=>[t.boot&&t.boot+" boot",t.shinGuards&&"shin guards"],poles:()=>[]},Hi={helmet:"helmet",goggles:"lens",jacket:"jacket",pants:"pants",gloves:"glove",boots:"boot",poles:"pole"},Vi={helmet:[["helmet",0,0,300,58]],goggles:[["lens",0,0,300,29],["strap",0,29,300,29]],jacket:[["chestFront",0,0,110,58],["back",110,0,110,58],["sleeveL",220,0,80,58]],pants:[["legL",0,0,200,58],["belt",200,0,100,58]],gloves:[["glove",0,0,200,58],["poleGuards",200,0,100,58]]},Yi={boots:["boot"],poles:["pole","poleBand"]},Bn=22,Un=t=>Tn[t]?Tn[t].slice(0,4):[An[t][0],An[t][1],Bn,Bn];let jn=!1,Gn=0;function Zi(){const t=performance.now();for(const r of Ot){const{canvas:u}=En(r.code,null,{cache:!1});for(const p of Ve){const w=document.createElement("canvas");w.width=300,w.height=58;const k=w.getContext("2d"),l=Yi[p];if(l){const E=300/l.length;l.forEach((v,x)=>{k.fillStyle=zt(Nt(r.palette,v)),k.fillRect(x*E,0,E,58)}),Dn(k,r,Nt(r.palette,l[0]),58)}else for(const[E,v,x,A,q]of Vi[p]){const[c,m,g,_]=Un(E);k.drawImage(u,c,m,g,_,v,x,A,q)}ee.set(p+":"+r.code,w.toDataURL("image/png"))}}jn=!0,Gn=Math.round(performance.now()-t)}function Qi(t,r){return jn||Zi(),ee.get(r+":"+t.code)}function $i(t,r){const u=Xe(t);return{id:t.code,name:t.name,brand:u,group:t.family,tag:r,after:Mn[t.code]||"",thumb:Qi(t,r),spec:Ki[r](t.flags).filter(Boolean).join(" · ")||"—",facts:[["house",u],["family",t.family],["part",r],["colour",zt(Nt(t.palette,Hi[r]))]],blurb:`${u} ${t.name} — ${r}. ${Fn[t.family]||""}`.trim()}}const Wn="x";function Xi(){const t="goggles:"+Wn;if(!ee.has(t)){const{canvas:r}=En("g00",null,{cache:!1}),u=document.createElement("canvas");u.width=300,u.height=58;const[p,w,k,l]=Un("face");u.getContext("2d").drawImage(r,p,w,k,l,0,0,300,58),ee.set(t,u.toDataURL("image/png"))}return ee.get(t)}const Ji=()=>({id:Wn,name:"No goggles",brand:"—",tag:"goggles",thumb:Xi(),spec:"bare face",facts:[["house","—"],["part","goggles"],["colour","—"]],blurb:"No goggles. The band comes off and the face is the face."});let Je=null,Kn=0;function eo(){const t=[];let r=[];try{const p=window.__guide;r=p&&typeof p.courses=="function"?p.courses():[]}catch{r=[]}for(const p of r)t.push({id:"race:"+p.id,group:"races",board:"race",target:p.id,name:p.name||p.id,sub:p.gates+" gates · "+Math.round(p.racedM)+" m",tail:p.gates+" gates",n:Hn("races",p.id)});let u=[];try{u=Dt(it,ot).filter(p=>p.section==="runs")}catch{u=[]}for(const p of u)t.push({id:"trick:"+p.id,group:"tricks",board:"trick",target:p.id,name:p.name,diff:p.diff,sub:p.diff&&we[p.diff]?we[p.diff].label:"unrated",tail:"",n:Hn("tricks",p.id)});return t.push({id:"overall",group:"overall",board:"overall",target:null,name:"BEST TRICK OVERALL",sub:"every run, and off-piste",tail:"",n:null}),t}function Hn(t,r){if(!Je)return null;const p=(Je[t==="races"?"races":"tricks"]||[]).find(w=>String(w.target)===String(r));return p?Number(p.players):0}const R=[{id:"board",label:"leaderboard",kind:"board",icon:"board",accent:"#ffb03a",noAll:!0,defaultFilter:"races",items:()=>eo()},{id:"skis",label:"skis",gear:"skis",kind:"ski",icon:"ski",accent:"#4cc9f0",items:()=>Fa.map(t=>({id:t.id,name:t.name,brand:t.brand,tag:t.disc,group:t.group,blurb:t.blurb,stats:t.stats,thumb:za(t),spec:`${t.len} cm · ${t.waist} mm waist · R${t.radius}`,facts:[["length",t.len+" cm"],["waist",t.waist+" mm"],["radius","R"+t.radius],["top speed",t.stats.term.toFixed(1)+" m/s"],["turn rate",t.stats.steer.toFixed(2)+" rad/s"],["chatter",t.stats.chatterSpeed===1/0?"never":t.stats.chatterSpeed+" m/s"],["spin",t.stats.spinTorque.toFixed(1)+" rad/s"],["pop","×"+t.stats.popMul.toFixed(2)]]}))},...hi?[{id:"bike",label:"bikes",gear:"bike",kind:"bike",icon:"bike",accent:"#ff7a29",items:()=>Wa.map(t=>({id:t.id,name:t.name,brand:t.brand,tag:t.disc,group:t.group,blurb:t.blurb,stats:t.stats,thumb:Ha(t),spec:`${t.spec.travel} travel · ${t.spec.head.toFixed(1)}° head · ${t.spec.mass} · ${t.spec.wheel}`,facts:[["travel",t.spec.travel],["head angle",t.spec.head.toFixed(1)+"°"],["wheelbase",t.spec.wb+" mm"],["weight",t.spec.mass],["wheels",t.spec.wheel],["top speed",t.stats.term.toFixed(1)+" m/s"],["pedal cap",t.stats.pedalMax.toFixed(1)+" m/s"],["spin",t.stats.spinTorque.toFixed(1)+" rad/s"],["pop",t.stats.popFull.toFixed(1)+" m/s"]]}))}]:[],{id:"glider",label:"glider",gear:"glider",kind:"glider",icon:"glider",accent:"#a78bfa",items:()=>Ua.map(t=>({id:t.id,name:t.name,brand:t.brand,tag:t.tag,group:t.group,blurb:t.blurb,stats:t.stats,facts:t.facts,gear:t.gear,preview:t.preview,spec:t.facts&&t.facts.length?t.facts.slice(0,3).map(([r,u])=>`${r} ${u}`).join(" · "):"",thumb:qn("glider-"+t.id,Oi[t.glyph],t.glyph)}))},{id:"sled",label:"sled",gear:"sled",kind:"sled",icon:"sled",accent:"#c98a3f",remember:ti,apply:t=>window.__player?.setSledModel?.(t),items:()=>Xa.map(t=>({id:t.id,name:t.name,brand:t.brand,tag:t.disc,group:t.group,blurb:t.blurb,stats:t.stats,thumb:ei(t),spec:`${t.spec.length} · ${t.spec.deck} · ${t.spec.mass}`,facts:[["length",t.spec.length],["width",t.spec.width],["deck",t.spec.deck],["runners",t.spec.runners],["weight",t.spec.mass],["top speed",t.stats.term.toFixed(1)+" m/s"],["turn rate",t.stats.steer.toFixed(2)+" rad/s"],["wipe tolerance",(t.stats.wipeTol*180/Math.PI).toFixed(0)+"°"],["stalls below",t.stats.stallSpeed.toFixed(1)+" m/s"]]}))},{id:"snowmobile",label:"snowmobile",gear:"snowmobile",kind:"snowmobile",icon:"snowmobile",accent:"#ff6a1f",remember:li,apply:t=>window.__player?.setSnowmobileModel?.(t),items:()=>oi.map(t=>({id:t.id,name:t.name,brand:t.brand,tag:t.disc,group:t.group,blurb:t.blurb,stats:t.stats,thumb:si(t),spec:`${t.spec.engine} · ${t.spec.mass}`,facts:[["engine",t.spec.engine],["track",t.spec.track],["weight",t.spec.mass],["suspension",t.spec.suspension],["top speed",t.stats.term.toFixed(1)+" m/s"],["climbs to",t.stats.climbDeg.toFixed(1)+"°"],["reverse",t.stats.reverseMax.toFixed(1)+" m/s"],["brake",t.stats.brake.toFixed(0)+" m/s²"]]}))},{id:"boots",label:"boots",gear:"boots",kind:"boots",icon:"boots",accent:"#e0b166",items:()=>[{id:"boots",name:"Boots",brand:Sn,tag:"on foot",group:"lab",blurb:"The Quake-ish walk controller, untouched since the first commit. Walk, sprint, jump, step over anything under 55 cm. Nothing you equip can change how this feels.",stats:{turn:1,speed:.1,stab:1,pop:.2},thumb:qn("boots",{base:"#26231f",ink:"#12110f",accent:"#cdc7ba"},"boot"),spec:"walk 4.5 m/s · sprint 8.0 m/s · step 0.55 m",facts:[["walk","4.5 m/s"],["sprint","8.0 m/s"],["jump","4.5 m/s"],["step up","0.55 m"]]}]},{id:"outfit",label:"outfit",kind:"outfit",icon:"outfit",accent:"#ff5c8a",remember:ki,apply:(t,r)=>window.__player?.setOutfit?.(r&&r!=="looks"?{[r]:t}:t),items:t=>!t||t==="looks"?Ot.map(Wi):[...t==="goggles"?[Ji()]:[],...Ot.map(r=>$i(r,t))]},{id:"trails",label:"trails",kind:"trail",icon:"trail",accent:"#4cc9f0",items:()=>Dt(it,ot)},{id:"settings",label:"settings",kind:"settings",icon:"gear",accent:"#4fd6a9",items:()=>_i.map(t=>({id:t.key,key:t.key,name:t.label,desc:t.desc,def:!!t.def}))},...typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches?[]:[{id:"keys",label:"keys",kind:"keys",icon:"keys",accent:"#e8a13f",items:()=>[...Ln.map(t=>({id:t.id,action:t.id,name:t.name})),{id:"__reset",name:"RESET TO DEFAULTS",isReset:!0}]}]],et={double:4,black:3,blue:2,green:1},we={green:{cls:"is-circ",label:"green circle"},blue:{cls:"is-sq",label:"blue square"},black:{cls:"is-dia",label:"black diamond"},double:{cls:"is-dia2",label:"double diamond"},park:{cls:"is-park",label:"terrain park"}},to={"ski-run":"run","bike-trail":"trail",lift:"lift",venue:"venue",landmark:"landmark",notice:"notice"};function Dt(t,r){if(!t)return[];let u=null;try{u=Li(t,r==="z"?"z":"y")}catch{return[]}if(!u||!u.size)return[];const p=new Map;for(const c of Array.isArray(t.markers)?t.markers:[])c&&c.id&&p.set(c.id,{diff:c.diff||null,kind:to[c.kind]||c.kind||null});const w=new Map,k=new Set;for(const c of Array.isArray(t.runs)?t.runs:[]){if(!c||!c.id||!Array.isArray(c.pts)||!c.pts.length)continue;k.add(c.id);const m=c.family?String(c.family):null,g=String(m&&c.familyName||c.name||c.id),_=m?`f:${m}`:`i:${c.id}`,B=c.pts[0],H={id:c.id,n:c.pts.length,at:{x:+B[0],y:+B[1],z:+B[2]}};let D=w.get(_);D||(D={name:g,kind:"run",section:"runs",diff:null,segments:[],slugs:[],names:[]},w.set(_,D)),D.segments.push(H),D.names.push(String(c.name||c.id));const C=c.diff||(p.get(c.id)||{}).diff||null;C&&(et[C]||0)>(et[D.diff]||0)&&(D.diff=C)}const l=[];for(const c of w.values()){c.segments.sort((g,_)=>_.at.y-g.at.y);const m=c.segments[0];l.push({id:m.id,slug:m.id,name:c.name,at:m.at,diff:c.diff,kind:"run",viaSign:!1,section:"runs",segments:c.segments.map(g=>g.id),canEquip:c.segments.reduce((g,_)=>g+_.n,0)>=4,slugs:[],names:c.names.slice()})}const E=new Map;for(const[c,m]of u){if(!m||!m.id||k.has(m.id)||E.has(m.id))continue;const g=p.get(m.id)||{};E.set(m.id,{id:m.id,slug:c,name:m.name||m.id,at:m.at,diff:g.diff||null,kind:g.kind||m.kind||null,viaSign:m.kind==="marker",section:"places",segments:[],canEquip:!1,slugs:[],names:[]})}const v=new Map;for(const c of l)for(const m of c.segments)v.set(m,c);for(const c of E.values())v.set(c.id,c);for(const[c,m]of Object.entries(Ii)){const g=v.get(m);g&&c!==g.slug&&!g.slugs.includes(c)&&g.slugs.push(c)}const x=(c,m)=>(et[m.diff]||0)-(et[c.diff]||0)||String(c.name).localeCompare(String(m.name));l.sort(x);const A=[...E.values()].sort(x),q=[];try{const c=window.__guide;for(const m of(c&&typeof c.tutorials=="function"?c.tutorials():[])||[])q.push({id:"tut:"+m.id,slug:m.id,name:m.name,at:null,diff:m.diff||null,kind:"tutorial",viaSign:!1,canEquip:!1,section:"tutorials",segments:(m.runs||[]).slice(),tut:m.id,tile:m.tile,slugs:[],names:[m.tile,m.teaches||""].filter(Boolean),teaches:m.teaches||""})}catch{}return[...q,...l,...A].map(c=>({id:c.id,slug:c.slug,name:c.name,at:c.at,diff:c.diff,kind:c.kind,viaSign:c.viaSign,canEquip:c.canEquip,section:c.section,segments:c.segments.slice(),tut:c.tut||null,tile:c.tile||null,also:c.teaches||c.slugs.slice(0,2).join(" · "),names:(c.names||[]).slice()}))}const no=16,Vn=12,ao=8,Yn=-3,Zn=-1,io=(t,r)=>r===0||!/[a-z0-9]/i.test(t[r-1]);function Qn(t,r){const u=String(t||""),p=String(r||"").replace(/\s+/g,"");if(!p||p.length>u.length)return null;const w=u.toLowerCase(),k=p.toLowerCase(),l=u.length;let E=new Float64Array(l).fill(-1/0);const v=[];for(let c=0;c<k.length;c++){const m=new Float64Array(l).fill(-1/0),g=new Int32Array(l).fill(-1);for(let _=c;_<l;_++){if(w[_]!==k[c])continue;let B=no;if(io(u,_)&&(B+=c===0?Vn*2:Vn),c===0){m[_]=B+(_?Yn+Zn*(_-1):0),g[_]=-1;continue}for(let H=c-1;H<_;H++){if(E[H]===-1/0)continue;const D=_-H-1,C=E[H]+B+(D===0?ao:Yn+Zn*(D-1));C>m[_]&&(m[_]=C,g[_]=H)}}v.push(g),E=m}let x=-1,A=-1/0;for(let c=0;c<l;c++)E[c]>A&&(A=E[c],x=c);if(x<0||A===-1/0)return null;const q=[];for(let c=k.length-1,m=x;c>=0&&m>=0;c--)q.unshift(m),m=v[c][m];return{score:A-u.length*.05,pos:q}}function oo(t,r){const u=Qn(t.name,r);let p=u?u.score:-1/0;for(const w of[...t.names||[],t.also||"",t.slug||""]){if(!w||w===t.name)continue;const k=Qn(w,r);k&&k.score-20>p&&(p=k.score-20)}return p===-1/0?null:{score:p,pos:u?u.pos:[]}}const $n="/r/a9208cf6/assets/trail-map/palisades-2400.67aace95.webp",_e=2400,ve=1625,Xn=6,ro="data:image/webp;base64,UklGRlAFAABXRUJQVlA4IEQFAACwFgCdASpgAEEAPtVUkUWkoozOqqomBqJwBk/EeXCyAMYv//w/8O9tyt5/vT8noR9onU93ryn+BGk7Zy/uZ8qzKDHQO+V0IVHzqZ+tMtxxX6FEdH5ZT8ad4k9np8fjP4rzKn9riMcogvQEyWYyNEkBLB7YIwRaeNqKh4T2XfgH4ekzaH6iwuWdDqGvPduty3aYEuBIY0os+H/8IcuFtOoXf+MTEYmb74/7vZCu52VFOkU5OW+fV6X9WsMfFzoAANFgyuALM0T6f/56Z+ifU1du5//WV/8yv/lL/D7rpCItbFKKASvjKFOefw7nSo6MPJvOspw6yTLBs6osovKIILt87nm6KC0kHvg9Eb22ahOVQW2iRajqxnUSZOqp9zZ23f1ZQbM08rHPj1m9db5KQPJaX9e8Z0M8Sfrv3DhhglC8+PpocNatN41SIkqiiIQRk4XQWXLK1HDO4ipNVykecBhYgsQz1oYfGcJK9c4JzXc7ghf1yN2pcO+MY/KVq03jMSUp2opIx0PKQky+YTkjsS2Q7gVK8CWdggN5YrTzllV9M2KyE3AF6/8bgqH8xi6a8tQ4fJxA3Y02fjUjR8tzbeegk4KVhNNcgK2SxvxZuoqRvq/P3PadI4LX0VHYsvArkZH77xuw0MlgBkvnXb/zFxlKduMGxwKgFFUtH9u2dNb4ZDPE9irLX94azImRAfMRcNKms/zu6plO7yNz6uVzHDqRkdPN0S39t56NZV8zZeFjk9XnDDV1H10oYeVSa1oqJPOq85VfLO7Jh3/B7DPrFkScIXbJhT2Z86h7Mz/4ahObXnEyKN3b20TbcHuU5FdPA2BGWdlwHOnCV9nrAkN8eMCGkclayZdYdkVX6YaCMFAGrwpyfeegMFRte+MxJ29ybAT1zLxvvM6lNixzfDwb6uqTqAj9mZr+FVfosx+JJCw6b68Yc9LOmkFMZtuhUvaieyRFXQYEouYB26ky6Ylkzo7A8wjCU7G8ITddQij6WJcTjhJDy0jEd2rh9WO1pHgj6WV7/iyu1LSet8WJNfBoF43zEGmC3i3QfOXvYf//6E7aU2hJ43sD5YfEQnv7nSIVobncRAleSo4uy9kh1UjkJgWbPFJ3hyo1QbBsq3HLro+C4cV+5saEnbRrMmyqylMEQOkkl9rsPNUdDsu2jiZmAOui/NcTvXRZEint77eRvXz0BUAyodyJFS26xidhp2a0qhLFazC5WHjeVdn0K7c13tr5HwZXZtcrDFAG793leNbXaK3GjN4rTnBuHUo212Xn9Gh2rlABce3B/HKis8jtBbesmGMAwjfBKz7glMX/01MF0ECcAHeYccE+/o2GimoOdnJiwUxyTAynviHe3Y9caGQuocavcNvGaljf2IxJ1dZPn0Oj1GDcZGHlUZKU/Vz5mts9jhkriobRNd8YbRfnsPljQZjAhsURfennIKSgOHl6R+iEt5wg+F8BKLm5qdtpQZQwGrO6WwHMB6eJlzeZzCXKpyi1ugEDkSzyRqBJ2QYYEIvHF7OVKpQ2UUbg5ruhVVIz7r1pja+cBLDIhApH+YsDxPt4Hu7rdaTfZPhZ2yRd8Id7MFxB/zk1OVjnsjfQP+hNnm9dkmA4zbgvVK4KvvhMEBTHl6ottxyDBB5+MB74KcSLwE1qZZPsT5qJVsWL1O1dnEj55rmC2TCcdCyeetARVcaAnUbwS32kA5b3903EwrBoBKjoJObgvkm6a25SwynGVfj947qgZEtgwUe4LfjKogEiUHQXryxJWpPce4ptcAezJzDLceTbBIgQo6Sd17LewAAA";let Z=null;try{Z=new Image,Z.src=ro,Z.decode&&Z.decode().catch(()=>{})}catch{Z=null}let Ce=null,tt=null,Ne=null,Jn=0;function so(){if(tt)return tt;const t=typeof performance<"u"?performance.now():Date.now();return tt=fetch($n).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.blob()}).then(r=>typeof createImageBitmap=="function"?createImageBitmap(r):new Promise((u,p)=>{const w=URL.createObjectURL(r),k=new Image;k.onload=()=>{URL.revokeObjectURL(w),u(k)},k.onerror=()=>{URL.revokeObjectURL(w),p(new Error("decode failed"))},k.src=w})).then(r=>(Ce=r,Jn=+((typeof performance<"u"?performance.now():Date.now())-t).toFixed(1),r)).catch(r=>(Ne=String(r&&r.message||r),null)),tt}function ye(t,r){return Math.min(t/_e,r/ve)}function nt(t,r,u){const p=ye(r,u);t.scale=Math.max(p,Math.min(p*Xn,t.scale));const w=_e*t.scale,k=ve*t.scale;return t.ox=w<=r?(r-w)/2:Math.max(r-w,Math.min(0,t.ox)),t.oy=k<=u?(u-k)/2:Math.max(u-k,Math.min(0,t.oy)),t}function lo(t,r){const u=ye(t,r);return{scale:u,ox:(t-_e*u)/2,oy:(r-ve*u)/2}}function at(t,r){const u=typeof performance<"u"?performance.now():Date.now(),p=t.getContext&&t.getContext("2d");if(!p)return null;let w=1;try{w=Math.min(2,window.devicePixelRatio||1)}catch{w=1}const k=Math.max(60,Math.round(t.clientWidth||300)),l=Math.max(60,Math.round(t.clientHeight||240));(t.width!==Math.round(k*w)||t.height!==Math.round(l*w))&&(t.width=Math.round(k*w),t.height=Math.round(l*w)),p.setTransform(w,0,0,w,0,0),p.fillStyle=Pt.cream,p.fillRect(0,0,k,l),p.imageSmoothingEnabled=!0;try{p.imageSmoothingQuality="high"}catch{}const E=Ce||(Z&&Z.complete&&Z.naturalWidth?Z:null),v=!Ce&&!!E;if(E)try{p.drawImage(E,r.ox,r.oy,_e*r.scale,ve*r.scale)}catch{}const x=typeof performance<"u"?performance.now():Date.now(),A=_e*r.scale,q=ve*r.scale;return{ms:+(x-u).toFixed(2),w:k,h:l,dpr:w,loaded:!!Ce,placeholder:v,err:Ne,fetchMs:Jn,scale:+r.scale.toFixed(5),fit:+ye(k,l).toFixed(5),zoom:+(r.scale/ye(k,l)).toFixed(3),ox:+r.ox.toFixed(1),oy:+r.oy.toFixed(1),lbx:+Math.max(0,(k-A)/k).toFixed(4),lby:+Math.max(0,(l-q)/l).toFixed(4)}}const co=`
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
.lk__mark.is-park { width: 20px; height: 9px; margin-top: 2px; border-radius: 2px; background: var(--p-hazard); }
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

/* ---------------------------------------------- specs/0073 §4.1: the board
   THE LOCKER'S OWN LANGUAGE AND NO NEW SURFACE. This whole block draws on the
   cream board the fact sheet is already on (\`--lk-panel\`), with the same
   hairline (\`--lk-line\`), the same mono key type at 9-10 px, the same
   \`--lk-ink\` / \`--lk-ink-2\` / \`--lk-ink-3\` ladder and the same ink
   selection the rows wear. Greg's rule from §5.3 is that every new SLAB gets
   signed off; nothing here is one — a leaderboard row is the settings row's
   rhythm with four columns instead of two.

   The board lives inside \`.lk__facts\`, which is a two-column grid, so
   everything this spec adds spans both: a table set in one of two columns is a
   table nobody can read. */
.lk__sign, .lk__board, .lk__bnote, .lk__bcut { grid-column: 1 / -1; }

/* the sign-in chip (§2.1). One row, wrapping: the button, then the sentence.

   THE BUTTON RULES CARRY A \`.lk\` PREFIX and the rest of the block does not.
   \`.lk button { font: inherit; background: none }\` (:1346) is the locker's own
   reset and it is (0,1,1); a bare \`.lk__sign-b\` is (0,1,0) and LOSES to it,
   which is a plate that does not paint and a 14 px sans word where a 9 px mono
   one belongs. Nothing else here is a button, so nothing else needs it. */
.lk__sign {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding-bottom: 9px; margin-bottom: 3px;
  border-bottom: var(--p-hairline) solid var(--lk-line);
}
.lk .lk__sign-b {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700; letter-spacing: .16em;
  text-transform: uppercase; cursor: pointer;
  padding: 6px 10px; border: 0; border-radius: 0;
  background: var(--p-ink); color: var(--p-cream);
}
.lk .lk__sign-b:hover:not(:disabled) { background: var(--lk-acc); color: var(--p-ink); }
/* DISABLED IS THE "NOT CONFIGURED" STATE and it has to read as a statement
   rather than as a broken button: no pointer, no hover, the ink dropped to the
   quietest step on the ladder. The sentence beside it says the rest. */
.lk .lk__sign-b:disabled { background: var(--lk-wash); color: var(--lk-ink-3); cursor: default; }
.lk .lk__sign-out { background: none; color: var(--lk-ink-3); box-shadow: inset 0 0 0 var(--p-hairline) var(--lk-line-2); }
.lk__sign-n {
  font-family: var(--lk-sans); font-size: var(--p-prose); font-style: normal;
  letter-spacing: 0; color: var(--lk-ink-2);
}
/* §2.3 — the name field. Sized to sixteen characters of the row type, because
   sixteen characters is the rule. */
.lk .lk__sign-i {
  font-family: var(--lk-sans); font-size: 13px; font-weight: var(--p-weight);
  font-style: var(--p-oblique); letter-spacing: .04em; text-transform: uppercase;
  color: var(--lk-ink); background: var(--lk-wash);
  border: 0; box-shadow: inset 0 0 0 var(--p-hairline) var(--lk-line-2);
  border-radius: 0; padding: 5px 8px; width: 15ch; min-width: 0;
}
.lk .lk__sign-i:focus { outline: none; box-shadow: inset 0 0 0 var(--p-rule) var(--lk-acc); }

/* the board itself: rank . name . value . when (§4.1's four columns, in that
   order, because that is the order the sentence is read in). */
.lk__board { display: block; margin-top: 4px; }
.lk__brow-r {
  display: grid; grid-template-columns: 34px minmax(0, 1fr) 72px 62px;
  gap: 0 10px; align-items: baseline;
  padding: 5px 4px;
  border-bottom: var(--p-hairline) solid var(--lk-line);
}
.lk__b-rank, .lk__b-val, .lk__b-when {
  font-family: var(--lk-mono); font-size: 10px; font-weight: 700;
  font-variant-numeric: tabular-nums; color: var(--lk-ink);
}
.lk__b-rank { color: var(--lk-ink-3); }
.lk__b-val { text-align: right; }
.lk__b-when { text-align: right; font-size: 9px; letter-spacing: .1em;
  text-transform: uppercase; color: var(--lk-ink-3); }
.lk__b-name {
  font-family: var(--lk-sans); font-size: 12px; font-weight: var(--p-weight);
  font-style: var(--p-oblique); letter-spacing: .04em; text-transform: uppercase;
  color: var(--lk-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* YOUR row, wherever it is: the same mounting rule the selected row wears —
   a 3 px ink spine — so "this one is you" is said the way this screen already
   says "this one is picked", and no colour is invented for it. */
.lk__brow-r.is-you {
  background: var(--lk-wash);
  box-shadow: inset var(--p-spine) 0 0 var(--p-ink);
}
.lk__brow-r.is-you .lk__b-rank { color: var(--lk-ink); }
/* §4.1 — the cut above a pinned row, when you are outside the hundred. It is a
   caption on a hairline, which is the same object \`.lk__cmp\` already is. */
.lk__bcut {
  display: flex; align-items: center; gap: 8px; margin-top: 7px;
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700; letter-spacing: .16em;
  text-transform: uppercase; color: var(--lk-ink-3);
}
.lk__bcut::after { content: ""; flex: 1 1 auto; height: var(--p-hairline); background: var(--lk-line); }
.lk__bnote {
  font-family: var(--lk-sans); font-size: var(--p-prose); font-style: normal;
  letter-spacing: 0; color: var(--lk-ink-2); margin-top: 7px;
}
/* the LIST row's entrant count — the same quiet mono the trail row's kind word
   is set in, right-aligned against the board name */
.lk__brow { grid-template-columns: 22px minmax(0, 1fr) 92px 64px; gap: 0 12px; padding: 12px 8px; }
.lk__brow-n, .lk__brow .lk__trow-k {
  font-family: var(--lk-mono); font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: var(--lk-ink-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lk__brow .lk__trow-k { text-align: right; color: var(--p-sub); }

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
`;let ea=!1;function po(){if(ea||typeof document>"u")return;ea=!0;const t=document.createElement("style");t.id="lk-css",t.textContent=co,document.head.appendChild(t)}let it=null,ot="y",Bt=null;const ta=()=>{if(Bt)return Bt;let t=null;try{t=window.__guide||null}catch{t=null}return!t||!t.layTrail?null:{lay:(r,u)=>t.layTrail(r,u||{}),clear:()=>t.clearTrail(),state:()=>t.trailState()}},rt=()=>{const t=ta();return t?t.state():null};function To({THREE:t,model:r,unitScale:u,ctrl:p,onEquip:w,initial:k,world:l,upAxis:E,trail:v}){po(),l&&(it=l,ot=E==="z"?"z":"y"),v&&(Bt=v);const x=u||1;let A=!1,q=Math.max(0,R.findIndex(e=>e.id==="skis")),c="all",m="looks",g=0,_=[],B="",H=new Map,D=null;try{D=new URLSearchParams(location.search)}catch{D=null}const C={skis:k&&k.skis||Ba,glider:k&&k.glider||ja,bike:k&&k.bike||Ka,sled:k&&k.sled||(D?ni(D):Ja),snowmobile:k&&k.snowmobile||(D?di(D):ri),boots:Ni("boots")||"boots",outfit:k&&k.outfit||gi()},U=o("div","lk");U.hidden=!0;const Ut=o("section","lk__panel"),jt=o("div","lk__hd"),Gt=o("div","lk__title");Gt.innerHTML="equipment <b>locker</b>";const Wt=o("div","lk__load"),Re={};for(const e of R){if(e.id==="boots"||e.kind==="settings"||e.kind==="trail"||e.kind==="keys"||e.kind==="board")continue;const n=o("div","lk__load-i"),a=o("span","lk__load-v","—");n.append(o("span","lk__load-k",e.label),a),Wt.append(n),Re[e.id]=a}jt.append(Gt,o("span","lk__spacer"),Wt);const Kt=o("div","lk__tabs"),st=R.map((e,n)=>{const a=o("button","lk__tab");a.type="button",a.style.setProperty("--lk-tab-acc",e.accent||"#4cc9f0");const i=o("span","lk__tab-ic");i.innerHTML=Fi(e.icon);const s=o("span","lk__tab-n","0");return a.append(i.firstChild,o("span","lk__tab-l",e.label),s),a.addEventListener("click",h=>{h.stopPropagation(),be(n)}),Kt.append(a),{b:a,n:s}}),Ht=o("div","lk__main"),Vt=o("div","lk__pv"),xe=o("div","lk__stage"),Se=o("div","lk__eqflash");xe.append(Se);const Yt=o("div","lk__plate"),Zt=o("div","lk__plate-brand",""),Qt=o("div","lk__plate-name","—"),$t=o("div","lk__plate-tag","");Yt.append(Zt,Qt,$t),Vt.append(xe,Yt);const Xt=o("div","lk__mid"),ue=o("div","lk__subs");ue.hidden=!0;const Pe=o("div","lk__filters"),fe=o("div","lk__tsearch"),L=o("input","lk__tsearch-i");L.type="text",L.placeholder="search runs",L.spellcheck=!1,L.autocomplete="off",L.autocapitalize="off",L.setAttribute("aria-label","search runs");const Jt=o("span","lk__tsearch-n","");fe.append(o("span","lk__tsearch-ic","/"),L,Jt),fe.hidden=!0;const en=o("div","lk__bars");en.append(ue,Pe,fe);const G=o("div","lk__grid");Xt.append(en,G);const te=o("div","lk__det"),ne=o("div","lk__hero"),ke=o("div","lk__hero-bg"),Q=o("img","lk__hero-img");Q.alt="";const ae=o("div","lk__hero-eq","equipped");ae.hidden=!0,ne.append(ke,Q,ae);const O=o("div","lk__map"),K=o("canvas","lk__mapcv");K.setAttribute("data-map","trails");const lt=o("div","lk__map-t","palisades · winter 2025-26");O.append(K,lt),O.hidden=!0;let N=null,M=null,dt=0,ct=0,pt=null;const tn=o("div","lk__d-head"),ge=o("div","lk__d-brand",""),ht=o("div","lk__d-after",""),me=o("div","lk__d-name","—"),ie=o("div","lk__d-spec","");tn.append(ge,ht,me,ie);const oe=o("div","lk__d-blurb",""),$=o("div","lk__stats"),nn=o("div","lk__cmp"),P=o("div","lk__facts");te.append(ne,O,tn,oe,$,P);function re(){if(!A||y().kind!=="trail"||O.hidden)return null;const e=K.clientWidth||O.clientWidth||300,n=Math.round(Math.max(140,Math.min(330,e*(ve/_e))));Math.abs(O.clientHeight-n)>4&&(O.style.height=n+"px");const a=Math.max(60,Math.round(K.clientWidth||e)),i=Math.max(60,Math.round(K.clientHeight||n));return(!M||a!==dt||i!==ct)&&(M=lo(a,i),dt=a,ct=i),nt(M,a,i),N=at(K,M),!pt&&N&&(pt=N),!Ce&&!Ne?so().then(()=>{lt.textContent=Ne?"sheet unavailable":"palisades · winter 2025-26",A&&y().kind==="trail"&&!O.hidden&&re()}):Ne&&(lt.textContent="sheet unavailable"),N}const V=new Map;let Ee=0;const ut=e=>{const n=K.getBoundingClientRect();return{x:e.clientX-n.left,y:e.clientY-n.top}};function ft(e,n,a){if(!M)return;const i=N?N.w:K.clientWidth,s=N?N.h:K.clientHeight,h=M.scale,b=Math.max(ye(i,s),Math.min(ye(i,s)*Xn,h*a));b!==h&&(M.ox=e-(e-M.ox)*(b/h),M.oy=n-(n-M.oy)*(b/h),M.scale=b,nt(M,i,s),N=at(K,M))}O.addEventListener("wheel",e=>{if(O.hidden||!M)return;e.preventDefault();const n=ut(e);ft(n.x,n.y,Math.exp(-e.deltaY*.0022))},{passive:!1}),O.addEventListener("pointerdown",e=>{if(!O.hidden){if(V.set(e.pointerId,ut(e)),V.size===2){const[n,a]=[...V.values()];Ee=Math.hypot(n.x-a.x,n.y-a.y)||0}try{O.setPointerCapture(e.pointerId)}catch{}O.classList.add("is-drag")}}),O.addEventListener("pointermove",e=>{const n=V.get(e.pointerId);if(!n||!M)return;const a=ut(e);V.set(e.pointerId,a);const i=N?N.w:K.clientWidth,s=N?N.h:K.clientHeight;if(V.size>=2){const[h,b]=[...V.values()],f=Math.hypot(h.x-b.x,h.y-b.y);Ee>4&&f>4&&ft((h.x+b.x)/2,(h.y+b.y)/2,f/Ee),Ee=f;return}M.ox+=a.x-n.x,M.oy+=a.y-n.y,nt(M,i,s),N=at(K,M)});const an=e=>{V.delete(e.pointerId),V.size<2&&(Ee=0),V.size||O.classList.remove("is-drag");try{O.releasePointerCapture(e.pointerId)}catch{}};O.addEventListener("pointerup",an),O.addEventListener("pointercancel",an),O.addEventListener("dblclick",e=>{O.hidden||(e.preventDefault(),M=null,re())}),Ht.append(Vt,Xt,te);const Te=o("div","lk__foot"),na=[[["←","→","↑","↓"],"navigate"],[["enter"],"equip"],[["q","e"],"tabs"],[["f"],"filter"],[["1-9"],"quick equip"]];for(const[e,n]of na){const a=o("span","lk__hint");for(const i of e)a.append(o("kbd","lk__key",i));a.append(o("span",null,n)),Te.append(a)}const Ae=o("span","lk__hint");Ae.append(o("kbd","lk__key","t"),o("span",null,"go there")),Ae.hidden=!0,Te.append(Ae),Te.append(o("span","lk__foot-sp"));const on=o("span","lk__hint");on.append(o("kbd","lk__key","esc"),o("span",null,"close")),Te.append(on),Ut.append(jt,Kt,Ht,Te),U.append(Ut),document.body.appendChild(U);let d=null;function aa(){const e=new t.Scene;e.add(new t.HemisphereLight(16777215,3816004,1.35));const n=new t.DirectionalLight(16777215,1.05);n.position.set(3,5,4);const a=new t.DirectionalLight(16767432,.5);a.position.set(-4,2,-3),e.add(n,a);const i=new t.Group;e.add(i);const s=r?r.clone(!0):new t.Group,h=r&&r.getObjectByName("play:body"),b=h?wi(h):null,f=b?bi(b):null;if(f){const I=s.getObjectByName("play:body");I&&I.parent?(I.parent.add(f.model),I.parent.remove(I)):s.add(f.model),f.skeleton.pose(),f.model.updateMatrixWorld(!0)}s.position.set(0,0,0),s.rotation.set(0,0,0);const S=[];s.traverse(I=>{const vn=fi(I.name||"")!=null&&r.getObjectByName(I.name);vn?S.push([I,vn]):I.visible=!0});const z=new Set;f&&f.model.traverse(I=>{I.isMesh&&/^rider:/.test(I.name||"")&&I.material&&z.add(I.material)});const F=f?new Map([...f.riderMats].filter(([,I])=>z.has(I))):new Map,St=f?f.riderToggles:[],pe=/^play:(?:fp-|tp-)|^play:ski-[lr]$|^play:rocket-pack$/;s.traverse(I=>{I.name&&pe.test(I.name)&&(I.visible=!1)});const We=s.getObjectByName("play:tp-glider"),he=s.getObjectByName("play:body"),Ra=s.getObjectByName("play:rocket-pack"),Et=he?he.getObjectByName("rider:body"):null,Pa=Et?new t.AnimationMixer(Et):null,_n=new Map;for(const I of he&&he.animations||[])_n.set(I.name,I);i.add(s);const Tt=yn(t,x),At=yn(t,x);Tt.position.set(-.15*x,.02*x,0),At.position.set(.15*x,.02*x,0),i.add(Tt,At);const Mt=Ya(t,x);Mt.visible=!1,i.add(Mt);const Lt=ai(t,x);Lt.visible=!1,i.add(Lt);const It=ci(t,x,{model:C.snowmobile});It.visible=!1,i.add(It);const qa=new t.PerspectiveCamera(34,1,.05*x,80*x),Ke=new t.WebGLRenderer({alpha:!0,antialias:!0});Ke.setPixelRatio(Math.min(2,window.devicePixelRatio||1)),Ke.domElement.className="lk__canvas",xe.insertBefore(Ke.domElement,Se),d={scene:e,camera:qa,renderer:Ke,turntable:i,skiL:Tt,skiR:At,bike:Mt,sled:Lt,snow:It,cGlide:We,cBody:he,cPack:Ra,cSkin:Et,mixer:Pa,clips:_n,clip:null,want:null,riderPairs:S,riderMats:F,riderToggles:St,tryOn:null,t:0,kick:0},qe()}function qe(){if(!d)return;const e=Math.max(80,xe.clientWidth),n=Math.max(80,xe.clientHeight),a=Math.max(80,Math.min(n,Math.round(e*4/3)));d.renderer.setSize(e,a,!1),d.renderer.domElement.style.height=a+"px",d.renderer.domElement.style.top=Math.round((n-a)/2)+"px",d.camera.aspect=e/a,d.camera.updateProjectionMatrix()}function ia(e){if(!d||!d.mixer||d.want===e)return;d.want=e;const n=d.clips.get(e)||d.clips.get("idle-boots")||d.clips.get("ski-stance");if(!n||d.clip===n.name)return;d.mixer.stopAllAction();const a=d.mixer.clipAction(n);a.reset(),a.enabled=!0,a.setEffectiveWeight(1),a.play(),d.clip=n.name,d.mixer.setTime(0)}function oa(e,n){if(!d)return;const a=e.kind==="outfit",i=e.kind==="ski"||a,s=e.kind==="glider"&&n?n.preview:null,h=s==="wing",b=e.kind==="bike",f=e.kind==="sled",S=e.kind==="snowmobile",z=b||f||S;if(d.skiL.visible=d.skiR.visible=i,d.cGlide&&(d.cGlide.visible=h),d.cBody&&(d.cBody.visible=!0),d.cPack&&(d.cPack.visible=s==="pack"),ia(b?"seat-bike":f?"seat-sled":S?"seat-snowmobile":h?"prone-glider":"idle-boots"),d.cBody&&(d.cBody.position.set(0,h?1.05*x:0,0),d.cBody.rotation.x=d.cBody.rotation.y=d.cBody.rotation.z=0,b&&n)){const F=$a(Qa(n.id));d.cBody.position.y+=(F.hip[0]-1.053)*x,d.cBody.position.z+=(F.hip[1]-.305)*x}if(d.bike.visible=b,d.sled.visible=f,d.snow.visible=S,b&&n&&Za(t,d.bike,n.id),f&&n&&ii(t,d.sled,n.id),S&&n&&pi(t,d.snow,n.id),i&&n){const F=a?C.skis:n.id;xn(t,d.skiL,F),xn(t,d.skiR,F)}if(a&&n){const F=m==="looks"?n.id:sa(n.id);He(t,d,F),d.tryOn=F}else d.tryOn!=null&&(He(t,d,window.__player?.outfit),d.tryOn=null)}const ra=.28;let Fe=0,kt=0;function rn(e){if(!A){Fe=0;return}Fe=requestAnimationFrame(rn);const n=Math.min(.05,(e-kt)/1e3||0);if(kt=e,!d)return;d.hold==null&&(d.t+=n),d.turntable.rotation.y=d.hold==null?d.turntable.rotation.y+n*(ra+d.kick):d.hold,d.mixer&&(d.hold==null?d.mixer.update(n):d.mixer.setTime(0)),d.kick*=Math.exp(-n*3.4),d.kick<.001&&(d.kick=0);const a=Math.tan(d.camera.fov*Math.PI/180/2),i=Math.max(1.12/a,1.3/(a*Math.max(.25,d.camera.aspect)))*x;if(d.camera.position.set(0,(1.3+.012*Math.sin(d.t*.7))*x,i),d.camera.lookAt(0,.86*x,0),d.tryOn==null)for(const[s,h]of d.riderPairs)s.visible=h.visible;d.renderer.render(d.scene,d.camera)}const y=()=>R[q],Y=new Set;function X(e){try{const n=e.items(e.kind==="outfit"?m:void 0);if(Array.isArray(n))return Y.delete(e.id),n}catch(n){Y.has(e.id)||console.warn(`[locker] rack "${e.id}" unavailable:`,n&&n.message)}return Y.add(e.id),[]}function sn(e){const n=[];for(const a of e)a.group&&!n.includes(a.group)&&n.push(a.group);return n}function ze(){const e=y();if(e.kind!=="outfit")return C[e.id];const n=Ct(C.outfit);return m==="looks"?n.every(a=>a===n[0])?n[0]:null:n[Ve.indexOf(m)]}const sa=e=>mi(Ct(C.outfit).map((n,a)=>a===Ve.indexOf(m)?e:n));function la(){const e=y().kind==="outfit";if(ue.hidden=!e,!!e){ue.textContent="",ue.append(o("kbd","lk__key","g"));for(const n of Oe){const a=o("button","lk__chip");a.type="button",a.style.setProperty("--g",y().accent||"#4cc9f0"),a.append(document.createTextNode(n)),a.classList.toggle("is-on",m===n),a.addEventListener("click",i=>{i.stopPropagation(),gt(n)}),ue.append(a)}}}function gt(e){return Oe.includes(e)&&e!==m&&(m=e,g=0,Ie()),m}function da(){const e=y().accent||"#4cc9f0";U.style.setProperty("--lk-acc",e),U.style.setProperty("--lk-acc-soft",Qe(e,.18)),U.style.setProperty("--lk-acc-dim",Qe(e,.34))}function ca(){R.forEach((e,n)=>{st[n].n.textContent=String(X(e).length),st[n].b.hidden=Y.has(e.id)})}function mt(){for(const e of R){if(!Re[e.id])continue;const n=X(e).find(a=>a.id===C[e.id]);Re[e.id].parentElement.hidden=Y.has(e.id),Re[e.id].textContent=e.kind==="outfit"?pa():n?n.name:"—"}}function pa(){const e=[...new Set(Ct(C.outfit))];if(e.length>1)return"mix · "+e.length+" houses";const n=ui[e[0]];return n?Xe(n)+" · "+n.name:"—"}function ha(){const e=X(y()),n=sn(e);if(Pe.textContent="",Pe.hidden=n.length<2,n.length<2)return;const a={all:e.length};for(const i of n)a[i]=e.filter(s=>s.group===i).length;for(const i of y().noAll?n:["all",...n]){const s=o("button","lk__chip");s.type="button",s.style.setProperty("--g",i==="all"?y().accent||"#4cc9f0":qt(i)),s.append(document.createTextNode(i),o("i",null,String(a[i]))),s.classList.toggle("is-on",c===i),s.addEventListener("click",h=>{h.stopPropagation(),c=i,g=0,Ie()}),Pe.append(s)}}const ln=new WeakMap;function dn(e,n){const a=ln.get(e);if(!a)return;const i=Ye(n);a.el.classList.toggle("is-on",i),a.v.textContent=i?"on":"off",e.setAttribute("aria-checked",i?"true":"false")}function ua(e,n){const a=o("button","lk__row");a.type="button",a.setAttribute("role","switch");const i=o("span","lk__row-txt");i.append(o("span","lk__row-t",e.name),o("span","lk__row-d",e.desc||""));const s=o("span","lk__sw"),h=o("span","lk__sw-v","off");return s.append(o("span","lk__sw-t"),h),ln.set(a,{el:s,v:h}),a.append(i,s),dn(a,e.key),a.addEventListener("click",b=>{b.stopPropagation(),g=n,T(),le()}),a.addEventListener("mouseenter",()=>{g=n,T()}),G.append(a),a}function De(e){let n=null;try{n=window.__playMarkers&&window.__playMarkers.fastTravel(e.slug)}catch{n=null}if(!n&&e.at&&window.__player&&typeof window.__player.teleport=="function")try{window.__player.teleport(e.at.x,e.at.y,e.at.z),n=!0}catch{n=null}return ce(),!!n}function fa(e){let n=null;try{const a=window.__guide;a&&typeof a.startTutorial=="function"&&(n=a.startTutorial(e.tut))}catch{n=null}return ce(),n}function ka(e){if(!e)return null;if(e.section==="tutorials"&&e.tut)return fa(e);if(!e.canEquip)return De(e);const n=ta();if(!n)return De(e);const a=n.lay(e.segments&&e.segments.length>1?e.segments:e.id,{name:e.name});if(se(),De(e),a&&a.start&&Number.isFinite(a.start.yaw))try{window.__player.setYaw(a.start.yaw)}catch{}return a}let bt=!1;G.addEventListener("pointermove",()=>{bt=!0},{passive:!0});function ga(e){const n=String(e.name||""),a=H.get(e);if(!a||!a.length)return o("span","lk__trow-n",n);const i=o("span","lk__trow-n"),s=new Set(a);let h="",b=s.has(0);for(let f=0;f<=n.length;f++){const S=f<n.length&&s.has(f);(f===n.length||S!==b)&&(h&&i.append(b?o("i","lk__hl",h):document.createTextNode(h)),h="",b=S),f<n.length&&(h+=n[f])}return i}function ma(e,n){const a=!!B.trim(),i=_[n-1];!a&&(!i||i.section!==e.section)&&G.append(o("div","lk__tsec",e.section==="tutorials"?"tutorials · learn the run":e.section==="places"?"places · fast travel":"runs · equip a trail"));const s=o("button","lk__row lk__trow");s.type="button",s.setAttribute("data-slug",e.slug),s.setAttribute("data-id",e.id),s.setAttribute("data-sec",e.section||"runs");const h=we[e.diff]||null,b=o("span","lk__mark"+(h?" "+h.cls:""));h&&b.setAttribute("aria-label",h.label);const f=o("span","lk__row-txt");f.append(ga(e)),e.also&&f.append(o("span","lk__trow-a",e.also)),s.append(b,f,o("span","lk__trow-k",e.kind||""),o("span","lk__trow-s",e.slug));const S=rt();return S&&S.id===e.id&&s.classList.add("is-eqt"),s.addEventListener("click",z=>{z.stopPropagation(),g=n,T(),le()}),s.addEventListener("mouseenter",()=>{bt&&(g=n,T())}),G.append(s),s}let W=null,Be=!1;const cn=new WeakMap,ba=new Set(["Escape","Tab","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"]);function pn(e,n){const a=cn.get(e);if(!a||!n)return;if(n.isReset){a.textContent="RESET";return}const i=W===n.action;a.textContent=i?"PRESS A KEY":Ze(n.action),a.classList.toggle("is-live",i),e.classList.toggle("is-rebound",!i&&!Rt(n.action))}function Ue(){y().kind==="keys"&&j.forEach((e,n)=>pn(e,_[n]))}function hn(){W!==null&&(W=null,Ue(),T())}function un(e){const n=W;W=null,n&&Ei(n,e),Ue(),T()}function wa(e){if(W!==null){if(e.preventDefault(),e.stopPropagation(),e.type!=="pointerdown")return;Be=!0;const n=Si(e.button);n?un(n):hn();return}if(e.type==="pointerdown"){Be=!1;return}Be&&(e.preventDefault(),e.stopPropagation(),e.type==="click"&&(Be=!1))}for(const e of["pointerdown","pointerup","click","contextmenu"])U.addEventListener(e,wa,!0);function _a(e,n){const a=o("button","lk__row lk__krow"+(e.isReset?" is-rst":""));a.type="button",a.setAttribute("data-action",e.action||"reset");const i=o("span","lk__row-txt");i.append(o("span","lk__row-t",e.name));const s=o("span","lk__kchip");return a.append(i,s),cn.set(a,s),pn(a,e),a.addEventListener("click",h=>{h.stopPropagation(),g=n,T(),le()}),a.addEventListener("mouseenter",()=>{W===null&&(g=n,T())}),G.append(a),a}function va(e,n){const a=o("button","lk__row lk__brow");a.type="button",a.setAttribute("data-board",e.board),a.setAttribute("data-target",e.target||"");const i=we[e.diff]||null,s=o("span","lk__mark"+(i?" "+i.cls:""));i&&s.setAttribute("aria-label",i.label);const h=o("span","lk__row-txt");h.append(o("span","lk__row-t",e.name));const b=o("span","lk__brow-n",e.n==null?"":e.n+(e.n===1?" skier":" skiers"));return a.append(s,h,b,o("span","lk__trow-k",e.tail||"")),a.addEventListener("click",f=>{f.stopPropagation(),g=n,T()}),a.addEventListener("mouseenter",()=>{g=n,T()}),G.append(a),a}let j=[],wt=[];function se(){const e=y(),n=X(e);wt=Di(n),_=c==="all"?n:n.filter(i=>i.group===c),_.length||(_=n),H=new Map,bt=!1;const a=_.length;if(e.kind==="trail"&&B.trim()){const i=[];for(const s of _){const h=oo(s,B.trim());h&&i.push({it:s,m:h})}i.sort((s,h)=>h.m.score-s.m.score||String(s.it.name).length-String(h.it.name).length||String(s.it.name).localeCompare(String(h.it.name))),_=i.map(s=>(H.set(s.it,s.m.pos),s.it))}if(Jt.textContent=e.kind==="trail"&&B.trim()?`${_.length}/${a}`:"",g=Math.max(0,Math.min(g,_.length-1)),G.textContent="",G.classList.toggle("is-rows",e.kind==="settings"||e.kind==="trail"||e.kind==="keys"||e.kind==="board"),G.classList.toggle("is-trails",e.kind==="trail"),e.kind==="settings"){j=_.map(ua),T();return}if(e.kind==="trail"){j=_.map(ma),T();return}if(e.kind==="keys"){j=_.map(_a),T();return}if(e.kind==="board"){j=_.map(va),T();return}j=_.map((i,s)=>{const h=qt(i.group),b=o("button","lk__card");b.type="button",b.style.setProperty("--g",h),b.style.setProperty("--g-wash",Qe(h,.16)),b.style.setProperty("--g-glow",Qe(h,.55));const f=o("span","lk__art"),S=o("img","lk__img");S.alt="",i.thumb?S.src=i.thumb:S.hidden=!0,f.append(S),i.group&&f.append(o("span","lk__gchip",i.group));const z=[o("span","lk__brand",i.brand||"")];return i.after&&z.push(o("span","lk__after",i.after)),b.append(f,...z,o("span","lk__name",i.name),o("span","lk__tag",i.tag||"")),ze()===i.id&&(b.append(o("span","lk__eq","equipped")),b.classList.add("is-eq")),b.addEventListener("click",F=>{F.stopPropagation(),g=s,T(),le()}),b.addEventListener("mouseenter",()=>{g=s,T()}),G.append(b),b}),T()}const fn=[];function ya(e){const n=X(y()).find(i=>i.id===C[y().id])||null,a=n&&n.id===e.id;$.textContent="",fn.length=0;for(const i of wt){const s=Pn(i,e.stats[i.key]),h=n&&Ft(n.stats[i.key])?Pn(i,n.stats[i.key]):s,b=o("div","lk__stat"),f=o("span","lk__stat-t"),S=o("i"),z=o("u"),F=Math.min(s,h);S.style.width=(F*100).toFixed(1)+"%",!a&&Math.abs(s-h)>.004?(z.style.left=(F*100).toFixed(1)+"%",z.style.width=(Math.abs(s-h)*100).toFixed(1)+"%",z.classList.add(s>h?"is-up":"is-down")):S.style.width=(s*100).toFixed(1)+"%",f.append(S,z);const St=o("span","lk__stat-v",String(Math.round(s*100))),pe=Math.round((s-h)*100),We=o("span","lk__stat-d",a||pe===0?"":(pe>0?"+":"−")+Math.abs(pe));!a&&pe!==0&&We.classList.add(pe>0?"is-up":"is-down");const he=i.src&&Ft(e.stats[i.src])?e.stats[i.src]:e.stats[i.key];b.title=`${i.label}: ${he.toFixed(2)}${i.suffix||""}`,b.append(o("span","lk__stat-k",i.label),f,St,We),$.append(b),fn.push(b)}wt.length&&(nn.textContent=a||!n?"equipped":"vs "+n.name,$.append(nn))}function xa(e){te.style.setProperty("--g",y().accent),Q.hidden=!0,ke.style.backgroundImage="none",ae.hidden=!0,ne.hidden=!0,$.textContent="",ge.textContent="settings",me.textContent=e.name,ie.textContent=Ye(e.key)?"on":"off",oe.textContent=e.desc||"",P.textContent="";for(const[n,a]of[["state",Ye(e.key)?"on":"off"],["default",e.def?"on":"off"]]){const i=o("div","lk__fact");i.append(o("span","k",n),o("span","v",a)),P.append(i)}}function Sa(e){if(te.style.setProperty("--g",y().accent),Q.hidden=!0,ke.style.backgroundImage="none",ae.hidden=!0,ne.hidden=!0,$.textContent="",ge.textContent="keybind",me.textContent=e.name,P.textContent="",e.isReset){ie.textContent="every action",oe.textContent="Puts all nineteen controls back to the keys this build ships with, and clears the saved layout from this device.";return}const n=W===e.action;ie.textContent=n?"press a key":Ze(e.action);const a=Ai(e.action);oe.textContent=n?"Press any key, or a mouse button, to bind it. If that key is already doing another job the two SWAP — nothing is left without a key. Escape cancels.":a?"Click the row to rebind the SECOND key. ESC opens the board on every machine and cannot be moved or taken, so it stays; the key beside it is yours, it swaps with whatever already holds it, and every legend follows.":"Click the row to rebind. A key already in use swaps with this one, and every legend in the game — the intro card, the ESC board, the strip along the bottom — follows what you bind.";const i=(yi[e.action]||[]).map(xi);for(const[s,h]of[["key",Ze(e.action)],["default",[...new Set(i)].join(" · ")||"—"],["code",In(e.action).join(" · ")||"—"],["saved",Rt(e.action)?"shipped":"yours"]]){const b=o("div","lk__fact");b.append(o("span","k",s),o("span","v",String(h))),P.append(b)}}function Ea(e){te.style.setProperty("--g",y().accent),Q.hidden=!0,ke.style.backgroundImage="none",ae.hidden=!0,ne.hidden=!0,O.hidden=!1,$.textContent="",ge.textContent=e.kind||"waypoint",me.textContent=e.name,ie.textContent=e.diff?we[e.diff]?we[e.diff].label:e.diff:"unrated";const n=rt(),a=!!(n&&n.id===e.id);oe.textContent=e.section==="tutorials"?"The guided run. One click equips it, stands you at the top and starts the lesson: "+(e.also||"the run, taught")+". Hold X any time to leave it; finishing lands you in free ride at the base.":e.canEquip?a?"Equipped. The dye and the chevrons are down this run. Click it again to go back to the top. F clears them — unless you are standing at a lift base, where F still boards.":"One click equips this run and drops you in at the top of it: dye and chevrons the whole way down, and the locker gets out of the way.":"Fast travel. You arrive short of the sign, on the floor, looking at it. T does the same.",P.textContent="";const i=e.at||{},s=[["slug",e.slug],["also",e.also||"—"],["road",e.section==="tutorials"?"tutorial · enter":e.viaSign?"sign · T":"waypoint"],["east",Number.isFinite(i.x)?Math.round(i.x)+" m":"—"],["north",Number.isFinite(i.z)?Math.round(-i.z)+" m":"—"]];a?(s.push(["trail",Math.round(n.lengthM)+" m"]),s.push(["chevrons",n.arrows+" · every "+n.spacingM+" m"]),s.push(["dye",n.widthM+" m wide"])):e.canEquip&&s.push(["trail","click to equip · go"]);for(const[h,b]of s){const f=o("div","lk__fact");f.append(o("span","k",h),o("span","v",String(b))),P.append(f)}Ta(e),re()}function Ta(e){if(!e||!e.canEquip)return;const n=je();if(!n||!n.hasApi())return;const a=++Me,i="trick:"+e.id,s=b=>{if(a!==Me)return;const f=(b&&Array.isArray(b.rows)?b.rows:[]).slice(0,3);if(!f.length)return;P.append(o("div","lk__bcut","top tricks"));const S=o("div","lk__board");for(const z of f)S.append(vt("trick",z,gn(z)));P.append(S)},h=J.get(i);if(h&&Date.now()-h.at<kn){s(h.data);return}n.board("trick",e.id).then(b=>{J.set(i,{at:Date.now(),data:b}),s(b)}).catch(()=>{})}let Me=0;const J=new Map,kn=2e4,je=()=>{try{return window.__playNet||null}catch{return null}},Aa=e=>{const n=Math.max(0,Number(e)||0)/1e3,a=Math.floor(n/60),i=n-a*60;return a>0?`${a}:${i.toFixed(2).padStart(5,"0")}`:i.toFixed(2)+"s"},Ma=e=>String(Math.round(Number(e)||0)).replace(/\B(?=(\d{3})+(?!\d))/g,","),La=(e,n)=>e==="race"?Aa(n):Ma(n),Ia=[[864e5*365,"y"],[864e5*30,"mo"],[864e5,"d"],[36e5,"h"],[6e4,"m"]];function Oa(e){const n=Date.now()-(Number(e)||0);if(n<6e4)return"just now";for(const[a,i]of Ia)if(n>=a)return Math.floor(n/a)+i+" ago";return"just now"}function Ca(e){te.style.setProperty("--g",y().accent),Q.hidden=!0,ke.style.backgroundImage="none",ae.hidden=!0,ne.hidden=!0,$.textContent="",ge.textContent=e.board==="race"?"race times":e.board==="trick"?"trick scores":"overall",me.textContent=e.name,ie.textContent=e.sub||"",oe.textContent=e.board==="race"?"Fastest clean run per skier. A single missed gate is no time — the run does not land on this board.":e.board==="trick"?"Best single combo per skier on this run. The run is the one the combo STARTED on.":"Best single combo per skier, anywhere on the mountain — off-piste lines included.",P.textContent="";const n=++Me,a=e.board+":"+(e.target||"");P.append(mn());const i=je();if(!i||!i.hasApi()){P.append(Le("no leaderboard server in this build"));return}const s=J.get(a);if(s&&Date.now()-s.at<kn){_t(e,s.data);return}P.append(Le("loading…")),i.board(e.board,e.target).then(h=>{n===Me&&(J.set(a,{at:Date.now(),data:h}),_t(e,h))}).catch(()=>{n===Me&&_t(e,null)}),(!Je||Date.now()-Kn>6e4)&&(Kn=Date.now(),i.boardIndex().then(h=>{h&&(Je=h,se())}).catch(()=>{}))}const Le=e=>o("div","lk__bnote",e);function _t(e,n){if(P.textContent="",P.append(mn()),!n){P.append(Le("the leaderboard is not answering — the game does not need it"));return}const a=Array.isArray(n.rows)?n.rows:[];if(!a.length){P.append(Le(e.board==="race"?"no clean runs yet. Be first.":"no scores yet. Be first."));return}const i=o("div","lk__board");for(const s of a)i.append(vt(e.board,s,gn(s)));n.you&&n.youIn===!1&&(i.append(o("div","lk__bcut","you")),i.append(vt(e.board,n.you,!0))),P.append(i),P.append(Le(n.n+(n.n===1?" skier":" skiers")+" on this board"))}function gn(e){const n=je(),a=n&&n.player();return!!(a&&Number(a.id)===Number(e.pid))}function vt(e,n,a){const i=o("div","lk__brow-r"+(a?" is-you":""));return i.append(o("span","lk__b-rank","#"+n.rank),o("span","lk__b-name",n.name||"—"),o("span","lk__b-val",La(e,n.value)),o("span","lk__b-when",Oa(n.at))),i}function mn(){const e=o("div","lk__sign"),n=je();if(!n)return e.append(o("span","lk__sign-n","SIGN-IN NOT CONFIGURED")),e;const a=n.player();if(!a){const f=o("button","lk__sign-b",n.canSignIn()?"GOOGLE SIGN-IN":"SIGN-IN NOT CONFIGURED");f.type="button",f.disabled=!n.canSignIn();const S=o("span","lk__sign-n",n.canSignIn()?"sign in to post your times and scores":"the boards still load — posting is off");return f.addEventListener("click",async z=>{z.stopPropagation(),f.disabled=!0,f.textContent="SIGNING IN…";const F=await n.signIn();if(F.ok){J.clear(),T(),se();return}f.disabled=!1,f.textContent="GOOGLE SIGN-IN",S.textContent=F.why==="cancelled"?"sign-in cancelled":F.why==="blocked"?"the Google script did not load":F.why==="offline"?"the leaderboard server is not answering":"sign-in did not go through"}),e.append(f,S),e}const i=o("input","lk__sign-i");i.type="text",i.value=a.name,i.maxLength=16,i.setAttribute("aria-label","display name"),i.addEventListener("keydown",f=>f.stopPropagation()),i.addEventListener("click",f=>f.stopPropagation());const s=o("span","lk__sign-n",n.queued()?n.queued()+" result(s) waiting to post":"signed in"),h=o("button","lk__sign-b","SAVE NAME");h.type="button",h.addEventListener("click",async f=>{if(f.stopPropagation(),i.value===a.name){s.textContent="that is already your name";return}h.disabled=!0;const S=await n.rename(i.value);if(h.disabled=!1,S.ok){J.clear(),s.textContent="name changed",T();return}s.textContent=S.why==="taken"?"that name is taken":S.why==="shape"?"3-16 letters, digits, space, apostrophe or hyphen":S.why==="cooldown"?"one name change a day — try again tomorrow":"the name did not change",i.value=a.name});const b=o("button","lk__sign-b lk__sign-out","SIGN OUT");return b.type="button",b.addEventListener("click",f=>{f.stopPropagation(),n.signOut(),J.clear(),T(),se()}),e.append(i,h,b,s),e}function T(){j.forEach((i,s)=>i.classList.toggle("is-sel",s===g));const e=_[g];if(Ae.hidden=y().kind!=="trail"||!e||!!e.canEquip,!e)return;if(j[g]&&j[g].scrollIntoView&&j[g].scrollIntoView({block:"nearest"}),O.hidden=y().kind!=="trail",y().kind==="keys"){Sa(e);return}if(y().kind==="board"){Ca(e);return}if(y().kind==="settings"){xa(e);return}if(y().kind==="trail"){Ea(e);return}ne.hidden=!1;const n=qt(e.group);te.style.setProperty("--g",n);const a=ze()===e.id;Q.hidden=!e.thumb,e.thumb&&(Q.src=e.thumb),ke.style.backgroundImage=e.thumb?`url(${e.thumb})`:"none",ae.hidden=!a,ge.textContent=e.brand||"",ht.textContent=e.after||"",ht.hidden=!e.after,me.textContent=e.name,ie.textContent=e.spec||e.tag||"",oe.textContent=e.blurb||"",Zt.textContent=e.brand||"",Qt.textContent=e.name,$t.textContent=(e.tag||"")+(a?" · equipped":""),ya(e),P.textContent="";for(const[i,s]of e.facts||[]){const h=o("div","lk__fact");h.append(o("span","k",i),o("span","v",String(s))),P.append(h)}oa(y(),e)}function Ie(){st.forEach((e,n)=>e.b.classList.toggle("is-on",n===q)),Ae.hidden=!0,da(),ca(),la(),ha(),fe.hidden=y().kind!=="trail",se(),mt()}function yt(e){const n=String(e??"");L.value!==n&&(L.value=n),B!==n&&(B=n,g=0,se())}const bn=()=>{try{return typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches}catch{return!1}};function Ge(e){if(fe.hidden||!e&&bn())return!1;try{L.focus({preventScroll:!0}),L.select()}catch{return!1}return document.activeElement===L}L.addEventListener("keydown",e=>{e.stopPropagation();const n=e.code;if(n==="Escape"){if(e.preventDefault(),L.value){yt("");return}L.blur(),ce();return}if(n==="Enter"||n==="NumpadEnter"){e.preventDefault(),_.length&&le();return}if(n==="ArrowDown"||n==="ArrowUp"){if(e.preventDefault(),!_.length)return;g=n==="ArrowDown"?Math.min(_.length-1,g+1):Math.max(0,g-1),T();return}n==="Tab"&&e.preventDefault(),n==="Slash"&&e.preventDefault()}),L.addEventListener("input",()=>yt(L.value)),L.addEventListener("click",e=>e.stopPropagation());function be(e,n=1){const a=q;W=null;let i=(e%R.length+R.length)%R.length;for(let f=0;f<R.length&&(X(R[i]),!!Y.has(R[i].id));f++)i=((i+n)%R.length+R.length)%R.length;q=i,c=R[i].defaultFilter||"all",R[i].kind!=="trail"&&(B="",L.value="",L.blur());const s=rt(),h=R[i].kind==="trail"&&s?s.id:ze(),b=X(y());g=Math.max(0,b.findIndex(f=>f.id===h)),Ie(),a!==q&&(G.classList.remove("is-swap"),G.offsetWidth,G.classList.add("is-swap"))}function le(){const e=y(),n=_[g];if(!n)return;if(e.kind==="trail"){ka(n);return}if(e.kind==="board"){J.delete(n.board+":"+(n.target||"")),T();return}if(e.kind==="keys"){const s=j[g];n.isReset?(Ti(),W=null,Ue(),s&&(s.classList.remove("is-go"),s.offsetWidth,s.classList.add("is-go"))):(W=W===n.action?null:n.action,Ue()),T();return}if(e.kind==="settings"){vi(n.key,!Ye(n.key));const s=j[g];s&&(dn(s,n.key),s.classList.remove("is-go"),s.offsetWidth,s.classList.add("is-go")),T();return}C[e.id]=n.id,e.remember?e.remember(n.id):e.kind==="ski"?Da(n.id):e.kind==="glider"?Ga(n.id):e.kind==="bike"?Va(n.id):Ci(e.id,n.id),e.apply&&e.apply(n.id,e.kind==="outfit"?m:void 0),e.kind==="outfit"&&(C.outfit=window.__player&&window.__player.outfit||n.id);const a=e.kind==="outfit"?n.brand+" "+(m==="looks"?n.name:n.tag):n.name;w&&w({tab:e.id,gear:n.gear||e.gear||p&&p.mode,kind:e.kind,id:n.id,name:a}),Na(),T(),mt(),d&&e.kind==="outfit"&&d.tryOn===C.outfit&&(d.tryOn=null);const i=j[g];i&&(i.classList.remove("is-go"),i.offsetWidth,i.classList.add("is-go")),Se.classList.remove("is-go"),Se.offsetWidth,Se.classList.add("is-go"),d&&(d.kick=2.6)}function Na(){j.forEach((e,n)=>{const a=e.querySelector(".lk__eq"),i=ze()===_[n].id;i&&!a?e.append(o("span","lk__eq","equipped")):!i&&a&&a.remove(),e.classList.toggle("is-eq",i)})}function wn(){if(y().kind==="settings"||y().kind==="trail"||y().kind==="keys"||y().kind==="board"||!j.length)return 1;const e=j[0].offsetWidth||1,n=10;return Math.max(1,Math.round((G.clientWidth+n)/(e+n)))}let de=0;function xt(){A||(A=!0,de&&(clearTimeout(de),de=0),U.hidden=!1,U.classList.remove("is-out"),M=null,dt=0,ct=0,d?qe():aa(),d&&(He(t,d,window.__player?.outfit),d.tryOn=null),window.__player&&window.__player.outfit&&(C.outfit=window.__player.outfit),be(q),U.offsetWidth,U.classList.add("is-in"),kt=performance.now(),Fe||(Fe=requestAnimationFrame(rn)),requestAnimationFrame(()=>{qe(),re()}))}function ce(){A&&(A=!1,W=null,B="",L.value="",L.blur(),d&&(d.hold=null),d&&d.tryOn!=null&&(He(t,d,window.__player?.outfit),d.tryOn=null),U.classList.remove("is-in"),U.classList.add("is-out"),de&&clearTimeout(de),de=setTimeout(()=>{de=0,A||(U.hidden=!0,U.classList.remove("is-out"))},150))}return addEventListener("resize",()=>{A&&(qe(),re())}),window.__locker=Object.assign(window.__locker||{},{turntable(e){return xt(),d.hold=e==null?null:Number(e),d.t=0,new Promise(n=>requestAnimationFrame(()=>requestAnimationFrame(()=>n(d.turntable.rotation.y))))},tryOn:()=>d?d.tryOn:null,mannequin:()=>d?{body:d.cBody,skin:d.cSkin,clip:d.clip,want:d.want,baked:[...d.clips.keys()],pairs:d.riderPairs.length,mats:d.riderMats.size,toggles:d.riderToggles.length,pos:d.cBody?[d.cBody.position.x,d.cBody.position.y,d.cBody.position.z]:null,visible:!!(d.cBody&&d.cBody.visible),pack:!!(d.cPack&&d.cPack.visible),glider:!!(d.cGlide&&d.cGlide.visible)}:null,sub:()=>m,setSub:gt,thumbMs:()=>Gn,mapSheet:()=>N?{...N,url:$n,first:pt}:null,mapDraw:()=>re(),mapZoomAt:(e,n,a)=>(ft(e,n,a),N),mapPanBy:(e,n)=>!M||!N?null:(M.ox+=e,M.oy+=n,nt(M,N.w,N.h),N=at(K,M),N),mapReset:()=>(M=null,re()),trail:()=>rt(),keys:()=>({listening:W,rows:Ln.map(e=>({id:e.id,name:e.name,chip:Ze(e.id),codes:In(e.id),isDefault:Rt(e.id)}))}),rows:()=>Dt(it,ot).map(e=>({id:e.id,name:e.name,diff:e.diff,section:e.section,segments:e.segments.slice(),canEquip:e.canEquip})),search:()=>({shown:!fe.hidden,focused:document.activeElement===L,q:L.value,placeholder:L.placeholder,n:_.length,names:_.map(e=>e.name),hl:_.map(e=>(H.get(e)||[]).map(n=>String(e.name)[n]).join("")),sel:_[g]?_[g].name:null,coarse:bn()}),setSearch:e=>(yt(e),_.map(n=>n.name)),focusSearch:e=>Ge(e!==!1)}),{root:U,isOpen:()=>A,open:xt,close:ce,toggle(){return A?ce():xt(),A},key(e){if(!A)return!1;if(W!==null)return e==="Escape"?(hn(),!0):(ba.has(e)||un(e),!0);if(e==="Escape"||e==="KeyI")return ce(),!0;if(e==="KeyM"){if(y().kind==="trail")return ce(),!0;const a=R.findIndex(i=>i.kind==="trail"&&!Y.has(i.id));return a>=0&&(be(a),Ge()),!0}if(e==="Slash")return y().kind==="trail"&&Ge(!0),!0;if(e==="KeyQ")return be(q-1,-1),!0;if(e==="KeyE"||e==="Tab")return be(q+1,1),!0;if(e==="KeyF"){const a=["all",...sn(X(y()))];return c=a[(a.indexOf(c)+1)%a.length],g=0,Ie(),!0}if(e==="KeyG")return y().kind==="outfit"&&gt(Oe[(Oe.indexOf(m)+1)%Oe.length]),!0;if(e==="KeyT"){const a=_[g];return y().kind==="trail"&&a&&!a.canEquip&&a.section!=="tutorials"&&De(a),!0}if(!_.length)return!0;if(e==="ArrowLeft"||e==="KeyA")return g=(g+_.length-1)%_.length,T(),!0;if(e==="ArrowRight"||e==="KeyD")return g=(g+1)%_.length,T(),!0;if(e==="ArrowUp"||e==="KeyW")return g=Math.max(0,g-wn()),T(),!0;if(e==="ArrowDown"||e==="KeyS")return g=Math.min(_.length-1,g+wn()),T(),!0;if(e==="Enter"||e==="Space")return le(),!0;const n=/^(?:Digit|Numpad)([1-9])$/.exec(e);if(n){const a=Number(n[1])-1;return a<_.length&&(g=a,T(),le()),!0}return!0},tabs:()=>R.filter(e=>!Y.has(e.id)&&e.gear).map(e=>e.id),pages:()=>R.filter(e=>!Y.has(e.id)&&!e.gear).map(e=>e.id),tab:()=>y().id,setTab:(e,n)=>{const a=R.findIndex(i=>i.id===e);return a>=0&&be(a),n&&n.search&&Ge(),y().id},filter:()=>c,setFilter:e=>(c=e,g=0,Ie(),c),items:()=>_.map(e=>e.id),selected:()=>_[g]?_[g].id:null,equipped:()=>({...C}),noteEquipped(e,n){C[e]!==void 0&&(C[e]=n,A&&(se(),mt()))}}}export{To as createInventory,Qn as fzfMatch};
