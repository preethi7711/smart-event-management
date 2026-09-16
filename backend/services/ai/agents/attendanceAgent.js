const aiProvider = require('../aiProvider');

async function analyze(query, dataContext) {
    const { eventStats, eventTitle } = dataContext;
    
    let result = {
        answer: `Attendance logic indicates an attendance rate of ${eventStats.attendanceRate || 'unknown'}% and no-show rate of ${eventStats.noShowRate || 'unknown'}%.`,
        evidence: eventStats.attendanceRate ? [`Attendance: ${eventStats.attendanceRate}%`, `No-show: ${eventStats.noShowRate}%`] : [],
        source: 'RULE_ENGINE'
    };

    if (aiProvider.isAvailable()) {
        const prompt = `You are the Attendance Agent.
User Query: "${query}"
Context Data (Attendance info): Registrations: ${eventStats.registrations}, Approved: ${eventStats.approved}, CheckedIn: ${eventStats.checkedIn}, AttendanceRate: ${eventStats.attendanceRate}%, NoShowRate: ${eventStats.noShowRate}%
Instructions: Analyze attendance trends, no-shows, and capacity. Provide insights. Do not invent numbers.
Return ONLY JSON: {"answer": "Your detailed response", "evidence": ["Data point 1", "Data point 2"]}`;

        const llmResult = await aiProvider.generateJSON('You are a professional Attendance Agent. Return ONLY JSON.', prompt);
        if (llmResult && llmResult.answer) {
            result = { answer: llmResult.answer, evidence: llmResult.evidence || [], source: 'LLM' };
        }
    }

    return result;
}

module.exports = { analyze };
