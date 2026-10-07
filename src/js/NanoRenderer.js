import { StatefulElement } from "./StatefulElement.js";

// ---------------------------------------------------------------------------
// Module-level helpers — defined once, shared across all compiled templates.
// ---------------------------------------------------------------------------

/** @type {Record<string, string>} */
const _ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };

/**
 * Escapes a value for safe HTML text output.
 * @param {*} str
 * @returns {string}
 */
function _escape(str) {
    return String(str ?? '').replace(/[&<>'"]/g, c => _ESCAPE_MAP[c]);
}

/** @type {DOMParser | null} */
let _domParser = null;

/**
 * Sanitizes an HTML string by stripping dangerous tags and event attributes.
 * @param {string} str
 * @returns {string}
 */
function _sanitize(str) {
    if (!_domParser) _domParser = new DOMParser();
    const doc = _domParser.parseFromString(str || '', 'text/html');
    ['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta'].forEach(tag =>
        doc.querySelectorAll(tag).forEach(el => el.remove())
    );
    doc.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
            if ((attr.name === 'href' || attr.name === 'src') &&
                attr.value.trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttribute(attr.name);
            }
        });
    });
    return doc.body.innerHTML;
}

/**
 * Looks up a dot-path value by searching the context stack from top to bottom.
 * @param {object[]} stack
 * @param {string[]} parts
 * @returns {*}
 */
function _get(stack, parts) {
    if (!parts || parts.length === 0) return undefined;
    const first = parts[0];
    if (first === 'this') {
        let thisVal;
        for (let i = stack.length - 1; i >= 0; i--) {
            if (stack[i].this !== undefined) { thisVal = stack[i].this; break; }
        }
        if (thisVal === undefined) thisVal = stack[stack.length - 1];
        if (parts.length === 1) return thisVal;
        let obj = thisVal;
        for (let j = 1; j < parts.length; j++) {
            if (obj == null || obj[parts[j]] === undefined) return undefined;
            obj = obj[parts[j]];
        }
        return obj;
    }
    let ctx;
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i] && stack[i][first] !== undefined) {
            ctx = stack[i];
            break;
        }
    }
    if (!ctx) return undefined;
    return parts.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, ctx);
}

/** Schemes {{url}} lets through. Anything without a scheme (relative, //host) passes too. */
const _SAFE_URL_SCHEMES = ['http', 'https', 'mailto', 'tel'];

/**
 * Returns the URL unchanged when it is safe to put in href/src, otherwise "#".
 * Whitespace and control characters are ignored when reading the scheme,
 * because browsers drop them ("java\tscript:" runs as javascript:).
 * Same rules as Sanitizer::safe_url() in the PHP package.
 * @param {*} value
 * @returns {string}
 */
export function safeUrl(value) {
    const url = String(value ?? '');
    const scheme = url.replace(/[\x00-\x20]+/g, '').toLowerCase().match(/^([a-z][a-z0-9+.\-]*):/);
    return !scheme || _SAFE_URL_SCHEMES.includes(scheme[1]) ? url : '#';
}

/**
 * Registered helpers, shared by every renderer like the compiled-template cache.
 * @type {Map<string, Function>}
 */
const _helpers = new Map([['url', safeUrl]]);

/** @type {Set<string>} Unknown helper names already reported, so loops don't flood the console. */
const _reportedHelpers = new Set();

/**
 * Calls a helper at render time. Unknown helpers and helpers that throw
 * render as an empty string, with a console message.
 * @param {string} name
 * @param {Array<*>} args
 * @returns {*}
 */
function _callHelper(name, args) {
    const helper = _helpers.get(name);
    if (!helper) {
        if (!_reportedHelpers.has(name)) {
            _reportedHelpers.add(name);
            console.warn(`NanoRenderer: unknown helper "${name}"`);
        }
        return undefined;
    }
    try {
        return helper(...args);
    } catch (e) {
        console.error(`NanoRenderer: helper "${name}" threw:`, e);
        return undefined;
    }
}

// ---------------------------------------------------------------------------
// Named partials — {{> name}} and {{> name path}}
// ---------------------------------------------------------------------------

/** How deep partials may call partials (recursion included) before rendering stops. */
const _PARTIAL_DEPTH_LIMIT = 32;

/** Matches a partial tag's body after ">": a name, optionally followed by one path. */
const _PARTIAL_TAG_RE = /^([\w\-\/.]+)(?:\s+(\S+))?$/;

/** @type {Map<string, string>} Partial templates by name, shared by every renderer. */
const _partials = new Map();

/** @type {((name: string) => Promise<string|null>|string|null) | null} */
let _partialResolver = null;

/** @type {Map<string, Promise<void>>} Resolver calls in flight, so concurrent loads share one. */
const _pendingPartials = new Map();

