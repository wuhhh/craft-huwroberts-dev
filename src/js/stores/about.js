import Alpine from "alpinejs";
import { slideoverPostUpdate } from "../helpers";

export default () => ({
  endpoint: "/api",
  entry: null,
  language: "en-GB",
  loading: false,
  loadingIndicator: false,
  loadingIndicatorDelay: 250,
  loadingIndicatorTimeout: null,

  async fetch(setLoading = false) {
    if (this.entry) return;

    if (this.loading) {
      this.loadingIndicatorTimeout = setTimeout(() => {
        this.loadingIndicator = true;
      }, this.loadingIndicatorDelay);
    }

    this.language = document.documentElement.lang;

    const query = `
      query about($language: [String]) {
        entry(language: $language) {
          ... on who_Entry {
            id
            title
            heading
            richText
            techTags {
              id
              title
            }
            portraitImage: image @transform(width: 362, height: 362, format: "avif") {
              id
              url
              width
              height
              srcset(sizes: ["362w", "724w", "1174w"])
            }
            landscapeImage: image @transform(width: 588, height: 270, format: "avif") {
              id
              url
              width
              height
              srcset(sizes: ["600w", "800w", "1250w", "1900w"])
            }
          }
        }
      }
    `;

    try {
      // synthetic delay
      // await new Promise((resolve) => setTimeout(resolve, 2300));
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: {
            id: 193,
            language: this.language,
          },
        }),
      });

      const { data } = await response.json();

      if (data.entry) {
        this.entry = data.entry;
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.loading = setLoading ? false : this.loading;
      this.loadingIndicator = false;

      if (this.loadingIndicatorTimeout) {
        clearTimeout(this.loadingIndicatorTimeout);
      }
    }
  },

  /**
   * Set loading
   */
  setLoading(value) {
    if (value) {
      this.loadingStart = Date.now();
    } else {
      this.loadingEnd = Date.now();
    }
    this.loading = value;
  },

  /**
   * Set about active/open
   */
  async show(dispatch = true) {
    try {
      let requireTimeout = false

      if (!this.entry) {
        await this.fetch(true);
      }

      if (Alpine.store("global").slideoverOpen) {
        requireTimeout = true
      }

      setTimeout(() => {
        Alpine.store("global").slideoverTemplate = "about";

        if (!Alpine.store("global").slideoverOpen) {
          this.setLoading(true);
          Alpine.store("global").openSlideover();
        }

        slideoverPostUpdate({
          dispatch,
          url: '/about',
          slug: 'about',
          type: 'about',
        });
      }, requireTimeout ? 500 : 0);
    } catch (error) {
      console.error("Error setting about:", error);
    } finally {
      this.setLoading(false);
    }
  },
});
