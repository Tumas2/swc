import { createStore } from '../swc.js';
import meta from '../stores/team-store.json' with { type: 'json' };

export const teamStore = createStore(meta);

teamStore.setState({
    members: [
        { name: 'Alex Jensen',  initial: 'AJ', role: 'Engineering Lead',    active: true },
        { name: 'Sam Rivera',   initial: 'SR', role: 'Product Designer',     active: true },
        { name: 'Jordan Kim',   initial: 'JK', role: 'Backend Developer',    active: false },
        { name: 'Casey Morgan', initial: 'CM', role: 'Frontend Developer',   active: true },
    ],
});
