import type { Scene, PerspectiveCamera } from "three";
import {
  LitElement,
  type ReactiveController,
  type ReactiveControllerHost,
} from "lit";
import { scenes } from "../registries/scene-registry";
import type { DrawFn, SceneEntry } from "../types";

export class SceneController implements ReactiveController {
  host: ReactiveControllerHost;
  entry: SceneEntry;

  constructor(
    host: ReactiveControllerHost & LitElement,
    build: () => {
      scene: Scene;
      camera: PerspectiveCamera;
      draw: DrawFn;
    },
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
