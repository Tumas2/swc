"use strict";

const templateCache = new Map();

export function loadHTML(path, cache = true) {
	if (cache && templateCache.has(path)) {
		return templateCache.get(path);
	}

	const promise = fetch(path)
		.then(response => {
			if (!response.ok) {
				throw new Error(`Failed to load HTML from ${path}`);
			}
			return response.text();
		});

	if (cache) {
		templateCache.set(path, promise);
	}
	return promise;
}