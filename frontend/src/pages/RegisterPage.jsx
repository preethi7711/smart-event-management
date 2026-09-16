import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Select, Card } from '../components/ui/Primitives';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ATTENDEE', organization: '', jobTitle: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await register(form);
    setLoading(false);
    if (res.success) navigate('/');
    else setError(res.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-amber)] flex items-center justify-center">
            <Sparkles size={18} className="text-[#1A1200]" />
          </div>
          <span className="font-display text-xl font-semibold text-[var(--color-text)]">EventOps</span>
        </div>

        <Card className="p-6">
          <h1 className="font-display text-lg font-semibold text-[var(--color-text)] mb-1">Create your account</h1>
          <p className="text-sm text-[var(--color-text-dim)] mb-6">Join as an attendee or organizer.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />
            <Input label="Password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
            <Select label="Account type" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ATTENDEE">Attendee</option>
              <option value="ORGANIZER">Organizer</option>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="Optional" />
              <Input label="Job title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="Optional" />
            </div>
            {error && <p className="text-sm text-[var(--color-rose)]">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              <UserPlus size={15} /> {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-[var(--color-text-dim)] mt-4">
          Already have an account? <Link to="/login" className="text-[var(--color-amber)] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
