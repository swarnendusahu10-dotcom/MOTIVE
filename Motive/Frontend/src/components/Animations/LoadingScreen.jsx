import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import elephantSvg from "../../assets/Elephant.svg?raw";

// ─── EXTRACTED DIRECTLY FROM Group_1.svg — 149 circles, 225 edges ─────────────
// SVG canvas: 1536×1024. All cx/cy/r values are exact from the SVG file.
const DOTS = [
  {cx:896,cy:382,r:3},{cx:888,cy:518,r:3},{cx:869,cy:510,r:3},
  {cx:851,cy:498,r:3},{cx:911,cy:563,r:3},{cx:836,cy:561,r:3},
  {cx:841,cy:594,r:3},{cx:836,cy:575,r:3},{cx:788,cy:494,r:3},
  {cx:777,cy:467,r:3},{cx:727,cy:517,r:3},{cx:749,cy:512,r:3},
  {cx:764,cy:505,r:3},{cx:597,cy:489,r:3},{cx:594,cy:507,r:3},
  {cx:653.5,cy:534.5,r:1.5},{cx:662.5,cy:536.5,r:1.5},{cx:646.5,cy:537.5,r:1.5},
  {cx:686,cy:578,r:3},{cx:670,cy:539,r:3},{cx:878,cy:434,r:3},
  {cx:574,cy:550,r:3},{cx:565,cy:534,r:3},{cx:590,cy:489,r:3},
  {cx:580,cy:537,r:3},{cx:579,cy:497,r:3},{cx:579,cy:474,r:3},
  {cx:615,cy:442,r:4},{cx:583,cy:427,r:4},{cx:593,cy:401,r:4},
  {cx:621,cy:357,r:4},{cx:666,cy:329,r:4},{cx:733,cy:321,r:4},
  {cx:754,cy:313,r:4},{cx:871,cy:331,r:4},{cx:878,cy:344,r:4},
  {cx:882,cy:355,r:4},{cx:884,cy:368,r:4},{cx:882,cy:382,r:4},
  {cx:877,cy:391,r:4},{cx:867,cy:392,r:4},{cx:846,cy:293,r:4},
  {cx:896,cy:363,r:4},{cx:800,cy:264,r:4},{cx:853,cy:247,r:4},
  {cx:866.5,cy:150.5,r:1.5},{cx:1031,cy:243,r:1},{cx:1025,cy:264,r:2},
  {cx:1025,cy:256,r:2},{cx:1019,cy:272,r:2},{cx:1017,cy:266,r:2},
  {cx:1014.5,cy:279.5,r:2.5},{cx:1007.5,cy:273.5,r:2.5},{cx:998,cy:281,r:3},
  {cx:1007,cy:287,r:3},{cx:1000,cy:294,r:3},{cx:988,cy:300,r:3},
  {cx:959,cy:307,r:3},{cx:988,cy:285,r:3},{cx:974,cy:306,r:3},
  {cx:989,cy:270,r:4},{cx:962,cy:241,r:4},{cx:974,cy:224,r:4},
  {cx:952,cy:182,r:4},{cx:1011,cy:230,r:4},{cx:1015,cy:216,r:4},
  {cx:1011,cy:193,r:4},{cx:914,cy:167,r:4},{cx:998,cy:175,r:4},
  {cx:981,cy:163,r:4},{cx:961,cy:158,r:4},{cx:935,cy:183,r:4},
  {cx:894,cy:167,r:4},{cx:873,cy:161,r:4},{cx:884,cy:182,r:4},
  {cx:868,cy:172,r:4},{cx:854,cy:152,r:5},{cx:879,cy:137,r:5},
  {cx:911,cy:188,r:5},{cx:935,cy:163,r:5},{cx:969,cy:186,r:5},
  {cx:982,cy:204,r:5},{cx:1002,cy:254,r:5},{cx:965,cy:287,r:5},
  {cx:943,cy:249,r:5},{cx:922,cy:249,r:5},{cx:895,cy:239,r:5},
  {cx:874,cy:246,r:5},{cx:905,cy:269,r:5},{cx:925,cy:307,r:5},
  {cx:862,cy:290,r:5},{cx:832,cy:256,r:5},{cx:859,cy:311,r:5},
  {cx:962,cy:336,r:5},{cx:919,cy:348,r:5},{cx:774,cy:280,r:5},
  {cx:769,cy:292,r:5},{cx:827,cy:337,r:5},{cx:829,cy:383,r:5},
  {cx:752,cy:362,r:5},{cx:882,cy:416,r:5},{cx:869,cy:428,r:5},
  {cx:907,cy:485,r:5},{cx:920,cy:518,r:5},{cx:909,cy:575,r:5},
  {cx:791,cy:519,r:5},{cx:795,cy:611,r:5},{cx:800,cy:588,r:5},
  {cx:796,cy:561,r:5},{cx:854,cy:613,r:5},{cx:817,cy:599,r:5},
  {cx:887,cy:531,r:5},{cx:879,cy:494,r:5},{cx:844,cy:473,r:5},
  {cx:837,cy:541,r:5},{cx:801,cy:497,r:5},{cx:805,cy:431,r:5},
  {cx:640,cy:342,r:5},{cx:698,cy:324,r:5},{cx:763,cy:441,r:5},
  {cx:779,cy:494,r:5},{cx:729,cy:499,r:5},{cx:752,cy:610,r:5},
  {cx:729,cy:588,r:5},{cx:689,cy:611,r:5},{cx:703,cy:549,r:5},
  {cx:676,cy:555,r:5},{cx:675,cy:524,r:5},{cx:670,cy:430,r:6},
  {cx:608,cy:380,r:5},{cx:632,cy:615,r:5},{cx:580,cy:618,r:5},
  {cx:621,cy:583,r:5},{cx:583,cy:588,r:5},{cx:640,cy:529,r:5},
  {cx:593,cy:560,r:5},{cx:560,cy:559,r:5},{cx:587,cy:508,r:4},
  {cx:612,cy:491,r:5},{cx:596,cy:466,r:5},{cx:571,cy:517,r:3},
  {cx:579,cy:453,r:5},{cx:596,cy:443,r:5},{cx:871,cy:556,r:5},
  {cx:978,cy:282,r:4},{cx:884.5,cy:157.5,r:2.5},{cx:886,cy:338,r:4},
  {cx:636,cy:540,r:3},{cx:595,cy:530,r:3},
];

