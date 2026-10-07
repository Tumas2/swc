import { StatefulElement } from "./StatefulElement.js";

// ---------------------------------------------------------------------------
// Module-level helpers — defined once, shared across all compiled templates.
// ---------------------------------------------------------------------------

/** @type {Record<string, string>} */
const _ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '/': '&#x2F;' };

/**
 * Escapes a value for safe HTML text output.
 * @param {*} str
 * @returns {string}
 */
function _escape(str) {
    return String(str ?? '').replace(/[&<>'"\/]/g, c => _ESCAPE_MAP[c]);
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
        let code = "let out = '';\n";
        code += "let stack = [data];\n";
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

                if (type === '#if' || type === '#unless') {
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
            const fn = new Function('data', '_escape', '_sanitize', '_get', '_helper', code);
            // Wrap so the public API is simply fn(data)
            const bound = (data) => fn(data, _escape, _sanitize, _get, _callHelper);
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
    getRenderer() {
        return _sharedNano.render;
    }
}
