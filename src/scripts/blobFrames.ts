const TAU = Math.PI * 2;

/** Slower time scale for the organic edge (lower = calmer wiggle). */
const WOBBLE_TIME = 0.32;

type Cleanup = () => void;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Closed path in 0–1 space for clipPathUnits="objectBoundingBox". */
function blobPathD(
  cx: number,
  cy: number,
  baseR: number,
  t: number,
  mx: number,
  my: number,
  sides: number
): string {
  const tw = t * WOBBLE_TIME;
  let d = "";
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TAU - Math.PI / 2;
    const towardMouse = Math.cos(a) * (mx - 0.5) + Math.sin(a) * (my - 0.5);
    const mousePull = 1 + 0.32 * towardMouse * 2;
    const wobble =
      0.055 * Math.sin(tw * 1.05 + i * 0.95) +
      0.035 * Math.sin(tw * 0.55 - i * 1.2) +
      0.022 * Math.sin(tw * 0.9 + i * 0.4);
    const r = baseR * (1 + wobble) * mousePull;
    const x = clamp(cx + Math.cos(a) * r, 0.02, 0.98);
    const y = clamp(cy + Math.sin(a) * r, 0.02, 0.98);
    d += i === 0 ? `M ${x.toFixed(4)} ${y.toFixed(4)}` : ` L ${x.toFixed(4)} ${y.toFixed(4)}`;
  }
  return `${d} Z`;
}

export function initBlobFrames(): Cleanup | void {
  const path = document.querySelector<SVGPathElement>("#blob-frames-path");
  const root = document.querySelector<HTMLElement>(".blob-frames");
  if (!path || !root) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    path.setAttribute("d", blobPathD(0.5, 0.5, 0.36, 0, 0.5, 0.5, 24));
    return;
  }

  const hero = root.closest<HTMLElement>("#hero");

  let targetMx = 0.5;
  let targetMy = 0.5;
  let mx = 0.5;
  let my = 0.5;
  let vx = 0;
  let vy = 0;
  /** Softer follow for CSS parallax (lags the springy pointer a bit). */
  let px = 0;
  let py = 0;

  let scrollNudge = 0;
  let scrollSmoothed = 0;

  let t0 = performance.now();
  let prev = performance.now();
  let raf = 0;

  const stiffness = 34;
  const damping = 9.5;

  const onMove = (e: PointerEvent) => {
    targetMx = clamp(e.clientX / window.innerWidth, 0, 1);
    targetMy = clamp(e.clientY / window.innerHeight, 0, 1);
  };

  const tick = (now: number) => {
    const dt = clamp((now - prev) / 1000, 0.001, 0.05);
    prev = now;
    const t = (now - t0) / 1000;

    const ax = (targetMx - mx) * stiffness - vx * damping;
    const ay = (targetMy - my) * stiffness - vy * damping;
    vx += ax * dt;
    vy += ay * dt;
    mx += vx * dt;
    my += vy * dt;
    mx = clamp(mx, 0, 1);
    my = clamp(my, 0, 1);

    px += (mx - px) * 0.12;
    py += (my - py) * 0.12;

    if (hero) {
      const r = hero.getBoundingClientRect();
      const denom = Math.max(window.innerHeight + r.height * 0.35, 1);
      scrollNudge = clamp((r.top + r.height * 0.25) / denom - 0.35, -1, 1);
    } else {
      scrollNudge = 0;
    }
    scrollSmoothed += (scrollNudge - scrollSmoothed) * 0.07;

    path.setAttribute("d", blobPathD(0.5, 0.5, 0.36, t, mx, my, 36));

    const dx = (mx - 0.5) * 2;
    const dy = (my - 0.5) * 2;
    root.style.setProperty("--blob-mx", dx.toFixed(4));
    root.style.setProperty("--blob-my", dy.toFixed(4));

    const pdx = (px - 0.5) * 2;
    const pdy = (py - 0.5) * 2;
    root.style.setProperty("--blob-parallax-x", pdx.toFixed(4));
    root.style.setProperty("--blob-parallax-y", pdy.toFixed(4));
    root.style.setProperty("--blob-scroll", scrollSmoothed.toFixed(4));

    raf = requestAnimationFrame(tick);
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  raf = requestAnimationFrame(tick);

  return () => {
    window.removeEventListener("pointermove", onMove);
    cancelAnimationFrame(raf);
  };
}

let swapBound = false;

export function ensureAstroSwapBlobFrames() {
  if (swapBound) return;
  swapBound = true;

  let last: Cleanup | void;

  const run = () => {
    if (typeof last === "function") last();
    last = initBlobFrames();
  };

  document.addEventListener("astro:after-swap", run);
  run();
}
