const aiProvider = require('./aiProvider');
const AIRecommendation = require('../../models/AIRecommendation');

/**
 * Deterministic 0-100 match score for a venue against an event's requirements.
 * Weighted: capacity 35, budget 25, facilities 25, rating 15.
 */
function scoreVenue(venue, event) {
  const reasons = [];
  let score = 0;

  // Capacity (35 pts)
  const requiredCapacity = event.requiredCapacity || event.expectedAttendance || 0;
  if (requiredCapacity === 0) {
    score += 20;
    reasons.push('No specific capacity requirement set; partial credit given.');
  } else if (venue.totalCapacity >= requiredCapacity) {
    const slack = venue.totalCapacity - requiredCapacity;
    const efficiency = slack <= requiredCapacity * 0.5 ? 35 : 28; // penalize wildly oversized venues slightly
    score += efficiency;
    reasons.push(`Capacity ${venue.totalCapacity} meets required ${requiredCapacity}.`);
  } else {
    reasons.push(`Capacity ${venue.totalCapacity} is below required ${requiredCapacity}.`);
  }

  // Budget (25 pts) - assume event.budget is total; compare vs venue.pricePerDay
  if (event.budget && event.budget > 0) {
    if (venue.pricePerDay <= event.budget) {
      const utilization = venue.pricePerDay / event.budget;
      score += utilization <= 0.7 ? 25 : 18;
      reasons.push(`Price ₹${venue.pricePerDay}/day fits within budget ₹${event.budget}.`);
    } else {
      reasons.push(`Price ₹${venue.pricePerDay}/day exceeds budget ₹${event.budget}.`);
    }
  } else {
    score += 12;
    reasons.push('No budget constraint specified; partial credit given.');
  }

  // Facilities (25 pts)
  const required = (event.requiredFacilities || []).map((f) => f.toUpperCase());
  if (required.length === 0) {
    score += 15;
    reasons.push('No specific facilities required; partial credit given.');
  } else {
    const venueFacilities = (venue.facilities || []).map((f) => f.toUpperCase());
    const matched = required.filter((f) => venueFacilities.includes(f));
    const ratio = matched.length / required.length;
    score += Math.round(ratio * 25);
    reasons.push(`Facilities matched: ${matched.length}/${required.length} (${matched.join(', ') || 'none'}).`);
  }

  // Rating (15 pts)
  const ratingScore = Math.round(((venue.rating || 0) / 5) * 15);
  score += ratingScore;
  reasons.push(`Venue rating ${venue.rating || 0}/5.`);

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons };
}

/**
 * Ranks a list of available venues for an event.
 * Returns { recommendation, score, reasons, alternatives, source }
 */
async function rankVenues(venues, event, availabilityMap = {}) {
  const scored = venues
    .filter((v) => v.isActive !== false)
    .map((v) => {
      const { score, reasons } = scoreVenue(v, event);
      const isAvailable = availabilityMap[v._id.toString()] !== false;
      return {
        venue: v,
        score: isAvailable ? score : Math.round(score * 0.3),
        reasons: isAvailable ? reasons : [...reasons, 'Not currently available for the requested dates.'],
        available: isAvailable,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { recommendation: null, score: 0, reasons: ['No active venues found.'], alternatives: [], source: 'RULE_ENGINE' };
  }

  const top = scored[0];
  let narrative = null;

  // Try LLM for a human-friendly explanation layer only (never for the score itself)
  if (aiProvider.isAvailable()) {
    const prompt = `Event: "${event.title}", required capacity: ${event.requiredCapacity || event.expectedAttendance}, budget: ${event.budget}, required facilities: ${(event.requiredFacilities || []).join(', ') || 'none'}.
Top venue candidate: "${top.venue.name}" scored ${top.score}/100 with reasons: ${top.reasons.join('; ')}.
Return ONLY JSON: {"recommendation": "<1-2 sentence natural-language recommendation>"}`;
    const result = await aiProvider.generateJSON(
      'You are a venue recommendation assistant. Respond with ONLY valid JSON, no markdown, no preamble.',
      prompt
    );
    if (result && result.recommendation) narrative = result.recommendation;
  }

  const recommendation =
    narrative ||
    `${top.venue.name} is the best match with a ${top.score}/100 score based on capacity, budget, facilities, and rating.`;

  const output = {
    recommendation,
    score: top.score,
    reasons: top.reasons,
    alternatives: scored.slice(1, 4).map((s) => ({
      venueId: s.venue._id,
      name: s.venue.name,
      score: s.score,
      reasons: s.reasons,
    })),
    venueId: top.venue._id,
    source: narrative ? 'LLM' : 'RULE_ENGINE',
    fullRanking: scored.map((s) => ({ venueId: s.venue._id, name: s.venue.name, score: s.score, available: s.available })),
  };

  try {
    await AIRecommendation.create({
      agent: 'VENUE',
      event: event._id,
      targetType: 'Venue',
      targetId: top.venue._id,
      source: output.source,
      recommendation: output.recommendation,
      score: output.score,
      reasons: output.reasons,
      alternatives: output.alternatives,
    });
  } catch (e) {
    console.warn('[venueAgent] failed to persist AIRecommendation:', e.message);
  }

  return output;
}

module.exports = { scoreVenue, rankVenues };
