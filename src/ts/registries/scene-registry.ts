import type { Scene, PerspectiveCamera } from "three";

export type SceneEntry = {
  scene: Scene;
  camera: PerspectiveCamera;
  el: HTMLElement;
};

class SceneRegistry {
  #entries = new Set<SceneEntry>();

  register(entry: SceneEntry) {
    this.#entries.add(entry);
  }
  unregister(entry: SceneEntry) {
    this.#entries.delete(entry);
  }
  get entries() {
    return this.#entries;
  }
}

export const scenes = new SceneRegistry();
