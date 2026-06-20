import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/**
 * A component that rotates through a pool of text/emoji at a specified interval
 *
 * @slot - This element has no slots
 * @csspart text - The text/emoji display element
 *
 * @example
 * <emoji-rotator></emoji-rotator>
 * <emoji-rotator pool='["🎉", "🙌", "🚀"]' interval="500"></emoji-rotator>
 */
@customElement("emoji-rotator")
export class EmojiRotator extends LitElement {
  /**
   * Pool of text/emoji to rotate through
   */
  @property({ type: Array })
  pool: string[] = ["🎉", "🙌", "🚀", "⚡", "🔥", "🫠"];

  /**
   * Interval duration in milliseconds
   */
  @property({ type: Number })
  interval: number = 1000;

  /**
   * Current text being displayed
   */
  @state()
  private text: string = "...";

  private intervalId?: number;

  /**
   * Start the rotation when component is added to DOM
   */
  connectedCallback() {
    super.connectedCallback();
    this.startRotation();
  }

  /**
   * Clean up interval when component is removed from DOM
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopRotation();
  }

  /**
   * Restart rotation if interval or pool changes
   */
  updated(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has("interval") ||
      changedProperties.has("pool")
    ) {
      this.stopRotation();
      this.startRotation();
    }
  }

  private startRotation() {
    // Set initial random value
    this.text = this.getRandomItem();

    // Start interval
    this.intervalId = window.setInterval(() => {
      this.text = this.getRandomItem();
    }, this.interval);
  }

  private stopRotation() {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private getRandomItem(): string {
    return this.pool[Math.floor(Math.random() * this.pool.length)];
  }

  render() {
    return html`<span part="text">${this.text}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "emoji-rotator": EmojiRotator;
  }
}
