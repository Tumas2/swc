import { StatefulElement } from '../../swc.js';

/**
 * Top navigation bar with router-link items.
 * Active link styling is handled via CSS ::part(link--active).
 */
export class AppNav extends StatefulElement {
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host {
                display: block;
                background: #fff;
                border-bottom: 1px solid #eee;
            }
            nav {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                max-width: 900px;
                margin: 0 auto;
                padding: 0 1.5rem;
                height: 56px;
            }
            .logo {
                font-weight: 700;
                font-size: 1.1rem;
                margin-right: auto;
                color: #111;
            }
            router-link::part(link) {
                padding: 0.4rem 0.75rem;
                border-radius: 6px;
                color: #555;
                font-size: 0.95rem;
                transition: background 0.1s;
            }
            router-link::part(link):hover {
                background: #f5f5f5;
                color: #111;
            }
            router-link::part(link--active) {
                background: #eff6ff;
                color: #1d4ed8;
                font-weight: 500;
            }
        `);
        return [sheet];
    }

    view() {
        return `
            <nav>
                <span class="logo">SWC Router</span>
                <router-link to="/">Home</router-link>
                <router-link to="/about">About</router-link>
                <router-link to="/posts">Posts</router-link>
            </nav>
        `;
    }
}

customElements.define('app-nav', AppNav);
