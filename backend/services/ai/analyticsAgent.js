const aiProvider = require('./aiProvider');
const AIRecommendation = require('../../models/AIRecommendation');

// Small deterministic lexicon-based sentiment scorer used as the fallback.
const POSITIVE_WORDS = ['great', 'excellent', 'amazing', 'loved', 'helpful', 'insightful', 'engaging', 'good', 'fantastic', 'clear', 'practical', 'useful', 'well'];
const NEGATIVE_WORDS = ['bad', 'boring', 'confusing', 'poor', 'disappointing', 'slow', 'rushed', 'unclear', 'worst', 'waste', 'disorganized'];

function scoreSentiment(text) {
  const lower = (text || '').toLowerCase();
  let pos = 0;
  let neg = 0;
  POSITIVE_WORDS.forEach((w) => {
    if (lower.includes(w)) pos += 1;
  });
  NEGATIVE_WORDS.forEach((w) => {
    if (lower.includes(w)) neg += 1;
  });
  const raw = pos - neg;
  const normalized = Math.max(-1, Math.min(1, raw / 3));
  let sentiment = 'NEUTRAL';
  if (normalized > 0.15) sentiment = 'POSITIVE';
  else if (normalized < -0.15) sentiment = 'NEGATIVE';
  return { sentiment, sentimentScore: Number(normalized.toFixed(2)) };
}

/**
 * Generates session-level AI insight from real ratings + feedback data.
 */
async function generateSessionInsights(session, ratings, feedbackList) {
  const avgRating = ratings.length ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 0;
  const positive = feedbackList.filter((f) => f.sentiment === 'POSITIVE').length;
  const negative = feedbackList.filter((f) => f.sentiment === 'NEGATIVE').length;
  const positivePct = feedbackList.length ? Math.round((positive / feedbackList.length) * 100) : 0;

  let result = {
    overallSentiment: positivePct >= 60 ? 'Mostly positive' : positivePct >= 30 ? 'Mixed' : 'Needs attention',
    strengths: positive > 0 ? ['Attendees responded well overall.'] : ['Not enough positive feedback yet to identify a clear strength.'],
    problems: negative > 0 ? ['Some attendees flagged concerns in written feedback.'] : [],
    recommendation: avgRating < 3.5 && ratings.length > 0 ? 'Review session content and pacing before the next run.' : 'Session is performing well; no immediate changes needed.',
  };
  let source = 'RULE_ENGINE';

  if (aiProvider.isAvailable() && feedbackList.length > 0) {
    const prompt = `Session "${session.title}" has average rating ${avgRating.toFixed(1)}/5 from ${ratings.length} ratings.
Feedback sentiment: ${positivePct}% positive out of ${feedbackList.length} comments.
Sample comments: ${feedbackList.slice(0, 8).map((f) => f.comment).join(' | ')}
Return ONLY JSON: {"overallSentiment": "...", "strengths": ["..."], "problems": ["..."], "recommendation": "..."}`;
    const llmResult = await aiProvider.generateJSON(
      'You are an event analytics assistant analyzing session feedback. Respond with ONLY valid JSON, no markdown, no preamble.',
      prompt
    );
    if (llmResult && llmResult.overallSentiment) {
      result = llmResult;
      source = 'LLM';
    }
  }

  try {
    await AIRecommendation.create({
      agent: 'ANALYTICS',
      event: session.event,
      targetType: 'Session',
      targetId: session._id,
      source,
      recommendation: result.recommendation || result.overallSentiment,
      score: Math.round(avgRating * 20),
      reasons: [...(result.strengths || []), ...(result.problems || [])],
      alternatives: [],
    });
  } catch (e) {
    console.warn('[analyticsAgent] failed to persist AIRecommendation:', e.message);
  }

  return { ...result, avgRating: Number(avgRating.toFixed(2)), positivePct, source };
}

/**
 * Generates organizer-facing dashboard insights (3-5 bullets) from unified event data.
 * All numeric inputs must be real, pre-computed MongoDB aggregates.
 */
async function generateDashboardInsights(event, unifiedStats) {
  const {
    registrations, approvalRate, attendanceRate, noShowRate,
    avgSessionRating, topSession, venueUtilization, feedbackPositivePct,
  } = unifiedStats;

  let insights = [
    `${registrations} registrations with a ${approvalRate}% approval rate.`,
    `Attendance rate is ${attendanceRate}%, with a ${noShowRate}% no-show rate.`,
    `Average session rating is ${avgSessionRating}/5.`,
    topSession ? `"${topSession}" is the most popular session by attendance.` : 'No standout session yet — check back after more check-ins.',
    `Venue utilization is at ${venueUtilization}% of total capacity.`,
  ];
  let source = 'RULE_ENGINE';

  if (aiProvider.isAvailable()) {
    const prompt = `Unified event analytics for "${event.title}":
registrations=${registrations}, approvalRate=${approvalRate}%, attendanceRate=${attendanceRate}%, noShowRate=${noShowRate}%, avgSessionRating=${avgSessionRating}/5, topSession="${topSession}", venueUtilization=${venueUtilization}%, feedbackPositivePct=${feedbackPositivePct}%.
Return ONLY JSON: {"insights": ["insight 1", ..., "insight 5"]} — 3 to 5 short, specific, actionable insights an event organizer would find useful.`;
    const llmResult = await aiProvider.generateJSON(
      'You are an event analytics assistant. Respond with ONLY valid JSON, no markdown, no preamble.',
      prompt
    );
    if (llmResult && Array.isArray(llmResult.insights) && llmResult.insights.length > 0) {
      insights = llmResult.insights;
      source = 'LLM';
    }
  }

  try {
    await AIRecommendation.create({
      agent: 'ANALYTICS',
      event: event._id,
      targetType: 'Event',
      targetId: event._id,
      source,
      recommendation: insights.join(' '),
      score: attendanceRate,
      reasons: insights,
      alternatives: [],
    });
  } catch (e) {
    console.warn('[analyticsAgent] failed to persist AIRecommendation:', e.message);
  }

  return { insights, source };
}

module.exports = { scoreSentiment, generateSessionInsights, generateDashboardInsights };
