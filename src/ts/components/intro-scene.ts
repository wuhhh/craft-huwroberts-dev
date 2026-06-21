import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { SceneController } from "../controllers/scene-controller";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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

  // eslint-disable-next-line no-unused-private-class-members
  #ctrl = new SceneController(this, () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 10);
    camera.position.z = 3;

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

    scene.add(new THREE.Mesh(geometry, material));
    scene.add(new THREE.HemisphereLight(0xaaaaaa, 0x444444, 3));

    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(1, 1, 1);
    scene.add(light);

    return { scene, camera };
  });

  protected render(): unknown {
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
