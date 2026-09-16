/**
 * aiProvider.js
 *
 * Thin abstraction over an LLM API. Every agent calls `generateJSON()` to get
 * a structured response. If no API key is configured (or the call fails for
 * any reason), `isAvailable()` returns false and callers MUST fall back to
 * their deterministic rule engine. This guarantees the platform is fully
 * demoable without any external AI credentials.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

let genAI = null;
if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
}

function isAvailable() {
  return Boolean(genAI !== null);
}

/**
 * Sends a prompt to the LLM and expects a JSON object back.
 * @param {string} systemPrompt - instructions telling the model to return ONLY JSON
 * @param {string} userPrompt - the actual data/question
 * @returns {Promise<object|null>} parsed JSON, or null if unavailable/failed
 */
async function generateJSON(systemPrompt, userPrompt) {
  if (!isAvailable()) return null;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    
    // Gemini 1.5 allows system instructions directly in the model config, 
    // but passing it as a combined prompt for simple structured text is also robust.
    const fullPrompt = `${systemPrompt}\n\nUser Data/Request:\n${userPrompt}\n\nIMPORTANT: Return ONLY raw JSON without any markdown formatting like \`\`\`json.`;
    
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();
    
    // Clean up any potential markdown code blocks in case the model ignores instructions
    const cleaned = text.replace(/```json|```/gi, '').trim();
    
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('[aiProvider] LLM call error, falling back to rule engine:', err.message);
    return null;
  }
}

module.exports = { isAvailable, generateJSON, MODEL };
