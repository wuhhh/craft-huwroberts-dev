import * as THREE from "three/webgpu";
import getViewport from "./get-viewport";
import type { SceneViewport } from "../types";

/**
 * Options for aligning a mesh with a DOM element
 */
export interface AlignMeshWithDOMOptions {
  /** The Three.js mesh to position */
  mesh: THREE.Mesh;
  /** The DOM element to align with */
  domElement: HTMLElement;
  /** The camera used for rendering */
  camera: THREE.Camera;
  /** The host element (canvas container) */
  host: HTMLElement;
  /**
   * How to scale the mesh to match the DOM element (default: "height")
   * - "none": no scaling
   * - "height": uniform scale so the mesh height matches the DOM height
   *   (width follows the geometry's own aspect ratio)
   * - "size": non-uniform scale so the mesh matches the DOM width AND height
   *   (stretches to fill the DOM rect exactly)
   */
  scaleToMatch?: "none" | "height" | "size";
  /** Optional viewport (will be calculated if not provided) */
  viewport?: SceneViewport;
}

/**
 * Result of aligning a mesh with a DOM element
 */
export interface AlignMeshResult {
  /** The calculated world position */
  position: THREE.Vector3;
  /** The calculated per-axis scale (x, y) — null when scaleToMatch is "none" */
  scale: THREE.Vector2 | null;
  /** The viewport used for calculations */
  viewport: SceneViewport;
}

/**
 * Align a Three.js mesh with a DOM element.
 *
 * This function positions a mesh so that it appears at the same screen location
 * as the given DOM element. Optionally scales the mesh to match the DOM element's
 * height (uniform) or full size (width and height).
 *
 * @param options - Configuration options
 * @returns The calculated position, scale, and viewport
 */
export function alignMeshWithDOM(
  options: AlignMeshWithDOMOptions,
): AlignMeshResult | null {
  const { mesh, domElement, camera, host, scaleToMatch = "height" } =
    options;

  const canvasRect = host.getBoundingClientRect();
  const viewport = options.viewport ?? getViewport(camera, host, 0);

  if (!viewport) return null;

  const { width: visibleWidth, height: visibleHeight } = viewport;

  const rect = domElement.getBoundingClientRect();

  // DOM rect centre relative to the host canvas
  const centerX = rect.left + rect.width / 2 - canvasRect.left;
  const centerY = rect.top + rect.height / 2 - canvasRect.top;

  // Convert to normalised device coordinates ([-0.5, 0.5])
  const normalizedX = centerX / canvasRect.width - 0.5;
  const normalizedY = -(centerY / canvasRect.height - 0.5);

  // Convert to 3D world coordinates
  const position = new THREE.Vector3(
    normalizedX * visibleWidth,
    normalizedY * visibleHeight,
    0,
  );

  mesh.position.copy(position);

  let scale: THREE.Vector2 | null = null;

  // Scale the mesh so its bounding box matches the DOM element
  if (scaleToMatch !== "none") {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;

    if (box) {
      const size = new THREE.Vector3();
      box.getSize(size);

      // Convert DOM dimensions to world units
      const targetHeight = rect.height / viewport.factor;
      const targetWidth = rect.width / viewport.factor;

      const scaleY = size.y > 0 ? targetHeight / size.y : 1;

      if (scaleToMatch === "height") {
        // Uniform scale from height; width follows the geometry's aspect ratio
        scale = new THREE.Vector2(scaleY, scaleY);
        mesh.scale.setScalar(scaleY);
      } else {
        // Match width AND height (stretches to fill the DOM rect exactly)
        const scaleX = size.x > 0 ? targetWidth / size.x : 1;
        scale = new THREE.Vector2(scaleX, scaleY);
        mesh.scale.set(scaleX, scaleY, 1);
      }
    }
  }

  mesh.updateMatrixWorld();

  return { position, scale, viewport };
}

/**
 * Options for calculating DOM-to-world position (without applying to a mesh)
 */
export interface DOMToWorldOptions {
  /** The DOM element to get position for */
  domElement: HTMLElement;
  /** The camera used for rendering */
  camera: THREE.Camera;
  /** The host element (canvas container) */
  host: HTMLElement;
  /** Optional viewport (will be calculated if not provided) */
  viewport?: SceneViewport;
}

/**
 * Calculate world position for a DOM element without applying it to a mesh.
 *
 * @param options - Configuration options
 * @returns The world position and viewport, or null if viewport unavailable
 */
export function domToWorldPosition(
  options: DOMToWorldOptions,
): { position: THREE.Vector3; viewport: SceneViewport; rect: DOMRect } | null {
  const { domElement, camera, host } = options;

  const canvasRect = host.getBoundingClientRect();
  const viewport = options.viewport ?? getViewport(camera, host, 0);

  if (!viewport) return null;

  const { width: visibleWidth, height: visibleHeight } = viewport;

  const rect = domElement.getBoundingClientRect();

  // DOM rect centre relative to the host canvas
  const centerX = rect.left + rect.width / 2 - canvasRect.left;
  const centerY = rect.top + rect.height / 2 - canvasRect.top;

  // Convert to normalised device coordinates ([-0.5, 0.5])
  const normalizedX = centerX / canvasRect.width - 0.5;
  const normalizedY = -(centerY / canvasRect.height - 0.5);

  // Convert to 3D world coordinates
  const position = new THREE.Vector3(
    normalizedX * visibleWidth,
    normalizedY * visibleHeight,
    0,
  );

  return { position, viewport, rect };
}