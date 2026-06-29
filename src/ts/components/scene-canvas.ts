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
      height: 100%;
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

    // Pin the canvas to the viewport via transform, then read its rendered
    // rect. Because the canvas is pinned, this rect is viewport-stable
    // (top ≈ 0) regardless of scroll position or iOS toolbar show/hide — so
    // it's the correct, non-stale reference frame for the drawing buffer.
    // (The HOST element is untransformed and scrolls with the page, so reading
    // its rect — as the old resize handler did — yields a top that goes
    // negative; on iOS a `resize` fired mid-scroll captured that bogus value,
    // corrupting every subsequent frame and causing the smearing.)
    this.canvasElement.style.transform = `translateY(${window.scrollY}px)`;
    const canvasRect = this.canvasElement.getBoundingClientRect();
    const cw = this.canvasElement.clientWidth;
    const ch = this.canvasElement.clientHeight;

    // Full-buffer clear. setViewport takes logical (CSS) px; the canvas'
    // .width/.height are device px and would be scaled again by pixelRatio,
    // producing an out-of-bounds value. Use clientWidth/clientHeight instead.
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, cw, ch);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    this.scenes.forEach((entry) => {
      // run the scene's draw fn (mutates objects, offscreen RTs, etc.)
      entry.drawFn({
        camera: entry.camera,
        renderer: this.renderer,
        delta: this.delta,
        elapsed: this.elapsed,
        host: entry.host,
      });

      // Host rect expressed in the pinned canvas' buffer space.
      const rect = entry.host.getBoundingClientRect();
      const fullLeft = rect.left - canvasRect.left;
      const fullTop = rect.top - canvasRect.top;
      const fullW = rect.width;
      const fullH = rect.height;

      // Clip to the canvas bounds. WebGPU strictly validates the viewport
      // (x,y >= 0 and x+w / y+h <= buffer size) and rejects — destroying the
      // render pass — on out-of-bounds values. A scene scrolling partially
      // off-screen makes fullTop negative; clamping keeps the viewport legal.
      // (three.js clamps the scissor itself but NOT the viewport.)
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

      // Render only the visible sub-portion (via the camera's view offset) so
      // content stays correctly aligned instead of being squashed into the
      // clipped viewport. Both PerspectiveCamera and OrthographicCamera
      // implement setViewOffset with the same sub-rectangle semantics (offset
      // the frustum, refresh the projection matrix); perspective additionally
      // derives its aspect from the host rect. Ortho has no `aspect`, so it
      // needs only the offset.
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
