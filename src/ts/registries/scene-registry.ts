import type { SceneEntry } from "../types.d.ts";

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
