import { NanoRenderStatefulElement, createStore, defineComponent } from '../../swc.js';
import meta from './component.json' with { type: 'json' };
import storeJson from '../../stores/post-store.json' with { type: 'json' };

// createStore() picks up server-injected state from window.__SWC_INITIAL_STATE__.post
// automatically. If no server state is present it falls back to the defaults in the JSON.
export const postStore = createStore(storeJson);

/**
 * Renders a blog post. When PHP SSR is used, the initial HTML is already in the DOM as
 * Declarative Shadow DOM — the first JS render is a no-op (morph finds nothing to change).
 */
export class BlogPost extends NanoRenderStatefulElement {
    getStores() {
        return { post: postStore };
    }

    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }
}

defineComponent(meta, BlogPost);