// [i, j, stroke-width] — all 225 edges, exactly matched from SVG line endpoints → nearest circle
const EDGES = [
  [78,79,1],[72,78,1],[77,73,1],[76,73,1],[73,72,1],[76,75,1],[75,74,1],[76,45,1],
  [45,77,1],[74,78,1],[77,145,1],[145,72,1],[72,67,1],[79,67,1],[78,71,1],[71,63,1],
  [79,70,1],[69,70,1],[63,80,1],[68,80,1],[69,68,1],[80,81,1],[81,62,1],[68,66,1],
  [81,64,1],[66,65,1],[65,64,1],[64,82,1],[62,61,1],[61,64,1],[84,61,1],[82,60,1],
  [84,144,1],[60,144,1],[85,84,1],[86,85,1],[87,86,1],[88,87,1],[84,88,1],[84,89,1],
  [83,144,1],[89,93,1],[83,89,1],[57,58,1],[46,48,0.25],[47,48,0.3],[46,47,0.25],
  [50,48,0.35],[49,47,0.35],[50,52,0.4],[49,51,0.4],[52,53,0.5],[51,54,0.5],
  [53,58,0.7],[54,55,0.6],[55,56,0.7],[56,59,1],[59,57,1],[52,55,0.6],[89,57,1],
  [83,58,1],[93,94,1],[89,94,1],[90,89,1],[88,89,1],[91,44,1],[44,87,1],[95,43,1],
  [43,91,1],[95,91,1],[95,90,1],[91,90,1],[90,88,1],[146,94,1],[42,94,1],[90,146,1],
  [96,97,1],[97,92,1],[98,97,1],[99,97,1],[99,96,1],[96,95,1],[95,41,1],[41,92,1],
  [99,98,1],[92,34,1],[34,35,1],[35,36,1],[36,37,1],[37,38,1],[38,39,1],[40,39,1],
  [98,40,1],[97,38,1],[33,32,1],[32,118,1],[118,99,1],[118,128,1],[118,31,1],
  [31,117,1],[117,30,1],[118,129,1],[30,129,1],[129,29,1],[29,28,1],[28,141,1],
  [141,142,1],[129,27,1],[142,27,1],[129,128,1],[141,26,1],[26,25,1],[25,140,1],
  [24,137,1],[137,23,1],[140,22,1],[22,136,1],[136,21,1],[21,24,1],[23,139,1],
  [139,142,1],[27,128,1],[128,99,1],[128,119,1],[99,119,1],[99,116,1],[98,116,1],
  [119,116,1],[116,101,1],[98,101,1],[100,101,1],[139,138,1],[27,138,1],[138,128,1],
  [138,134,1],[138,127,1],[128,127,1],[140,137,1],[141,139,1],[128,121,1],[119,121,1],
  [116,115,1],[101,113,1],[116,113,1],[101,20,1],[100,20,1],[20,112,1],[113,112,1],
  [20,102,1],[127,121,1],[121,120,1],[119,120,1],[121,125,1],[127,125,1],[134,127,1],
  [126,125,1],[19,126,1],[16,19,1],[15,16,1],[15,17,1],[147,17,1],[127,19,1],
  [135,147,1],[134,132,1],[135,132,1],[135,133,1],[133,132,1],[132,131,1],[132,130,1],
  [133,131,1],[131,130,1],[135,148,1],[148,14,1],[14,13,1],[13,139,1],[148,138,1],
  [126,18,1],[18,124,1],[125,123,1],[125,18,1],[124,125,1],[124,123,1],[124,122,1],
  [123,122,1],[120,12,1],[12,11,1],[11,10,1],[10,121,1],[10,125,1],[119,9,1],
  [9,8,1],[8,105,1],[105,108,1],[108,107,1],[107,106,1],[115,105,1],[8,115,1],
  [115,114,1],[108,114,1],[114,110,1],[107,110,1],[110,109,1],[106,109,1],[113,115,1],
  [114,5,1],[5,7,1],[7,6,1],[6,109,1],[102,103,1],[103,4,1],[111,4,1],[4,104,1],
  [143,104,1],[143,111,1],[111,103,1],[112,103,1],[112,102,1],[113,114,1],[3,2,1],
  [2,1,1],[1,111,1],[3,112,1],[1,112,1],[100,0,1],[0,94,1],
];

