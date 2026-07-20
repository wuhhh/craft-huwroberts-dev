import { type ReactiveController, type ReactiveControllerHost } from "lit";

const MAX_DISPLACEMENT = 16; // px, cap in any direction at intensity = 1
const MIN_INTENSITY = 0.35;
const MAX_INTENSITY = 1.0;
const EASE = 0.12; // per-frame lerp factor

// Module-level shared state: a single pointermove listener and rAF loop serve
// every connected controller instance, so the mouse is "read once" regardless
// of how many decor elements are on the page.
let pointerNX = 0; // normalized pointer x in [-1, 1] from viewport center
let pointerNY = 0;
let pointerActive = false;
let pointerListenerCount = 0;
let rafId: number | null = null;
let lastFrame = 0;

// The drift is purely decorative, so honour prefers-reduced-motion by holding
// every instance at rest. Tracked live rather than read once: a mid-session
// change eases the decor home (or resumes it) instead of snapping.
const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = reduceMotionMq.matches;
reduceMotionMq.addEventListener("change", (e) => {
  reducedMotion = e.matches;
  ensureRaf();
});

const instances = new Set<PointerMotionController>();

function onPointerMove(e: PointerEvent): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  pointerNX = (e.clientX / w) * 2 - 1;
  pointerNY = (e.clientY / h) * 2 - 1;
  pointerActive = true;
  // Keep tracking coordinates under reduced motion so a live toggle-off
  // resumes from the real cursor position, but don't spin the loop up.
  if (!reducedMotion) ensureRaf();
}

function ensureListener(): void {
  if (pointerListenerCount === 0) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
  }
  pointerListenerCount++;
}

function dropListener(): void {
  pointerListenerCount = Math.max(0, pointerListenerCount - 1);
  if (pointerListenerCount === 0) {
    window.removeEventListener("pointermove", onPointerMove);
    pointerActive = false;
  }
}

function frame(t: number): void {
  // dt-clamped lerp so a stalled tab doesn't snap on resume
  const dtMs = lastFrame ? t - lastFrame : 16;
  lastFrame = t;
  const alpha = 1 - Math.pow(1 - EASE, Math.min(dtMs, 64) / 16);

  const driving = pointerActive && !reducedMotion;

  let moving = false;
  for (const inst of instances) {
    const enabled = (inst.host as { pointerMotion?: boolean }).pointerMotion !== false;
    const active = enabled && driving;
    const tx = active ? pointerNX * MAX_DISPLACEMENT * inst.intensity : 0;
    const ty = active ? pointerNY * MAX_DISPLACEMENT * inst.intensity : 0;
    inst.x += (tx - inst.x) * alpha;
    inst.y += (ty - inst.y) * alpha;
    // Avoid sub-pixel jitter when essentially settled
    if (Math.abs(tx - inst.x) < 0.01 && Math.abs(ty - inst.y) < 0.01) {
      inst.x = tx;
      inst.y = ty;
    } else {
      moving = true;
    }
    if (enabled || inst.x !== 0 || inst.y !== 0) inst.apply();
  }

  // Idle out as soon as everything has settled — anything that changes a
  // target (pointer move, reduced-motion toggle, host re-render, connect)
  // calls ensureRaf() to spin the loop back up.
  if (moving) {
    rafId = requestAnimationFrame(frame);
  } else {
    rafId = null;
    lastFrame = 0;
  }
}

function ensureRaf(): void {
  if (rafId === null) {
    lastFrame = 0;
    rafId = requestAnimationFrame(frame);
  }
}

/**
 * ReactiveController that gives a decor element a subtle parallax drift in
 * response to pointer movement. Max displacement is ~16px scaled by a
 * per-instance random `intensity` so different decor pieces move by varying
 * amounts, producing depth.
 *
 * A single shared `pointermove` listener and rAF loop feed every connected
 * instance — the mouse is only read once. The loop idles whenever every
 * instance has settled, so a parked cursor costs nothing.
 *
 * Respects `prefers-reduced-motion: reduce`, which holds every instance at
 * rest.
 */
export class PointerMotionController implements ReactiveController {
  host: ReactiveControllerHost;
  /** Per-instance amplitude multiplier in [MIN_INTENSITY, MAX_INTENSITY]. */
  readonly intensity: number;
  x = 0;
  y = 0;
  private connected = false;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    this.intensity =
      MIN_INTENSITY + Math.random() * (MAX_INTENSITY - MIN_INTENSITY);
    host.addController(this);
  }

  hostConnected(): void {
    if (this.connected) return;
    this.connected = true;
    instances.add(this);
    ensureListener();
    ensureRaf();
  }

  /**
   * The host re-rendered, so `pointerMotion` may have flipped. Kick the loop
   * so a newly disabled instance eases home (and a newly enabled one starts)
   * even if it had already settled and let the loop idle out.
   */
  hostUpdated(): void {
    if (this.connected) ensureRaf();
  }

  hostDisconnected(): void {
    if (!this.connected) return;
    this.connected = false;
    instances.delete(this);
    dropListener();
    if (instances.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      lastFrame = 0;
    }
  }

  /** Write current state to the host's inline style as CSS custom props. */
  apply(): void {
    const el = this.host as unknown as HTMLElement;
    el.style.setProperty("--pm-x", `${this.x.toFixed(2)}px`);
    el.style.setProperty("--pm-y", `${this.y.toFixed(2)}px`);
  }
}

