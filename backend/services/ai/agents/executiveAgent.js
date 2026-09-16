const aiProvider = require('../aiProvider');

async function analyze(query, dataContext) {
    const { eventStats } = dataContext;
    
    let result = {
        answer: `Executive summary: The platform/event is operating normally. Health Score: ${eventStats?.intelligence?.healthScore || 'N/A'}.`,
        evidence: [],
        source: 'RULE_ENGINE'
    };

    if (aiProvider.isAvailable()) {
        const prompt = `You are the Executive Insight Agent.
User Query: "${query}"
Context Data: ${JSON.stringify(eventStats).substring(0, 3000)}
Instructions: Convert the analytics into concise, executive-level insights. Answer: What is happening? Why? What is at risk? What should be done next?
Return ONLY JSON: {"answer": "Your detailed response", "evidence": ["Data point 1", "Data point 2"]}`;

        const llmResult = await aiProvider.generateJSON('You are an Executive Insight Agent. Return ONLY JSON.', prompt);
        if (llmResult && llmResult.answer) {
            result = { answer: llmResult.answer, evidence: llmResult.evidence || [], source: 'LLM' };
        }
    }

    return result;
}

module.exports = { analyze };
