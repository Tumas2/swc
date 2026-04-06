import { defineComponents } from 'swc';

defineComponents({
    'user-greeting':   () => import('./user-greeting/component.js'),
    'guest-control':   () => import('./guest-control/component.js'),
    'counter-control': () => import('./counter-control/component.js'),
    'counter-display': () => import('./counter-display/component.js'),
    // Full page components
    'main-nav':        () => import('./main-nav/component.js'),
    'simple-clock':    () => import('./simple-clock/component.js'),
    'user-profile':    () => import('./user-profile/component.js'),
});
