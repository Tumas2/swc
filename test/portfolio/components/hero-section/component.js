import { NanoRenderStatefulElement } from 'swc';
import localStyles from './style.css' with { type: 'css' };
import meta from './component.json' with { type: 'json' };

/**
 * Hero area with heading, bio, social links, and decorative circle.
 * Demonstrates: static NanoRenderStatefulElement, split-file pattern.
 */
export class HeroSection extends NanoRenderStatefulElement {

    /** @returns {string} */
    getTemplatePath() {
        return new URL('markup.html', import.meta.url).pathname;
    }

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        return [localStyles];
    }
}

customElements.define(meta.name, HeroSection);
