import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";

/**
 * Decor for about-huw-scene, offset from its centre. Placed with left/top
 * because decor-diamond owns transform and translate.
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
      --x: calc(-40.6 * var(--u));
      --y: calc(-24.4 * var(--u));
      --size: calc(2.2 * var(--u));
    }

    decor-diamond:nth-child(2) {
      --x: calc(37.8 * var(--u));
      --y: calc(-29.1 * var(--u));
      --size: calc(2.9 * var(--u));
    }

    decor-diamond:nth-child(3) {
      --x: calc(7 * var(--u));
      --y: calc(3.8 * var(--u));
      --size: calc(6.1 * var(--u));
      opacity: 0.2;
      filter: blur(calc(0.5 * var(--u)));
    }

    decor-diamond:nth-child(4) {
      --x: calc(-23.4 * var(--u));
      --y: calc(32.9 * var(--u));
      --size: calc(4 * var(--u));
      opacity: 0.2;
      filter: blur(calc(0.5 * var(--u)));
    }

    decor-star {
      --x: calc(-42.9 * var(--u));
      --y: calc(23.7 * var(--u));
      --size: calc(4.1 * var(--u));
    }

    .dot {
      border-radius: 50%;
    }

    .dot.coral {
      --x: calc(43.6 * var(--u));
      --y: calc(10.6 * var(--u));
      --size: calc(2.2 * var(--u));
      background-color: var(--color-coral-red);
    }

    .dot.indigo {
      --x: calc(34.3 * var(--u));
      --y: calc(25.6 * var(--u));
      --size: calc(1.4 * var(--u));
      background-color: var(--color-seabed-indigo);
    }

    /* Stacked */
    @container (aspect-ratio < 0.9) {
      decor-diamond:nth-child(1) {
        --x: -32cqw;
        --y: -32cqh;
        --size: 3cqw;
      }

      decor-diamond:nth-child(2) {
        --x: -26cqw;
        --y: 44cqh;
        --size: 4cqw;
      }

      decor-diamond:nth-child(3),
      decor-diamond:nth-child(4) {
        display: none;
      }

      decor-star {
        --x: 32cqw;
        --y: 35cqh;
        --size: 6cqw;
      }

      .dot.coral {
        --x: 40cqw;
        --y: -20cqh;
        --size: 3cqw;
      }

      .dot.indigo {
        --x: -20cqw;
        --y: -41cqh;
        --size: 2cqw;
      }
    }

    /* Phones */
    @media (max-width: 639px) {
      .dot.coral {
        --y: -24cqh;
      }
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
