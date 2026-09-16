const Registration = require('../../models/Registration');
const CheckIn = require('../../models/CheckIn');
const Session = require('../../models/Session');
const Rating = require('../../models/Rating');
const Feedback = require('../../models/Feedback');
const Attendee = require('../../models/Attendee');

/** Registration + attendance stats for a single event, computed live from MongoDB. */
async function getEventRegistrationStats(eventId) {
  const registrations = await Registration.find({ event: eventId }).populate('attendee');
  const total = registrations.length;
  const approved = registrations.filter((r) => r.status === 'APPROVED').length;
  const pending = registrations.filter((r) => r.status === 'PENDING').length;
  const rejected = registrations.filter((r) => r.status === 'REJECTED').length;
  const waitlisted = registrations.filter((r) => r.status === 'WAITLISTED').length;

  const checkIns = await CheckIn.find({ event: eventId, session: null });
  const checkedIn = checkIns.length;

  const approvalRate = total ? Math.round((approved / total) * 100) : 0;
  const attendanceRate = approved ? Math.round((checkedIn / approved) * 100) : 0;
  const noShowRate = approved ? Math.round(((approved - checkedIn) / approved) * 100) : 0;

  // Demographics
  const ageGroups = {};
  const genders = {};
  registrations.forEach((r) => {
    if (!r.attendee) return;
    const ag = r.attendee.ageGroup || 'UNSPECIFIED';
    const g = r.attendee.gender || 'UNSPECIFIED';
    ageGroups[ag] = (ageGroups[ag] || 0) + 1;
    genders[g] = (genders[g] || 0) + 1;
  });

  // Trend: registrations grouped by day
  const trendMap = {};
  registrations.forEach((r) => {
    const day = r.createdAt.toISOString().slice(0, 10);
    trendMap[day] = (trendMap[day] || 0) + 1;
  });
  const trend = Object.entries(trendMap).sort(([a], [b]) => (a > b ? 1 : -1)).map(([date, count]) => ({ date, count }));

  return {
    total, approved, pending, rejected, waitlisted, checkedIn,
    approvalRate, attendanceRate, noShowRate, ageGroups, genders, trend,
  };
}

/** Session popularity + rating stats for an event. */
async function getSessionAnalytics(eventId) {
  const sessions = await Session.find({ event: eventId }).populate('speaker', 'name averageRating').populate('room', 'name capacity');
  const results = await Promise.all(
    sessions.map(async (s) => {
      const checkIns = await CheckIn.countDocuments({ session: s._id });
      const ratings = await Rating.find({ session: s._id });
      const avgRating = ratings.length ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 0;
      const capacityUtilization = s.capacity ? Math.round((checkIns / s.capacity) * 100) : 0;
      return {
        sessionId: s._id,
        title: s.title,
        speaker: s.speaker ? s.speaker.name : null,
        room: s.room ? s.room.name : null,
        checkIns,
        capacity: s.capacity,
        capacityUtilization,
        avgRating: Number(avgRating.toFixed(2)),
        ratingCount: ratings.length,
        status: s.status,
      };
    })
  );
  return results.sort((a, b) => b.checkIns - a.checkIns);
}

/** Feedback sentiment breakdown for an event. */
async function getFeedbackStats(eventId) {
  const feedback = await Feedback.find({ event: eventId });
  const total = feedback.length;
  const positive = feedback.filter((f) => f.sentiment === 'POSITIVE').length;
  const neutral = feedback.filter((f) => f.sentiment === 'NEUTRAL').length;
  const negative = feedback.filter((f) => f.sentiment === 'NEGATIVE').length;
  return {
    total,
    positive,
    neutral,
    negative,
    positivePct: total ? Math.round((positive / total) * 100) : 0,
  };
}

/** Venue/room utilization across an event's sessions. */
async function getVenueUtilization(eventId) {
  const sessions = await Session.find({ event: eventId }).populate('room', 'name capacity');
  if (sessions.length === 0) return 0;
  let totalCapacity = 0;
  let totalUsed = 0;
  await Promise.all(
    sessions.map(async (s) => {
      if (!s.room) return;
      const checkIns = await CheckIn.countDocuments({ session: s._id });
      totalCapacity += s.room.capacity || 0;
      totalUsed += checkIns;
    })
  );
  return totalCapacity ? Math.round((totalUsed / totalCapacity) * 100) : 0;
}

