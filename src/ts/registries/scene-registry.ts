import type { SceneRegistryEntry } from "../types.d.ts";

class SceneRegistry {
  #entries = new Set<SceneRegistryEntry>();

  register(entry: SceneRegistryEntry) {
    this.#entries.add(entry);
  }
  unregister(entry: SceneRegistryEntry) {
    this.#entries.delete(entry);
  }
  get entries() {
    return this.#entries;
  }
}

export const sceneRegistry = new SceneRegistry();
