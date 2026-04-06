import { defineComponents } from 'swc';

defineComponents({
    'bench-item':    () => import('./bench-item/component.js'),
    'list-bench':    () => import('./list-bench/component.js'),
    'update-bench':  () => import('./update-bench/component.js'),
    'bench-runner':  () => import('./bench-runner/component.js'),
});
