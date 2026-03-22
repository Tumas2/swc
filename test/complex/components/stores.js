import { StateStore } from 'swc';

/**
 * Primary domain store — holds the task list and current filter.
 * @type {StateStore}
 */
export const taskStore = new StateStore({
    tasks: [
        { id: 1, title: 'Design the UI',  priority: 'high',   done: false, notes: '<b>Important:</b> deadline is Friday' },
        { id: 2, title: 'Write tests',    priority: 'medium', done: false, notes: '' },
        { id: 3, title: 'Deploy to prod', priority: 'low',    done: true,  notes: 'Already <em>deployed</em> last week' },
    ],
    nextId: 4,
    filter: 'all',
});

/**
 * Transient UI state — form inputs and panel visibility.
 * @type {StateStore}
 */
export const uiStore = new StateStore({
    inputValue: '',
    inputPriority: 'medium',
    sidebarOpen: true,
});
