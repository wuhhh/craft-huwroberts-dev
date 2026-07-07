import { type ReactiveController, type ReactiveControllerHost } from "lit";
import { sceneRegistry } from "../registries/scene-registry";
import type { SceneRegistryEntry } from "../types";

export class SceneController implements ReactiveController {
  host: ReactiveControllerHost;
  entry?: SceneRegistryEntry;
  disposeFn?: () => void;

  constructor(entry: SceneRegistryEntry, disposeFn?: () => void) {
    (this.host = entry.host).addController(this);
    this.entry = entry;
    this.disposeFn = disposeFn;
  }

  hostConnected(): void {
    if (this.entry) sceneRegistry.register(this.entry);
  }

  hostDisconnected(): void {
    if (this.entry) sceneRegistry.unregister(this.entry);
    // Free GPU/host resources so Barba navigations don't leak a renderer's
    // worth of geometries / materials / textures / RT per route change.
    this.disposeFn?.();
  }
}
