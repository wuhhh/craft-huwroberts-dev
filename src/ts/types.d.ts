import type { Scene, PerspectiveCamera } from "three";

export type DrawFn = ({ delta: number, elapsed: number }) => void;

export type SceneEntry = {
  scene: Scene;
  camera: PerspectiveCamera;
  draw: DrawFn;
  el: HTMLElement;
};
