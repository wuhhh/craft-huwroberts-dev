import * as confetti from  "canvas-confetti";

export default function emoji() {
  return {
    bounds: null,
    confettiCanvas: null,
    confettiInstance: null,
    delta: 0,
    hasRun: false,
    lastTime: 0,
    parent: null,
    parentBounds: null,
    raf: null,
    rotateSpeed: 1,
    rotation: 0,
    t: [0, 0],
    translateSpeed: 24,
    vec: [0, 0],

    init() {
      this.parent = this.$el.parentElement;
      this.initConfetti();

      this.$watch('showSlideover', show => {
        if (show && !this.hasRun) {
          // First run
          this.$nextTick(() => {
            this.run();
            this.doConfetti();
          });

        }
        else if (show && this.hasRun) {
          // Resume animation
          this.lastTime = Date.now();
          this.raf = window.requestAnimationFrame(() => this.animate());
        }
        else {
          // Pause animation
          window.cancelAnimationFrame(this.raf);
        }
      });
    },

    initConfetti() {
      this.confettiCanvas = document.createElement('canvas');
      this.confettiCanvas.style.position = 'absolute';
      this.confettiCanvas.style.top = 0;
      this.confettiCanvas.style.left = 0;
      this.confettiCanvas.style.width = '100%';
      this.confettiCanvas.style.height = '100%';
      this.confettiCanvas.style.pointerEvents = 'none';
      this.confettiCanvas.style.backgroundColor = 'transparent';

      this.parent.appendChild(this.confettiCanvas);

      this.confettiInstance = confetti.create(this.confettiCanvas, {
        resize: true,
        useWorker: true
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

    handleResize() {
      cancelAnimationFrame(this.raf);
      this.run();
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
      this.delta = (this.now - this.lastTime) / 100;
      this.lastTime = this.now;

      this.calcTranslate();
      this.rotation += this.rotateSpeed;

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

    run() {
      // Set initial values
      this.lastTime = Date.now();
      this.delta = 0;
      this.vec = [Math.random() * 2 - 1, Math.random() * 2 - 1];
      this.normalizeVector();
      this.t = [0, 0];
      this.rotation = 0;

      this.parentBounds = this.parent.getBoundingClientRect();
      this.bounds = this.$el.getBoundingClientRect();

      this.raf = window.requestAnimationFrame(() => this.animate());
      this.hasRun = true;
    }
  }
}
