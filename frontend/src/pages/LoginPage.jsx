import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/ui/Primitives';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(form.email, form.password);
    setLoading(false);
    if (res.success) navigate('/');
    else setError(res.message);
  }

  function fillDemo(role) {
    const creds = {
      admin: { email: 'admin@smartevents.dev', password: 'password123' },
      organizer: { email: 'organizer@smartevents.dev', password: 'password123' },
      attendee: { email: 'attendee@smartevents.dev', password: 'password123' },
    };
    setForm(creds[role]);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-amber)] flex items-center justify-center">
            <Sparkles size={18} className="text-[#1A1200]" />
          </div>
          <span className="font-display text-xl font-semibold text-[var(--color-text)]">EventOps</span>
        </div>

        <Card className="p-6">
          <h1 className="font-display text-lg font-semibold text-[var(--color-text)] mb-1">Welcome back</h1>
          <p className="text-sm text-[var(--color-text-dim)] mb-6">Sign in to the AI event command center.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />
            <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            {error && <p className="text-sm text-[var(--color-rose)]">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              <LogIn size={15} /> {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
            <p className="text-xs font-mono text-[var(--color-text-faint)] uppercase tracking-wide mb-2">Quick demo login</p>
            <div className="flex gap-2">
              <button onClick={() => fillDemo('admin')} className="flex-1 text-xs py-1.5 rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] border border-[var(--color-border)]">Admin</button>
              <button onClick={() => fillDemo('organizer')} className="flex-1 text-xs py-1.5 rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] border border-[var(--color-border)]">Organizer</button>
              <button onClick={() => fillDemo('attendee')} className="flex-1 text-xs py-1.5 rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] border border-[var(--color-border)]">Attendee</button>
            </div>
          </div>
        </Card>

        <p className="text-center text-sm text-[var(--color-text-dim)] mt-4">
          No account? <Link to="/register" className="text-[var(--color-amber)] hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
