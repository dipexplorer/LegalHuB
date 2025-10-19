const { normalizeParsedKeys } = require("./normalizer");

/**
 * Basic HTML-escape to avoid XSS, then do highlighting on escaped text
 */
function escapeHtml(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * highlightTerm: wrap occurrences of term with <mark class="highlight">...</mark>
 * case-insensitive, word-boundary friendly; works after we've escaped HTML
 */
function highlightTerm(text = "", term = "") {
    if (!term || !text) return escapeHtml(text);
    // escape term for regex
    const safeTerm = String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // use a global case-insensitive regex
    const rx = new RegExp(`(${safeTerm})`, "ig");
    const escaped = escapeHtml(text);
    return escaped.replace(rx, '<mark class="highlight">$1</mark>');
}

/**
 * Converts any nested object/array into readable HTML (recursive).
 * - Strings: highlighted text
 * - Arrays: <ul> with each item rendered
 * - Objects: <dl> or <ul> with small headings
 */
function renderAnyToHtml(value, term = "", keyLabel = null) {
    if (value === null || typeof value === "undefined") return "";
    // primitive
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `<span>${highlightTerm(String(value), term)}</span>`;
    }
    // array
    if (Array.isArray(value)) {
        let out = "<ul>";
        for (const item of value) {
            out += `<li>${renderAnyToHtml(item, term)}</li>`;
        }
        out += "</ul>";
        return out;
    }
    // object
    if (typeof value === "object") {
        // If object looks like { description: "...", examples: [...], steps: [...] } render a small heading and its pieces
        const keys = Object.keys(value);
        // If object has name/title and description, render them compactly
        if ((value.name || value.title) && (value.description || value.summary)) {
            const title = value.name || value.title;
            const desc = value.description || value.summary || "";
            let out = `<div class="obj-block"><strong>${escapeHtml(String(title))}</strong>`;
            if (desc) out += `<div>${highlightTerm(String(desc), term)}</div>`;
            // render remaining keys
            const otherKeys = keys.filter(
                (k) => !["name", "title", "description", "summary"].includes(k)
            );
            if (otherKeys.length) {
                out += "<div class='obj-children'>";
                for (const k of otherKeys) {
                    out += `<div class="obj-child"><em>${escapeHtml(String(k))}:</em> ${renderAnyToHtml(value[k], term, k)}</div>`;
                }
                out += "</div>";
            }
            out += "</div>";
            return out;
        }

        // default: render key / value pairs as list
        let out = "<ul class='obj-list'>";
        for (const k of keys) {
            const displayKey = keyLabel || k;
            out += `<li><strong>${escapeHtml(String(displayKey))}:</strong> ${renderAnyToHtml(value[k], term, k)}</li>`;
        }
        out += "</ul>";
        return out;
    }

    // fallback
    return escapeHtml(String(value));
}

/**
 * Converts structured object fields into HTML strings suitable for the EJS partial.
 * Returns an object: { definitionHtml, aspectsHtml, examplesHtml, stepByStep, notes, relatedTerms }
 */
function convertStructuredToHtml(structured = {}, term = "") {
    // First normalize incoming keys (in case convertStructuredToHtml is called directly)
    const normalized = normalizeParsedKeys(structured, structured.term || term || "");

    // definition: may be string or object { short, detailed }
    let definitionHtml = "";
    try {
        const d = normalized.definition;
        if (d && typeof d === "object") {
            // { short, detailed } or similar
            const short = d.short || d.summary || d.shortDescription || d.description || "";
            const detailed = d.detailed || d.long || d.full || "";
            const shortHtml = short
                ? `<div class="def-short">${renderAnyToHtml(short, term)}</div>`
                : "";
            const detailedHtml = detailed
                ? `<div class="def-detailed" style="margin-top:8px;">${renderAnyToHtml(detailed, term)}</div>`
                : "";
            definitionHtml = shortHtml + detailedHtml;
        } else {
            definitionHtml = renderAnyToHtml(String(d || normalized.raw || ""), term);
        }
    } catch (e) {
        definitionHtml = escapeHtml(String(structured.definition || structured.raw || ""));
    }

    // key aspects: use renderAnyToHtml but attempt to make top-level items prettier
    let aspectsHtml = "";
    try {
        const ka = normalized.keyAspects || [];
        if (Array.isArray(ka) && ka.length) {
            // render each aspect as either a string or an object block
            let out = "<div class='key-aspects'>";
            for (const item of ka) {
                // if item is string -> simple paragraph
                if (typeof item === "string") {
                    out += `<div class="aspect-item">${renderAnyToHtml(item, term)}</div>`;
                } else {
                    // object -> show name/title if present, else render object
                    const title = item.name || item.title;
                    if (title) {
                        out += `<div class="aspect-item"><strong>${escapeHtml(String(title))}</strong>`;
                        // render rest
                        const copy = Object.assign({}, item);
                        delete copy.name;
                        delete copy.title;
                        if (Object.keys(copy).length) {
                            out += `<div class="aspect-details">${renderAnyToHtml(copy, term)}</div>`;
                        }
                        out += `</div>`;
                    } else {
                        out += `<div class="aspect-item">${renderAnyToHtml(item, term)}</div>`;
                    }
                }
            }
            out += "</div>";
            aspectsHtml = out;
        } else if (normalized.keyAspects && typeof normalized.keyAspects === "string") {
            aspectsHtml = `<div>${renderAnyToHtml(normalized.keyAspects, term)}</div>`;
        }
    } catch (e) {
        aspectsHtml = escapeHtml(String(structured.keyAspects || ""));
    }

    // examplesHtml => renderAnyToHtml
    let examplesHtml = "";
    try {
        const ex = normalized.examples || [];
        if (Array.isArray(ex) && ex.length) {
            examplesHtml = renderAnyToHtml(ex, term);
        } else if (typeof normalized.examples === "string") {
            examplesHtml = renderAnyToHtml(normalized.examples, term);
        }
    } catch (e) {
        examplesHtml = escapeHtml(String(structured.examples || ""));
    }

    // stepByStep: keep as array (will be passed to partial)
    const stepByStep = Array.isArray(normalized.stepByStep)
        ? normalized.stepByStep.map((s) => String(s))
        : normalized.stepByStep
          ? [String(normalized.stepByStep)]
          : [];

    // notes: string or object
    let notes = "";
    try {
        notes = normalized.notes ? renderAnyToHtml(String(normalized.notes), term) : "";
    } catch (e) {
        notes = escapeHtml(String(normalized.notes || ""));
    }

    // relatedTerms: array of strings
    const relatedTerms = Array.isArray(normalized.relatedTerms)
        ? normalized.relatedTerms.map((r) => String(r))
        : normalized.relatedTerms
          ? [String(normalized.relatedTerms)]
          : [];

    return { definitionHtml, aspectsHtml, examplesHtml, stepByStep, notes, relatedTerms };
}

module.exports = {
    escapeHtml,
    highlightTerm,
    renderAnyToHtml,
    convertStructuredToHtml,
};
