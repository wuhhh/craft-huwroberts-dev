const langToggle = () => {
  return {
    toggle() {
      this.$store.global.localisedElements.forEach((el) => {
        const localised = el.dataset.localised;
        el.dataset.localised = el.innerHTML.replace(/[\u00A0-\u9999<>\&]/g, i => '&#'+i.charCodeAt(0)+';');
        el.innerHTML = new DOMParser().parseFromString(localised, 'text/html').body.textContent;
      });
    }
  }

}

export default langToggle;
