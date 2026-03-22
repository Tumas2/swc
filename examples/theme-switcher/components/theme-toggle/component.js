import { NanoRenderStatefulElement, defineComponent } from '../../swc.js';
import { themeStore } from '../stores.js';
import meta from './component.json' with { type: 'json' };
import styles from './style.css' with { type: 'css' };

/**
 * Toggle button that switches the global theme between light and dark.
 * Every component subscribed to themeStore re-renders when this is clicked.
 */
export class ThemeToggle extends NanoRenderStatefulElement {
    getStyles() { return [styles]; }

    getStores() {
        return { theme: themeStore };
    }

    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }

    /**
     * Flips the theme between 'light' and 'dark'.
     */
    toggle() {
        const next = this.state.theme.theme === 'light' ? 'dark' : 'light';
        themeStore.setState({ theme: next });
    }
}

defineComponent(meta, ThemeToggle);
