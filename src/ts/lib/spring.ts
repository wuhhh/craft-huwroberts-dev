import * as THREE from "three/webgpu";

export interface SpringConfig {
  /**
   * Natural angular frequency ω (rad/s). Higher = faster oscillation/settling.
   * In react-spring terms: ω = √tension.
   */
  omega: number;
  /**
   * Damping ratio ζ. < 1 underdamped (bouncy), 1 critically damped, > 1 overdamped.
   * In react-spring terms: ζ = friction / (2·√tension).
   */
  zeta: number;
}

/**
 * Derive a {@link SpringConfig} from react-spring's `tension`/`friction` pair.
 *
 * The resulting integrator has the same step response as `spring(t, omega, zeta)`
 * in lib/easing.ts — they solve the same second-order ODE — but is integrated
 * frame-by-frame so it stays correct while the target moves continuously
 * (e.g. a letter chasing a moving mouse), which an easing tween cannot do.
 */
export function fromTensionFriction(
  tension: number,
  friction: number,
): SpringConfig {
  return {
    omega: Math.sqrt(tension),
    zeta: friction / (2 * Math.sqrt(tension)),
  };
}

/**
 * Spring-damper integrator for a Vector3.
 *
 * Set a target with {@link setTarget} / {@link setTargetXYZ} and call
 * {@link update} each frame; {@link value} chases the target with spring physics.
 * Uses semi-implicit Euler with sub-stepping (so ω·h stays small) for stability
 * at high stiffness or low frame rates.
 */
export class SpringVec3 {
  readonly value = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  readonly config: SpringConfig;

  constructor(config: SpringConfig, initial?: THREE.Vector3) {
    this.config = config;
    if (initial) {
      this.value.copy(initial);
      this.target.copy(initial);
    }
  }

  setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
  }

  setTargetXYZ(x: number, y: number, z: number): void {
    this.target.set(x, y, z);
  }

  /** Snap to a value, zeroing velocity and target. */
  reset(value: THREE.Vector3): void {
    this.value.copy(value);
    this.target.copy(value);
    this.velocity.set(0, 0, 0);
  }

  /** Advance the simulation by `dt` seconds; returns the current value. */
  update(dt: number): THREE.Vector3 {
    const { omega, zeta } = this.config;
    const k = omega * omega; // stiffness
    const c = 2 * zeta * omega; // damping coefficient

    // Sub-step so ω·h stays small enough for the integrator to remain stable.
    const maxStep = 0.1 / omega;
    const steps = Math.max(1, Math.ceil(dt / maxStep));
    const h = dt / steps;

    const { value, target, velocity } = this;
    for (let i = 0; i < steps; i++) {
      // a = -k·(x − target) − c·v   (semi-implicit Euler)
      velocity.x += (-k * (value.x - target.x) - c * velocity.x) * h;
      velocity.y += (-k * (value.y - target.y) - c * velocity.y) * h;
      velocity.z += (-k * (value.z - target.z) - c * velocity.z) * h;
      value.x += velocity.x * h;
      value.y += velocity.y * h;
      value.z += velocity.z * h;
    }
    return value;
  }
}
