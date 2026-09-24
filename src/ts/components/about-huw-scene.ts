import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { texture, uv } from "three/tsl";
import type { SceneDrawFn, SceneSetupAsyncFn, SceneViewport } from "../types";
import { SceneController } from "../controllers/scene-controller";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import getViewport from "../lib/get-viewport";
import { disposeObject3D } from "../lib/dispose";
import { SpringScalar } from "../lib/spring";
import { alignMeshWithDOM } from "../lib/align-mesh-with-dom";
import { createSpatialImage } from "../lib/spatial-image";
import { createDiamondPlaneMat } from "../lib/materials";

const CURVE_THICKNESS = 0.06; // how fat the red debug ribbon is
const CURVE_SEGMENTS = 128; // ribbon smoothness
const CURVE_AMPLITUDE = 0.16; // how far the string can swing

const STRING_MODES = 3; // how many wobbles it can hold at once
const STRING_OMEGA = 8; // speed of the sway
const STRING_ZETA = 0.25; // how quickly it settles

const PLUCK_GAIN = 4; // how hard a swipe hits
const PLUCK_MAX = 1; // hardest possible pluck

const FOLLOW_STRENGTH = 0.9; // 0 = letters slide up/down, 1 = they lean into the curve

interface AboutHuwSceneContext {
  meshRefs: {
    box?: THREE.Mesh | null;
    wuhhh?: THREE.Mesh | null;
    curve?: THREE.Mesh | null;
    photo?: THREE.Mesh | null;
    circle?: THREE.Mesh | null;
  };
  /** One spring per wobble — the shape everything is built from. */
  modes?: SpringScalar[] | null;
  /** Steps the springs and rebuilds both meshes. */
  updateString?: ((delta: number) => void) | null;
  /** Offscreen photo scene, rendered into an RT each frame. */
  spatialImage?: ReturnType<typeof createSpatialImage> | null;
  /** World-space cursor, relative to the host centre — drives the photo tilt. */
  mouse: THREE.Vector3;
  /** Cleanup callbacks (event listeners). */
  disposers: Array<() => void>;
}

@customElement("about-huw-scene")
export class AboutHuwScene extends LitElement {
  #ctx: AboutHuwSceneContext = { meshRefs: {}, disposers: [], mouse: new THREE.Vector3() };

  static styles?: CSSResultGroup | undefined = css`
    :host {
      display: block;
      position: relative;
      height: var(--stable-vh, 100vh);
      /* Layout is in cqh from the centre (where the string rests). The string
         is sized in world units, so it scales with height — cqh keeps the
         composition in step with it at any aspect */
      container-type: size;
    }

    .photo,
    .circle,
    .copy {
      position: absolute;
      left: 50%;
      top: 50%;
    }

    .photo {
      width: 61.6cqh;
      aspect-ratio: 117 / 84; /* diamondPlane's bounds */
      translate: calc(-50% - 17.9cqh) calc(-50% - 12.7cqh);
    }

    .circle {
      width: 10.7cqh;
      aspect-ratio: 1;
      translate: calc(-50% + 32.4cqh) calc(-50% + 15.5cqh);
    }

    .copy {
      translate: -50% 17.9cqh;
    }
  `;

