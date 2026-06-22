const spring = (t: number, omega = 8, zeta = 0.6): number => {
  if (t <= 0) return 0;

  if (zeta < 1) {
    const wd = omega * Math.sqrt(1 - zeta ** 2);
    const decay = Math.exp(-zeta * omega * t);
    return (
      1 -
      decay *
        (Math.cos(wd * t) +
          (zeta / Math.sqrt(1 - zeta ** 2)) * Math.sin(wd * t))
    );
  }

  if (zeta === 1) {
    const decay = Math.exp(-omega * t);
    return 1 - decay * (1 + omega * t);
  }

  const a = omega * (zeta - Math.sqrt(zeta ** 2 - 1));
  const b = omega * (zeta + Math.sqrt(zeta ** 2 - 1));
  return 1 - (b * Math.exp(-a * t) - a * Math.exp(-b * t)) / (b - a);
};

export { spring };
