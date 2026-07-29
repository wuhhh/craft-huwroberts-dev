import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import type { SceneDrawFn, SceneSetupAsyncFn } from "../types";
import { SceneController } from "../controllers/scene-controller";

interface AboutHuwSceneContext {
  meshRefs: {
    box?: THREE.Mesh | null;
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

      const box = new THREE.BoxGeometry();
      this.#ctx.meshRefs.box = new THREE.Mesh(
        box,
        new THREE.MeshNormalMaterial(),
      );

      scene.add(this.#ctx.meshRefs.box);

      return { scene, camera };
    };

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = ({ delta }) => {
      if (this.#ctx.meshRefs.box) {
        this.#ctx.meshRefs.box.rotation.x += delta;
        this.#ctx.meshRefs.box.rotation.y += delta * 1.1;
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
