import type { Scene, PerspectiveCamera } from "three";
import {
  LitElement,
  type ReactiveController,
  type ReactiveControllerHost,
} from "lit";
import { scenes } from "../registries/scene-registry";
import type { SceneDrawCallback, SceneEntry } from "../types";

export class SceneController implements ReactiveController {
  host: ReactiveControllerHost;
  entry?: SceneEntry;

  constructor(
    host: ReactiveControllerHost & LitElement,
    build: () => Promise<{
      scene: Scene;
      camera: PerspectiveCamera;
      draw: SceneDrawCallback;
    }>,
  ) {
    (this.host = host).addController(this);
    build()
      .then((result) => {
        this.entry = { ...result, el: host };

        // build is async, if host connected first, register here
        if (host.isConnected) scenes.register(this.entry);
      })
      .catch((err) => {
        console.error("[SceneController] build failed, err: ", err);
      });
  }

  hostConnected(): void {
    if (this.entry) scenes.register(this.entry);
  }

  hostDisconnected(): void {
    if (this.entry) scenes.unregister(this.entry);
  }
}
