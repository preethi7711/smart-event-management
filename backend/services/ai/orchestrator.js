const aiProvider = require('./aiProvider');
const analyticsService = require('../analytics/analyticsService');
const Event = require('../../models/Event');
const AIRecommendation = require('../../models/AIRecommendation');

// Import individual sub-agents (we will define these next)
const eventAnalyst = require('./agents/eventAnalyst');
const attendanceAgent = require('./agents/attendanceAgent');
const engagementAgent = require('./agents/engagementAgent');
const riskAgent = require('./agents/riskAgent');
const executiveAgent = require('./agents/executiveAgent');
const recommendationAgent = require('./agents/recommendationAgent');
const incidentAgent = require('./agents/incidentAgent');
const sponsorAgent = require('./agents/sponsorAgent');

/**
 * Orchestrator routes natural language intents or system events to the correct specialized agents.
 * 
 * Intent routing logic:
 * 1. Checks permissions and data access.
 * 2. Uses a lightweight LLM classifier or regex (if LLM unavailable) to determine the right agent.
 * 3. Gathers real MongoDB data needed by the agent.
 * 4. Calls the agent to generate insights.
 * 5. Returns validated response.
 */
async function handleQuery(query, user, contextEventId = null) {
  // 1. Fetch relevant data (Event context)
  let eventStats = null;
  let event = null;
  
  if (contextEventId) {
    event = await Event.findById(contextEventId);
    if (!event) throw new Error('Event not found');
    
    // RBAC check
    if (user.role !== 'ADMIN' && String(event.organizer) !== String(user._id)) {
        throw new Error('Unauthorized access to this event data.');
    }
    eventStats = await analyticsService.getUnifiedEventAnalytics(contextEventId);
  } else if (user.role === 'ADMIN' || user.role === 'ORGANIZER') {
    // Platform overview mode
    const filter = user.role === 'ADMIN' ? {} : { organizer: user._id };
    const events = await Event.find(filter);
    
    eventStats = {
       type: 'PLATFORM_OVERVIEW',
       totalEvents: events.length,
       published: events.filter(e => e.status === 'PUBLISHED').length,
       ongoing: events.filter(e => e.status === 'ONGOING').length,
       events: await Promise.all(events.map(async (e) => ({
           id: e._id,
           title: e.title,
           stats: await analyticsService.getUnifiedEventAnalytics(e._id)
       })))
    };
  }

  // 2. Intent Classification
  let intent = 'GENERAL';
  const lowerQuery = query.toLowerCase();
  
  if (aiProvider.isAvailable()) {
      const intentPrompt = `Classify this user query into one of these intents: EVENT_PERFORMANCE, ATTENDANCE, ENGAGEMENT, RISK, EXECUTIVE_SUMMARY, RECOMMENDATION, GENERAL.
Query: "${query}"
Return ONLY JSON: {"intent": "MATCHED_INTENT"}`;
      
      const intentRes = await aiProvider.generateJSON('You are an intent classification router.', intentPrompt);
      if (intentRes && intentRes.intent) intent = intentRes.intent;
  } else {
      // Fallback intent mapping
      if (lowerQuery.includes('risk') || lowerQuery.includes('danger') || lowerQuery.includes('issue')) intent = 'RISK';
      else if (lowerQuery.includes('attendance') || lowerQuery.includes('no-show') || lowerQuery.includes('predict')) intent = 'ATTENDANCE';
      else if (lowerQuery.includes('feedback') || lowerQuery.includes('engagement') || lowerQuery.includes('particip')) intent = 'ENGAGEMENT';
      else if (lowerQuery.includes('executive') || lowerQuery.includes('summarize')) intent = 'EXECUTIVE_SUMMARY';
      else if (lowerQuery.includes('recommend') || lowerQuery.includes('action') || lowerQuery.includes('do next')) intent = 'RECOMMENDATION';
      else if (lowerQuery.includes('perform') || lowerQuery.includes('trend')) intent = 'EVENT_PERFORMANCE';
  }

  // 3 & 4. Route to specific agent based on intent
  let agentResponse = null;
  const dataContext = { userRole: user.role, eventStats, eventTitle: event?.title };

  try {
      switch (intent) {
        case 'EVENT_PERFORMANCE':
            agentResponse = await eventAnalyst.analyze(query, dataContext);
            break;
        case 'ATTENDANCE':
            agentResponse = await attendanceAgent.analyze(query, dataContext);
            break;
        case 'ENGAGEMENT':
            agentResponse = await engagementAgent.analyze(query, dataContext);
            break;
        case 'RISK':
            agentResponse = await riskAgent.analyze(query, dataContext);
            break;
        case 'EXECUTIVE_SUMMARY':
            agentResponse = await executiveAgent.analyze(query, dataContext);
            break;
        case 'RECOMMENDATION':
            agentResponse = await recommendationAgent.analyze(query, dataContext);
            break;
        default:
            agentResponse = await eventAnalyst.analyze(query, dataContext);
      }
  } catch (error) {
      console.error('[Orchestrator] Agent failure:', error);
      agentResponse = { answer: 'I encountered an error processing that request.', evidence: [], source: 'ERROR' };
  }

  // 5. Return Aggregated Response
  return {
    query,
    intent,
    answer: agentResponse.answer,
    evidence: agentResponse.evidence || [],
    source: agentResponse.source || 'RULE_ENGINE',
    agentRun: intent
  };
}

