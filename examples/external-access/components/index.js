import { exposeGlobally, getStore, getAllStores, defineComponents } from '../swc.js';
import './stores.js';

defineComponents({
    'notification-badge': () => import('./notification-badge/component.js'),
});

exposeGlobally({ getStore, getAllStores });
