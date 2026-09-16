const aiProvider = require('./aiProvider');
const AIRecommendation = require('../../models/AIRecommendation');
const { hasTimeOverlap } = require('./speakerAgent');

/**
 * Detects all conflicts in a set of sessions:
 *  - same speaker double-booked (time overlap)
 *  - same room double-booked (time overlap)
 *  - room capacity < session capacity
 *  - session duration <= 0
 * This is the sole source of scheduling CORRECTNESS. The LLM is never
 * consulted for whether a schedule is valid, only to explain/summarize it.
 */
function detectConflicts(sessions, rooms) {
  const roomsById = new Map(rooms.map((r) => [r._id.toString(), r]));
  const conflicts = [];

  for (let i = 0; i < sessions.length; i += 1) {
    const s = sessions[i];

    if (new Date(s.endTime) <= new Date(s.startTime)) {
      conflicts.push({ sessionId: s._id, type: 'INVALID_DURATION', message: `"${s.title}" has an end time before/equal to its start time.` });
    }

    if (s.room) {
      const room = roomsById.get(s.room.toString());
      if (room && s.capacity > room.capacity) {
        conflicts.push({
          sessionId: s._id,
          type: 'CAPACITY_EXCEEDED',
          message: `"${s.title}" requests capacity ${s.capacity} but room "${room.name}" holds only ${room.capacity}.`,
        });
      }
    }

    for (let j = i + 1; j < sessions.length; j += 1) {
      const other = sessions[j];
      const overlap = hasTimeOverlap(s.startTime, s.endTime, other.startTime, other.endTime);
      if (!overlap) continue;

      if (s.speaker && other.speaker && s.speaker.toString() === other.speaker.toString()) {
        conflicts.push({
          sessionId: s._id,
          conflictsWith: other._id,
          type: 'SPEAKER_DOUBLE_BOOKED',
          message: `Speaker is booked for both "${s.title}" and "${other.title}" at overlapping times.`,
        });
      }

      if (s.room && other.room && s.room.toString() === other.room.toString()) {
        conflicts.push({
          sessionId: s._id,
          conflictsWith: other._id,
          type: 'ROOM_DOUBLE_BOOKED',
          message: `Room is booked for both "${s.title}" and "${other.title}" at overlapping times.`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Given a set of proposed sessions, returns which are conflict-free ("SCHEDULED")
 * and which have conflicts ("CONFLICT"), with reasons attached per session.
 */
function buildSchedule(sessions, rooms) {
  const conflicts = detectConflicts(sessions, rooms);
  const conflictBySession = new Map();
  conflicts.forEach((c) => {
    if (!conflictBySession.has(c.sessionId.toString())) conflictBySession.set(c.sessionId.toString(), []);
    conflictBySession.get(c.sessionId.toString()).push(c.message);
    if (c.conflictsWith) {
      const key = c.conflictsWith.toString();
      if (!conflictBySession.has(key)) conflictBySession.set(key, []);
      conflictBySession.get(key).push(c.message);
    }
  });

  const results = sessions.map((s) => {
    const sessionConflicts = conflictBySession.get(s._id.toString()) || [];
    return {
      sessionId: s._id,
      status: sessionConflicts.length > 0 ? 'CONFLICT' : 'SCHEDULED',
      conflictReason: sessionConflicts.join(' | '),
    };
  });

  return { results, totalConflicts: conflicts.length, conflicts };
}

/**
 * Optional LLM narrative summarizing the schedule quality/gaps. Never affects
 * status/conflict computation above.
 */
async function explainSchedule(event, scheduleResult) {
  let narrative = `Schedule generated: ${scheduleResult.results.filter((r) => r.status === 'SCHEDULED').length} sessions scheduled, ${scheduleResult.totalConflicts} conflicts detected.`;
  let source = 'RULE_ENGINE';

  if (aiProvider.isAvailable()) {
    const prompt = `Event "${event.title}" schedule summary: ${scheduleResult.results.filter((r) => r.status === 'SCHEDULED').length} sessions scheduled successfully, ${scheduleResult.totalConflicts} conflicts found.
Conflict details: ${scheduleResult.conflicts.slice(0, 5).map((c) => c.message).join('; ') || 'none'}.
Return ONLY JSON: {"recommendation": "<2-3 sentence summary and suggestion for resolving conflicts if any>"}`;
    const result = await aiProvider.generateJSON(
      'You are a scheduling assistant. Respond with ONLY valid JSON, no markdown, no preamble.',
      prompt
    );
    if (result && result.recommendation) {
      narrative = result.recommendation;
      source = 'LLM';
    }
  }

  try {
    await AIRecommendation.create({
      agent: 'SCHEDULING',
      event: event._id,
      targetType: 'Event',
      targetId: event._id,
      source,
      recommendation: narrative,
      score: scheduleResult.totalConflicts === 0 ? 100 : Math.max(0, 100 - scheduleResult.totalConflicts * 15),
      reasons: scheduleResult.conflicts.map((c) => c.message).slice(0, 10),
      alternatives: [],
    });
  } catch (e) {
    console.warn('[schedulingAgent] failed to persist AIRecommendation:', e.message);
  }

  return { recommendation: narrative, source };
}

module.exports = { detectConflicts, buildSchedule, explainSchedule };
