import * as confetti from  "canvas-confetti";

export default function emoji() {
  return {
    bounds: null,
    confettiCanvas: null,
    confettiInstance: null,
    delta: 0,
    lastTime: 0,
    parent: null,
    parentBounds: null,
    raf: null,
    rotateSpeed: 1,
    rotation: 0,
    t: [0, 0],
    translateSpeed: 24,
    vec: [.5, .4],

    init() {
      this.parent = this.$el.parentElement;
      this.initConfetti();
      this.normalizeVector();

      this.$watch('showSlideover', show => {
        if (show) {
          this.$nextTick(() => {
            this.reset();
            this.start();
            setTimeout(() => this.doConfetti(), 250);
          });
        }
        else {
          // Pause animation
          cancelAnimationFrame(this.raf);
        }
      });
    },

    initConfetti() {
      this.confettiInstance = confetti.create(this.$refs.confettiCanvas, {
        resize: true,
        disableForReducedMotion: true,
        useWorker: false,
      });
    },

    doConfetti() {
      this.confettiInstance({
        particleCount: 100,
        spread: 160
      });
    },

    calcTranslate() {
      this.t[0] += this.vec[0] * (this.delta * this.translateSpeed);
      this.t[1] += this.vec[1] * (this.delta * this.translateSpeed);
    },

    reflectX() {
      this.vec = [this.vec[0] * -1, this.vec[1]];
      this.normalizeVector();
    },

    reflectY() {
      this.vec = [this.vec[0], this.vec[1] * -1];
      this.normalizeVector();
    },

    normalizeVector() {
      const mag = Math.sqrt(this.vec[0] ** 2 + this.vec[1] ** 2);
      this.vec = [this.vec[0] / mag, this.vec[1] / mag];
    },

    animate() {
      this.now = Date.now();
      this.delta = Math.min((this.now - this.lastTime), 25) / 100;
      this.lastTime = this.now;

      this.calcTranslate();
      this.rotation += this.delta * 10;

      // Check if transform is out of bounds
      if (this.bounds.top + this.t[1] <= this.parentBounds.top || this.bounds.bottom + this.t[1] >= this.parentBounds.bottom) {
        this.reflectY();
        this.calcTranslate();
      } else if (this.bounds.left + this.t[0] <= this.parentBounds.left || this.bounds.right + this.t[0] >= this.parentBounds.right) {
        this.reflectX();
        this.calcTranslate();
      }

      // Translate position
      this.$el.style.transform = `matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ${this.t[0]}, ${this.t[1]}, 0, 1) rotate(${this.rotation}deg)`;

      this.raf = window.requestAnimationFrame(() => this.animate());
    },

    handleResize() {
      this.reset();
      this.start();
    },

    reset() {
      cancelAnimationFrame(this.raf);
      this.now = Date.now();
      this.delta = 0;
      this.t = [0, 0];
      this.rotation = 0;
      this.$el.style.transform = `matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1) rotate(0deg)`;
      this.parentBounds = this.parent.getBoundingClientRect();
      this.bounds = this.$el.getBoundingClientRect();
    },

    start() {
      this.lastTime = Date.now();
      this.parentBounds = this.parent.getBoundingClientRect();
      this.bounds = this.$el.getBoundingClientRect();
      this.raf = window.requestAnimationFrame(() => this.animate());
    }
  }
}
