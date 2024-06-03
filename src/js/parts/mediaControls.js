/**
 * @name mediaControls
 * @desc Media controls for audio and video elements
 * @param {element} element - The element to attach the media controls to
 */

export default ("mediaControls",
(element) => ({
  media: null,
  canPlay: false,
  currentTime: 0,
  duration: 0,
  paused: false,
  playing: false,
  stopped: true,

  // Initialise method outside main init so
  // media can be lazy loaded
  initialiseMediaControls(element) {
    this.media = element;
    this.media.addEventListener("play", () => this.handlePlay());
    this.media.addEventListener("pause", () => this.handlePause());
    this.media.addEventListener("durationchange", () =>
      this.handleDurationChange()
    );
    this.media.addEventListener("canplay", () => this.handleCanPlay());
    this.media.addEventListener("timeupdate", () => this.handleTimeUpdate());
    this.media.addEventListener("ended", () => this.handleEnded());
  },

  play() {
    if (
      this.media.readyState &&
      this.media.played.length > 0 &&
      !this.media.paused
    ) {
      this.media.pause();
    } else {
      this.media.play();
    }
  },

  pause() {
    this.media.pause();
    this.playing = false;
    this.paused = true;
  },

  formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time - minutes * 60);
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  },

  handlePlay() {
    this.playing = true;
    this.paused = false;
    this.stopped = false;

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
    this.duration = this.media.duration;
  },

  handleTimeUpdate() {
    this.currentTime = this.media.currentTime;
  },

  handleEnded() {
    this.stopped = true;
  },
}));
