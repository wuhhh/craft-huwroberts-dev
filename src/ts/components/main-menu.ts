import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("main-menu")
export class MainMenu extends LitElement {
  @property({ type: Boolean, attribute: false })
  open = false;

  static styles?: CSSResultGroup | undefined = css`
    #menu {
      position: relative;
    }

    button {
      appearance: none;
      background: none;
      border: 0;
      border-radius: 0;
    }

    button.toggle {
      width: 2.875rem;
      height: 2.875rem;
      display: block;
      margin-inline: auto;
      position: relative;
    }

    button.toggle > span {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 0.25rem;
    }

    button.toggle > span > span {
      width: 1.375rem;
      height: 0.125rem;
      background: var(--color-seabed-indigo);
      transition: transform 325ms ease;
      transform-origin: left;
    }

    button.toggle:hover > span > span:first-child {
      transform: scaleX(0.7);
    }

    button.toggle:hover > span > span:nth-child(2) {
      transform: scaleX(0.5);
    }

    button.toggle:hover > span > span:nth-child(3) {
      transform: scaleX(0.9);
    }

    button.close {
      display: grid;
      place-content: center;
      position: fixed;
      top: 0.75rem;
      right: 0.75rem;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 9999px;
      background-color: var(--color-stone);
      color: var(--color-seabed-indigo);
      opacity: 0;
      pointer-events: none;
      transition: opacity 325ms ease;
      transition-delay: 125ms;
    }

    #menu.open button.close {
      pointer-events: auto;
    }

    nav {
      position: fixed;
      top: 0;
      bottom: 0;
      right: 0;
      width: clamp(260px, 400px, 66vw);
      background-color: var(--color-seabed-indigo);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      row-gap: 1rem;
      padding: 0.75rem 1.5rem;
      opacity: 0;
      transform: translateX(2rem);
      transition:
        opacity 325ms ease,
        transform 500ms ease;
    }

    nav a:first-child {
      margin-top: 4.5rem;
    }

    #menu.open nav {
      opacity: 1;
      transform: translateX(0);
    }

    #menu.open button.close {
      opacity: 1;
      transition-delay: 0;
    }

    a {
      color: var(--color-stone);
      font-family: var(--font-mono);
      font-size: 1.25rem;
      text-transform: uppercase;
      clip-path: inset(0px 100% 0px 0px);
      transition: clip-path 325ms cubic-bezier(0.785, 0.135, 0.15, 0.86);
      will-change: clip-path;
      text-decoration: none;
    }

    #menu.open a {
      clip-path: inset(0px 0% 0px 0px);
    }

    @media (min-width: 640px) {
      #menu a:first-child {
        margin-top: 0;
      }

      button.close {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      nav {
        position: absolute;
        left: 4rem;
        top: 0.4375rem;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        row-gap: 0.125rem;

        padding: 0;
        background-color: transparent;
        opacity: 1;
        transform: none;
        transition: none;
      }

      a {
        display: inline-block;
        font-size: var(--text-xs);
        line-height: var(--text-xs--line-height);
        background-color: var(--color-seabed-indigo);
        padding: 0.375rem 1.5rem !important;
      }

      a:hover {
        background-color: var(--color-coral-red);
      }

      a:focus-visible {
        box-shadow: inset 0 0 0 2px var(--color-coral-red);
      }
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
    if (event.target && !this.contains(event.target as Node)) this.closeMenu();
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("click", this.handleClickAway);
  }

  render() {
    return html`
      <div id="menu" class="${this.open ? `open` : ``}">
        <!-- desktop menu toggle -->
        <button
          class="toggle"
          @click=${this.toggleMenu}
          aria-label="${this.open ? `Hide` : `Show`} menu"
        >
          <span>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        <!-- nav -->
        <nav ?inert=${!this.open} aria-label="Main">
          <a href="/">Home</a>
          <a href="/work" style="transition-delay: 30ms">Portfolio</a>
          <a href="/about" style="transition-delay: 60ms">About</a>
          <a href="/journal" style="transition-delay: 90ms">Journal</a>
          <a href="/contact" style="transition-delay: 120ms">Contact</a>
        </nav>
        <!-- mobile menu close -->
        <button class="close" @click=${this.closeMenu}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            fill="none"
            viewBox="0 0 17 17"
          >
            <path
              fill="currentColor"
              d="M16.97 1.414 9.9 8.485l7.07 7.072-1.413 1.414-7.072-7.072-7.07 7.072L0 15.557l7.071-7.072L0 1.415 1.414 0l7.071 7.071L15.557 0z"
            />
          </svg>
        </button>
      </div>
    `;
  }
}
