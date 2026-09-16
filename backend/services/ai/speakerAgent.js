const aiProvider = require('./aiProvider');
const AIRecommendation = require('../../models/AIRecommendation');

/**
 * Deterministic 0-100 match score for a speaker against a session's topic needs.
 * Weighted: expertise match 40, rating 25, experience 15, availability 20.
 */
function scoreSpeaker(speaker, session, conflicts = { hasConflict: false, workloadCount: 0 }) {
  const reasons = [];
  let score = 0;

  // Expertise match (40 pts)
  const topic = (session.topic || '').toLowerCase();
  const expertise = (speaker.expertise || []).map((e) => e.toLowerCase());
  const directMatch = expertise.some((e) => e.includes(topic) || topic.includes(e));
  if (directMatch) {
    score += 40;
    reasons.push(`Expertise directly matches topic "${session.topic}".`);
  } else if (expertise.length > 0) {
    score += 15;
    reasons.push(`No exact topic match; speaker has related expertise in ${expertise.slice(0, 3).join(', ')}.`);
  } else {
    reasons.push('No expertise data available for this speaker.');
  }

  // Rating (25 pts)
  score += Math.round(((speaker.averageRating || 0) / 5) * 25);
  reasons.push(`Average rating ${speaker.averageRating || 0}/5 from ${speaker.totalSessions || 0} past sessions.`);

  // Experience (15 pts)
  const expScore = Math.min(15, Math.round((speaker.yearsExperience || 0) * 1.5));
  score += expScore;
  reasons.push(`${speaker.yearsExperience || 0} years of speaking experience.`);

  // Availability / conflicts (20 pts)
  if (conflicts.hasConflict) {
    reasons.push('Speaker has a scheduling conflict at this time.');
  } else if (conflicts.workloadCount >= 4) {
    score += 8;
    reasons.push(`Speaker already has a high workload (${conflicts.workloadCount} sessions) at this event.`);
  } else {
    score += 20;
    reasons.push('Speaker is available with no conflicts detected.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons };
}

function hasTimeOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/**
 * Ranks speakers for a given session, checking real conflicts against
 * existing sessions the speaker is already assigned to, plus unavailable dates.
 */
async function rankSpeakers(speakers, session, existingSessionsBySpeaker = {}) {
  const scored = speakers
    .filter((s) => s.isActive !== false)
    .map((sp) => {
      const spId = sp._id.toString();
      const otherSessions = existingSessionsBySpeaker[spId] || [];
      const hasConflict = otherSessions.some((os) =>
        hasTimeOverlap(session.startTime, session.endTime, os.startTime, os.endTime)
      );
      const unavailable = (sp.unavailableDates || []).some(
        (d) => new Date(d).toDateString() === new Date(session.startTime).toDateString()
      );
      const { score, reasons } = scoreSpeaker(sp, session, {
        hasConflict: hasConflict || unavailable,
        workloadCount: otherSessions.length,
      });
      return { speaker: sp, score, reasons, hasConflict: hasConflict || unavailable };
    })
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { recommendation: null, score: 0, reasons: ['No active speakers found.'], alternatives: [], source: 'RULE_ENGINE' };
  }

  // Prefer a non-conflicting top pick even if a conflicted speaker scored marginally higher
  const bestAvailable = scored.find((s) => !s.hasConflict) || scored[0];

  let narrative = null;
  if (aiProvider.isAvailable()) {
    const prompt = `Session: "${session.title}" (topic: ${session.topic}).
Top speaker candidate: "${bestAvailable.speaker.name}" scored ${bestAvailable.score}/100 with reasons: ${bestAvailable.reasons.join('; ')}.
Return ONLY JSON: {"recommendation": "<1-2 sentence natural-language recommendation>"}`;
    const result = await aiProvider.generateJSON(
      'You are a speaker recommendation assistant. Respond with ONLY valid JSON, no markdown, no preamble.',
      prompt
    );
    if (result && result.recommendation) narrative = result.recommendation;
  }

  const recommendation =
    narrative ||
    `${bestAvailable.speaker.name} is the best match with a ${bestAvailable.score}/100 score based on expertise, rating, experience, and availability.`;

  const output = {
    recommendation,
    score: bestAvailable.score,
    reasons: bestAvailable.reasons,
    alternatives: scored
      .filter((s) => s.speaker._id.toString() !== bestAvailable.speaker._id.toString())
      .slice(0, 4)
      .map((s) => ({ speakerId: s.speaker._id, name: s.speaker.name, score: s.score, hasConflict: s.hasConflict })),
    speakerId: bestAvailable.speaker._id,
    hasConflict: bestAvailable.hasConflict,
    source: narrative ? 'LLM' : 'RULE_ENGINE',
  };

  try {
    await AIRecommendation.create({
      agent: 'SPEAKER',
      event: session.event,
      targetType: 'Speaker',
      targetId: bestAvailable.speaker._id,
      source: output.source,
      recommendation: output.recommendation,
      score: output.score,
      reasons: output.reasons,
      alternatives: output.alternatives,
    });
  } catch (e) {
    console.warn('[speakerAgent] failed to persist AIRecommendation:', e.message);
  }

  return output;
}

module.exports = { scoreSpeaker, rankSpeakers, hasTimeOverlap };