// ─── SVG canvas dimensions ────────────────────────────────────────────────────
const SVG_W = 1536;
const SVG_H = 1024;

// Bounding box of all dots (computed from DOTS above)
const allCX = DOTS.map(d => d.cx);
const allCY = DOTS.map(d => d.cy);
const DOT_X_MIN = Math.min(...allCX); // ~560
const DOT_X_MAX = Math.max(...allCX); // ~1031
const DOT_Y_MIN = Math.min(...allCY); // ~137
const DOT_Y_MAX = Math.max(...allCY); // ~618
const DOT_W = DOT_X_MAX - DOT_X_MIN;
const DOT_H = DOT_Y_MAX - DOT_Y_MIN;

// Render size on screen — keeps the same aspect ratio as the dot bounding box
const RENDER_W = 420;
const RENDER_H = (RENDER_W / DOT_W) * DOT_H;

// Map a dot from SVG space → screen space (centred on screen)
function dotToScreen(d, screenW, screenH) {
  const ox = screenW / 2 - RENDER_W / 2;
  const oy = screenH / 2 - RENDER_H / 2;
  return {
    x: ox + ((d.cx - DOT_X_MIN) / DOT_W) * RENDER_W,
    y: oy + ((d.cy - DOT_Y_MIN) / DOT_H) * RENDER_H,
  };
}

// Scale dot radius from SVG space → screen space
const R_SCALE = RENDER_W / DOT_W;

