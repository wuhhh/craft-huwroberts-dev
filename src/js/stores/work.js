import Alpine from 'alpinejs';

export default () => ({
  language: 'en-GB',
  loading: false,
  endpoint: '/api',
  entries: [],
  selected : null,
  selectedId: null,

  /**
   * Fetch work entry by id
   */
  async fetchWork(id, setSelected = false, setLoading = false) {

    if(this.getEntryById(id)) return;

    this.loading = setLoading;
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
          this.selectedId = data.entry.id;
          this.selected = data.entry;
        }
      }
    }
    catch(error) {
      console.error(error);
    }
    finally {
      this.loading = setLoading ? false : this.loading;
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
    if(!Alpine.store('global').slideoverOpen) {
      Alpine.store('global').slideoverOpen = true;
    }

    Alpine.store('global').slideoverTemplate = 'work';

    if(!this.getEntryById(id)) {
      this.fetchWork(id, true, true);
    }
    else {
      this.selectedId = id;
      this.selected = this.getEntryById(id);
      console.log('setWork', this.selected);

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
});
