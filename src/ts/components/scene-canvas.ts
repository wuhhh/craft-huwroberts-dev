import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, query } from "lit/decorators.js";
import { sceneRegistry } from "../registries/scene-registry";
import * as THREE from "three/webgpu";
import type { SceneEntry } from "../types";

/**
 * Orchestrates rendering multiple scenes to a single canvas
 */
@customElement("scene-canvas")
export class SceneCanvas extends LitElement {
  @query("canvas")
  private canvasElement!: HTMLCanvasElement;

  private renderer!: THREE.WebGPURenderer;
  private canvasRect!: DOMRect;

  private delta!: number;
  private elapsed = 0;
  private startTime!: number;

  // hold scenes after setup()
  private scenes: SceneEntry[] = [];

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

  /**
   * Window resize event handler
   */
  private handleResize = () => {
    this.canvasRect = this.getBoundingClientRect();
  };

  /**
   * Updates the internal renderer size if the canvas dimensions have changed
   */
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

  /**
   * Calculates elapsed time and frame delta
   */
  private updateTime() {
    if (!this.startTime) this.startTime = Date.now();
    const _elapsed = (Date.now() - this.startTime) / 1000;
    this.delta = _elapsed - this.elapsed;
    this.elapsed = _elapsed;
  }

  /**
   * Loops over scene registry entries, runs their setup fns and gives back SceneEntry[]
   */
  private async setupScenes() {
    sceneRegistry.entries.forEach(async (entry) => {
      // here we can inject context we want available to setupFn in scene components
      // passing back host which will now be mounted
      const { scene, camera } = await entry.setupFn({ host: entry.host });
      this.scenes.push({
        scene,
        camera,
        drawFn: entry.drawFn,
        host: entry.host,
      });
    });
  }

  /**
   * Animation frame loop
   */
  private frame = () => {
    this.updateTime();
    this.updateSize();

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

    this.scenes.forEach((entry) => {
      // call scene's draw fn
      entry.drawFn({
        camera: entry.camera,
        renderer: this.renderer,
        delta: this.delta,
        elapsed: this.elapsed,
        host: entry.host,
      });

      // get its position relative to the page's viewport
      const rect = entry.host.getBoundingClientRect();

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

      if (entry.camera instanceof THREE.PerspectiveCamera) {
        entry.camera.aspect = width / height;
        entry.camera.updateProjectionMatrix();
      }

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

    this.setupScenes().then(() => {
      this.renderer.setAnimationLoop(this.frame);
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("resize", this.handleResize);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("resize", this.handleResize);
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
