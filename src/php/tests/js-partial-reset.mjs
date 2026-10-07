/**
 * Checks how the JS NanoRenderer forgets resolver-supplied partials when the
 * resolver is replaced. Prints a JSON object of results for nano-renderer.php,
 * which runs the same steps against the PHP renderer.
 */

globalThis.HTMLElement ??= class {};
globalThis.document ??= { addEventListener() {} };
console.error = () => {};
console.warn = () => {};

const { NanoRenderer } = await import(new URL('../../js/NanoRenderer.js', import.meta.url));

const renderer = new NanoRenderer();
const results = {};

NanoRenderer.registerPartial('kept', 'K');

// 1. A partial from resolver A renders.
NanoRenderer.setPartialResolver(async (name) => ({ swap: 'A' })[name] ?? null);
await NanoRenderer.loadPartials('{{> swap}}');
results.fromFirst = renderer.render('{{> swap}}{{> kept}}', {});

// 2. A new resolver forgets A's partial but keeps the registered one.
NanoRenderer.setPartialResolver(async (name) => ({ swap: 'B' })[name] ?? null);
results.forgotten = renderer.render('{{> swap}}{{> kept}}', {});
await NanoRenderer.loadPartials('{{> swap}}');
results.fromSecond = renderer.render('{{> swap}}{{> kept}}', {});

// 3. An answer that arrives after the resolver was replaced is dropped.
let release;
NanoRenderer.setPartialResolver((name) => new Promise((resolve) => { release = () => resolve(name === 'late' ? 'C' : null); }));
const slowLoad = NanoRenderer.loadPartials('{{> late}}');
await new Promise((resolve) => setTimeout(resolve, 0)); // let the slow resolver get called
NanoRenderer.setPartialResolver(async (name) => ({ late: 'D' })[name] ?? null);
release();
await slowLoad;
results.staleDropped = renderer.render('{{> late}}', {});
await NanoRenderer.loadPartials('{{> late}}');
results.fromCurrent = renderer.render('{{> late}}', {});

// 4. Registering a name takes it over from the resolver for good.
NanoRenderer.registerPartial('late', 'R');
NanoRenderer.setPartialResolver(null);
results.registeredWins = renderer.render('{{> late}}', {});

process.stdout.write(JSON.stringify(results));
