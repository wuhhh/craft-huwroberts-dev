import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three/webgpu";
import { SceneController } from "../controllers/scene-controller";
import {
  DRACOLoader,
  GLTFLoader,
  OrbitControls,
} from "three/examples/jsm/Addons.js";
import type { SceneDrawFn, SceneSetupAsyncFn, SceneViewport } from "../types";
import getViewport from "../lib/get-viewport";
import {
  abs,
  cameraPosition,
  clamp,
  color,
  dot,
  float,
  length,
  max,
  mix,
  mul,
  mx_noise_vec3,
  normalize,
  normalLocal,
  positionGeometry,
  positionLocal,
  pow,
  smoothstep,
  sub,
  time,
  uv,
  vec3,
} from "three/tsl";

/**
 * Objects that will be available between the setup and draw functions
 */
interface IntroSceneContext {
  meshRefs?: {
    box: THREE.Mesh | null;
    diamond3d: THREE.Mesh | null;
    diamondPlane: THREE.Mesh | null;
    huwRobertsMain: THREE.Mesh | null;
  };
}

/**
 * Intro scene
 */
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

  /**
   * Simple helper to pluck a named object out of an array
   */
  private findObject(
    name: string,
    children: THREE.Object3D[],
  ): THREE.Object3D | undefined {
    return children.find((child) => child.name === name);
  }

  constructor() {
    super();

    /**
     * Setup
     */
    const ctx: IntroSceneContext = {};

    const setupFn: SceneSetupAsyncFn = async ({ host }) => {
      const aspect = host.clientWidth / host.clientHeight;
      const camera = new THREE.PerspectiveCamera(25, aspect, 1, 20);
      camera.position.z = 10;

      const scene = new THREE.Scene();

      // orbit
      const controls = new OrbitControls(camera, this);
      controls.minDistance = 2;
      controls.maxDistance = 10;
      controls.enablePan = false;
      controls.enableZoom = false;

      // load the model
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("/dist/draco/");
      loader.setDRACOLoader(dracoLoader);
      const gltf = await loader.loadAsync("/dist/models/hrdev.glb");
      const c = gltf.scene.children;

      // materials

      //colors
      const indigo = 0x441ce4;
      const coral = 0xf36855;

      // line material
      const lineMat = new THREE.LineBasicNodeMaterial();
      lineMat.transparent = true;
      lineMat.colorNode = color(indigo);
      lineMat.opacity = 0.2;
      lineMat.depthTest = false;
      lineMat.depthWrite = false;

      // clouded glass material
      const cloudedGlassMat = new THREE.MeshStandardNodeMaterial();
      cloudedGlassMat.transparent = true;
      cloudedGlassMat.side = THREE.DoubleSide;
      cloudedGlassMat.roughnessNode = float(0.5);
      cloudedGlassMat.metalnessNode = float(0);
      cloudedGlassMat.wireframe = false;

      const boxDistStipple = () => {
        const centeredUv = uv().mul(2).sub(1);
        const offset = abs(centeredUv);
        const boxDist = max(offset.x, offset.y);
        return mix(color(coral), color(indigo), clamp(pow(boxDist, 4), 0, 1));
      };

      const cloudedGlass = () => {
        const localPos = positionLocal;
        const centerDist = length(localPos);
        const distanceFactor = smoothstep(float(0.5), float(2.0), centerDist);
        const edgeFactor = mul(distanceFactor, 9);
        return mix(color(coral), color(indigo), edgeFactor);
      };

      cloudedGlassMat.colorNode = mix(cloudedGlass(), boxDistStipple(), 0.5);

      const viewDirection = normalize(sub(cameraPosition, positionGeometry));
      const normal = normalLocal;
      const fresnel = pow(sub(1, abs(dot(viewDirection, normal))), 2);
      cloudedGlassMat.opacityNode = mix(float(0.05), float(0.225), fresnel);

      // diamond plane material
      const diamondPlaneMat = new THREE.MeshBasicNodeMaterial();
      diamondPlaneMat.colorNode = mix(
        color(coral),
        color(indigo),
        clamp(
          mx_noise_vec3(
            vec3(uv().x.add(time.mul(0.25)), uv().y.mul(4), time.mul(0.5)),
            1.5,
            0,
          ).r,
          0,
          1,
        ),
      );

      // meshes
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1, 4, 4, 1),
        cloudedGlassMat,
      );
      const boxEdges = new THREE.EdgesGeometry(box.geometry);
      const boxLines = new THREE.LineSegments(boxEdges, lineMat);
      const diamond3d = (this.findObject("diamond3d", c) as THREE.Mesh) || null;
      const diamond3dEdges = diamond3d
        ? new THREE.EdgesGeometry(diamond3d.geometry)
        : null;
      const diamondPlane =
        (this.findObject("diamondPlane", c) as THREE.Mesh) || null;

      ctx.meshRefs = {
        box,
        diamond3d,
        diamondPlane,
        huwRobertsMain:
          (this.findObject("huwRobertsMain", c) as THREE.Mesh) || null,
      };

      // box
      box.add(boxLines);
      scene.add(box);

      // diamond3d
      if (ctx.meshRefs.diamond3d) {
        ctx.meshRefs.diamond3d.rotation.set(Math.PI * 0.125, 0, 0);
        ctx.meshRefs.diamond3d.material = cloudedGlassMat;

        // edges
        if (diamond3dEdges) {
          const diamond3dLines = new THREE.LineSegments(
            diamond3dEdges,
            lineMat,
          );
          ctx.meshRefs.diamond3d.add(diamond3dLines);
          scene.add(ctx.meshRefs.diamond3d);
        }
      }

      // diamondPlane
      if (ctx.meshRefs.diamondPlane) {
        ctx.meshRefs.diamondPlane.material = diamondPlaneMat;
        scene.add(ctx.meshRefs.diamondPlane);
      }

      // huwRobertsMain
      if (ctx.meshRefs.huwRobertsMain) {
        scene.add(ctx.meshRefs.huwRobertsMain);
      }

      // apply materials

      // add lights
      const directional = new THREE.DirectionalLight("yellow");
      directional.position.set(0, 1, 1);
      scene.add(directional, new THREE.AmbientLight("hotpink", 2));

      return { scene, camera };
    };

    /**
     * Draw
     */
    const drawFn: SceneDrawFn = ({ camera, delta, elapsed, host }) => {
      const viewport = getViewport(camera, host) as SceneViewport;
      const scaleFactor = viewport.width * 0.2;

      // box
      if (ctx.meshRefs?.box) {
        ctx.meshRefs.box.position.set(
          -1.8 * scaleFactor,
          -1.05 * scaleFactor,
          0,
        );
        ctx.meshRefs.box.rotation.set(
          0.92 * scaleFactor + elapsed * 0.5,
          -0.11 * scaleFactor + elapsed * 2,
          0,
        );
        ctx.meshRefs.box.scale.set(
          0.75 * scaleFactor,
          0.75 * scaleFactor,
          0.1 * scaleFactor,
        );
      }

      // diamond3d
      if (ctx.meshRefs?.diamond3d) {
        ctx.meshRefs.diamond3d.scale.set(
          0.9 * scaleFactor,
          0.9 * scaleFactor,
          0.9 * scaleFactor,
        );

        ctx.meshRefs.diamond3d.position.set(
          -1.9 * scaleFactor,
          1 * scaleFactor,
          -0.45 * scaleFactor,
        );

        ctx.meshRefs.diamond3d.rotation.y += delta * 0.48;
      }

      // diamondPlane
      if (ctx.meshRefs?.diamondPlane) {
        ctx.meshRefs.diamondPlane.position.set(
          1.67 * scaleFactor,
          1.04 * scaleFactor,
          0,
        );
        ctx.meshRefs.diamondPlane.scale.set(
          0.5 * scaleFactor,
          0.5 * scaleFactor,
          0.5 * scaleFactor,
        );
      }

      // huwRobertsMain
      if (ctx.meshRefs?.huwRobertsMain) {
        const scale = viewport.width * 0.08;
        ctx.meshRefs.huwRobertsMain.scale.set(scale, scale, 1);
      }
    };

    new SceneController({ host: this, setupFn, drawFn });
  }

  protected render() {
    return html` <div></div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "intro-scene": IntroScene;
  }
}
