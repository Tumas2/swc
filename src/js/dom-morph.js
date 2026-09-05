/**
 * Deeply morphs a DOM node to match a target node.
 * This function updates the existing DOM in place, preserving state like
 * input focus and CSS transitions.
 *
 * @param {Node} fromNode - The existing DOM node to update.
 * @param {Node} toNode - The new DOM node (usually from a template) to match.
 */
export function morph(fromNode, toNode) {
    if (fromNode.isEqualNode(toNode)) return;

    // Sync text nodes
    if (fromNode.nodeType === Node.TEXT_NODE && toNode.nodeType === Node.TEXT_NODE) {
        if (fromNode.textContent !== toNode.textContent) {
            fromNode.textContent = toNode.textContent;
        }
        return;
    }

    // Sync attributes and properties for element nodes
    if (fromNode.nodeType === Node.ELEMENT_NODE && toNode.nodeType === Node.ELEMENT_NODE) {
        // Remove attributes not present in the new node
        const fromAttrs = fromNode.attributes;
        for (let i = fromAttrs.length - 1; i >= 0; i--) {
            const attr = fromAttrs[i];
            if (!toNode.hasAttribute(attr.name)) {
                fromNode.removeAttribute(attr.name);
            }
        }

        // Add or update attributes from the new node
        const toAttrs = toNode.attributes;
        for (let i = 0; i < toAttrs.length; i++) {
            const attr = toAttrs[i];
            if (fromNode.getAttribute(attr.name) !== attr.value) {
                fromNode.setAttribute(attr.name, attr.value);
            }
        }

        // Sync properties not reflected in HTML attributes
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(fromNode.nodeName)) {
            if (fromNode.value !== toNode.value) {
                fromNode.value = toNode.value;
            }
        }
        if (fromNode.nodeName === 'INPUT' && fromNode.checked !== toNode.checked) {
            fromNode.checked = toNode.checked;
        }
    }

    morphChildren(fromNode, toNode);
}

/**
 * Reads the `key` attribute off a node, or null if it has none.
 * @param {Node} node
 * @returns {string | null}
 */
function keyOf(node) {
    return node.nodeType === Node.ELEMENT_NODE ? node.getAttribute('key') : null;
}

/**
 * Syncs `fromNode`'s children to match `toNode`'s.
 *
 * Children are matched by position by default, which is fine for stable markup
 * but wrong the moment a child moves — a conditional block appears above it, or
 * a list reorders. Positional matching then falls through to `replaceChild`,
 * which destroys the element. For a nested component that means tearing down
 * its shadow root, its store subscriptions and any state it was holding.
 *
 * A `key` attribute opts a child out of that. Keyed children are matched by
 * identity and moved into place instead of being replaced, so the element
 * survives a reorder intact.
 *
 * @param {Node} fromNode
 * @param {Node} toNode
 */
function morphChildren(fromNode, toNode) {
    const toChildren = toNode.childNodes;
    const toLength = toChildren.length;

    // Index the existing keyed children up front. Built lazily — markup without
    // keys pays nothing beyond the scan.
    let keyed = null;
    for (const node of fromNode.childNodes) {
        const key = keyOf(node);
        if (key !== null) {
            (keyed ??= new Map()).set(key, node);
        }
    }

    for (let i = 0; i < toLength; i++) {
        const toChild = toChildren[i];

        // Live lookup — an earlier iteration may have moved a node into place.
        let fromChild = fromNode.childNodes[i];

        const toKey = keyOf(toChild);
        if (toKey !== null && keyed) {
            const match = keyed.get(toKey);
            if (match) {
                // Move the existing element to this position rather than
                // replacing whatever happens to be sitting here.
                if (match !== fromChild) {
                    fromNode.insertBefore(match, fromChild ?? null);
                }
                fromChild = match;
            }
        }

        if (!fromChild) {
            // New node — append it
            fromNode.appendChild(toChild.cloneNode(true));
        } else if (fromChild.nodeName !== toChild.nodeName || fromChild.nodeType !== toChild.nodeType) {
            // Different node type — replace it
            fromNode.replaceChild(toChild.cloneNode(true), fromChild);
        } else {
            // Same node type — recurse
            morph(fromChild, toChild);
        }
    }

    // Remove extra children from the old node
    while (fromNode.childNodes.length > toLength) {
        fromNode.removeChild(fromNode.lastChild);
    }
}
