/**
 * @name mediaControls
 * @desc Media controls for audio and video elements
 * @param {element} element - The element to attach the media controls to
 */

export default ("mediaControls",
(element) => ({
  element: null,
  canPlay: false,
  currentTime: 0,
  duration: 0,
  paused: false,
  playing: false,

  // Initialise method outside main init so
  // media can be lazy loaded
  initialiseMediaControls(element) {
    this.element = element;
    this.element.addEventListener("play", () => this.handlePlay());
    this.element.addEventListener("pause", () => this.handlePause());
    this.element.addEventListener("durationchange", () =>
      this.handleDurationChange()
    );
    this.element.addEventListener("canplay", () => this.handleCanPlay());
    this.element.addEventListener("timeupdate", () => this.handleTimeUpdate());
    this.element.addEventListener("ended", () => this.handleEnded());
  },

  play() {
    if (
      this.element.readyState &&
      this.element.played.length > 0 &&
      !this.element.paused
    ) {
      this.element.pause();
    } else {
      this.element.play();
    }
  },

  formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time - minutes * 60);
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  },

  handlePlay() {
    this.playing = true;
    this.paused = false;

    this.$dispatch("event-play-started", { id: this.$id("projectMusic") });
  },

  handlePause() {
    this.playing = false;
    this.paused = true;
  },

  handleCanPlay() {
    this.canPlay = true;
  },

  handleDurationChange() {
    this.duration = this.element.duration;
  },

  handleTimeUpdate() {
    this.currentTime = this.element.currentTime;
  },

  handleEnded() {
    // this.currentTime = 0;
  },
}));
