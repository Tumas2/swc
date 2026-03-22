import { NanoRenderStatefulElement } from '../../swc.js';
import { articleStore } from '../stores.js';
import meta from './component.json' with { type: 'json' };
import styles from './style.css' with { type: 'css' };

/**
 * A favourite button that syncs across all instances via a shared store.
 * Clicking toggles the liked state and updates the count for every instance on the page.
 */
export class FavButton extends NanoRenderStatefulElement {
    getStyles() { return [styles]; }

    getStores() {
        return { article: articleStore };
    }

    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }

    /**
     * Toggles the liked state and adjusts the like count.
     */
    toggleLike() {
        const { liked, likeCount } = this.state.article;
        articleStore.setState({
            liked: !liked,
            likeCount: liked ? likeCount - 1 : likeCount + 1,
        });
    }
}

customElements.define(meta.name, FavButton);
