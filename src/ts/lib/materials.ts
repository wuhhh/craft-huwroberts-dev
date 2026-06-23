import * as THREE from "three/webgpu";
import {
  abs,
  add,
  cameraPosition,
  clamp,
  color,
  dot,
  float,
  Fn,
  length,
  max,
  mix,
  mod,
  mul,
  mx_noise_vec3,
  normalize,
  normalLocal,
  positionGeometry,
  positionLocal,
  pow,
  smoothstep,
  sub,
  texture,
  time,
  uv,
  vec2,
  vec3,
} from "three/tsl";

/**
 * Colors used across materials
 */
export const INDIGO = 0x441ce4;
export const CORAL = 0xf36855;

/**
 * Creates a clouded glass material with stippled box-dist and centre-distance blending.
 * Returns a new instance each call so it can be reused on multiple meshes.
 */
export function createCloudedGlassMat(): THREE.MeshStandardNodeMaterial {
  const mat = new THREE.MeshStandardNodeMaterial();
  mat.transparent = true;
  mat.side = THREE.DoubleSide;
  mat.roughnessNode = float(0.5);
  mat.metalnessNode = float(0);
  mat.wireframe = false;

  const boxDistStipple = () => {
    const centeredUv = uv().mul(2).sub(1);
    const offset = abs(centeredUv);
    const boxDist = max(offset.x, offset.y);
    return mix(color(CORAL), color(INDIGO), clamp(pow(boxDist, 4), 0, 1));
  };

  const cloudedGlass = () => {
    const localPos = positionLocal;
    const centerDist = length(localPos);
    const distanceFactor = smoothstep(float(0.5), float(2.0), centerDist);
    const edgeFactor = mul(distanceFactor, 9);
    return mix(color(CORAL), color(INDIGO), edgeFactor);
  };

  mat.colorNode = mix(cloudedGlass(), boxDistStipple(), 0.5);

  const viewDirection = normalize(sub(cameraPosition, positionGeometry));
  const normal = normalLocal;
  const fresnel = pow(sub(1, abs(dot(viewDirection, normal))), 2);
  mat.opacityNode = mix(float(0.05), float(0.225), fresnel);

  return mat;
}

/**
 * Creates a diamond plane material with noise-based animated colour.
 */
export function createDiamondPlaneMat(): THREE.MeshBasicNodeMaterial {
  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = mix(
    color(CORAL),
    color(INDIGO),
    clamp(
      mx_noise_vec3(
        vec3(uv().x.add(time.mul(0.25)), uv().y.mul(4), time.mul(0.5)),
        1.5,
        0,
      ).r,
      0,
      1,
    ),
  );
  return mat;
}

/**
 * Creates a liquid chrome material with stipple-pattern animation.
 *
 * @param mainTexture - The primary (black) base texture to overlay on
 * @param softTexture - The "soft edge" texture (red channel) that masks where the liquid effect appears
 * @param mouseUniform - A vec2 uniform for mouse position (drives local distortion)
 */
