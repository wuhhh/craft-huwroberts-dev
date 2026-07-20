import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { SceneController } from "../controllers/scene-controller";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import type { SceneDrawFn, SceneSetupAsyncFn } from "../types";
import { alignMeshWithDOM } from "../lib/align-mesh-with-dom";
import getViewport from "../lib/get-viewport";
import { createSpatialImage, type SpatialImage } from "../lib/spatial-image";
import { SpringScalar, SpringVec3, fromTensionFriction } from "../lib/spring";
import { CORAL, INDIGO } from "../lib/colors";
import { disposeObject3D } from "../lib/dispose";

// Mouse-repulsion (impulse field). The cursor's per-frame movement injects an
// impulse into each nearby letter's spring — a still cursor imparts nothing, so
// letters simply settle home. One continuous time domain, no moving/rest toggle.
const REPULSION_RADIUS = 1.5; // world units — cursor influence radius
const IMPULSE_GAIN = 4; // velocity kick per (proximity × cursor-speed)
const MAX_IMPULSE = 2; // clamp per-frame kick (guards pointer jumps)
const MAX_CURSOR_SPEED = 0.6; // clamp cursor speed (world units/frame)
const Z_PUSH_FACTOR = 8; // z kick relative to the xy kick (pushes away from camera)
const TILT_GAIN = 8; // rotation kick relative to the xy kick (restores the visible tilt)
const HEAT_GAIN = 7; // colour-excitation kick per impulse (higher = stronger tint)
const MAX_TILT = 0.8; // max entrance rotation (radians)
const FRAME_GAP_RESET_MS = 200; // reseed cursor tracking after a render gap (pause/tab-hidden)

// Spring configs
const REPULSION_CFG = fromTensionFriction(150, 12); // wobbly, snappy — offset/rotation
const HEAT_CFG = fromTensionFriction(70, 12); // soft, near-critical — a visible tint flash + fade
const ENTRANCE_CFG = fromTensionFriction(100, 10); // bouncier — one-shot reveal

// Entrance / reveal settings
const ENTRANCE_DELAY_S = 0.3; // delay before first letter reveals
const ENTRANCE_STAGGER_S = 0.05; // delay between each letter
const ENTRANCE_OFFSET_RANGE = 0.5; // radial offset a letter starts at
const ENTRANCE_TILT_MULTIPLIER = 8.0; // extra tilt on entrance (× MAX_TILT)

// Letter colours
const BASE_COLOR = new THREE.Color("#18181b");
const INDIGO_COLOR = new THREE.Color(INDIGO);
const CORAL_COLOR = new THREE.Color(CORAL);

/**
 * Per-letter state as two fully independent spring layers, composed ADDITIVELY
 * on the mesh (no scene-graph nesting, so neither cascades onto the other):
 *  - entrance: a one-shot staggered reveal, permanently on ENTRANCE_CFG — no
 *    config swap, no phase flag.
 *  - repulsion: offset/rotation/heat springs anchored at rest, excited by
 *    cursor-movement impulses each frame (single time domain).
 */
interface LetterState {
  name: string;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicNodeMaterial;
  /** Aligned home position (mesh anchor); refreshed on resize. */
  home: THREE.Vector3;
  /** Aligned uniform scale; from alignMeshWithDOM. */
  baseScale: number;
  /** Entrance-clock time (s) at which this letter starts springing home. */
  revealAt: number;
  // Entrance layer
  entranceOffset: SpringVec3;
  entranceTilt: SpringVec3;
  entranceScale: SpringScalar;
  // Repulsion layer (mesh) — rest at 0, excited by impulses
  offset: SpringVec3;
  rotation: SpringVec3;
  /** Colour excitation 0..1 — kicked by impulses, decays to 0 (impulse tint). */
  heat: SpringScalar;
}

/** Shared cursor state for the spatial image and the letter impulse field. */
interface MouseState {
  /** World-space cursor position (tracked window-wide). */
  pos: THREE.Vector3;
  /** Cursor position at the previous frame — yields the per-frame movement. */
  framePrev: THREE.Vector3;
  /** True once we've had a real cursor reading (so the first frame's movement
   * isn't measured against the (0,0) origin — that would fire a full kick). */
  seeded: boolean;
  /** performance.now() of the previous drawn frame — detects render gaps
   * (loop paused / tab hidden) so a stale delta doesn't kick on resume. */
  lastFrameTime: number;
}

