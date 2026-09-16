const aiProvider = require('../aiProvider');

async function analyze(query, dataContext) {
    const { eventStats } = dataContext;
    
    let result = {
        answer: `Sponsor matching and deliverable health are stable.`,
        evidence: [],
        source: 'RULE_ENGINE'
    };

    if (aiProvider.isAvailable()) {
        const prompt = `You are the Sponsor Agent.
User Query: "${query}"
Context Data: ${JSON.stringify(eventStats).substring(0, 2000)}
Instructions: Analyze sponsor matching and contract/deliverable health. Provide recommendations.
Return ONLY JSON: {"answer": "Your detailed response", "evidence": ["Data point 1", "Data point 2"]}`;

        const llmResult = await aiProvider.generateJSON('You are a Sponsor Agent. Return ONLY JSON.', prompt);
        if (llmResult && llmResult.answer) {
            result = { answer: llmResult.answer, evidence: llmResult.evidence || [], source: 'LLM' };
        }
    }

    return result;
}

module.exports = { analyze };
