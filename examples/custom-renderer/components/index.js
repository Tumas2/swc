import './stores.js';
import { defineComponents } from '../swc.js';

defineComponents({
    'team-list': () => import('./team-list/component.js'),
});
