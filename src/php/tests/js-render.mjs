/**
 * Renders templates with the real JS NanoRenderer for the PHP parity tests.
 *
 * Reads a JSON array of [template, dataJson] pairs from stdin and writes a
 * JSON array of rendered strings to stdout.
 */

// NanoRenderer.js imports StatefulElement, which touches these at load time.
globalThis.HTMLElement ??= class {};
globalThis.document ??= { addEventListener() {} };

// Malformed templates are part of the cases; their console noise is expected.
console.error = () => {};
console.warn = () => {};

const { NanoRenderer } = await import(new URL('../../js/NanoRenderer.js', import.meta.url));

// Test helpers — registered identically in nano-renderer.php.
NanoRenderer.registerHelper('echo', (value) => value);
NanoRenderer.registerHelper('upper', (value) => String(value).toUpperCase());
NanoRenderer.registerHelper('join', (...args) => args.join('-'));
NanoRenderer.registerHelper('count', (...args) => args.length);
NanoRenderer.registerHelper('boom', () => { throw new Error('boom'); });

let input = '';
for await (const chunk of process.stdin) input += chunk;

const renderer = new NanoRenderer();
const output = JSON.parse(input).map(([template, dataJson]) => renderer.render(template, JSON.parse(dataJson)));

process.stdout.write(JSON.stringify(output));
