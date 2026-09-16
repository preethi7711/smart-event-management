/**
 * seed.js
 * Populates MongoDB with realistic, interconnected demo data across every
 * model: users, venues/rooms, speakers, events, sessions, registrations,
 * check-ins, ratings, and feedback. Safe to re-run (wipes and reseeds).
 *
 * Usage: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const User = require('./models/User');
const Venue = require('./models/Venue');
const Room = require('./models/Room');
const Speaker = require('./models/Speaker');
const Event = require('./models/Event');
const Session = require('./models/Session');
const Attendee = require('./models/Attendee');
const Registration = require('./models/Registration');
const CheckIn = require('./models/CheckIn');
const Rating = require('./models/Rating');
const Feedback = require('./models/Feedback');
const Notification = require('./models/Notification');
const AIRecommendation = require('./models/AIRecommendation');

const schedulingAgent = require('./services/ai/schedulingAgent');
const analyticsAgent = require('./services/ai/analyticsAgent');
const venueAgent = require('./services/ai/venueAgent');

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i += 1) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}
function dateOffset(baseDays, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + baseDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const FIRST_NAMES = ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Neha', 'Karan', 'Divya', 'Arjun', 'Meera', 'Sanjay', 'Kavya', 'Rahul', 'Isha', 'Aditya', 'Pooja', 'Nikhil', 'Sneha', 'Varun', 'Riya', 'Amit', 'Shreya', 'Manish', 'Tanvi', 'Rajesh', 'Anjali', 'Suresh', 'Deepika', 'Vivek', 'Kritika', 'Harsh', 'Simran', 'Gaurav', 'Nisha', 'Ashwin', 'Lakshmi', 'Ravi', 'Pallavi', 'Siddharth', 'Ritu', 'James', 'Emma', 'Michael', 'Olivia', 'David', 'Sophia', 'Daniel', 'Ava', 'Chris', 'Grace', 'Zara', 'Farhan', 'Ibrahim', 'Naina', 'Yash', 'Tara'];
const LAST_NAMES = ['Sharma', 'Verma', 'Iyer', 'Reddy', 'Nair', 'Gupta', 'Mehta', 'Rao', 'Kapoor', 'Joshi', 'Menon', 'Chatterjee', 'Bose', 'Malhotra', 'Kulkarni', 'Pillai', 'Desai', 'Agarwal', 'Chopra', 'Bhatt', 'Smith', 'Johnson', 'Williams', 'Brown', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas'];
const ORGS = ['TechNova Inc', 'Quantum Systems', 'BrightPath Labs', 'Vertex Solutions', 'Nimbus Cloud', 'DataForge', 'Skyline Analytics', 'Pioneer Robotics', 'Catalyst AI', 'Horizon Digital', 'Stanford University', 'MIT', 'IIT Delhi', 'Freelance', 'Independent Consultant'];
const JOB_TITLES = ['Software Engineer', 'Product Manager', 'CEO', 'Founder', 'Data Scientist', 'UX Designer', 'VP of Engineering', 'Student', 'Marketing Director', 'CTO', 'Research Analyst', 'DevOps Engineer', 'Journalist', 'Business Analyst', 'Head of Product'];
const EXPERTISE_AREAS = ['AI', 'Machine Learning', 'Cloud Computing', 'Cybersecurity', 'Blockchain', 'Product Management', 'UX Design', 'DevOps', 'Data Science', 'Robotics', 'Startups', 'Marketing', 'Leadership', 'Web Development', 'IoT'];

const POSITIVE_COMMENTS = [
  'Great session, the speaker was excellent and very engaging!',
  'Really helpful and practical content. Loved the demos.',
  'Insightful talk, learned a lot of useful things today.',
  'Fantastic presentation, clear explanations throughout.',
  'One of the best sessions at the event so far, well organized.',
];
const NEUTRAL_COMMENTS = [
  'The session was okay, covered the basics.',
  'Decent content, nothing groundbreaking but solid overview.',
  'It was fine, met my expectations for an intro session.',
];
const NEGATIVE_COMMENTS = [
  'The session felt rushed and a bit confusing at times.',
  'Content was somewhat boring, expected more depth.',
  'Room was disorganized and audio was unclear for part of the talk.',
];

async function wipeDatabase() {
  await Promise.all([
    User.deleteMany({}), Venue.deleteMany({}), Room.deleteMany({}), Speaker.deleteMany({}),
    Event.deleteMany({}), Session.deleteMany({}), Attendee.deleteMany({}), Registration.deleteMany({}),
    CheckIn.deleteMany({}), Rating.deleteMany({}), Feedback.deleteMany({}), Notification.deleteMany({}),
    AIRecommendation.deleteMany({}),
  ]);
}

async function seedUsers() {
  const admin = await User.create({ name: 'Aditi Rao', email: 'admin@smartevents.dev', password: 'password123', role: 'ADMIN', organization: 'Smart Events Platform', jobTitle: 'Platform Administrator' });
  const organizer1 = await User.create({ name: 'Rahul Mehta', email: 'organizer@smartevents.dev', password: 'password123', role: 'ORGANIZER', organization: 'Smart Events Platform', jobTitle: 'Senior Event Organizer' });
  const organizer2 = await User.create({ name: 'Sneha Kapoor', email: 'organizer2@smartevents.dev', password: 'password123', role: 'ORGANIZER', organization: 'Smart Events Platform', jobTitle: 'Event Organizer' });
  const attendeeUser = await User.create({ name: 'Vikram Nair', email: 'attendee@smartevents.dev', password: 'password123', role: 'ATTENDEE', organization: 'TechNova Inc', jobTitle: 'Software Engineer' });
  return { admin, organizer1, organizer2, attendeeUser };
}

async function seedVenuesAndRooms() {
  const venueDefs = [
    { name: 'Grand Convention Centre', city: 'Chennai', totalCapacity: 2000, pricePerDay: 150000, facilities: ['WIFI', 'PROJECTOR', 'CATERING', 'PARKING', 'AV_SYSTEM', 'STAGE'], rating: 4.7 },
    { name: 'Skyline Business Hub', city: 'Bengaluru', totalCapacity: 800, pricePerDay: 90000, facilities: ['WIFI', 'PROJECTOR', 'CATERING', 'AV_SYSTEM'], rating: 4.4 },
    { name: 'Innovate Tower Auditorium', city: 'Hyderabad', totalCapacity: 1200, pricePerDay: 110000, facilities: ['WIFI', 'PROJECTOR', 'PARKING', 'AV_SYSTEM', 'STAGE'], rating: 4.5 },
    { name: 'The Metropolitan Hall', city: 'Mumbai', totalCapacity: 1500, pricePerDay: 180000, facilities: ['WIFI', 'CATERING', 'PARKING', 'AV_SYSTEM', 'STAGE'], rating: 4.8 },
    { name: 'TechPark Conference Centre', city: 'Pune', totalCapacity: 600, pricePerDay: 65000, facilities: ['WIFI', 'PROJECTOR', 'AV_SYSTEM'], rating: 4.2 },
    { name: 'Riverside Exhibition Centre', city: 'Kolkata', totalCapacity: 1000, pricePerDay: 85000, facilities: ['WIFI', 'CATERING', 'PARKING'], rating: 4.1 },
    { name: 'Summit Plaza', city: 'Delhi', totalCapacity: 2500, pricePerDay: 200000, facilities: ['WIFI', 'PROJECTOR', 'CATERING', 'PARKING', 'AV_SYSTEM', 'STAGE'], rating: 4.9 },
    { name: 'Coastal Convention Hall', city: 'Kochi', totalCapacity: 500, pricePerDay: 55000, facilities: ['WIFI', 'PROJECTOR'], rating: 3.9 },
    { name: 'Central Business District Hall', city: 'Ahmedabad', totalCapacity: 900, pricePerDay: 75000, facilities: ['WIFI', 'CATERING', 'AV_SYSTEM'], rating: 4.3 },
    { name: 'Elevate Conference Suites', city: 'Chennai', totalCapacity: 400, pricePerDay: 45000, facilities: ['WIFI', 'PROJECTOR', 'AV_SYSTEM'], rating: 4.0 },
  ];

  const venues = [];
  const rooms = [];
  for (const def of venueDefs) {
    const venue = await Venue.create({
      ...def,
      address: `${randInt(1, 200)} ${rand(['MG Road', 'Main Street', 'Park Avenue', 'Tech Boulevard', 'Central Ave'])}`,
      accessibilityFeatures: ['WHEELCHAIR_ACCESS', 'ELEVATOR'],
      contactEmail: `venues@${def.name.toLowerCase().replace(/\s+/g, '')}.com`,
      contactPhone: `+91-${randInt(7000000000, 9999999999)}`,
    });
    venues.push(venue);

    const roomCount = randInt(1, 3);
    for (let i = 0; i < roomCount; i += 1) {
      const cap = Math.round(venue.totalCapacity / roomCount);
      const room = await Room.create({
        venue: venue._id,
        name: `${['Hall', 'Room', 'Auditorium'][i % 3]} ${String.fromCharCode(65 + i)}`,
        capacity: cap,
        facilities: venue.facilities,
        floor: String(randInt(1, 4)),
      });
      rooms.push(room);
    }
  }
  return { venues, rooms };
}

async function seedSpeakers() {
  const speakers = [];
  for (let i = 0; i < 15; i += 1) {
    const uniqueName = `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`;
    const speaker = await Speaker.create({
      name: uniqueName,
      email: `speaker${i + 1}@speakers.dev`,
      bio: `${uniqueName} is a recognized expert with deep experience across the technology industry.`,
      expertise: [...new Set([rand(EXPERTISE_AREAS), rand(EXPERTISE_AREAS)])],
      yearsExperience: randInt(2, 20),
      averageRating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
      totalSessions: 0,
      fee: randInt(5000, 50000),
      linkedIn: `https://linkedin.com/in/speaker-${i + 1}`,
    });
    speakers.push(speaker);
  }
  return speakers;
}

async function seedEventsSessionsAndBookings({ organizer1, organizer2, venues, rooms }) {
  const eventDefs = [
    {
      title: 'AI & Future Technology Summit 2026',
      description: 'A flagship summit exploring the frontier of artificial intelligence, cloud infrastructure, and the technologies shaping the next decade.',
      category: 'Technology', offsetDays: 21, durationDays: 2, expectedAttendance: 900,
      budget: 180000, requiredCapacity: 800, requiredFacilities: ['WIFI', 'PROJECTOR', 'AV_SYSTEM', 'STAGE'],
      organizer: organizer1, requiresApproval: true, featured: true,
    },
    {
      title: 'Cloud & DevOps Innovators Conference',
      description: 'Deep-dive sessions on cloud-native architecture, DevOps culture, and platform engineering best practices.',
      category: 'Technology', offsetDays: 45, durationDays: 1, expectedAttendance: 500,
      budget: 100000, requiredCapacity: 500, requiredFacilities: ['WIFI', 'PROJECTOR', 'AV_SYSTEM'],
      organizer: organizer1, requiresApproval: true,
    },
    {
      title: 'Product Leadership Forum',
      description: 'A gathering of product leaders sharing strategies for building category-defining products.',
      category: 'Business', offsetDays: 10, durationDays: 1, expectedAttendance: 300,
      budget: 70000, requiredCapacity: 300, requiredFacilities: ['WIFI', 'CATERING'],
      organizer: organizer2, requiresApproval: false,
    },
    {
      title: 'Cybersecurity & Data Privacy Summit',
      description: 'Covering the latest in threat intelligence, zero-trust architecture, and privacy-by-design.',
      category: 'Security', offsetDays: 60, durationDays: 1, expectedAttendance: 400,
      budget: 95000, requiredCapacity: 400, requiredFacilities: ['WIFI', 'AV_SYSTEM', 'PROJECTOR'],
      organizer: organizer2, requiresApproval: true,
    },
    {
      title: 'Startup & Founders Meetup',
      description: 'An energetic gathering for early-stage founders to network, learn, and pitch.',
      category: 'Startups', offsetDays: -5, durationDays: 1, expectedAttendance: 250,
      budget: 50000, requiredCapacity: 250, requiredFacilities: ['WIFI', 'CATERING'],
      organizer: organizer1, requiresApproval: false, isPast: true,
    },
  ];

  const events = [];
  for (const def of eventDefs) {
    const startDate = dateOffset(def.offsetDays, 9);
    const endDate = dateOffset(def.offsetDays + def.durationDays - 1, 18);

    // AI-scored venue selection (same deterministic scoring the live agent uses)
    const scored = venues
      .map((v) => ({ v, ...venueAgent.scoreVenue(v, { requiredCapacity: def.requiredCapacity, budget: def.budget, requiredFacilities: def.requiredFacilities }) }))
      .sort((a, b) => b.score - a.score);
    const chosenVenue = scored[0].v;
    const venueRooms = rooms.filter((r) => r.venue.toString() === chosenVenue._id.toString() && r.capacity >= Math.min(def.requiredCapacity, chosenVenue.totalCapacity));
    const chosenRoom = venueRooms[0] || rooms.find((r) => r.venue.toString() === chosenVenue._id.toString());

    const event = await Event.create({
      title: def.title,
      slug: `${def.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}-${randInt(100, 999)}`,
      description: def.description,
      category: def.category,
      startDate,
      endDate,
      expectedAttendance: def.expectedAttendance,
      budget: def.budget,
      requiredCapacity: def.requiredCapacity,
      requiredFacilities: def.requiredFacilities,
      status: def.isPast ? 'COMPLETED' : 'PUBLISHED',
      organizer: def.organizer._id,
      venue: chosenVenue._id,
      room: chosenRoom ? chosenRoom._id : undefined,
      registrationDeadline: dateOffset(def.offsetDays - 1, 23),
      requiresApproval: def.requiresApproval,
      tags: [def.category],
      publishedAt: new Date(),
    });
    events.push({ event, room: chosenRoom, def });
  }
  return events;
}

async function seedSessionsForEvent(eventEntry, speakers, allRooms) {
  const { event, room, def } = eventEntry;
  const sessionCount = def.featured ? 8 : randInt(3, 6);
  const sessionTypes = ['KEYNOTE', 'TALK', 'WORKSHOP', 'PANEL'];
  const sessions = [];

  const venueRooms = allRooms.filter((r) => room && r.venue.toString() === room.venue.toString());
  const usableRooms = venueRooms.length ? venueRooms : [room].filter(Boolean);

  let hourCursor = 9;
  for (let i = 0; i < sessionCount; i += 1) {
    const duration = rand([45, 60, 90]);
    const startTime = new Date(event.startDate);
    startTime.setHours(hourCursor, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + duration * 60000);
    hourCursor += Math.ceil(duration / 60) + 1; // gap between sessions
    if (hourCursor > 17) hourCursor = 9;

    const topic = rand(EXPERTISE_AREAS);
    const targetRoom = usableRooms.length ? usableRooms[i % usableRooms.length] : null;
    const speaker = speakers.find((sp) => sp.expertise.includes(topic)) || rand(speakers);

    const session = await Session.create({
      event: event._id,
      title: `${rand(['The Future of', 'Deep Dive into', 'Practical', 'Advanced', 'Building with'])} ${topic}`,
      description: `An in-depth look at ${topic} trends, tools, and real-world applications.`,
      topic,
      speaker: speaker._id,
      room: targetRoom ? targetRoom._id : undefined,
      startTime,
      endTime,
      capacity: targetRoom ? Math.min(targetRoom.capacity, randInt(50, 200)) : randInt(50, 200),
      sessionType: i === 0 ? 'KEYNOTE' : rand(sessionTypes),
      status: 'SCHEDULED',
    });
    sessions.push(session);
  }

  // Run the deterministic conflict detector for realism (should be conflict-free by construction)
  const scheduleResult = schedulingAgent.buildSchedule(sessions, usableRooms);
  await Promise.all(scheduleResult.results.map((r) => Session.findByIdAndUpdate(r.sessionId, { status: r.status, conflictReason: r.conflictReason })));

  return sessions;
}

async function seedAttendeesRegistrationsAndActivity(eventEntry, sessions, organizer) {
  const { event, def } = eventEntry;
  const attendeeCount = def.featured ? 60 : randInt(15, 35);
  const registrations = [];

  for (let i = 0; i < attendeeCount; i += 1) {
    const name = `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`;
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${event._id.toString().slice(-4)}${i}@example.com`;
    const jobTitle = rand(JOB_TITLES);
    const organization = rand(ORGS);

    const attendee = await Attendee.create({
      name, email, phone: `+91-${randInt(7000000000, 9999999999)}`,
      organization, jobTitle,
      ageGroup: rand(['18-24', '25-34', '35-44', '45-54', '55+']),
      gender: rand(['MALE', 'FEMALE', 'OTHER']),
      source: rand(['WEB', 'WEB', 'ORGANIZER_CREATED', 'IMPORTED']),
    });

    const statusRoll = Math.random();
    let status = 'APPROVED';
    if (def.requiresApproval) {
      if (statusRoll < 0.75) status = 'APPROVED';
      else if (statusRoll < 0.9) status = 'PENDING';
      else status = 'REJECTED';
    }

    const registration = await Registration.create({
      event: event._id,
      attendee: attendee._id,
      status,
      category: jobTitle.match(/CEO|Founder|VP|Head/) ? 'VIP' : jobTitle === 'Student' ? 'STUDENT' : jobTitle === 'Journalist' ? 'PRESS' : 'STANDARD',
      reviewedBy: status !== 'PENDING' ? organizer._id : undefined,
      reviewedAt: status !== 'PENDING' ? new Date() : undefined,
      aiInsight: { categoryConfidence: 0.7, flags: [] },
    });
    registrations.push(registration);

    // Check-ins and feedback only for approved attendees (simulate real attendance)
    if (status === 'APPROVED' && Math.random() < 0.65) {
      await CheckIn.create({ event: event._id, registration: registration._id, attendee: attendee._id, session: null, method: rand(['QR', 'CODE', 'MANUAL']) });

      const attendedSessions = pickN(sessions, randInt(1, Math.min(3, sessions.length)));
      for (const session of attendedSessions) {
        try {
          await CheckIn.create({ event: event._id, registration: registration._id, attendee: attendee._id, session: session._id, method: 'QR' });
        } catch (e) { /* duplicate guard, ignore */ }

        if (session.speaker && Math.random() < 0.6) {
          try {
            await Rating.create({ session: session._id, speaker: session.speaker, event: event._id, attendee: attendee._id, score: randInt(3, 5) });
          } catch (e) { /* unique guard, ignore */ }
        }

        if (Math.random() < 0.4) {
          const roll = Math.random();
          const comment = roll < 0.6 ? rand(POSITIVE_COMMENTS) : roll < 0.85 ? rand(NEUTRAL_COMMENTS) : rand(NEGATIVE_COMMENTS);
          const { sentiment, sentimentScore } = analyticsAgent.scoreSentiment(comment);
          await Feedback.create({ event: event._id, session: session._id, attendee: attendee._id, comment, sentiment, sentimentScore });
        }
      }
    }
  }

  return registrations;
}

