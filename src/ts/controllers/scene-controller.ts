import type { Scene, PerspectiveCamera } from "three";
import {
  LitElement,
  type ReactiveController,
  type ReactiveControllerHost,
} from "lit";
import { scenes, type SceneEntry } from "../registries/scene-registry";

export class SceneController implements ReactiveController {
  host: ReactiveControllerHost;
  entry: SceneEntry;

  constructor(
    host: ReactiveControllerHost & LitElement,
    build: () => { scene: Scene; camera: PerspectiveCamera },
  ) {
    (this.host = host).addController(this);
    this.entry = { ...build(), el: host };
  }

  hostConnected(): void {
    scenes.register(this.entry);
  }

  hostDisconnected(): void {
    scenes.unregister(this.entry);
  }
}
