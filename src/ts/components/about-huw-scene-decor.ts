import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";

/**
 * Decor for about-huw-scene. Positions are cqh offsets from the scene centre
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
      --x: -40.6cqh;
      --y: -24.4cqh;
      --size: 2.2cqh;
    }

    decor-diamond:nth-child(2) {
      --x: 37.8cqh;
      --y: -29.1cqh;
      --size: 2.9cqh;
    }

    decor-diamond:nth-child(3) {
      --x: 7cqh;
      --y: 3.8cqh;
      --size: 6.1cqh;
      opacity: 0.2;
      filter: blur(0.5cqh);
    }

    decor-diamond:nth-child(4) {
      --x: -23.4cqh;
      --y: 32.9cqh;
      --size: 4cqh;
      opacity: 0.2;
      filter: blur(0.5cqh);
    }

    decor-star {
      --x: -42.9cqh;
      --y: 23.7cqh;
      --size: 4.1cqh;
    }

    .dot {
      border-radius: 50%;
    }

    .dot.coral {
      --x: 43.6cqh;
      --y: 10.6cqh;
      --size: 2.2cqh;
      background-color: var(--color-coral-red);
    }

    .dot.indigo {
      --x: 34.3cqh;
      --y: 25.6cqh;
      --size: 1.4cqh;
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
