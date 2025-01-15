export default ("slideover", () => ({
  init() {
    this.setStateFromUrl()
    this.addEvents()
  },

  /**
   * Set slideover state from URL on page load
   */
  setStateFromUrl() {
    const pathSegments = window.location.pathname.split("/")
    let workSegment = null
    let workSegmentIndex = pathSegments.findIndex(seg => seg == "work")
    let aboutSegmentIndex = pathSegments.findIndex(seg => seg == "about")

    if(workSegmentIndex > -1 && pathSegments[workSegmentIndex + 1]) {
      workSegment = pathSegments[workSegmentIndex + 1]
    }

    if (workSegment) {
      this.$store.work.setWork(workSegment, false)
    }
    else if (aboutSegmentIndex > -1) {
      this.$store.about.show(false)
    }
    else {
      history.replaceState({ slideover: false, slug: null }, '', '')
    }
  },

  /**
   * Add events
   */
  addEvents() {
    window.addEventListener('popstate', ({state}) => {
      if (state.slideover !== undefined && state.slideover === false) {
        this.$store.global.slideoverOpen = false
      }
      if (state.slug && state.type) {
        if(state.type === 'work') this.$store.work.setWork(state.slug, false)
        if(state.type === 'about') this.$store.about.show(false)
      }
    })
  },

  /**
   * Build URL
   */
  buildPushStateUrl(url) {
    let langCode = this.$store.global.getLangCode()
    langCode = langCode === 'en' ? '' : `/${langCode}`
    const fullUrl = langCode + url

    return fullUrl
  },

  /**
   * Push state
   */
  pushState({ detail }) {
    history.pushState(detail, '', this.buildPushStateUrl(detail.url))
  },

  /**
   * Close the slideover / dialog
   */
  close(dispatch = true) {
    this.$store.global.slideoverOpen = false
    if (dispatch) this.$dispatch('slideover-close')
  },

  /**
   * Event bindings - here for the sake of keeping logic in one place
   */
  bindings: {
    ['@slideover-post-update.window']($event) {
      $event.detail.dispatch && this.pushState($event)
    },
    ['@slideover-close.window']() {
      let langCode = this.$store.global.getLangCode()
      langCode = langCode === 'en' ? '' : langCode
      history.pushState({ slideover: false }, '', `${window.location.origin}/${langCode}`)
    }
  }
}));
