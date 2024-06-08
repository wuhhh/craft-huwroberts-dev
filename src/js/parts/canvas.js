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
import { vertex, sunFrag } from "./shaders";

export default ("canvas",
() => ({
  aspectRatio: 1,
  maxContainerWidth: 1568,
  objects: {
    sun: {
      geometry: null,
      mesh: null,
      position: { x: 1.1, y: 0.35 },
      scale: 1,
      shader: null,
    },
    testPlane: {
      geometry: null,
      mesh: null,
      position: { x: 0, y: 0 },
      scale: 1,
      shader: null,
    },
  },
  renderer: null,
  retainScaleOnResize: false,
  scene: null,
  tanFOV: null,
  testMesh: null,

  async init() {
    /**
     * Setup
     */
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

    // camera
    this.camera = new Camera(this.gl, { fov: 35 });
    this.camera.position.set(0, 0, 2.5);
    this.camera.lookAt([0, 0, 0]);
    this.tanFOV = Math.tan(((Math.PI / 180) * this.camera.fov) / 2);
    this.windowHeight = window.innerHeight;

    /**
     * Create geometries
     */
    this.objects.sun.geometry = new Plane(this.gl, {
      width: this.objects.sun.scale,
      height: this.objects.sun.scale,
    });

    this.objects.testPlane.geometry = new Plane(this.gl, {
      width: 2.5,
      height: 0.02,
    });

    /**
     * Create shader programs
     */
    this.objects.sun.shader = new Program(this.gl, {
      vertex,
      fragment: sunFrag,
      uniforms: {
        uTexture: { value: new Texture(this.gl) },
        uTime: { value: 0 },
      },
      transparent: true,
    });

    this.objects.testPlane.shader = new Program(this.gl, {
      vertex,
      fragment: `
        precision highp float;

        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `,
    });

    /**
     * Load textures
     */
    const texture = await loadTexture(
      "/dist/images/texture--sun@2x.webp",
      this.objects.sun.shader.gl
    );
    this.objects.sun.shader.uniforms.uTexture.value = texture;

    /**
     * Create scene
     */
    this.scene = new Transform();

    /**
     * Create meshes
     */

    // Sun
    this.objects.sun.mesh = new Mesh(this.gl, {
      geometry: this.objects.sun.geometry,
      program: this.objects.sun.shader,
    });

    this.objects.sun.mesh.position.set(
      this.objects.sun.position.x,
      this.objects.sun.position.y,
      0
    );

    this.objects.sun.mesh.setParent(this.scene);

    // Test plane
    this.objects.testPlane.mesh = new Mesh(this.gl, {
      geometry: this.objects.testPlane.geometry,
      program: this.objects.testPlane.shader,
    });

    // this.objects.testPlane.mesh.setParent(this.scene);

    /**
     * Event listeners
     */
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
    this.objects.sun.shader.uniforms.uTime.value = t * 0.001;
    this.camera.position.y = window.scrollY * -0.001;
    this.renderer.render({ scene: this.scene, camera: this.camera });
  },

  /**
   * Set object position in relative units
   */
  setRelativePosition(object, position, scale) {
    const relativeScale =
      (Math.min(this.gl.canvas.width, this.maxContainerWidth) /
        this.gl.canvas.height) *
      scale;

    object.mesh.position.x = position.x * relativeScale;
    object.mesh.position.y = position.y * relativeScale;
  },

  /**
   * Set object scale in relative units
   */
  setRelativeScale(object, scale) {
    const relativeScale =
      (Math.min(this.gl.canvas.width, this.maxContainerWidth) /
        this.gl.canvas.height) *
      scale;
    object.mesh.scale.x = relativeScale;
    object.mesh.scale.y = relativeScale;
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

      this.setRelativePosition(this.objects.sun, this.objects.sun.position, 1);
      this.setRelativeScale(this.objects.sun, 1);
      this.setRelativePosition(
        this.objects.testPlane,
        this.objects.testPlane.position,
        1
      );
      this.setRelativeScale(this.objects.testPlane, 1);
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
