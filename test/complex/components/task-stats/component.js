import { NanoRenderStatefulElement } from 'swc';
import { taskStore } from '../stores.js';

/**
 * Sidebar statistics panel.
 * Demonstrates: {{{unescaped}}}, computed(), onMount/onUnmount, resetState().
 */
export class TaskStats extends NanoRenderStatefulElement {

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; padding: 1rem; background: #0e0e0e; height: 100%; }

            h2 { font-size: 0.75rem; color: #555; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 1rem; }

            .progress-ring { display: flex; justify-content: center; margin-bottom: 1.25rem; }

            svg { overflow: visible; }

            .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1.25rem; }

            .stat {
                background: #161616;
                border: 1px solid #1e1e1e;
                padding: 0.5rem;
                text-align: center;
            }

            .stat-value { font-size: 1.5rem; font-weight: bold; color: #4ade80; }
            .stat-label { font-size: 0.65rem; color: #555; margin-top: 0.15rem; }

            .all-done {
                text-align: center;
                font-size: 0.8rem;
                color: #4ade80;
                padding: 0.5rem;
                border: 1px solid #2a4a2a;
                background: #0a1a0a;
                margin-bottom: 1rem;
            }

            .filter-info { font-size: 0.7rem; color: #444; margin-bottom: 1rem; }
            .filter-info span { color: #666; }

            .btn-reset {
                width: 100%;
                padding: 0.4rem;
                background: #1a1a1a;
                border: 1px solid #333;
                color: #666;
                font-family: monospace;
                font-size: 0.75rem;
                cursor: pointer;
            }
            .btn-reset:hover { background: #2a2a2a; color: #999; }
        `);
        return [sheet];
    }

    /** @returns {Object} */
    getStores() {
        return { taskStore };
    }

    /**
     * Derives stats and builds the SVG progress arc.
     * @param {Object} state
     * @returns {Object}
     */
    computed(state) {
        const tasks      = state.taskStore.tasks;
        const totalCount = tasks.length;
        const doneCount  = tasks.filter(t => t.done).length;
        const activeCount = totalCount - doneCount;
        const percentDone = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
        const allDone     = totalCount > 0 && doneCount === totalCount;

        // Build SVG arc for a circular progress indicator — output via {{{ }}} unescaped
        const r     = 20;
        const circ  = 2 * Math.PI * r;
        const offset = circ - (percentDone / 100) * circ;
        const progressArc = `<circle cx="24" cy="24" r="${r}" fill="none"
            stroke="#4ade80" stroke-width="4"
            stroke-dasharray="${circ.toFixed(2)}"
            stroke-dashoffset="${offset.toFixed(2)}"
            transform="rotate(-90 24 24)"/>`;

        return { totalCount, doneCount, activeCount, percentDone, allDone, progressArc };
    }

    /** @returns {string} */
    view() {
        return `
            <h2>Stats</h2>

            <div class="progress-ring">
                <svg width="48" height="48" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#222" stroke-width="4"/>
                    {{{progressArc}}}
                    <text x="24" y="28" text-anchor="middle" fill="#e5e5e5" font-size="10" font-family="monospace">{{percentDone}}%</text>
                </svg>
            </div>

            {{#if allDone}}
            <div class="all-done">All tasks complete!</div>
            {{/if}}

            <div class="stat-grid">
                <div class="stat">
                    <div class="stat-value">{{totalCount}}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat">
                    <div class="stat-value">{{doneCount}}</div>
                    <div class="stat-label">Done</div>
                </div>
                <div class="stat">
                    <div class="stat-value">{{activeCount}}</div>
                    <div class="stat-label">Active</div>
                </div>
                <div class="stat">
                    <div class="stat-value">{{percentDone}}%</div>
                    <div class="stat-label">Complete</div>
                </div>
            </div>

            <div class="filter-info">Filter: <span>{{taskStore.filter}}</span></div>

            <button class="btn-reset" onclick="resetAll">Reset All Tasks</button>
        `;
    }

    /** Starts a periodic timestamp refresh. */
    onMount() {
        console.log('[task-stats] mounted');
        this._timer = setInterval(() => {
            // Periodic hook — demonstrates onMount/onUnmount pairing
        }, 60000);
    }

    /** Clears the interval timer. */
    onUnmount() {
        console.log('[task-stats] unmounted');
        clearInterval(this._timer);
    }

    /** Resets taskStore to its initial state. */
    resetAll() {
        taskStore.resetState();
    }
}

customElements.define('task-stats', TaskStats);
