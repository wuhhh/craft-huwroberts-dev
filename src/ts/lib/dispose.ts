import * as THREE from "three/webgpu";

/* Dispose every geometry, material, and material-hosted texture reachable
   from `root`. Deduplicates via Sets so shared materials dispose only once.
   Safe to call on already-disposed resources. */
export function disposeObject3D(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>();

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
      if (obj.geometry) geometries.add(obj.geometry);
      const mat = obj.material;
      if (mat) {
        (Array.isArray(mat) ? mat : [mat]).forEach((m) => {
          materials.add(m);
          // Pick up textures bound as material properties (.map, .normalMap,
          // etc.). TSL-node-bound textures are tracked + disposed by the
          // caller.
          for (const key in m) {
            const v = (m as Record<string, unknown>)[key];
            if (v instanceof THREE.Texture) textures.add(v);
          }
        });
      }
    }
  });

  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
}