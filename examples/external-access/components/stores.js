import { createStore } from '../swc.js';
import meta from '../stores/notification-store.json' with { type: 'json' };

export const notificationStore = createStore(meta);
