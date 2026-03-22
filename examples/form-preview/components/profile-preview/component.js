import { NanoRenderStatefulElement } from '../../swc.js';
import { profileStore } from '../stores.js';
import meta from './component.json' with { type: 'json' };
import styles from './style.css' with { type: 'css' };

/**
 * Read-only preview that reflects the current profileStore state.
 * This component never writes to the store — it only reads and renders.
 */
export class ProfilePreview extends NanoRenderStatefulElement {
    getStyles() { return [styles]; }

    getStores() {
        return { profile: profileStore };
    }

    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }

    computed(state) {
        const name = state.profile?.name || 'Your name';
        const handle = state.profile?.handle || '@handle';
        const bio = state.profile?.bio || 'Your bio will appear here.';
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return { displayName: name, displayHandle: handle, displayBio: bio, initials };
    }
}

customElements.define(meta.name, ProfilePreview);
