import{buf as N,appendBuf as Y,prism as V,makeRng as X,rr as n,ri as P,lin as A,mixc as I,jitc as j,clamp as G,smooth as $,snowLace as J,registerLookLayer as Q,f32 as E,dial as R,dialSoft as F,dialColor as z}from"./lib/core.mjs";import{PAL as Z}from"./kit.mjs";const H=A(7301728),q=A(10327170),W=A(9075296),oo=A(5065284),eo=1,C=E([.92,1.35,.44,0]),B=E([0,0,0,0]),y=E([.85,.62,0,.55]),D=E([0,0,0,0]);R("ROCK_GRANITE_GAIN",C,0),R("ROCK_LIFT",C,1),R("ROCK_MASK_EDGE",C,2),F("ROCK_MASK_FEATHER",C,3,.1),z("ROCK_COLOR",B,0,11578275,{norm:"luma"}),R("ROCK_SNOW_GAIN",y,0),R("ROCK_SNOW_SLOPE_EDGE",y,1),F("ROCK_SNOW_FEATHER",y,2,.2),R("ROCK_SNOW_PATCHY",y,3),z("ROCK_SNOW_COLOR",D,0,15397371);const to=`varying float vRockUp;
`,ro=`vRockUp = objectNormal.z;
`,no=`
varying float vRockUp;
uniform vec4 uRock;         // x ROCK_GRANITE_GAIN y ROCK_LIFT z MASK_EDGE w 0.5/MASK_FEATHER
uniform vec4 uRockCol;      // rgb ROCK_COLOR, luma-normalised (hue only)
uniform vec4 uRockSnow;     // x GAIN y SLOPE_EDGE z 0.5/FEATHER w PATCHY
uniform vec4 uRockSnowCol;  // rgb ROCK_SNOW_COLOR
`,co=c=>`
         // -------------------------------- specs/0005 L4 — GREY GRANITE + SNOW
         // GATE 0. A uniform branch: it takes the same side for every fragment
         // of every draw, so it costs one coherent compare, and with both gains
         // at 0 this layer is a BIT-EXACT no-op against a build without it.
         // That is what lets harness/shader-perf.mjs price it by writing a dial
         // instead of by rebuilding the page.
         if ( uRock.x + uRockSnow.x > 0.0 ) {
           float rLum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
           float rMask = 1.0 - clamp( ( rLum - uRock.z ) * uRock.w + 0.5, 0.0, 1.0 );
           if ( rMask > 0.0 ) {
             if ( uRock.x > 0.0 ) {
               // HUE ONLY: uRockCol is luma-normalised, so this replaces the
               // colour CAST and keeps the luminance structure every character
               // term above just wrote. ROCK_LIFT then walks the result toward
               // daylight granite.
               diffuseColor.rgb = mix( diffuseColor.rgb,
                 ( rLum * uRock.y ) * uRockCol.rgb, rMask * uRock.x );
             }
             if ( uRockSnow.x > 0.0 ) {
               // SLOPE-GATED SNOW. The house-style hard edge — a clamp against a
               // precomputed reciprocal half-width, not a smoothstep (see
               // lib/core.mjs dialSoft): these edges are meant to be crisp and
               // the fragment path never divides.
               float cov = clamp( ( vRockUp - uRockSnow.y ) * uRockSnow.z + 0.5, 0.0, 1.0 );
               cov *= 1.0 - uRockSnow.w * ${c};
               diffuseColor.rgb = mix( diffuseColor.rgb, uRockSnowCol.rgb,
                 cov * uRockSnow.x * rMask );
             }
           }
         }`;eo&&Q({id:"L4-rock",uniforms:{uRock:{value:C},uRockCol:{value:B},uRockSnow:{value:y},uRockSnowCol:{value:D}}});function lo(c){const t=new c.MeshLambertMaterial({vertexColors:!0,flatShading:!0});return t.customProgramCacheKey=()=>"pal-granite-1",t.onBeforeCompile=m=>{m.vertexShader=`varying vec3 vGOP;
`+to+m.vertexShader.replace("#include <project_vertex>",`vGOP = transformed;
       ${ro}
       #include <project_vertex>`),m.fragmentShader=no+`
      varying vec3 vGOP;
      float pghash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71,0.113,0.419)); p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float pgn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(pghash(i), pghash(i + vec3(1,0,0)), f.x),
                       mix(pghash(i + vec3(0,1,0)), pghash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(pghash(i + vec3(0,0,1)), pghash(i + vec3(1,0,1)), f.x),
                       mix(pghash(i + vec3(0,1,1)), pghash(i + vec3(1,1,1)), f.x), f.y), f.z); }
    `+m.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
       {
         // snow is painted into the vertex colours by snowLace; leave it alone
         float lum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
         float rocky = 1.0 - smoothstep( 0.34, 0.62, lum );
         float gd = length( vViewPosition );
         // fine grain is pointless past ~110 m and only buys aliasing
         float near = 1.0 - smoothstep( 30.0, 110.0, gd );
         float blotch = pgn( vGOP * 0.42 );
         float grain  = pgn( vGOP * 3.9 );
         float sparkle = pgn( vGOP * 17.0 );
         // EXFOLIATION. Sierra granite sheds in near-horizontal sheets; the
         // joint is a dark line every ~2 m of height that wraps the mass.
         float joint = pgn( vec3( vGOP.x * 0.045, vGOP.y * 0.045, vGOP.z * 0.62 ) );
         float g = ( blotch  - 0.5 ) * 0.24
                 + ( joint   - 0.5 ) * 0.30
                 + ( grain   - 0.5 ) * 0.36 * ( 0.35 + 0.65 * near )
                 + ( sparkle - 0.5 ) * 0.30 * near;
         diffuseColor.rgb *= 1.0 + g * rocky;
         // biotite flecks — the black speckle that says granite up close
         diffuseColor.rgb *= 1.0 - smoothstep( 0.79, 0.96, sparkle ) * 0.32 * near * rocky;
         // IRON STAINING in the low blotches: view-15's "orange granite outcrop"
         diffuseColor.rgb = mix( diffuseColor.rgb,
             diffuseColor.rgb * vec3( 1.30, 1.02, 0.74 ),
             smoothstep( 0.56, 0.90, blotch ) * 0.58 * rocky );
         // and the cool grey of the shaded flanks
         diffuseColor.rgb = mix( diffuseColor.rgb,
             diffuseColor.rgb * vec3( 0.88, 0.94, 1.08 ),
             smoothstep( 0.40, 0.06, blotch ) * 0.36 * rocky );
         // sun-bleached crowns, keyed on the joint field so it follows the sheets
         diffuseColor.rgb *= 1.0 + 0.10 * smoothstep( 0.62, 0.95, joint ) * rocky;
${co("blotch")}
       }`)},t}function U(c,t,m,b,g,{r:K=7,h:L=5,tiers:_=4,snow:u=.18}={}){const p=N(),v=n(t,-.22,.22),O=n(t,-.22,.22),w=n(t,0,6.283);let d=g,r=K;for(let f=0;f<_;f++){const o=L/_*n(t,.7,1.5),e=f%2?I(H,W,n(t,.15,.55)):I(H,oo,n(t,.1,.45));V(p,t,{x:S(d),y:k(d),z:d,r,h:o,sides:P(t,6,8),taper:n(t,.72,.95),jit:.3,yaw:w+f*.4,tiltX:v*o*2.2,tiltY:O*o*2.2,col:j(e,t,.16),colTop:j(I(q,W,n(t,0,.4)),t,.14)}),d+=o*n(t,.72,.92),r*=n(t,.66,.86)}J(p,{snow:Z.snow,lo:.46,hi:.9,amount:u,patchy:.35,seed:m*17+b*5|0}),Y(c,p);function S(f){return m+v*(f-g)}function k(f){return b+O*(f-g)}}function fo(c,{gz:t,slopeAt:m,canopyAt:b,rockAt:g,masksAt:K,hero:L=44,field:_=210}={}){const u=[0];for(let o=1;o<c.length;o++)u.push(u[o-1]+Math.hypot(c[o][0]-c[o-1][0],c[o][1]-c[o-1][1]));const p=u[u.length-1],v=o=>{o=G(o,0,p);let e=1;for(;e<u.length-1&&u[e]<o;)e++;const l=(o-u[e-1])/(u[e]-u[e-1]||1),s=c[e][0]-c[e-1][0],a=c[e][1]-c[e-1][1],i=Math.hypot(s,a)||1;return{x:c[e-1][0]+s*l,y:c[e-1][1]+a*l,nx:-a/i,ny:s/i}},O=(o,e)=>{const l=K(o,e);if(l.groom>.22||l.pave>.08||l.pack>.2||l.cat>.25)return 0;const s=m(o,e,7);let a=b(o,e);a<0&&(a=.25);const i=1-G(a,0,1),h=G(g(o,e),0,1);return G($(24,40,s)*(.3+.7*i)+h*.85,0,1)},w=N(),d=N(),r=X("funitel-granite"),S=[];let k=0,f=0;for(let o=0;o<9e4&&k<L;o++){const e=n(r,.4*p,.82*p),l=(r()<.5?-1:1)*n(r,16,120),s=v(e),a=s.x+s.nx*l,i=s.y+s.ny*l,h=O(a,i);if(h<.34||r()>h||S.some(M=>Math.hypot(M[0]-a,M[1]-i)<34))continue;const T=n(r,12,24)*(.75+h*.5),x=n(r,4.5,9.5)*(.7+h*.7);U(w,r,a,i,t(a,i)-x*.5,{r:T,h:x,tiers:P(r,2,4),snow:.12+.14*r()}),S.push([a,i]),k++}for(let o=0;o<16e4&&f<_;o++){const e=n(r,.14*p,.94*p),l=(r()<.5?-1:1)*n(r,12,190),s=v(e),a=s.x+s.nx*l,i=s.y+s.ny*l,h=O(a,i);if(h<.2||r()>h*.85)continue;const T=n(r,2.2,6.4)*(.7+h*.6),x=n(r,1.2,3.4)*(.7+h*.7);U(d,r,a,i,t(a,i)-x*.55,{r:T,h:x,tiers:P(r,2,3),snow:.22+.2*r()}),f++}return{hero:w,field:d,nHero:k,nField:f,L:p}}export{co as ROCK_LOOK_FRAG,no as ROCK_LOOK_PARS_FRAG,to as ROCK_LOOK_PARS_VERT,ro as ROCK_LOOK_VERT,fo as buildFunitelGranite,lo as graniteMaterial,U as slabGeo};
