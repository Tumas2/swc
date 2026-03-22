import { createStore } from 'swc';
import workMeta from '../stores/work-store.json' with { type: 'json' };
import skillsMeta from '../stores/skills-store.json' with { type: 'json' };

export const workStore = createStore(workMeta);
export const skillsStore = createStore(skillsMeta);
