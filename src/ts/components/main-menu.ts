import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("main-menu")
export class MainMenu extends LitElement {
  @property({ type: Boolean, attribute: false })
  open = false;

  static styles?: CSSResultGroup | undefined = css`
    :host {
      position: relative;
    }

    button {
      width: 2.75rem;
      height: 2.75rem;
      display: block;
      margin-inline: auto;
      position: relative;
      appearance: none;
      background: none;
      border: 0;
      border-radius: 0;
    }

    button > span {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 0.25rem;
    }

    button > span > span {
      width: 1.375rem;
      height: 0.125rem;
      background: var(--color-seabed-indigo);
      transition: transform 325ms ease;
      transform-origin: left;
    }

    button:hover > span > span:first-child {
      transform: scaleX(0.7);
    }

    button:hover > span > span:nth-child(2) {
      transform: scaleX(0.5);
    }

    button:hover > span > span:nth-child(3) {
      transform: scaleX(0.9);
    }

    nav {
      position: absolute;
      left: 4rem;
      top: 0.4375rem;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      row-gap: 0.125rem;
      color: var(--color-stone);
    }

    ::slotted(a) {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      line-height: var(--text-xs--line-height);
      text-transform: uppercase;
      background-color: var(--color-seabed-indigo);
      padding: 0.375rem 1.5rem !important;
      clip-path: inset(0px 100% 0px 0px);
      transition: clip-path 325ms cubic-bezier(0.785, 0.135, 0.15, 0.86);
      will-change: clip-path;
    }

    ::slotted(a:hover) {
      background-color: var(--color-coral-red);
    }

    ::slotted(a:focus-visible) {
      box-shadow: inset 0 0 0 2px var(--color-coral-red);
    }

    nav.open ::slotted(a) {
      clip-path: inset(0px 0% 0px 0px);
    }
  `;

  closeMenu() {
    this.open = false;
  }

  openMenu() {
    this.open = true;
  }

  toggleMenu() {
    this.open = !this.open;
  }

  handleClickAway = (event: MouseEvent) => {
    console.log(event);
    if (event.target && !this.contains(event.target as Node)) this.closeMenu();
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("click", this.handleClickAway);
  }

  render() {
    return html`
      <button
        @click=${this.toggleMenu}
        aria-label="${this.open ? `Hide` : `Show`} menu"
      >
        <span>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      <nav
        ?inert=${!this.open}
        class="${this.open ? `open` : ``}"
        aria-label="Main"
      >
        <slot></slot>
      </nav>
    `;
  }
}
