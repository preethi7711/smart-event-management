import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, ClipboardList, Users, Building2, Mic2,
  ListChecks, CalendarClock, QrCode, MessageSquareText, BarChart3, Sparkles, LogOut, Activity, MessageCircle, Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SignalStrip from '../components/dashboard/SignalStrip';

import { useState } from 'react';
import AIAssistant from '../components/AIAssistant';

const BASE_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/executive', label: 'Executive Dashboard', icon: Activity }, 
  { to: '/ai-ops', label: 'AI Ops Center', icon: Server },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/registrations', label: 'Registrations', icon: ClipboardList },
  { to: '/attendees', label: 'Attendees', icon: Users },
  { to: '/venues', label: 'Venues', icon: Building2 },
  { to: '/speakers', label: 'Speakers', icon: Mic2 },
  { to: '/sessions', label: 'Sessions', icon: ListChecks },
  { to: '/schedule', label: 'Schedule', icon: CalendarClock },
  { to: '/checkin', label: 'Check-In', icon: QrCode },
  { to: '/feedback', label: 'Feedback', icon: MessageSquareText },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/ai-insights', label: 'AI Insights', icon: Sparkles },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showAssistant, setShowAssistant] = useState(false);

  const navItems = BASE_NAV;

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)] relative">
      <aside className="w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
        <div className="px-5 py-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--color-amber)] flex items-center justify-center">
              <Sparkles size={15} className="text-[#1A1200]" />
            </div>
            <span className="font-display font-semibold text-[var(--color-text)] tracking-tight">EventOps</span>
          </div>
          <p className="text-[10px] font-mono text-[var(--color-text-faint)] mt-1 uppercase tracking-wide">AI Command Center</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--color-surface-3)] text-[var(--color-amber)] font-medium'
                    : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--color-border)]">
          <div className="px-2 py-2 mb-1">
            <p className="text-sm font-medium text-[var(--color-text)] truncate">{user?.name}</p>
            <p className="text-[10px] font-mono text-[var(--color-text-faint)] uppercase">{user?.role}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--color-text-dim)] hover:text-[var(--color-rose)] hover:bg-[var(--color-rose)]/10 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <SignalStrip />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* AI Assistant Floating Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
         {showAssistant && (
            <div className="mb-4 w-[350px] shadow-2xl rounded-lg overflow-hidden animate-in slide-in-from-bottom-5">
               <AIAssistant />
            </div>
         )}
         <button 
           onClick={() => setShowAssistant(!showAssistant)}
           className="bg-[var(--color-amber)] text-black w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
         >
           {showAssistant ? <LogOut size={20} /> : <MessageCircle size={20} />}
         </button>
      </div>
    </div>
  );
}
