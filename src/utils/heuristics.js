/**
 * Heuristic extraction: when JSON can't be parsed, try to extract structured fields
 * from headings and labeled content in free text.
 */
function extractStructuredFromRaw(text, term) {
    if (!text || typeof text !== "string") {
        return null;
    }
    const raw = String(text);

    // normalize newlines
    const norm = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const sections = {};

    // helper to find section by heading words (Definition, Types, Key Aspects, Examples, Steps, Notes, Related)
    const headingNames = {
        definition: ["definition", "meaning", "what is"],
        types: ["types", "categories", "kinds"],
        keyAspects: ["key aspects", "key points", "key elements", "features", "aspects"],
        examples: ["examples", "example"],
        stepByStep: ["step-by-step", "steps", "procedure", "how to"],
        notes: ["notes", "additional notes", "remarks"],
        relatedTerms: ["related", "related terms", "see also"],
    };

    // Function to find heading and capture until next heading or blank line double break
    function capture(aliases) {
        for (const a of aliases) {
            // Match markdown style headings like ## Definition or plain "Definition:" or "Definition\n----"
            const regexes = [
                new RegExp(`^#{1,3}\\s*${a}\\b[\\s\\S]*?$`, "gim"),
                new RegExp(`^${a}\\s*[:\\\-–]\\s*([\\s\\S]*?)(?=^\\w+:|^#{1,3}\\s|\\n\\n)`, "gim"),
                new RegExp(`${a}\\s*[:\\\-–]\\s*([\\s\\S]*?)(?=\\n\\n)`, "i"),
                new RegExp(`^${a}\\*$([\\s\\S]*?)(?=^\\w+:|^#{1,3}\\s|\\n\\n)`, "gim"),
            ];
            for (const rx of regexes) {
                const m = rx.exec(norm);
                if (m) {
                    // If capture group exists, prefer it; else use whole match and strip heading
                    const captured = (m[1] || m[0])
                        .replace(new RegExp(`^#{1,3}\\s*${a}\\b[:\\s-–]*`, "i"), "")
                        .trim();
                    if (captured) return captured;
                }
            }
        }
        return null;
    }

    // Basic paragraph fallback: first non-empty paragraph is definition
    const paragraphs = norm
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

    // attempt to parse labeled bullets like "Examples: - ... - ..." or numbered list
    function extractListFromText(sectionText) {
        if (!sectionText) return [];
        // split by lines and trim dash/number prefixes
        const lines = sectionText
            .split(/\n/)
            .map((l) =>
                l
                    .replace(/^[\s]*[-•\*]\\s*/, "")
                    .replace(/^\d+\.\\s*/, "")
                    .trim()
            )
            .filter(Boolean);
        // if only one long line but commas separate examples, split by semicolon or '•'
        if (lines.length === 1 && /;|•|,/.test(lines[0]) && lines[0].length > 60) {
            return lines[0]
                .split(/;|•|, (?=[A-Z0-9])/)
                .map((s) => s.trim())
                .filter(Boolean);
        }
        return lines;
    }

    // find definition
    let def = capture(headingNames.definition) || paragraphs[0] || "";
    def = def.replace(/^[\s\-–:]+/, "").trim();

    // types
    const typesText = capture(headingNames.types);
    const types = extractListFromText(typesText || "");

    // key aspects
    const aspectsText = capture(headingNames.keyAspects);
    const keyAspects = extractListFromText(aspectsText || "");

    // examples
    const examplesText = capture(headingNames.examples);
    const examples = extractListFromText(examplesText || "");

    // steps
    const stepsText = capture(headingNames.stepByStep);
    const stepByStep = extractListFromText(stepsText || "").length
        ? extractListFromText(stepsText || "")
        : (norm.match(/(?:\n|^)\d+\.\\s+.+/g) || []).map((l) =>
              l.replace(/^\s*\d+\.\\s+/, "").trim()
          );

    // notes
    const notes = capture(headingNames.notes) || "";

    // related
    const relatedText = capture(headingNames.relatedTerms);
    const relatedTerms = extractListFromText(relatedText || "");

    // If nothing much found, attempt weak heuristics: look for lines starting with "Definition", "Examples", etc. anywhere
    function quickFind(label) {
        const rx = new RegExp(`${label}\\s*[:\\\-–]\\s*([\\s\\S]{1,500})`, "i");
        const m = rx.exec(norm);
        return m ? m[1].split(/\n/)[0].trim() : null;
    }

    if (!def || def.length < 20) {
        def = def || quickFind("Definition") || paragraphs[0] || "";
    }

    // Build structured object
    const structured = {
        term: term || "",
        definition: def || "",
        types: types || [],
        keyAspects: keyAspects || [],
        examples: examples || [],
        stepByStep: stepByStep || [],
        notes: notes || "",
        relatedTerms: relatedTerms || [],
        raw: raw,
    };

    // if structured has almost nothing, return null to indicate failure
    const meaningfulCount =
        (structured.definition ? 1 : 0) +
        (structured.keyAspects.length ? 1 : 0) +
        (structured.examples.length ? 1 : 0);
    if (meaningfulCount === 0) return structured; // still return, frontend will fallback to definition paragraph

    return structured;
}

module.exports = { extractStructuredFromRaw };
