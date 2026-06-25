/* eslint-disable @typescript-eslint/no-unused-vars */
import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { SceneController } from "../controllers/scene-controller";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import type { SceneDrawFn, SceneSetupAsyncFn } from "../types";
import { alignMeshWithDOM } from "../lib/align-mesh-with-dom";
import getViewport from "../lib/get-viewport";
import { createSpatialImage, type SpatialImage } from "../lib/spatial-image";

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
  /** Offscreen spatial-image scene + tracked mouse, rendered into an RT each frame. */
  spatialImage?: {
    si: SpatialImage;
    mouse: THREE.Vector3;
  } | null;
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

      /**
       * Match each loaded letter mesh to its corresponding DOM element.
       */
      const alignLetterMeshesWithDOM = () => {
        for (const letterMeshName in ctx.letterMeshRefs) {
          const mesh = ctx.letterMeshRefs[letterMeshName];

          // Query inside shadow DOM
          const domEl: HTMLDivElement | null =
            host.shadowRoot?.querySelector(`[data-letter=${letterMeshName}]`) ??
            null;

          if (!mesh || !domEl) continue;

          alignMeshWithDOM({ mesh, domElement: domEl, camera, host });
        }
      };

      alignLetterMeshesWithDOM();

      // Re-align on resize
      window.addEventListener("resize", alignLetterMeshesWithDOM);

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
          const aspect =
            rect.width && rect.height ? rect.width / rect.height : 1;

          const si = createSpatialImage({
            colorTexture,
            depthTexture,
            aspect,
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

          // mouse → world (relative to host, in the main camera's world units)
          const mouse = new THREE.Vector3(0, 0, 0);
          const handleMouseMove = (e: MouseEvent) => {
            const r = host.getBoundingClientRect();
            if (!r.width || !r.height) return;
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = -((e.clientY - r.top) / r.height - 0.5);
            const vp = getViewport(camera, host, 0);
            if (!vp) return;
            mouse.set(nx * vp.width, ny * vp.height, 0);
          };
          window.addEventListener("mousemove", handleMouseMove);

          ctx.spatialImage = { si, mouse };
        }
      }

      return { scene, camera };
    };

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = ({ renderer, delta }) => {
      const sp = ctx.spatialImage;
      if (!sp) return;

      // Tilt + depth intro for the offscreen scene, then render it into the RT.
      sp.si.update(delta, sp.mouse);
      renderer.setRenderTarget(sp.si.rt);
      renderer.render(sp.si.offScene, sp.si.offCamera);
      renderer.setRenderTarget(null);
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
