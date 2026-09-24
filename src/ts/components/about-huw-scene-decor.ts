import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";

/**
 * Decor for about-huw-scene. Positions are cqw offsets from the scene centre
 * (the host is the container), placed via left/top because decor-diamond owns
 * its transform and translate.
 */
@customElement("about-huw-scene-decor")
export class AboutHuwSceneDecor extends LitElement {
  static styles?: CSSResultGroup | undefined = css`
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    :host > * {
      position: absolute;
      left: calc(50% + var(--x) - var(--size) / 2);
      top: calc(50% + var(--y) - var(--size) / 2);
      width: var(--size);
      height: var(--size);
    }

    /* decor-diamond is a rotated square, so --size is its visual width / √2 */
    decor-diamond:nth-child(1) {
      --x: -34.5cqw;
      --y: -20.7cqw;
      --size: 1.9cqw;
    }

    decor-diamond:nth-child(2) {
      --x: 32.1cqw;
      --y: -24.7cqw;
      --size: 2.5cqw;
    }

    decor-diamond:nth-child(3) {
      --x: 5.9cqw;
      --y: 3.2cqw;
      --size: 5.2cqw;
      opacity: 0.2;
      filter: blur(0.4cqw);
    }

    decor-diamond:nth-child(4) {
      --x: -19.9cqw;
      --y: 27.9cqw;
      --size: 3.4cqw;
      opacity: 0.2;
      filter: blur(0.4cqw);
    }

    decor-star {
      --x: -36.4cqw;
      --y: 20.1cqw;
      --size: 3.5cqw;
    }

    .dot {
      border-radius: 50%;
    }

    .dot.coral {
      --x: 37cqw;
      --y: 9cqw;
      --size: 1.9cqw;
      background-color: var(--color-coral-red);
    }

    .dot.indigo {
      --x: 29.1cqw;
      --y: 21.7cqw;
      --size: 1.2cqw;
      background-color: var(--color-seabed-indigo);
    }
  `;

  render() {
    return html`
      <decor-diamond color="coral" decorStyle="fill" ?pointerMotion=${true}></decor-diamond>
      <decor-diamond color="indigo" decorStyle="fill" ?pointerMotion=${true}></decor-diamond>
      <decor-diamond color="indigo" decorStyle="outline" ?pointerMotion=${true}></decor-diamond>
      <decor-diamond color="coral" decorStyle="outline" ?pointerMotion=${true}></decor-diamond>
      <decor-star color="indigo" decorStyle="fill" ?pointerMotion=${true}></decor-star>
      <div class="dot coral"></div>
      <div class="dot indigo"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "about-huw-scene-decor": AboutHuwSceneDecor;
  }
}
