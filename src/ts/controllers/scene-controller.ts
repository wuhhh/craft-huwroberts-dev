import { type ReactiveController, type ReactiveControllerHost } from "lit";
import { sceneRegistry } from "../registries/scene-registry";
import type { SceneRegistryEntry } from "../types";

export class SceneController implements ReactiveController {
  host: ReactiveControllerHost;
  entry?: SceneRegistryEntry;

  constructor(entry: SceneRegistryEntry) {
    (this.host = entry.host).addController(this);
    this.entry = entry;
  }

  hostConnected(): void {
    if (this.entry) sceneRegistry.register(this.entry);
  }

  hostDisconnected(): void {
    if (this.entry) sceneRegistry.unregister(this.entry);
  }
}
