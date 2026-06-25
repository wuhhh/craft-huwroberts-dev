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

// Mouse-repulsion settings
const REPULSION_RADIUS = 1.5; // distance at which repulsion starts (world units)
const REPULSION_STRENGTH = 0.2; // max displacement amount
const Z_PUSH_FACTOR = 10; // push-away-from-camera relative to XY displacement
const MOVE_GRACE_MS = 50; // ms after last move before letters spring back to rest
const VELOCITY_DECAY_PER_FRAME = 0.9; // per-frame @60fps; converted in code (smooths push strength)
const VELOCITY_REF = 0.1; // normalises velocity → 0..1 for colour/tint
const MAX_TILT = 0.8; // max rotation (radians) from proximity

// Spring configs
const OFFSET_CFG = fromTensionFriction(150, 12); // wobbly, snappy
const COLOR_CFG = fromTensionFriction(150, 26); // critically damped, smooth
const ENTRANCE_CFG = fromTensionFriction(100, 10); // bouncier

// Entrance / reveal settings
const ENTRANCE_DELAY_S = 0.3; // delay before first letter reveals
const ENTRANCE_STAGGER_S = 0.05; // delay between each letter
const ENTRANCE_OFFSET_RANGE = 0.5; // radial offset a letter starts at
const ENTRANCE_TILT_MULTIPLIER = 8.0; // extra tilt on entrance (× MAX_TILT)
const ENTRANCE_SETTLE_S = 0.5; // hold after last letter before interaction begins

// Letter colours
const BASE_COLOR = new THREE.Color("#18181b");
const INDIGO_COLOR = new THREE.Color(INDIGO);
const CORAL_COLOR = new THREE.Color(CORAL);

/**
 * Per-letter spring state: base (aligned) transform + offset/rotation/scale/
 * colour springs that chase mouse-repulsion targets each frame, and a one-shot
 * entrance reveal driven off elapsed time.
 */
interface LetterState {
  name: string;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicNodeMaterial;
  /** Aligned position from alignMeshWithDOM; refreshed on resize. */
  basePos: THREE.Vector3;
  /** Aligned uniform scale (from alignMeshWithDOM); entrance scale multiplies this. */
  baseScale: number;
  /** Elapsed time (s) at which this letter starts springing home. */
  revealAt: number;
  revealed: boolean;
  offset: SpringVec3;
  rotation: SpringVec3;
  color: SpringVec3;
  scale: SpringScalar;
}

/** Shared mouse state for both the spatial image and letter repulsion. */
interface MouseState {
  pos: THREE.Vector3;
  prev: THREE.Vector3;
  /** Smoothed instantaneous speed (world units/frame) — scales push strength. */
  velocity: number;
  active: boolean;
  /** performance.now() of the last mousemove, used to detect "still moving". */
  lastMoveTime: number;
}

