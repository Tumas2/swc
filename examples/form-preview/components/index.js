import './stores.js';
import { defineComponents } from '../swc.js';

defineComponents({
    'profile-form':    () => import('./profile-form/component.js'),
    'profile-preview': () => import('./profile-preview/component.js'),
});
