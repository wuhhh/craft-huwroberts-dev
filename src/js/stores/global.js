const global = () => {
  return {
    langs: ["en-GB", "cy-GB"],
    lang: document.documentElement.lang,
    localisedElements: [],

    init() {
      this.localisedElements = document.querySelectorAll("[data-localised]");
    },

    toggleLang() {
      this.localisedElements.forEach((el) => {
        const localised = el.dataset.localised;
        el.dataset.localised = el.innerHTML.replace(
          /[\u00A0-\u9999<>\&]/g,
          (i) => "&#" + i.charCodeAt(0) + ";"
        );
        el.innerHTML = new DOMParser().parseFromString(
          localised,
          "text/html"
        ).body.textContent;
      });

      // Sets the new lang
      this.lang = this.lang === "en-GB" ? "cy-GB" : "en-GB";


      // Rewrite the URL
      let uri;

      if (this.lang === "cy-GB") {
        uri = '/cy' + window.location.pathname;
      }
      else {
        const regex = /\/cy\//y;
        uri = window.location.pathname.replace(regex, '/');
      }

      window.history.replaceState(null, "", uri);
    },
  };
}

export default global;
