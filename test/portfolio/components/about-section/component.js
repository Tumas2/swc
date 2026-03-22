import { NanoRenderStatefulElement, defineComponent } from 'swc';
import localStyles from './style.css' with { type: 'css' };
import meta from './component.json' with { type: 'json' };

/**
 * Layout shell for the About section.
 * Demonstrates: named <slot> projection, split-file pattern.
 */
export class AboutSection extends NanoRenderStatefulElement {

    /** @returns {string} */
    getTemplatePath() {
        return new URL('markup.html', import.meta.url).pathname;
    }

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        return [localStyles];
    }
}

defineComponent(meta, AboutSection);
