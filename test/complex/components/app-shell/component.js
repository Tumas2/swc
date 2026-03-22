import { NanoRenderStatefulElement } from 'swc';
import { uiStore } from '../stores.js';

/**
 * Top-level layout wrapper.
 * Demonstrates: <slot> (named slots), {{#if}} toggling a slot container, onMount().
 */
export class AppShell extends NanoRenderStatefulElement {

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; height: 100vh; overflow: hidden; }

            .layout {
                display: grid;
                grid-template-areas: "header header" "main sidebar";
                grid-template-columns: 1fr 280px;
                grid-template-rows: auto 1fr;
                height: 100%;
            }

            .layout.no-sidebar {
                grid-template-areas: "header" "main";
                grid-template-columns: 1fr;
            }

            .header-area { grid-area: header; }

            .main-area {
                grid-area: main;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            slot[name="list"] { display: block; flex: 1; overflow-y: auto; }

            .sidebar-area {
                grid-area: sidebar;
                border-left: 1px solid #1e1e1e;
                overflow-y: auto;
            }
        `);
        return [sheet];
    }

    /** @returns {Object} */
    getStores() {
        return { uiStore };
    }

    /** @returns {string} */
    view() {
        return `
            <div class="layout {{#if uiStore.sidebarOpen}}{{else}}no-sidebar{{/if}}">
                <div class="header-area">
                    <slot name="header"></slot>
                </div>
                <div class="main-area">
                    <slot name="form"></slot>
                    <slot name="list"></slot>
                </div>
                {{#if uiStore.sidebarOpen}}
                <div class="sidebar-area">
                    <slot name="sidebar"></slot>
                </div>
                {{/if}}
            </div>
        `;
    }

    /** Logs mount — demonstrates onMount() lifecycle hook. */
    onMount() {
        console.log('[app-shell] mounted');
    }
}

customElements.define('app-shell', AppShell);
