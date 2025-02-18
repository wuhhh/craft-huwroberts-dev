import Alpine from "alpinejs";
import { slideoverPostUpdate } from "../helpers";

export default () => ({
  endpoint: "/api",
  entries: [],
  language: "en-GB",
  loading: false,
  loadingIndicator: false,
  loadingIndicatorDelay: 0,
  loadingIndicatorTimeout: null,
  selected: null,

  /**
   * Fetch work entry by slug
   */
  async fetchWork(slug, setLoading = false) {
    if (this.getEntryBySlug(slug)) return;

    this.loading = setLoading === true ? true : this.loading;
    this.setLoadingIndicator(setLoading);

    this.language = document.documentElement.lang;

    const query = `
      query work($slug: [String], $language: [String]) {
        entry(slug: $slug, section: "work", language: $language) {
          ... on work_Entry {
            id
            backdropColour
            liveUrl
            slug
            summary
            title
            url
            agency {
              id
              title
            }
            year
            workType {
              id
              slug
              title
            }
            cardImage @transform(width: 480, height: 288, format: "avif", immediately: false) {
              id
              url
              width
              height
              srcset(sizes: ["600w", "800w", "1250w", "1900w"])
            }
            video {
              url
              mimeType
            }
            techTags {
              id
              title
            }
            next(section: "work") {
              id
              slug
              title
            }
            prev(section: "work") {
              id
              slug
              title
            }
          }
        }
      }
    `;

    try {
      // synthetic delay
      // await new Promise((resolve) => setTimeout(resolve, 250));

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: {
            slug,
            language: this.language,
          },
        }),
      });

      const { data } = await response.json();

      if (data.entry) {
        this.entries.push(data.entry);
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.setLoading(false);
      this.setLoadingIndicator(false);
    }
  },

  /**
   * Get entry by ID
   */
  getEntryBySlug(slug) {
    return this.entries.find((entry) => entry.slug == slug);
  },

  /**
   * Set selected work
   */
  async setWork(slug, dispatch = true) {
    try {
      this.setLoading(true);
      this.setLoadingIndicator(true);

      // synthetic delay when navigating between work
      if (Alpine.store("global").slideoverOpen) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      Alpine.store("global").slideoverTemplate = "work";

      if (!Alpine.store("global").slideoverOpen) {
        if (this.selected?.slug !== slug) {
          this.selected = null;
        }
        Alpine.store("global").openSlideover();
      }

      if (!this.getEntryBySlug(slug)) {
        await this.fetchWork(slug, true);
      }

      if (this.selected?.slug !== slug) {
        this.selected = this.getEntryBySlug(slug);
        slideoverPostUpdate({
          dispatch,
          url: `/work/${this.selected.slug}`,
          slug: this.selected.slug,
          type: "work",
        });
      }
    } catch (error) {
      console.error("Error setting work:", error);
    } finally {
      this.setLoading(false);
      this.setLoadingIndicator(false);
    }
  },

  /**
   * hasPrev
   */
  hasPrev() {
    return this.selected?.prev !== null;
  },

  /**
   * hasNext
   */
  hasNext() {
    return this.selected?.next !== null;
  },

  /**
   * next
   */
  async next() {
    if (this.selected && this.hasNext()) {
      await this.setWork(this.selected.next.slug);
    }
  },

  /**
   * prev
   */
  async prev() {
    if (this.selected && this.hasPrev()) {
      await this.setWork(this.selected.prev.slug);
    }
  },

  /**
   * Fetch prev
   */
  fetchPrev() {
    if (this.selected && this.hasPrev()) {
      this.fetchWork(this.selected.prev.slug);
    }
  },

  /**
   * Fetch next
   */
  fetchNext() {
    if (this.selected && this.hasNext()) {
      this.fetchWork(this.selected.next.slug);
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
   * Set loading indicator
   */
  setLoadingIndicator(value) {
    if (value) {
      this.loadingIndicatorTimeout = setTimeout(() => {
        this.loadingIndicator = true;
      }, this.loadingIndicatorDelay);
    } else {
      this.loadingIndicator = false;
      if (this.loadingIndicatorTimeout) {
        clearTimeout(this.loadingIndicatorTimeout);
      }
    }
  },

  /**
   * Toggle loading
   */
  toggleLoading() {
    this.setLoading(!this.loading);
    this.loadingIndicator = this.loading;
  },

  /**
   * loadingDelayed
   */
  loadingDelayed() {
    return (
      this.loading &&
      Date.now() - this.loadingStart > this.loadingIndicatorDelay
    );
  },
});
