# EventOps — Agentic AI Smart Event Management Platform

A full-stack MERN application for running events end-to-end: AI-assisted venue
and speaker selection, deterministic conflict-free scheduling, attendee
registration and check-in, and live analytics — all backed by real MongoDB
data with Socket.IO real-time updates.

> **A note on how this was built and verified:** every backend module was
> syntax-checked and required (module-load) without errors, and the 5 AI
> agents' deterministic logic (venue scoring, speaker matching, conflict
> detection, duplicate detection, categorization, sentiment scoring) was
> covered by 19 unit tests, all passing. The full React frontend builds
> cleanly with `vite build`. **What was not possible to verify in the build
> environment:** a live, end-to-end run against a real MongoDB instance —
> the sandbox this was built in has no route to MongoDB's package servers.
> Follow the setup steps below on your own machine (or Atlas) to run it
> live; if anything doesn't behave as expected, the error messages should
> point straight at the cause since every route has explicit validation and
> error handling.

---

## 1. Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4 + React Router + Axios + Socket.IO client + Recharts + Lucide icons
- **Backend:** Node.js + Express + MongoDB + Mongoose + JWT + bcrypt + Socket.IO + Nodemailer
- **AI:** Pluggable LLM provider (Anthropic API) with deterministic rule-engine fallback — the app is fully functional and demoable with **zero API keys configured**.

## 2. Project structure

```
smart-event-management/
├── backend/
│   ├── config/db.js
│   ├── models/            # 12 Mongoose models
│   ├── controllers/
│   ├── routes/
│   ├── middleware/        # auth (JWT + RBAC), error handler
│   ├── services/
│   │   ├── ai/             # aiProvider, registrationAgent, venueAgent,
│   │   │                    speakerAgent, schedulingAgent, analyticsAgent
│   │   ├── email/          # emailService (dev-mode fallback)
│   │   ├── analytics/      # analyticsService (real MongoDB aggregation)
│   │   └── socket.js
│   ├── seed.js
│   ├── server.js
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/     # ui/, events/ (venue/session/schedule/attendee tabs), dashboard/
│       ├── pages/           # one per nav item
│       ├── layouts/
│       ├── context/         # AuthContext, SocketContext
│       ├── hooks/
│       └── services/api.js
├── .gitignore
└── README.md
```

## 3. Setup

