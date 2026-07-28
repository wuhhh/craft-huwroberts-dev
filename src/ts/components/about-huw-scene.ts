import { css, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import type { SceneDrawFn, SceneSetupAsyncFn } from "../types";
import { SceneController } from "../controllers/scene-controller";

customElement("about-huw-scene")
export class AboutHuwScene extends LitElement {
  static styles?: CSSResultGroup | undefined = css`
  :host {
      display: block;
      position: absolute;
      inset: 0;
    }

    a {
              color: red;

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
      const boxMesh = new THREE.Mesh(box, new THREE.MeshNormalMaterial);

      scene.add(boxMesh);

      return { scene, camera }
    }

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = () => {
    }

    /**
     * Dipose
     */
    const dispose = () => {

    }

    new SceneController({ host: this, setupFn, drawFn }, dispose);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "about-huw-scene": AboutHuwScene;
  }
}
