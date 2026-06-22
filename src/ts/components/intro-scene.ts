import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { SceneController } from "../controllers/scene-controller";
import type { DrawFn } from "../types";

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

  constructor() {
    super();
    new SceneController(this, () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 1, 10);
      camera.position.z = 3;

      const draw: DrawFn = () => {
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
