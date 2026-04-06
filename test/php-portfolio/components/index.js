import { defineComponents } from 'swc';

defineComponents({
    'main-header': () => import('./header/component.js'),
});
