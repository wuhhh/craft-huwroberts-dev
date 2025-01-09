export default () => ({
  mouseCoords: [0, 0],
  slideoverOpen: false,
  slideoverTemplate: "",

  init() {
    window.addEventListener(
      "mousemove",
      (e) => {
        this.mouseCoords = [e.clientX, e.clientY];
      },
      { passive: true }
    );
  },

  openSlideover() {
    this.slideoverOpen = true;
    window.location.hash = "slideover";
  },
});
