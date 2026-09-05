import { createStore } from '../swc.js';
import meta from '../stores/reading-list-store.json' with { type: 'json' };

export const readingListStore = createStore(meta);
