import './stores.js';
import { defineComponents } from '../swc.js';

defineComponents({
    'profile-card': () => import('./profile-card/component.js'),
});
