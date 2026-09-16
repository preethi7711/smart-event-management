const aiProvider = require('../aiProvider');

async function analyze(query, dataContext) {
    const { eventStats } = dataContext;
    
    let result = {
        answer: `Based on deterministic data, I recommend reviewing capacity and check-in rates.`,
        evidence: [],
        source: 'RULE_ENGINE'
    };

    if (aiProvider.isAvailable()) {
        const prompt = `You are the Recommendation Agent.
User Query: "${query}"
Context Data: ${JSON.stringify(eventStats).substring(0, 3000)}
Instructions: Produce prioritized actionable recommendations for the user based on the context data.
Return ONLY JSON: {"answer": "Your detailed response", "evidence": ["Data point 1", "Data point 2"]}`;

        const llmResult = await aiProvider.generateJSON('You are a Recommendation Agent. Return ONLY JSON.', prompt);
        if (llmResult && llmResult.answer) {
            result = { answer: llmResult.answer, evidence: llmResult.evidence || [], source: 'LLM' };
        }
    }

    return result;
}

module.exports = { analyze };