/**
 * Per-frame letter update. Two independent layers composed additively on each
 * mesh (neither cascades onto the other):
 *  - Entrance: staggered one-shot reveal springing to home.
 *  - Repulsion: a continuous impulse field — the cursor's per-frame movement
 *    kicks nearby letters away; springs anchored at rest carry them home. No
 *    velocity gate, grace window, or moving/rest toggle.
 */
function updateLetters(
  letters: LetterState[],
  mouse: MouseState,
  entrance: { elapsed: number },
  delta: number,
): void {
  entrance.elapsed += delta;

  // After a render gap (loop paused off-screen, tab hidden), the cursor may have
  // moved while we weren't drawing — reseed so we don't kick on that stale delta.
  // (delta itself folds the pause out, so it can't reveal the gap; wall-clock can.)
  const now = performance.now();
  if (mouse.lastFrameTime && now - mouse.lastFrameTime > FRAME_GAP_RESET_MS) {
    mouse.framePrev.copy(mouse.pos);
  }
  mouse.lastFrameTime = now;

  // Cursor movement this frame drives the impulse field. A still cursor gives
  // zero movement → zero kick → letters just settle (single time domain).
  const mdx = mouse.pos.x - mouse.framePrev.x;
  const mdy = mouse.pos.y - mouse.framePrev.y;
  const speed = Math.min(Math.hypot(mdx, mdy), MAX_CURSOR_SPEED);
  mouse.framePrev.copy(mouse.pos);

  for (const L of letters) {
    // --- Entrance layer: trigger the reveal at this letter's stagger, then let
    // it spring home. setTarget is idempotent, so no `revealed` flag. ---
    if (entrance.elapsed >= L.revealAt) {
      L.entranceOffset.setTargetXYZ(0, 0, 0);
      L.entranceTilt.setTargetXYZ(0, 0, 0);
      L.entranceScale.setTarget(1);
    }
    const eo = L.entranceOffset.update(delta);
    const et = L.entranceTilt.update(delta);
    const es = L.entranceScale.update(delta); // may overshoot 1 (bouncy reveal)
    // Reveal progress (clamped) ramps the repulsion impulse in below.
    const reveal = Math.min(Math.max(es, 0), 1);

    // --- Repulsion layer (mesh): impulse from cursor movement, ramped by the
    // letter's reveal progress so an un-revealed letter isn't kicked. ---
    if (speed > 0) {
      const dx = L.home.x - mouse.pos.x;
      const dy = L.home.y - mouse.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < REPULSION_RADIUS && dist > 1e-4) {
        // C¹ smoothstep falloff → no velocity kink entering/leaving the radius.
        const t = 1 - dist / REPULSION_RADIUS;
        const w = t * t * (3 - 2 * t);
        const impulse = Math.min(
          w * speed * IMPULSE_GAIN * reveal,
          MAX_IMPULSE,
        );
        const nx = dx / dist;
        const ny = dy / dist;
        L.offset.kickXYZ(nx * impulse, ny * impulse, -impulse * Z_PUSH_FACTOR);
        L.rotation.kickXYZ(
          ny * impulse * TILT_GAIN,
          -nx * impulse * TILT_GAIN,
          0,
        );
        L.heat.kick(impulse * HEAT_GAIN);
      }
    }

    const o = L.offset.update(delta);
    const r = L.rotation.update(delta);
    const heat = Math.min(Math.max(L.heat.update(delta), 0), 1);

    // Compose the two independent layers ADDITIVELY on the mesh — no scene-graph
    // nesting, so the entrance transform never cascades onto the repulsion (or
    // vice versa). MAX_TILT drives only `et`, TILT_GAIN only `r`.
    L.mesh.position.set(
      L.home.x + eo.x + o.x,
      L.home.y + eo.y + o.y,
      L.home.z + eo.z + o.z,
    );
    L.mesh.rotation.set(et.x + r.x, et.y + r.y, et.z + r.z);
    L.mesh.scale.setScalar(L.baseScale * es);

    // Impulse-based tint: excitation `heat` fades to 0. Low heat leans indigo,
    // high heat coral; the whole thing lerps up from BASE by heat.
    const ar = INDIGO_COLOR.r + (CORAL_COLOR.r - INDIGO_COLOR.r) * heat;
    const ag = INDIGO_COLOR.g + (CORAL_COLOR.g - INDIGO_COLOR.g) * heat;
    const ab = INDIGO_COLOR.b + (CORAL_COLOR.b - INDIGO_COLOR.b) * heat;
    L.material.color.setRGB(
      BASE_COLOR.r + (ar - BASE_COLOR.r) * heat,
      BASE_COLOR.g + (ag - BASE_COLOR.g) * heat,
      BASE_COLOR.b + (ab - BASE_COLOR.b) * heat,
    );
  }
}

