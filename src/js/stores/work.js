import Alpine from 'alpinejs';

export default () => ({
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

    const query = `
      query work($id:[QueryArgument]) {
        entry(id:$id) {
          id
          slug
          title
        }
      }
    `;

    try {
      // synthetic delay
      await new Promise((resolve) => setTimeout(resolve, 2300));
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables: { id } })
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
    }
  },
});
