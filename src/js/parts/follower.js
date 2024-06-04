export default ("follower", (opts) => ({
  followerType: null,
  isHot: false,
  now: 0,
  opts: {
    speed: 10,
  },
  target: null,

  init() {
    if (!this.$refs.move) return
    this.opts = { ...this.opts, ...opts }
    window.requestAnimationFrame((elapsed) => this.frame(elapsed))
  },

  frame() {
    let delta = -this.now + (this.now = Date.now())
    delta *= 0.001
    delta = Math.min(delta, 1/20)
    this.update(delta)
    window.requestAnimationFrame(() => this.frame())
  },

  update(delta) {
    this.moveElement(this.$refs.move, delta * this.opts.speed)
    this.trackMouse();
  },

  moveElement(el, delta) {
    let { e, f } = new DOMMatrix(el.style.transform)
    let [dx, dy] = [this.$store.global.mouseCoords[0] - e, this.$store.global.mouseCoords[1] - f]
    el.style.transform = `translate(${e + delta * dx}px, ${f + delta * dy}px)`
  },

  trackMouse() {
    const elementFromPoint = document.elementFromPoint(this.$store.global.mouseCoords[0], this.$store.global.mouseCoords[1])
    if(elementFromPoint && 'follower' in elementFromPoint.dataset) {
      console.log(elementFromPoint.dataset.follower)
      this.isHot = true
      this.followerType = elementFromPoint.dataset.follower
    }
    else {
      this.isHot = false
      this.followerType = ''
    }
  },
}));
