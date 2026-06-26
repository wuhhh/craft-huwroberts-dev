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
      font-size: var(--text-xs);
      text-transform: uppercase;
      color: black;
    }

    .labels {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: space-between;
      width: 72%;
      height: 14rem;
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

    @media (min-width: 1280px) {
      :host {
        font-size: var(--text-sm);
      }

      .labels {
        width: 75%;
        height: 17.5rem;
      }
    }

    @media (min-width: 1536px) {
      .labels {
        width: 70%;
        height: 20rem;
      }

      .labels > div:last-child {
        margin-left: 2rem;
      }

      .labels > div:first-child > div:last-child {
        margin-right: 3rem;
      }

      .labels > div:last-child > div:last-child {
        margin-left: 3rem;
      }
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
