import { NanoRenderStatefulElement } from 'swc';
import { taskStore } from '../stores.js';

/**
 * Main task list — the primary dom-morph workout.
 * Demonstrates: {{#each}}, {{#if}} inside loop, {{{safe}}}, {{this.prop}},
 * {{index}}, onclick event bindings, computed(), onUnmount().
 */
export class TaskList extends NanoRenderStatefulElement {

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; padding: 0.5rem 1rem; }

            .task-row {
                display: grid;
                grid-template-columns: 2rem 1fr auto auto auto;
                gap: 0.5rem;
                align-items: start;
                padding: 0.5rem 0;
                border-bottom: 1px solid #1a1a1a;
            }

            .task-row.done .task-title { text-decoration: line-through; color: #444; }

            .row-index { font-size: 0.65rem; color: #333; padding-top: 0.15rem; text-align: right; }

            .task-content { min-width: 0; }
            .task-title { font-size: 0.8rem; color: #ccc; word-break: break-word; }
            .task-notes { font-size: 0.7rem; color: #555; margin-top: 0.2rem; }
            .task-notes b, .task-notes strong { color: #888; }
            .task-notes em, .task-notes i { color: #666; font-style: italic; }

            .badge {
                font-size: 0.6rem;
                padding: 0.15rem 0.4rem;
                border-radius: 2px;
                white-space: nowrap;
                align-self: start;
                margin-top: 0.1rem;
            }
            .badge-high   { background: #3a1010; color: #f87171; }
            .badge-medium { background: #2a2210; color: #fbbf24; }
            .badge-low    { background: #0f2a0f; color: #4ade80; }

            button {
                background: none;
                border: 1px solid #222;
                color: #555;
                font-family: monospace;
                font-size: 0.75rem;
                width: 1.6rem;
                height: 1.6rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .btn-done:hover  { border-color: #4ade80; color: #4ade80; }
            .btn-remove:hover { border-color: #f87171; color: #f87171; }
            .task-row.done .btn-done { border-color: #2a4a2a; color: #4ade80; }

            .empty-state { padding: 2rem; text-align: center; color: #333; font-size: 0.8rem; }
        `);
        return [sheet];
    }

    /** @returns {Object} */
    getStores() {
        return { taskStore };
    }

    /** @returns {string} */
    view() {
        return `
            {{#each filteredTasks}}
            <div class="task-row {{#if this.done}}done{{/if}}">
                <span class="row-index">#{{index}}</span>
                <div class="task-content">
                    <div class="task-title">{{this.title}}</div>
                    {{#if this.notes}}
                    <div class="task-notes">{{{safe this.notes}}}</div>
                    {{/if}}
                </div>
                <span class="badge badge-{{this.priority}}">{{this.priority}}</span>
                <button class="btn-done" onclick="toggleDone" data-id="{{this.id}}">
                    {{#if this.done}}✓{{else}}○{{/if}}
                </button>
                <button class="btn-remove" onclick="removeTask" data-id="{{this.id}}">✕</button>
            </div>
            {{else}}
            <div class="empty-state">{{emptyMessage}}</div>
            {{/each}}
        `;
    }

    /**
     * Filters tasks based on the current filter value.
     * @param {Object} state
     * @returns {Object}
     */
    computed(state) {
        const { tasks, filter } = state.taskStore;
        const filteredTasks = filter === 'all'    ? tasks
                            : filter === 'active' ? tasks.filter(t => !t.done)
                            :                       tasks.filter(t =>  t.done);
        const emptyMessage  = filter === 'all'    ? 'No tasks yet. Add one above!'
                            : filter === 'active' ? 'No active tasks.'
                            :                       'No completed tasks.';
        return { filteredTasks, emptyMessage };
    }

    /**
     * Toggles the done state of a task.
     * @param {Event} e
     */
    toggleDone(e) {
        const id = parseInt(e.currentTarget.dataset.id, 10);
        const tasks = taskStore.getState().tasks.map(t =>
            t.id === id ? { ...t, done: !t.done } : t
        );
        taskStore.setState({ tasks });
    }

    /**
     * Removes a task from the list.
     * @param {Event} e
     */
    removeTask(e) {
        const id = parseInt(e.currentTarget.dataset.id, 10);
        const tasks = taskStore.getState().tasks.filter(t => t.id !== id);
        taskStore.setState({ tasks });
    }

    /** Logs cleanup on removal from DOM. */
    onUnmount() {
        console.log('[task-list] unmounted');
    }
}

customElements.define('task-list', TaskList);