async function recomputeAllSpeakerRatings(speakers) {
  for (const sp of speakers) {
    const ratings = await Rating.find({ speaker: sp._id });
    const avg = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : sp.averageRating;
    const sessionIds = [...new Set(ratings.map((r) => r.session.toString()))];
    await Speaker.findByIdAndUpdate(sp._id, {
      averageRating: Number(avg.toFixed(2)),
      totalSessions: sessionIds.length,
    });
  }
}

async function run() {
  await connectDB();
  console.log('[seed] Connected. Wiping existing data...');
  await wipeDatabase();
  console.log('[seed] Wiped. Seeding fresh data...\n');

  const { organizer1, organizer2 } = await seedUsers();
  console.log('[seed] Users created: admin, 2 organizers, 1 demo attendee.');

  const { venues, rooms } = await seedVenuesAndRooms();
  console.log(`[seed] Venues: ${venues.length}, Rooms: ${rooms.length}`);

  const speakers = await seedSpeakers();
  console.log(`[seed] Speakers: ${speakers.length}`);

  const eventEntries = await seedEventsSessionsAndBookings({ organizer1, organizer2, venues, rooms });
  console.log(`[seed] Events created: ${eventEntries.length}`);

  let totalSessions = 0;
  let totalRegistrations = 0;
  for (const entry of eventEntries) {
    const sessions = await seedSessionsForEvent(entry, speakers, rooms);
    totalSessions += sessions.length;
    const owningOrganizer = entry.def.organizer;
    const regs = await seedAttendeesRegistrationsAndActivity(entry, sessions, owningOrganizer);
    totalRegistrations += regs.length;
    console.log(`  -> "${entry.event.title}": ${sessions.length} sessions, ${regs.length} registrations`);
  }

  await recomputeAllSpeakerRatings(speakers);

  const totalCheckIns = await CheckIn.countDocuments({});
  const totalRatings = await Rating.countDocuments({});
  const totalFeedback = await Feedback.countDocuments({});

  console.log('\n[seed] ================= SUMMARY =================');
  console.log(`  Users:          4 (admin, 2 organizers, 1 attendee)`);
  console.log(`  Venues:         ${venues.length}`);
  console.log(`  Rooms:          ${rooms.length}`);
  console.log(`  Speakers:       ${speakers.length}`);
  console.log(`  Events:         ${eventEntries.length}`);
  console.log(`  Sessions:       ${totalSessions}`);
  console.log(`  Registrations:  ${totalRegistrations}`);
  console.log(`  Check-ins:      ${totalCheckIns}`);
  console.log(`  Ratings:        ${totalRatings}`);
  console.log(`  Feedback:       ${totalFeedback}`);
  console.log('===============================================\n');
  console.log('[seed] Demo credentials:');
  console.log('  Admin:      admin@smartevents.dev / password123');
  console.log('  Organizer:  organizer@smartevents.dev / password123');
  console.log('  Organizer2: organizer2@smartevents.dev / password123');
  console.log('  Attendee:   attendee@smartevents.dev / password123');
  console.log('\n[seed] Done. Disconnecting.');
  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  run().catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
}

module.exports = { run };
