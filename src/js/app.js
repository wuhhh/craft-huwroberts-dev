/* CSS */
import "@js/parts/css";

/* Non-alpine JS */


/**
 * Alpine JS
*/
import Alpine from 'alpinejs';
import focus from '@alpinejs/focus';
import intersect from '@alpinejs/intersect';
import swipePlugin from "alpinejs-swipe";
import ui from '@alpinejs/ui';

import canvas from './parts/canvas';
import core from './parts/core';
import follower from './parts/follower';
import mediaControls from './parts/mediaControls';

import about from './stores/about';
import global from './stores/global';
import work from './stores/work';

Alpine.plugin(focus);
Alpine.plugin(intersect);
Alpine.plugin(swipePlugin);
Alpine.plugin(ui);

Alpine.data('canvas', canvas);
Alpine.data('core', core);
Alpine.data('follower', follower);
Alpine.data('mediaControls', mediaControls);

Alpine.store('about', about());
Alpine.store('global', global());
Alpine.store('work', work());

Alpine.start();

/**
 * Accept HMR as per: https://vitejs.dev/guide/api-hmr.html
 */
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("HMR");
  });
}
