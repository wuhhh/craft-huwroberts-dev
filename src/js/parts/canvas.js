import {
  Camera,
  Mesh,
  Plane,
  Program,
  Renderer,
  Texture,
  Transform
} from "ogl";
import { loadTextures } from "./loaders";
import { vertex, dmndFrag, sunFrag } from "./shaders";

export default ("canvas",
() => ({
  aspectRatio: 1,
  maxContainerWidth: 1568,
  maxScroll: 0,
  objects: {
    incidentals: {
      type: "group",
      position: { x: 0, y: 0, z: 0 },
      scale: 1,
      group: null,
    },
    sun: {
      type: "mesh",
      breakpoints: {
        640: {
          position: { x: 1.2, y: 0.5, z: -2 },
          scale: 1.5,
        },
        1280: {
          position: { x: 2, y: 1, z: -2 },
          scale: 1.3,
        },
      },
      geometry: null,
      mesh: null,
      position: { x: 0.75, y: 1, z: -2 },
      scale: 1.35,
      shader: null,
    },
    testPlane: {
      type: "mesh",
      breakpoints: {
        640: {
          position: { x: 0.5, y: 0.5, z: -1 },
          scale: 1,
        },
        1280: {
          position: { x: 0.5, y: 0.5, z: -1 },
          scale: 1,
        },
      },
      geometry: null,
      mesh: null,
      position: { x: 0, y: 0, z: -0.2 },
      scale: 1,
      shader: null,
    }
  },
  renderer: null,
  retainScaleOnResize: false,
  scene: null,
  tanFOV: null,
  testMesh: null,
  textures: {},

  async init() {
    /**
     * Setup
     */
    this.aspectRatio = window.innerWidth / window.innerHeight;
    this.maxScroll = document.body.scrollHeight;

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

    /**
     * Load textures
     */
    // await an artifical delay to simulate loading
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const textures = await loadTextures(
      [
        {
          url: "/dist/images/texture--sun@2x.webp",
          name: "sun",
        },
        {
          url: "/dist/images/texture--dmnd-coral-blur-lg.webp",
          name: "dmndCoralBlurLg",
        },
        {
          url: "/dist/images/texture--dmnd-coral-lg.webp",
          name: "dmndCoralLg",
        },
        {
          url: "/dist/images/texture--dmnd-coral-sm.webp",
          name: "dmndCoralSm",
        },
        {
          url: "/dist/images/texture--dmnd-indigo-blur-lg.webp",
          name: "dmndIndigoBlurLg",
        },
        {
          url: "/dist/images/texture--dmnd-indigo-lg.webp",
          name: "dmndIndigoLg",
        },
        {
          url: "/dist/images/texture--dmnd-indigo-sm.webp",
          name: "dmndIndigoSm",
        },
      ],
      this.renderer.gl
    );

    Object.assign(this.textures, textures);

    this.objects.sun.shader.uniforms.uTexture.value = this.textures.sun;

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
      this.objects.sun.position.z
    );

    this.objects.sun.mesh.setParent(this.scene);

    // Test plane
    /* this.objects.testPlane.geometry = new Plane(this.gl, {
      width: 1,
      height: 1,
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

    this.objects.testPlane.mesh = new Mesh(this.gl, {
      geometry: this.objects.testPlane.geometry,
      program: this.objects.testPlane.shader,
    });

    this.objects.testPlane.mesh.position.set(
      this.objects.testPlane.position.x,
      this.objects.testPlane.position.y,
      this.objects.testPlane.position.z
    ); */

    // this.objects.testPlane.mesh.setParent(this.scene);

    // Incidental objects
    this.createIncidentals();

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
    // Ease camera position on scroll
    const scrollY = window.scrollY;
    const cameraTravel = -2;

    const cameraDestination = (scrollY / this.maxScroll) * cameraTravel;
    const cameraPosition = this.camera.position.clone();
    cameraPosition.y = cameraDestination;
    this.camera.position.lerp(cameraPosition, 0.1);

    // Update uniforms, render, repeat
    this.objects.sun.shader.uniforms.uTime.value = t * 0.001;
    this.renderer.render({ scene: this.scene, camera: this.camera });
    requestAnimationFrame((t) => this.update(t));
  },

  /**
   * Find nearest breakpoint in object
   */
  getBreakpoint(object) {
    // Set values from outside breakpoints object initially
    let defaultBreakpoint = {
      position: object.position,
      scale: object.scale,
    };

    if (!object.breakpoints) {
      return defaultBreakpoint;
    }

    // Sort breakpoint keys
    const breakpoints = Object.keys(object.breakpoints).sort((a, b) => a - b);

    // Find matching breakpoint
    breakpoints.forEach((breakpoint) => {
      if (window.innerWidth >= breakpoint) {
        defaultBreakpoint = object.breakpoints[breakpoint];
      }
    });

    return defaultBreakpoint;
  },

  /**
   * Set object position in relative units
   */
  setRelativePosition(object, scale) {
    const relativeScale =
      (Math.min(this.gl.canvas.width, this.maxContainerWidth) /
        this.gl.canvas.height) *
      scale;

    const position = this.getBreakpoint(object).position;

    object[object.type].position.x = position.x * relativeScale;
    object[object.type].position.y = position.y * relativeScale;
  },

  /**
   * Set object scale in relative units
   */
  setRelativeScale(object, scale) {
    const relativeScale =
      (Math.min(this.gl.canvas.width, this.maxContainerWidth) /
        this.gl.canvas.height) *
      scale;

    const scaleValue = this.getBreakpoint(object).scale;

    object[object.type].scale.x = relativeScale * scaleValue;
    object[object.type].scale.y = relativeScale * scaleValue;
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

      // Set object positions and scales
      this.setRelativePosition(this.objects.sun, 1);
      this.setRelativeScale(this.objects.sun, 1);

      this.setRelativePosition(this.objects.incidentals, 1);
      this.setRelativeScale(this.objects.incidentals, 1);
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

  /**
   * Create incidental objects
   */
  createIncidentals() {
    this.objects.incidentals.group = new Transform();
    this.objects.incidentals.group.setParent(this.scene);

    const placements = [
      {
        type: "dmndIndigoLg",
        position: { x: 0.2, y: 0.6, z: -1 },
        scale: 1,
        floatIntensity: 0.1,
        floatSpeed: 0.1,
      },
      {
        type: "dmndCoralBlurLg",
        position: { x: -0.6, y: 0.6, z: -0.5 },
        scale: 2,
        floatIntensity: 0.1,
        floatSpeed: 0.1,
      },
      {
        type: "dmndCoralBlurLg",
        position: { x: -0.1, y: 0.5, z: -2.1 },
        scale: 4,
        floatIntensity: 0.1,
        floatSpeed: 0.1,
      },
      {
        type: "dmndCoralSm",
        position: { x: 0.8, y: -0.4, z: 0.2 },
        scale: 0.5,
        floatIntensity: 0.1,
        floatSpeed: 0.1,
      },
      {
        type: "dmndIndigoLg",
        position: { x: -0.6, y: -0.6, z: 0.4 },
        scale: 1.5,
        floatIntensity: 0.1,
        floatSpeed: 0.1,
      },
      {
        type: "dmndCoralBlurLg",
        position: { x: 0, y: -1, z: 0.3 },
        scale: 1.5,
        floatIntensity: 0.1,
        floatSpeed: 0.1,
      },
      {
        type: "dmndIndigoSm",
        position: { x: 0.65, y: -1.5, z: 0.5 },
        scale: 0.33,
        floatIntensity: 0.1,
        floatSpeed: 0.1,
      },
    ];

    placements.forEach((placement) => {
      const geometry = new Plane(this.gl, {
        width: 0.1,
        height: 0.1,
      });

      const mesh = new Mesh(this.gl, {
        geometry,
        program: new Program(this.gl, {
          vertex,
          fragment: dmndFrag,
          uniforms: {
            uTexture: { value: this.textures[placement.type] },
            uTime: { value: 0 },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
        }),
      });

      mesh.scale.set(placement.scale, placement.scale, 1);

      mesh.position.set(
        placement.position.x,
        placement.position.y,
        placement.position.z
      );

      mesh.setParent(this.objects.incidentals.group);
    });
  },
}));
