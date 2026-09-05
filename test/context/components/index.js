import './stores.js';
import { defineComponents } from 'swc';

// All eager (the default). `logged-days` lives inside a host's shadow root, so
// lazy discovery would never see it anyway — the hosts also declare it in their
// manifest `components`, which loads it independently of this.
defineComponents({
    'meal-host':    () => import('./meal-host/component.js'),
    'workout-host': () => import('./workout-host/component.js'),
    'logged-days':  () => import('./logged-days/component.js'),
    'reorder-host': () => import('./reorder-host/component.js'),
    'counter-chip': () => import('./counter-chip/component.js'),
});
