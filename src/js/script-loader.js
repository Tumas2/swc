"use strict";

/** @type {Map<string, Promise<Function>>} */
const scriptCache = new Map();

/**
 * Fetches a JS file by URL, compiles it as a function, and calls it with `this`
 * set to `context`. The compiled function is cached by URL so the file is only
 * fetched and compiled once per page lifetime.
 *
 * Inside the loaded script, `this` refers to `context` — typically a
 * `StatefulElement` instance — giving access to `this.state`, `this.shadowRoot`,
 * `this.render()`, and all other component methods and properties.
 *
 * Note: scripts run in global scope. Module-style `import` statements will not
 * work inside the loaded file. Use `this.*` or `window.*` to access data.
 *
 * @param {string} url - URL of the JS file to load.
 * @param {object} context - The value of `this` inside the loaded script.
 * @param {object} [options]
 * @param {boolean} [options.cache=true] - Whether to cache the compiled function.
 * @returns {Promise<*>} Resolves with whatever the script returns.
 */
export function loadScript(url, context, { cache = true } = {}) {
	let promise;

	if (cache && scriptCache.has(url)) {
		promise = scriptCache.get(url);
	} else {
		promise = fetch(url)
			.then(response => {
				if (!response.ok) {
					scriptCache.delete(url);
					throw new Error(`Failed to load script from ${url}`);
				}
				return response.text();
			})
			.then(code => new Function(code));

		if (cache) {
			scriptCache.set(url, promise);
		}
	}

	return promise.then(fn => fn.call(context));
}
