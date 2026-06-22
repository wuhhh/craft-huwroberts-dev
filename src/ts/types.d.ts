import type { LitElement } from "lit";
import * as THREE from "three/webgpu";

export type Host = LitElement & HTMLElement;

export type SceneViewport = {
  width: number;
  height: number;
  factor: number;
};

export type SceneSetupAsyncFnParams = {
  host: LitElement & HTMLElement;
};

export type SceneSetupAsyncFn = (SceneSetupAsyncFnParams) => Promise<{
  scene: THREE.Scene;
  camera: THREE.Camera;
}>;

export type SceneDrawFnParams = {
  camera: THREE.Camera;
  delta: number;
  elapsed: number;
  host: Host;
};

export type SceneDrawFn = (SceneDrawFnParams) => void;

export type SceneRegistryEntry = {
  host: Host;
  setupFn: SceneSetupAsyncFn;
  drawFn: SceneDrawFn;
};

export type SceneEntry = {
  host: Host;
  camera: THREE.Camera;
  scene: THREE.Scene;
  drawFn: SceneDrawFn;
};
