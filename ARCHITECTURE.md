# Smart Event Management — Technical Documentation

## 1. System Architecture
The Smart Event Management Platform is built on the MERN stack (MongoDB, Express, React, Node.js).
It integrates real-time event updates via Socket.IO and leverages an advanced Agentic AI operations center for decision support and predictive analytics.

### Key Components:
- **Frontend (React/Vite)**: Robust SPA with role-based routing (`/dashboard`, `/executive`, `/ai-ops`).
- **Backend (Node.js/Express)**: RESTful APIs with strict RBAC (`protect`, `authorize` middleware).
- **Database (MongoDB)**: Scalable document store with performance indexes on high-throughput collections (`CheckIn`, `Registration`, `Event`).
- **Real-Time (Socket.IO)**: Bi-directional event communication for instant UI updates.

## 2. Event Intelligence Engine & Analytics Architecture
Located in `backend/services/analytics/analyticsService.js`, the intelligence engine operates purely on deterministic data (no fabricated LLM metrics).

**Data Pipeline:**
1. Aggregates data from `Registration`, `CheckIn`, `Session`, `Feedback`.
2. Computes Key Metrics: `capacityUtilization`, `attendanceRate`, `noShowRate`, `avgSessionRating`.
3. Anomaly & Risk Detection: Pattern matching against static thresholds (e.g., >95% capacity = HIGH RISK).
4. Emits `Alerts` to the database directly if thresholds trigger operational risks.

## 3. AI Agents & Orchestration
Located in `backend/services/ai/`. The platform transitions from simple LLM wrappers to an **Orchestrated Agentic Model** using `@google/generative-ai`.

**Agent Roster:**
- `eventAnalyst`: General KPI analysis.
- `attendanceAgent`: Predicts no-shows and attendance risks.
- `engagementAgent`: Evaluates feedback sentiment and session ratings.
- `riskAgent`: Analyzes capacity, venue utilization, and system anomalies.
- `executiveAgent`: Consolidates multi-event portfolio insights.
- `recommendationAgent`: Provides tactical next steps.
- `incidentAgent`: Evaluates technical and medical emergencies.
- `sponsorAgent`: Monitors sponsor deliverables.

**Orchestrator (`orchestrator.js`):**
Routes queries dynamically. For predefined operational scenarios (e.g., "Venue Capacity Issue"), it sequentially chains multiple agents (e.g., `riskAgent` + `attendanceAgent`), synthesizes their findings, and outputs a single, high-confidence consolidated recommendation.

## 4. Decision-Support Architecture
Powered by the `Alert` model and the `AIOpsPage.jsx` dashboard. Real-time deterministic rule evaluation pushes priority alerts to the Decision Support Alerts panel. 

## 5. Executive Dashboard
The `ExecutiveDashboardPage.jsx` aggregates cross-event intelligence. It highlights average platform health, total reach, and lists critical risks spanning all events managed by the Organizer or Admin.

## 6. RBAC & Security
- **Authentication**: JWT-based.
- **RBAC**: Handled via `authorize('ADMIN', 'ORGANIZER')` middleware.
- **Middleware Protections**: `helmet` (HTTP headers), `express-rate-limit` (DDoS mitigation), parameterized Mongoose queries (NoSQL Injection protection).
- **Graceful Degradation**: If the AI Provider API key is missing or fails, agents fallback to a deterministic `RULE_ENGINE` response safely.

## 7. Performance Optimization
- Monitored heavy aggregate queries and added targeted compound indexes: `CheckInSchema.index({ event: 1, session: 1 })`, `RegistrationSchema.index({ event: 1, status: 1 })`.
- Mongoose `.lean()` and targeted `.select()` queries are implemented on list views.

## 8. Deployment & Environment
- **`.env.example`** provides required configuration structure for MongoDB URIs, JWT Secrets, and Gemini API Keys.
- E2E Testing verified using `Playwright` to simulate Attendee, Organizer, and Executive workflows.

## 9. Limitations
- AI predictions require historical data; new events with zero registrations will yield deterministic default predictions.
- WebSockets may require a Redis adapter (`socket.io-redis`) if the Node server scales horizontally to multiple instances.
