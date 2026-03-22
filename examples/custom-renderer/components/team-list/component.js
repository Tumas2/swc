import { StatefulElement, defineComponent } from '../../swc.js';
import { teamStore } from '../stores.js';
import meta from './component.json' with { type: 'json' };

/**
 * Renders a team member list using Handlebars.js as the template engine.
 * Handlebars is loaded from a CDN in index.html — it lands on window.Handlebars.
 *
 * getRenderer() returns a thin wrapper that compiles and executes a Handlebars template.
 * This is exactly what SWC's built-in NanoRenderer does internally — just with a
 * different engine plugged in.
 */
export class TeamList extends StatefulElement {
    getStores() {
        return { team: teamStore };
    }

    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }

    /**
     * Plug in Handlebars instead of NanoRenderer.
     * The signature (template, context) => string is all SWC requires.
     *
     * @returns {(template: string, context: object) => string}
     */
    getRenderer() {
        return (template, context) => Handlebars.compile(template)(context);
    }

    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; }
            ul { list-style: none; padding: 0; margin: 0; }
            li {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                border-bottom: 1px solid #eee;
            }
            li:last-child { border-bottom: none; }
            .avatar {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: #e5e7eb;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                color: #555;
                flex-shrink: 0;
            }
            .name { font-weight: 500; }
            .role { font-size: 0.875rem; color: #888; }
            .inactive { opacity: 0.45; }
            .badge {
                margin-left: auto;
                font-size: 0.75rem;
                padding: 0.2rem 0.6rem;
                border-radius: 9999px;
                background: #dcfce7;
                color: #166534;
            }
            .badge.inactive {
                background: #f3f4f6;
                color: #6b7280;
                opacity: 1;
            }
        `);
        return [sheet];
    }
}

defineComponent(meta, TeamList);
