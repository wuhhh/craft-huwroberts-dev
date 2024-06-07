import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { loadTexture } from './loaders';
import { vertex, fragment } from "./shaders";


export default ("canvas",
() => ({
  aspectRatio: 1,
  mesh: null,
  program: null,
  renderer: null,
  scene: null,

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

    // plane geometry
    // const geometry = new Plane(this.gl, { width: .4, height: .4 });
    const geometry = new Plane(this.gl, { width: .75, height: .75 });

    // shader
    this.program = new Program(this.gl, {
      vertex,
      fragment,
      uniforms: {
        uTexture: { value: new Texture(this.gl) },
        uTime: { value: 0 },
      },
      transparent: true,
    });

    // load texture
    const texture = await loadTexture('/dist/images/texture--sun-alt12@2x.png', this.program.gl);
    this.program.uniforms.uTexture.value = texture;

    this.scene = new Transform();

    // mesh
    this.mesh = new Mesh(this.gl, { geometry, program: this.program });
    this.mesh.position.set(.8, .35, 0);
    this.mesh.setParent(this.scene);

    window.addEventListener('resize', () => this.resize(), false)
    this.resize();

    // start draw loop
    requestAnimationFrame((t) => this.update(t));
  },

  /**
   * Render loop
   * @param {number} t
   */
  update(t) {
    // this.program.uniforms.uTransitionMix.value = Math.sin(t * 0.001) + 1 * 0.5;
    requestAnimationFrame((t) => this.update(t));
    this.program.uniforms.uTime.value = t * 0.001;
    this.camera.position.y = window.scrollY * -0.001;
    this.renderer.render({ scene: this.scene, camera: this.camera });
  },

  /**
   * Resize canvas
   */
  resize() {
    console.log('resize');
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.perspective({ aspect: this.gl.canvas.width / this.gl.canvas.height });
  },
}));
