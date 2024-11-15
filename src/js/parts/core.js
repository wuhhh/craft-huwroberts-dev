export default ("core",
() => ({
  lang: document.documentElement.lang,
  translations: [],

  init() {
    this.getTranslations();
  },

  wrapKeyDown(event, fn) {
    const focused = this.$focus.focused();
    const priority = focused ? focused.dataset.keydownPriority : null;

    if (priority) {
      let priorities = priority.split(",");
      if (priorities.includes(event.key)) {
        event.preventDefault();
      }
    } else {
      fn();
    }
  },

  /**
   * getTranslations
   */
  getTranslations() {
    let translationEls = document.querySelectorAll("[data-translations]");
    translationEls.forEach((el) => {
      const lang = el.dataset.translations;
      this.translations[lang] = JSON.parse(el.dataset.translationsEncoded);
    });
  },

  /**
   * t
   * @description Js equivalent of twig's t function
   * @param {string} template
   * @param {array} values
   * @example t('Hello {0}', ['World']) => 'Hello World'
   */
  t(template, values) {
    const translation = this.translations[this.lang] && this.translations[this.lang][template];
    if (translation) {
      return translation.replace(/{(\d+)}/g, (match, number) => {
        return typeof values[number] !== 'undefined' ? values[number] : match;
      });
    }
    return template.replace(/{(\d+)}/g, (match, number) => {
      return typeof values[number] !== 'undefined' ? values[number] : match;
    });
  },
}));
