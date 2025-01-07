import Alpine from 'alpinejs';

export default () => ({
  endpoint: '/api',
  entry: null,
  language: 'en-GB',
  loading: false,
  loadingIndicator: false,
  loadingIndicatorDelay: 250,
  loadingIndicatorTimeout: null,

  async fetch(setLoading = false) {

    if (this.entry) return;

    if(this.loading) {
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
            portraitImage: image @transform(width: 362, height: 362, format: "webp") {
              id
              url
              width
              height
              srcset(sizes: ["362w", "724w", "1174w"])
            }
            landscapeImage: image @transform(width: 588, height: 270, format: "webp") {
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables: {
            id: 193,
            language: this.language,
          }
        })
      });

      const { data } = await response.json();

      if (data.entry) {
        this.entry = data.entry;
      }

    }
    catch(error) {
      console.error(error);
    }
    finally {
      this.loading = setLoading ? false : this.loading;
      this.loadingIndicator = false;

      if(this.loadingIndicatorTimeout) {
        clearTimeout(this.loadingIndicatorTimeout);
      }
    }
  },

  /**
   * Set loading
   */
  setLoading(value) {
    if(value) {
      this.loadingStart = Date.now();
    }
    else {
      this.loadingEnd = Date.now();
    }
    this.loading = value;
  },

  /**
   * Set about active/open
   */
  show() {
    if(!this.entry) {
      this.fetch(true);
    }

    if(Alpine.store('global').slideoverOpen) {
      // Fix mobile edge case where it's possible to trigger `about` while
      // a work entry is open. Close the drawer, wait, open the drawer
      // with the new template.
      Alpine.store('global').slideoverOpen = false;
      setTimeout(() => {
        Alpine.store('global').slideoverTemplate = 'about';
        Alpine.store('global').slideoverOpen = true;
      }, 500);
    }
    else {
      Alpine.store('global').slideoverTemplate = 'about';
      Alpine.store('global').slideoverOpen = true;
    }
  },
})