/**
 * Objects that will be available between the setup and draw functions
 */
interface AboutSceneContext {
  letterMeshRefs: {
    [key: string]: THREE.Mesh | null | undefined;
    capH_0?: THREE.Mesh | null;
    capU_1?: THREE.Mesh | null;
    capW_2?: THREE.Mesh | null;
    capR_3?: THREE.Mesh | null;
    capO_4?: THREE.Mesh | null;
    capB_5?: THREE.Mesh | null;
    capE_6?: THREE.Mesh | null;
    capR_7?: THREE.Mesh | null;
    capT_8?: THREE.Mesh | null;
    capS_9?: THREE.Mesh | null;
  };
  /** Per-letter springs + base positions. */
  letters: LetterState[];
  /** Shared cursor state (world-space position + previous-frame position). */
  mouse: MouseState;
  /** Entrance clock — accumulates delta to trigger each letter's staggered reveal. */
  entrance: { elapsed: number };
  /** Offscreen spatial-image scene, rendered into an RT each frame. */
  spatialImage?: { si: SpatialImage } | null;
  /** Scene-graph reference held for traversal-based disposal. */
  scene?: THREE.Scene;
  /** Cleanup callbacks (listeners + GPU resource disposers). */
  disposers: Array<() => void>;
}

const letterMeshNames = [
  "capH_0",
  "capU_1",
  "capW_2",
  "capR_3",
  "capO_4",
  "capB_5",
  "capE_6",
  "capR_7",
  "capT_8",
  "capS_9",
];

@customElement("about-scene")
export class aboutScene extends LitElement {
  @property()
  refImageId = "";

  static styles?: CSSResultGroup | undefined = css`
    :host {
      display: block;
      position: absolute;
      inset: 0;
    }

    .letter-grid {
      position: absolute;
      top: 11.75rem;
      left: 1.75rem;
      display: grid;
      grid-template-columns: repeat(9, minmax(0, 1fr));
      grid-template-rows: repeat(6, minmax(0, 1fr));
      row-gap: 2.75rem;
    }

    .letter-grid > div {
      width: 1.875rem;
      aspect-ratio: 15/13;
    }

    @media (min-width: 640px) {
      .letter-grid {
        top: 12rem;
        left: 1.5rem;
      }
    }

    @media (min-width: 820px) {
      .letter-grid {
        top: 16.5rem;
        grid-template-columns: repeat(18, minmax(0, 1fr));
      }

      .letter-grid > div {
        width: 2.5rem;
      }
    }

    @media (min-width: 1024px) {
      .letter-grid {
        left: 4.5rem;
      }

      .letter-grid > div {
        width: 3rem;
        aspect-ratio: 4/2.5;
      }
    }

    @media (min-width: 1280px) {
      .letter-grid {
        left: 7.75rem;
        row-gap: 3.375rem;
      }

      .letter-grid > div {
        width: 3.5rem;
      }
    }

    @media (min-width: 1536px) {
      .letter-grid {
        row-gap: 4.5rem;
      }
      .letter-grid > div {
        width: 4rem;
      }
    }

    @media (min-width: 1728px) {
      .letter-grid {
        top: 16rem;
        row-gap: 5rem;
      }
      .letter-grid > div {
        width: 4.25rem;
      }
    }

    .letter-grid div:nth-child(1) {
      grid-column: 1;
      grid-row: 1;
    }

    .letter-grid div:nth-child(2) {
      grid-column: 2;
      grid-row: 2;
    }

    .letter-grid div:nth-child(3) {
      grid-column: 5;
      grid-row: 2;
    }

    @media (min-width: 1280px) {
      .letter-grid div:nth-child(2) {
        grid-column: 4;
        grid-row: 2;
      }

      .letter-grid div:nth-child(3) {
        grid-column: 7;
        grid-row: 2;
      }
    }

    .letter-grid div:nth-child(4) {
      grid-column: 2;
      grid-row: 3;
    }

    .letter-grid div:nth-child(5) {
      grid-column: 5;
      grid-row: 3;
    }

    .letter-grid div:nth-child(6) {
      grid-column: 4;
      grid-row: 4;
    }

    .letter-grid div:nth-child(7) {
      grid-column: 7;
      grid-row: 4;
    }

    .letter-grid div:nth-child(8) {
      grid-column: 8;
      grid-row: 5;
    }

    .letter-grid div:nth-child(9) {
      grid-column: 11;
      grid-row: 5;
    }

    .letter-grid div:nth-child(10) {
      grid-column: 16;
      grid-row: 6;
    }

    @media (min-width: 1280px) {
      .letter-grid div:nth-child(10) {
        grid-column: 18;
        grid-row: 6;
      }
    }
  `;

