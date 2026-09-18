import{buf as ne,quad as re,makeRng as ie,rr as r,ri as ae,lin as H,mixc as T,clamp as ce,smooth as C,toGeo as _e,registerLookLayer as se,f32 as S,dial as h,dialVec as K,dialSoft as Z,halfInv as ue,dialColor as f,dialColorArray as Se,LOOK as l,definePresets as fe}from"./lib/core.mjs";import{SUN_DIR as X}from"./terrain.mjs";const q={dir:X,color:16773336,intensity:2.15,ambSky:9418472,ambGround:14674420,ambIntensity:1.48},d=S(new Array(12).fill(0));f("SKY_TOP",d,0,4030153),f("SKY_MID",d,3,9288680),f("SKY_HORIZON",d,6,14674679),f("SKY_LOW",d,9,13228522);const B=e=>[d[e],d[e+1],d[e+2]];let W=16771528,k=.35,J=null,b=null,I=null;function le(){const e=m&&m.parent;return e?(J!==e&&(J=e,b=null,I=null,e.traverse(t=>{!b&&t.isDirectionalLight&&(b=t),!I&&t.isHemisphereLight&&(I=t)})),b||I?{sun:b,hemi:I}:null):null}function U(e,t,n){Object.defineProperty(l,e,{get:()=>q[t],set:o=>{q[t]=o;const g=le();g&&n(g,o)},enumerable:!0,configurable:!0})}U("SUN_COLOR","color",(e,t)=>{e.sun&&e.sun.color.setHex(t)}),U("SUN_INTENSITY","intensity",(e,t)=>{e.sun&&(e.sun.intensity=t)}),U("AMB_SKY","ambSky",(e,t)=>{e.hemi&&e.hemi.color.setHex(t)}),U("AMB_GROUND","ambGround",(e,t)=>{e.hemi&&e.hemi.groundColor.setHex(t)}),U("AMB_INTENSITY","ambIntensity",(e,t)=>{e.hemi&&(e.hemi.intensity=t)}),Object.defineProperty(l,"SKY_SUN_GLOW",{get:()=>W,set:e=>{W=e,V()},enumerable:!0,configurable:!0}),Object.defineProperty(l,"SKY_SUN_GLOW_AMOUNT",{get:()=>k,set:e=>{k=+e,V()},enumerable:!0,configurable:!0});for(const e of["SKY_TOP","SKY_MID","SKY_HORIZON","SKY_LOW"]){const t=Object.getOwnPropertyDescriptor(l,e);Object.defineProperty(l,e,{...t,set:n=>{t.set(n),V()}})}const N=3,de=1,E=S([850,55,.3,0,1900,70,.55,0,3800,110,.86,0]),Ne=[12044510,13359854,14674681],Q=S(new Array(N*3).fill(0)),x=S([.24,0,.68,.42]),j=S([0,0,0,0]),z=S([0,0,0,1]),$=S([0,0,0,.45]);K("FOG_BAND_LIMIT",E,0,N,4),K("FOG_BAND_FEATHER",E,1,N,4,ue,3),K("FOG_BAND_MIX",E,2,N,4),Se("FOG_BAND_COLOR",Q,Ne),h("SUN_STEP_EDGE",x,0),Z("SUN_STEP_SOFT",x,1,.055),h("SUN_STEP_GAIN",x,2),h("SUN_RAMP_EDGE",x,3),Z("SUN_RAMP_SOFT",j,3,.16),h("SUN_AMBIENT_GAIN",z,3),h("SHADOW_TINT_STRENGTH",$,3),f("SUN_RAMP_LO",j,0,16770756,{norm:"luma"}),f("SUN_RAMP_HI",z,0,16774370,{norm:"luma"}),f("SHADOW_TINT",$,0,9871580,{norm:"luma"});const me=e=>`
	poiFog = mix( poiFog, uFogBandColor[ ${e} ], uFogBand[ ${e} ].z * clamp(
		( vFogDepth - uFogBand[ ${e} ].x ) * uFogBand[ ${e} ].w + 0.5, 0.0, 1.0 ) );`,ge=Array.from({length:N},(e,t)=>me(t)).join("");se({id:"L2-atmosphere",uniforms:{uFogBand:{value:E},uFogBandColor:{value:Q},uSunStep:{value:x},uSunRampLo:{value:j},uSunRampHi:{value:z},uShadowTint:{value:$}},chunks:{fog_vertex:e=>de?`#ifdef USE_FOG
	vFogDepth = length( mvPosition.xyz );
#endif`:e,fog_pars_fragment:e=>e.replace("#ifdef USE_FOG",`#ifdef USE_FOG
	uniform vec4 uFogBand[ ${N} ];        // x LIMIT  y FEATHER  z MIX  w 0.5/FEATHER
	uniform vec3 uFogBandColor[ ${N} ];   // FOG_BAND_COLOR`),fog_fragment:()=>`#ifdef USE_FOG
	if ( vFogDepth > uFogBand[ 0 ].x - uFogBand[ 0 ].y ) {
		vec3 poiFog = gl_FragColor.rgb;${ge.split(`
`).join(`
	`)}
		gl_FragColor.rgb = poiFog;
	}
#endif`,lights_lambert_pars_fragment:e=>`uniform vec4 uSunStep;
uniform vec4 uSunRampLo;
uniform vec4 uSunRampHi;
uniform vec4 uShadowTint;
#define SUN_STEP_EDGE        uSunStep.x
#define SUN_STEP_INV_SOFT    uSunStep.y
#define SUN_STEP_GAIN        uSunStep.z
#define SUN_RAMP_EDGE        uSunStep.w
#define SUN_RAMP_LO          uSunRampLo.rgb
#define SUN_RAMP_INV_SOFT    uSunRampLo.a
#define SUN_RAMP_HI          uSunRampHi.rgb
#define SUN_AMBIENT_GAIN     uSunRampHi.a
#define SHADOW_TINT          uShadowTint.rgb
#define SHADOW_TINT_STRENGTH uShadowTint.a
`+e.replace(`	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;`,`	float dotNL = dot( geometryNormal, directLight.direction );
	float poiLit = clamp( ( dotNL - SUN_STEP_EDGE ) * SUN_STEP_INV_SOFT + 0.5, 0.0, 1.0 );
	vec3 poiWarm = mix( SUN_RAMP_LO, SUN_RAMP_HI,
		clamp( ( dotNL - SUN_RAMP_EDGE ) * SUN_RAMP_INV_SOFT + 0.5, 0.0, 1.0 ) );
	vec3 irradiance = directLight.color * poiWarm * ( poiLit * SUN_STEP_GAIN );`).replace("void RE_IndirectDiffuse_Lambert( const in vec3 irradiance,","void RE_IndirectDiffuse_Lambert( const in vec3 poiAmbient,").replace("	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );",`	vec3 irradiance = poiAmbient * SUN_AMBIENT_GAIN;
	irradiance = mix( irradiance, dot( irradiance, vec3( 0.2126, 0.7152, 0.0722 ) ) * SHADOW_TINT,
		SHADOW_TINT_STRENGTH );
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );`)}});const ee=13e3;function te(e,t){const n=ee,o=X,g=B(0),_=B(3),p=B(6),L=B(9),F=H(W),v=k;for(let a=0;a<e.count;a++){const Y=e.getX(a),M=e.getY(a),s=e.getZ(a),c=-s/n;let i;c>.3?i=T(_,g,C(.3,.95,c)):c>0?i=T(p,_,C(0,.3,c)):i=T(L,p,C(-.25,0,c));const D=Y/n,O=M/n,w=D*o[0]+-s/n*o[2]+O*o[1];i=T(i,F,ce(w,0,1)**6*v),t[a*3]=i[0],t[a*3+1]=i[1],t[a*3+2]=i[2]}}let m=null;function V(){if(!m)return;const e=m.geometry;te(e.attributes.position,e.attributes.color.array),e.attributes.color.needsUpdate=!0}l.skyColors=()=>m?m.geometry.attributes.color.array:null;function xe(e){const t=new e.SphereGeometry(ee,40,24),n=new Float32Array(t.attributes.position.count*3);te(t.attributes.position,n),t.setAttribute("color",new e.BufferAttribute(n,3));const o=new e.Mesh(t,new e.MeshBasicMaterial({vertexColors:!0,side:e.BackSide,fog:!1,depthWrite:!1}));return o.rotation.x=-Math.PI/2,o.name="sky",o.renderOrder=-10,o.frustumCulled=!1,m=o,o}function Le(e){const t=ie("cirrus"),n=ne(),o=H(16186367),g=H(14017780);for(let p=0;p<22;p++){const L=r(t,0,Math.PI*2),F=r(t,1400,9e3),v=Math.cos(L)*F,a=Math.sin(L)*F,Y=r(t,2100,3400),M=r(t,.5,1.3),s=r(t,900,3200),c=r(t,30,120),i=Math.cos(M),D=Math.sin(M),O=(A,u,R)=>[v+A*i-u*D,a+A*D+u*i,Y+R],w=ae(t,3,6);for(let A=0;A<w;A++){const u=-s/2+r(t,0,s*.5),R=r(t,s*.25,s*.6),y=r(t,-c,c),G=r(t,c*.25,c*.8),P=r(t,-60,60),oe=T(g,o,r(t,.3,1));re(n,O(u,y,P),O(u+R,y+r(t,-G,G),P),O(u+R,y+G,P),O(u,y+G*.6,P),oe)}}const _=new e.Mesh(_e(e,n,{normals:!1}),new e.MeshBasicMaterial({vertexColors:!0,side:e.DoubleSide,transparent:!0,opacity:.3,fog:!1,depthWrite:!1}));return _.name="cirrus",_.renderOrder=-8,_.frustumCulled=!1,_}const Oe={default:{},"golden-hour":{SUN_COLOR:16765090,SUN_INTENSITY:2,AMB_SKY:8360642,AMB_GROUND:15255976,AMB_INTENSITY:.86,SUN_STEP_EDGE:.26,SUN_STEP_GAIN:.96,SUN_RAMP_LO:16768188,SUN_RAMP_HI:16772308,SHADOW_TINT:7236536,SHADOW_TINT_STRENGTH:.46,FOG_BAND_COLOR:[11710662,13354710,14535870],SKY_TOP:3104670,SKY_MID:8825052,SKY_HORIZON:15521984,SKY_LOW:14726284,SKY_SUN_GLOW:16763278,SKY_SUN_GLOW_AMOUNT:.45}};fe(Oe);try{const e=new URLSearchParams(globalThis.location.search).get("look");e&&l.preset(e)}catch{}export{Oe as PRESETS,q as SUN,Le as buildClouds,xe as buildSky};
