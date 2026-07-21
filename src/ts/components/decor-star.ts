import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { PointerMotionController } from "../controllers/pointer-motion-controller";

@customElement("decor-star")
export class DecorStar extends LitElement {
  @property({ type: Boolean })
  spin = false;
  @property({ type: String })
  color: "coral" | "indigo" = "coral";
  @property({ type: String })
  decorStyle: "outline" | "fill" = "fill";
  @property({ type: Boolean })
  pointerMotion = false;

  private pm?: PointerMotionController;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.pm) this.pm = new PointerMotionController(this);
  }

  static styles?: CSSResultGroup | undefined = css`
    :host {
      translate: var(--pm-x, 0px) var(--pm-y, 0px);
    }
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    .spin {
      animation: spin 5s linear infinite;
    }
    .coral {
      color: var(--color-coral-red);
    }
    .indigo {
      color: var(--color-seabed-indigo);
    }
  `;

  render() {
    const pathAttrs =
      this.decorStyle === "fill"
        ? { fill: "currentColor", stroke: "none" }
        : { fill: "none", stroke: "currentColor", "stroke-width": "1" };

    return html`
      <svg
        class=${classMap({
          spin: this.spin,
          coral: this.color === "coral",
          indigo: this.color === "indigo",
        })}
        viewBox="0 0 53 53"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M26.5 0L30.0391 13.2919L39.75 3.55033L36.169 16.831L49.4497 13.25L39.7081 22.9609L53 26.5L39.7081 30.0391L49.4497 39.75L36.169 36.169L39.75 49.4497L30.0391 39.7081L26.5 53L22.9609 39.7081L13.25 49.4497L16.831 36.169L3.55033 39.75L13.2919 30.0391L0 26.5L13.2919 22.9609L3.55033 13.25L16.831 16.831L13.25 3.55033L22.9609 13.2919L26.5 0Z"
          fill=${pathAttrs.fill}
          stroke=${pathAttrs.stroke}
          stroke-width=${pathAttrs["stroke-width"] ?? ""}
        />
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "decor-star": DecorStar;
  }
}
