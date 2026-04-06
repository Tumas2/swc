import { defineComponents } from '../swc.js';

defineComponents({
    'blog-post': () => import('./blog-post/component.js'),
});
