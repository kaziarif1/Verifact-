import { cn } from '../../utils/cn';

interface BadgeProps { children: React.ReactNode; className?: string; variant?: 'fact'|'rumor'|'pending'|'verified'|'default' }

const variants = {
  fact:     'bg-green-100 text-green-700 border border-green-200',
  rumor:    'bg-red-100 text-red-700 border border-red-200',
  pending:  'bg-amber-100 text-amber-700 border border-amber-200',
  verified: 'bg-blue-100 text-blue-700 border border-blue-200',
  default:  'bg-slate-100 text-slate-700 border border-slate-200',
};

export const Badge = ({ children, className, variant = 'default' }: BadgeProps) => (
  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
    {children}
  </span>
);
