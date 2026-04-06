import './stores.js';
import { defineComponents } from '../swc.js';

defineComponents({
    'theme-toggle': () => import('./theme-toggle/component.js'),
    'app-card':     () => import('./app-card/component.js'),
});
