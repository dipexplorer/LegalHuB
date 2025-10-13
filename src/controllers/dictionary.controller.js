// src/controllers/dictionary.controller.js
const axios = require("axios");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const asyncHandler = require("../utils/asyncHandler.js");
const User = require("../models/user.model.js");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SAMPLE_FAKE = (term = "sample") => ({
  term,
  definition: "A short, sample definition for development purposes.",
  types: ["General"],
  keyAspects: [
    "This is a sample aspect describing the key element.",
    "Use USE_FAKE_DATA=true in .env to enable this fallback."
  ],
  examples: ["Example: This is a sample usage example."],
  stepByStep: ["Step 1: Sample", "Step 2: Sample"],
  notes: "This is fake/sample data returned because the real AI call is unavailable.",
  relatedTerms: ["Example", "Demonstration"],
  raw: "Full fallback explanatory text for the term (development only)."
});

/**
 * Attempts many recoveries to parse JSON embedded in messy text
 */
function safeParseJsonFromText(text) {
  if (!text || typeof text !== "string") return null;

  // 1) strip fenced blocks and obvious markdown wrapper lines
  let s = String(text)
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/^Here['’]s.*structured.*json[\s\S]*?:/i, "")
    .replace(/^Here’s a structured.*?:/i, "")
    .trim();

  // try direct parse
  try { return JSON.parse(s); } catch (e) { /* continue */ }

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
    } catch { /* try repaired version */ }

    try {
      const repaired = fixCommonIssues(r);
      const p2 = JSON.parse(repaired);
      if (p2 && typeof p2 === "object") return p2;
    } catch { /* continue */ }
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
        } catch { /* keep trying */ }
      }
    }
  }

  return null;
}

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
    relatedTerms: ["related", "related terms", "see also"]
  };

  // Function to find heading and capture until next heading or blank line double break
  function capture(aliases) {
    for (const a of aliases) {
      // Match markdown style headings like ## Definition or plain "Definition:" or "Definition\n----"
      const regexes = [
        new RegExp(`^#{1,3}\\s*${a}\\b[\\s\\S]*?$`, "gim"),
        new RegExp(`^${a}\\s*[:\\-–]\\s*([\\s\\S]*?)(?=^\\w+:|^#{1,3}\\s|\\n\\n)`, "gim"),
        new RegExp(`${a}\\s*[:\\-–]\\s*([\\s\\S]*?)(?=\\n\\n)`, "i"),
        new RegExp(`^${a}\\s*$([\\s\\S]*?)(?=^\\w+:|^#{1,3}\\s|\\n\\n)`, "gim")
      ];
      for (const rx of regexes) {
        const m = rx.exec(norm);
        if (m) {
          // If capture group exists, prefer it; else use whole match and strip heading
          const captured = (m[1] || m[0]).replace(new RegExp(`^#{1,3}\\s*${a}\\b[:\\s-–]*`, "i"), "").trim();
          if (captured) return captured;
        }
      }
    }
    return null;
  }

  // Basic paragraph fallback: first non-empty paragraph is definition
  const paragraphs = norm.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  // attempt to parse labeled bullets like "Examples: - ... - ..." or numbered list
  function extractListFromText(sectionText) {
    if (!sectionText) return [];
    // split by lines and trim dash/number prefixes
    const lines = sectionText.split(/\n/).map(l => l.replace(/^[\s]*[-•\*]\s*/, "").replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
    // if only one long line but commas separate examples, split by semicolon or '•'
    if (lines.length === 1 && /;|•|,/.test(lines[0]) && lines[0].length > 60) {
      return lines[0].split(/;|•|, (?=[A-Z0-9])/).map(s => s.trim()).filter(Boolean);
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
  const stepByStep = extractListFromText(stepsText || "").length ? extractListFromText(stepsText || "") : (norm.match(/(?:\n|^)\d+\.\s+.+/g) || []).map(l => l.replace(/^\s*\d+\.\s+/, "").trim());

  // notes
  const notes = capture(headingNames.notes) || "";

  // related
  const relatedText = capture(headingNames.relatedTerms);
  const relatedTerms = extractListFromText(relatedText || "");

  // If nothing much found, attempt weak heuristics: look for lines starting with "Definition", "Examples", etc. anywhere
  function quickFind(label) {
    const rx = new RegExp(`${label}\\s*[:\\-–]\\s*([\\s\\S]{1,500})`, "i");
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
    raw: raw
  };

  // if structured has almost nothing, return null to indicate failure
  const meaningfulCount = (structured.definition ? 1 : 0) + (structured.keyAspects.length ? 1 : 0) + (structured.examples.length ? 1 : 0);
  if (meaningfulCount === 0) return structured; // still return, frontend will fallback to definition paragraph

  return structured;
}

/**
 * Optional external callAI util
 */
let callAI = null;
try { callAI = require("../utils/callAI"); } catch (e) { callAI = null; }

/**
 * internal axios call if callAI not present
 */
async function internalCallAI(term, opts = {}) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    const err = new Error("MISTRAL_API_KEY not set");
    err.kind = "CONFIG";
    throw err;
  }
  const url = opts.url || "https://api.mistral.ai/v1/chat/completions";
  const payload = {
    model: opts.model || "mistral-medium",
    messages: [
      { role: "system", content: opts.systemPrompt || "You are a legal expert AI. Return only a JSON object if possible." },
      { role: "user", content: opts.userPrompt || `Provide the structured JSON for: "${term}"` }
    ],
    max_tokens: opts.max_tokens || 900,
    temperature: typeof opts.temperature === "number" ? opts.temperature : 0.1
  };
  try {
    const resp = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      timeout: opts.timeout || 20000
    });
    const content = resp?.data?.choices?.[0]?.message?.content;
    return String(content || "");
  } catch (err) {
    const e = new Error(err?.message || "AI call failed");
    e.kind = err?.code || (err?.response?.status === 429 ? "RATE_LIMIT" : "OTHER");
    e.original = err;
    throw e;
  }
}

