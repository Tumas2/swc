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

        // Tokenize: split on {{ ... }} and {{{ ... }}} tags
        const tokens = template.split(/((?:{{{[\s\S]*?}}})|(?:{{[\s\S]*?}}))/g);
        const blockStack = [];

        // Helper: convert a dot-path string to a JSON array literal for get()
        const getPath = (str) => JSON.stringify(str.split('.'));

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (i % 2 === 0) {
                // Plain text
                if (token) code += `out += ${JSON.stringify(token)};\n`;
            } else {
                // Template tag
                const isTriple = token.startsWith('{{{');
                const content = isTriple ? token.slice(3, -3) : token.slice(2, -2);
                const trimmed = content.trim();
                const parts = trimmed.split(/\s+/);
                const type = parts[0];
                const args = parts.slice(1).join(' ');

                if (type === '#if') {
                    blockStack.push({ type: 'if' });
                    code += `if (get(${getPath(args)})) {\n`;

                } else if (type === 'else') {
                    const top = blockStack[blockStack.length - 1];
                    if (top && top.type === 'each') {
                        top.hasElse = true;
                        code += `    stack.pop();\n`;
                        code += `  });\n`; // close forEach
                        code += `} else {\n`; // close 'if list.length > 0', open else
                    } else {
                        code += `} else {\n`;
                    }

                } else if (type === '/if') {
                    blockStack.pop();
                    code += `}\n`;

                } else if (type === '#each') {
                    blockStack.push({ type: 'each', hasElse: false });
                    code += `{\n`;
                    code += `const list = get(${getPath(args)});\n`;
                    code += `if (Array.isArray(list) && list.length > 0) {\n`;
                    code += `  list.forEach((item, index) => {\n`;
                    code += `    stack.push({ ...((typeof item === 'object' && item) || {}), this: item, index });\n`;

                } else if (type === '/each') {
                    const top = blockStack.pop();
                    if (top && top.hasElse) {
                        // forEach and wrapping if were already closed by {{else}}
                        code += `}\n`; // close else block
                        code += `}\n`; // close outer scope
                    } else {
                        code += `    stack.pop();\n`;
                        code += `  });\n`; // close forEach
                        code += `}\n`; // close if Array.isArray
                        code += `}\n`; // close outer scope
                    }

                } else if (isTriple) {
                    // {{{ unescaped }}} or {{{ safe unescaped }}}
                    let raw = trimmed;
                    let isSafe = false;

                    if (raw.startsWith('safe ')) {
                        isSafe = true;
                        raw = raw.substring(5).trim();
                    }

                    const fallbackMatch = raw.match(/^(.*?)\s*\|\|\s*(["'])(.*?)\2$/);
                    let valExpr, fallback;

                    if (fallbackMatch) {
                        valExpr = `get(${getPath(fallbackMatch[1].trim())})`;
                        fallback = JSON.stringify(fallbackMatch[3]);
                    } else {
                        valExpr = `get(${getPath(raw)})`;
                        fallback = "''";
                    }

                    code += isSafe
                        ? `out += _sanitize(${valExpr} ?? ${fallback});\n`
                        : `out += (${valExpr} ?? ${fallback});\n`;

                } else {
                    // {{ escaped }}
                    const fallbackMatch = trimmed.match(/^(.*?)\s*\|\|\s*(["'])(.*?)\2$/);
                    if (fallbackMatch) {
                        const valExpr = `get(${getPath(fallbackMatch[1].trim())})`;
                        const fallback = JSON.stringify(fallbackMatch[3]);
                        code += `out += _escape(${valExpr} ?? ${fallback});\n`;
                    } else {
                        code += `out += _escape(get(${getPath(trimmed)}) ?? '');\n`;
                    }
                }
            }
        }

        // Catch unclosed blocks before trying to compile
        if (blockStack.length > 0) {
            const unclosed = blockStack.map(b => `{{#${b.type}}}`).join(', ');
            console.error(`NanoRenderer: Unclosed template block(s): ${unclosed}`);
            return () => '';
        }

        code += "return out;";

        try {
            // Pass module-level helpers as parameters — no per-function copies
            const fn = new Function('data', '_escape', '_sanitize', '_get', code);
            // Wrap so the public API is simply fn(data)
            const bound = (data) => fn(data, _escape, _sanitize, _get);
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
