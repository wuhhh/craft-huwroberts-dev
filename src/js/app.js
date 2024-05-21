/* CSS */
import "@js/parts/css";

/* Non-alpine JS */
//

/**
 * Alpine JS
 * Best to put it last so that all other potential JS is available
 * when components start getting initialized.
*/
import Alpine from 'alpinejs';
import langToggle from './parts/langToggle';
import localisation from './stores/localisation';

/* Register components */
Alpine.data('langToggle', langToggle);

/* Stores */
Alpine.store('localisation', localisation());

Alpine.start();

/**
 * Accept HMR as per: https://vitejs.dev/guide/api-hmr.html
 */
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("HMR");
  });
}
