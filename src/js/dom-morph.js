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

    // Sync children using live NodeLists to avoid array allocations per recursive call
    const fromChildren = fromNode.childNodes;
    const toChildren = toNode.childNodes;
    const toLength = toChildren.length;

    for (let i = 0; i < toLength; i++) {
        const toChild = toChildren[i];
        const fromChild = fromChildren[i];

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
    while (fromChildren.length > toLength) {
        fromNode.removeChild(fromNode.lastChild);
    }
}
