import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary'|'secondary'|'ghost'|'danger'|'outline';
  size?: 'sm'|'md'|'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary:   'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  secondary: 'bg-slate-800 text-white hover:bg-slate-900',
  ghost:     'bg-transparent text-slate-700 hover:bg-slate-100',
  danger:    'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
  outline:   'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = ({ variant='primary', size='md', loading, children, className, disabled, ...props }: ButtonProps) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
      variants[variant], sizes[size], className
    )}
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);
