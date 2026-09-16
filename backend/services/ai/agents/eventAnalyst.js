const aiProvider = require('../aiProvider');

async function analyze(query, dataContext) {
    const { eventStats, eventTitle } = dataContext;
    
    // Fallback response if no LLM
    let result = {
        answer: `Based on deterministic data, ${eventTitle ? `the event "${eventTitle}"` : 'your platform'} is performing steadily.`,
        evidence: eventStats.intelligence ? [`Health Score: ${eventStats.intelligence.healthScore}`] : [],
        source: 'RULE_ENGINE'
    };

    if (aiProvider.isAvailable()) {
        const prompt = `You are the Event Analyst agent.
User Query: "${query}"
Context Data: ${JSON.stringify(eventStats).substring(0, 3000)} // Truncated to avoid token limits
Instructions: Analyze the event performance, trends, and health based on the provided deterministic data. Do not make up numbers.
Return ONLY JSON: {"answer": "Your detailed analytical response", "evidence": ["Data point 1", "Data point 2"]}`;

        const llmResult = await aiProvider.generateJSON('You are a professional Event Analyst Agent. Return ONLY JSON.', prompt);
        if (llmResult && llmResult.answer) {
            result = { answer: llmResult.answer, evidence: llmResult.evidence || [], source: 'LLM' };
        }
    }

    return result;
}

module.exports = { analyze };
