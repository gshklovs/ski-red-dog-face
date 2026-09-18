import{pickBrand as E}from"./flags.js";import{hudSurf as M}from"./hud.js";import{label as c,onChange as B}from"./bindings.js";const K="terrain USGS 3DEP · trails © OpenStreetMap contributors (ODbL)",_=matchMedia("(pointer: coarse)").matches,w="poi-lab.play.firstScreen",i=(t,r,e)=>{const n=document.createElement(t);return r&&(n.className=r),e!=null&&(n.textContent=e),n};document.body.classList.add("intro-up");const d=i("div","intro");d.setAttribute("role","dialog"),d.setAttribute("aria-label",E({lab:"Red Dog Chair","RED DOG":"Red Dog Chair",SIBERIA:"Siberia Express"}));const g={id:"free-ride",tile:"FREE RIDE",mark:"free",name:"THE MOUNTAIN",teaches:"no prompts · just ski"},$=[{id:"green",tile:"GREEN",mark:"green",name:"SHOOTING STAR",teaches:"turning and stopping"},{id:"blue",tile:"BLUE",mark:"blue",name:"JULIA'S GOLD",teaches:"carving and speed"},{id:"black",tile:"BLACK",mark:"black",name:"GS BOWL",teaches:"moguls and the pop"},{id:"double",tile:"DOUBLE BLACK",mark:"double",name:"75 CHUTE",teaches:"drop-ins and the cliff"},{id:"park",tile:"TERRAIN PARK",mark:"park",name:"GOLD COAST PARK",teaches:"jumps, grabs and rails"}];function G(){let t=null;try{const r=window.__guide,e=r&&typeof r.tutorials=="function"?r.tutorials():null;Array.isArray(e)&&e.length&&(t=e.map(n=>({id:n.id,tile:n.tile,mark:n.mark||n.diff,name:n.name,teaches:n.teaches})))}catch{}return(t||$).concat(g)}const o=G(),A=[[()=>[c("forward"),c("left"),c("back"),c("right")].join(" "),"move"],[()=>c("jump"),"jump"],[()=>c("spinLeft")+" "+c("spinRight"),"spin (air) / steer (ground)"],[()=>c("grab"),"grab"],[()=>c("camera"),"camera"],[()=>c("pause"),"pause"]];function N(){const t=i("div","intro__keys"),r=[];for(const[e,n]of A){const a=i("div","intro__cap",e());r.push([a,e]),t.append(a,i("div","intro__what",n))}return B(()=>{for(const[e,n]of r)e.textContent=n()}),t}function P(){document.head.appendChild(i("style",null,`
.intro__card--touch .intro__td {
  display: grid; grid-template-columns: 1fr 1fr;
  width: min(300px, 84vw); margin: 0 auto;
  border: 1px solid rgba(244, 241, 234, .20); border-radius: 14px;
  background: rgba(23, 22, 20, .34);
  box-shadow: inset 0 0 0 1px rgba(23, 22, 20, .35);
  overflow: hidden;
}
.intro__card--touch .intro__tz {
  display: flex; flex-direction: column; align-items: center; gap: 9px;
  padding: 15px 9px 14px;
}
.intro__card--touch .intro__tz + .intro__tz { border-left: 1px dashed rgba(244, 241, 234, .22); }
.intro__card--touch .intro__tg { display: block; width: 54px; height: 54px; }
.intro__card--touch .intro__tk {
  font: 700 0.64rem / 1.65 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: .13em; text-transform: uppercase; color: #ffd9c4;
  text-align: center; text-wrap: balance;
}
.intro__card--touch .intro__tf {
  margin: 0.85rem 0 0;
  font: 700 0.62rem / 1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: .2em; text-transform: uppercase; opacity: .8;
}
`));const t=h=>{const l=document.createElementNS("http://www.w3.org/2000/svg","svg");return l.setAttribute("class","intro__tg"),l.setAttribute("viewBox","0 0 56 56"),l.setAttribute("aria-hidden","true"),l.innerHTML=h,l},r=M.hazard,e="rgba(244,241,234,.42)",n="rgba(244,241,234,.34)",a=t(`
    <circle cx="28" cy="28" r="18.5" fill="rgba(23,22,20,.34)" stroke="${n}" stroke-width="1.5"/>
    <circle cx="28" cy="28" r="1.6" fill="${e}"/>
    <circle cx="34.5" cy="22.5" r="7.5" fill="${r}"/>
    <path d="M28 1.5 L31.6 8 L24.4 8 Z" fill="${e}"/>
    <path d="M28 54.5 L24.4 48 L31.6 48 Z" fill="${e}"/>
    <path d="M1.5 28 L8 24.4 L8 31.6 Z" fill="${e}"/>
    <path d="M54.5 28 L48 31.6 L48 24.4 Z" fill="${e}"/>`),I=t(`
    <circle cx="19" cy="20" r="5.5" fill="${r}"/>
    <circle cx="19" cy="20" r="10.5" fill="none" stroke="${n}" stroke-width="1.5"/>
    <circle cx="19" cy="20" r="15.5" fill="none" stroke="rgba(244,241,234,.17)" stroke-width="1.5"/>
    <path d="M14 41 C 24 47, 36 45, 44 36" fill="none" stroke="${e}" stroke-width="2"
          stroke-linecap="round" stroke-dasharray="0.1 5.4"/>
    <path d="M45.5 30.5 L47 38.5 L39.5 36 Z" fill="${e}"/>`),b=(h,l)=>{const L=i("div","intro__tz");return L.append(h,i("b","intro__tk",l)),L},k=i("div"),y=i("div","intro__td");return y.append(b(a,"MOVE"),b(I,"TAP JUMP · DRAG LOOK")),k.append(y,i("p","intro__tf","DOUBLE-TAP · RESET")),k}const v=i("div","intro__board"),R=i("section","intro__card intro__card--"+(_?"touch":"keys")),S=i("div","intro__head");S.append(i("h1","intro__h1",E({lab:"RED DOG CHAIR","RED DOG":"RED DOG CHAIR",SIBERIA:"SIBERIA EXPRESS"})),i("p","intro__sub","Palisades Tahoe · Olympic Valley, California")),R.append(S,i("h2","intro__h2","CONTROLS"),_?P():N(),i("p","intro__credit",K));const m=i("div","intro__tiles");m.setAttribute("role","listbox"),m.setAttribute("aria-label","pick a run");const x=[];o.forEach((t,r)=>{const e=i("button","intro__tile");e.type="button",e.setAttribute("data-tile",t.id),e.setAttribute("role","option");const n=i("span","pmark pmark--"+(t.mark||"green"));n.setAttribute("aria-hidden","true"),n.append(i("i")),e.append(i("span","intro__tnum",String(r+1)),n,i("span","intro__tband",t.tile),i("span","intro__tname",t.name),i("span","intro__tteach",t.teaches)),e.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),u(t.id)}),e.addEventListener("mouseenter",()=>p(r)),x.push(e),m.append(e)}),v.append(R,m),d.append(v),document.body.appendChild(d),requestAnimationFrame(()=>d.classList.add("is-in"));let s=0;try{const t=localStorage.getItem(w),r=o.findIndex(e=>e.id===t);r>=0&&(s=r)}catch{}function p(t){s=(t%o.length+o.length)%o.length,x.forEach((r,e)=>{r.classList.toggle("is-sel",e===s),r.setAttribute("aria-selected",e===s?"true":"false")})}p(s);let f=0,D=null,O=null;function u(t){if(f>=2)return null;const r=o.find(a=>a.id===t)||o[s];f=2,D=r.id;try{localStorage.setItem(w,r.id)}catch{}d.classList.remove("is-in"),d.classList.add("is-out"),setTimeout(()=>d.remove(),320);const e=window.__guide;try{const a=(()=>{try{return!!(e&&e.state&&e.state().stage)}catch{return!1}})();r.id===g.id?e&&e.freeRide&&!a&&e.freeRide():e&&e.startTutorial&&(O=e.startTutorial(r.id))}catch{}const n=window.__player;return n&&typeof n.enter=="function"&&n.enter(),document.body.classList.remove("intro-up"),F(),r.id}function C(t){if(f>=2||t.key==="F5"||t.key==="F12"||t.metaKey||t.ctrlKey||t.altKey)return;const r=/^[1-9]$/.test(t.key)?Number(t.key):0;if(r>=1&&r<=o.length){t.preventDefault(),u(o[r-1].id);return}switch(t.key){case"ArrowRight":case"ArrowDown":case"Tab":t.preventDefault(),p(s+1);return;case"ArrowLeft":case"ArrowUp":t.preventDefault(),p(s-1);return;case"Enter":case" ":case"Spacebar":t.preventDefault(),u(o[s].id);return;default:}}function T(t){t.stopPropagation()}function F(){removeEventListener("keydown",C,!0),d.removeEventListener("pointerdown",T)}addEventListener("keydown",C,!0),d.addEventListener("pointerdown",T),window.__intro={skip:()=>u(g.id),pick:t=>u(t),stage:()=>f,card:()=>_?"touch":"keys",tiles:()=>o.map(t=>({id:t.id,tile:t.tile,name:t.name,teaches:t.teaches,mark:t.mark})),sel:()=>s,select:t=>(p(t),s),picked:()=>D,started:()=>O,rows:()=>A.map(([t,r])=>t()+" = "+r)};
