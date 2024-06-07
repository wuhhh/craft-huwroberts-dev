import { Texture } from 'ogl';

/**
 * Loads an image from a URL and returns a promise that resolves to the image.
 * @param {string} imageUrl - The URL of the image to load.
 * @returns {Promise<HTMLImageElement>} - A promise that resolves to the loaded image.
 */
export async function loadImage(imageUrl) {
	const image = new Image();
	image.src = imageUrl;

	// Await for the image to load (waits for onload or onerror)
	await new Promise((resolve, reject) => {
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
	});

	return image;
}

/**
 * Loads an image into a texture and returns a promise that resolves to the texture.
 * @param {string} imageUrl - The URL of the image to load.
 * @param {import("ogl").OGLRenderingContext} gl - The WebGL context to create the texture in.
 */
export async function loadTexture(imageUrl, gl) {
	const texture = new Texture(gl, {
		image: await loadImage(imageUrl)
	});
	texture.minFilter = gl.LINEAR_MIPMAP_LINEAR;
	texture.magFilter = gl.LINEAR;
	texture.premultiplyAlpha = true;

	return texture;
}
