import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, query } from "lit/decorators.js";
import { scenes } from "../registries/scene-registry";
import * as THREE from "three/webgpu";

@customElement("scene-canvas")
export class SceneCanvas extends LitElement {
  @query("canvas")
  private canvasElement!: HTMLCanvasElement;
  private renderer!: THREE.WebGPURenderer;
  private canvasRect!: DOMRect;

  private delta!: number;
  private elapsed = 0;
  private startTime!: number;

  static styles?: CSSResultGroup | undefined = css`
    :host {
      display: block;
      position: absolute;
      left: 0;
      width: 100%;
      height: 100%;
    }

    canvas {
      position: absolute;
      display: block;
      width: 100%;
      height: 100%;
    }
  `;

  private updateSize() {
    const width = this.canvasElement.clientWidth;
    const height = this.canvasElement.clientHeight;

    if (
      this.canvasElement.width !== width ||
      this.canvasElement.height !== height
    ) {
      this.renderer.setSize(width, height, false);
    }
  }

  private updateTime() {
    if (!this.startTime) this.startTime = Date.now();
    const _elapsed = (Date.now() - this.startTime) / 1000;
    this.delta = _elapsed - this.elapsed;
    this.elapsed = _elapsed;
    this.updateSize();
  }

  private frame = () => {
    this.updateTime();

    // transform canvas
    this.canvasElement.style.transform = `translateY(${window.scrollY}px)`;

    // this.renderer.setClearColor(0xffffff);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height,
    );
    this.renderer.clear();

    // this.renderer.setClearColor(0xe0e0e0);
    this.renderer.setScissorTest(true);

    scenes.entries.forEach((entry) => {
      // call scene's draw fn
      entry.draw({ delta: this.delta, elapsed: this.elapsed });

      // get its position relative to the page's viewport
      const rect = entry.el.getBoundingClientRect();

      // check if it's offscreen. If so skip it
      if (
        rect.bottom < 0 ||
        rect.top > this.canvasRect.height ||
        rect.right < 0 ||
        rect.left > this.canvasRect.left + this.canvasRect.width
      ) {
        return; // it's off screen
      }

      // set the viewport
      const width = rect.right - rect.left;
      const height = rect.bottom - rect.top;
      const left = rect.left - this.canvasRect.left;
      const top = rect.top;

      this.renderer.setViewport(left, top, width, height);
      this.renderer.setScissor(left, top, width, height);

      entry.camera.aspect = width / height;
      entry.camera.updateProjectionMatrix();

      this.renderer.render(entry.scene, entry.camera);
    });
  };

  firstUpdated(): void {
    this.renderer = new THREE.WebGPURenderer({
      canvas: this.canvasElement,
      antialias: true,
    });
    this.canvasRect = this.getBoundingClientRect();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setAnimationLoop(this.frame);
  }

  render() {
    return html` <canvas></canvas> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "scene-canvas": SceneCanvas;
  }
}
