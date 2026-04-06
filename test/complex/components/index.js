import './stores.js';
import { defineComponents } from 'swc';

defineComponents({
    'task-stats':  () => import('./task-stats/component.js'),
    'task-list':   () => import('./task-list/component.js'),
    'task-form':   () => import('./task-form/component.js'),
    'task-header': () => import('./task-header/component.js'),
    'app-shell':   () => import('./app-shell/component.js'),
});
