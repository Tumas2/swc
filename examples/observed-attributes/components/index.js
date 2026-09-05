import { defineComponents } from '../swc.js';

defineComponents({
    'alert-box': () => import('./alert-box/component.js'),
});
