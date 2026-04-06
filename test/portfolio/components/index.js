import './stores.js';
import { defineComponents } from 'swc';

defineComponents({
    'work-history':   () => import('./work-history/component.js'),
    'skills-grid':    () => import('./skills-grid/component.js'),
    'about-section':  () => import('./about-section/component.js'),
    'hero-section':   () => import('./hero-section/component.js'),
    'site-nav':       () => import('./site-nav/component.js'),
});