// ─────────────────────────────────────────────────────────────────────────────
export default function LoadingScreen({ onComplete }) {
  const canvasRef    = useRef(null);
  const [showLogo, setShowLogo] = useState(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const W      = window.innerWidth;
    const H      = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    // Pre-compute screen-space targets for every dot
    const targets = DOTS.map(d => {
      const s = dotToScreen(d, W, H);
      return { x: s.x, y: s.y, r: d.r * R_SCALE };
    });

    // ── Build proximity index: for each particle, find 3-4 nearest neighbours
    //    used to draw faint "random" connections during drift phase
    const PROXIMITY_K = 4;
    const proximityLinks = targets.map((_, i) => {
      const dists = targets.map((t, j) => {
        if (i === j) return { j, d: Infinity };
        const dx = t.x - targets[i].x, dy = t.y - targets[i].y;
        return { j, d: Math.sqrt(dx*dx + dy*dy) };
      });
      dists.sort((a, b) => a.d - b.d);
      return dists.slice(0, PROXIMITY_K).map(e => e.j);
    });

    // ── 149 constellation particles + 300 ambient drifters ───────────────────
    const AMBIENT = 300;
    const particles = [
      ...targets.map((t, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        tx: t.x, ty: t.y,
        r: t.r,
        isConst: true,
        opacity: 0,
        delay:     400 + i * 30,               // staggered fade-in: 0.4–4.9s
        moveDelay: 3500 + Math.random() * 1200, // start moving: 3.5–4.7s
        speed: 0.010 + Math.random() * 0.008,
        arrived: false,
        arrivalTime: 0,
        proximityLinks: proximityLinks[i],
      })),
      ...Array.from({ length: AMBIENT }, () => {
        // Wide size variety: tiny specks (0.3) up to soft blobs (2.8)
        const rng = Math.random();
        const r = rng < 0.4
          ? 0.3 + Math.random() * 0.4          // 40% — tiny specks
          : rng < 0.75
            ? 0.8 + Math.random() * 0.7         // 35% — medium
            : 1.6 + Math.random() * 1.2;        // 25% — larger soft blobs
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          isConst: false,
          r,
          opacity: 0,
          delay: Math.random() * 1400,
          driftX: (Math.random() - 0.5) * 0.22,
          driftY: (Math.random() - 0.5) * 0.22,
        };
      }),
    ];

    const start   = performance.now();
    let animId;
    let logoShown = false;
    let doneFired = false;
    let fade      = 1.0;

    function draw(now) {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);

      // ── Logo reveal at 9s ──────────────────────────────────────────────────
      if (t > 9000 && !logoShown) { logoShown = true; setShowLogo(true); }
      // Hold the particle constellation visible for 1s after logo appears, then fade
      if (logoShown) fade = Math.max(0, fade - (t - 9000 > 1200 ? 0.0022 : 0));
      if (fade <= 0 && !doneFired) {
        doneFired = true;
        if (onCompleteRef.current) onCompleteRef.current();
      }

      // ── Count arrived particles ────────────────────────────────────────────
      const constParticles = particles.slice(0, 149);
      const arrivedCount   = constParticles.filter(p => p.arrived).length;
      // Fraction [0,1] of how many have arrived
      const arrivedFrac    = arrivedCount / 149;

      // ─── PHASE 1: Proximity lines (faint, random, during drift) ──────────
      // Visible while particles are still moving; fade out as they arrive
      const driftLineAlpha = Math.max(0, (1 - arrivedFrac * 2.5)) * fade;

      if (driftLineAlpha > 0.005 && t > 800) {
        // Draw proximity links for constellation particles
        const drawn = new Set();
        for (let i = 0; i < 149; i++) {
          const a = particles[i];
          if (a.opacity < 0.05) continue;
          for (const j of a.proximityLinks) {
            const key = i < j ? `${i}-${j}` : `${j}-${i}`;
            if (drawn.has(key)) continue;
            drawn.add(key);
            const b = particles[j];
            if (!b || b.opacity < 0.05) continue;

            // Distance-based alpha: closer = more visible
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const maxDist = 200;
            if (dist > maxDist) continue;
            const distFrac = 1 - dist / maxDist;

            const alpha = driftLineAlpha * distFrac * Math.min(a.opacity, b.opacity) * 0.35;
            if (alpha < 0.005) continue;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(100,200,255,${alpha})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      // ─── PHASE 2: SVG edges (exact lines, trigger when BOTH endpoints arrived) ─
      // Lines fade in per-edge as both particles reach their targets
      if (arrivedFrac > 0.05) {
        for (const [i, j, baseW] of EDGES) {
          const a = particles[i], b = particles[j];
          if (!a || !b) continue;

          // Each edge only activates when both endpoints have arrived
          if (!a.arrived || !b.arrived) {
            // Show very faint preview if both are very close to target
            const dxa = a.tx - a.x, dya = a.ty - a.y;
            const dxb = b.tx - b.x, dyb = b.ty - b.y;
            const distA = Math.sqrt(dxa*dxa + dya*dya);
            const distB = Math.sqrt(dxb*dxb + dyb*dyb);
            if (distA > 8 || distB > 8) continue;
          }

          // How long since both arrived? Fade in over 600ms
          const bothArrivedTime = Math.max(
            a.arrivalTime || 0,
            b.arrivalTime || 0
          );
          const edgeAge    = t - bothArrivedTime;
          const edgeFadeIn = a.arrived && b.arrived
            ? Math.min(1, edgeAge / 600)
            : 0.15; // faint preview

          const alpha = edgeFadeIn * fade * 0.9;
          if (alpha < 0.01) continue;

          // Scale the stroke-width from SVG space to screen space, respect baseW
          // SVG stroke-widths range 0.25–1.0; scale to screen range 0.15–2.5
          const scaledW = baseW * R_SCALE * 1.8;
          const coreW   = Math.max(0.3, scaledW);

          ctx.lineCap = "round";

          // Outer bloom pass
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(56,189,248,${alpha * 0.18})`;
          ctx.lineWidth = coreW * 6;
          ctx.stroke();

          // Mid glow pass
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(120,230,255,${alpha * 0.40})`;
          ctx.lineWidth = coreW * 2.5;
          ctx.stroke();

          // Core line
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(220,248,255,${alpha * 0.88})`;
          ctx.lineWidth = coreW;
          ctx.stroke();
        }
      }

      // ─── Update + draw particles ──────────────────────────────────────────
      for (const p of particles) {
        // Fade in
        if (t > p.delay) p.opacity = Math.min(1, p.opacity + 0.022);

        if (p.isConst) {
          if (!p.arrived && t > p.moveDelay) {
            const dx = p.tx - p.x, dy = p.ty - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0.8) {
              // Ease-in speed: slower at first, faster near end
              const easeSpeed = p.speed * (0.5 + 0.5 * Math.min(1, (t - p.moveDelay) / 1500));
              p.x += dx * easeSpeed;
              p.y += dy * easeSpeed;
            } else {
              p.x = p.tx; p.y = p.ty;
              p.arrived = true;
              p.arrivalTime = t;
            }
          }
        } else {
          p.x += p.driftX; p.y += p.driftY;
          if (p.x < 0 || p.x > W) p.driftX *= -1;
          if (p.y < 0 || p.y > H) p.driftY *= -1;
        }

        const ro = p.opacity * fade;
        if (ro < 0.01) continue;

        // Glow radius scales with arrival
        const glowMult = p.isConst
          ? (p.arrived ? 3.5 : 2.2)
          : 2.4;
        const glowR = p.r * glowMult;

        // Radial gradient glow
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        if (p.isConst && p.arrived) {
          g.addColorStop(0,    `rgba(230,252,255,${ro})`);
          g.addColorStop(0.3,  `rgba(56,189,248,${ro * 0.7})`);
          g.addColorStop(1,    `rgba(56,189,248,0)`);
        } else if (p.isConst) {
          g.addColorStop(0,    `rgba(180,235,255,${ro * 0.8})`);
          g.addColorStop(0.4,  `rgba(56,189,248,${ro * 0.4})`);
          g.addColorStop(1,    `rgba(56,189,248,0)`);
        } else {
          g.addColorStop(0, `rgba(100,200,255,${ro * 0.35})`);
          g.addColorStop(1, `rgba(56,189,248,0)`);
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();

        // Solid core dot — respect the SVG radius per particle
        const coreR = p.r;
        ctx.beginPath(); ctx.arc(p.x, p.y, coreR, 0, Math.PI * 2);
        ctx.fillStyle = p.isConst
          ? (p.arrived ? `rgba(240,252,255,${ro})` : `rgba(180,230,255,${ro * 0.85})`)
          : `rgba(100,190,255,${ro * 0.4})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  // The SVG logo must render at EXACTLY RENDER_W × RENDER_H
  // centred at screen 50% / 50% — same anchor as dotToScreen()
  const svgSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(elephantSvg)}`;

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "#000",
      position: "relative", overflow: "hidden",
    }}>
      {/* Canvas: particles + drift lines + SVG constellation lines */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Logo: fades in perfectly aligned over the particle constellation */}
      <AnimatePresence>
        {showLogo && (
          <motion.div
            key="logo"
            style={{
              position: "absolute",
              left: "50%", top: "50%",
              transform: `translate(-50%, calc(-50% + ${RENDER_H / 2 + 40}px))`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              pointerEvents: "none",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
          >
            

            {/* KSP wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, delay: 0.6 }}
              style={{ marginTop: 10 }}
            >
              <span style={{
                fontFamily: "'Orbitron','Share Tech Mono',monospace",
                fontSize: "2.8rem", fontWeight: 700, letterSpacing: "0.3em",
                color: "#38BDF8",
                textShadow: "0 0 20px rgba(56,189,248,1), 0 0 40px rgba(56,189,248,0.5)",
              }}>KSP</span>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 0.9, delay: 1.0 }}
              style={{
                fontFamily: "'Share Tech Mono','Courier New',monospace",
                fontSize: "0.62rem", letterSpacing: "0.28em",
                color: "#7DD3FC", marginTop: 4, textTransform: "uppercase",
              }}
            >INTELLIGENCE PLATFORM · INITIALIZING</motion.p>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              style={{
                width: 250, height: 2,
                background: "rgba(56,189,248,0.12)",
                marginTop: 18, borderRadius: 2, overflow: "hidden",
              }}
            >
              <motion.div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg,transparent,#38BDF8,#BAE6FD)",
                  boxShadow: "0 0 8px rgba(56,189,248,0.8)",
                }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.8, delay: 1.1, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}