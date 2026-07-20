import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("intro-scene-decor")
export class IntroSceneDecor extends LitElement {
  static styles?: CSSResultGroup | undefined = css`
    :host {
      position: absolute;
      inset: 0;
      container-type: size;
    }

    decor-diamond:nth-child(1) {
      position: absolute;
      left: 55%;
      top: 10%;
      width: 1.5rem;
      height: 1.5rem;
    }

    decor-diamond:nth-child(2) {
      position: absolute;
      left: 5%;
      top: 50%;
      width: 1.5rem;
      height: 1.5rem;
    }

    decor-diamond:nth-child(3) {
      position: absolute;
      left: 90%;
      top: 75%;
      width: 1.5rem;
      height: 1.5rem;
    }

    decor-diamond:nth-child(4) {
      position: absolute;
      left: 40%;
      top: 85%;
      width: 1.125rem;
      height: 1.125rem;
    }

    decor-star {
      position: absolute;
      left: 89%;
      top: 43%;
      width: 2rem;
      height: 2rem;
      color: var(--color-seabed-indigo);
    }

    @container (orientation: portrait) {
      decor-diamond:nth-child(2),
      decor-diamond:nth-child(3) {
        display: none;
      }

      decor-diamond:nth-child(1) {
        left: 72%;
        top: 80%;
        width: 1rem;
        height: 1rem;
      }

      decor-diamond:nth-child(4) {
        left: 10%;
        top: 30%;
        width: 1rem;
        height: 1rem;
      }

      decor-star {
        left: 36%;
        top: 15%;
      }
    }

    @media (min-width: 1728px) {
      decor-star {
        width: 2.5rem;
        height: 2.5rem;
      }
    }
  `;

  render() {
    return html`
      <decor-diamond color="coral" decorStyle="fill" ?pointerMotion=${true}></decor-diamond>
      <decor-diamond color="indigo" decorStyle="outline" ?pointerMotion=${true}></decor-diamond>
      <decor-diamond color="coral" decorStyle="outline" ?pointerMotion=${true}></decor-diamond>
      <decor-diamond color="indigo" decorStyle="fill" ?pointerMotion=${true}></decor-diamond>
      <decor-star color="coral" decorStyle="fill" ?spin=${true}></decor-star>
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "intro-scene-decor": IntroSceneDecor;
  }
}
