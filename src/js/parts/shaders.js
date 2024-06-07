export const vertex = `
	attribute vec3 position;
	attribute vec2 uv;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;

	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

export const fragment = `
	precision highp float;

  uniform sampler2D uTexture;
  uniform float uTime;
	varying vec2 vUv;

  // Unidirectional twirl
  vec2 twirl(vec2 uv, float distort, float power) {
    vec2 twirlUv = uv - 0.5;
    float a = atan(twirlUv.y, twirlUv.x);
    float r = length(twirlUv);
    a += uTime * .06; // This is how you rotate the whole thing
    a -= pow(r * distort, power);
    twirlUv = vec2(cos(a), sin(a)) * r;
    twirlUv += 0.5;
    return twirlUv;
  }

  // Bidirectional twirl
  vec2 biTwirl(vec2 uv, vec2 center, float strength, float frequency) {
    // Step 1: Calculate the distance from the center
    vec2 offset = uv - center;
    float dist = length(offset);

    // Step 2: Determine the angle for the twirl
    // Alternate the twirl direction every unit distance from the center
    float angle = strength * dist * sin(dist * frequency * 6.2831853); // 2 * PI

    // Step 3: Apply the rotation
    float sinAngle = sin(angle);
    float cosAngle = cos(angle);

    // Rotate the UV coordinates
    vec2 rotatedUV;
    rotatedUV.x = offset.x * cosAngle - offset.y * sinAngle;
    rotatedUV.y = offset.x * sinAngle + offset.y * cosAngle;

    // Step 4: Return the new UV coordinates
    return rotatedUV + center;
  }

  // Ripple effect
  vec2 ripple(vec2 uv) {
    float freq = 32.;
    float speed = 20.;
    float strength = 0.01;

    // from -1 to 1 in x and y
    vec2 cpos = -1.0 + 2.0 * uv;

    // cpos len
    float clen = pow(length(cpos), 1.2); // adjust center point of effect
    uv += (cpos*clen) * sin(clen * freq - (uTime * speed)) * strength;
    return uv;
  }

	void main() {
    vec2 uv = vUv;
    uv = ripple(uv);
    uv = biTwirl(uv, vec2(0.5), .2, 3.5);
    uv = twirl(uv, .1, 8.);
    uv.y += sin(uv.x * 16. + uTime * 1.25) * 0.005;
    uv.x += sin(uv.y * 16. + uTime * 2.5) * 0.005;

    vec4 texture = texture2D(uTexture, uv);

		gl_FragColor = texture;
	}
`;
