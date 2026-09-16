const aiProvider = require('../aiProvider');

async function analyze(query, dataContext) {
    const { eventStats } = dataContext;
    const risks = eventStats?.intelligence?.risks || [];
    
    let result = {
        answer: risks.length > 0 ? `I detected ${risks.length} active risks.` : 'No critical risks detected.',
        evidence: risks.map(r => `[${r.level}] ${r.type}: ${r.message}`),
        source: 'RULE_ENGINE'
    };

    if (aiProvider.isAvailable()) {
        const prompt = `You are the Risk Agent.
User Query: "${query}"
Context Data: Risks detected by rule engine: ${JSON.stringify(risks)}
Instructions: Analyze operational risks, anomalies, and recommend mitigations. Emphasize HIGH level risks.
Return ONLY JSON: {"answer": "Your detailed response", "evidence": ["Data point 1", "Data point 2"]}`;

        const llmResult = await aiProvider.generateJSON('You are a Risk Agent. Return ONLY JSON.', prompt);
        if (llmResult && llmResult.answer) {
            result = { answer: llmResult.answer, evidence: llmResult.evidence || [], source: 'LLM' };
        }
    }

    return result;
}

module.exports = { analyze };
