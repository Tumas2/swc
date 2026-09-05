import { NanoRenderStatefulElement } from 'swc';

/**
 * The shared child. Declares no store of its own — it inherits one through
 * context, plus a plain string telling it which key on that store to read.
 *
 * The whole point: this file contains no mention of meals or workouts.
 */
const meta = {
    name: 'logged-days',
    version: '1.0.0',
    uses: ['data', 'loggedKey'],
};

export class LoggedDays extends NanoRenderStatefulElement {

    getManifest() {
        return meta;
    }

    computed(state) {
        // `data` is the inherited store's state; `loggedKey` is inherited config.
        const bucket = state.data?.[state.loggedKey] ?? {};

        const dates = Object.keys(bucket)
            .filter(date => (bucket[date]?.length ?? 0) > 0)
            .sort();

        return {
            readingKey: state.loggedKey ?? '(none)',
            count: dates.length,
            hasAny: dates.length > 0,
            dates: dates.map(date => ({ date, entries: bucket[date].join(', ') })),
        };
    }

    view() {
        return `
            <p class="meta">
                reading <code>{{ readingKey }}</code> — {{ count }} logged
            </p>
            {{#if hasAny}}
                <ul>
                    {{#each dates}}
                        <li><b>{{ this.date }}</b> — {{ this.entries }}</li>
                    {{/each}}
                </ul>
            {{else}}
                <p class="empty">Nothing logged.</p>
            {{/if}}
        `;
    }

    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; font: 14px system-ui, sans-serif; }
            .meta { color: #666; margin: 0 0 .5rem; }
            code { background: #eee; padding: 0 .25rem; border-radius: 3px; }
            ul { margin: 0; padding-left: 1.2rem; }
            li { margin: .15rem 0; }
            .empty { color: #999; font-style: italic; }
        `);
        return [sheet];
    }
}

customElements.define(meta.name, LoggedDays);
