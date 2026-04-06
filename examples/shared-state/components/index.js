import './stores.js';
import { defineComponents } from '../swc.js';

defineComponents({
    'fav-button': () => import('./fav-button/component.js'),
});