/** Per-frame letter update: entrance reveal + (once settled) mouse repulsion. */
function updateLetters(
  letters: LetterState[],
  mouse: MouseState,
  entrance: { elapsed: number; complete: boolean },
  delta: number,
): void {
  if (!entrance.complete) {
    entrance.elapsed += delta;
    for (const L of letters) {
      if (!L.revealed && entrance.elapsed >= L.revealAt) {
        // Spring home: offset/rotation/scale → rest, with the entrance feel.
        L.offset.setTargetXYZ(0, 0, 0);
        L.rotation.setTargetXYZ(0, 0, 0);
        L.scale.setTarget(1);
        L.revealed = true;
      }
    }
    // Once every letter is home and has settled, hand off to interaction.
    const lastRevealAt = letters.at(-1)?.revealAt ?? 0;
    if (
      letters.every((L) => L.revealed) &&
      entrance.elapsed >= lastRevealAt + ENTRANCE_SETTLE_S
    ) {
      entrance.complete = true;
      for (const L of letters) {
        L.offset.setConfig(OFFSET_CFG);
        L.rotation.setConfig(OFFSET_CFG);
      }
    }
  }

  // Velocity only scales push strength while the mouse is moving (slow move =
  // gentle push).
  mouse.velocity *= Math.pow(VELOCITY_DECAY_PER_FRAME, delta * 60);

  // "Actively moving" = a mousemove fired within the last MOVE_GRACE_MS while
  // inside the host. The instant that window elapses, letters flip to a rest
  // target so the whole return is a single coherent spring (one time constant)
  const moving =
    entrance.complete &&
    mouse.active &&
    performance.now() - mouse.lastMoveTime < MOVE_GRACE_MS;

  for (const L of letters) {
    let repelling = false;

    if (moving) {
      const dx = L.basePos.x - mouse.pos.x;
      const dy = L.basePos.y - mouse.pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < REPULSION_RADIUS && dist > 1e-4) {
        const proximity = 1 - dist / REPULSION_RADIUS;
        const velFactor = Math.min(mouse.velocity / VELOCITY_REF, 1);
        const strength = proximity * REPULSION_STRENGTH * velFactor;

        const offX = (dx / dist) * strength;
        const offY = (dy / dist) * strength;
        const offZ = -Math.hypot(offX, offY) * Z_PUSH_FACTOR;

        const tilt = proximity * MAX_TILT;
        const rotX = (dy / dist) * tilt;
        const rotY = -(dx / dist) * tilt;

        // activeColour = lerp(INDIGO, CORAL, velFactor)
        const ar =
          INDIGO_COLOR.r + (CORAL_COLOR.r - INDIGO_COLOR.r) * velFactor;
        const ag =
          INDIGO_COLOR.g + (CORAL_COLOR.g - INDIGO_COLOR.g) * velFactor;
        const ab =
          INDIGO_COLOR.b + (CORAL_COLOR.b - INDIGO_COLOR.b) * velFactor;
        // finalColour = lerp(BASE, activeColour, min(proximity·2, 1))
        const boosted = Math.min(proximity * 2, 1);
        const tr = BASE_COLOR.r + (ar - BASE_COLOR.r) * boosted;
        const tg = BASE_COLOR.g + (ag - BASE_COLOR.g) * boosted;
        const tb = BASE_COLOR.b + (ab - BASE_COLOR.b) * boosted;

        L.offset.setTargetXYZ(offX, offY, offZ);
        L.rotation.setTargetXYZ(rotX, rotY, 0);
        L.color.setTargetXYZ(tr, tg, tb);
        repelling = true;
      }
    }

    if (!repelling && entrance.complete) {
      L.offset.setTargetXYZ(0, 0, 0);
      L.rotation.setTargetXYZ(0, 0, 0);
      L.color.setTargetXYZ(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b);
    }

    L.offset.update(delta);
    L.rotation.update(delta);
    L.color.update(delta);
    L.scale.update(delta);

    const o = L.offset.value;
    L.mesh.position.set(
      L.basePos.x + o.x,
      L.basePos.y + o.y,
      L.basePos.z + o.z,
    );
    const r = L.rotation.value;
    L.mesh.rotation.set(r.x, r.y, r.z);
    L.mesh.scale.setScalar(L.baseScale * L.scale.value);
    const c = L.color.value;
    L.material.color.setRGB(c.x, c.y, c.z);
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
  /** Shared mouse state (world-space position, velocity, active flag). */
  mouse: MouseState;
  /** Entrance-reveal phase tracker. */
  entrance: { elapsed: number; complete: boolean };
  /** Offscreen spatial-image scene, rendered into an RT each frame. */
  spatialImage?: { si: SpatialImage } | null;
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
      top: 17.5rem;
      left: 7.75rem;
      display: grid;
      grid-template-columns: repeat(18, minmax(0, 1fr));
      grid-template-rows: repeat(6, minmax(0, 1fr));
      row-gap: 3.875rem;
    }

    .letter-grid > div {
      width: 4.0625rem;
      height: 2.5625rem;
    }

    .letter-grid div:nth-child(1) {
      grid-column: 1;
      grid-row: 1;
    }

    .letter-grid div:nth-child(2) {
      grid-column: 4;
      grid-row: 2;
    }

    .letter-grid div:nth-child(3) {
      grid-column: 7;
      grid-row: 2;
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
      grid-column: 18;
      grid-row: 6;
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
        prev: new THREE.Vector3(),
        velocity: 0,
        active: false,
        lastMoveTime: 0,
      },
      entrance: { elapsed: 0, complete: false },
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
        if (mesh) letterGrp.add(mesh);
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
        return [
          {
            name,
            mesh,
            material,
            basePos: mesh.position.clone(),
            baseScale: mesh.scale.x,
            revealAt: ENTRANCE_DELAY_S + index * ENTRANCE_STAGGER_S,
            revealed: false,
            offset: new SpringVec3(ENTRANCE_CFG),
            rotation: new SpringVec3(ENTRANCE_CFG),
            color: new SpringVec3(
              COLOR_CFG,
              new THREE.Vector3(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b),
            ),
            scale: new SpringScalar(ENTRANCE_CFG, 0),
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
          alignMeshWithDOM({ mesh: L.mesh, domElement: domEl, camera, host });
          L.basePos.copy(L.mesh.position);
          L.baseScale = L.mesh.scale.x;

          // Re-snap the entrance transform if the reveal hasn't started yet, so
          // a resize during the hold keeps the radial offset aligned to the new
          // position. (After reveal, springs own the transform — leave them.)
          if (!L.revealed && !ctx.entrance.complete) {
            const snap = entranceTransformFor(L.basePos);
            L.offset.reset(snap.offset);
            L.rotation.reset(snap.rotation);
            L.scale.reset(0);
          }
        }
      };

      alignLetterMeshesWithDOM();
      window.addEventListener("resize", alignLetterMeshesWithDOM);

      // Entrance: snap each letter to a radial offset + outward tilt at scale 0
      // (immediate, no spring), then drawFn springs them home on their stagger.
      for (const L of ctx.letters) {
        const snap = entranceTransformFor(L.basePos);
        L.offset.reset(snap.offset);
        L.rotation.reset(snap.rotation);
        L.scale.reset(0);
      }

      // Shared mouse tracking — world-space position + velocity. Used by both
      // the spatial image (tilt) and the letter repulsion. Position updates for
      // the whole window so the image keeps tracking the cursor; `active` gates
      // the letter repulsion to within the host bounds.
      const { mouse } = ctx;
      const handleMouseMove = (e: MouseEvent) => {
        const r = host.getBoundingClientRect();
        if (!r.width || !r.height) return;
        mouse.active =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom;

        const vp = getViewport(camera, host, 0);
        if (!vp) return;
        mouse.prev.copy(mouse.pos);
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = -((e.clientY - r.top) / r.height - 0.5);
        mouse.pos.set(nx * vp.width, ny * vp.height, 0);

        const dx = mouse.pos.x - mouse.prev.x;
        const dy = mouse.pos.y - mouse.prev.y;
        const instant = Math.hypot(dx, dy);
        if (instant > mouse.velocity) mouse.velocity = instant;
        mouse.lastMoveTime = performance.now();
      };
      window.addEventListener("mousemove", handleMouseMove);

      // Spatial image — render a depth-displaced, mouse-tiltable plane to an
      // offscreen RT, then show it on a flat plane aligned with refImage.
      if (this.refImageId) {
        const refImage = document.getElementById(this.refImageId);
        if (refImage) {
          // load colour (sRGB) + depth (linear) textures
          const textureLoader = new THREE.TextureLoader();
          const [colorTexture, depthTexture] = await Promise.all([
            textureLoader.loadAsync("/dist/textures/huw-and-his-dog@2x.webp"),
            textureLoader.loadAsync(
              "/dist/textures/huw-and-his-dog-depth@2x.webp",
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

          ctx.spatialImage = { si };
        }
      }

      return { scene, camera };
    };

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = ({ renderer, delta }) => {
      // 1. Letter entrance reveal + (once settled) mouse-repulsion springs
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

    new SceneController({ host: this, setupFn, drawFn });
  }

  protected render(): unknown {
    return html`
      <div>
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
