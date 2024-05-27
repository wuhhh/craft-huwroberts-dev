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
import focus from '@alpinejs/focus';
import intersect from '@alpinejs/intersect';
import ui from '@alpinejs/ui';

import emoji from './parts/emoji';

Alpine.plugin(focus);
Alpine.plugin(intersect);
Alpine.plugin(ui);

Alpine.data('emoji', emoji);

Alpine.start();

/**
 * Accept HMR as per: https://vitejs.dev/guide/api-hmr.html
 */
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("HMR");
  });
}