/**
 * GET /api/dictionary/:term
 */
const getTerm = asyncHandler(async (req, res, next) => {
  const { term } = req.params;
  const debug = req.query && (req.query.debug === "1" || req.query.debug === "true");
  const useFake = process.env.USE_FAKE_DATA === "true";
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (!term || !term.trim()) return next(new apiError(400, "Missing term"));

  const normalized = term.trim();

  // early fake fallback
  if (!mistralKey && useFake) {
    const sample = SAMPLE_FAKE(normalized);
    return res.status(200).json(new apiResponse(200, {
      raw: sample.raw,
      structured: sample,
      meta: { term: normalized, source: "AI-generated", returnedAt: new Date().toISOString() }
    }, "Fake data"));
  }
  if (!mistralKey && !useFake) {
    return next(new apiError(500, "Missing AI key. Set USE_FAKE_DATA=true for dev fallback."));
  }

  // Prepare prompts
  const systemPrompt = `
You are a legal expert AI. If possible, respond ONLY with a valid JSON object with these fields:
{
  "term": "<term>",
  "definition": "<short explanation>",
  "types": ["..."],
  "keyAspects": ["..."],
  "examples": ["..."],
  "stepByStep": ["..."],
  "notes": "<extra>",
  "relatedTerms": ["optional", "list"],
  "raw": "<long fallback text>"
}
If you cannot, provide a clear explanation with labeled sections (Definition:, Types:, Examples:, Key Aspects:, Steps:, Notes:, Related Terms:).
`.trim();

  const userPrompt = `Explain the legal term "${normalized}" in structured format as above.`;

  let rawText = "";
  try {
    if (callAI && typeof callAI === "function") {
      rawText = await callAI(normalized, { systemPrompt, userPrompt, max_tokens: 900, temperature: 0.1 });
    } else {
      rawText = await internalCallAI(normalized, { systemPrompt, userPrompt, max_tokens: 900, temperature: 0.1 });
    }
    rawText = String(rawText || "").trim();
  } catch (err) {
    console.error("AI error:", err?.kind || err?.message || err);
    if (useFake) {
      const sample = SAMPLE_FAKE(normalized);
      return res.status(200).json(new apiResponse(200, {
        raw: sample.raw,
        structured: sample,
        meta: { term: normalized, source: "AI-generated (fake)", returnedAt: new Date().toISOString() }
      }, "Fake fallback due to AI error"));
    }
    if (err.kind === "RATE_LIMIT") return next(new apiError(429, "AI rate limit"));
    if (err.kind === "ENOTFOUND") return next(new apiError(503, "AI unreachable (network/DNS)"));
    return next(new apiError(500, "AI request failed"));
  }

  // Attempt to parse JSON
  let parsed = safeParseJsonFromText(rawText);

  // If parsed but has markdown/extra around some fields, ensure arrays normalized
  if (parsed && typeof parsed === "object") {
    parsed = normalizeParsedKeys(parsed, normalized);
    // Return structured
    return res.status(200).json(new apiResponse(200, {
      raw: rawText,
      structured: parsed,
      meta: { term: normalized, source: "AI-generated", returnedAt: new Date().toISOString() },
      debug: debug ? { parsedCandidate: parsed } : undefined
    }, "Success (structured)"));
  }

  // JSON parse failed. Try heuristic extraction from raw text
  const heuristic = extractStructuredFromRaw(rawText, normalized);

  // Always return a structured object (either heuristic or minimally populated)
  const finalStructured = Object.assign({
    term: normalized,
    definition: heuristic?.definition || (rawText ? rawText.split(/\n{2,}/)[0].slice(0, 120) : ""),
    types: heuristic?.types || [],
    keyAspects: heuristic?.keyAspects || [],
    examples: heuristic?.examples || [],
    stepByStep: heuristic?.stepByStep || [],
    notes: heuristic?.notes || "",
    relatedTerms: heuristic?.relatedTerms || [],
    raw: rawText
  }, heuristic || {});

  return res.status(200).json(new apiResponse(200, {
    raw: rawText,
    structured: finalStructured,
    meta: { term: normalized, source: "AI-generated (raw)", returnedAt: new Date().toISOString() },
    debug: debug ? { heuristic } : undefined
  }, "Success (heuristic structured)"));
});