  constructor() {
    super();

    /**
     * Setup
     */
    const setupFn: SceneSetupAsyncFn = async ({ host }) => {
      // On a Barba nav setup can beat the first render — the ref divs live in it
      await this.updateComplete;

      const aspect = host.clientWidth / host.clientHeight;
      const camera = new THREE.PerspectiveCamera(25, aspect, 1, 20);
      camera.position.z = 10;

      const scene = new THREE.Scene();

      // Measured at z = 0, so the string spans the host edge to edge
      const viewport = getViewport(camera, host, 0) as SceneViewport;
      const halfWidth = viewport.width / 2;
      const amplitude = viewport.height * CURVE_AMPLITUDE;

      // All rest at 0, so the string starts flat and always returns there
      const modes = Array.from(
        { length: STRING_MODES },
        (_, n) =>
          new SpringScalar({
            omega: STRING_OMEGA * (n + 1),
            zeta: STRING_ZETA,
          }),
      );
      this.#ctx.modes = modes;

      // String height at a world x, and its slope
      const curveY = (x: number) => {
        const p = (Math.PI * (x + halfWidth)) / viewport.width;
        let y = 0;
        for (let n = 0; n < modes.length; n++) {
          y += modes[n].value * Math.sin((n + 1) * p);
        }
        return y * amplitude;
      };

      const curveSlope = (x: number) => {
        const p = (Math.PI * (x + halfWidth)) / viewport.width;
        let dy = 0;
        for (let n = 0; n < modes.length; n++) {
          dy += modes[n].value * (n + 1) * Math.cos((n + 1) * p);
        }
        return (dy * Math.PI * amplitude) / viewport.width;
      };

      // Puts a point on the string. FOLLOW_STRENGTH swings the offset
      // direction from straight-up toward the curve's normal.
      const deformPoint = (worldX: number, worldY: number, out: THREE.Vector2) => {
        const slope = curveSlope(worldX);
        const len = Math.hypot(1, slope);
        return out.set(
          worldX + FOLLOW_STRENGTH * (-slope / len) * worldY,
          curveY(worldX) + THREE.MathUtils.lerp(1, 1 / len, FOLLOW_STRENGTH) * worldY,
        );
      };
      const deformed = new THREE.Vector2();

      // Rebuilds a mesh from its flat copy each frame — reading `base` rather
      // than the live attribute is what stops deforms stacking up. Scale is
      // undone and redone so the mesh reads the right part of the string.
      const deformMesh = (mesh: THREE.Mesh, base: Float32Array) => {
        const pos = mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          deformPoint(
            base[i * 3] * mesh.scale.x + mesh.position.x,
            base[i * 3 + 1] * mesh.scale.y + mesh.position.y,
            deformed,
          );
          pos.setXY(
            i,
            (deformed.x - mesh.position.x) / mesh.scale.x,
            (deformed.y - mesh.position.y) / mesh.scale.y,
          );
        }
        pos.needsUpdate = true;
      };

      // load the model
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("/dist/draco/");
      loader.setDRACOLoader(dracoLoader);
      const gltf = await loader.loadAsync("/dist/models/hrdev.glb");

      const modelMap = new Map(gltf.scene.children.map((child) => [child.name, child]));

      // set meshes
      let wuhhhBase: Float32Array | null = null;
      const wuhhh = (modelMap.get("huwWhoAboutWuhhh") as THREE.Mesh) ?? null;
      if (wuhhh) {
        wuhhh.scale.x = wuhhh.scale.y = 0.5;
        const mat = wuhhh.material as THREE.MeshStandardMaterial;

        if (mat.map) {
          mat.map.wrapS = THREE.RepeatWrapping;
          mat.map.wrapT = THREE.ClampToEdgeWrapping;
          mat.map.magFilter = THREE.LinearFilter;
          mat.map.minFilter = THREE.LinearMipmapLinearFilter;
          mat.map.generateMipmaps = true;
          wuhhh.scale.x = 2;
          mat.map.repeat.set(4, 1);
        }
        this.#ctx.meshRefs.wuhhh = wuhhh;

        wuhhhBase = new Float32Array(wuhhh.geometry.attributes.position.array);

        scene.add(this.#ctx.meshRefs.wuhhh);
      }

      // Photo — the about page's spatial image, clipped by using the intro's
      // diamondPlane quad as the display surface
      const photo = (modelMap.get("diamondPlane") as THREE.Mesh) ?? null;
      const photoRef = this.renderRoot.querySelector<HTMLElement>(".photo");
      if (photo && photoRef) {
        const textureLoader = new THREE.TextureLoader();
        const [colorTexture, depthTexture] = await Promise.all([
          textureLoader.loadAsync("/dist/textures/huw-and-his-dog@2x.jpg"),
          textureLoader.loadAsync("/dist/textures/huw-and-his-dog-depth@2x.jpg"),
        ]);
        colorTexture.colorSpace = THREE.SRGBColorSpace;

        photo.geometry.computeBoundingBox();
        const size = photo.geometry.boundingBox!.getSize(new THREE.Vector3());
        const si = createSpatialImage({ colorTexture, depthTexture, aspect: size.x / size.y });
        this.#ctx.spatialImage = si;

        // glTF UVs run top-down, which already matches the RT, so no V-flip
        // (si.displayMaterial flips for PlaneGeometry)
        (photo.material as THREE.Material).dispose();
        const photoMat = new THREE.MeshBasicNodeMaterial();
        photoMat.colorNode = texture(si.rt.texture, uv());
        photo.material = photoMat;

        this.#ctx.meshRefs.photo = photo;
        scene.add(photo);

        this.#ctx.disposers.push(() => {
          si.rt.dispose();
          colorTexture.dispose();
          depthTexture.dispose();
        });
      }

      // Gradient circle — the intro diamond's material
      const circleRef = this.renderRoot.querySelector<HTMLElement>(".circle");
      if (circleRef) {
        const circle = new THREE.Mesh(new THREE.CircleGeometry(0.5, 64), createDiamondPlaneMat());
        this.#ctx.meshRefs.circle = circle;
        scene.add(circle);
      }

