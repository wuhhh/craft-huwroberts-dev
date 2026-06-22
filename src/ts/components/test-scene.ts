import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { SceneController } from "../controllers/scene-controller";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { spring } from "../lib/easing";
import type { SceneDrawFn, SceneSetupAsyncFn } from "../types";

@customElement("test-scene")
export class TestScene extends LitElement {
  static styles?: CSSResultGroup | undefined = css`
    :host {
      display: block;
    }

    div {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100vh;
      text-align: center;
      color: var(--test-scene-color, rebeccapurple);
    }
  `;

  constructor() {
    super();

    const camera = new THREE.PerspectiveCamera(50, 1, 1, 10);
    camera.position.z = 3;

    const setupFn: SceneSetupAsyncFn = () => {
      const scene = new THREE.Scene();

      const controls = new OrbitControls(camera, this);
      controls.minDistance = 2;
      controls.maxDistance = 5;
      controls.enablePan = false;
      controls.enableZoom = false;

      // add one random mesh to each scene
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(
          Math.random(),
          1,
          0.75,
          THREE.SRGBColorSpace,
        ),
        roughness: 0.5,
        metalness: 0,
        flatShading: true,
      });

      const mesh = new THREE.Mesh(geometry, material);

      scene.add(mesh);
      scene.add(new THREE.HemisphereLight(0xaaaaaa, 0x444444, 3));

      const light = new THREE.DirectionalLight(0xffffff, 1.5);
      light.position.set(1, 1, 1);
      scene.add(light);

      return { scene, camera };
    };

    const drawFn: SceneDrawFn = ({ elapsed }) => {
        mesh.rotation.y = Math.PI * spring(elapsed, 6, 0.8);
      };
    }

    new SceneController({ host: this, camera, setupFn, drawFn });
  }

  protected render() {
    return html`
      <div>
        I am in fact lackin' confusion<br />As to what's real and what's
        illusion
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-scene": TestScene;
  }
}
