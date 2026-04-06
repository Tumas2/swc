import { NanoRenderStatefulElement } from '../../swc.js';
import { profileStore } from '../stores.js';
import meta from './manifest.json' with { type: 'json' };
import styles from './style.css' with { type: 'css' };

/**
 * A profile card component whose template is split across multiple partial files.
 * The main markup.html includes partials/header.html and partials/bio.html,
 * demonstrating how large templates can be broken into focused, reusable pieces.
 */
export class ProfileCard extends NanoRenderStatefulElement {
    getStyles() { return [styles]; }

    getStores() {
        return { profile: profileStore };
    }

    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }
}

customElements.define(meta.name, ProfileCard);
