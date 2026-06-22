import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { SceneController } from "../controllers/scene-controller";
import {
  DRACOLoader,
  GLTFLoader,
  OrbitControls,
} from "three/examples/jsm/Addons.js";

@customElement("intro-scene")
export class IntroScene extends LitElement {
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
      color: var(--intro-scene-color, rebeccapurple);
    }
  `;

  private findObject(
    name: string,
    children: THREE.Object3D[],
  ): THREE.Object3D | undefined {
    return children.find((child) => child.name === name);
  }

  constructor() {
    super();

    new SceneController(this, async () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 1, 10);
      camera.position.z = 3;

      // orbit
      const controls = new OrbitControls(camera, this);
      controls.minDistance = 2;
      controls.maxDistance = 5;
      controls.enablePan = false;
      controls.enableZoom = false;

      // load the model
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("/dist/draco/");
      loader.setDRACOLoader(dracoLoader);
      const gltf = await loader.loadAsync("/dist/models/hrdev.glb");
      const c = gltf.scene.children;

      // meshes
      const diamond3d = this.findObject("diamond3d", c);
      const diamondPlane = this.findObject("diamondPlane", c);
      const huwRobertsMain = this.findObject("huwRobertsMain", c);
      const huwRobertsSoft = this.findObject("huwRobertsSoft", c);

      if (diamondPlane) {
        // scene.add(diamondPlane);
      }

      if (huwRobertsMain) {
        huwRobertsMain.scale.set(0.25, 0.25, 0.25);
        scene.add(huwRobertsMain);
      }

      // position meshes

      // apply materials

      // add lights
      scene.add(new THREE.DirectionalLight());
      scene.add(new THREE.AmbientLight());

      const draw = () => {
        // draw stuff ...
      };

      return { scene, camera, draw };
    });
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
    "intro-scene": IntroScene;
  }
}
