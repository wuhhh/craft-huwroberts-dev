import Alpine from 'alpinejs';

export default () => ({
  endpoint: '/api',
  entries: [],
  language: 'en-GB',
  loading: false,
  loadingIndicator: false,
  loadingIndicatorDelay: 250,
  loadingIndicatorTimeout: null,
  selected : null,

  /**
   * Fetch work entry by id
   */
  async fetchWork(id, setSelected = false, setLoading = false) {

    if(this.getEntryById(id)) return;

    this.loading = setLoading === true ? true : this.loading;

    if(this.loading) {
      this.loadingIndicatorTimeout = setTimeout(() => {
        this.loadingIndicator = true;
      }, this.loadingIndicatorDelay);
    }

    this.language = document.documentElement.lang;

    const query = `
      query work($id: [QueryArgument], $language: [String]) {
        entry(id: $id, language: $language) {
          ... on work_Entry {
            id
            backdropColour
            liveUrl
            slug
            summary
            title
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
            cardImage @transform(width: 480, height: 288, format: "webp") {
              id
              url
              width
              height
              srcset(sizes: ["600w", "800w", "1250w", "1900w"])
              blurhashUri: url @assetToBlurHash
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
      // await new Promise((resolve) => setTimeout(resolve, 2300));
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables: {
            id,
            language: this.language,
          }
        })
      });

      const { data } = await response.json();

      if(data.entry) {
        this.entries.push(data.entry);
        if(setSelected) {
          this.selected = data.entry;
        }
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
   * Get entry by ID
   */
  getEntryById(id) {
    return this.entries.find(entry => entry.id == id);
  },

  /**
   * Set selected work
   */
  setWork(id) {
    Alpine.store('global').slideoverTemplate = 'work';

    if(!Alpine.store('global').slideoverOpen) {
      Alpine.store('global').slideoverOpen = true;
    }

    if(!this.getEntryById(id)) {
      this.fetchWork(id, true, true);
    }
    else {
      this.selected = this.getEntryById(id);
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
  next() {
    if(this.selected && this.hasNext()) {
      this.setWork(this.selected.next.id);
    }
  },

  /**
   * prev
   */
  prev() {
    if(this.selected && this.hasPrev()) {
      this.setWork(this.selected.prev.id);
    }
  },

  /**
   * Fetch prev
   */
  fetchPrev() {
    if(this.selected && this.hasPrev()) {
      this.fetchWork(this.selected.prev.id);
    }
  },

  /**
   * Fetch next
   */
  fetchNext() {
    if(this.selected && this.hasNext()) {
      this.fetchWork(this.selected.next.id);
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
    return this.loading && (Date.now() - this.loadingStart) > this.loadingIndicatorDelay;
  },
});