/** Combines everything into the unified dashboard payload for an event. */
async function getUnifiedEventAnalytics(eventId) {
  const Event = require('../../models/Event');
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const [regStats, sessionStats, feedbackStats, venueUtilization] = await Promise.all([
    getEventRegistrationStats(eventId),
    getSessionAnalytics(eventId),
    getFeedbackStats(eventId),
    getVenueUtilization(eventId),
  ]);

  const avgSessionRating = sessionStats.length
    ? Number((sessionStats.reduce((sum, s) => sum + s.avgRating, 0) / sessionStats.length).toFixed(2))
    : 0;
  const topSession = sessionStats.length ? sessionStats[0].title : null;

  const requiredCapacity = event.requiredCapacity || 0;
  let capacityUtilization = 0;
  if (requiredCapacity > 0) {
    capacityUtilization = Math.round((regStats.approved / requiredCapacity) * 100);
  }

  // Calculate Intelligence
  const risks = [];
  const anomalies = [];

  if (requiredCapacity > 0 && capacityUtilization >= 95) {
    risks.push({ type: 'CAPACITY', level: 'HIGH', message: 'Event is near or over capacity.' });
  }
  if (regStats.noShowRate > 20) {
    risks.push({ type: 'ATTENDANCE', level: 'MEDIUM', message: 'High no-show rate detected.' });
  }
  if (venueUtilization > 90) {
    risks.push({ type: 'VENUE', level: 'HIGH', message: 'Venue capacity utilization is dangerously high.' });
  }
  if (feedbackStats.total > 0 && feedbackStats.positivePct < 50) {
    risks.push({ type: 'SATISFACTION', level: 'HIGH', message: 'Negative sentiment trending in feedback.' });
  }

  if (regStats.total > 0 && regStats.approved === 0) {
    anomalies.push('High registration volume but zero approvals.');
  }
  if (regStats.attendanceRate < 30 && regStats.approved > 0 && regStats.checkedIn > 0) {
    anomalies.push('Unusually low check-in rate given approved registrations.');
  }

  // Event Health Score (0-100)
  let score = 100;
  if (risks.some(r => r.level === 'HIGH')) score -= 20;
  if (risks.some(r => r.level === 'MEDIUM')) score -= 10;
  if (anomalies.length > 0) score -= 10;
  if (avgSessionRating > 0 && avgSessionRating < 3.5) score -= 15;
  if (regStats.attendanceRate > 0 && regStats.attendanceRate < 50) score -= 15;

  score = Math.max(0, Math.min(100, score));
  let healthStatus = 'GOOD';
  if (score < 50) healthStatus = 'CRITICAL';
  else if (score < 80) healthStatus = 'WARNING';

  // Engagement Score
  let engagementScore = 0;
  if (regStats.checkedIn > 0) {
     const checkinScore = (regStats.attendanceRate / 100) * 40;
     const ratingScore = (avgSessionRating / 5) * 30;
     const feedbackVolumeScore = Math.min((feedbackStats.total / regStats.checkedIn) * 100, 30);
     engagementScore = Math.round(checkinScore + ratingScore + feedbackVolumeScore);
  }

  const intelligence = {
    healthScore: score,
    healthStatus,
    risks,
    anomalies,
    engagementScore
  };

  // Generate Real-time Decision Support Alerts for HIGH risks
  if (risks.some(r => r.level === 'HIGH')) {
    const Alert = require('../../models/Alert');
    for (const risk of risks.filter(r => r.level === 'HIGH')) {
       // Upsert so we don't spam
       await Alert.findOneAndUpdate(
         { event: eventId, title: `High Risk: ${risk.type}`, status: 'New' },
         { 
           title: `High Risk: ${risk.type}`,
           severity: 'Critical',
           event: eventId,
           entityType: 'Event',
           entityId: eventId,
           evidence: risk.message,
           recommendedAction: 'Review event metrics and initiate mitigation protocol immediately.',
           sourceAgent: 'Analytics Engine'
         },
         { upsert: true, new: true, setDefaultsOnInsert: true }
       ).catch(e => console.error('[Alert Generator] Error:', e.message));
    }
  }

  return {
    eventId,
    title: event.title,
    status: event.status,
    registrations: regStats.total,
    approved: regStats.approved,
    pending: regStats.pending,
    checkedIn: regStats.checkedIn,
    approvalRate: regStats.approvalRate,
    attendanceRate: regStats.attendanceRate,
    noShowRate: regStats.noShowRate,
    capacityUtilization,
    demographics: { ageGroups: regStats.ageGroups, genders: regStats.genders },
    registrationTrend: regStats.trend,
    sessions: sessionStats,
    avgSessionRating,
    topSession,
    venueUtilization,
    feedback: feedbackStats,
    feedbackPositivePct: feedbackStats.positivePct,
    intelligence
  };
}

module.exports = {
  getEventRegistrationStats,
  getSessionAnalytics,
  getFeedbackStats,
  getVenueUtilization,
  getUnifiedEventAnalytics,
};
