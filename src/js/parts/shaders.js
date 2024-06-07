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

	void main() {
    // wavy sin sampling
    vec2 uv = vUv;
    uv.y += sin(uv.x * 20. + uTime * 1.25) * 0.01;
    uv.x += sin(uv.y * 50. + uTime * 2.5) * 0.005;

    vec4 texture = texture2D(uTexture, uv);

		gl_FragColor = texture;
	}
`;
