import { createStore } from '../swc.js';
import meta from '../stores/theme-store.json' with { type: 'json' };

export const themeStore = createStore(meta);
