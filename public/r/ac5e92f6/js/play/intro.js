import{pickBrand as b}from"./flags.js";import{hudSurf as v}from"./hud.js";import{label as r,onChange as E}from"./bindings.js";const w="terrain USGS 3DEP · trails © OpenStreetMap contributors (ODbL)",R=2400,_=matchMedia("(pointer: coarse)").matches,e=(t,n,o)=>{const a=document.createElement(t);return n&&(a.className=n),o!=null&&(a.textContent=o),a};document.body.classList.add("intro-up");const i=e("div","intro");i.setAttribute("role","dialog"),i.setAttribute("aria-label",b({lab:"Red Dog Chair","RED DOG":"Red Dog Chair",SIBERIA:"Siberia Express"}));const m=e("section","intro__card intro__card--title");m.append(e("h1","intro__h1",b({lab:"RED DOG CHAIR","RED DOG":"RED DOG CHAIR",SIBERIA:"SIBERIA EXPRESS"})),e("p","intro__sub","Palisades Tahoe · Olympic Valley, California"),e("p","intro__credit",w));const d=e("section","intro__card intro__card--"+(_?"touch":"keys"));d.hidden=!0;const D=_?A():S();d.append(e("h2","intro__h2","CONTROLS"),D,e("p","intro__go",_?"tap to drop in":"click to drop in"),e("p","intro__credit",w));function S(){const t=e("div","intro__keys"),o=[[()=>r("pause"),"settings"],[()=>[r("forward"),r("left"),r("back"),r("right")].join(" "),"move"],[()=>r("spinLeft")+" "+r("spinRight"),"tricks in the air"],[()=>r("camera"),"camera"],[()=>r("reset"),"reset"],[()=>r("flipFwd")+" "+r("flipBack"),"look"],[()=>r("grab"),"grab"],[()=>r("trailMap"),"trail map"]],a=[];for(const[c,p]of o){const u=e("div","intro__cap",typeof c=="function"?c():c);typeof c=="function"&&a.push([u,c]),t.append(u,e("div","intro__what",p))}return E(()=>{for(const[c,p]of a)c.textContent=p()}),t}function A(){document.head.appendChild(e("style",null,`
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
`));const t=h=>{const s=document.createElementNS("http://www.w3.org/2000/svg","svg");return s.setAttribute("class","intro__tg"),s.setAttribute("viewBox","0 0 56 56"),s.setAttribute("aria-hidden","true"),s.innerHTML=h,s},n=v.hazard,o="rgba(244,241,234,.42)",a="rgba(244,241,234,.34)",c=t(`
    <circle cx="28" cy="28" r="18.5" fill="rgba(23,22,20,.34)" stroke="${a}" stroke-width="1.5"/>
    <circle cx="28" cy="28" r="1.6" fill="${o}"/>
    <circle cx="34.5" cy="22.5" r="7.5" fill="${n}"/>
    <path d="M28 1.5 L31.6 8 L24.4 8 Z" fill="${o}"/>
    <path d="M28 54.5 L24.4 48 L31.6 48 Z" fill="${o}"/>
    <path d="M1.5 28 L8 24.4 L8 31.6 Z" fill="${o}"/>
    <path d="M54.5 28 L48 31.6 L48 24.4 Z" fill="${o}"/>`),p=t(`
    <circle cx="19" cy="20" r="5.5" fill="${n}"/>
    <circle cx="19" cy="20" r="10.5" fill="none" stroke="${a}" stroke-width="1.5"/>
    <circle cx="19" cy="20" r="15.5" fill="none" stroke="rgba(244,241,234,.17)" stroke-width="1.5"/>
    <path d="M14 41 C 24 47, 36 45, 44 36" fill="none" stroke="${o}" stroke-width="2"
          stroke-linecap="round" stroke-dasharray="0.1 5.4"/>
    <path d="M45.5 30.5 L47 38.5 L39.5 36 Z" fill="${o}"/>`),u=(h,s)=>{const k=e("div","intro__tz");return k.append(h,e("b","intro__tk",s)),k},g=e("div"),y=e("div","intro__td");return y.append(u(c,"MOVE"),u(p,"TAP JUMP · DRAG LOOK")),g.append(y,e("p","intro__tf","DOUBLE-TAP · RESET")),g}try{const t=window.__guide,n=t&&typeof t.state=="function"?t.state():null,o=t&&typeof t.skipKey=="function"?t.skipKey():null;n&&n.ok&&Array.isArray(n.stages)&&n.stages.length&&o&&d.insertBefore(e("p","intro__go",`guided run · hold ${o.cap} any time to skip it`),d.querySelector(".intro__credit"))}catch{}i.append(m,d),document.body.appendChild(i),requestAnimationFrame(()=>i.classList.add("is-in"));let l=0,C=setTimeout(()=>f(),R);function f(){if(clearTimeout(C),l===0){l=1,m.hidden=!0,d.hidden=!1;return}if(l===1){l=2,i.classList.remove("is-in"),i.classList.add("is-out"),setTimeout(()=>i.remove(),320);const t=window.__player;t&&typeof t.enter=="function"&&t.enter(),document.body.classList.remove("intro-up"),M()}}function L(t){t.key==="F5"||t.key==="F12"||t.metaKey||t.ctrlKey||t.altKey||(t.preventDefault(),f())}function x(t){t.preventDefault(),t.stopPropagation(),f()}function M(){removeEventListener("keydown",L,!0),i.removeEventListener("pointerdown",x)}addEventListener("keydown",L,!0),i.addEventListener("pointerdown",x),window.__intro={skip:()=>{for(;l<2;)f()},stage:()=>l,card:()=>_?"touch":"keys"};
