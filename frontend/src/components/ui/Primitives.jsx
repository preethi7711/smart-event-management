export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'bg-[var(--color-surface-3)] text-[var(--color-text-dim)] border-[var(--color-border-bright)]',
    amber: 'bg-[var(--color-amber-dim)] text-[var(--color-amber)] border-[var(--color-amber)]/30',
    teal: 'bg-[var(--color-teal-dim)] text-[var(--color-teal)] border-[var(--color-teal)]/30',
    rose: 'bg-[var(--color-rose-dim)] text-[var(--color-rose)] border-[var(--color-rose)]/30',
    violet: 'bg-[var(--color-violet)]/10 text-[var(--color-violet)] border-[var(--color-violet)]/30',
    blue: 'bg-[var(--color-blue)]/10 text-[var(--color-blue)] border-[var(--color-blue)]/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium border ${tones[tone] || tones.neutral} ${className}`}>
      {children}
    </span>
  );
}

export function statusTone(status) {
  const map = {
    APPROVED: 'teal', SCHEDULED: 'teal', SENT: 'teal', PUBLISHED: 'teal', ONGOING: 'teal', COMPLETED: 'blue',
    PENDING: 'amber', DRAFT: 'amber', PLANNING: 'amber', DEV_LOGGED: 'amber', WAITLISTED: 'amber',
    REJECTED: 'rose', CANCELLED: 'rose', CONFLICT: 'rose', FAILED: 'rose',
  };
  return map[status] || 'neutral';
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  const variants = {
    primary: 'bg-[var(--color-amber)] text-[#1A1200] hover:brightness-110',
    secondary: 'bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border-bright)] hover:bg-[var(--color-surface-2)]',
    ghost: 'text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
    danger: 'bg-[var(--color-rose)]/10 text-[var(--color-rose)] border border-[var(--color-rose)]/30 hover:bg-[var(--color-rose)]/20',
    success: 'bg-[var(--color-teal)]/10 text-[var(--color-teal)] border border-[var(--color-teal)]/30 hover:bg-[var(--color-teal)]/20',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--color-text-dim)]">
      <Spinner size={28} />
      <p className="font-mono text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="text-[var(--color-rose)] font-medium">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
      {Icon && <Icon size={32} className="text-[var(--color-text-faint)]" />}
      <p className="font-display font-semibold text-[var(--color-text)]">{title}</p>
      {description && <p className="text-sm text-[var(--color-text-dim)] max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-mono text-[var(--color-text-dim)] mb-1.5 uppercase tracking-wide">{label}</span>}
      <input
        className={`w-full bg-[var(--color-surface-2)] border border-[var(--color-border-bright)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-amber)] transition-colors ${className}`}
        {...props}
      />
      {error && <span className="block text-xs text-[var(--color-rose)] mt-1">{error}</span>}
    </label>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-mono text-[var(--color-text-dim)] mb-1.5 uppercase tracking-wide">{label}</span>}
      <select
        className={`w-full bg-[var(--color-surface-2)] border border-[var(--color-border-bright)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-amber)] transition-colors ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="block text-xs text-[var(--color-rose)] mt-1">{error}</span>}
    </label>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-mono text-[var(--color-text-dim)] mb-1.5 uppercase tracking-wide">{label}</span>}
      <textarea
        className={`w-full bg-[var(--color-surface-2)] border border-[var(--color-border-bright)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-amber)] transition-colors ${className}`}
        {...props}
      />
      {error && <span className="block text-xs text-[var(--color-rose)] mt-1">{error}</span>}
    </label>
  );
}