  constructor() {
    super();

    /**
     * Setup
     */
    const ctx: AboutSceneContext = {
      letterMeshRefs: {},
      letters: [],
      mouse: {
        pos: new THREE.Vector3(),
        framePrev: new THREE.Vector3(),
        seeded: false,
        lastFrameTime: 0,
      },
      entrance: { elapsed: 0 },
      disposers: [],
    };

    const setupFn: SceneSetupAsyncFn = async ({ host }) => {
      const aspect = host.clientWidth / host.clientHeight;
      const camera = new THREE.PerspectiveCamera(25, aspect, 1, 20);
      camera.position.z = 10;

      const scene = new THREE.Scene();

      // load the model
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("/dist/draco/");
      loader.setDRACOLoader(dracoLoader);
      const gltf = await loader.loadAsync("/dist/models/hrdev.glb");
      const c = gltf.scene.children;

      const letterGrp = new THREE.Group();

      letterMeshNames.forEach((name) => {
        const mesh = c.find((child) => child.name === name) as
          | THREE.Mesh
          | undefined;
        ctx.letterMeshRefs[name] = mesh ?? null;
      });

      // stop z fighting with image plane
      letterGrp.position.z = 0.01;
      scene.add(letterGrp);

      // Build per-letter spring state + flat basic materials (depthTest off so
      // letters always draw over the spatial image plane
      ctx.letters = letterMeshNames.flatMap((name, index) => {
        const mesh = ctx.letterMeshRefs[name];
        if (!mesh) return [];
        const material = new THREE.MeshBasicNodeMaterial();
        material.depthTest = false;
        material.color.set(BASE_COLOR);
        mesh.material = material;
        mesh.renderOrder = 1;
        letterGrp.add(mesh);

        return [
          {
            name,
            mesh,
            material,
            home: new THREE.Vector3(),
            baseScale: mesh.scale.x,
            revealAt: ENTRANCE_DELAY_S + index * ENTRANCE_STAGGER_S,
            entranceOffset: new SpringVec3(ENTRANCE_CFG),
            entranceTilt: new SpringVec3(ENTRANCE_CFG),
            entranceScale: new SpringScalar(ENTRANCE_CFG, 0),
            offset: new SpringVec3(REPULSION_CFG),
            rotation: new SpringVec3(REPULSION_CFG),
            heat: new SpringScalar(HEAT_CFG, 0),
          },
        ];
      });

      /**
       * Align each letter mesh with its DOM cell, then cache the aligned
       * position/scale as the repulsion base (springs add an offset on top).
       */
      const alignLetterMeshesWithDOM = () => {
        for (const L of ctx.letters) {
          const domEl: HTMLDivElement | null =
            host.shadowRoot?.querySelector(`[data-letter=${L.name}]`) ?? null;
          if (!domEl) continue;
          const res = alignMeshWithDOM({
            mesh: L.mesh,
            domElement: domEl,
            camera,
            host,
          });
          if (!res) continue;
          // Cache the aligned home + scale; updateLetters composes the mesh
          // transform (home + entrance + repulsion) additively each frame.
          L.home.copy(res.position);
          L.baseScale = res.scale ? res.scale.y : L.mesh.scale.x;

          // While a letter hasn't revealed yet, keep its entrance start (radial
          // offset + outward tilt, scale 0) snapped to the new home on resize.
          if (ctx.entrance.elapsed < L.revealAt) {
            const snap = entranceTransformFor(L.home);
            L.entranceOffset.reset(snap.offset);
            L.entranceTilt.reset(snap.rotation);
            L.entranceScale.reset(0);
          }
        }
      };

      alignLetterMeshesWithDOM();
      window.addEventListener("resize", alignLetterMeshesWithDOM);
      ctx.disposers.push(() => window.removeEventListener("resize", alignLetterMeshesWithDOM));

      // Shared cursor tracking — world-space position, updated window-wide so the
      // spatial image keeps tracking the cursor. The letter impulse field reads
      // per-frame movement in updateLetters; proximity falloff handles bounds.
      const { mouse } = ctx;
      const handleMouseMove = (e: MouseEvent) => {
        const r = host.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const vp = getViewport(camera, host, 0);
        if (!vp) return;
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = -((e.clientY - r.top) / r.height - 0.5);
        mouse.pos.set(nx * vp.width, ny * vp.height, 0);
        // First real reading: seed framePrev so the opening frame measures no
        // movement (rather than a jump from the (0,0) origin).
        if (!mouse.seeded) {
          mouse.framePrev.copy(mouse.pos);
          mouse.seeded = true;
        }
      };
      window.addEventListener("mousemove", handleMouseMove);
      ctx.disposers.push(() => window.removeEventListener("mousemove", handleMouseMove));

      // Spatial image — render a depth-displaced, mouse-tiltable plane to an
      // offscreen RT, then show it on a flat plane aligned with refImage.
      if (this.refImageId) {
        const refImage = document.getElementById(this.refImageId);
        if (refImage) {
          // load colour (sRGB) + depth (linear) textures
          const textureLoader = new THREE.TextureLoader();
          const [colorTexture, depthTexture] = await Promise.all([
            textureLoader.loadAsync("/dist/textures/huw-and-his-dog@2x.jpg"),
            textureLoader.loadAsync(
              "/dist/textures/huw-and-his-dog-depth@2x.jpg",
            ),
          ]);
          colorTexture.colorSpace = THREE.SRGBColorSpace;

          // aspect from the refImage's laid-out rect (RT/camera match it)
          const rect = refImage.getBoundingClientRect();

          const rtAspect =
            rect.width && rect.height ? rect.width / rect.height : 1;

          const si = createSpatialImage({
            colorTexture,
            depthTexture,
            aspect: rtAspect,
          });

          // flat display plane samples the RT; align it to the refImage
          const imagePlane = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            si.displayMaterial,
          );
          scene.add(imagePlane);

          const alignImagePlane = () => {
            alignMeshWithDOM({
              mesh: imagePlane,
              domElement: refImage,
              camera,
              host,
              scaleToMatch: "size",
            });
          };
          alignImagePlane();
          window.addEventListener("resize", alignImagePlane);
          ctx.disposers.push(() => window.removeEventListener("resize", alignImagePlane));

          // Spatial-image RT + textures are not in the scene graph; track them
          // for disposal alongside the window listeners above.
          ctx.disposers.push(() => {
            si.rt.dispose();
            colorTexture.dispose();
            depthTexture.dispose();
          });

          ctx.spatialImage = { si };
        }
      }

      ctx.scene = scene;
      return { scene, camera };
    };

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = ({ renderer, delta }) => {
      // 1. Letters: staggered entrance + impulse-field repulsion (additive)
      updateLetters(ctx.letters, ctx.mouse, ctx.entrance, delta);

      // 2. Offscreen spatial image: tilt + depth intro, render into the RT
      const sp = ctx.spatialImage;
      if (sp) {
        sp.si.update(delta, ctx.mouse.pos);
        renderer.setRenderTarget(sp.si.rt);
        renderer.render(sp.si.offScene, sp.si.offCamera);
        renderer.setRenderTarget(null);
      }
    };