/** @type {Set<string>} Missing partial names already reported. */
const _reportedPartials = new Set();

/** @type {Set<string>} Partials the resolver supplied (not registered explicitly). */
const _resolvedPartials = new Set();

/** Bumped by setPartialResolver(), so answers from a replaced resolver are dropped. */
let _resolverGeneration = 0;

/**
 * Returns the partial names a template references.
 * @param {string} template
 * @returns {string[]}
 */
function _partialNames(template) {
    return [...template.matchAll(/{{{?\s*(?:>|&gt;)\s*([\w\-\/.]+)/g)].map(m => m[1]);
}

/**
 * Makes sure a partial, and every partial it references, is registered,
 * asking the resolver for any that aren't.
 * @param {string} name
 * @param {Set<string>} visited Names already handled in this load, for cycles.
 * @returns {Promise<void>}
 */
async function _loadPartial(name, visited) {
    if (visited.has(name)) return;
    visited.add(name);

    if (!_partials.has(name) && _partialResolver) {
        if (!_pendingPartials.has(name)) {
            const generation = _resolverGeneration;
            const pending = Promise.resolve()
                .then(() => _partialResolver(name))
                .then(template => {
                    if (typeof template !== 'string' || generation !== _resolverGeneration) return;
                    _partials.set(name, template);
                    _resolvedPartials.add(name);
                })
                .catch(e => console.error(`NanoRenderer: partial resolver failed for "${name}":`, e))
                .finally(() => _pendingPartials.delete(name));
            _pendingPartials.set(name, pending);
        }
        await _pendingPartials.get(name);
    }

    const template = _partials.get(name);
    if (template !== undefined) {
        await Promise.all(_partialNames(template).map(child => _loadPartial(child, visited)));
    }
}

/** Valid helper names. A tag whose first word isn't one stays a plain lookup. */
const _HELPER_NAME_RE = /^[A-Za-z_][\w-]*$/;

/**
 * Splits helper arguments into literals and paths:
 * "strings" or 'strings', numbers, true/false/null, and dot paths.
 * @param {string} str
 * @returns {Array<{literal: *} | {path: string[]}>}
 */
function _parseArgs(str) {
    return [...str.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(([, dq, sq, word]) => {
        if (dq !== undefined) return { literal: dq };
        if (sq !== undefined) return { literal: sq };
        if (/^-?\d+(\.\d+)?$/.test(word)) return { literal: Number(word) };
        if (word === 'true' || word === 'false' || word === 'null') return { literal: JSON.parse(word) };
        return { path: word.split('.') };
    });
}

// ---------------------------------------------------------------------------
// NanoRenderer
// ---------------------------------------------------------------------------

/**
 * A compiler-based template renderer.
 * Compiles templates into JavaScript functions for high performance.
 */
export class NanoRenderer {
    constructor() {
        this.cache = new Map();
        this.render = this.render.bind(this);
    }

    /**
     * Registers a helper for every renderer, callable as {{name arg1 arg2}}
     * (escaped) or {{{name arg1}}} (raw). Arguments are positional: strings,
     * numbers, true/false/null, or paths. A tag with arguments is always a
     * helper call; a tag without arguments is always a data lookup.
     * Registering an existing name (including the built-in `url`) replaces it.
     * Components that render on the server too need the same helper
     * registered in PHP (NanoRenderer::register_helper).
     * @param {string} name
     * @param {Function} fn Receives the evaluated arguments; its return value is output.
     */
    static registerHelper(name, fn) {
        if (!_HELPER_NAME_RE.test(name)) throw new Error(`NanoRenderer: invalid helper name "${name}"`);
        _helpers.set(name, fn);
        _reportedHelpers.delete(name);
    }

    /**
     * Registers a named partial for every renderer, used as {{> name}} (shares
     * the caller's context) or {{> name path}} (renders with that value as its
     * only context). Partials may call themselves, up to a depth of 32.
     * @param {string} name
     * @param {string} template
     */
    static registerPartial(name, template) {
        _partials.set(name, template);
        _reportedPartials.delete(name);
        _resolvedPartials.delete(name);
    }

    /**
     * Sets the function that supplies partials that aren't registered. It is
     * called by name, may be async, and returns the template string or null.
     * Resolution happens before rendering (see loadPartials), never during it.
     *
     * Setting a resolver forgets every partial the previous one supplied, so
     * call it again whenever the source of partials changes. Partials
     * registered with registerPartial() are kept.
     * @param {((name: string) => Promise<string|null>|string|null) | null} resolver
     */
    static setPartialResolver(resolver) {
        for (const name of _resolvedPartials) _partials.delete(name);
        _resolvedPartials.clear();
        _reportedPartials.clear();
        _pendingPartials.clear();
        _resolverGeneration++;
        _partialResolver = resolver;
    }

    /**
     * Registers every partial a template uses, recursively, through the
     * resolver. NanoRenderStatefulElement calls this before its first render;
     * call it yourself before rendering a template with a bare NanoRenderer.
     * @param {string} template
     * @returns {Promise<void>}
     */
    static async loadPartials(template) {
        const visited = new Set();
        await Promise.all(_partialNames(template || '').map(name => _loadPartial(name, visited)));
    }

    /**
     * Renders a registered partial against a context stack.
     * @private
     * @param {string} name
     * @param {object[]} stack
     * @param {number} depth Partial nesting depth of this call.
     * @returns {string}
     */
    _renderPartial(name, stack, depth) {
        if (depth > _PARTIAL_DEPTH_LIMIT) {
            console.warn(`NanoRenderer: partials nested deeper than ${_PARTIAL_DEPTH_LIMIT} levels at "${name}"`);
            return '';
        }
        const template = _partials.get(name);
        if (template === undefined) {
            if (!_reportedPartials.has(name)) {
                _reportedPartials.add(name);
                console.warn(`NanoRenderer: unknown partial "${name}"`);
            }
            return '';
        }
        return this.compile(template)(undefined, stack, depth);
    }

    /**
     * Escapes a string to be safe for use in single-quoted string literals.
     * @param {string} str
     * @returns {string}
     */
    str(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
    }

    /**
     * Compiles a template string into a render function.
     * @param {string} template
     * @returns {(data: object) => string}
     */
    compile(template) {
        if (typeof template !== 'string') return () => '';
        if (this.cache.has(template)) return this.cache.get(template);

        // Preamble: set up output buffer, context stack, and a thin get() wrapper
        // that closes over `stack` while delegating to the module-level _get.
        // A partial sharing its caller's context receives a copy of the
        // caller's stack; everything else starts from `data`.
        let code = "let out = '';\n";
        code += "let stack = parentStack ? parentStack.slice() : [data];\n";
        code += "depth = depth || 0;\n";
        code += "const get = (parts) => _get(stack, parts);\n";

        // Tokenize: split on {{!-- comments --}}, {{{ ... }}} and {{ ... }} tags.
        // Long comments come first because they may contain "}}".
        const tokens = template.split(/((?:{{!--[\s\S]*?--}})|(?:{{{[\s\S]*?}}})|(?:{{[\s\S]*?}}))/g);
        const blockStack = [];

        // Helper: convert a dot-path string to a JSON array literal for get()
        const getPath = (str) => JSON.stringify(str.split('.'));

        // Builds the JS expression for an output tag's value:
        //   path || 'fallback'  →  the fallback replaces null/undefined
        //   name arg1 arg2      →  helper call (a tag with arguments)
        //   path                →  plain lookup
        const valueExpr = (expr) => {
            const fallbackMatch = expr.match(/^(.*?)\s*\|\|\s*(["'])(.*?)\2$/);
            if (fallbackMatch) {
                return `(get(${getPath(fallbackMatch[1].trim())}) ?? ${JSON.stringify(fallbackMatch[3])})`;
            }
            const call = expr.match(/^(\S+)\s+(\S[\s\S]*)$/);
            if (call && _HELPER_NAME_RE.test(call[1])) {
                const args = _parseArgs(call[2]).map(arg =>
                    'literal' in arg ? JSON.stringify(arg.literal) : `get(${JSON.stringify(arg.path)})`
                );
                return `(_helper(${JSON.stringify(call[1])}, [${args.join(', ')}]) ?? '')`;
            }
            return `(get(${getPath(expr)}) ?? '')`;
        };

        // Reports a malformed template; compile() then renders ''.
        const fail = (message) => {
            console.error(`NanoRenderer: ${message}`);
            return () => '';
        };

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (i % 2 === 0) {
                // Plain text
                if (token) code += `out += ${JSON.stringify(token)};\n`;
            } else if (token.startsWith('{{!')) {
                // {{! comment }} and {{!-- comment --}} produce no output
            } else {
                // Template tag
                const isTriple = token.startsWith('{{{');
                const content = isTriple ? token.slice(3, -3) : token.slice(2, -2);
                const trimmed = content.trim();
                const parts = trimmed.split(/\s+/);
                const type = parts[0];
                const args = parts.slice(1).join(' ');
                const top = blockStack[blockStack.length - 1];

                // "&gt;" too: a template read from a shadow root's innerHTML has ">" escaped.
                const partialMarker = trimmed.startsWith('>') ? 1 : trimmed.startsWith('&gt;') ? 4 : 0;

                if (partialMarker) {
                    // {{> name}} shares this context; {{> name path}} renders with only that value.
                    const partial = trimmed.slice(partialMarker).trim().match(_PARTIAL_TAG_RE);
                    if (!partial) return fail(`Invalid partial tag {{${trimmed}}}`);
                    const [, name, path] = partial;
                    const partialStack = path ? `[get(${getPath(path)}) ?? {}]` : 'stack';
                    code += `out += _partial(${JSON.stringify(name)}, ${partialStack}, depth + 1);\n`;

                } else if (type === '#if' || type === '#unless') {
                    const negate = type === '#unless' ? '!' : '';
                    blockStack.push({ type: type.slice(1), hasElse: false });
                    code += `if (${negate}get(${getPath(args)})) {\n`;

                } else if (type === 'else') {
                    if (!top || top.hasElse) return fail('Unexpected {{else}}');
                    top.hasElse = true;
                    if (top.type === 'each') {
                        code += `    stack.pop();\n`;
                        code += `  });\n`; // close forEach
                        code += `} else {\n`; // close 'if list.length > 0', open else
                    } else {
                        code += `} else {\n`;
                    }

                } else if (type === '/if' || type === '/unless') {
                    if (!top || top.type !== type.slice(1)) return fail(`Unexpected {{${type}}}`);
                    blockStack.pop();
                    code += `}\n`;

                } else if (type === '#each') {
                    blockStack.push({ type: 'each', hasElse: false });
                    code += `{\n`;
                    code += `const list = get(${getPath(args)});\n`;
                    code += `if (Array.isArray(list) && list.length > 0) {\n`;
                    code += `  list.forEach((item, index) => {\n`;
                    code += `    stack.push({ ...((typeof item === 'object' && item) || {}), this: item, index, '@index': index, '@first': index === 0, '@last': index === list.length - 1 });\n`;

                } else if (type === '/each') {
                    if (!top || top.type !== 'each') return fail('Unexpected {{/each}}');
                    blockStack.pop();
                    if (top.hasElse) {
                        // forEach and wrapping if were already closed by {{else}}
                        code += `}\n`; // close else block
                        code += `}\n`; // close outer scope
                    } else {
                        code += `    stack.pop();\n`;
                        code += `  });\n`; // close forEach
                        code += `}\n`; // close if Array.isArray
                        code += `}\n`; // close outer scope
                    }

                } else {
                    // {{ escaped }}, {{{ unescaped }}} or {{{ safe unescaped }}}
                    let expr = trimmed;
                    const isSafe = isTriple && expr.startsWith('safe ');
                    if (isSafe) expr = expr.substring(5).trim();

                    const valExpr = valueExpr(expr);
                    if (isSafe) code += `out += _sanitize(${valExpr});\n`;
                    else if (isTriple) code += `out += (${valExpr});\n`;
                    else code += `out += _escape(${valExpr});\n`;
                }
            }
        }

        // Catch unclosed blocks before trying to compile
        if (blockStack.length > 0) {
            const unclosed = blockStack.map(b => `{{#${b.type}}}`).join(', ');
            return fail(`Unclosed template block(s): ${unclosed}`);
        }

        code += "return out;";

        try {
            // Pass module-level helpers as parameters — no per-function copies
            const fn = new Function('data', '_escape', '_sanitize', '_get', '_helper', '_partial', 'parentStack', 'depth', code);
            const renderPartial = (name, stack, depth) => this._renderPartial(name, stack, depth);
            // Wrap so the public API is simply fn(data); partials also pass a stack and depth
            const bound = (data, parentStack, depth) =>
                fn(data, _escape, _sanitize, _get, _callHelper, renderPartial, parentStack, depth);
            this.cache.set(template, bound);
            return bound;
        } catch (e) {
            console.error("NanoCompiler Error:", e);
            console.warn("Template causing error:", template);
            console.warn("Generated Code:", code);
            return () => '';
        }
    }

    /**
     * Renders a template string against a data object.
     * @param {string} template
     * @param {object} data
     * @returns {string}
     */
    render(template, data) {
        try {
            return this.compile(template)(data || {});
        } catch (e) {
            console.error("NanoRenderer Runtime Error:", e);
            return '';
        }
    }
}

// ---------------------------------------------------------------------------
// Shared singleton — all NanoRenderStatefulElement instances use one cache,
// so each unique template string is compiled exactly once across the page.
// ---------------------------------------------------------------------------
export const _sharedNano = new NanoRenderer();

export class NanoRenderStatefulElement extends StatefulElement {
    /**
     * Returns the shared NanoRenderer's render function.
     * @returns {(template: string, data: object) => string}
     */
    getRenderer() {
        return _sharedNano.render;
    }

    /**
     * Loads the named partials the template uses before the first render.
     * @param {string} template
     * @returns {Promise<void>}
     */
    async prepareTemplate(template) {
        await NanoRenderer.loadPartials(template);
    }
}
