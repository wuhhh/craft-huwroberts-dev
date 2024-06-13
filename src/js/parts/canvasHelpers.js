/**
 * Calculate distance between two vectors
 */
export function distance(v1, v2) {
  return Math.sqrt(
    Math.pow(v2.x - v1.x, 2) +
      Math.pow(v2.y - v1.y, 2) +
      Math.pow(v2.z - v1.z, 2)
  );
};

/**
 * Get current viewport size in ogl units
 */
export function getCurrentViewport(camera, target = new Vec3(0, 0, 0), size) {
  const { width, height, top, left } = size;
  const aspect = width / height;
  // calc distance from camera to target
  const distance = this.distance(camera.position, target);

  if (camera.type == "orthographic") {
    return {
      width: width / camera.zoom,
      height: height / camera.zoom,
      top,
      left,
      factor: 1,
      distance,
      aspect,
    };
  } else {
    const fov = (camera.fov * Math.PI) / 180; // convert vertical fov to radians
    const h = 2 * Math.tan(fov / 2) * distance; // visible height
    const w = h * (width / height);
    return {
      width: w,
      height: h,
      top,
      left,
      factor: width / w,
      distance,
      aspect,
    };
  }
};
