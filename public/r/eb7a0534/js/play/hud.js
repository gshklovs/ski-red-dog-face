import{gliderState as ca}from"./glider.js";import{skiState as ua}from"./ski.js";import{DEBUG_HUD as K,labUI as Ge,BRAND as ma,pick as fa,pickBrand as ga}from"./flags.js";import{label as M,onChange as ba}from"./bindings.js";const zt=[],Gt=(r,n)=>(r.textContent=n(),zt.push([r,n]),r);ba(()=>{for(const[r,n]of zt)r.textContent=n()});const qe=r=>()=>[M("forward"),M("left"),M("back"),M("right")].join(r),F=(r,n)=>()=>M(r)+" "+M(n),m=r=>()=>M(r),Ve={family:'"Avenir Next", Avenir, "Nunito Sans", "Segoe UI", system-ui, sans-serif',weight:500,obliqueDeg:12,track:.06,hero:68,heroDial:64,heroSmall:28,secondary:13.5,unit:11,gradFrom:"#7b3fe4",gradTo:"#3b6cff",flat:"rgba(42,36,86,0.90)",dim:"rgba(42,36,86,0.35)",clean:"rgba(42,36,86,0.90)",sketchy:"#c77a1a",bailed:"#ff5c8a"};function Pa(r,n=Ve.weight){return n+" "+r+"px "+Ve.family}const xa={cream:"#f4f1ea",ink:"#171614",sub:"#726c60",seam:"#c8c2b3",plate:"rgba(23,22,20,0.34)",hair:"rgba(244,241,234,0.16)",hazard:"#ff4d00",rule:"2px",radius:"2px"},ka={run:"#f4f1ea",lift:"#ff4d00",bike:"#8ec63f",landmark:"#7fd4e8",venue:"#ffab00"},_a={green:"#217a3c",blue:"#1d5fb4",black:"#141414",red:"#ff5c8a"},wa={rise:"220ms",riseEase:"cubic-bezier(.16,1,.3,1)",wipeRule:"110ms",wipeBody:"260ms",hold:"3s",fall:"160ms",snap:"90ms"};(function(){const n=Ve,l=`font-family:${n.family};font-weight:${n.weight};font-style:oblique ${n.obliqueDeg}deg;text-transform:uppercase;letter-spacing:${n.track}em;`,f=`background-image:linear-gradient(96deg,${n.gradFrom},${n.gradTo});-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;`,v=xa,g=ka,U=_a,N=wa,Q=`
/* ================================================== specs/0055 §1.1 — TOKENS
   ONE NAME EACH. Every token in §1 re-published as a CSS custom property, from
   the objects above, so no other file types a value. Declared on \`:root\`
   rather than on \`.phud\` because the panels that read them are NOT inside the
   HUD's own tree — the guide layer, the locker, the intro cards, the touch
   stick and the dev bar are all siblings of it on <body>.

   THIS SHEET IS THE ONLY DECLARATION SITE. play.css "declares no design token
   today and gains none" (§1.1), so it consumes these names and never defines
   one. The sheet is appended at import time, which is before any panel paints,
   and every consumer is inside the player document that imported hud.js. */
:root {
  --p-fam:${n.family};
  --p-weight:${n.weight};
  --p-oblique:oblique ${n.obliqueDeg}deg;
  --p-track:${n.track}em;
  --p-mono:ui-monospace,Menlo,Consolas,"Segoe UI Mono",monospace;

  /* §1.3 sizes, px */
  --p-hero:${n.hero}px;         --p-hero-dial:${n.heroDial}px;
  /* §4.5 — the hero BOX: S1 and S3 are this wide, 232 px apart (208 + a 24 px
     gutter). specs/0055 §4.4 (fidelity 2026-09-06): it is no longer a width the
     ledger justifies to — the picked combo is the CONTENT-SIZED gate post — it
     is the timer's box, the receipt's floor, and the gate's cap. */
  --p-hero-box:300px;
  --p-hero-sm:${n.heroSmall}px; --p-board-name:30px;
  --p-blade:15px;               --p-secondary:${n.secondary}px;
  --p-unit:${n.unit}px;         --p-kind:10px;   --p-prose:13px;

  /* §1.4 the gradient — TWO STOPS, 96deg, NO BORDER (D18) */
  --p-grad:linear-gradient(96deg,${n.gradFrom},${n.gradTo});
  --p-grad-from:${n.gradFrom}; --p-grad-to:${n.gradTo};

  /* §1.5 flat colour */
  --p-flat:${n.flat}; --p-dim:${n.dim};
  --p-clean:${n.clean}; --p-sketchy:${n.sketchy}; --p-bailed:${n.bailed};

  /* §1.6 surfaces — TWO, and a third needs Greg (D19) */
  --p-cream:${v.cream}; --p-ink:${v.ink}; --p-sub:${v.sub}; --p-seam:${v.seam};
  --p-plate:${v.plate}; --p-hair:${v.hair};

  /* §1.7 kind dialects, mirroring markers.js KINDS */
  --p-k-run:${g.run}; --p-k-lift:${g.lift}; --p-k-bike:${g.bike};
  --p-k-land:${g.landmark}; --p-k-venue:${g.venue};

  /* §1.8 severity alphabet */
  --p-diff-green:${U.green}; --p-diff-blue:${U.blue};
  --p-diff-black:${U.black}; --p-diff-red:${U.red};

  /* §1.9 the hazard stripe, and §1.10's rules and radii */
  --p-hazard:${v.hazard}; --p-stripe:4px;
  --p-rule:${v.rule}; --p-hairline:1px; --p-spine:3px;
  --p-r:${v.radius}; --p-gauge:2px;

  /* §1.11 motion — no panel invents a duration */
  --p-rise:${N.rise}; --p-rise-ease:${N.riseEase};
  --p-wipe-rule:${N.wipeRule}; --p-wipe-body:${N.wipeBody};
  --p-hold:${N.hold}; --p-fall:${N.fall}; --p-snap:${N.snap};
}

/* ------------------------------------------ specs/0055 §1.6 — THE HUD PLATE
   A sign's plate, emptied out, holding an instrument: 34 % ink, the 2 px
   mounting rule under it, 2 px radius. §2's hard rule — "no gradient numeral on
   bare snow, every hero sits on a plate" — is this element, and it is the only
   surface register 1 has. */
.hudplate {
  background:var(--p-plate);
  border-bottom:var(--p-rule) solid var(--p-grad-to);
  border-radius:var(--p-r);
}
.hudplate.is-bailed { border-bottom-color:var(--p-bailed); }
.hudplate.is-hazard { border-top:var(--p-stripe) solid var(--p-hazard); }

/* ------------------------- specs/0055 §7 — THE LABEL / RULE / HERO BLOCK
   The construction §4.4 calls "the timer's construction": a mono kind label, a
   hero numeral on the plate, and the mounting rule between the two. The live
   timer, the receipt, the bail and the gear/lift board are all THIS OBJECT with
   different words in it — which is what makes §4.5's slot swap a move rather
   than a redesign. W2 restyles the instruments that sit on it (§4.2-4.7); this
   is the block they sit on. */
.hudblk {
  display:inline-block; padding:6px 14px 8px;
  background:var(--p-plate);
  border-bottom:var(--p-rule) solid var(--p-grad-to);
  border-radius:var(--p-r);
  ${l}
}
.hudblk__lbl {
  display:block; font-family:var(--p-mono); font-size:var(--p-kind);
  font-style:normal; font-weight:700; letter-spacing:.22em;
  color:var(--p-cream); opacity:.72; margin-bottom:2px;
}
.hudblk__hero {
  display:block; font-size:var(--p-hero); line-height:1; white-space:nowrap; ${f}
}
.hudblk__u {
  font-size:var(--p-unit); margin-left:8px;
  background:none; color:var(--p-cream);
  -webkit-text-fill-color:var(--p-cream);
}
/* §1.10 — ONE 2 px GAUGE serves grace, fuel, charge, skip-hold and every stat
   bar. There is no progress-bar component and no switch. */
.hudgauge { height:var(--p-gauge); background:var(--p-dim); }
.hudgauge > i { display:block; height:100%; width:0; background:var(--p-grad-to); }

/* §1.8 — ONE CSS CLASS PER SHAPE, and nothing else in the DOM draws a rating.
   \`--m\` is the mark's colour; hollow is the same shape, outline only. */
.pmark { display:inline-block; flex:none; --m:var(--p-cream); }
.pmark--green  { width:11px; height:11px; border-radius:50%; background:var(--m); --m:var(--p-diff-green); }
.pmark--blue   { width:10px; height:10px; background:var(--m); --m:var(--p-diff-blue); }
.pmark--black  { width:9px; height:9px; background:var(--m); transform:rotate(45deg); --m:var(--p-diff-black); }
.pmark--double { position:relative; width:20px; height:9px; --m:var(--p-diff-black); }
.pmark--double::before, .pmark--double::after {
  content:""; position:absolute; top:0; width:9px; height:9px;
  background:var(--m); transform:rotate(45deg);
}
.pmark--double::before { left:0; }
.pmark--double::after { right:0; }
/* specs/0066 §marks — TRIPLE BLACK DIAMOND. The same 11 px lobes (9 px square on
   the diagonal) and the same 2 px gap the double has, three of them: 9+2+9+2+9. */
.pmark--triple { position:relative; width:31px; height:9px; --m:var(--p-diff-black); }
.pmark--triple::before, .pmark--triple::after, .pmark--triple > i {
  content:""; position:absolute; top:0; width:9px; height:9px;
  background:var(--m); transform:rotate(45deg);
}
.pmark--triple::before { left:0; }
.pmark--triple > i { left:11px; }
.pmark--triple::after { right:0; }
/* specs/0066 §marks — THE DEATH SIGN, "experts only", and it is GOLD (Greg,
   2026-09-06: "make the death gold"). The gold is --p-k-venue #ffab00 —
   markers.js KINDS.venue, already in :root — and NOT a new hex. Flat fills, no
   stroke and no shadow (D18): the crossbones are two filled quads and the eyes
   and nose are evenodd HOLES in the skull, so the mark is one colour and the
   plate shows through. Hollow (sketchy) is the same glyph outlined, still gold. */
.pmark--death { width:14px; height:14px; --m:var(--p-k-venue); line-height:0; }
.pmark--death > svg { display:block; width:14px; height:14px; fill:var(--m); }
.pmark--death.is-hollow {
  box-shadow:none; --m:var(--p-k-venue);
}
.pmark--death.is-hollow > svg { fill:none; stroke:var(--m); stroke-width:.9; }
.pmark--triple.is-hollow { box-shadow:none; --m:var(--p-sketchy); }
/* the red X — the system's one "closed / refused / it died" mark */
.pmark--x { position:relative; width:11px; height:11px; --m:var(--p-diff-red); }
.pmark--x::before, .pmark--x::after {
  content:""; position:absolute; left:0; top:4px; width:11px; height:2px; background:var(--m);
}
.pmark--x::before { transform:rotate(45deg); }
.pmark--x::after  { transform:rotate(-45deg); }
.pmark.is-hollow { background:none; box-shadow:inset 0 0 0 2px var(--p-sketchy); --m:var(--p-sketchy); }
/* 0072 1.2 - two more letters in the ONE alphabet: park, free ride. */
.pmark--park { width:20px; height:9px; border-radius:2px; background:var(--m); --m:var(--p-hazard); }
.pmark--free { position:relative; width:14px; height:11px; --m:var(--p-cream); }
.pmark--free::before, .pmark--free::after {
  content:""; position:absolute; left:2px; top:4px; width:11px; height:2px; background:var(--m);
  transform-origin:left center;
}
.pmark--free::before { transform:rotate(-42deg); }
.pmark--free::after  { transform:rotate(42deg); }

/* specs/0048 — the trick HUD. Upper-centre, under the top HUD and clear of the
   speedometer's top-left box by the width of the screen. Three siblings rather
   than one wrapper, because the build gate force-measures .phud__combo on its
   own and a hidden parent would hand it a 0x0 rectangle to pass against. */
.phud__atime, .phud__combo, .phud__cend { ${l}pointer-events:none; }

/* ================================================= specs/0055 §4.5 — THE SLOTS
   "It should move to the side if a new timer or something is ticking there"
   (D10). THREE SLOTS, ONE OCCUPANT EACH:

     S1  left:50%  top:12.5%   the live timer (.phud__atime) > the receipt
     S2  left:50%  top:21.5%   the combo meter (.phud__combo)
     S3  left:calc(50% + 232px) top:12.5%, left-aligned — whichever of S1's
                               two got displaced

   S1 and S3 are the same hero box, S3's left edge at \`calc(50% + 232px)\` — the
   spec's own coordinate. \`--p-hero-box\` is **300 px**, and NOT the 208 px that
   reading "232 px apart" as "the hero's width + a 24 px gutter" would give: a
   68 px six-figure score does not fit 208, and at 300 S1 (490-790) still clears
   S3 (872) by 82 px. The receipt owns S1 UNLESS a timer is live there, and then
   it takes S3 and arrives RISE instead of SNAP. This is also 0057's seam
   (§4.9): air time and jib time are the SAME clock in S1, never two.

   specs/0055 §4.4 (fidelity 2026-09-06) — S2 IS NO LONGER 300 px. The picked
   combo cell is the gate post, which is content-sized (the cell's own gate is
   220.6 px), so S2 grows with the names and caps at the hero box. S1 and S3
   keep the box: the receipt still lands in exactly the pixels the timer
   vacated, which is the half of "the same object" that pick B does not touch.

   AND THE BLOCKS DO NOT TOUCH — §8's P4. 12.5 % and 21.5 % of 720 are 90 px and
   154.8 px, so S1 has 64.8 px of room and a 68 px hero on a \`line-height:1\` box
   is 3.2 px too tall for it: with a live timer and a live combo on screen at
   once the two rectangles have overlapped since 0048, which is the defect P4
   exists to catch. \`line-height:.9\` gives the same glyphs a 61.2 px box — the
   ink is untouched, the half-leading is what shrinks. The bare timer spends the
   3.6 px that leaves on the picked hairline seam: 2 px of gap and 1 px of rule,
   S1 = 64.2, and it clears S2 by 0.6 px. Nothing here is a nudge: every number
   is either the spec's, the cell's, or arithmetic on them. */
.phud__atime, .phud__cend {
  position:absolute; left:50%; top:12.5%; transform:translateX(-50%);
  box-sizing:border-box; width:var(--p-hero-box);
}
/* THE RECEIPT KEEPS THE PLATE — specs/0055 §4.4 (fidelity 2026-09-06). The
   fidelity sheet measured the receipt cell's block at 336×146.9 with 18 px of
   padding = 300 px of content and the same 2 px rule, so this half of the pair
   was already the pick and only its provenance line was missing. The TIMER is
   the half that changed: cell B has no surface at all. */
.phud__cend {
  padding:0 14px;
  background:var(--p-plate);
  border-bottom:var(--p-rule) solid var(--p-grad-to);
  border-radius:var(--p-r);
}
/* S3 — left-aligned, the gutter's width to the right of S1's own left edge */
.phud__cend.is-s3 { left:calc(50% + 232px); transform:none; text-align:left; }
/* ------- specs/0055 §4.3 (fidelity 2026-09-06) — THE TIMER IS **BARE**
   The picked cell (lookbook \`#k-trick-live-timer\`, B) draws NO PLATE: a bare
   68 px gradient hero and one 132×1 px \`rgba(42,36,86,.35)\` hairline under it
   — "the mounting seam shrunk to a hairline", in the cell's own words. W2 built
   cell A's 300 px 34 %-ink plate instead, which is deviation #3 on the sheet.
   The 300 px BOX stays: it is what holds §4.5's slot geometry still and what
   keeps the meter's left edge from moving as the digits change width.

   THE SEAM'S GAP IS 2 px AND NOT THE CELL'S 9 — the one number here that is
   arithmetic rather than the cell's. §4.5 gives S1 exactly 64.8 px (12.5 % and
   21.5 % of 720 are 90 and 154.8) and a 68 px hero on \`line-height:.9\` is
   61.2 of them; 9 + 1 does not fit in the 3.6 that are left, and at the cell's
   9 the hairline would land at 161.2 — straight across the combo's own 2 px
   post, which starts at 158.8. 2 + 1 fits with 0.6 px to spare and P4 stays
   green. Everything else — the 132 px width, the 1 px height, the colour, the
   centring — is the cell's. */
.phud__atime {
  padding:0; background:none; border:0; border-radius:0;
  font-size:${n.hero}px; line-height:.9; white-space:nowrap; text-align:center;
}
.phud__atime-seam {
  width:132px; height:var(--p-hairline); background:var(--p-dim); margin:2px auto 0;
}
/* THE GRADIENT GOES ON THE NUMERAL, NOT ON THE BLOCK. \`background-clip:text\`
   clips EVERY background the element has, so a gradient declared on the block
   would clip the 34 % ink plate to the shape of the digits — which is exactly
   what the first build of this row did, and the plate simply did not appear.
   The hero is its own span (0057/R2 made it one), so the gradient lives there
   and the plate stays a plate. */
.phud__atime-n { ${f} }
.phud__atime[hidden], .phud__atime.is-hidden { display:none; }
.phud__atime.is-out { opacity:0; transition:opacity var(--p-fall) linear; }

/* ------------------------------------------ specs/0055 §4.3 — LIVE AIR **B**
   THE METER IS VERTICAL, TO THE RIGHT OF THE NUMBER (D9): 16 px off the hero
   block's right edge, the hero's own height, and 5× the 2 px gauge = 10 px
   wide. It is the ONE place §1.10's shared gauge is widened.

   FLAMES RUN UP: the fill rises from the bottom in the gradient, and the five
   notches in the track are \`speedo.js:106\`'s five thresholds — read as
   DECISECONDS, so 10/20/28/30/40 are 1.0/2.0/2.8/3.0/4.0 s in the air. One
   number governs both instruments, which is what §4.3 asks for: the dial's
   \`T_WARM\` and the meter's first notch are the same 10.

   ...AND IT THICKENS AT EACH THRESHOLD — 10 → 12 → 14 → 16 → 18 px at those
   same five, written from JS as \`--aw\`. A gauge that gets FATTER as it fills is
   the one gauge in the system allowed to change shape, because the thing it
   measures is the one thing in the game that is only ever going one way. */
.phud__atime-m {
  position:absolute; left:100%; margin-left:16px; top:0;
  /* THE HERO'S OWN HEIGHT, and the hero's line box is now 61.2 of the block's
     64.2 px — the seam and its gap are the other 3. §4.3 asks for the meter to
     be the hero's height, so it is measured off the hero and not off the block
     it hangs on: specs/0055 §4.3 (fidelity 2026-09-06). */
  height:calc(var(--p-hero) * .9); bottom:auto;
  width:var(--aw,10px);
  background:linear-gradient(to top,
    var(--p-dim) 0 24.2%, var(--p-hair) 24.2% 25.8%,
    var(--p-dim) 25.8% 49.2%, var(--p-hair) 49.2% 50.8%,
    var(--p-dim) 50.8% 69.2%, var(--p-hair) 69.2% 70.8%,
    var(--p-dim) 70.8% 74.2%, var(--p-hair) 74.2% 75.8%,
    var(--p-dim) 75.8% 100%);
}
.phud__atime-m > i {
  position:absolute; left:0; right:0; bottom:0; height:var(--af,0%);
  background:linear-gradient(0deg,var(--p-grad-from),var(--p-grad-to));
}
/* specs/0057 §4.4 — THE UNIT, and it is the speedometer's unit treatment moved
   into the DOM: 11 px flat beside a gradient hero, which is the pattern the
   dial already reads as "number, then what the number is". It says AIR or JIB,
   and that one word is the whole of "no new chrome" — a jib borrows the timer
   rather than being handed a second clock in a second corner.
   The gradient above paints with -webkit-text-fill-color:transparent, which
   descendants inherit, so the unit has to put its own fill back or it renders
   as a hole in the hero. */
.phud__atime-u {
  font-size:${n.unit}px; line-height:1; margin-left:8px;
  background:none; color:var(--p-cream);
  -webkit-text-fill-color:var(--p-cream);
}

/* ------ specs/0055 §4.4 (fidelity 2026-09-06) — THE COMBO IS THE **GATE POST**
   The picked cell (lookbook \`#k-trick-combo-meter\`, B) is TWO SURFACES JOINED
   BY A POST, not one plate with three justified tokens — that is cell A, and it
   is what W2 built (deviation #4 on the sheet). Measured off the cell at 1:1:

     post      2 × 16 px, \`rgba(42,36,86,.35)\`, 4 px above it   (= --p-dim)
     tile      56.4 × 38, \`#f4f1ea\` cream, padding 5/10, the 28 px multiplier
     board    164.2 × 38, \`rgba(23,22,20,.78)\` ink, padding 8/13/7, gap 10,
               the 13.5 px trick names + the verdict word, baseline-aligned
     joint     220.6 × 38, radius 2, \`overflow:hidden\` so the two surfaces
               meet with no seam between them
     rule      the joint's full width, 2 px, \`rgba(42,36,86,.35)\` track under
               a \`#3b6cff\` fill — the grace countdown, now the board's own
               MOUNTING RULE, which is the whole of the signage read

   NO NEW SLAB (D19): cream and ink are §1.6's own two surfaces, and the 78 %
   ink is the cell's — the pick, not an invention. The multiplier becomes the
   PLATE and the trick line becomes the BOARD, which is the literal signage
   grammar §2 already gives the mountain.

   THE 300 px BOX IS A CAP HERE, NOT A WIDTH. The cell's gate is content-sized —
   a two-token board is 164 px and a longer pair is longer — so the box grows
   with the names and stops at \`--p-hero-box\`, the timer's own width, past
   which the name ellipsises rather than the gate running off a 390 px phone.
   The two \`.phud__combo-sep\` middots stay in the DOM (0057/R2 owns the tail's
   content and §4.9 renames nothing) and stay undrawn: the two surfaces do
   their job. */
.phud__combo {
  position:absolute; left:50%; top:21.5%; bottom:auto; transform:translateX(-50%);
  box-sizing:border-box; width:auto; max-width:var(--p-hero-box); padding:0;
  background:none; border:0; border-radius:0;
  display:flex; flex-direction:column; align-items:center; gap:0;
  white-space:nowrap; text-shadow:none;
}
.phud__combo[hidden], .phud__combo.is-hidden { display:none; }
/* the post — 2 × 16, 4 px clear of whatever is above it, and it is the whole of
   "a post hangs the thing off the timer". It is the first child, so §4.5's
   \`top:21.5%\` lands on the post and the gate sits 20 px under it. */
.phud__combo-post {
  flex:none; width:var(--p-gauge); height:16px; background:var(--p-dim); margin-top:4px;
}
/* the JOINT: the cream tile and the ink board, welded. \`overflow:hidden\` on a
   2 px radius is what makes them one object rather than two chips. */
.phud__combo-line {
  display:flex; align-items:stretch; max-width:100%; min-width:0;
  border-radius:var(--p-r); overflow:hidden;
}
.phud__combo-tile {
  flex:none; display:grid; place-items:center;
  padding:5px 10px; background:var(--p-cream);
}
.phud__combo-board {
  display:flex; align-items:baseline; gap:10px; min-width:0;
  padding:8px 13px 7px; background:rgba(23,22,20,.78);
}
.phud__combo-mult { flex:none; font-size:${n.heroSmall}px; line-height:1; ${f} }
.phud__combo-sep { display:none; }
.phud__combo-n, .phud__combo-q { font-size:${n.secondary}px; color:var(--p-cream); }
.phud__combo-n {
  flex:0 1 auto; min-width:0;
  overflow:hidden; text-overflow:ellipsis;
}
.phud__combo-q { flex:none; }
.phud__combo-n.is-hidden, .phud__combo-q.is-hidden { display:none; }
.phud__combo-q.is-clean { color:var(--p-cream); }
.phud__combo-q.is-sketchy { color:${n.sketchy}; }
.phud__combo-q.is-bailed { color:${n.bailed}; }
/* THE POP IS **SNAP**, 90 ms, \`scale .96 -> 1\` (§1.11) — replacing 0048's
   160 ms 1.0 -> 1.08 -> 1.0. Six verbs, and the punch is one of them: a pop
   that overshoots is a seventh. On the line and not on the block, so the gauge
   under it does not breathe with every landed trick. */
.phud__combo-line.is-pop { animation:psnap var(--p-snap) both; }
@keyframes psnap { from{transform:scale(.96)} to{transform:scale(1)} }

/* ---------------------------------- specs/0055 §4.6 — THE MARKS, UNDER THE LEDGER
   §1.8's alphabet carrying the combo's own facts: one mark per trick, left to
   right, capped at 8 — past which the row reads \`8 marks + xN\` (\`tricks.js:278\`
   already slices to 8). The multiplier stays the 28 px gradient numeral and is
   never re-encoded as marks. */
.phud__marks {
  display:flex; align-items:center; justify-content:flex-start; gap:5px; min-height:11px;
  /* specs/0055 §4.6 (fidelity 2026-09-06) — "under the board", and left to
     right FROM THE BOARD'S OWN LEFT EDGE. \`align-self:stretch\` is what makes
     that true inside a centred column: the row spans the gate and its marks
     start where the cream tile starts. The 5 px is the gap the ledger's own
     column used to supply. */
  align-self:stretch; margin-top:5px;
}
.phud__marks.is-hidden { display:none; }
.pmark.is-hidden { display:none; }
.phud__marks-more {
  font-size:${n.unit}px; line-height:1; color:var(--p-cream); opacity:.8;
}

/* comboGraceT, drained full -> empty: the "you have 2 s to link" read, and it
   is §1.10's ONE 2 px gauge — now sitting directly under the board as the
   gate's MOUNTING RULE, at the joint's own width (specs/0055 §4.4, fidelity
   2026-09-06: the cell draws it 220.6 × 2, flush under the two surfaces). */
.phud__grace {
  align-self:stretch; height:var(--p-gauge); background:var(--p-dim);
}
.phud__grace i { display:block; height:100%; width:100%; background:var(--p-grad-to); }
.phud__grace.is-hidden { display:none; }

/* --------------------------------- specs/0055 §4.4 — THE RECEIPT **B** / BAIL **B**
   THE RECEIPT IS THE TIMER'S CONSTRUCTION with one word changed: same 208 px
   box, same plate, same rule, same hero — which is what "lands in the pixels
   the timer vacated" means literally, and why the swap into S3 (§4.5) is a move
   and not a redesign. Arrives SNAP in S1, RISE in S3 (§6).
   BAILED is the same object again: the mounting rule goes flat #ff5c8a and the
   multiplier is struck through. The only non-gradient rule in the system. */
.phud__cend {
  display:flex; flex-direction:column; align-items:stretch;
  text-align:center; text-shadow:none; white-space:nowrap;
  /* the timer's box is a FLOOR here, not a cap: a six-figure score at 68 px is
     wider than 300 px, and a receipt that clipped its own number to land in the
     timer's pixels would be keeping the wrong promise. Every ordinary score
     sits in exactly the timer's box; a huge one grows out of it. */
  width:auto; min-width:var(--p-hero-box);
}
.phud__cend-row { display:flex; align-items:baseline; justify-content:center; gap:14px; }
.phud__cend[hidden], .phud__cend.is-hidden { display:none; }
.phud__cend.is-bail { border-bottom-color:var(--p-bailed); }
.phud__cend-score, .phud__cend-mult { font-size:${n.hero}px; line-height:.9; }
.phud__cend-score { ${f} }
.phud__cend-pb { font-size:${n.secondary}px; color:var(--p-cream); }
/* a bail shows the MULTIPLIER, crossed out, flat red-purple — the thing you
   lost, not a score you never banked. No gradient: you did not earn one. */
.phud__cend-mult {
  color:${n.bailed};
  text-decoration:line-through; text-decoration-thickness:4px;
}
.phud__cend-score.is-hidden, .phud__cend-pb.is-hidden, .phud__cend-mult.is-hidden { display:none; }

/* ---- specs/0055 §4.4 (fidelity 2026-09-06) — THE PROVENANCE LINE, cell B
   The ONE thing that distinguishes the receipt's B cell from its A, and the
   only thing the sheet found missing on this row: a 1 px \`rgba(244,241,234,.22)\`
   hairline 10 px under the number, then ONE 9 px mono line — the multiplier,
   the best trick, and the run it happened on. All three are fields the personal
   -best board already stores, so the receipt becomes a row you will later
   recognise on that board. The run is the nearest run marker (or the equipped
   trail); with neither, the token is simply not printed — a receipt that said
   "· —" would be inventing a fact. */
.phud__cend-hair {
  height:var(--p-hairline); background:rgba(244,241,234,.22); margin:10px 0 7px;
}
.phud__cend-prov {
  font-family:var(--p-mono); font-size:9px; font-style:normal; font-weight:700;
  letter-spacing:.2em; text-transform:uppercase; color:#cdc7ba;
}
.phud__cend-hair.is-hidden, .phud__cend-prov.is-hidden { display:none; }

/* ---- specs/0073 §4.2 — THE RANK, on the receipt. "#3 on JULIA'S GOLD" when
   the posted score enters the top 100.

   It is a SECOND LINE UNDER THE PROVENANCE, not a fourth token in it. The
   provenance line is three facts about the run you just did; this is one fact
   about everybody else's, and it arrives up to a second later than the rest of
   the card (the post is a round trip). A token appended into that line would
   reflow it after it had already been read, and would put a claim about the
   world in a row that is otherwise entirely about you.

   Cream against the provenance's #cdc7ba for the same reason the race card's
   rank line is cream against its rows: at 9 px the register says "this one
   matters" with contrast. */
.phud__cend-rank {
  font-family:var(--p-mono); font-size:9px; font-style:normal; font-weight:700;
  letter-spacing:.2em; text-transform:uppercase; color:var(--p-cream);
  margin-top:5px;
}
.phud__cend-rank.is-hidden { display:none; }

/* ---- specs/0055 §4.4 + §4.6 (fidelity 2026-09-06) — THE BAIL'S MARK IS THE
   **DOUBLE DIAMOND**, not the red X. The picked cell (\`#k-trick-combo-end-bailed\`,
   B) draws §1.8's double diamond in the bail's own \`#ff5c8a\`, 34 × 17 with
   11 px lobes, justified to the block's left edge opposite the struck
   multiplier — "the big trick you lost", the severity of the thing and the loss
   of it in one glance. W2 drew a red X there instead (deviation #6). The X is
   NOT relocated to the ledger's mark row: neither the A nor the B cell of this
   panel draws one, and the row is gone by the frame the combo dies anyway. */
.phud__cend.is-bail .phud__cend-row {
  justify-content:space-between; align-items:center; gap:16px;
}
.phud__cend-dia { width:34px; height:17px; --m:var(--p-bailed); }
.phud__cend-dia::before, .phud__cend-dia::after { width:11px; height:11px; top:1px; }
.phud__cend-dia.is-hidden { display:none; }
/* specs/0066 §marks — THE BEST TRICK'S OWN MARK, beside its name on cell B's
   provenance line. It is the ledger's mark at the ledger's size, in the same
   alphabet, so "what did I just do" and "how hard was it" arrive together.
   Cell A's bail diamond above is untouched (0055 §4.4 pins it). */
.phud__cend-mark { vertical-align:-1px; margin-right:7px; }
/* §6 — SNAP in S1 (the punch, in the pixels you were already reading), RISE in
   S3 (it arrived beside something live, so it announces itself instead). */
.phud__cend.is-snap { animation:psnapc var(--p-snap) both; }
@keyframes psnapc {
  from{transform:translateX(-50%) scale(.96)} to{transform:translateX(-50%) scale(1)}
}
/* RISE only ever lands in S3, which is left-aligned and carries no transform of
   its own — so this one is the plain +10 px arrival §1.11 defines. */
.phud__cend.is-s3.is-rise { animation:prise var(--p-rise) var(--p-rise-ease) both; }
@keyframes prise { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

/* ======================================= specs/0055 §4.7 — WIPEOUT **C**
   "C title cut — we keep impact frames too for now" (Greg, decisions page
   2026-09-05). The film move: ONE WORD, 96 px, no plate, no surface, no colour
   of its own, arriving on the impact frame; everything that explains it comes
   later and smaller. Cream and not red, because the frame is already red —
   0054's \`hard-light\` flash and its vignette are UNTOUCHED and are what this
   sits on. NO ARC anywhere (D12), and no second stamp.

   The beat is the panel: word · pause · explanation, and it leaves in the
   opposite order so the punchline is the last thing on screen. The 96 px is the
   largest type in the game, past the 68 px hero and the intro's 56 px, and it
   is the one panel whose job is a joke.

   Arrival is **SNAP** (§4.7, §6's table) — the lookbook's C prose argued for a
   hard CUT on the word; the spec's six verbs give the stamp SNAP either way and
   the spec is what ships. 90 ms of \`scale .96 -> 1\` on 96 px type is a punch,
   not a bounce.

   Everything below is scoped to \`.is-wipe\`: a landed trick's stamp is 0048's
   and this row does not touch it. */
/* specs/0055 §4.7 (fidelity 2026-09-06) — THE PANEL IS THE WORD'S OWN WIDTH.
   The picked cell (\`extra-patrol-wipeout.html\` #wo-c, the +0.40 s frame) has no
   width at all: \`white-space:nowrap\` and shrink-to-fit, so the rule and the
   stat row are justified to WIPEOUT itself — measured 462.25 px at 96 px. W2
   shipped \`min(760px,86vw)\` = 760 at 1280, 298 px (65 %) wider than the word,
   which put the joke and the numbers out past both ends of it (deviation #7).
   \`max-content\` is that shrink-to-fit, said in one property; \`96vw\` is the only
   thing that ever overrides it, on a phone too narrow for 96 px caps, and the
   row then justifies to the box because the box is what is left. */
.phud__trick.is-wipe { top:34%; width:max-content; max-width:96vw; }
.phud__trick.is-wipe .phud__trick-big {
  ${l}font-size:96px; line-height:.94; font-weight:${n.weight};
  letter-spacing:${n.track}em; color:var(--p-cream);
  text-shadow:0 3px 26px rgba(0,0,0,.55);
}
.phud__trick.is-wipe .phud__trick-rule {
  height:var(--p-rule); background:rgba(244,241,234,.30); margin:6px 0 8px;
}
.phud__trick.is-wipe .phud__trick-row {
  display:flex; justify-content:space-between; align-items:baseline; gap:20px;
}
/* the joke is PROSE: roman, sentence case, never oblique (§1.2) */
.phud__trick.is-wipe .phud__trick-sub {
  margin:0; font-family:var(--p-fam); font-style:normal; font-weight:${n.weight};
  font-size:14px; letter-spacing:normal; text-transform:none;
  color:#f0ece0; text-shadow:0 1px 8px rgba(0,0,0,.8);
}
.phud__trick.is-wipe .phud__trick-n {
  ${l}font-size:14px; line-height:1; color:rgba(244,241,234,.72);
  font-variant-numeric:tabular-nums;
}
/* a landed trick keeps 0048's centred sub and shows neither rule nor numbers */
.phud__trick:not(.is-wipe) .phud__trick-rule,
.phud__trick:not(.is-wipe) .phud__trick-n { display:none; }
/* the beat: the rule and the line RISE 0.40 s after the word, and the word
   FALLs 160 ms before them so the punchline outlives it (§4.7's stagger) */
.phud__trick.is-wipe .phud__trick-rule,
.phud__trick.is-wipe .phud__trick-row { opacity:0; }
.phud__trick.is-wipe.is-late .phud__trick-rule,
.phud__trick.is-wipe.is-late .phud__trick-row {
  animation:prise var(--p-rise) var(--p-rise-ease) both;
}
.phud__trick.is-wipe.is-snap { animation:psnapc var(--p-snap) both; }
.phud__trick.is-wipe.is-gone-word .phud__trick-big {
  opacity:0; transition:opacity var(--p-fall) linear;
}
.phud__trick.is-wipe.is-gone-line .phud__trick-rule,
.phud__trick.is-wipe.is-gone-line .phud__trick-row {
  animation:none; opacity:0; transition:opacity var(--p-fall) linear;
}

/* ================================================ specs/0055 §1.9 + §4.8
   THE LAB DIALECT — register 3 in mono, no gradient, a 4 px hazard rule on the
   top edge, and the rule MEANS NOT SHIPPING. §1.9 names the eight surfaces that
   wear it and §8's P3 asserts exactly eight; anything shipped that grows one is
   the bug the census is for.

   These rules are in THIS sheet rather than play.css on purpose: play.css is
   linked before the injected sheet, so at equal specificity these win, and
   §1.1 keeps play.css free of token declarations. */
.plab {
  background:rgba(23,22,20,.90);
  border:0; border-top:var(--p-stripe) solid var(--p-hazard);
  border-radius:0 0 var(--p-r) var(--p-r);
  font-family:var(--p-mono); color:#e8e4da;
  box-shadow:0 8px 26px rgba(0,0,0,.45);
  padding:0;
}
.plab__hd {
  display:flex; justify-content:space-between; align-items:baseline; gap:18px;
  padding:6px 10px 5px; border-bottom:var(--p-hairline) solid var(--p-hair);
  font-size:9.5px; letter-spacing:.18em; text-transform:uppercase; color:#ff9153;
}
.plab__hd .v { color:#ff9153; font-variant-numeric:tabular-nums; }
.plab__bd { padding:7px 10px 8px; font-size:10.5px; letter-spacing:.04em; line-height:1.62; }

/* §4.8 — DEBUG READOUT **A**: the slate moves to 200,14, off the dial's 172 px
   box, which is the whole of the collision 0048 shipped with. FPS **stops being
   a floating chip** and becomes the header's right-hand value: fps is a fact
   about the SESSION, not about the rider, so it belongs beside the poi name the
   way a map board carries its scale — two panels become one. */
.phud__read {
  left:200px; top:14px; right:auto; min-width:252px;
  padding:0; gap:0;
}
.phud__read .phud__title {
  padding:6px 10px 5px; border-bottom:var(--p-hairline) solid var(--p-hair);
  font-size:9.5px; letter-spacing:.18em; color:#ff9153;
}
.phud__read .phud__title b { color:#ff9153; letter-spacing:.18em; }
.phud__read .phud__title .dot { background:var(--p-hazard); }
/* the fps value, moved INTO the title row */
.phud__title .spacer { flex:1 1 auto; }
.phud__read .phud__fps {
  position:static; padding:0; background:none; border:0; border-radius:0;
  font-size:9.5px; letter-spacing:.18em; color:#ff9153;
}
.phud__read .phud__fps .k { color:#ff9153; opacity:.7; }
.phud__read .phud__fps .v { color:#ff9153; }
/* dev.js's band pushes the lab surfaces down 34 px while it is up (W5's
   \`is-devbar\`). The fps node is INSIDE the readout now, so it would take that
   offset twice and sit 34 px below its own header row. */
body.play.is-devbar .phud__read .phud__fps { margin-top:0; }
.phud__read .r { padding:0 10px; }
.phud__read .r:first-of-type { padding-top:7px; }
.phud__read .r:last-child { padding-bottom:8px; }

/* §4.8 — LEADERBOARD **B**: the breadcrumb rotates 45° into a diamond, at zero
   pixel cost. It is the smallest instance of §1.8's alphabet in the build.

   specs/0071 §3.1 — AND IT MOVES DOWN, because the top-right corner is the
   minimap's now. play.css:201 pins the dot at right:19px / top:44px, which is
   inside a 222 px circle inset 14 px from the same two edges; the dot cleared
   the fps chip it was placed under and nothing else, and the fps chip is
   lab-tier, so on the shipped screen that corner was empty until now.

   specs/0071 R3 — AND IT MOVES AGAIN, for the same reason and by the same
   arithmetic. Greg asked for the circle 50 % bigger, so 148 became 222, the
   circle's bottom edge went from 162 to 236, and the dot goes to 244: the
   bottom edge plus the 8 px the register puts between two stacked instruments.
   It is still the ONE hunk 0071 takes in this file — the panel itself is
   minimap.js, appended to document.body on speedo.js's precedent, and it asks
   hud.js for nothing but the room. */
.phud__bdot { border-radius:0; transform:rotate(45deg); top:244px; }

/* §4.8 — KEY HINT: the six free-floating chips become ONE BOARD WITH HAIRLINE
   DIVIDERS — the sign-post strip at the bottom of a lift line. Six contrast
   problems become one, and the bottom edge gets a shape. D44 holds: the
   E / I / F / B / F8 / SHIFT chips are still built and still dark, and the whole
   strip is still absent on \`pointer:coarse\` (hud.js sets display:none inline).
   Key caps are cream plates on ink; ESC keeps the orange, because it is the one
   key that leaves the world. */
.phud__legend {
  gap:0; flex-wrap:nowrap; max-width:none;
  border-radius:var(--p-r); overflow:hidden;
  box-shadow:0 4px 16px rgba(0,0,0,.36);
}
.phud__legend .pkey {
  background:rgba(23,22,20,.86);
  border:0; border-radius:0;
  border-left:var(--p-hairline) solid var(--p-hair);
  padding:6px 11px; gap:7px;
  font-family:var(--p-mono); font-size:9.5px; letter-spacing:.13em; color:#cdc7ba;
}
.phud__legend .pkey:first-child { border-left:0; }
.phud__legend .pkey b {
  background:var(--p-cream); color:var(--p-ink);
  border-radius:var(--p-r); padding:3px 7px; letter-spacing:.06em;
}
/* ESC is the exit, and the only chip that keeps the signal colour */
.phud__legend .pkey.is-out b { background:var(--p-hazard); color:#fff; }
/* HOLD, live (§1.11) — a held key inverts its cap for exactly as long as it is
   held. That is the existing \`is-on\` state, restyled, not a new one. */
.phud__legend .pkey.is-on { background:rgba(23,22,20,.86); border-color:var(--p-hair); color:var(--p-cream); }
.phud__legend .pkey.is-on b { background:var(--p-hazard); color:#fff; }

/* §1.9 — THE HAZARD STRIPE, on the surfaces hud.js owns. The compression meter
   is styled from a \`cssText\` this rule deliberately does not touch: §0 pins
   \`hud.js:228-291\` byte-identical, and \`border-top\` is not one of the
   properties that block declares, so the stripe lands without editing it. */
.phud__read, .phud__lip, .phud__dev, .phud__ref {
  border:0; border-top:var(--p-stripe) solid var(--p-hazard);
  border-radius:0 0 var(--p-r) var(--p-r);
  background:rgba(23,22,20,.90);
}
.phud__dev .phud__title, .phud__ref .phud__title {
  border-bottom:var(--p-hairline) solid var(--p-hair);
  padding-bottom:4px; margin-bottom:4px;
}

/* §5.5 / W5 hand-off 3 — THE F8 SLATE SAYS IT ONCE. dev.js's band head already
   prints \`DEV FLY · F8 · fly back\` across the top edge; this slate is the
   fly CAMERA's numbers, so it names those instead of repeating the mode. */
.phud__dev .phud__title b { color:#ff9153; }

/* §5.5 / W5 hand-off 1 — REFERENCE **A**: right-anchored, and an honest empty
   state. "no reference bundle" is a REFUSAL, not an error, so it gets §1.8's
   red X and no colour of its own. */
.phud__ref { right:14px; left:auto; }
.phud__ref-cap {
  display:flex; align-items:center; gap:8px;
  color:#cdc7ba; letter-spacing:.1em;
}
.phud__ref-cap .pmark { display:none; }
.phud__ref.is-empty .phud__ref-cap .pmark { display:block; }
.phud__ref.is-empty .phud__ref-img { display:none; }

/* §5.5 / W5 hand-off 2 — THE MATCH DIALOG'S FLASH LINE. \`hud.flash()\` is the
   one line dev.js has to say "I will not do that yet"; a refusal takes the red
   X and the words stay verbatim. */
.phud__toast.is-refusal {
  display:flex; align-items:center; gap:9px;
  border-color:var(--p-diff-red); color:var(--p-cream);
}

/* ============================================ specs/0055 §5.1 — W4 hand-off
   THE PAUSE MENU'S GEAR GROUPING. W4 built the map board and could not build
   the grouping, because the grouping is DATA and it lives in this file. Each
   group is its own sub-grid under a header carrying §1.8's mark, and the board
   flows the groups into two columns without a row count anywhere: \`column-count\`
   breaks between groups, never inside one.

   TWO COLUMNS ONLY WHEN THERE ARE TWO THINGS TO PUT IN THEM. \`column-count:2\`
   on a board holding ONE group still reserves the second column, and the
   shipped five-row tier then sits in a board with an empty right half — the
   exact failure W4's sheet comment names ("the shipped five-row tier reserves
   the lab tier's second column"). The builder adds \`is-cols\` when it emitted
   more than one group, which is the same "one code path, both tiers" §5.1
   asks for, said in one class instead of a row count. */
.ppause__keys { display:block; column-count:1; }
.ppause__keys.is-cols { column-count:2; column-gap:26px; column-fill:balance; }
.ppause__grp { break-inside:avoid; -webkit-column-break-inside:avoid; }
/* THE ROW PITCH IS THE LOOKBOOK'S 23 px (\`#k-pause-menu\`, cell A: key plates on
   a 23 px rhythm), not W4's flat-list 27. Eight group headers cost the lab
   board ~110 px it did not spend before, and at 27 the panel measured 880×750
   on a 720 screen — the ODbL credit §5.1 requires verbatim was rendered BELOW
   THE BOTTOM OF THE SCREEN, and "30 rows fit one screen" was not true. 17 px
   plate + 3 + 3 puts the lab board back inside the frame with the footer on it. */
.ppause__grp-rows .cap, .ppause__grp-rows .what { padding-bottom:3px; margin-bottom:3px; }
/* NO RULE UNDER THE GROUP HEADER. The lookbook cell draws none (Greg,
   2026-09-06: match the cell) — the mark and the gap are the header, and a
   second ink hairline in a board that is already all hairlines reads as one
   more row rather than as the thing above them. The 14 / 8 margins are the
   cell's own rhythm, and they buy back the 3 px of padding the rule needed. */
.ppause__grp-hd {
  display:flex; align-items:center; gap:8px;
  margin:14px 0 8px;
  font-family:var(--p-mono); font-size:9px; font-weight:700;
  letter-spacing:.2em; text-transform:uppercase; color:var(--p-sub);
}
.ppause__grp:first-child .ppause__grp-hd { margin-top:0; }
.ppause__grp-rows { display:grid; grid-template-columns:max-content auto; gap:0 14px; }
`,ee=document.createElement("style");ee.id="phud-type",ee.textContent=Q,document.head.appendChild(ee)})();const va={landing:"came in too hot",tree:"met a tree",rock:"that was rock",building:"that wall was load-bearing",tower:"the lift is not a slalom gate",person:"sorry. so sorry.",bench:"the bench had it coming"},Ye=[10,20,28,30,40],ya=r=>Ye.filter(n=>r*10>=n).length;function qt(){try{const r=window.__guide,n=r&&typeof r.equipped=="function"?r.equipped():null;if(n&&n.name)return String(n.name);const l=window.__playMarkers,f=l&&typeof l.stats=="function"?l.stats():null,v=f&&f.nearest;if(v&&v.kind==="run"&&v.name)return String(v.name)}catch{}return""}const Ea=[[180,1.5],[360,2],[540,3],[720,4],[900,6],[1080,8],[1260,10],[1440,13]];function Ta(r){let n=1;for(const[l,f]of Ea)if(r+1e-6>=l)n=f;else break;return r>1440?13+(r-1440)/180*3:n}const Sa={DOUBLE:2,TRIPLE:3,QUAD:4,QUINT:5,SEXT:6,SEPT:7,OCT:8},La=/\b(DOUBLE|TRIPLE|QUAD|QUINT|SEXT|SEPT|OCT)\s+(?:FRONT\s+|BACK\s+)?(?:FLIP|CORK|BIO|MISTY|RODEO|D-SPIN|UNDERFLIP)\b/i,Ca=/\b(?:SAFETY|INDY|MUTE|TAIL|NOSE|TRUCK DRIVER)\b/gi;function Vt(r){const n=/(\d{3,4})/.exec(r);if(n)return+n[1];const l=/\bFLAT\s+(\d+)\b/i.exec(r);if(l)return+l[1]*180;const f=La.exec(r);return f?Sa[f[1].toUpperCase()]*360:/half-cab/i.test(r)?180:/flip/i.test(r)?360:0}const Oa=r=>Math.floor(Math.max(0,Math.round(Vt(r)/180)*180)/360);function Na(r){const n=String(r).match(Ca);let l=n?n.length:0;return/\b(?:DOUBLE|TRIPLE|QUAD)\s+(?:SAFETY|INDY|MUTE|TAIL|NOSE|TRUCK)\b/i.test(r)&&(l=Math.max(l,2)),l}function Yt(r){const n=Vt(r),l=Oa(r);if(l>=5||l>=4&&Na(r)>=2||/d-spin/i.test(r)&&n>=1440)return"death";if(l===4)return"triple";if(l===3)return"double";if(l===2)return"black";const f=Ta(n);return f>=4?"black":f>=2?"blue":"green"}const Aa='<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="0.3" y="10.85" width="13.4" height="1.6" rx="0.3" transform="rotate(13 7 11.65)"/><rect x="0.3" y="10.85" width="13.4" height="1.6" rx="0.3" transform="rotate(-13 7 11.65)"/><path fill-rule="evenodd" d="M7 0.7c-3.1 0-5.2 2.3-5.2 5.2 0 1.7.8 2.9 1.8 3.6v1.2h6.8V9.5c1-.7 1.8-1.9 1.8-3.6C12.2 3 10.1.7 7 .7ZM5.1 4.35a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7ZM8.9 4.35a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7ZM6.3 7.6h1.4L7 9.1Z"/></svg>';function Xt(r,n){const l=t("span","pmark pmark--"+r+(n?" "+n:""));return r==="triple"&&l.append(t("i")),r==="death"&&(l.innerHTML=Aa,l.title="EXPERTS ONLY"),l}const V=(r,n)=>{r.textContent!==n&&(r.textContent=n)},t=(r,n,l)=>{const f=document.createElement(r);return n&&(f.className=n),l!=null&&(f.textContent=l),f};function Ma({poi:r,run:n,adapter:l,onResume:f,onRespawn:v}){const g=t("div","phud"),U=[],N=t("div","phud__read pchip"),Q=t("div","phud__title");Q.append(t("span","dot"),t("b",null,fa((r||"world").toUpperCase(),ma))),N.append(Q);const ee=t("span","spacer"),E={};for(const[e,i]of[["pos","x / y / z"],["spd","speed"],["state","state"],["gear","gear"],["cam","cam"],["ping","ping"]]){const a=t("div","r");a.append(t("span","k",i),t("span","v","—")),E[e]=a.lastChild,N.append(a)}K&&g.append(N);let L=null;if(K){const e=t("div","phud__lip pchip");e.style.cssText="position:absolute;left:12px;top:190px;min-width:236px;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;padding:8px 10px;pointer-events:none;white-space:pre;";const i=t("div","phud__title");i.append(t("span","dot"),t("b",null,"LIP · COMPRESSION")),e.append(i);const a=_=>{const b=t("div");b.style.cssText="display:flex;justify-content:space-between;gap:10px";const O=t("span",null,_);O.style.opacity=".55";const u=t("span",null,"—");return b.append(O,u),e.append(b),u},o={};for(const _ of["surface vy","reference","compression"])o[_]=a(_);const s=t("div");s.style.cssText="height:1px;margin:5px 0;opacity:.25;background:currentColor",e.append(s);for(const _ of["ramp x K","comp x K","charge"])o[_]=a(_);const d=t("div");d.style.cssText="position:relative;height:6px;margin:4px 0 6px;border:1px solid currentColor;opacity:.9";const p=t("i");p.style.cssText="position:absolute;left:0;top:0;bottom:0;width:0;background:currentColor;opacity:.95";const h=t("i");h.style.cssText="position:absolute;top:0;bottom:0;width:0;background:currentColor;opacity:.45";const S=t("i");S.style.cssText="position:absolute;top:-2px;bottom:-2px;width:1px;background:currentColor",d.append(p,h,S),e.append(d);const c=t("div");c.style.cssText="height:1px;margin:5px 0;opacity:.25;background:currentColor",e.append(c);for(const _ of["surface accel","snap release","pop window","pop now","state"])o[_]=a(_);const k=t("div");k.style.cssText="margin-top:6px;padding-top:5px;border-top:1px solid currentColor;opacity:.85;white-space:pre-wrap",k.textContent="takeoff —",e.append(k),g.append(e),U.push(e),L={box:e,rows:o,barR:p,barC:h,barMin:S,shot:k,shotT:0}}const ce=t("div","phud__fps");ce.append(t("span","k","fps "),t("span","v","—"));const Jt=ce.lastChild;Q.append(ee,ce);let R=null,Te={},te=null,Xe="";if(K){R=t("div","phud__dev pchip"),R.hidden=!0;const e=t("div","phud__title");e.append(t("span","dot"),t("b",null,"FLY CAMERA")),R.append(e);for(const[d,p]of[["pos","x / y / z"],["ang","yaw / pitch"],["fov","fov"],["spd","speed"],["cmp","compare"]]){const h=t("div","r");h.append(t("span","k",p),t("span","v","—")),Te[d]=h.lastChild,R.append(h)}te=t("div","phud__dev-url"),te.textContent="?spawn=",R.append(te);const i=t("div","phud__dev-btns"),a=t("button","pdev-btn pdev-btn--sm","copy params"),o=t("button","pdev-btn pdev-btn--sm","copy url");a.type=o.type="button",i.append(a,o),R.append(i),g.append(R);const s=(d,p)=>{const h=()=>{T.classList.remove("is-refusal"),T.textContent="copied · "+p,T.hidden=!1,X=1.2};navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(d).then(h,()=>{}):h()};a.addEventListener("click",d=>{d.stopPropagation(),s(te.textContent,"spawn params")}),o.addEventListener("click",d=>{d.stopPropagation(),s(Xe,"play url")})}const ue=t("div","phud__legend"),Je=e=>typeof e=="function"?Gt(t("b"),e):t("b",null,e),D=(e,i)=>{const a=t("span","pkey");return a.append(Je(e),document.createTextNode(i)),ue.append(a),a},Y=(e,i)=>{const a=t("span","pkey is-hidden");return a.append(Je(e),document.createTextNode(i)),a},w={move:D(qe(""),"move"),sprint:Y(m("sprint"),"sprint"),jump:D(m("jump"),"jump"),gear:Y(m("gear"),"gear"),inv:Y(m("locker"),"locker"),boost:D(()=>"HOLD "+M("jump"),"boost"),lift:Y(m("lift"),"lift"),spin:D(F("spinLeft","spinRight"),"spin"),cam:D(m("camera"),"camera"),reset:D(m("reset"),"reset"),refs:K?D("N","refs"):Y("N","refs"),dev:K?D("F8","dev"):Y("F8","dev"),pause:D(m("pause"),"pause")};w.lift.classList.add("is-hidden"),w.boost.classList.add("is-hidden"),w.pause.classList.add("is-out"),g.append(ue),matchMedia("(pointer: coarse)").matches&&(ue.style.display="none");const Se=matchMedia("(pointer: coarse)").matches,x=t("div","phud__prompt pchip");x.hidden=!0;const Ze=t("b",null,"F"),Le=t("span",null,"");x.append(Ze,Le),g.append(x);let me=!1,fe="F",Ce=0;const Qe={SPACE:"Space",ENTER:"Enter",ESC:"Escape",TAB:"Tab"},et=e=>{const i=String(e??"F").trim().toUpperCase();return Qe[i]?Qe[i]:/^[A-Z]$/.test(i)?"Key"+i:/^[0-9]$/.test(i)?"Digit"+i:"Key"+(i[0]||"F")};function tt(){if(x.hidden)return null;const e=et(fe),i={code:e,key:e.startsWith("Key")?e.slice(3).toLowerCase():e,bubbles:!0,cancelable:!0};return Ce++,x.dataset.fires=String(Ce),dispatchEvent(new KeyboardEvent("keydown",i)),dispatchEvent(new KeyboardEvent("keyup",i)),e}if(Se){x.classList.add("phud__prompt--tap"),x.addEventListener("touchstart",a=>{a.stopPropagation(),a.preventDefault(),x.classList.add("is-press")},{passive:!1});const e=a=>{const o=x.getBoundingClientRect();return a.clientX>=o.left&&a.clientX<=o.right&&a.clientY>=o.top&&a.clientY<=o.bottom},i=a=>o=>{o.stopPropagation(),o.preventDefault();const s=x.classList.contains("is-press");x.classList.remove("is-press");const d=o.changedTouches&&o.changedTouches[0];a&&s&&(!d||e(d))&&tt()};x.addEventListener("touchend",i(!0),{passive:!1}),x.addEventListener("touchcancel",i(!1),{passive:!1}),x.addEventListener("click",a=>{a.stopPropagation(),tt()})}const H=t("div","phud__fuel");H.hidden=!0;const Zt=t("span","phud__fuel-lbl","boost"),at=t("span","phud__fuel-bar"),it=t("i","phud__fuel-fill");at.append(it,t("i","phud__fuel-tick is-t1"),t("i","phud__fuel-tick is-t2")),H.append(Zt,at),g.append(H);let ae=!1,nt=!1;const T=t("div","phud__toast pchip");T.hidden=!0,g.append(T);let X=0;const C=t("div","phud__trick");C.hidden=!0;const ot=t("div","phud__trick-big"),Qt=t("div","phud__trick-rule"),st=t("div","phud__trick-row"),rt=t("div","phud__trick-sub"),dt=t("div","phud__trick-n");st.append(rt,dt),C.append(ot,Qt,st),g.append(C);let B=0,ge=!1,ie=0;const y=t("div","phud__atime"),pt=t("span","phud__atime-n","0.00"),lt=t("span","phud__atime-u","AIR"),be=t("div","phud__atime-m"),ea=t("i");be.append(ea);const ta=t("div","phud__atime-seam");y.append(pt,lt,be,ta),y.hidden=!0,g.append(y);let z=0,P=0,xe=!1,ht="",ct="";const G=t("div","phud__combo");G.hidden=!0;const aa=t("div","phud__combo-post"),ne=t("div","phud__combo-line"),ut=t("span","phud__combo-tile"),mt=t("span","phud__combo-board"),ft=t("span","phud__combo-mult","×1"),gt=t("span","phud__combo-sep","·"),Oe=t("span","phud__combo-n",""),bt=t("span","phud__combo-sep","·"),oe=t("span","phud__combo-q","");ut.append(ft),mt.append(gt,Oe,bt,oe),ne.append(ut,mt);const xt=t("div","phud__grace"),kt=t("i");xt.append(kt);const J=t("div","phud__marks"),_t=t("span","phud__marks-more","");G.append(aa,ne,xt,J),g.append(G);let Ne="";function ia(e,i,a){const o=e.length+"|"+(i||"")+"|"+(a?"x":"")+"|"+e.join(",");if(o===Ne)return;Ne=o,J.textContent="";const s=e.slice(0,8);s.forEach((d,p)=>{const h=Xt(Yt(d));i==="sketchy"&&p===s.length-1&&h.classList.add("is-hollow"),J.append(h)}),e.length>8&&(V(_t,"+ ×"+(e.length-8)),J.append(_t)),J.classList.toggle("is-hidden",!J.childElementCount)}let se=-1;const A=t("div","phud__cend");A.hidden=!0;const wt=t("div","phud__cend-row"),Ae=t("span","phud__cend-score","0"),Re=t("span","phud__cend-mult","×1"),vt=t("span","phud__cend-pb","PB"),yt=t("span","pmark pmark--double phud__cend-dia"),Et=t("div","phud__cend-hair"),re=t("div","phud__cend-prov",""),de=t("div","phud__cend-rank is-hidden","");wt.append(yt,Ae,Re,vt),A.append(wt,Et,re,de),g.append(A);let ke=0;const pe=t("div","phud__bdot");pe.hidden=!0,pe.title="L L",g.append(pe);const $=t("div","pgearmenu");$.hidden=!0;const Tt=t("section","panel pgearmenu__panel"),St=t("div","panel__hd");St.append(t("span","lbl lbl--accent","gear"),t("span","spacer"),t("span","lbl","e / esc close"));const Ie=t("div","panel__bd pgearmenu__bd");Tt.append(St,Ie),$.append(Tt),g.append($);let j=[],q=0,De=null;function He(){j.forEach((e,i)=>e.el.classList.toggle("is-sel",i===q))}function _e(){$.hidden=!0,De=null}function Pe(e){const i=j[e];if(!i||i.disabled)return;const a=De;_e(),a&&a(i.gear)}const na={openGear({current:e,def:i,gears:a,onPick:o}){Ie.textContent="",j=(a||["boots","skis"]).map((s,d)=>{const p=t("div","pgearmenu__row");return p.append(t("span","cap",String(d+1)),t("span","name",s),t("span","tag",s===e?"equipped":s===i?"default":"")),p.addEventListener("click",h=>{h.stopPropagation(),Pe(j.findIndex(S=>S.el===p))}),Ie.append(p),{el:p,gear:s,disabled:!1}}),q=Math.max(0,j.findIndex(s=>s.gear===e)),De=o,$.hidden=!1,He()},closeGear:_e,gearOpen(){return!$.hidden},gearKey(e){if($.hidden)return!1;if(e==="KeyW"||e==="ArrowUp")return q=(q+j.length-1)%j.length,He(),!0;if(e==="KeyS"||e==="ArrowDown")return q=(q+1)%j.length,He(),!0;if(e==="Enter"||e==="Space")return Pe(q),!0;if(e==="Escape"||e==="KeyE")return _e(),!0;const i=/^(?:Digit|Numpad)([1-9])$/.exec(e);return i&&Pe(Number(i[1])-1),!0}};if(K){const e=t("div","phud__ref pchip");e.hidden=!0;const i=t("img","phud__ref-img");i.alt="";const a=t("div","phud__ref-cap"),o=t("span","pmark pmark--x");a.append(o);const s=t("span",null,"");a.append(s),e.append(i,a),g.append(e),U.push(e);let d=[],p=0;fetch("/api/poi/"+encodeURIComponent(r)).then(c=>c.json()).then(c=>{d=[...c.aerials||[],...c.photos||[]]}).catch(()=>{});const h=()=>{if(!d.length){e.classList.add("is-empty"),s.textContent="no reference bundle";return}e.classList.remove("is-empty"),p=(p+d.length)%d.length;const c=d[p];i.src=c.url.replace("/files/","/thumb/")+"?w=900",s.textContent=c.name.replace(/\.(jpe?g|png|webp)$/i,"")+" · "+(p+1)+"/"+d.length+" · [ ] cycle · N close"},S=c=>!!c&&(c.tagName==="INPUT"||c.tagName==="TEXTAREA"||c.isContentEditable);addEventListener("keydown",c=>{$.hidden&&(S(c.target)||document.body.classList.contains("is-dev")||Ge()&&(c.code==="KeyN"?(e.hidden=!e.hidden,e.hidden||h()):!e.hidden&&c.code==="BracketRight"?(p++,h()):!e.hidden&&c.code==="BracketLeft"&&(p--,h())))})}const Lt=t("div","phud__cross");g.append(Lt);const I=t("div","ppause");I.hidden=!0;const Ct=t("section","panel ppause__panel"),Ot=t("div","panel__hd");Ot.append(t("span","lbl lbl--accent","paused"),t("span","spacer"),t("span","lbl",ga({lab:n||"","RED DOG":"red dog chair",SIBERIA:"siberia express"})));const Nt=t("div","panel__bd ppause__bd"),Z=t("div","ppause__keys");let Me=null,Fe=null,Ue=null,Be=null;const oa=[["core","every run","green"],["foot","on foot","green"],["ski","on skis","blue"],["bike","on the bike","blue"],["air","in the air","black"],["glide","on the glider","black"],["rocket","on the rocket pack","double"],["lab","lab only","x"]],At=[[m("pause"),"settings","core"],[qe(" "),"move","core"],[F("spinLeft","spinRight"),"tricks in the air","core"],[m("camera"),"camera","core"],[m("reset"),"reset","core"]],sa=[[m("sprint"),"sprint","foot"],[m("jump"),"jump","foot"],["MOUSE","look","foot"],[m("gear"),"gear · tap toggles, hold for menu","foot"],[m("locker"),"inventory · the ski rack, and every other gear type","foot"],[m("jump"),"hold to thrust · on the rocket pack — 6 s of fuel, refills itself at 1×","rocket"],[m("lift"),"ride the chairlift · at a base terminal","foot","lift"],[F("left","right"),"carve · on skis","ski"],[m("back"),"stop · on skis; moving backward it drives instead","ski"],[m("forward"),"skate · on skis; moving backward it stops you","ski"],[F("forward","back"),"pedal / pump · on bike","bike"],[m("sprint"),"brake · on bike","bike"],[m("jump"),"hold to preload, release on a lip to pop · on bike","bike"],["MOUSE","aim where to fly — the wing banks and carves round to it · on glider","glide"],[F("forward","back"),"nose down / nose up · on glider","glide"],[m("jump"),"hold to flare — bleed speed for a clean landing · on glider","glide"],["MOUSE","aim the motor — thrust goes exactly where you look · on the rocket pack","rocket"],[m("jump"),"let go and you are a falling body; burn back down the way you came to land · on the rocket pack","rocket"],[F("spinLeft","spinRight"),"spin / flip · in the air","air"],[F("flipFwd","flipBack"),"spin / flip · in the air","air"],[()=>M("grab")+" + "+qe(" ")(),"grab · nose / tail / mute / indy — W+S or A+D is a truck driver","air"],[m("grab"),"let go before you land — still held at touchdown is a wipeout","air"],[F("spinLeft","spinRight"),"barrel roll · flying","glide"],["N","reference photos","lab"],["[ ]","cycle refs","lab"],["F8","dev fly mode · noclip + reference compare","lab"]],Rt=[[m("lift"),"clear the trail · away from a lift terminal; at one, F still boards","core","trail"],[m("trailMap"),"trail map","core"]],It=[[F("flipFwd","flipBack"),"look","core"]],Dt=[[m("grab"),"grab","core"]],ra=K?[...At,...sa,...It,...Dt,...Rt]:[...At,...It,...Dt,...Rt],Ht=[];for(const[e,i,a]of oa){const o=ra.filter(h=>h[2]===e);if(!o.length)continue;const s=t("div","ppause__grp");e!=="core"&&Ht.push(s);const d=t("div","ppause__grp-hd");d.append(t("span","pmark pmark--"+a),t("span",null,i));const p=t("div","ppause__grp-rows");for(const[h,S,,c]of o){const k=typeof h=="function"?Gt(t("div","cap"),h):t("div","cap",h),_=t("div","what",S);c==="lift"&&(k.classList.add("is-hidden"),_.classList.add("is-hidden"),Me=k,Fe=_),c==="trail"&&(k.classList.add("is-hidden"),_.classList.add("is-hidden"),Ue=k,Be=_),p.append(k,_)}s.append(d,p),Z.append(s)}Z.childElementCount>1&&Z.classList.add("is-cols");const $e=(()=>{try{return matchMedia("(pointer: coarse)")}catch{return{matches:!1,addEventListener(){}}}})(),Pt=()=>$e.matches?"touch to resume":"any key to resume",we=t("button","btn btn--accent ppause__big",Pt());we.type="button";try{$e.addEventListener("change",()=>{we.textContent=Pt()})}catch{}const Mt=t("a","btn btn--ghost","return to bench");Mt.href="/#/run/"+encodeURIComponent(r)+"/"+encodeURIComponent(n);const je=t("button","btn btn--ghost","respawn");je.type="button";const Ft=t("div","ppause__row");Ft.append(we);const We=t("div","ppause__row");K&&We.append(Mt,je,t("span","lbl","adapter · "+l));const da=t("div","ppause__credit","terrain USGS 3DEP · trails © OpenStreetMap contributors (ODbL)");Nt.append(Z,Ft,We,da),Ct.append(Ot,Nt),I.append(Ct),g.append(I);const W=t("div","pboard");W.hidden=!0;const Ut=t("section","panel pboard__panel"),Bt=t("div","panel__hd");Bt.append(t("span","lbl lbl--accent","personal best"),t("span","spacer"),t("span","lbl","l l · esc close"));const le=t("div","panel__bd pboard__bd");Ut.append(Bt,le),W.append(Ut),g.append(W);const $t=e=>Math.round(Number(e)||0).toLocaleString("en-US"),pa=["rk","sc","mu","bt","sk","tr","wh"];function jt(e,i){const a=t("div","pboard__row"+(e?" "+e:""));return i.forEach((o,s)=>a.append(t("span",pa[s],o))),a}function la(e){if(le.textContent="",le.append(jt("pboard__row--hd",["#","score","mult","best trick","ski","trail","when"])),!e.length){le.append(t("div","pboard__empty","no runs banked yet · land a combo"));return}for(const i of e)le.append(jt(i&&i.you?"is-you":"",[String(i.rank!=null?i.rank:"—"),$t(i.score),"×"+(i.mult!=null?i.mult:1),i.best||"—",i.ski||"—",i.trail||"—",i.when||"—"]))}function ve(){W.hidden=!0}W.style.pointerEvents="auto",W.addEventListener("click",e=>{e.stopPropagation(),ve()}),I.style.pointerEvents="auto",we.addEventListener("click",e=>{e.stopPropagation(),f&&f()}),je.addEventListener("click",e=>{e.stopPropagation(),v&&v()}),I.addEventListener("click",()=>f&&f());const Wt=e=>{$e.matches&&(e.stopPropagation(),f&&f())};I.addEventListener("pointerdown",Wt),I.addEventListener("touchstart",Wt,{passive:!0}),document.body.appendChild(g);let ye=0,Ke=0,Kt=performance.now();const ze=e=>(e>=0?" ":"")+e.toFixed(1);let he=!1;function Ee(){const e=!I.hidden,i=Ge();for(const a of U)a.classList.toggle("is-hidden",!i),i||(a.hidden=!0);for(const a of[ce,ue,T,C,x,H,y,G,A,pe])a.classList.toggle("is-hidden",e);Lt.classList.toggle("is-hidden",e||he),N.classList.toggle("is-hidden",e||he||!i),w.refs.classList.toggle("is-hidden",!i),w.dev.classList.toggle("is-hidden",!i);for(const a of Ht)a.hidden=!i;Z.classList.toggle("is-cols",i&&Z.childElementCount>1),We.classList.toggle("is-hidden",!i),R&&(R.classList.toggle("is-hidden",e||!i),R.hidden=!he||!i)}return addEventListener("play:labui",Ee),Ee(),{root:g,pause:I,setPaused(e){I.hidden=!e,e&&(_e(),ve()),Ee()},isPaused(){return!I.hidden},setDev(e){he=!!e,w.dev.classList.toggle("is-on",he),Ee()},devTick(e){if(R){for(const i of Object.keys(Te))e[i]!=null&&(Te[i].textContent=e[i]);e.params!=null&&(te.textContent=e.params),e.url!=null&&(Xe=e.url)}},ping(e){E.ping&&(E.ping.textContent=e||"—")},lipMeter(e){if(!L)return;const i=!!e&&!!e.on&&Ge();if(L.box.hidden=!i,!i)return;const a=e.s,o=e.T,s=L.rows,d=(u,ha=2)=>(u>=0?"+":"")+Number(u||0).toFixed(ha);s["surface vy"].textContent=d(a.surfVy)+" m/s "+(a.surfVy>.05?"UP":a.surfVy<-.05?"down":"flat"),s.reference.textContent=d(a.vyFloor)+" m/s",s.compression.textContent=d(a.comp)+" m/s",s["ramp x K"].textContent=d(a.lipRamp),s["comp x K"].textContent=d(a.lipComp);const p=(a.lipRamp||0)+(a.lipComp||0);s.charge.textContent=(a.lipVy>0?Number(a.lipVy).toFixed(2):"0.00")+" / "+Number(o.lipMax).toFixed(2)+(a.lipVy>0?"":p>0?"  < lipMin":a.lipRamp<0?"  ramp negative":"");const h=u=>Math.max(0,Math.min(100,100*u/(o.lipMax||1))),S=h(Math.max(0,a.lipRamp));L.barR.style.width=S.toFixed(1)+"%",L.barC.style.left=S.toFixed(1)+"%",L.barC.style.width=h(a.lipComp).toFixed(1)+"%",L.barMin.style.left=h(o.lipMin).toFixed(1)+"%";const c=a.sincePop==null?1e9:a.sincePop;let k;!e.grounded&&a.airT>0?k=a.popPaid?"spent":a.lipVy>0&&a.airT<=o.popCoyote?"COYOTE "+(o.popCoyote-a.airT).toFixed(2)+"s left":"closed":a.lipVy>0?k=c<=o.popWindow?"ARMED (popped "+c.toFixed(2)+"s ago)":"at lip · pop now":k="no charge";const _=a.dVyS||0,b=a.gravity||16;s["surface accel"].textContent=d(_,1)+" / -"+b.toFixed(0)+(_<-b?"  PAST FREE FALL":""),s["snap release"].textContent=a.dropK>0?(100*a.dropK).toFixed(0)+"%  "+Number(a.snapFull).toFixed(2)+" -> "+Number(a.snapCut).toFixed(2)+" m":"glued  "+Number(a.snapFull||0).toFixed(2)+" m",s["pop window"].textContent=k;const O=e.pop;if(s["pop now"].textContent=O?Number(O.total).toFixed(2)+" m/s"+(O.add>.005?"  (+"+O.add.toFixed(2)+")":"")+(O.add<=.005&&O.compRaw>.5?"  "+O.gate.toUpperCase():""):"—",s.state.textContent=(e.grounded?"on snow":"air "+Number(a.airT).toFixed(2)+"s")+(a.lipVy>0?" · charged":""),e.launch){const u=e.launch;L.shot.textContent="takeoff "+(u.total>.01?"+"+u.total.toFixed(2)+" m/s":"flat")+"  ["+u.src.toUpperCase()+"]"+(u.drop?`
  DROP-AWAY  snap `+Number(u.snapFull).toFixed(2)+" -> "+Number(u.snapCut).toFixed(2)+" m ("+(100*u.dropK).toFixed(0)+`% let go)
  surface `+d(u.dVyS,1)+" vs -"+u.grav.toFixed(0)+", past free fall":"")+(u.total>.01?`
  ramp `+d(u.ramp)+"  comp "+d(u.comp)+"  -> charge "+u.charge.toFixed(2)+(u.pop>0?`
  pop bonus +`+u.pop.toFixed(2):"")+(u.restored>0?"  (jump restored +"+u.restored.toFixed(2)+")":""):u.drop?"":`
  no charge (ramp `+d(u.ramp)+" comp "+d(u.comp)+")")+(u.eaten?`
  SWALLOWED, still on the snow next frame`:""),L.shotT=2}else L.shotT>0&&(L.shotT-=e.dt||.016,L.shotT<=0&&(L.shot.textContent="takeoff —"))},setLiftKey(e){me=!!e,w.lift.classList.toggle("is-hidden",!me),Me&&Me.classList.toggle("is-hidden",!me),Fe&&Fe.classList.toggle("is-hidden",!me)},setTrailKey(e){return Ue&&Ue.classList.toggle("is-hidden",!e),Be&&Be.classList.toggle("is-hidden",!e),!!e},setPrompt(e){if(!e){x.hidden=!0,x.classList.remove("is-press"),w.lift.classList.remove("is-on");return}fe=e.key||"F",Ze.textContent=Se?"TAP":fe,x.dataset.key=et(fe),x.dataset.tap=Se?"1":"0",x.dataset.fires=String(Ce),Le.textContent=" "+(e.text||""),x.hidden=!1,w.lift.classList.add("is-on")},promptText(){return x.hidden?null:Le.textContent.trim()},setFuel(e,i,a,o=!0){const s=Math.max(0,Math.min(1,Number(e)||0));if(ae=!!i&&!!o,nt=!!o,H.hidden=!o||s>.999&&!ae,H.hidden){w.boost.classList.remove("is-on");return}it.style.width=(s*100).toFixed(1)+"%",H.classList.toggle("is-burn",ae),H.classList.toggle("is-dry",!!a),w.boost.classList.toggle("is-on",ae)},fuelShown(){return!H.hidden},flashGear(e){T.classList.remove("is-refusal"),T.textContent="gear · "+e,T.hidden=!1,X=1.4},...na,flash(e){const i=String(e??""),a=/\b(first|failed|blank|empty)\b/i.test(i);T.textContent="",a&&T.append(t("span","pmark pmark--x")),T.append(t("span",null,i)),T.classList.toggle("is-refusal",a),T.hidden=!1,X=1.4},trick(e){if(!(e.name==="wipeout")){C.hidden=!0,B=0,ge=!1;return}ot.textContent="WIPEOUT";const a=Math.round(ie*3.6);V(dt,a+" KM/H"+(e.deg?" · "+e.deg+"°":"")),rt.textContent=va[e.why]||(e.deg?e.deg+"° · unfinished":"skis crossed"),C.classList.add("is-wipe"),C.hidden=!1,C.classList.remove("is-pop","is-snap","is-late","is-gone-word","is-gone-line"),C.offsetWidth,C.classList.add("is-snap"),ge=!0,B=1.96},airTimer(e){if(!!(e&&e.air)){const a=Number(e.t)||0;V(pt,a.toFixed(2)),V(lt,e&&e.unit==="JIB"?"JIB":"AIR");const o=ya(a),d=(Math.min(1,a*10/Ye[Ye.length-1])*100).toFixed(1)+"%",p=10+o*2+"px";d!==ht&&(be.style.setProperty("--af",d),ht=d),p!==ct&&(be.style.setProperty("--aw",p),ct=p),y.classList.contains("is-out")&&y.classList.remove("is-out"),y.hidden=!1,z=.6,P=0,xe=!0;return}xe=!1,!y.hidden&&z<=0&&P<=0&&(P=.3,y.classList.add("is-out"))},airTimerShown(){return!y.hidden},combo(e){if(!e||!e.on){G.hidden=!0,se=-1,Ne="";return}V(ft,"×"+(e.mult!=null?e.mult:1));const i=Array.isArray(e.names)?e.names.filter(Boolean):[],a=i.slice(-2).join(" · ");V(Oe,a),Oe.classList.toggle("is-hidden",!a),gt.classList.toggle("is-hidden",!a);const o=e.quality==="sketchy"?"SKETCHY":e.quality==="clean"?"CLEAN":"";V(oe,o),oe.classList.toggle("is-hidden",!o),bt.classList.toggle("is-hidden",!o||!a),oe.classList.toggle("is-clean",e.quality==="clean"),oe.classList.toggle("is-sketchy",e.quality==="sketchy"),ia(i,e.quality,!1);const s=Number(e.graceMax)||2,d=Math.max(0,Math.min(1,1-(Number(e.grace)||0)/s));kt.style.width=(d*100).toFixed(1)+"%";const p=Number(e.count)||0;p!==se&&(se>=0&&p>se&&(ne.classList.remove("is-pop"),ne.offsetWidth,ne.classList.add("is-pop")),se=p),G.hidden=!1},comboShown(){return!G.hidden},comboEnd(e){if(!e)return;const i=!!e.bailed,a=!!e.pb&&!i;Ae.textContent="+"+$t(e.score),Ae.classList.toggle("is-hidden",i),Re.textContent="×"+(e.mult!=null?e.mult:1),Re.classList.toggle("is-hidden",!i),vt.classList.toggle("is-hidden",!a),yt.classList.toggle("is-hidden",!i),A.classList.toggle("is-bail",i);const o=i?"":["×"+(e.mult!=null?e.mult:1),e.best?String(e.best):"",qt()].filter(Boolean).join(" · ");re.textContent="",o&&e.best&&re.append(Xt(Yt(String(e.best)),"phud__cend-mark")),o&&re.append(document.createTextNode(o)),Et.classList.toggle("is-hidden",!o),re.classList.toggle("is-hidden",!o),de.textContent="",de.classList.add("is-hidden");const s=xe&&!y.hidden;A.classList.toggle("is-s3",s),s||(y.hidden=!0,z=0,P=0,xe=!1),A.classList.remove("is-snap","is-rise"),A.offsetWidth,A.classList.add(s?"is-rise":"is-snap"),A.hidden=!1,ke=i?.8:1.2},comboRank(e,i){if(!e||A.hidden)return;const a=i?qt():"";de.textContent="#"+e+(a?" on "+a:" overall"),de.classList.remove("is-hidden")},board(e){if(!e){ve();return}la(Array.isArray(e)?e:[]),W.hidden=!1},boardOpen(){return!W.hidden},closeBoard:ve,setBoardDot(e){pe.hidden=!e},tick(e,i,a){const o=e.position,s=e.mode,d=s==="skis",p=s==="bike",h=s==="glider",S=s==="rocket",c=s!=="boots",k=e.speed();if(ie=k>ie?k:Math.max(0,ie-ie*(i/.5)),E.pos.textContent=`${ze(o.x)} ${ze(o.y)} ${ze(o.z)}`,E.spd.textContent=k.toFixed(2)+" m/s",E.gear.textContent=s,E.gear.classList.toggle("is-hot",c),E.cam.textContent=a==="tp"?"chase":"first person",ae)E.state.textContent="BOOST";else if(h&&!e.grounded){const b=ca(),O=e.velocity?e.velocity.y:0;E.state.textContent=b.stall>.35?"STALL":b.flare?"flare":b.updraft>.8?"lift +"+b.updraft.toFixed(1):O>.5?"climb":O<-6?"dive":"glide · "+b.airspeed.toFixed(0)}else if(S&&!e.grounded){const b=e.velocity?e.velocity.y:0;E.state.textContent="coast · "+(b<0?"−":"+")+Math.abs(b).toFixed(0)}else if(e.grounded)if(e.wipeT>0)E.state.textContent="wipeout";else if(d){const b=ua();E.state.textContent=b.chatter>.35?"CHATTER":b.stop===2?"HOCKEY":b.stop===1?"plow":b.stivoting?"stivot":b.releasing?"PUMP":k>3?"carve":"skate"}else p?E.state.textContent=e.keys.sprint?"brake":e.keys.jumpHeld?"preload":e.keys.back?"pump":k>3?"ride":"pedal":E.state.textContent=e.keys.sprint&&k>5?"sprint":"ground";else{const b=Math.abs(e.airSpinDeg||0);E.state.textContent=b>45?"air · "+Math.round(b)+"°":"air"}w.move.classList.toggle("is-on",e.keys.forward||e.keys.back||e.keys.left||e.keys.right),w.sprint.classList.toggle("is-on",!!e.keys.sprint),w.sprint.classList.toggle("is-hidden",d),w.sprint.lastChild.nodeValue=p?"brake":"sprint",w.jump.classList.toggle("is-on",!e.grounded),w.gear.classList.toggle("is-on",c),w.boost.classList.toggle("is-hidden",!(S||nt)),w.spin.classList.toggle("is-on",!!(e.keys.spinLeft||e.keys.spinRight)),w.cam.classList.toggle("is-on",a==="tp"),X>0&&(X-=i,X<=0&&(T.hidden=!0)),B>0&&(B-=i,ge&&(B<=1.56&&C.classList.add("is-late"),B<=.36&&C.classList.add("is-gone-word"),B<=.2&&C.classList.add("is-gone-line")),B<=0&&(C.hidden=!0,ge=!1)),ke>0&&(ke-=i,ke<=0&&(A.hidden=!0)),!y.hidden&&z>0?(z-=i,z<=0&&(z=0,P=.3,y.classList.add("is-out"))):!y.hidden&&P>0&&(P-=i,P<=0&&(P=0,y.hidden=!0,y.classList.remove("is-out"))),ye+=i,Ke++;const _=performance.now();_-Kt>400&&(Jt.textContent=ye>0?String(Math.round(Ke/ye)):"—",ye=0,Ke=0,Kt=_)}}}export{Ma as createHud,Pa as hudFont,ka as hudKind,_a as hudMark,wa as hudMotion,xa as hudSurf,Ve as hudType};
