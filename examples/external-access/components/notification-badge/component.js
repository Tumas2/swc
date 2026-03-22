import { NanoRenderStatefulElement } from '../../swc.js';
import { notificationStore } from '../stores.js';
import localStyles from './style.css' with { type: 'css' };
import meta from './component.json' with { type: 'json' };

export class NotificationBadge extends NanoRenderStatefulElement {

    /** @returns {string} */
    getTemplatePath() {
        return new URL('markup.html', import.meta.url).pathname;
    }

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        return [localStyles];
    }

    /** @returns {object} */
    getStores() {
        return { notificationStore };
    }
}

customElements.define(meta.name, NotificationBadge);
