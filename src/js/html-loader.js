"use strict";

const templateCache = new Map();

export function loadHTML(path, cache = true) {
	if (cache && templateCache.has(path)) {
		return templateCache.get(path);
	}

	const promise = fetch(path)
		.then(response => {
			if (!response.ok) {
				templateCache.delete(path);
				throw new Error(`Failed to load HTML from ${path}`);
			}
			return response.text();
		});

	if (cache) {
		templateCache.set(path, promise);
	}
	return promise;
}

const PARTIAL_RE = /\{\{#html\s+['"]([^'"]+)['"]\s*\}\}/g;

/**
 * Resolves `{{#html './path.html'}}` partial includes in a template string.
 * Each path is resolved relative to `baseUrl` (the URL of the including file).
 * Partials are fetched via `loadHTML` and may themselves contain further includes.
 * Circular includes are detected and replaced with an empty string.
 * @param {string} template - The template string to process.
 * @param {string} baseUrl - Absolute URL of the template file being processed.
 * @param {Set<string>} [_visiting] - Internal set used for cycle detection.
 * @returns {Promise<string>} The template with all partials inlined.
 */
export async function resolvePartials(template, baseUrl, _visiting = new Set()) {
	const matches = [...template.matchAll(PARTIAL_RE)];
	if (matches.length === 0) return template;

	for (const match of matches) {
		const [fullMatch, relativePath] = match;
		const resolvedUrl = new URL(relativePath, baseUrl);
		const resolvedPath = resolvedUrl.pathname;

		if (_visiting.has(resolvedPath)) {
			console.error(`SWC: Circular partial include detected: ${resolvedPath}`);
			template = template.replace(fullMatch, '');
			continue;
		}

		const partialContent = await loadHTML(resolvedPath);
		_visiting.add(resolvedPath);
		const resolved = await resolvePartials(partialContent, resolvedUrl.href, _visiting);
		_visiting.delete(resolvedPath);

		template = template.replace(fullMatch, resolved);
	}

	return template;
}