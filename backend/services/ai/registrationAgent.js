const aiProvider = require('./aiProvider');
const AIRecommendation = require('../../models/AIRecommendation');

/** Basic deterministic validation - the agent never trusts frontend-only checks. */
function validateRegistration({ name, email }) {
  const errors = [];
  if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters.');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) errors.push('A valid email address is required.');
  return { valid: errors.length === 0, errors };
}

/**
 * Deterministic duplicate detection: same email already registered for this event,
 * or same email+event pending within a short window submitted twice.
 */
function detectDuplicate(existingRegistrations, email) {
  const normalizedEmail = email.trim().toLowerCase();
  const match = existingRegistrations.find((r) => r.attendee && r.attendee.email === normalizedEmail);
  return match ? { isDuplicate: true, duplicateOf: match._id } : { isDuplicate: false, duplicateOf: null };
}

/**
 * Deterministic categorization based on organization/job title heuristics.
 * Organizer can always override manually afterward.
 */
function categorize({ jobTitle = '', organization = '' }) {
  const jt = jobTitle.toLowerCase();
  if (jt.includes('press') || jt.includes('journalist') || jt.includes('media')) {
    return { category: 'PRESS', confidence: 0.85 };
  }
  if (jt.includes('student') || organization.toLowerCase().includes('university') || organization.toLowerCase().includes('college')) {
    return { category: 'STUDENT', confidence: 0.75 };
  }
  if (jt.includes('ceo') || jt.includes('founder') || jt.includes('director') || jt.includes('vp') || jt.includes('head of')) {
    return { category: 'VIP', confidence: 0.7 };
  }
  return { category: 'STANDARD', confidence: 0.6 };
}

/**
 * Analytics-facing insights: LLM narrative on top of deterministic aggregate stats.
 * Stats themselves are always computed from real MongoDB data by the caller.
 */
async function generateRegistrationInsights(event, stats) {
  let narrative = [
    `${stats.total} total registrations, ${stats.approved} approved (${stats.approvalRate}%), ${stats.pending} pending.`,
    `Attendance rate stands at ${stats.attendanceRate}% based on ${stats.checkedIn} check-ins.`,
  ];
  let source = 'RULE_ENGINE';

  if (aiProvider.isAvailable()) {
    const prompt = `Event "${event.title}" registration stats: total=${stats.total}, approved=${stats.approved}, pending=${stats.pending}, rejected=${stats.rejected}, checkedIn=${stats.checkedIn}, attendanceRate=${stats.attendanceRate}%, noShowRate=${stats.noShowRate}%.
Return ONLY JSON: {"insights": ["insight 1", "insight 2", "insight 3"]}  (3 short, specific, data-driven insights)`;
    const result = await aiProvider.generateJSON(
      'You are a registration analytics assistant. Respond with ONLY valid JSON, no markdown, no preamble.',
      prompt
    );
    if (result && Array.isArray(result.insights) && result.insights.length > 0) {
      narrative = result.insights;
      source = 'LLM';
    }
  }

  try {
    await AIRecommendation.create({
      agent: 'REGISTRATION',
      event: event._id,
      targetType: 'Event',
      targetId: event._id,
      source,
      recommendation: narrative.join(' '),
      score: stats.attendanceRate,
      reasons: narrative,
      alternatives: [],
    });
  } catch (e) {
    console.warn('[registrationAgent] failed to persist AIRecommendation:', e.message);
  }

  return { insights: narrative, source };
}

module.exports = { validateRegistration, detectDuplicate, categorize, generateRegistrationInsights };
