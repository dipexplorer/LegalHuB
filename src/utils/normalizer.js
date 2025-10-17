/**
 * Normalize keys from various AI outputs to expected canonical keys.
 * Handles snake_case and alternate field names.
 */
function normalizeParsedKeys(parsed = {}, fallbackTerm = "") {
    if (!parsed || typeof parsed !== "object") return parsed;
    const out = {};

    // helper to get possible aliases
    function pick(...names) {
        for (const n of names) {
            if (typeof parsed[n] !== "undefined") return parsed[n];
            // also try lower-case key variations
            const lower = Object.keys(parsed).find((k) => k.toLowerCase() === n.toLowerCase());
            if (lower) return parsed[lower];
        }
        return undefined;
    }

    out.term = pick("term", "Term") || fallbackTerm || "";
    out.definition =
        pick("definition", "Definition", "def", "meaning", "description") || parsed.raw || "";
    // types can be array or comma string
    let types = pick("types", "type", "categories", "kinds");
    if (typeof types === "string" && types.includes(","))
        types = types.split(",").map((s) => s.trim());
    out.types = Array.isArray(types) ? types : types ? [types] : [];

    // key aspects: many possible inputs: keyAspects, key_aspects, key_aspect, key_aspects_object
    let keyAspects = pick(
        "keyAspects",
        "key_aspects",
        "key_aspect",
        "keyAspectsObject",
        "key_aspects_object",
        "key_aspects_details"
    );
    // if parsed has 'key_aspects' as an object with nested fields, convert to array of items
    if (keyAspects && typeof keyAspects === "object" && !Array.isArray(keyAspects)) {
        // convert object keys to descriptive entries
        const arr = [];
        for (const [k, v] of Object.entries(keyAspects)) {
            // push an object with name = k and content = v
            arr.push({ name: k, ...(typeof v === "object" ? v : { description: String(v) }) });
        }
        keyAspects = arr;
    } else if (typeof keyAspects === "string") {
        // split by newlines or semicolons
        keyAspects = keyAspects
            .split(/\n|;|•|, (?=[A-Z0-9])/)
            .map((s) => s.trim())
            .filter(Boolean);
    }
    out.keyAspects = Array.isArray(keyAspects) ? keyAspects : keyAspects ? [keyAspects] : [];

    // examples
    let examples = pick("examples", "example", "Examples");
    if (typeof examples === "string") {
        examples = examples
            .split(/\n|;|•/)
            .map((s) => s.trim())
            .filter(Boolean);
    }
    out.examples = Array.isArray(examples) ? examples : examples ? [examples] : [];

    // stepByStep
    let stepByStep = pick("stepByStep", "steps", "procedure", "step_by_step", "step-by-step");
    if (typeof stepByStep === "string") {
        stepByStep = stepByStep
            .split(/\n|;|•/)
            .map((s) => s.trim())
            .filter(Boolean);
    }
    out.stepByStep = Array.isArray(stepByStep) ? stepByStep : stepByStep ? [stepByStep] : [];

    // notes
    out.notes = pick("notes", "note", "remarks") || "";

    // relatedTerms
    let relatedTerms = pick("relatedTerms", "related", "related_terms", "see_also", "seeAlso");
    if (typeof relatedTerms === "string") {
        relatedTerms = relatedTerms
            .split(/\n|;|, /)
            .map((s) => s.trim())
            .filter(Boolean);
    }
    out.relatedTerms = Array.isArray(relatedTerms)
        ? relatedTerms
        : relatedTerms
          ? [relatedTerms]
          : [];

    // raw: keep original raw if provided
    out.raw = parsed.raw || parsed.text || JSON.stringify(parsed);

    // Also attempt to find nested specialized sections (e.g., grounds_for_divorce, legal_consequences) and fold them into keyAspects
    // Common deep keys we want to surface: grounds_for_divorce, legal_consequences, jurisdictional_variations
    const deepAliases = [
        "grounds_for_divorce",
        "groundsForDivorce",
        "legal_consequences",
        "legalConsequences",
        "jurisdictional_variations",
        "jurisdictionalVariations",
    ];
    for (const alias of deepAliases) {
        if (typeof parsed[alias] !== "undefined") {
            const v = parsed[alias];
            if (typeof v === "object") {
                // If it looks like a list or object of topics, push into keyAspects with the alias as name
                out.keyAspects.push({ name: alias.replace(/_/g, " "), ...v });
            } else {
                out.keyAspects.push(String(v));
            }
        }
    }

    return out;
}

module.exports = { normalizeParsedKeys };