/**
 * Render Dictionary Page
 */
const renderDictionaryPage = asyncHandler(async (req, res) => {
  res.render("pages/dictionary", { user: req.user || null });
});

/**
 * Save Term
 */
const saveTerm = asyncHandler(async (req, res, next) => {
  const { term } = req.body;
  if (!term) return res.status(400).json(new apiResponse(400, null, "Missing term"));
  if (!req.user) return res.status(401).json(new apiResponse(401, null, "User not logged in"));
  try {
    await User.updateOne({ _id: req.user._id }, { $addToSet: { savedTerms: term } });
    return res.status(200).json(new apiResponse(200, { term }, "Term saved"));
  } catch (err) {
    console.error("Error saving term:", err?.message || err);
    return next(err);
  }
});

/* -------------------------
   Helpers for server-side rendered partial search (POST /dictionary/search)
   ------------------------- */

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
      const lower = Object.keys(parsed).find(k => k.toLowerCase() === n.toLowerCase());
      if (lower) return parsed[lower];
    }
    return undefined;
  }

  out.term = pick("term", "Term") || fallbackTerm || "";
  out.definition = pick("definition", "Definition", "def", "meaning", "description") || parsed.raw || "";
  // types can be array or comma string
  let types = pick("types", "type", "categories", "kinds");
  if (typeof types === "string" && types.includes(",")) types = types.split(",").map(s => s.trim());
  out.types = Array.isArray(types) ? types : (types ? [types] : []);

  // key aspects: many possible inputs: keyAspects, key_aspects, key_aspect, key_aspects_object
  let keyAspects = pick("keyAspects", "key_aspects", "key_aspect", "keyAspectsObject", "key_aspects_object", "key_aspects_details");
  // if parsed has 'key_aspects' as an object with nested fields, convert to array of items
  if (keyAspects && typeof keyAspects === "object" && !Array.isArray(keyAspects)) {
    // convert object keys to descriptive entries
    const arr = [];
    for (const [k, v] of Object.entries(keyAspects)) {
      // push an object with name = k and content = v
      arr.push({ name: k, ... (typeof v === 'object' ? v : { description: String(v) }) });
    }
    keyAspects = arr;
  } else if (typeof keyAspects === "string") {
    // split by newlines or semicolons
    keyAspects = keyAspects.split(/\n|;|•|, (?=[A-Z0-9])/).map(s => s.trim()).filter(Boolean);
  }
  out.keyAspects = Array.isArray(keyAspects) ? keyAspects : (keyAspects ? [keyAspects] : []);

  // examples
  let examples = pick("examples", "example", "Examples");
  if (typeof examples === "string") {
    examples = examples.split(/\n|;|•/).map(s => s.trim()).filter(Boolean);
  }
  out.examples = Array.isArray(examples) ? examples : (examples ? [examples] : []);

  // stepByStep
  let stepByStep = pick("stepByStep", "steps", "procedure", "step_by_step", "step-by-step");
  if (typeof stepByStep === "string") {
    stepByStep = stepByStep.split(/\n|;|•/).map(s => s.trim()).filter(Boolean);
  }
  out.stepByStep = Array.isArray(stepByStep) ? stepByStep : (stepByStep ? [stepByStep] : []);

  // notes
  out.notes = pick("notes", "note", "remarks") || "";

  // relatedTerms
  let relatedTerms = pick("relatedTerms", "related", "related_terms", "see_also", "seeAlso");
  if (typeof relatedTerms === "string") {
    relatedTerms = relatedTerms.split(/\n|;|, /).map(s => s.trim()).filter(Boolean);
  }
  out.relatedTerms = Array.isArray(relatedTerms) ? relatedTerms : (relatedTerms ? [relatedTerms] : []);

  // raw: keep original raw if provided
  out.raw = parsed.raw || parsed.text || JSON.stringify(parsed);

  // Also attempt to find nested specialized sections (e.g., grounds_for_divorce, legal_consequences) and fold them into keyAspects
  // Common deep keys we want to surface: grounds_for_divorce, legal_consequences, jurisdictional_variations
  const deepAliases = ["grounds_for_divorce", "groundsForDivorce", "legal_consequences", "legalConsequences", "jurisdictional_variations", "jurisdictionalVariations"];
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
      const otherKeys = keys.filter(k => !["name", "title", "description", "summary"].includes(k));
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
      const shortHtml = short ? `<div class="def-short">${renderAnyToHtml(short, term)}</div>` : "";
      const detailedHtml = detailed ? `<div class="def-detailed" style="margin-top:8px;">${renderAnyToHtml(detailed, term)}</div>` : "";
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
  const stepByStep = Array.isArray(normalized.stepByStep) ? normalized.stepByStep.map(s => String(s)) : (normalized.stepByStep ? [String(normalized.stepByStep)] : []);

  // notes: string or object
  let notes = "";
  try {
    notes = normalized.notes ? renderAnyToHtml(String(normalized.notes), term) : "";
  } catch (e) {
    notes = escapeHtml(String(normalized.notes || ""));
  }

  // relatedTerms: array of strings
  const relatedTerms = Array.isArray(normalized.relatedTerms) ? normalized.relatedTerms.map(r => String(r)) : (normalized.relatedTerms ? [String(normalized.relatedTerms)] : []);

  return { definitionHtml, aspectsHtml, examplesHtml, stepByStep, notes, relatedTerms };
}

