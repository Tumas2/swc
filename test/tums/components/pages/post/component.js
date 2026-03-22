import { NanoRenderStatefulElement, StateStore } from '../../../swc.js';

export const postStore = new StateStore({
    loading: true,
    post: null
});


export class PostPage extends NanoRenderStatefulElement {
    getTemplatePath() {
        return new URL('markup.html', import.meta.url).pathname;
    }

    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; max-width: 800px; margin: 0 auto; }
            .back-link {
                display: inline-block;
                margin-bottom: 2rem;
                color: #6b7280;
                font-weight: 500;
            }
            article {
                background: #fff;
                padding: 2rem;
                border: 1px solid var(--border-color);
                border-radius: 0.5rem;
            }
            h1 {
                font-size: 2.5rem;
                color: #111827;
                margin-bottom: 0.5rem;
            }
            .meta {
                color: #6b7280;
                margin-bottom: 2rem;
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 1rem;
            }
            .content {
                font-size: 1.125rem;
                line-height: 1.8;
                color: #374151;
            }
            /* WP Content Styles */
            .content h2 { margin-top: 2rem; font-size: 1.8rem; }
            .content h3 { margin-top: 1.5rem; font-size: 1.5rem; }
            .content p { margin-bottom: 1.5rem; }
            .content pre {
                background: #f3f4f6;
                padding: 1rem;
                border-radius: 0.5rem;
                overflow-x: auto;
            }
            .content img {
                border-radius: 0.5rem;
                margin: 1rem 0;
            }
        `);
        return [sheet];
    }

    getStores() {
        return {
            postStore
        }
    }

    onMount() {
        const { loading } = postStore.getState();
        if (loading) {
            this.fetchPost();
        }
    }

    computed(state) {
        const ssrScript = this.querySelector('#server-data-post');
        if (ssrScript) {
            try {
                const post = JSON.parse(ssrScript.textContent);
                return { postStore: { post, loading: false } }
            } catch (e) {
                console.log("Failed to parse SSR data", e);
            }
        }
        return {};
    }

    async fetchPost() {

        const ssrScript = this.querySelector('#server-data-post');
        if (ssrScript) {
            try {
                const post = JSON.parse(ssrScript.textContent);
                postStore.setState({ postStore: { post, loading: false } })
                return;
            } catch (e) {
                console.log("Failed to parse SSR data", e);
            }
        }

        // Extract slug from URL. Simple approach for now.
        const pathParts = window.location.pathname.split('/');
        const slug = pathParts[pathParts.length - 1]; // Assumes /blog/:slug

        if (!slug) return;

        try {
            const res = await fetch(`https://api.tums.se/wp-json/wp/v2/posts?slug=${slug}&_fields=id,title,content,date`);
            const data = await res.json();
            if (data && data.length > 0) {
                postStore.setState({ post: data[0], loading: false });
            } else {
                postStore.setState({ loading: false, error: "Post not found" });
            }
        } catch (err) {
            console.error(err);
            postStore.setState({ loading: false, error: "Failed to load" });
        }
    }

}

customElements.define('post-page', PostPage);
