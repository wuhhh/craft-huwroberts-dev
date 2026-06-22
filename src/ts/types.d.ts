import type { Scene, PerspectiveCamera } from "three";

export type SceneDrawCallback = ({ delta: number, elapsed: number }) => void;

export type SceneEntry = {
  scene: Scene;
  camera: PerspectiveCamera;
  draw: SceneDrawCallback;
  el: HTMLElement;
};
