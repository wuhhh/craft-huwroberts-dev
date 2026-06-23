import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("intro-scene-text")
export class IntroSceneText extends LitElement {
  static styles?: CSSResultGroup | undefined = css`
    :host {
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      text-transform: uppercase;
      color: black;
    }

    .labels {
      display: flex;
      justify-content: space-between;
      align-items: space-between;
      flex-direction: row-reverse;
      width: 70%;
      height: 20rem;
    }

    .labels > div:first-child {
      margin-right: 9rem;
      text-align: right;
    }

    .labels > div:last-child {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      margin-left: 2rem;
      text-align: left;
    }

    .labels > div:first-child > div:last-child {
      margin-right: 3rem;
    }

    .labels > div:last-child > div:last-child {
      margin-left: 3rem;
    }
  `;

  render() {
    return html`
      <div class="labels">
        <div>
          <div>Design Conscious</div>
          <div>Full Stack Developer</div>
        </div>
        <div>
          <div>Partnering With Creative Teams</div>
          <div>Building Modern, performant Websites</div>
        </div>
      </div>
    `;
  }
}
