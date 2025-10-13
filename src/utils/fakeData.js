// src/utils/fakeData.js
/**
 * getFakeData(term)
 * - Returns a JSON string (so your existing `safeParseJsonFromText` can parse it).
 * - Useful in dev when USE_FAKE_DATA=true.
 */

module.exports = function getFakeData(term = "sample") {
  const sample = {
    term,
    definition: `Sample definition for "${term}".`,
    types: ["General"],
    keyAspects: [
      "This is a sample key aspect.",
      "Use USE_FAKE_DATA=true for development fallback."
    ],
    examples: [`Example usage of ${term}.`],
    stepByStep: ["Step 1: Example", "Step 2: Example"],
    notes: "This is placeholder/fake data for development only.",
    relatedTerms: ["ExampleTerm1", "ExampleTerm2"],
    raw: `Longer sample explanatory text for "${term}".`
  };

  // Return JSON as string (your parser expects text that may contain JSON)
  return JSON.stringify(sample);
};
