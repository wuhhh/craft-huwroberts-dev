import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { SceneController } from "../controllers/scene-controller";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import type { SceneDrawFn, SceneSetupAsyncFn, SceneViewport } from "../types";
import getViewport from "../lib/get-viewport";
import { disposeObject3D } from "../lib/dispose";
import {
  createCloudedGlassMat,
  createDiamondPlaneMat,
  createLineMat,
  createLiquidMaterialMat,
} from "../lib/materials";
import { SpringVec3, fromTensionFriction } from "../lib/spring";

const ROCK_CFG = fromTensionFriction(20, 1.5);
const ROCK_INITIAL_ANGLE = .75; // rad, per axis — a big diagonal entrance swing to rest

const FLICK_CFG = fromTensionFriction(70, 4);
const FLICK_GAIN = 1.2; // impulse per world-unit of mouse movement (higher = more responsive)
const FLICK_MAX = .8; // clamp per-event impulse, per axis — caps the swing extremities

const PARALLAX: Record<string, number> = {
  box: 0.15,
  diamond3d: 0.25,
  diamondPlane: 0.3,
  letterH: 0.15,
  hrHuw: -0.3,
  hrRobertsMain: -0.3,
};
const PARALLAX_REDUCED_SCALE = 0.25; // faint parallax under prefers-reduced-motion

/**
 * Objects that will be available between the setup and draw functions
 */
interface IntroSceneContext {
  groups: {
    hr?: THREE.Group | null;
    /** Inner group holding the shape meshes; carries the reveal rock. */
    shapes?: THREE.Group | null;
    /** Outer wrapper around `shapes`; carries the mouse-flick tilt. */
    shapesFlick?: THREE.Group | null;
  };
  meshRefs: {
    box?: THREE.Mesh | null;
    diamond3d?: THREE.Mesh | null;
    diamondPlane?: THREE.Mesh | null;
    hrHuw?: THREE.Mesh | null;
    hrRobertsMain?: THREE.Mesh | null;
    hrRobertsSoft?: THREE.Mesh | null;
    letterH?: THREE.Mesh | null;
  };
  /** Entrance rock (rad) applied to the inner `shapes` group — x pitch, y yaw. */
  revealTilt?: SpringVec3;
  /** Mouse-flick tilt (rad) applied to the outer `shapesFlick` group. */
  flickTilt?: SpringVec3;
  /** Shared cursor state (world-space pos + over-host flag) for flick impulses. */
  mouse: { pos: THREE.Vector3; prev: THREE.Vector3; active: boolean };
  /** prefers-reduced-motion: calms the entrance/flick, fades the parallax. */
  reducedMotion: boolean;
  /** Cleanup callbacks (event listeners). */
  disposers: Array<() => void>;
}

/**
 * Store mesh position/rotation/scale vectors with landscape & portrait variants
 */
interface MeshTransform {
  portrait?: {
    position?: THREE.Vector3;
    rotation?: THREE.Vector3;
    scale?: THREE.Vector3;
  };
  landscape: {
    position: THREE.Vector3;
    rotation: THREE.Vector3;
    scale: THREE.Vector3;
  };
}

/**
 * Intro scene
 */