    const dispose = () => {
      for (const d of ctx.disposers) d();
      ctx.disposers.length = 0;
      if (ctx.scene) disposeObject3D(ctx.scene);
    };

    new SceneController({ host: this, setupFn, drawFn }, dispose);
  }

  protected render(): unknown {
    return html`
      <about-scene-decor></about-scene-decor>
      <div class="letter-grid" aria-hidden="true">
        <div data-letter="capH_0"></div>
        <div data-letter="capU_1"></div>
        <div data-letter="capW_2"></div>
        <div data-letter="capR_3"></div>
        <div data-letter="capO_4"></div>
        <div data-letter="capB_5"></div>
        <div data-letter="capE_6"></div>
        <div data-letter="capR_7"></div>
        <div data-letter="capT_8"></div>
        <div data-letter="capS_9"></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "about-scene": aboutScene;
  }
}

/**
 * Entrance start transform for a letter at `basePos`: pushed radially outward
 * from the scene centre and tilted to match (letters lean away from centre),
 * matching CapLetterScene.tsx's `initialTransforms`.
 */
function entranceTransformFor(basePos: THREE.Vector3): {
  offset: THREE.Vector3;
  rotation: THREE.Vector3;
} {
  const x = basePos.x;
  const y = basePos.y;
  const dist = Math.hypot(x, y);
  if (dist < 1e-3) {
    return {
      offset: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Vector3(0, 0, 0),
    };
  }
  const dirX = x / dist;
  const dirY = y / dist;
  const tilt = MAX_TILT * ENTRANCE_TILT_MULTIPLIER;
  return {
    offset: new THREE.Vector3(
      dirX * ENTRANCE_OFFSET_RANGE,
      dirY * ENTRANCE_OFFSET_RANGE,
      0,
    ),
    rotation: new THREE.Vector3(dirY * tilt, -dirX * tilt, 0),
  };
}
