import * as THREE from "three/webgpu";
import type { SceneViewport } from "../types";

/**
 * Gets the renderer viewport in world units (like R3F does)
 */
export default function getViewport(
  camera: THREE.Camera,
  el: HTMLElement,
  targetZ = 0,
): SceneViewport | undefined {
  const distance = camera.position.z - targetZ;

  if (camera instanceof THREE.PerspectiveCamera) {
    const fovRad = (camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fovRad / 2) * distance;
    const width = height * camera.aspect;
    return { width, height, factor: el.clientWidth / width };
  }

  if (camera instanceof THREE.OrthographicCamera) {
    const width = (camera.right - camera.left) / camera.zoom;
    const height = (camera.top - camera.bottom) / camera.zoom;
    return { width, height, factor: el.clientWidth / width };
  }
}
