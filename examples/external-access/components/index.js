import { exposeGlobally, getStore, getAllStores } from '../swc.js';
import './stores.js';
import './notification-badge/component.js';

exposeGlobally({ getStore, getAllStores });
