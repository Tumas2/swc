import { NanoRenderStatefulElement } from 'swc';
import { userStore } from 'stores/userStore.js';

import globalStyles from '../../global.css' with { type: 'css' };
import localStyles from './style.css' with { type: 'css' };

class GuestControl extends NanoRenderStatefulElement {

    getTemplatePath() {
        return new URL('markup.html', import.meta.url).pathname;
    }

    getStyles() {
        return [globalStyles, localStyles];
    }

    getStores() {
        return { user: userStore };
    }

    $onchange(e) {
        userStore.setState({ name: e.target.value });
    }
}

customElements.define('guest-control', GuestControl);