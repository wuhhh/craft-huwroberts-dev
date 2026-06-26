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
    const next =
      this.clientWidth / this.clientHeight < 1 ? "portrait" : "landscape";
    if (next === this.#orientation) return; // no-op if unchanged

    this.#orientation = next;

    if (!this.#ctx) return;

    if (this.#ctx.meshRefs.box) {
      this.#ctx.meshRefs.box.visible = next === "landscape";
    }

    if (this.#ctx.meshRefs.diamondPlane) {
      this.#ctx.meshRefs.diamondPlane.visible = next === "landscape";
    }
  });

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
      height: 100vh;
      text-align: center;
    }
  `;

  /**
   * Simple helper to pluck a named object out of an array
   */
  private findObject(
    name: string,
    children: THREE.Object3D[],
  ): THREE.Object3D | undefined {
    return children.find((child) => child.name === name);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#orientation =
      this.clientWidth / this.clientHeight < 1 ? "portrait" : "landscape";
    this.#ro.observe(this);
  }

  constructor() {
    super();

    /**
     * Setup
     */
    this.#ctx = { groups: {}, meshRefs: {} } as IntroSceneContext;

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
      const gltf = await loader.loadAsync("/dist/models/hrdev2.glb");
      const c = gltf.scene.children;

      // set meshes
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 4, 4, 1));
      const boxEdges = new THREE.EdgesGeometry(box.geometry);
      const boxLines = new THREE.LineSegments(boxEdges);
      const diamond3d = (this.findObject("diamond3d", c) as THREE.Mesh) || null;
      const diamond3dEdges = diamond3d
        ? new THREE.EdgesGeometry(diamond3d.geometry)
        : null;
      const diamondPlane =
        (this.findObject("diamondPlane", c) as THREE.Mesh) || null;
      const hrHuw = (this.findObject("hrHuw", c) as THREE.Mesh) || null;
      const hrRobertsMain =
        (this.findObject("hrRobertsMain", c) as THREE.Mesh) || null;
      const hrRobertsSoft =
        (this.findObject("hrRobertsSoft", c) as THREE.Mesh) || null;
      const letterH = (this.findObject("letterH", c) as THREE.Mesh) || null;
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

      box.userData.transform = {
        landscape: {
          position: new THREE.Vector3(-1.8, -1.05, 0),
          rotation: new THREE.Vector3(0.92, -0.11, 0),
          scale: new THREE.Vector3(0.75, 0.75, 0.1),
        },
      } as MeshTransform;

      this.#ctx.groups.shapes.add(box);

      // diamond3d
      if (this.#ctx.meshRefs.diamond3d) {
        this.#ctx.meshRefs.diamond3d.rotation.x = Math.PI * 0.125;
        this.#ctx.meshRefs.diamond3d.material = cloudedGlassMat;

        // edges
        if (diamond3dEdges) {
          const diamond3dLines = new THREE.LineSegments(
            diamond3dEdges,
            lineMat,
          );
          this.#ctx.meshRefs.diamond3d.add(diamond3dLines);
        }

        this.#ctx.meshRefs.diamond3d.userData.transform = {
          portrait: {},
        } as MeshTransform;

        this.#ctx.groups.shapes.add(this.#ctx.meshRefs.diamond3d);
      }

      // diamondPlane
      if (this.#ctx.meshRefs.diamondPlane) {
        this.#ctx.meshRefs.diamondPlane.material = diamondPlaneMat;
        this.#ctx.groups.shapes.add(this.#ctx.meshRefs.diamondPlane);
      }

      // hrHuw
      if (this.#ctx.meshRefs.hrHuw) {
        this.#ctx.groups.hr.add(this.#ctx.meshRefs.hrHuw);
      }

      // hrRobertsMain
      if (this.#ctx.meshRefs.hrRobertsMain) {
        if (liquidMaterial) {
          this.#ctx.meshRefs.hrRobertsMain.material = liquidMaterial;
        }

        this.#ctx.groups.hr.add(this.#ctx.meshRefs.hrRobertsMain);
      }

      // letterH
      if (this.#ctx.meshRefs.letterH) {
        this.#ctx.meshRefs.letterH.rotation.x = Math.PI * 0.125;
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

      // box
      if (this.#ctx.meshRefs.box) {
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
      if (this.#ctx.meshRefs.diamond3d) {
        this.#ctx.meshRefs.diamond3d.position.set(
          -1.9 * scaleFactor,
          1 * scaleFactor,
          -0.45 * scaleFactor,
        );
        this.#ctx.meshRefs.diamond3d.scale.set(
          0.9 * scaleFactor,
          0.9 * scaleFactor,
          0.9 * scaleFactor,
        );

        this.#ctx.meshRefs.diamond3d.rotation.y += delta * 0.48;
      }

      // diamondPlane
      if (this.#ctx.meshRefs.diamondPlane) {
        this.#ctx.meshRefs.diamondPlane.position.set(
          1.67 * scaleFactor,
          1.04 * scaleFactor,
          0,
        );
        this.#ctx.meshRefs.diamondPlane.scale.set(
          0.5 * scaleFactor,
          0.5 * scaleFactor,
          0.5 * scaleFactor,
        );
      }

      const hrScale = viewport.width * 0.08;

      if (this.#ctx.groups.hr) {
        this.#ctx.groups.hr.scale.set(hrScale, hrScale, 1);

        // position individual name meshes which are split
        if (this.#ctx.meshRefs.hrHuw) {
          this.#ctx.meshRefs.hrHuw.position.x = -3.25;
        }

        if (this.#ctx.meshRefs.hrRobertsMain) {
          this.#ctx.meshRefs.hrRobertsMain.position.x = 1.75;
        }
      }

      // letterH
      if (this.#ctx.meshRefs.letterH) {
        this.#ctx.meshRefs.letterH.position.set(
          0.91 * scaleFactor,
          -0.93 * scaleFactor,
          0,
        );
        this.#ctx.meshRefs.letterH.scale.set(
          scaleFactor,
          scaleFactor,
          scaleFactor,
        );

        this.#ctx.meshRefs.letterH.rotation.y += delta * -0.48;
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
