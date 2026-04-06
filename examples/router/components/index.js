// swc.js registers router-container, router-switch, router-route, router-link
import { defineComponents } from '../swc.js';

defineComponents({
    'app-nav': () => import('./app-nav/component.js'),
});
