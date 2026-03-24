// counter-control.js
import { NanoRenderStatefulElement } from 'swc';
import { counterStore } from 'stores/counterStore.js';

import globalStyles from '../../global.css' with { type: 'css' };
import localStyles from './style.css' with { type: 'css' };

class CounterControl extends NanoRenderStatefulElement {

    intervalID = null;

    getTemplatePath() {
        return new URL('markup.html', import.meta.url).pathname;
    }

    getStyles() {
        return [globalStyles, localStyles];
    }

    getStores() {
        return { counter: counterStore };
    }

    $increment() {
        counterStore.setState({ count: this.state.counter.count + 1 });
        console.log('Increment button clicked!');
    }

    onUnmount() {
        // clearInterval(this.intervalID);
        counterStore.resetState();
    }

}

customElements.define('counter-control', CounterControl);