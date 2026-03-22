import { NanoRenderStatefulElement, defineComponent } from '../../swc.js';
import { themeStore } from '../stores.js';
import meta from './component.json' with { type: 'json' };
import styles from './style.css' with { type: 'css' };

/**
 * A card component that changes its appearance based on the global theme store.
 * Any number of these on the page all switch simultaneously when the theme changes.
 */
export class AppCard extends NanoRenderStatefulElement {
    getStyles() { return [styles]; }

    getStores() {
        return { theme: themeStore };
    }

    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }
}

defineComponent(meta, AppCard);
