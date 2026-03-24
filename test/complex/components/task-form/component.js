import { NanoRenderStatefulElement } from 'swc';
import { taskStore, uiStore } from '../stores.js';

/**
 * Add-task form.
 * Demonstrates: oninput, onchange, onsubmit, computed(), {{#if}} on form controls.
 */
export class TaskForm extends NanoRenderStatefulElement {

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; padding: 0.75rem 1rem; border-bottom: 1px solid #1a1a1a; background: #111; }

            form { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }

            input[type="text"] {
                flex: 1;
                min-width: 160px;
                background: #1a1a1a;
                border: 1px solid #2a2a2a;
                color: #e5e5e5;
                padding: 0.35rem 0.5rem;
                font-family: monospace;
                font-size: 0.8rem;
            }
            input[type="text"]:focus { outline: none; border-color: #4ade80; }
            input[type="text"]::placeholder { color: #333; }

            select {
                background: #1a1a1a;
                border: 1px solid #2a2a2a;
                color: #e5e5e5;
                padding: 0.35rem 0.4rem;
                font-family: monospace;
                font-size: 0.8rem;
            }

            button[type="submit"] {
                padding: 0.35rem 0.8rem;
                border: none;
                font-family: monospace;
                font-size: 0.8rem;
                cursor: pointer;
                background: #4ade80;
                color: #000;
            }
            button[type="submit"]:hover { background: #22c55e; }
            button[type="submit"]:disabled {
                background: #1a2a1a;
                color: #2a4a2a;
                cursor: default;
            }
        `);
        return [sheet];
    }

    /** @returns {Object} */
    getStores() {
        return { uiStore };
    }

    /**
     * Derives whether the form can be submitted.
     * @param {Object} state
     * @returns {Object}
     */
    computed(state) {
        return {
            canSubmit: state.uiStore.inputValue.trim().length > 0,
        };
    }

    /** @returns {string} */
    view() {
        return `
            <form onsubmit="$addTask">
                <input
                    type="text"
                    placeholder="New task title…"
                    value="{{uiStore.inputValue}}"
                    oninput="$handleInput"
                >
                <select onchange="$handlePriority">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                {{#if canSubmit}}
                <button type="submit">+ Add</button>
                {{else}}
                <button type="submit" disabled>+ Add</button>
                {{/if}}
            </form>
        `;
    }

    /**
     * Updates the input value in uiStore on each keystroke.
     * @param {Event} e
     */
    $handleInput(e) {
        uiStore.setState({ inputValue: e.target.value });
    }

    /**
     * Updates the selected priority in uiStore.
     * @param {Event} e
     */
    $handlePriority(e) {
        uiStore.setState({ inputPriority: e.target.value });
    }

    /**
     * Adds a new task to taskStore and clears the input.
     * @param {Event} e
     */
    $addTask(e) {
        e.preventDefault();
        const { inputValue, inputPriority } = uiStore.getState();
        const title = inputValue.trim();
        if (!title) return;

        const { tasks, nextId } = taskStore.getState();
        taskStore.setState({
            tasks: [...tasks, { id: nextId, title, priority: inputPriority, done: false, notes: '' }],
            nextId: nextId + 1,
        });
        uiStore.setState({ inputValue: '', inputPriority: 'medium' });
    }
}

customElements.define('task-form', TaskForm);
