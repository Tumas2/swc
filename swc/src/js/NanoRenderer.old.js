import { StatefulElement } from "./StatefulElement.js";

/**
 * A simplified, regex-based template renderer.
 * @param {string} template - The template string (e.g., "Hello {{name}}").
 * @param {object} data - The data object to populate the template.
 * @returns {string} The rendered HTML string.
 */
export class NanoRendererOld {
    // Regex patterns are defined as static properties for clarity and potential overriding.
    static REGEX_EACH = /{{\s*#each\s+([a-zA-Z0-9_.]+)\s*}}(.*?)(?:{{\s*else\s*}}(.*?))?{{\s*\/each\s*}}/gs;
    static REGEX_IF = /{{\s*#if\s+([a-zA-Z0-9_.]+)\s*}}(.*?)(?:{{\s*else\s*}}(.*?))?{{\s*\/if\s*}}/gs;

    // Updated regex to optionally capture a fallback value: || 'fallback' or || "fallback"
    static REGEX_UNESCAPED = /{{\s*{\s*([a-zA-Z0-9_.]+)\s*(?:\|\|\s*(['"])(.*?)\2)?\s*}\s*}}/g;
    static REGEX_ESCAPED = /{{\s*([a-zA-Z0-9_.]+)\s*(?:\|\|\s*(['"])(.*?)\2)?\s*}}/g;

    constructor() {
        this.maxIterations = 100; // Safety break to prevent infinite loops

        // Bind the 'this' context of the render method to this instance.
        // This ensures 'this' is always correct, even when the render
        // method is passed as a reference to another class or function.
        this.render = this.render.bind(this);
    }

    /**
     * Safely gets a nested property from an object using a dot-notation string.
     * @param {object} context - The data object to search.
     * @param {string} path - The dot-notation path (e.g., "user.name").
     * @returns {*} The value, or null if not found (distinguishing from empty string).
     */
    #getValue(context, path) {
        // Handle 'this' for primitive values in an #each loop (e.g., {{#each stringArray}} {{this}} {{/each}})
        if (path === 'this' && (typeof context !== 'object' || context === null)) {
            return context;
        }

        // Handle 'this' when it refers to the object context
        if (path === 'this' && context?.this !== undefined) {
            return context.this;
        }

        let current = context;
        const parts = path.split('.');

        try {
            for (const part of parts) {
                if (current === null || typeof current === 'undefined') {
                    return null; // Use null to indicate "not found"
                }
                // Handle 'this.property'
                if (part === 'this' && context?.this !== undefined) {
                    current = context.this;
                } else {
                    current = current[part];
                }
            }

            if (typeof current === 'function') {
                return current();
            }

            // Return the value, even if it's null, undefined, 0, false, or ''
            return current;
        } catch (e) {
            return null; // Return null on error
        }
    }

    /**
     * Escapes HTML special characters for safe rendering.
     * @param {*} str - The value to escape (will be converted to string).
     * @returns {string} The escaped string.
     */
    #escapeHTML(str) {
        // Coerce to string, handling null/undefined
        const stringValue = String(str ?? '');
        return stringValue.replace(/[&<>"']/g, function (match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    /**
     * Renders a template string with the given data.
     * @param {string} template - The template string (e.g., "Hello {{name}}").
     * @param {object} data - The data object to populate the template.
     * @returns {string} The rendered HTML string.
     */
    render(template, data) {
        if (typeof template !== 'string') {
            return '';
        }
        let output = template;
        let iterations = 0;
        let lastOutput = '';

        // Keep processing until the template stops changing
        while (output !== lastOutput && iterations < this.maxIterations) {
            lastOutput = output;
            iterations++;

            // 1. Process {{#each}} blocks (with {{else}})
            output = output.replace(NanoRendererOld.REGEX_EACH, (match, arrayName, eachContent, elseContent) => {
                const array = this.#getValue(data, arrayName);
                if (Array.isArray(array) && array.length > 0) {
                    return array.map(item => {
                        // ** THE FIX IS HERE **
                        // Create a new context by merging the parent 'data'
                        // and adding the current 'item' as the 'this' property.
                        const itemContext = {
                            ...data, // Keep the parent context
                            this: item // Add the current item as 'this'
                        };
                        // Recursively render the inner content with the new context.
                        return this.render(eachContent, itemContext);
                    }).join('');
                } else if (elseContent !== undefined) {
                    // If array is empty or not an array, render the else block if it exists
                    return this.render(elseContent, data);
                }
                return ''; // If no array and no else block, remove the block
            });

            // 2. Process {{#if}} blocks (with {{else}})
            output = output.replace(NanoRendererOld.REGEX_IF, (match, conditionName, ifContent, elseContent) => {
                const value = this.#getValue(data, conditionName);
                let isTruthy = false;

                // Check for "truthiness" (not false, null, undefined, 0, "", or empty array)
                if (Array.isArray(value)) {
                    isTruthy = value.length > 0;
                } else {
                    isTruthy = !!value;
                }

                if (isTruthy) {
                    return this.render(ifContent, data);
                } else if (elseContent !== undefined) {
                    // Render the else block if it exists
                    return this.render(elseContent, data);
                }
                return ''; // No match and no else block
            });
        }

        if (iterations === this.maxIterations) {
            console.error("Renderer reached max iterations. Possible infinite loop.");
            return "<p style='color:red;'>Error: Renderer timed out. Check for malformed blocks.</p>";
        }

        // 3. Process Unescaped (raw) variables: {{{variable || "fallback"}}}
        output = output.replace(NanoRendererOld.REGEX_UNESCAPED, (match, path, quote, fallback) => {
            const value = this.#getValue(data, path);
            // Use value if it's not null or undefined
            if (value !== null && value !== undefined) {
                return value;
            }
            // Otherwise, use fallback if it exists
            if (fallback !== undefined) {
                return fallback;
            }
            return ''; // Default to empty string
        });

        // 4. Process Escaped variables: {{variable || "fallback"}}
        output = output.replace(NanoRendererOld.REGEX_ESCAPED, (match, path, quote, fallback) => {
            const value = this.#getValue(data, path);
            // Use value if it's not null or undefined
            if (value !== null && value !== undefined) {
                return this.#escapeHTML(value);
            }
            // Otherwise, use fallback if it exists
            if (fallback !== undefined) {
                return this.#escapeHTML(fallback);
            }
            return ''; // Default to empty string
        });

        return output;
    }
}

export class NanoRenderOldStatefulElement extends StatefulElement {
    getRenderer() {
        const renderer = new NanoRendererOld();
        return renderer.render;
    }
}