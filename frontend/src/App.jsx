import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import DashboardLayout from './layouts/DashboardLayout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExecutiveDashboardPage from './pages/ExecutiveDashboardPage';
import AIOpsPage from './pages/AIOpsPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import RegistrationsPage from './pages/RegistrationsPage';
import AttendeesPage from './pages/AttendeesPage';
import VenuesPage from './pages/VenuesPage';
import SpeakersPage from './pages/SpeakersPage';
import SessionsPage from './pages/SessionsPage';
import SchedulePage from './pages/SchedulePage';
import CheckInPage from './pages/CheckInPage';
import FeedbackPage from './pages/FeedbackPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AIInsightsPage from './pages/AIInsightsPage';
import { LoadingState } from './components/ui/Primitives';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]"><LoadingState label="Loading…" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="executive" element={<ExecutiveDashboardPage />} />
        <Route path="ai-ops" element={<AIOpsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="registrations" element={<RegistrationsPage />} />
        <Route path="attendees" element={<AttendeesPage />} />
        <Route path="venues" element={<VenuesPage />} />
        <Route path="speakers" element={<SpeakersPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="checkin" element={<CheckInPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="ai-insights" element={<AIInsightsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1B2338', color: '#E8ECF7', border: '1px solid #2A3350', fontSize: '13px' },
            }}
          />
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
