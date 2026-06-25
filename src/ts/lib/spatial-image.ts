import * as THREE from "three/webgpu";
import {
  float,
  mix,
  positionLocal,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
} from "three/tsl";

/** Max depth displacement (world units) once fully inflated. */
export const DEPTH_SCALE = 1.7;
/** Rotation per unit of mouse world-position. */
export const SPATIAL_TILT = 0.05;
/** Plane subdivisions — high so the depth displacement looks smooth. */
export const SPATIAL_SEGMENTS = 256;
/** Mesh is slightly larger than the visible area so tilted edges stay off-screen. */
export const SPATIAL_BLEED = 1.1;
/** Render-target width (height derived from aspect). */
export const RT_SIZE = 1024;

/**
 * Per-frame lerp factors from the React version (0.05 / 0.008 per frame at 60fps),
 * converted to exponential rates (1/s) so the effect is frame-rate independent.
 */
const TILT_LERP_RATE = 3.08; // ≈ 0.05 / frame @ 60fps
const DEPTH_LERP_RATE = 0.482; // ≈ 0.008 / frame @ 60fps

export interface CreateSpatialImageOptions {
  /** The colour image texture (sRGB). */
  colorTexture: THREE.Texture;
  /** The depth-map texture (linear; red channel = depth). */
  depthTexture: THREE.Texture;
  /** Width / height of the display area — drives the RT + offscreen camera aspect. */
  aspect: number;
}

export interface SpatialImage {
  /** Offscreen render target the depth/tilt scene renders into. */
  rt: THREE.RenderTarget;
  /** Scene containing the displaced, tilt-able mesh. */
  offScene: THREE.Scene;
  /** Camera for the offscreen scene (fov 25, z = 10). */
  offCamera: THREE.PerspectiveCamera;
  /** The displaced mesh — rotated each frame for the parallax tilt. */
  offMesh: THREE.Mesh;
  /** Material for the flat display plane — samples the RT (V-flipped). */
  displayMaterial: THREE.MeshBasicNodeMaterial;
  /**
   * Per-frame update: lerps tilt + depth toward the mouse, and applies rotation.
   * Call this before rendering the offscreen scene to the RT.
   */
  update: (delta: number, mouse: THREE.Vector3) => void;
}

/**
 * Build the offscreen "spatial image" scene used to fake parallax depth.
 *
 * A high-segment plane is displaced along Z by a depth texture and tilted toward
 * the mouse; the result is rendered to a render target, whose texture is shown on
 * a flat display plane (built by the caller) that aligns with a DOM element.
 *
 * Ported from hrdev-react's SpatialImage.tsx — the TSL graph is unchanged.
 */
export function createSpatialImage(
  options: CreateSpatialImageOptions,
): SpatialImage {
  const { colorTexture, depthTexture, aspect } = options;

  // --- render target -------------------------------------------------------
  const rt = new THREE.RenderTarget(
    RT_SIZE,
    Math.round(RT_SIZE / aspect),
  );

  // --- offscreen scene + camera -------------------------------------------
  const offScene = new THREE.Scene();
  const fov = 25;
  const offCamera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
  offCamera.position.set(0, 0, 10);

  const vFov = (fov * Math.PI) / 180;
  const visH = 2 * Math.tan(vFov / 2) * 10;
  const visW = visH * aspect;

  // --- material: cover UVs, depth displacement, image colour ---------------
  const mat = new THREE.MeshBasicNodeMaterial();

  const img = colorTexture.image as HTMLImageElement;
  const texAspect = img.width / img.height;
  const planeAspect = visW / visH; // === aspect
  let coverUv;
  if (texAspect > planeAspect) {
    const scale = planeAspect / texAspect;
    const offset = (1 - scale) / 2;
    coverUv = vec2(uv().x.mul(scale).add(offset), uv().y);
  } else {
    const scale = texAspect / planeAspect;
    const offset = (1 - scale) / 2;
    coverUv = vec2(uv().x, uv().y.mul(scale).add(offset));
  }

  const depthUniform = uniform(0);
  const depthNode = texture(depthTexture, coverUv);
  const displacement = depthNode.r.mul(depthUniform);
  mat.positionNode = positionLocal.add(vec3(0, 0, displacement));

  const imgColor = texture(colorTexture, coverUv);
  const overlay = vec3(0xf7 / 255, 0xf7 / 255, 0xf7 / 255);
  mat.colorNode = mix(imgColor, overlay, 0.5);

  // --- mesh (oversized so tilted edges stay off-screen) --------------------
  const geo = new THREE.PlaneGeometry(
    visW * SPATIAL_BLEED,
    visH * SPATIAL_BLEED,
    SPATIAL_SEGMENTS,
    SPATIAL_SEGMENTS,
  );
  const offMesh = new THREE.Mesh(geo, mat);
  offScene.add(offMesh);

  // --- display-plane material: shows the RT (V-flipped to match uv origin) -
  const displayMaterial = new THREE.MeshBasicNodeMaterial();
  displayMaterial.colorNode = texture(
    rt.texture,
    vec2(uv().x, float(1.0).sub(uv().y)),
  );

  // --- per-frame tilt + depth intro ----------------------------------------
  let tiltX = 0;
  let tiltY = 0;

  const update = (delta: number, mouse: THREE.Vector3) => {
    const targetTiltX = -mouse.y * SPATIAL_TILT;
    const targetTiltY = mouse.x * SPATIAL_TILT;

    const tiltK = 1 - Math.exp(-TILT_LERP_RATE * delta);
    tiltX += (targetTiltX - tiltX) * tiltK;
    tiltY += (targetTiltY - tiltY) * tiltK;
    offMesh.rotation.x = tiltX;
    offMesh.rotation.y = tiltY;

    const depthK = 1 - Math.exp(-DEPTH_LERP_RATE * delta);
    depthUniform.value += (DEPTH_SCALE - depthUniform.value) * depthK;
  };

  return {
    rt,
    offScene,
    offCamera,
    offMesh,
    displayMaterial,
    update,
  };
}
