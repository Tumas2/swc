import { benchItemStore } from '../bench-item/component.js';
import { listBenchStore } from '../list-bench/component.js';
import { updateBenchStore } from '../update-bench/component.js';

const TESTS = [
    { id: 'flat',    label: 'Flat Component Count',       defaultN: 100  },
    { id: 'nesting', label: 'Deep Nesting',                defaultN: 15   },
    { id: 'list',    label: 'List Render ({{#each}})',     defaultN: 500  },
    { id: 'update',  label: 'Rapid State Updates',         defaultN: 100  },
    { id: 'store',   label: 'Store Broadcast',             defaultN: 50   },
];

/**
 * Control panel for the SWC stress test suite.
 * A vanilla HTMLElement (not SWC-managed) so the bench area can be
 * manipulated imperatively without conflicting with reactive rendering.
 */
class BenchRunner extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._test = 'flat';
        this._n = 100;
        this._init();
    }

    /** @private Builds the static shell UI and wires up event listeners. */
    _init() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; font-family: monospace; }

                header {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid #2a2a2a;
                    background: #161616;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }

                h1 { margin: 0 0 0.6rem; font-size: 1rem; color: #fff; letter-spacing: 0.05em; }

                .controls { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }

                select, input {
                    background: #222;
                    border: 1px solid #333;
                    color: #e5e5e5;
                    padding: 0.35rem 0.5rem;
                    font-family: monospace;
                    font-size: 0.8rem;
                }

                input[type=number] { width: 75px; }

                button {
                    padding: 0.35rem 0.8rem;
                    border: none;
                    font-family: monospace;
                    font-size: 0.8rem;
                    cursor: pointer;
                }

                .btn-run   { background: #4ade80; color: #000; }
                .btn-run:hover { background: #22c55e; }
                .btn-run:disabled { background: #2a4a2a; color: #4a7a4a; cursor: default; }
                .btn-clear { background: #1e1e1e; color: #666; border: 1px solid #333; }
                .btn-clear:hover { background: #2a2a2a; }

                .n-label { font-size: 0.75rem; color: #555; }

                .results {
                    padding: 0.6rem 1rem;
                    border-bottom: 1px solid #1e1e1e;
                    min-height: 52px;
                    max-height: 180px;
                    overflow-y: auto;
                    background: #0e0e0e;
                }

                .result       { font-size: 0.78rem; padding: 1px 0; color: #4ade80; }
                .result.warn  { color: #facc15; }
                .no-results   { color: #333; font-size: 0.78rem; }

                .bench-area { padding: 0.75rem 1rem; }

                .bench-label {
                    font-size: 0.7rem;
                    color: #444;
                    margin-bottom: 0.4rem;
                    letter-spacing: 0.03em;
                }
            </style>

            <header>
                <h1>⚡ SWC Stress Test</h1>
                <div class="controls">
                    <select id="test-select">
                        ${TESTS.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
                    </select>
                    <span class="n-label">N =</span>
                    <input id="n-input" type="number" value="100" min="1" max="10000">
                    <button class="btn-run"   id="run-btn">▶ Run</button>
                    <button class="btn-clear" id="clear-btn">Clear</button>
                </div>
            </header>

            <div class="results" id="results-area">
                <div class="no-results" id="no-results-msg">No results yet — select a test and click Run.</div>
            </div>

            <div class="bench-area">
                <div class="bench-label" id="bench-label"></div>
                <div id="bench-content"></div>
            </div>
        `;

        this.shadowRoot.getElementById('test-select').addEventListener('change', e => {
            this._test = e.target.value;
            const t = TESTS.find(t => t.id === this._test);
            if (t) {
                this._n = t.defaultN;
                this.shadowRoot.getElementById('n-input').value = t.defaultN;
            }
        });

        this.shadowRoot.getElementById('n-input').addEventListener('input', e => {
            this._n = Math.max(1, parseInt(e.target.value) || 1);
        });

        this.shadowRoot.getElementById('run-btn').addEventListener('click', () => this._runTest());
        this.shadowRoot.getElementById('clear-btn').addEventListener('click', () => this._clearResults());
    }

    /**
     * Appends a result row to the results panel.
     * @param {string} label
     * @param {string|number} syncMs  - JS execution time
     * @param {string|number} paintMs - Time to first paint frame
     */
    _addResult(label, syncMs, paintMs) {
        const area = this.shadowRoot.getElementById('results-area');
        this.shadowRoot.getElementById('no-results-msg')?.remove();

        const div = document.createElement('div');
        div.className = 'result';
        div.textContent = `✓ ${label}  —  ${syncMs}ms JS  |  ${paintMs}ms paint`;
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    }

    /** Clears the results panel and bench area. */
    _clearResults() {
        const area = this.shadowRoot.getElementById('results-area');
        area.innerHTML = '<div class="no-results" id="no-results-msg">No results yet — select a test and click Run.</div>';
        this._clearBench();
    }

    /** @private Clears the bench content area, disconnecting any mounted components. */
    _clearBench() {
        this.shadowRoot.getElementById('bench-content').innerHTML = '';
        this.shadowRoot.getElementById('bench-label').textContent = '';
    }

    /**
     * Sets a label and clears bench content, then runs a setup callback.
     * @param {string} label
     * @param {(content: HTMLElement) => void} fn
     */
    _setBench(label, fn) {
        this._clearBench();
        this.shadowRoot.getElementById('bench-label').textContent = label;
        fn(this.shadowRoot.getElementById('bench-content'));
    }

    /** @private Locks the Run button and returns an unlock function. */
    _lock() {
        const btn = this.shadowRoot.getElementById('run-btn');
        btn.disabled = true;
        btn.textContent = '⏳';
        return () => {
            btn.disabled = false;
            btn.textContent = '▶ Run';
        };
    }

    /** @private Dispatches the selected test. */
    _runTest() {
        const n = this._n;
        const unlock = this._lock();
        const done = (label, syncMs, paintMs) => {
            this._addResult(label, syncMs, paintMs);
            unlock();
        };

        switch (this._test) {
            case 'flat':    this._testFlat(n, done);    break;
            case 'nesting': this._testNesting(n, done); break;
            case 'list':    this._testList(n, done);    break;
            case 'update':  this._testUpdate(n, done);  break;
            case 'store':   this._testStore(n, done);   break;
        }
    }

    /**
     * Test 1 — Flat Component Count.
     * Creates N bench-item elements and measures mount + paint time.
     * @param {number} n
     * @param {Function} done
     */
    _testFlat(n, done) {
        this._setBench(`Flat: inserting ${n} bench-item components`, content => {
            const frag = document.createDocumentFragment();
            for (let i = 0; i < n; i++) {
                frag.appendChild(document.createElement('bench-item'));
            }

            const t0 = performance.now();
            content.appendChild(frag);
            const syncMs = (performance.now() - t0).toFixed(2);

            requestAnimationFrame(() => {
                const paintMs = (performance.now() - t0).toFixed(2);
                done(`Flat (N=${n})`, syncMs, paintMs);
            });
        });
    }

    /**
     * Test 2 — Deep Nesting.
     * Builds a chain of N bench-items nested inside each other via slots.
     * @param {number} depth
     * @param {Function} done
     */
    _testNesting(depth, done) {
        this._setBench(`Nesting: ${depth} levels deep`, content => {
            const items = Array.from({ length: depth }, () => document.createElement('bench-item'));
            for (let i = 0; i < depth - 1; i++) {
                items[i].appendChild(items[i + 1]);
            }

            const t0 = performance.now();
            content.appendChild(items[0]);
            const syncMs = (performance.now() - t0).toFixed(2);

            requestAnimationFrame(() => {
                const paintMs = (performance.now() - t0).toFixed(2);
                done(`Nesting (depth=${depth})`, syncMs, paintMs);
            });
        });
    }

    /**
     * Test 3 — List Render via NanoRenderer {{#each}}.
     * Populates listBenchStore with N items and measures render + morph time.
     * @param {number} n
     * @param {Function} done
     */
    _testList(n, done) {
        const items = Array.from({ length: n }, (_, i) => ({
            id: i + 1,
            name: `Item-${i + 1}`,
            value: (Math.random() * 100).toFixed(3),
            tag: ['alpha', 'beta', 'gamma', 'delta'][i % 4],
        }));

        listBenchStore.setState({ items: [] });

        this._setBench(`List: rendering ${n} items via {{#each}}`, content => {
            const el = document.createElement('list-bench');
            content.appendChild(el);

            // Wait one frame so list-bench is fully mounted before timing the update
            requestAnimationFrame(() => {
                const t0 = performance.now();
                listBenchStore.setState({ items });
                const syncMs = (performance.now() - t0).toFixed(2);

                requestAnimationFrame(() => {
                    const paintMs = (performance.now() - t0).toFixed(2);
                    done(`List Render (N=${n})`, syncMs, paintMs);
                });
            });
        });
    }

    /**
     * Test 4 — Rapid State Updates.
     * Fires N synchronous setState calls on a single update-bench component.
     * Each call triggers a full render + dom-morph cycle.
     * @param {number} n
     * @param {Function} done
     */
    _testUpdate(n, done) {
        updateBenchStore.setState({ count: 0 });

        this._setBench(`Rapid Updates: ${n} setState calls on one component`, content => {
            const el = document.createElement('update-bench');
            content.appendChild(el);

            requestAnimationFrame(() => {
                const t0 = performance.now();
                for (let i = 1; i <= n; i++) {
                    updateBenchStore.setState({ count: i });
                }
                const syncMs = (performance.now() - t0).toFixed(2);
                const avgMs  = (syncMs / n).toFixed(3);

                requestAnimationFrame(() => {
                    const paintMs = (performance.now() - t0).toFixed(2);
                    done(`Rapid Updates (N=${n}, avg ${avgMs}ms/update)`, syncMs, paintMs);
                });
            });
        });
    }

    /**
     * Test 5 — Store Broadcast.
     * Inserts N bench-items (all sharing benchItemStore), then fires one setState.
     * Measures how long it takes all N subscribers to synchronously re-render.
     * @param {number} n
     * @param {Function} done
     */
    _testStore(n, done) {
        benchItemStore.setState({ count: 0, label: 'item' });

        this._setBench(`Store Broadcast: ${n} subscribers, 1 setState`, content => {
            const frag = document.createDocumentFragment();
            for (let i = 0; i < n; i++) {
                frag.appendChild(document.createElement('bench-item'));
            }
            content.appendChild(frag);

            // Wait for all N components to be connected and subscribed
            requestAnimationFrame(() => {
                const t0 = performance.now();
                benchItemStore.setState({ count: 1, label: 'broadcast' });
                const syncMs = (performance.now() - t0).toFixed(2);

                requestAnimationFrame(() => {
                    const paintMs = (performance.now() - t0).toFixed(2);
                    done(`Store Broadcast (N=${n} subscribers)`, syncMs, paintMs);
                });
            });
        });
    }
}

customElements.define('bench-runner', BenchRunner);
