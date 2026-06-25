/* eslint-disable @typescript-eslint/no-unused-vars */
import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { SceneController } from "../controllers/scene-controller";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import type { SceneDrawFn, SceneSetupAsyncFn } from "../types";
import getViewport from "../lib/get-viewport";

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
    const ctx: AboutSceneContext = { letterMeshRefs: {} };

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

      letterMeshNames.forEach((name) => {
        const mesh = c.find((child) => child.name === name) as
          | THREE.Mesh
          | undefined;
        ctx.letterMeshRefs[name] = mesh ?? null;
        if (mesh) scene.add(mesh);
      });

      /**
       * Match each loaded letter mesh to its corresponding DOM element.
       */
      const alignMeshesWithDOM = () => {
        const canvasRect = host.getBoundingClientRect();

        const viewport = getViewport(camera, host, 0);
        if (!viewport) return;

        const { width: visibleWidth, height: visibleHeight } = viewport;

        for (const letterMeshName in ctx.letterMeshRefs) {
          const mesh = ctx.letterMeshRefs[letterMeshName];

          // Query inside shadow DOM
          const domEl: HTMLDivElement | null =
            host.shadowRoot?.querySelector(`[data-letter=${letterMeshName}]`) ??
            null;

          if (!mesh || !domEl) continue;

          const rect = domEl.getBoundingClientRect();
          mesh.userData.rect = rect;

          // DOM rect centre relative to the host canvas
          const centerX = rect.left + rect.width / 2 - canvasRect.left;
          const centerY = rect.top + rect.height / 2 - canvasRect.top;

          // Convert to normalised device coordinates ([-0.5, 0.5])
          const normalizedX = centerX / canvasRect.width - 0.5;
          const normalizedY = -(centerY / canvasRect.height - 0.5);

          // Convert to 3D world coordinates
          mesh.position.x = normalizedX * visibleWidth;
          mesh.position.y = normalizedY * visibleHeight;
          mesh.position.z = 0;

          // Scale the mesh so its bounding-box height matches the DOM cell height
          mesh.geometry.computeBoundingBox();
          const box = mesh.geometry.boundingBox;
          if (box) {
            const size = new THREE.Vector3();
            box.getSize(size);

            // Convert DOM cell height to world units
            const targetHeight = rect.height / viewport.factor;

            if (size.y > 0) {
              const scale = targetHeight / size.y;
              mesh.scale.setScalar(scale);
            }
          }

          mesh.updateMatrixWorld();
        }
      };

      alignMeshesWithDOM();

      // Re-align on resize
      window.addEventListener("resize", alignMeshesWithDOM);

      return { scene, camera };
    };

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = ({ camera, delta, elapsed, host }) => {};

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