/**
 * POST /dictionary/search
 * Returns JSON: { ok: true, html: "<partial>" }
 */
const searchTerm = asyncHandler(async (req, res, next) => {
  const term = (req.body && req.body.term) ? String(req.body.term).trim() : "";
  const debug = req.query && (req.query.debug === "1" || req.query.debug === "true");
  const useFake = process.env.USE_FAKE_DATA === "true";
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (!term) return res.status(400).json({ ok: false, message: "Missing term" });

  let rawText = "";
  try {
    if (callAI && typeof callAI === "function") {
      rawText = await callAI(term, {
        systemPrompt: `You are a legal expert AI. If possible, return a JSON object describing the term.`,
        userPrompt: `Explain the legal term "${term}" in a structured JSON format.`,
        max_tokens: 900,
        temperature: 0.1
      });
    } else {
      rawText = await internalCallAI(term, { systemPrompt: "", userPrompt: `Explain ${term}`, max_tokens: 900 });
    }
    rawText = String(rawText || "").trim();
  } catch (err) {
    console.error("AI error (search):", err?.kind || err?.message || err);
    if (useFake) {
      const sample = SAMPLE_FAKE(term);
      rawText = sample.raw;
    } else {
      if (!mistralKey && !useFake) {
        rawText = `Definition for "${term}" is temporarily unavailable.`;
      } else {
        rawText = `Unable to fetch definition for "${term}" due to an upstream error.`;
      }
    }
  }

  // Attempt structured parse
  let parsed = safeParseJsonFromText(rawText);

  if (parsed && typeof parsed === "object") {
    // normalize keys & nested structures
    parsed = normalizeParsedKeys(parsed, term);
  } else {
    const heur = extractStructuredFromRaw(rawText, term);
    parsed = Object.assign({
      term,
      definition: heur?.definition || (rawText ? rawText.split(/\n{2,}/)[0].slice(0, 600) : ""),
      types: heur?.types || [],
      keyAspects: heur?.keyAspects || [],
      examples: heur?.examples || [],
      stepByStep: heur?.stepByStep || [],
      notes: heur?.notes || "",
      relatedTerms: heur?.relatedTerms || [],
      raw: rawText
    }, heur || {});
  }

    // Convert structured -> HTML pieces
  const {
    definitionHtml,
    aspectsHtml,
    examplesHtml,
    stepByStep,
    notes,
    relatedTerms
  } = convertStructuredToHtml(parsed, term);

  // determine if current user has saved this term (best-effort)
  let userSaved = false;
  try {
    if (req.user && Array.isArray(req.user.savedTerms)) {
      userSaved = req.user.savedTerms.includes(term);
    }
  } catch (e) {
    userSaved = false;
  }

  // Build a small aiMeta object from likely fields (defensive)
  const aiMeta = {};
  if (parsed && typeof parsed === 'object') {
    if (typeof parsed.attempts !== 'undefined') aiMeta.attempts = parsed.attempts;
    if (parsed.aiError) aiMeta.aiError = parsed.aiError;
    if (parsed.usedCacheFallback) aiMeta.usedCacheFallback = parsed.usedCacheFallback;
    // Some AI outputs may embed meta under meta or _aiMeta
    if (!aiMeta.attempts && parsed.meta && parsed.meta.attempts) aiMeta.attempts = parsed.meta.attempts;
    if (!aiMeta.aiError && parsed._aiError) aiMeta.aiError = parsed._aiError;
  }

  // Compose top-level meta (what will be returned in the JSON response)
  const topMeta = {
    term,
    source: parsed.source || "AI-generated",
    returnedAt: new Date().toISOString()
  };
  if (Object.keys(aiMeta).length) topMeta.aiMeta = aiMeta;

  // Build viewModel that partial expects, expose baseUrl for share link generation
  const viewModel = {
    structured: parsed,
    definitionHtml,
    aspectsHtml,
    examplesHtml,
    stepByStep,
    notes,
    relatedTerms,
    user: req.user || null,
    userSaved,
    debug: debug ? { parsed, rawText, aiMeta } : undefined,
    meta: topMeta,
    escapeHtml,
    // pass baseUrl so template can render absolute share links server-side when available
    baseUrl: `${req.protocol}://${req.get('host')}`
  };

  // Render partial to string
  res.render("partials/dictionary_result", viewModel, (err, html) => {
    if (err) {
      console.error("Partial render error:", err);
      return next(new apiError(500, "Failed to render result"));
    }
    return res.status(200).json({ ok: true, html, meta: viewModel.meta, debug: viewModel.debug });
  });
});

module.exports = { getTerm, renderDictionaryPage, saveTerm, searchTerm };
