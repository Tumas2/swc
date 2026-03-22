import { createStore } from '../swc.js';
import meta from '../stores/profile-store.json' with { type: 'json' };

export const profileStore = createStore(meta);
