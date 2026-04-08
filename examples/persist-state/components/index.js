import './stores.js';
import { defineComponents } from '../swc.js';

defineComponents({
    'reading-list': () => import('./reading-list/component.js'),
});
