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

  private pixelRatio = Math.min(window.devicePixelRatio, 2);
  private renderer!: THREE.WebGPURenderer;

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
      /* JS-cached viewport height so the buffer doesn't resize during iOS
         chrome collapse. Fallback to 100% (= 100vh) pre-JS. */
      height: var(--stable-vh, 100%);
    }
  `;

  /**
   * Updates the internal renderer size if the canvas dimensions have changed
   */
  private updateSize() {
    const width = this.canvasElement.clientWidth;
    const height = this.canvasElement.clientHeight;

    if (
      this.canvasElement.width / this.pixelRatio !== width ||
      this.canvasElement.height / this.pixelRatio !== height
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

    // Pin the canvas to the viewport and read its rect each frame. The canvas
    // is transformed (pinned) so its rect is viewport-stable (top ≈ 0)
    // regardless of scroll or toolbar state — the correct reference frame for
    // the buffer. (The host scrolls with the page, so its rect can't.)
    this.canvasElement.style.transform = `translateY(${window.scrollY}px)`;
    const canvasRect = this.canvasElement.getBoundingClientRect();
    const cw = this.canvasElement.clientWidth;
    const ch = this.canvasElement.clientHeight;

    // Clear the full buffer. setViewport takes logical (CSS) px, so use
    // clientWidth/clientHeight, not the canvas' device-px .width/.height.
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, cw, ch);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    this.scenes.forEach((entry) => {
      entry.drawFn({
        camera: entry.camera,
        renderer: this.renderer,
        delta: this.delta,
        elapsed: this.elapsed,
        host: entry.host,
      });

      // Host rect in the pinned canvas' buffer space.
      const rect = entry.host.getBoundingClientRect();
      const fullLeft = rect.left - canvasRect.left;
      const fullTop = rect.top - canvasRect.top;
      const fullW = rect.width;
      const fullH = rect.height;

      // Clip to canvas bounds: WebGPU rejects out-of-bounds viewports (a
      // partially off-screen scene makes fullTop negative), destroying the
      // render pass. three.js clamps the scissor but not the viewport.
      const left = Math.max(0, fullLeft);
      const top = Math.max(0, fullTop);
      const width = Math.min(cw, fullLeft + fullW) - left;
      const height = Math.min(ch, fullTop + fullH) - top;

      // fully off-screen — nothing to draw
      if (width <= 0 || height <= 0) return;

      // offset of the visible tile within the scene's full rect
      const offsetX = left - fullLeft;
      const offsetY = top - fullTop;

      this.renderer.setViewport(left, top, width, height);
      this.renderer.setScissor(left, top, width, height);

      // Render only the visible sub-rectangle so content stays aligned rather
      // than squashed into the clipped viewport. Both PerspectiveCamera and
      // OrthographicCamera support setViewOffset (offset the frustum + refresh
      // the projection matrix); perspective also derives aspect from the rect.
      const camera = entry.camera;
      if (
        camera instanceof THREE.PerspectiveCamera ||
        camera instanceof THREE.OrthographicCamera
      ) {
        camera.setViewOffset(fullW, fullH, offsetX, offsetY, width, height);
      }

      this.renderer.render(entry.scene, entry.camera);
    });
  };

  firstUpdated(): void {
    this.renderer = new THREE.WebGPURenderer({
      canvas: this.canvasElement,
      antialias: true,
    });

    this.renderer.setPixelRatio(this.pixelRatio);

    this.setupScenes().then(() => {
      this.renderer.setAnimationLoop(this.frame);
    });
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