@customElement("intro-scene")
export class IntroScene extends LitElement {
  // Holds shared state for use between setup and draw fns
  #ctx: IntroSceneContext = {
    groups: {},
    meshRefs: {},
    mouse: {
      pos: new THREE.Vector3(),
      prev: new THREE.Vector3(),
      active: false,
    },
    reducedMotion: false,
    disposers: [],
  };

  // Device orientation, updated on resize
  #orientation: "portrait" | "landscape" = "landscape";

  // Resize observer to update #orientation
  #ro = new ResizeObserver(() => {
    const w = this.clientWidth;
    const h = this.clientHeight;
    const next = w / h < 1 ? "portrait" : "landscape";

    if (next === this.#orientation) return;

    this.#orientation = next;
    this.#setMeshVisibility();
  });

  #setMeshVisibility() {
    if (this.#ctx.meshRefs.box) {
      this.#ctx.meshRefs.box.visible = this.#orientation === "landscape";
    }

    if (this.#ctx.meshRefs.diamondPlane) {
      this.#ctx.meshRefs.diamondPlane.visible =
        this.#orientation === "landscape";
    }
  }

  // styles
  static styles?: CSSResultGroup | undefined = css`
    :host {
      display: block;
      position: relative;
    }

    div {
      display: grid;
      place-items: center;
      width: 100%;
      /* JS-cached viewport height keeps the host rect (drives the camera
         frustum + mesh scaling) stable during iOS chrome collapse. */
      height: var(--stable-vh, 100vh);
      text-align: center;
    }
  `;

  constructor() {
    super();

    /**
     * Setup
     */
    const setupFn: SceneSetupAsyncFn = async ({ host }) => {
      this.#orientation =
        host.clientWidth / host.clientHeight < 1 ? "portrait" : "landscape";

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

      const modelMap = new Map(
        gltf.scene.children.map((child) => [child.name, child]),
      );

      // set meshes
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 4, 4, 1));
      const boxEdges = new THREE.EdgesGeometry(box.geometry);
      const boxLines = new THREE.LineSegments(boxEdges);
      const diamond3d = (modelMap.get("diamond3d") as THREE.Mesh) ?? null;
      const diamond3dEdges = diamond3d
        ? new THREE.EdgesGeometry(diamond3d.geometry)
        : null;
      const diamondPlane = (modelMap.get("diamondPlane") as THREE.Mesh) ?? null;
      const hrHuw = (modelMap.get("hrHuw") as THREE.Mesh) ?? null;
      const hrRobertsMain =
        (modelMap.get("hrRobertsMain") as THREE.Mesh) ?? null;
      const hrRobertsSoft =
        (modelMap.get("hrRobertsSoft") as THREE.Mesh) ?? null;
      const letterH = (modelMap.get("letterH") as THREE.Mesh) ?? null;
      const letterHEdges = letterH
        ? new THREE.EdgesGeometry(letterH.geometry)
        : null;

      this.#ctx.meshRefs = {
        box,
        diamond3d,
        diamondPlane,
        hrHuw,
        hrRobertsMain,
        hrRobertsSoft,
        letterH,
      };

      // set textures
      const texHrRobertsMain = hrRobertsMain
        ? (hrRobertsMain.material as THREE.MeshStandardMaterial).map
        : null;
      const texHrRobertsSoft = hrRobertsSoft
        ? (hrRobertsSoft.material as THREE.MeshStandardMaterial).map
        : null;

      // materials
      const lineMat = createLineMat();
      const cloudedGlassMat = createCloudedGlassMat();
      const diamondPlaneMat = createDiamondPlaneMat();
      let liquidMaterial;

      if (texHrRobertsMain && texHrRobertsSoft) {
        liquidMaterial = createLiquidMaterialMat(
          texHrRobertsMain,
          texHrRobertsSoft,
          new THREE.Vector2(0, 0),
        );
      }

      // add meshes to groups / scene, set materials
      this.#ctx.groups.hr = new THREE.Group();
      this.#ctx.groups.shapes = new THREE.Group();
      // Nest the mesh container (inner, carries the reveal rock) inside a flick
      // wrapper (outer, carries the mouse tilt). The two rotations compose in the
      // scene graph, so reveal and flick stay fully independent.
      this.#ctx.groups.shapesFlick = new THREE.Group();
      this.#ctx.groups.shapesFlick.add(this.#ctx.groups.shapes);
      scene.add(this.#ctx.groups.hr);
      scene.add(this.#ctx.groups.shapesFlick);

      // box
      box.material = cloudedGlassMat;
      boxLines.material = lineMat;
      box.add(boxLines);

      const boxTransform: MeshTransform = {
        landscape: {
          position: new THREE.Vector3(-1.8, -1.05, 0),
          rotation: new THREE.Vector3(0.92, -0.11, 0),
          scale: new THREE.Vector3(0.75, 0.75, 0.1),
        },
      };

      box.userData.transform = boxTransform;

      this.#ctx.groups.shapes.add(box);

      // diamond3d
      if (this.#ctx.meshRefs.diamond3d) {
        const diamond3dTransform: MeshTransform = {
          portrait: {
            position: new THREE.Vector3(0.9, 1, -0.45),
            rotation: new THREE.Vector3(Math.PI * 0.125, 0, Math.PI * -0.025),
            scale: new THREE.Vector3(1, 1, 1),
          },
          landscape: {
            position: new THREE.Vector3(-1.9, 1, -0.45),
            rotation: new THREE.Vector3(Math.PI * 0.125, 0, 0),
            scale: new THREE.Vector3(0.9, 0.9, 0.9),
          },
        };

        this.#ctx.meshRefs.diamond3d.userData.transform = diamond3dTransform;
        this.#ctx.meshRefs.diamond3d.material = cloudedGlassMat;

        // edges
        if (diamond3dEdges) {
          const diamond3dLines = new THREE.LineSegments(
            diamond3dEdges,
            lineMat,
          );
          this.#ctx.meshRefs.diamond3d.add(diamond3dLines);
        }

        this.#ctx.groups.shapes.add(this.#ctx.meshRefs.diamond3d);
      }

      // diamondPlane
      if (this.#ctx.meshRefs.diamondPlane) {
        const diamondPlaneTransform: MeshTransform = {
          landscape: {
            position: new THREE.Vector3(1.67, 1.04, 0),
            rotation: new THREE.Vector3(0, 0, 0),
            scale: new THREE.Vector3(0.5, 0.5, 0.5),
          },
        };

        this.#ctx.meshRefs.diamondPlane.userData.transform =
          diamondPlaneTransform;
        this.#ctx.meshRefs.diamondPlane.material = diamondPlaneMat;
        this.#ctx.groups.shapes.add(this.#ctx.meshRefs.diamondPlane);
      }

      // hrHuw
      if (this.#ctx.meshRefs.hrHuw) {
        const hrHuwTransform: MeshTransform = {
          portrait: {
            position: new THREE.Vector3(-1.6, 0.55, 0),
          },
          landscape: {
            position: new THREE.Vector3(-3.25, 0, 0),
            rotation: new THREE.Vector3(0, 0, 0),
            scale: new THREE.Vector3(1, 1, 1),
          },
        };

        this.#ctx.meshRefs.hrHuw.userData.transform = hrHuwTransform;
        this.#ctx.groups.hr.add(this.#ctx.meshRefs.hrHuw);
      }

      // hrRobertsMain
      if (this.#ctx.meshRefs.hrRobertsMain) {
        const hrRobertsMainTransform: MeshTransform = {
          portrait: {
            position: new THREE.Vector3(0.2, -0.55, 0),
          },
          landscape: {
            position: new THREE.Vector3(1.75, 0, 0),
            rotation: new THREE.Vector3(0, 0, 0),
            scale: new THREE.Vector3(1, 1, 1),
          },
        };

        this.#ctx.meshRefs.hrRobertsMain.userData.transform =
          hrRobertsMainTransform;
        this.#ctx.meshRefs.hrRobertsMain.position.x = 1.75;

        if (liquidMaterial) {
          this.#ctx.meshRefs.hrRobertsMain.material = liquidMaterial;
        }

        this.#ctx.groups.hr.add(this.#ctx.meshRefs.hrRobertsMain);
      }

      // letterH
      if (this.#ctx.meshRefs.letterH) {
        const letterHTransform: MeshTransform = {
          portrait: {
            position: new THREE.Vector3(-0.8, -1.4, 0),
            scale: new THREE.Vector3(1.1, 1.1, 1.1),
          },
          landscape: {
            position: new THREE.Vector3(0.91, -0.93, 0),
            rotation: new THREE.Vector3(Math.PI * 0.125, 0, 0),
            scale: new THREE.Vector3(1, 1, 1),
          },
        };

        this.#ctx.meshRefs.letterH.userData.transform = letterHTransform;
        this.#ctx.meshRefs.letterH.material = cloudedGlassMat;

        // edges
        if (letterHEdges) {
          const letterHLines = new THREE.LineSegments(letterHEdges, lineMat);
          this.#ctx.meshRefs.letterH.add(letterHLines);
        }

        this.#ctx.groups.shapes.add(this.#ctx.meshRefs.letterH);
      }

      // add lights
      const directional = new THREE.DirectionalLight("yellow");
      directional.position.set(0, 1, 1);
      scene.add(directional, new THREE.AmbientLight("hotpink", 2));

      // hide meshes based on orientation, watch for resize
      this.#setMeshVisibility();
      this.#ro.observe(this);

      // Two independent tilt springs: the reveal starts displaced on the diagonal
      // and rings home (inner `shapes` group); the flick rests at zero and is
      // agitated by the mouse (outer `shapesFlick` group). Under reduced motion —
      // or below 1280px — the reveal starts at rest (shapes are static).
      this.#ctx.reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const staticReveal =
        this.#ctx.reducedMotion ||
        window.matchMedia("(max-width: 1279.98px)").matches;

      const a = staticReveal ? 0 : ROCK_INITIAL_ANGLE;
      const revealTilt = new SpringVec3(ROCK_CFG, new THREE.Vector3(a, a, 0));
      revealTilt.setTargetXYZ(0, 0, 0);
      this.#ctx.revealTilt = revealTilt;

      const flickTilt = new SpringVec3(FLICK_CFG);
      this.#ctx.flickTilt = flickTilt;

      // Mouse flick agitation — bank the outer group toward the cursor's travel
      // direction. Horizontal movement yaws (about Y), vertical movement pitches
      // (about X), so the face leans where the mouse is heading. World-space
      // mapping mirrors about-scene; off under reduced motion.
      const { mouse } = this.#ctx;
      const clampFlick = (v: number) =>
        Math.max(-FLICK_MAX, Math.min(FLICK_MAX, v * FLICK_GAIN));
      const handleMouseMove = (e: MouseEvent) => {
        const r = host.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const inside =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom;
        const wasActive = mouse.active;
        mouse.active = inside;
        if (!inside) return;

        const vp = getViewport(camera, host, 0);
        if (!vp) return;
        const px = ((e.clientX - r.left) / r.width - 0.5) * vp.width;
        const py = -((e.clientY - r.top) / r.height - 0.5) * vp.height;

        // On (re)entry seed prev and skip — avoids a huge first-frame impulse.
        if (!wasActive) {
          mouse.prev.set(px, py, 0);
          mouse.pos.set(px, py, 0);
          return;
        }
        mouse.prev.copy(mouse.pos);
        mouse.pos.set(px, py, 0);

        if (this.#ctx.reducedMotion) return;
        const dx = mouse.pos.x - mouse.prev.x; // world units, +x right
        const dy = mouse.pos.y - mouse.prev.y; // world units, +y up
        // Yaw toward horizontal travel, pitch toward vertical travel, so the
        // face's normal turns to follow the cursor.
        flickTilt.kickXYZ(clampFlick(-dy), clampFlick(dx), 0);
      };
      window.addEventListener("mousemove", handleMouseMove);
      this.#ctx.disposers.push(() =>
        window.removeEventListener("mousemove", handleMouseMove),
      );

      return { scene, camera };
    };

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = ({ camera, delta, elapsed, host }) => {
      const viewport = getViewport(camera, host) as SceneViewport;
      const scaleFactor =
        (this.#orientation === "portrait" ? viewport.height : viewport.width) *
        0.2;

      // Advance both tilt springs and apply each to its group — the reveal rock
      // on the inner mesh group, the mouse flick on the outer wrapper. They
      // compose in the scene graph; no handoff between them.
      if (this.#ctx.groups.shapes && this.#ctx.revealTilt) {
        const t = this.#ctx.revealTilt.update(delta);
        this.#ctx.groups.shapes.rotation.set(t.x, t.y, 0);
      }
      if (this.#ctx.groups.shapesFlick && this.#ctx.flickTilt) {
        const t = this.#ctx.flickTilt.update(delta);
        this.#ctx.groups.shapesFlick.rotation.set(t.x, t.y, 0);
      }

      // Scroll parallax — world-unit vertical drift, maxing out as the hero
      // scrolls one viewport away. `parWorld(name)` returns a mesh's offset.
      const scrollNorm = window.innerHeight
        ? Math.min(Math.max(window.scrollY / window.innerHeight, 0), 1)
        : 0;
      const parallaxScale = this.#ctx.reducedMotion
        ? PARALLAX_REDUCED_SCALE
        : 1;
      const parWorld = (name: string) =>
        (PARALLAX[name] ?? 0) * scrollNorm * parallaxScale;

      // box
      if (this.#ctx.meshRefs.box && this.#ctx.meshRefs.box.visible) {
        const t: MeshTransform = this.#ctx.meshRefs.box.userData.transform;
        const p = t[this.#orientation]?.position || t.landscape.position;
        const r = t[this.#orientation]?.rotation || t.landscape.rotation;
        const s = t[this.#orientation]?.scale || t.landscape.scale;

        this.#ctx.meshRefs.box.position.set(
          p.x * scaleFactor,
          p.y * scaleFactor + parWorld("box"),
          p.z,
        );
        this.#ctx.meshRefs.box.rotation.set(
          r.x * scaleFactor + elapsed * 0.5,
          r.y * scaleFactor + elapsed * 2,
          r.z,
        );
        this.#ctx.meshRefs.box.scale.set(
          s.x * scaleFactor,
          s.y * scaleFactor,
          s.z * scaleFactor,
        );
      }

      // diamond3d
      if (
        this.#ctx.meshRefs.diamond3d &&
        this.#ctx.meshRefs.diamond3d.visible
      ) {
        const t: MeshTransform =
          this.#ctx.meshRefs.diamond3d.userData.transform;
        const p = t[this.#orientation]?.position || t.landscape.position;
        const r = t[this.#orientation]?.rotation || t.landscape.rotation;
        const s = t[this.#orientation]?.scale || t.landscape.scale;

        this.#ctx.meshRefs.diamond3d.position.set(
          p.x * scaleFactor,
          p.y * scaleFactor + parWorld("diamond3d"),
          p.z,
        );
        this.#ctx.meshRefs.diamond3d.rotation.set(
          r.x,
          r.y + elapsed * 0.48,
          r.z,
        );
        this.#ctx.meshRefs.diamond3d.scale.set(
          s.x * scaleFactor,
          s.y * scaleFactor,
          s.z * scaleFactor,
        );
      }

      // diamondPlane
      if (
        this.#ctx.meshRefs.diamondPlane &&
        this.#ctx.meshRefs.diamondPlane.visible
      ) {
        const t: MeshTransform =
          this.#ctx.meshRefs.diamondPlane.userData.transform;
        const p = t[this.#orientation]?.position || t.landscape.position;
        const s = t[this.#orientation]?.scale || t.landscape.scale;

        this.#ctx.meshRefs.diamondPlane.position.set(
          p.x * scaleFactor,
          p.y * scaleFactor + parWorld("diamondPlane"),
          p.z,
        );
        this.#ctx.meshRefs.diamondPlane.scale.set(
          s.x * scaleFactor,
          s.y * scaleFactor,
          s.z * scaleFactor,
        );
      }

      const hrScale =
        this.#orientation == "landscape"
          ? viewport.width * 0.08
          : Math.min(viewport.width * 0.15, 0.4);

      if (this.#ctx.groups.hr) {
        this.#ctx.groups.hr.scale.set(hrScale, hrScale, 1);

        // position individual name meshes which are split
        if (this.#ctx.meshRefs.hrHuw && this.#ctx.meshRefs.hrHuw.visible) {
          const t: MeshTransform = this.#ctx.meshRefs.hrHuw.userData.transform;
          const p = t[this.#orientation]?.position || t.landscape.position;
          const s = t[this.#orientation]?.scale || t.landscape.scale;

          // Parallax is world-unit; convert to hr-group-local (÷ hrScale).
          this.#ctx.meshRefs.hrHuw.position.set(
            p.x,
            p.y + parWorld("hrHuw") / hrScale,
            p.z,
          );
          this.#ctx.meshRefs.hrHuw.scale.set(s.x, s.y, s.z);
        }

        if (
          this.#ctx.meshRefs.hrRobertsMain &&
          this.#ctx.meshRefs.hrRobertsMain.visible
        ) {
          const t: MeshTransform =
            this.#ctx.meshRefs.hrRobertsMain.userData.transform;
          const p = t[this.#orientation]?.position || t.landscape.position;
          const s = t[this.#orientation]?.scale || t.landscape.scale;

          this.#ctx.meshRefs.hrRobertsMain.position.set(
            p.x,
            p.y + parWorld("hrRobertsMain") / hrScale,
            p.z,
          );
          this.#ctx.meshRefs.hrRobertsMain.scale.set(s.x, s.y, s.z);
        }
      }

      // letterH
      if (this.#ctx.meshRefs.letterH && this.#ctx.meshRefs.letterH.visible) {
        const t: MeshTransform = this.#ctx.meshRefs.letterH.userData.transform;
        const p = t[this.#orientation]?.position || t.landscape.position;
        const r = t[this.#orientation]?.rotation || t.landscape.rotation;
        const s = t[this.#orientation]?.scale || t.landscape.scale;

        this.#ctx.meshRefs.letterH.position.set(
          p.x * scaleFactor,
          p.y * scaleFactor + parWorld("letterH"),
          p.z,
        );
        this.#ctx.meshRefs.letterH.rotation.set(
          r.x,
          r.y + elapsed * -0.48,
          r.z,
        );
        this.#ctx.meshRefs.letterH.scale.set(
          s.x * scaleFactor,
          s.y * scaleFactor,
          s.z * scaleFactor,
        );
      }

      // if (this.#ctx.groups.shapes) {
      //   this.#ctx.groups.shapes.rotation.y += delta * 2;
      // }
    };

    new SceneController({ host: this, setupFn, drawFn }, () => this.dispose());
  }

  private dispose(): void {
    this.#ro.disconnect();
    for (const d of this.#ctx.disposers) d();
    this.#ctx.disposers.length = 0;
    // Traverse the scene-graph roots and dispose geometries / materials /
    // material-bound textures. The GLTF textures used by the liquid material
    // are tracked via the GLTF material's `map` reference and picked up here.
    if (this.#ctx.groups.hr) disposeObject3D(this.#ctx.groups.hr);
    if (this.#ctx.groups.shapesFlick)
      disposeObject3D(this.#ctx.groups.shapesFlick);
  }

  protected render() {
    return html`
      <div>
        <intro-scene-decor></intro-scene-decor
        ><intro-scene-text></intro-scene-text>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "intro-scene": IntroScene;
  }
}
