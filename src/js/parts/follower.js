export default ("follower", () => ({
  followerType: null,
  isHot: false,
  now: 0,
  target: null,

  init() {
    window.requestAnimationFrame((elapsed) => this.frame(elapsed))
  },

  frame(elapsed) {
    let delta = -this.now + (this.now = Date.now())
    delta *= 0.01
    this.update(this.now, delta)
    window.requestAnimationFrame((elapsed) => this.frame(elapsed))
  },

  update(now, delta) {
    this.moveElement(this.$refs.primary, delta * 2)
    this.moveElement(this.$refs.secondary, delta)
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