      const alignWithDOM = () => {
        const { photo, circle } = this.#ctx.meshRefs;
        if (photo && photoRef) {
          alignMeshWithDOM({ mesh: photo, domElement: photoRef, camera, host });
          photo.position.z = -0.01; // behind the string
        }
        if (circle && circleRef) {
          alignMeshWithDOM({ mesh: circle, domElement: circleRef, camera, host });
        }
      };
      alignWithDOM();
      window.addEventListener("resize", alignWithDOM);
      this.#ctx.disposers.push(() => window.removeEventListener("resize", alignWithDOM));

      // Red debug ribbon — shows the string itself
      const curveGeo = new THREE.PlaneGeometry(viewport.width, CURVE_THICKNESS, CURVE_SEGMENTS, 1);
      const curveBase = new Float32Array(curveGeo.attributes.position.array);

      const curveMat = new THREE.MeshBasicNodeMaterial();
      curveMat.color = new THREE.Color(0xff0000);

      const ribbon = new THREE.Mesh(curveGeo, curveMat);
      this.#ctx.meshRefs.curve = ribbon;
      // scene.add(ribbon);

      this.#ctx.updateString = (delta: number) => {
        for (const mode of modes) mode.update(delta);
        deformMesh(ribbon, curveBase);
        if (wuhhh && wuhhhBase) deformMesh(wuhhh, wuhhhBase);
      };

      // Kicks each wobble by how much it moves at the point struck, so a pluck
      // near an end rings differently to one in the middle. The STRING_OMEGA
      // factor keeps PLUCK_GAIN meaning "how big", not "how fast".
      const pluck = (x: number, cursorDy: number) => {
        const impulse = THREE.MathUtils.clamp(cursorDy * PLUCK_GAIN, -PLUCK_MAX, PLUCK_MAX);
        const p = (Math.PI * (x + halfWidth)) / viewport.width;
        modes.forEach((mode, n) => mode.kick(impulse * Math.sin((n + 1) * p) * STRING_OMEGA));
      };

      // Which side the cursor was last on, and where — so we can tell it
      // crossed and how fast
      let side = 0;
      let lastY = 0;
      let wasInside = false;

      const handleMouseMove = (e: MouseEvent) => {
        const r = host.getBoundingClientRect();
        if (!r.width || !r.height) return;

        const x = ((e.clientX - r.left) / r.width - 0.5) * viewport.width;
        const y = -((e.clientY - r.top) / r.height - 0.5) * viewport.height;
        // Clamped to the host — the tilt is unbounded, and a cursor sections
        // away would pitch the photo flat (the about page's host is the page)
        this.#ctx.mouse.set(
          THREE.MathUtils.clamp(x, -halfWidth, halfWidth),
          THREE.MathUtils.clamp(y, -viewport.height / 2, viewport.height / 2),
          0,
        );
        const nextSide = Math.sign(y - curveY(x));
        const inside =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom;

        // wasInside guard: entering the host from below isn't a pluck
        if (inside && wasInside && nextSide !== side) pluck(x, y - lastY);

        wasInside = inside;
        side = nextSide;
        lastY = y;
      };

      window.addEventListener("mousemove", handleMouseMove);
      this.#ctx.disposers.push(() => window.removeEventListener("mousemove", handleMouseMove));

      return { scene, camera };
    };

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = ({ renderer, delta }) => {
      this.#ctx.updateString?.(delta);

      const si = this.#ctx.spatialImage;
      if (si) {
        si.update(delta, this.#ctx.mouse);
        renderer.setRenderTarget(si.rt);
        renderer.render(si.offScene, si.offCamera);
        renderer.setRenderTarget(null);
      }

      if (this.#ctx.meshRefs.wuhhh) {
        const wuhhh = this.#ctx.meshRefs.wuhhh;
        const mat = wuhhh.material as THREE.MeshStandardMaterial;

        if (mat.map) {
          mat.map.offset.x += delta * 0.125;
        }
      }
    };

    /**
     * Dipose
     */
    const dispose = () => {
      this.#ctx.disposers.forEach((fn) => fn());
      this.#ctx.disposers = [];
      this.#ctx.updateString = null;
      this.#ctx.spatialImage = null;
      if (this.#ctx.meshRefs.curve) disposeObject3D(this.#ctx.meshRefs.curve);
      // A fresh GLTF loads per navigation, so this has to go too
      if (this.#ctx.meshRefs.wuhhh) disposeObject3D(this.#ctx.meshRefs.wuhhh);
      if (this.#ctx.meshRefs.photo) disposeObject3D(this.#ctx.meshRefs.photo);
      if (this.#ctx.meshRefs.circle) disposeObject3D(this.#ctx.meshRefs.circle);
    };

    new SceneController({ host: this, setupFn, drawFn }, dispose);
  }

  protected render() {
    return html`
      <div class="photo"></div>
      <div class="circle"></div>
      <about-huw-scene-decor></about-huw-scene-decor>
      <div class="copy"><slot></slot></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "about-huw-scene": AboutHuwScene;
  }
}
