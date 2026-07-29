import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import type { SceneDrawFn, SceneSetupAsyncFn } from "../types";
import { SceneController } from "../controllers/scene-controller";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

interface AboutHuwSceneContext {
  meshRefs: {
    box?: THREE.Mesh | null;
    wuhhh?: THREE.Mesh | null;
  };
}

@customElement("about-huw-scene")
export class AboutHuwScene extends LitElement {
  #ctx: AboutHuwSceneContext = { meshRefs: {} };

  static styles?: CSSResultGroup | undefined = css`
    :host {
      display: block;
      position: relative;
    }

    div {
      display: grid;
      place-items: center;
      width: 100%;
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
      const wuhhh = (modelMap.get("huwWhoAboutWuhhh") as THREE.Mesh) ?? null;
      if (wuhhh) {
        wuhhh.scale.x = wuhhh.scale.y = 0.5;
        const mat = wuhhh.material as THREE.MeshStandardMaterial;

        if (mat.map) {
          mat.map.wrapS = THREE.RepeatWrapping;
          mat.map.wrapT = THREE.ClampToEdgeWrapping;
          mat.map.magFilter = THREE.LinearFilter;
          mat.map.minFilter = THREE.LinearMipmapLinearFilter;
          mat.map.generateMipmaps = true;
          wuhhh.scale.x = 2;
          mat.map.repeat.set(4, 1);
        }
        this.#ctx.meshRefs.wuhhh = wuhhh;

        scene.add(this.#ctx.meshRefs.wuhhh);
      }

      return { scene, camera };
    };

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = ({ delta }) => {
      if (this.#ctx.meshRefs.wuhhh) {
        const wuhhh = this.#ctx.meshRefs.wuhhh;
        const mat = wuhhh.material as THREE.MeshStandardMaterial;

        if (mat.map) {
          mat.map.offset.x += delta * 0.125;
        }
      }
    };

    /**
     * Dipose
     */
    const dispose = () => {};

    new SceneController({ host: this, setupFn, drawFn }, dispose);
  }

  protected render() {
    return html` <div></div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "about-huw-scene": AboutHuwScene;
  }
}