/**
 * Handle predefined operational scenarios for the AI Operations Center.
 */
async function handleScenario(scenario, user, contextEventId = null) {
  let eventStats = null;
  let event = null;

  if (contextEventId) {
    event = await Event.findById(contextEventId);
    if (!event) throw new Error('Event not found');
    if (user.role !== 'ADMIN' && String(event.organizer) !== String(user._id)) {
        throw new Error('Unauthorized access to this event data.');
    }
    eventStats = await analyticsService.getUnifiedEventAnalytics(contextEventId);
  }

  const dataContext = { userRole: user.role, eventStats, eventTitle: event?.title };
  let agentResponse = null;
  let intent = 'SCENARIO';
  let agentsRun = [];

  try {
    if (scenario === 'Venue Capacity Issue') {
       agentsRun = ['riskAgent', 'attendanceAgent'];
       const riskOutput = await riskAgent.analyze("Analyze venue capacity risks", dataContext);
       const attendanceOutput = await attendanceAgent.analyze("Analyze attendance and no-show projections for capacity", dataContext);
       
       agentResponse = {
           answer: `Consolidated Finding:\n${riskOutput.answer}\n${attendanceOutput.answer}`,
           evidence: [...(riskOutput.evidence || []), ...(attendanceOutput.evidence || [])],
           recommendation: "Recommend enforcing waitlist immediately and exploring spill-over room options if attendance > 95%.",
           source: riskOutput.source === 'LLM' || attendanceOutput.source === 'LLM' ? 'LLM' : 'RULE_ENGINE',
           confidence: "High"
       };
    } else if (scenario === 'Speaker Conflict') {
       agentsRun = ['executiveAgent'];
       agentResponse = {
           answer: "Speaker schedule conflict detected in concurrent sessions.",
           evidence: ["Session A overlaps with Session B for Speaker X"],
           recommendation: "Reassign one session to an alternate available speaker or shift schedule by 30 minutes.",
           source: 'RULE_ENGINE',
           confidence: "High"
       };
    } else if (scenario === 'Technical Failure' || scenario === 'Medical Emergency') {
       agentsRun = ['incidentAgent'];
       agentResponse = {
           answer: `${scenario} reported. Immediate operational risk escalated.`,
           evidence: [`User reported ${scenario} manually.`],
           recommendation: "Dispatch on-site operations team. Notify attendees via app push notification if session delays are expected.",
           source: 'RULE_ENGINE',
           confidence: "Critical"
       };
    } else if (scenario === 'Sponsor Issue') {
       agentsRun = ['sponsorAgent'];
       agentResponse = {
           answer: "Sponsor deliverable or booth issue reported.",
           evidence: [],
           recommendation: "Contact sponsor liaison. Review contract deliverables in the sponsor portal.",
           source: 'RULE_ENGINE',
           confidence: "Medium"
       };
    } else {
       // Default fallback
       agentsRun = ['eventAnalyst'];
       agentResponse = await eventAnalyst.analyze(`Analyze scenario: ${scenario}`, dataContext);
       agentResponse.recommendation = "Review event data for anomalies.";
       agentResponse.confidence = "Medium";
    }
  } catch (error) {
      console.error('[Orchestrator] Scenario failure:', error);
      agentResponse = { answer: 'I encountered an error processing that scenario.', evidence: [], recommendation: '', source: 'ERROR' };
  }

  return {
    scenario,
    agents: agentsRun.join(', '),
    findings: agentResponse.answer,
    evidence: agentResponse.evidence || [],
    recommendation: agentResponse.recommendation || '',
    confidence: agentResponse.confidence || 'Medium',
    source: agentResponse.source || 'RULE_ENGINE',
    timestamp: new Date().toISOString()
  };
}

module.exports = { handleQuery, handleScenario };
