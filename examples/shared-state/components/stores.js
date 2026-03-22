import { createStore } from '../swc.js';
import meta from '../stores/article-store.json' with { type: 'json' };

export const articleStore = createStore(meta);
