/**
 * Attempts to parse JSON from messy text and apply common repairs
 */
function safeParseJsonFromText(text) {
    if (!text || typeof text !== "string") return null;

    // 1) strip fenced blocks and obvious markdown wrapper lines
    let s = String(text)
        .replace(/```(?:json)?/gi, "")
        .replace(/```/g, "")
        .replace(/^Here['']s.*structured.*json[\s\S]*?:/i, "")
        .replace(/^Here's a structured.*?:/i, "")
        .trim();

    // try direct parse
    try {
        return JSON.parse(s);
    } catch (e) {
        /* continue */
    }

    // helper repairs
    const repairs = [];

    // remove common markdown formatting but keep content
    repairs.push(s.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1"));

    // remove blockquote > and leading bullets
    repairs.push(s.replace(/^\s*>+\s?/gm, ""));

    // attempt to extract first {...} block
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
        repairs.push(s.slice(first, last + 1));
    }

    // attempts to fix trailing commas, single quotes, and unquoted keys
    function fixCommonIssues(candidate) {
        if (!candidate) return candidate;
        // remove inline comments
        candidate = candidate.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
        // convert single quotes to double quotes cautiously (only for values)
        candidate = candidate.replace(/'([^']*?)'/g, function (_, inner) {
            // if inner contains double quotes, keep original single to avoid corruption
            if (inner.includes('"')) return `"${inner.replace(/"/g, '\\"')}"`;
            return `"${inner}"`;
        });
        // remove trailing commas before } or ]
        candidate = candidate.replace(/,\s*([}\]])/g, "$1");
        // quote unquoted keys: { key: ... } => { "key": ... }
        candidate = candidate.replace(/([\{\s,])([A-Za-z0-9_@\$-]+)\s*:/g, '$1"$2":');
        return candidate;
    }

    for (const r of repairs) {
        try {
            const p = JSON.parse(r);
            if (p && typeof p === "object") return p;
        } catch {
            /* try repaired version */
        }

        try {
            const repaired = fixCommonIssues(r);
            const p2 = JSON.parse(repaired);
            if (p2 && typeof p2 === "object") return p2;
        } catch {
            /* continue */
        }
    }

    // final attempt: look for the first balanced curly block and progressively widen
    const idxs = [];
    for (let i = 0; i < s.length; i++) if (s[i] === "{") idxs.push(i);
    for (const i of idxs) {
        for (let j = s.length - 1; j > i; j--) {
            if (s[j] !== "}") continue;
            const candidate = s.slice(i, j + 1);
            try {
                const p3 = JSON.parse(candidate);
                if (p3 && typeof p3 === "object") return p3;
            } catch {
                try {
                    const repaired = fixCommonIssues(candidate);
                    const p4 = JSON.parse(repaired);
                    if (p4 && typeof p4 === "object") return p4;
                } catch {
                    /* keep trying */
                }
            }
        }
    }

    return null;
}

module.exports = { safeParseJsonFromText };
