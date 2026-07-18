import { LitElement, css, html, nothing, type CSSResultGroup } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

interface ImageAsset {
  url?: string;
  srcset?: string;
  width?: number;
  height?: number;
}

interface VideoAsset {
  url?: string;
  mimeType?: string;
}

interface VideoAttributes {
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}

interface MediaData {
  title?: string;
  backdropColour?: string;
  boxed?: boolean;
  dimPoster?: boolean;
  posterImage?: ImageAsset[];
  video?: VideoAsset[];
  videoAttributes?: VideoAttributes;
}

@customElement("video-player")
export class VideoPlayer extends LitElement {
  @property({
    attribute: "entry",
    type: Object,
    converter: (value: string | null): MediaData | null => {
      if (!value) return null;
      try {
        return JSON.parse(value) as MediaData;
      } catch {
        return null;
      }
    },
  })
  entry: MediaData | null = null;

  @state() private showVideo = false;
  @state() private currentTime = 0;
  @state() private duration = 0;
  @state() private paused = false;
  @state() private stopped = true;

  // Seek scrub state.
  @state() private seek = 0;

  @query("video")
  private videoEl?: HTMLVideoElement;

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      width: 100%;
      max-width: 1160px;
    }

    .backdrop {
      aspect-ratio: 1160 / 680;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @media (max-width: 819px) {
      .backdrop {
        background-color: transparent !important;
      }
    }

    @media (min-width: 640px) {
      .backdrop {
        box-shadow: none;
      }
    }

    .frame {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: var(--radius-lg, 0.5rem);
    }

    @media (min-width: 820px) {
      .backdrop {
        border-radius: var(--radius-2xl, 1rem);
      }

      .boxed.frame {
        aspect-ratio: 960 / 576;
        height: auto;
        max-width: clamp(414px, 960px, 83%);
      }
    }

    .video {
      position: absolute;
      inset: 0;
    }

    video {
      cursor: pointer;
      object-fit: cover;
      object-position: top;
      width: 100%;
      height: 100%;
    }

    .controls {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 30;
      height: 3rem;
      padding-left: 2px;
      padding-right: 1rem;
      display: flex;
      align-items: center;
      opacity: 0;
      transition: opacity 200ms ease-in-out;
    }

    @media (min-width: 834px) {
      .controls {
        height: 72px;
        padding-left: 0.625rem;
        padding-right: 1.5rem;
      }
    }

    .frame:hover .controls,
    .controls:focus-within,
    .controls.is-paused {
      opacity: 1;
    }

    .play-pause,
    .seek {
      appearance: none;
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      color: inherit;
    }

    .play-pause {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .icon {
      width: auto;
      color: var(--color-slate-50);
    }

    .icon--play {
      height: 0.625rem;
    }

    .icon--paused {
      height: 0.5rem;
    }

    @media (min-width: 834px) {
      .icon--play {
        height: 15px;
      }

      .icon--paused {
        height: 0.75rem;
      }
    }

    .seek {
      flex-grow: 1;
      height: 100%;
      margin-left: 3px;
      cursor: pointer;
    }

    @media (min-width: 834px) {
      .seek {
        margin-left: 0.625rem;
      }
    }

    .seek-inner {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
    }

    .track {
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      height: 0.25rem;
      background: var(--color-neutral-900);
    }

    .progress,
    .seek-visual {
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      margin-top: -0.125rem;
      height: 0.25rem;
      transform-origin: left;
    }

    .progress {
      background: var(--color-coral-red);
    }

    .seek-visual {
      background: color-mix(in oklab, var(--color-slate-50) 25%, transparent);
      mix-blend-mode: lighten;
    }

    .time {
      margin-left: 1rem;
      display: flex;
      align-items: center;
      column-gap: 6px;
    }

    @media (min-width: 834px) {
      .time {
        margin-left: 1.5rem;
      }
    }

    .time span {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      line-height: 1;
      color: color-mix(in oklab, var(--color-slate-100) 85%, transparent);
    }

    @media (min-width: 834px) {
      .time span {
        font-size: 0.875rem;
      }
    }

    .underlay {
      pointer-events: none;
      position: absolute;
      left: 0;
      right: -0.125rem;
      bottom: 0;
      z-index: 20;
      height: 3rem;
      background-color: color-mix(
        in oklab,
        var(--color-zinc-900) 90%,
        transparent
      );
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      opacity: 0;
      transform: translateY(1rem);
      transition:
        opacity 200ms ease-in-out,
        transform 200ms ease-in-out;
    }

    @media (min-width: 834px) {
      .underlay {
        height: 72px;
      }
    }

    .frame:hover .underlay,
    .controls:focus-within ~ .underlay,
    .underlay.is-paused {
      opacity: 1;
      transform: translateY(0);
    }

    .poster {
      position: absolute;
      inset: 0;
      cursor: pointer;
      appearance: none;
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      color: inherit;
    }

    .poster img {
      object-fit: cover;
      width: 100%;
      height: 100%;
    }

    .poster-overlay {
      position: absolute;
      inset: 0;
      z-index: 10;
      opacity: 0.2;
      background-color: color-mix(
        in oklab,
        var(--color-zinc-900) 20%,
        transparent
      );
    }

    .poster-btn {
      position: absolute;
      left: 50%;
      top: 50%;
      z-index: 10;
      width: 3rem;
      height: 3rem;
      transform: translate(-50%, -50%);
    }

    @media (min-width: 834px) {
      .poster-btn {
        width: 5rem;
        height: 5rem;
      }
    }

    .poster-btn-bg {
      position: absolute;
      inset: 0;
      background-color: color-mix(
        in oklab,
        var(--color-zinc-900) 90%,
        transparent
      );
      border-radius: 9999px;
      transition:
        background-color 200ms ease-in-out,
        transform 200ms ease-in-out;
    }

    .poster-btn:hover .poster-btn-bg {
      background-color: var(--color-coral-red);
      transform: scale(1.05);
    }

    .poster-btn-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      z-index: 10;
      width: 0.75rem;
      transform: translate(-50%, -50%);
      color: var(--color-white);
      margin-left: 1px;
    }

    @media (min-width: 834px) {
      .poster-btn-icon {
        width: 1.25rem;
        margin-left: 3px;
      }
    }

    .image {
      object-fit: cover;
      width: 100%;
      height: 100%;
    }
  `;

  /** derived state **/

  private get hasVideo(): boolean {
    return Boolean(this.entry?.video?.[0]?.url);
  }

  private get hasPosterImage(): boolean {
    return Boolean(this.entry?.posterImage?.[0]?.url);
  }

  private get videoSources(): VideoAsset[] {
    return this.entry?.video ?? [];
  }

  private get posterImage(): ImageAsset | undefined {
    return this.entry?.posterImage?.[0];
  }

  private get backdropColor(): string {
    return this.entry?.backdropColour ?? "";
  }

  private get dimPoster(): boolean {
    return this.entry?.dimPoster ?? false;
  }

  private get attrs(): Required<VideoAttributes> {
    const v = this.entry?.videoAttributes ?? {};
    return {
      autoplay: v.autoplay ?? false,
      controls: v.controls ?? false,
      loop: v.loop ?? false,
      muted: v.muted ?? false,
      playsInline: v.playsInline ?? (v.autoplay || v.controls) ?? false,
    };
  }

  /** lifecycle **/

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.pause();
  }

  /** video event handlers **/

  private onPlay = () => {
    this.paused = false;
    this.stopped = false;
  };

  private onPause = () => {
    this.paused = true;
  };

  private onDurationChange = () => {
    this.duration = this.videoEl?.duration ?? 0;
  };

  private onTimeUpdate = () => {
    this.currentTime = this.videoEl?.currentTime ?? 0;
  };

  private onEnded = () => {
    this.stopped = true;
  };

  /** controls **/

  private play = () => {
    const v = this.videoEl;
    if (!v) return;
    if (v.readyState && v.played.length > 0 && !v.paused) {
      v.pause();
    } else {
      void v.play();
    }
  };

  private pause = () => {
    const v = this.videoEl;
    if (!v) return;
    v.pause();
    this.paused = true;
  };

  private onPlayPauseClick = (event: MouseEvent) => {
    event.stopPropagation();
    this.play();
    this.showVideo = true;
  };

  private onPosterClick = () => {
    this.showVideo = true;
    this.play();
    // (
    //   this.renderRoot.querySelector(".play-pause") as HTMLButtonElement | null
    // )?.focus();
  };

  private onSeekMouseLeave = () => {
    this.seek = 0;
  };

  private onSeekMouseMove = (event: MouseEvent) => {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    this.seek = Math.min(1, Math.max(0, rect.width ? x / rect.width : 0));
  };

  private onSeekClick = (event: MouseEvent) => {
    event.stopPropagation();
    const v = this.videoEl;
    if (!v) return;
    v.currentTime = this.duration * this.seek;
  };

  private onControlsClick = (event: MouseEvent) => {
    event.stopPropagation();
  };

  private onSeekKey = (event: KeyboardEvent) => {
    const v = this.videoEl;
    if (!v) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      v.currentTime -= 5;
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      v.currentTime += 5;
    }
  };

  private formatTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time - minutes * 60);
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  }

  protected render() {
    const hasVideo = this.hasVideo;

    if (!this.entry || !hasVideo) return null;

    return html`
      <div class="backdrop" style="background-color: ${this.backdropColor}">
        <div class="${this.entry.boxed ? `boxed` : ``} frame">
          ${this.renderVideo()}
        </div>
      </div>
    `;
  }

  private renderVideoControls() {
    if (!this.attrs.controls) return null;

    const showPlayIcon = this.paused || this.stopped;

    return html`
      <div
        aria-label="Video controls"
        class="controls ${this.paused ? "is-paused" : ""}"
        @click=${this.onControlsClick}
      >
        <button
          class="play-pause"
          @click=${this.onPlayPauseClick}
          aria-label="${this.paused ? "Play" : "Pause"}"
        >
          ${showPlayIcon
            ? html`<svg
                class="icon icon--play"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 15 20"
              >
                <path
                  fill="currentColor"
                  d="M15 9.882 0 19.307V.458l15 9.424Z"
                ></path>
              </svg>`
            : html`<svg
                class="icon icon--paused"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 13 14"
              >
                <path fill="currentColor" d="M8 0h5v14H8zM0 0h5v14H0z"></path>
              </svg>`}
        </button>

        <button
          class="seek"
          aria-label="Seek"
          @mouseleave=${this.onSeekMouseLeave}
          @mousemove=${this.onSeekMouseMove}
          @click=${this.onSeekClick}
          @keydown=${this.onSeekKey}
        >
          <span class="seek-inner">
            <span class="track"></span>
            <span
              class="progress"
              style="transform: scaleX(${this.duration
                ? this.currentTime / this.duration
                : 0})"
            ></span>
            <span
              class="seek-visual"
              style="transform: scaleX(${this.seek})"
            ></span>
          </span>
        </button>

        <div class="time">
          <span>${this.formatTime(this.currentTime)}</span>
          <span aria-hidden="true">/</span>
          <span>${this.formatTime(this.duration)}</span>
        </div>
      </div>

      <div class="underlay ${this.paused ? "is-paused" : ""}"></div>
    `;
  }

  private renderVideo() {
    const { autoplay, loop, muted, playsInline } = this.attrs;
    const showOverlay = !autoplay && !this.showVideo;

    return html`
      <div class="video">
        <video
          ?autoplay=${autoplay}
          ?loop=${loop}
          ?muted=${muted}
          ?playsinline=${playsInline}
          @play=${this.onPlay}
          @pause=${this.onPause}
          @durationchange=${this.onDurationChange}
          @timeupdate=${this.onTimeUpdate}
          @ended=${this.onEnded}
          @click=${this.play}
        >
          ${this.videoSources.map(
            // #t=0.1 forces Safari iOS to show the first frame (temporary fix).
            (source) => html`<source
              src=${(source.url ?? "") + "#t=0.1"}
              type=${source.mimeType ?? nothing}
            />`,
          )}
        </video>

        ${this.renderVideoControls()}
      </div>

      ${showOverlay ? this.renderPlayOverlay() : null}
    `;
  }

  private renderPlayOverlay() {
    const posterImage = this.hasPosterImage
      ? html`<img
          src=${this.posterImage?.url ?? ""}
          srcset=${this.posterImage?.srcset ?? nothing}
          alt="${(this.entry?.title ?? "") + " video poster image"}"
          sizes="auto, (min-width: 1728px) 1073px, (min-width: 1024px) 746px, (min-width: 640px) 611px, (max-width: 639px) 90vw"
        /> `
      : nothing;

    const posterOverlay =
      this.hasPosterImage && this.dimPoster
        ? html`<span class="poster-overlay"></span>`
        : nothing;

    return html`
      <button
        class="poster"
        @click=${this.onPosterClick}
        aria-label="Play video"
      >
        ${posterImage} ${posterOverlay}
        <span class="poster-btn">
          <span class="poster-btn-bg"></span>
          <svg
            class="poster-btn-icon"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 15 20"
          >
            <path
              fill="currentColor"
              d="M15 9.882 0 19.307V.458l15 9.424Z"
            ></path>
          </svg>
        </span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "video-player": VideoPlayer;
  }
}
