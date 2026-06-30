import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { SceneController } from "../controllers/scene-controller";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import type { SceneDrawFn, SceneSetupAsyncFn, SceneViewport } from "../types";
import getViewport from "../lib/get-viewport";
import {
  createCloudedGlassMat,
  createDiamondPlaneMat,
  createLineMat,
  createLiquidMaterialMat,
} from "../lib/materials";

/**
 * Objects that will be available between the setup and draw functions
 */
interface IntroSceneContext {
  groups: {
    hr?: THREE.Group | null;
    shapes?: THREE.Group | null;
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
  #ctx: IntroSceneContext = { groups: {}, meshRefs: {} };

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
    this.#ctx = { groups: {}, meshRefs: {} } as IntroSceneContext;

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
      scene.add(this.#ctx.groups.hr);
      scene.add(this.#ctx.groups.shapes);

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

      return { scene, camera };
    };

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = ({ camera, elapsed, host }) => {
      const viewport = getViewport(camera, host) as SceneViewport;
      const scaleFactor =
        (this.#orientation === "portrait" ? viewport.height : viewport.width) *
        0.2;

      // box
      if (this.#ctx.meshRefs.box && this.#ctx.meshRefs.box.visible) {
        const t: MeshTransform = this.#ctx.meshRefs.box.userData.transform;
        const p = t[this.#orientation]?.position || t.landscape.position;
        const r = t[this.#orientation]?.rotation || t.landscape.rotation;
        const s = t[this.#orientation]?.scale || t.landscape.scale;

        this.#ctx.meshRefs.box.position.set(
          p.x * scaleFactor,
          p.y * scaleFactor,
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
          p.y * scaleFactor,
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
          p.y * scaleFactor,
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

          this.#ctx.meshRefs.hrHuw.position.set(p.x, p.y, p.z);
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

          this.#ctx.meshRefs.hrRobertsMain.position.set(p.x, p.y, p.z);
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
          p.y * scaleFactor,
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

    new SceneController({ host: this, setupFn, drawFn });
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
