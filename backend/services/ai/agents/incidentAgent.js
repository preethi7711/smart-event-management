const aiProvider = require('../aiProvider');

async function analyze(query, dataContext) {
    const { eventStats } = dataContext;
    
    let result = {
        answer: `No critical incidents detected in deterministic data.`,
        evidence: [],
        source: 'RULE_ENGINE'
    };

    if (aiProvider.isAvailable()) {
        const prompt = `You are the Incident Agent.
User Query: "${query}"
Context Data: ${JSON.stringify(eventStats).substring(0, 2000)}
Instructions: Analyze the data for any incidents, technical failures, or emergencies. Prioritize appropriately.
Return ONLY JSON: {"answer": "Your detailed response", "evidence": ["Data point 1", "Data point 2"]}`;

        const llmResult = await aiProvider.generateJSON('You are an Incident Agent. Return ONLY JSON.', prompt);
        if (llmResult && llmResult.answer) {
            result = { answer: llmResult.answer, evidence: llmResult.evidence || [], source: 'LLM' };
        }
    }

    return result;
}

module.exports = { analyze };
