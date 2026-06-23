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
    shapes?: THREE.Group | null;
  };
  meshRefs: {
    box?: THREE.Mesh | null;
    diamond3d?: THREE.Mesh | null;
    diamondPlane?: THREE.Mesh | null;
    huwRobertsMain?: THREE.Mesh | null;
    letterH?: THREE.Mesh | null;
  };
}

/**
 * Intro scene
 */
@customElement("intro-scene")
export class IntroScene extends LitElement {
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
      color: var(--intro-scene-color, rebeccapurple);
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

  constructor() {
    super();

    /**
     * Setup
     */
    const ctx: IntroSceneContext = { groups: {}, meshRefs: {} };

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
      const huwRobertsMain =
        (this.findObject("huwRobertsMain", c) as THREE.Mesh) || null;
      const huwRobertsSoft =
        (this.findObject("huwRobertsSoft", c) as THREE.Mesh) || null;
      const letterH = (this.findObject("letterH", c) as THREE.Mesh) || null;
      const letterHEdges = letterH
        ? new THREE.EdgesGeometry(letterH.geometry)
        : null;

      ctx.meshRefs = {
        box,
        diamond3d,
        diamondPlane,
        huwRobertsMain,
        letterH,
      };

      // set textures
      const texHuwRobertsMain = huwRobertsMain
        ? (huwRobertsMain.material as THREE.MeshStandardMaterial).map
        : null;
      const texHuwRobertsSoft = huwRobertsSoft
        ? (huwRobertsSoft.material as THREE.MeshStandardMaterial).map
        : null;

      // materials
      const lineMat = createLineMat();
      const cloudedGlassMat = createCloudedGlassMat();
      const diamondPlaneMat = createDiamondPlaneMat();
      let liquidMaterial;

      if (texHuwRobertsMain && texHuwRobertsSoft) {
        liquidMaterial = createLiquidMaterialMat(
          texHuwRobertsMain,
          texHuwRobertsSoft,
          new THREE.Vector2(0, 0),
        );
      }

      // add meshes to groups / scene, set materials
      ctx.groups.shapes = new THREE.Group();
      scene.add(ctx.groups.shapes);

      // box
      box.material = cloudedGlassMat;
      boxLines.material = lineMat;
      box.add(boxLines);
      ctx.groups.shapes.add(box);

      // diamond3d
      if (ctx.meshRefs.diamond3d) {
        ctx.meshRefs.diamond3d.rotation.x = Math.PI * 0.125;
        ctx.meshRefs.diamond3d.material = cloudedGlassMat;

        // edges
        if (diamond3dEdges) {
          const diamond3dLines = new THREE.LineSegments(
            diamond3dEdges,
            lineMat,
          );
          ctx.meshRefs.diamond3d.add(diamond3dLines);
        }

        ctx.groups.shapes.add(ctx.meshRefs.diamond3d);
      }

      // diamondPlane
      if (ctx.meshRefs.diamondPlane) {
        ctx.meshRefs.diamondPlane.material = diamondPlaneMat;
        ctx.groups.shapes.add(ctx.meshRefs.diamondPlane);
      }

      // huwRobertsMain
      if (ctx.meshRefs.huwRobertsMain) {
        if (liquidMaterial) {
          ctx.meshRefs.huwRobertsMain.material = liquidMaterial;
        }

        scene.add(ctx.meshRefs.huwRobertsMain);
      }

      // letterH
      if (ctx.meshRefs.letterH) {
        ctx.meshRefs.letterH.rotation.x = Math.PI * 0.125;
        ctx.meshRefs.letterH.material = cloudedGlassMat;

        // edges
        if (letterHEdges) {
          const letterHLines = new THREE.LineSegments(letterHEdges, lineMat);
          ctx.meshRefs.letterH.add(letterHLines);
        }

        ctx.groups.shapes.add(ctx.meshRefs.letterH);
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
      const scaleFactor = viewport.width * 0.2;

      // box
      if (ctx.meshRefs.box) {
        ctx.meshRefs.box.position.set(
          -1.8 * scaleFactor,
          -1.05 * scaleFactor,
          0,
        );
        ctx.meshRefs.box.rotation.set(
          0.92 * scaleFactor + elapsed * 0.5,
          -0.11 * scaleFactor + elapsed * 2,
          0,
        );
        ctx.meshRefs.box.scale.set(
          0.75 * scaleFactor,
          0.75 * scaleFactor,
          0.1 * scaleFactor,
        );
      }

      // diamond3d
      if (ctx.meshRefs.diamond3d) {
        ctx.meshRefs.diamond3d.scale.set(
          0.9 * scaleFactor,
          0.9 * scaleFactor,
          0.9 * scaleFactor,
        );

        ctx.meshRefs.diamond3d.position.set(
          -1.9 * scaleFactor,
          1 * scaleFactor,
          -0.45 * scaleFactor,
        );

        ctx.meshRefs.diamond3d.rotation.y += delta * 0.48;
      }

      // diamondPlane
      if (ctx.meshRefs.diamondPlane) {
        ctx.meshRefs.diamondPlane.position.set(
          1.67 * scaleFactor,
          1.04 * scaleFactor,
          0,
        );
        ctx.meshRefs.diamondPlane.scale.set(
          0.5 * scaleFactor,
          0.5 * scaleFactor,
          0.5 * scaleFactor,
        );
      }

      // huwRobertsMain
      if (ctx.meshRefs.huwRobertsMain) {
        const scale = viewport.width * 0.08;
        ctx.meshRefs.huwRobertsMain.scale.set(scale, scale, 1);
      }

      // letterH
      if (ctx.meshRefs.letterH) {
        ctx.meshRefs.letterH.position.set(
          0.91 * scaleFactor,
          -0.93 * scaleFactor,
          0,
        );

        ctx.meshRefs.letterH.rotation.y += delta * -0.48;
      }

      // if (ctx.groups.shapes) {
      //   ctx.groups.shapes.rotation.y += delta * 2;
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
