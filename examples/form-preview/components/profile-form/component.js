import { NanoRenderStatefulElement } from '../../swc.js';
import { profileStore } from '../stores.js';
import meta from './component.json' with { type: 'json' };
import styles from './style.css' with { type: 'css' };

/**
 * Form that writes to profileStore on every input event.
 * The preview component reads the same store and re-renders automatically.
 */
export class ProfileForm extends NanoRenderStatefulElement {
    getStyles() { return [styles]; }

    getStores() {
        return { profile: profileStore };
    }

    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }

    /**
     * Updates a single field in the profile store.
     * Called via oninput on each form field; the field name is read from the element's
     * data-field attribute.
     *
     * @param {Event} event
     */
    updateField(event) {
        const field = event.target.dataset.field;
        if (field) {
            profileStore.setState({ [field]: event.target.value });
        }
    }
}

customElements.define(meta.name, ProfileForm);
