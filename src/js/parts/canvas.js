import {
  Camera,
  Mesh,
  Plane,
  Program,
  Renderer,
  Texture,
  Transform,
} from "ogl";
import { loadTexture } from "./loaders";
import { vertex, fragment } from "./shaders";

export default ("canvas",
() => ({
  aspectRatio: 1,
  renderer: null,
  retainScaleOnResize: false,
  scene: null,
  sunMesh: null,
  sunPosition: { x: 1.1, y: 0.35 },
  sunScale: 1,
  sunShader: null,
  tanFOV: null,

  async init() {
    this.aspectRatio = window.innerWidth / window.innerHeight;

    // renderer
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      canvas: this.$refs.canvas,
      dpr: Math.min(2, window.devicePixelRatio),
      premultipliedAlpha: true,
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // render target
    this.gl = this.renderer.gl;

    this.camera = new Camera(this.gl, { fov: 35 });
    this.camera.position.set(0, 0, 2.5);
    this.camera.lookAt([0, 0, 0]);
    this.tanFOV = Math.tan(((Math.PI / 180) * this.camera.fov) / 2);
    this.windowHeight = window.innerHeight;

    // plane geometry for sun
    const geometry = new Plane(this.gl, {
      width: this.sunScale,
      height: this.sunScale,
    });

    // sun shader
    this.sunShader = new Program(this.gl, {
      vertex,
      fragment,
      uniforms: {
        uTexture: { value: new Texture(this.gl) },
        uTime: { value: 0 },
      },
      transparent: true,
    });

    // load sun texture
    const texture = await loadTexture(
      "/dist/images/texture--sun@2x.png",
      this.sunShader.gl
    );
    this.sunShader.uniforms.uTexture.value = texture;

    this.scene = new Transform();

    // sun
    this.sunMesh = new Mesh(this.gl, { geometry, program: this.sunShader });
    this.sunMesh.position.set(this.sunPosition.x, this.sunPosition.y, 0);
    this.sunMesh.setParent(this.scene);

    // full width test plane
    const plane = new Plane(this.gl, { width: 1, height: 1 });

    window.addEventListener("resize", () => this.resize(), false);
    this.resize();

    // start draw loop
    requestAnimationFrame((t) => this.update(t));
  },

  /**
   * Render loop
   * @param {number} t
   */
  update(t) {
    requestAnimationFrame((t) => this.update(t));
    this.sunShader.uniforms.uTime.value = t * 0.001;
    this.camera.position.y = window.scrollY * -0.001;
    this.renderer.render({ scene: this.scene, camera: this.camera });
  },

  setSunPosition() {
    const scale =
      (Math.min(this.gl.canvas.width, 1568) / this.gl.canvas.height) *
      this.sunScale;

    this.sunMesh.position.x = this.sunPosition.x * scale;
    this.sunMesh.position.y = this.sunPosition.y * scale;
  },

  setSunScale() {
    const scale =
      (Math.min(this.gl.canvas.width, 1568) / this.gl.canvas.height) *
      this.sunScale;
    this.sunMesh.scale.x = scale;
    this.sunMesh.scale.y = scale;
  },

  /**
   * Resize canvas
   */
  resize() {
    if (!this.retainScaleOnResize) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.perspective({
        aspect: this.gl.canvas.width / this.gl.canvas.height,
      });
      this.setSunPosition();
      this.setSunScale();
    } else {
      this.camera.perspective({
        aspect: window.innerWidth / window.innerHeight,
        fov:
          (360 / Math.PI) *
          Math.atan(this.tanFOV * (window.innerHeight / this.windowHeight)),
      });
      this.camera.lookAt(this.scene.position);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  },
}));