export function createLiquidMaterialMat(
  mainTexture: THREE.Texture | undefined,
  softTexture: THREE.Texture | undefined,
  mouseUniform: THREE.Vector2 | undefined,
): THREE.MeshBasicNodeMaterial {
  const mat = new THREE.MeshBasicNodeMaterial();
  mat.transparent = true;
  mat.depthTest = false;
  mat.depthWrite = false;

  // Textures
  const mainTex = texture(mainTexture ?? undefined);
  const softTex = texture(softTexture ?? undefined);

  // Liquid effect parameters
  const patternScale = float(2.0);
  const refraction = float(0.015);
  const liquidAmount = float(0.07);
  const speed = float(0.4);

  // Create liquid shader
  const liquidShader = Fn(() => {
    const uvCoord = uv();
    const t = time.mul(speed);

    // Sample the original texture (stark black base)
    const originalColor = mainTex.sample(uvCoord);

    // Get edge value from soft texture (red channel) - this defines where liquid effect appears
    const softEdge = softTex.sample(uvCoord).r;

    // Color palette: red-orange, indigo, pink (more desaturated)
    const orange = vec3(0.7, 0.4, 0.35);
    const indigo = vec3(0.45, 0.4, 0.6);
    const pink = vec3(0.65, 0.45, 0.55);

    // Mouse influence - distance from mouse creates local distortion
    const mousePos = mouseUniform || new THREE.Vector2(0, 0);
    const mouseOffset = sub(uvCoord, vec2(mousePos.x, mousePos.y));
    const mouseDist = length(mouseOffset);
    // Smooth falloff - strongest near mouse, fades out
    const mouseInfluence = smoothstep(float(0.4), float(0.0), mouseDist);
    // Direction from mouse for ripple effect
    const mouseDir = normalize(mouseOffset);

    // UV calculations for bulge effect
    const gradUv = uvCoord.sub(0.5);
    const diagonal = gradUv.x.sub(gradUv.y);

    // Distance for bulge
    const dist = gradUv.add(vec2(0, mul(0.2, diagonal))).length();

    // Bulge calculation
    const bulgeRaw = sub(1.0, pow(mul(1.8, dist), 1.2));
    const bulge = mul(bulgeRaw, pow(uvCoord.y, 0.3));

    // Multiple noise layers with irrational time ratios to prevent visible looping
    // Using golden ratio (1.618), sqrt(2) (1.414), sqrt(3) (1.732), e (2.718), pi (3.14159)

    // Layer 1: Base movement - very slow, large scale
    const noise1Input = vec3(
      uvCoord.x.mul(1.2).sub(t.mul(0.11)), // prime-ish multiplier
      uvCoord.y.mul(1.2).add(t.mul(0.07)),
      t.mul(0.0618), // golden ratio decimal
    );
    const noise1 = mx_noise_vec3(noise1Input, float(1.0), float(0)).r;

    // Layer 2: Medium detail - uses sqrt(2) and sqrt(3) relationships
    const noise2Input = vec3(
      uvCoord.x.mul(2.7).add(t.mul(0.1414)), // sqrt(2)/10
      uvCoord.y.mul(2.7).sub(t.mul(0.1732)), // sqrt(3)/10
      t.mul(0.0314), // pi/100
    );
    const noise2 = mx_noise_vec3(noise2Input, float(1.0), float(0)).r;

    // Layer 3: Fine detail - very slow evolution
    const noise3Input = vec3(
      uvCoord.x.mul(4.5).sub(t.mul(0.0577)), // 1/sqrt(3)/10
      uvCoord.y.mul(4.5).add(t.mul(0.0707)), // sqrt(2)/20
      t.mul(0.02718), // e/100
    );
    const noise3 = mx_noise_vec3(noise3Input, float(1.0), float(0)).r;

    // Layer 4: Ultra-slow drift for long-term variation
    const noise4Input = vec3(
      uvCoord.x.mul(0.8).add(t.mul(0.0173)), // very slow
      uvCoord.y.mul(0.8).sub(t.mul(0.0141)),
      t.mul(0.0111),
    );
    const noise4 = mx_noise_vec3(noise4Input, float(1.0), float(0)).r;

    // Combine noise layers - use noise4 to modulate the blend of others
    const baseNoise = add(
      mul(noise1, 0.4),
      add(mul(noise2, 0.3), add(mul(noise3, 0.2), mul(noise4, 0.1))),
    );
    // Add mouse-driven turbulence (subtle)
    const mouseNoise = mul(
      mouseInfluence,
      mul(mouseDir.x.add(mouseDir.y), 0.25),
    );
    const noise = add(baseNoise, mul(mouseNoise, 0.15));

    // Apply liquid distortion to edge
    const liquidEdge = softEdge.add(
      mul(sub(1.0, softEdge), mul(liquidAmount, noise)),
    );

    // Stripe calculations
    const cycleWidth = patternScale;
    const thinStrip1Ratio = mul(0.12, sub(1.0, mul(0.4, bulge))).div(
      cycleWidth,
    );

    // Direction for stripes with more noise variation
    let dir = gradUv.x;
    dir = dir.add(diagonal);
    dir = dir.sub(
      mul(
        mul(2.0, noise),
        mul(
          diagonal,
          mul(
            smoothstep(float(0), float(1), liquidEdge),
            smoothstep(float(1), float(0), liquidEdge),
          ),
        ),
      ),
    );
    dir = dir.mul(float(0.1).add(mul(sub(1.1, liquidEdge), bulge)));
    dir = dir.mul(smoothstep(float(1), float(0.7), liquidEdge));
    dir = dir.mul(cycleWidth);
    // Add noise-modulated time offset - combines multiple noise layers for unpredictable flow
    dir = dir.sub(t.mul(0.8).add(mul(noise1, 0.15)).add(mul(noise4, 0.25)));
    // Mouse pushes the stripes in the direction away from cursor (subtle)
    dir = dir.add(mul(mouseInfluence, mul(mouseDir.x, 0.2)));

    // Refraction for RGB separation - enhanced with noise
    const refrBase = sub(1.0, bulge);
    const refrR = mul(refrBase.add(mul(0.05, mul(bulge, noise1))), refraction);
    const refrB = mul(mul(1.5, refrBase.add(mul(noise3, 0.02))), refraction);

    // Calculate stripe positions for each channel
    const stripeR = mod(dir.add(refrR), float(1.0));
    const stripeG = mod(dir, float(1.0));
    const stripeB = mod(dir.sub(refrB), float(1.0));

    // Stripe widths
    const thinStrip1Width = mul(cycleWidth, thinStrip1Ratio);

    // Stripe pattern blur (higher = softer edges)
    const blur = float(0.05);

    // Create stripe patterns
    const stripePatternR = smoothstep(float(0), blur, stripeR).mul(
      smoothstep(thinStrip1Width.add(blur), thinStrip1Width.sub(blur), stripeR),
    );
    const stripePatternG = smoothstep(float(0), blur, stripeG).mul(
      smoothstep(thinStrip1Width.add(blur), thinStrip1Width.sub(blur), stripeG),
    );
    const stripePatternB = smoothstep(float(0), blur, stripeB).mul(
      smoothstep(thinStrip1Width.add(blur), thinStrip1Width.sub(blur), stripeB),
    );

    // Use noise to select highlight color from palette
    const colorBlend = add(noise1, mul(noise2, 0.5)).mul(0.5).add(0.5);
    const highlightColor1 = mix(
      orange,
      indigo,
      smoothstep(float(0.3), float(0.7), colorBlend),
    );
    const highlightColor2 = mix(
      indigo,
      pink,
      smoothstep(float(0.4), float(0.8), colorBlend),
    );
    const highlightColor = mix(
      highlightColor1,
      highlightColor2,
      smoothstep(float(0.4), float(0.6), colorBlend),
    );

    // Black base - stripes blend from black to colored highlights
    const black = vec3(0.0, 0.0, 0.0);

    // Each channel: black to highlight color based on stripe pattern
    const r = mix(black.x, highlightColor.x, stripePatternR);
    const g = mix(black.y, highlightColor.y, stripePatternG);
    const b = mix(black.z, highlightColor.z, stripePatternB);

    const liquidColor = vec3(r, g, b);

    // The soft edge defines where the liquid effect blends in
    // softEdge close to 0 = inside the text (show liquid effect)
    // softEdge close to 1 = outside/edge (show original or transparent)

    // Blend liquid chrome effect over the original black base
    // Use inverse of softEdge to control where effect is strongest (inside the letters)
    const effectStrength = sub(1.0, softEdge);

    // Mix: original black base + liquid chrome highlights on top (toned down)
    const finalColor = mix(
      originalColor.rgb,
      liquidColor,
      mul(effectStrength, 0.9),
    );

    return finalColor;
  });

  mat.colorNode = liquidShader();

  // Opacity from the original texture's alpha
  const opacityShader = Fn(() => {
    const uvCoord = uv();
    return mainTex.sample(uvCoord).a;
  });

  mat.opacityNode = opacityShader();

  return mat;
}

/**
 * Creates a reusable line material (white-ish, semi-transparent).
 */
export function createLineMat(): THREE.LineBasicNodeMaterial {
  const mat = new THREE.LineBasicNodeMaterial();
  mat.transparent = true;
  mat.colorNode = color(INDIGO);
  mat.opacity = 0.2;
  mat.depthTest = false;
  mat.depthWrite = false;
  return mat;
}
