const aiProvider = require('../aiProvider');

async function analyze(query, dataContext) {
    const { eventStats } = dataContext;
    
    let result = {
        answer: `Engagement score is calculated at ${eventStats?.intelligence?.engagementScore || 0}.`,
        evidence: [`Average Session Rating: ${eventStats.avgSessionRating}/5`],
        source: 'RULE_ENGINE'
    };

    if (aiProvider.isAvailable()) {
        const prompt = `You are the Engagement Agent.
User Query: "${query}"
Context Data: Average Session Rating: ${eventStats.avgSessionRating}/5, Feedback Positive %: ${eventStats.feedbackPositivePct}%. Engagement Score: ${eventStats?.intelligence?.engagementScore}.
Instructions: Analyze user participation, feedback sentiment, and overall engagement.
Return ONLY JSON: {"answer": "Your detailed response", "evidence": ["Data point 1", "Data point 2"]}`;

        const llmResult = await aiProvider.generateJSON('You are an Engagement Agent. Return ONLY JSON.', prompt);
        if (llmResult && llmResult.answer) {
            result = { answer: llmResult.answer, evidence: llmResult.evidence || [], source: 'LLM' };
        }
    }

    return result;
}

module.exports = { analyze };
