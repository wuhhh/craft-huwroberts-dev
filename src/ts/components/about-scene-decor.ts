import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("about-scene-decor")
export class AboutSceneDecor extends LitElement {
  static styles?: CSSResultGroup | undefined = css`
    :host {
      position: absolute;
      inset: 0;
      // z-index: -1;
    }

    decor-diamond:nth-child(1) {
      position: absolute;
      left: 80%;
      top: 6rem;
      width: 1rem;
      height: 1rem;
    }

    decor-diamond:nth-child(2) {
      display: none;
      position: absolute;
      left: 5%;
      top: 64rem;
      width: 1.5rem;
      height: 1.5rem;
    }

    decor-diamond:nth-child(3) {
      display: none;
      position: absolute;
      left: 85%;
      top: 36rem;
      width: 1.5rem;
      height: 1.5rem;
    }

    decor-diamond:nth-child(4) {
      display: hidden;
      position: absolute;
      left: 20%;
      top: 34rem;
      width: 1rem;
      height: 1rem;
    }

    decor-diamond:nth-child(5) {
      display: none;
      position: absolute;
      left: 24%;
      top: 34rem;
      width: 4rem;
      height: 4rem;
      filter: blur(0.5rem);
    }

    @media (min-width: 640px) {
      decor-diamond:nth-child(1) {
        left: 55%;
        top: 6rem;
        width: 1.125rem;
        height: 1.125rem;
      }

      decor-diamond:nth-child(3) {
        display: block;
      }

      decor-diamond:nth-child(4) {
        display: block;
      }
    }

    @media (min-width: 820px) {
      decor-diamond:nth-child(4) {
        left: 7.5%;
        top: 40rem;
      }
    }

    @media (min-width: 1280px) {
      decor-diamond:nth-child(1) {
        width: 1.5rem;
        height: 1.5rem;
      }

      decor-diamond:nth-child(2) {
        display: block;
        left: 20%;
        top: 64rem;
      }

      decor-diamond:nth-child(5) {
        display: block;
      }
    }
  `;

  render() {
    return html`
      <decor-diamond color="indigo" decorStyle="fill" ?pointerMotion=${true}></decor-diamond>
      <decor-diamond color="indigo" decorStyle="outline" ?pointerMotion=${true}></decor-diamond>
      <decor-diamond color="coral" decorStyle="outline" ?pointerMotion=${true}></decor-diamond>
      <decor-diamond color="coral" decorStyle="fill" ?pointerMotion=${true}></decor-diamond>
      <decor-diamond color="coral" decorStyle="outline" ?pointerMotion=${true}></decor-diamond>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "about-scene-decor": AboutSceneDecor;
  }
}
