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

  getLang() {
    return document.documentElement.lang;
  },

  getLangCode() {
    return this.getLang().split("-")[0];
  },

  getLangRegion() {
    return this.getLang().split("-")[1];
  },

  openSlideover() {
    this.slideoverOpen = true;
  },
});