### Prerequisites
- Node.js 18+
- A running MongoDB instance (local `mongod`, Docker, or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### Backend

```bash
cd backend
cp .env.example .env
# edit .env: set MONGO_URI to your MongoDB connection string, JWT_SECRET to any long random string
npm install
npm run seed     # wipes and populates the database with realistic demo data
npm run dev       # starts the API on http://localhost:5000 with nodemon
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:5173, proxies /api and /socket.io to :5000
```

Open **http://localhost:5173** and log in with one of the demo accounts below.

### Optional: enabling live LLM narration

By default `ANTHROPIC_API_KEY` is empty in `.env`, so every AI agent runs on
its deterministic rule engine (real scoring, real conflict detection — this
is the source of truth either way). To layer an LLM-generated natural-language
explanation on top, set `ANTHROPIC_API_KEY` in `backend/.env`. Nothing else
changes — scores and conflict correctness are never delegated to the LLM.

### Optional: enabling live email sending

By default, no `SMTP_*` variables are set, so the app runs in **development
email mode**: every email is logged to the console and appended to
`backend/dev-emails.log` instead of being sent, and a `Notification` record
is still saved to MongoDB. To send real email, set `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `backend/.env`.

---

## 4. Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@smartevents.dev` | `password123` |
| Organizer | `organizer@smartevents.dev` | `password123` |
| Organizer (2nd) | `organizer2@smartevents.dev` | `password123` |
| Attendee | `attendee@smartevents.dev` | `password123` |

The seed script also creates 50+ realistic attendee registrations with
randomly-generated names/emails per event (not login accounts — these
represent the attendee directory, matching how real conferences track
attendees separately from platform user accounts).

---

## 5. Milestone 1 demo flow — Registration Intelligence

1. Log in as **organizer@smartevents.dev**.
2. Go to **Registrations**, pick "AI & Future Technology Summit 2026".
3. Click **AI insights** — see real, database-computed registration stats
   (approval rate, attendance rate, no-show rate) with an AI-generated
   narrative (rule-based unless you've set an API key).
4. Filter by status `PENDING`, approve or reject a registration — watch the
   **signal strip** at the top of the screen light up in real time
   (`registration.approved` event via Socket.IO), and check
   `backend/dev-emails.log` for the approval email that was "sent".
5. Go to **Check-In**, select the same event, and check in using a
   `checkInCode` (you can find one by inspecting a Registration document in
   MongoDB, or by registering yourself as an attendee via the event page).
   Duplicate check-in attempts are rejected with a clear error.
6. Go to **Analytics** for the same event — KPIs, registration trend,
   session popularity, and feedback sentiment charts, all computed live
   from MongoDB (nothing hardcoded).

## 6. Milestone 2 demo flow — Venue & Speaker Operations

1. Still logged in as organizer, go to **Events → New event**. Fill in
   required capacity, budget, and required facilities.
2. Open the new event, go to the **Venue** tab — the **AI Venue
   Recommendation** card shows the top-scoring venue (0–100, with an
   explainable breakdown: capacity/budget/facilities/rating). Click
   **Lock & book this venue** — this calls `POST /venues/lock` (5-minute
   soft lock, visible in real time to other organizers) followed by
   `POST /venues/book`, which double-checks for date-overlapping bookings
   server-side before confirming.
3. Go to **Sessions & Speakers**, click **New session**, set a topic (e.g.
   "AI"). Click **AI recommend speaker** — see the ranked candidate with
   expertise/rating/availability reasoning, then **Assign this speaker**.
   Try assigning the same speaker to an overlapping session — the backend
   rejects it with a conflict error.
4. Go to the **Schedule** tab and click **Run schedule check** — the
   deterministic Scheduling Agent flags any speaker/room double-bookings or
   capacity violations across every session, and an AI narrative summarizes
   the result.
5. Once conflict-free, go back to Overview and click **Publish event** —
   this is blocked server-side if any session is still in `CONFLICT` status
   or no venue is booked.
6. Log out, log in as **attendee@smartevents.dev**, open the published
   event, and register — the attendee view shows the schedule, lets you
   rate speakers and leave feedback once you have your check-in code.
7. Back as organizer, open **AI Insights** for the event to see the unified
   Analytics Agent output combining registrations, attendance, venue
   utilization, and feedback sentiment into a handful of actionable insights.

---

## 7. Design notes

- **AI agents are explainable and non-authoritative for correctness.** Venue
  and speaker scores, and all scheduling conflict detection, are computed by
  deterministic functions in `backend/services/ai/*.js` — see
  `scoreVenue`, `scoreSpeaker`, and `detectConflicts`. The LLM (when
  configured) only ever adds a natural-language explanation on top; if the
  LLM call fails or is unconfigured, `aiProvider.isAvailable()` returns
  `false` and every agent silently falls back with no loss of functionality.
- **No hardcoded analytics.** Every number in `AnalyticsPage`,
  `DashboardPage`, and the Registration/Session insight cards comes from a
  live MongoDB aggregation in `backend/services/analytics/analyticsService.js`.
- **Real-time events** (`registration.created`, `checkin.created`,
  `venue.locked`, `schedule.updated`, etc.) are emitted from controllers via
  `services/socket.js` and consumed by `SocketContext` on the frontend,
  visible in the "signal strip" ticker at the top of every dashboard page.
- **Backend-enforced conflict prevention**: room double-booking, speaker
  double-booking, and duplicate check-ins are all rejected at the database/
  controller layer, not just in the UI.
