// counter-control.js
import { NanoRenderStatefulElement } from 'swc';
import { counterStore } from '../../stores/counterStore.js';

import globalStyles from '../../global.css' with { type: 'css' };
import localStyles from './style.css' with { type: 'css' };

class SimpleClock extends NanoRenderStatefulElement {

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

    onUnmount() {
        clearInterval(this.intervalID);
        counterStore.resetState();
    }

    computed() {
        const date = new Date();

        return {
            counter: {
                seconds: date.getSeconds(),
                minutes: date.getMinutes(),
                hour: date.getHours()
            }
        }
    }

    async onMount() {
        this.intervalID = setInterval(() => {
            const date = new Date();
            counterStore.setState({
                seconds: date.getSeconds(),
                minutes: date.getMinutes(),
                hour: date.getHours()
            });
        }, 1000)
    }

}

customElements.define('simple-clock', SimpleClock);