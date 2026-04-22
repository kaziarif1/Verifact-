import { cn } from '../../utils/cn';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, icon, className, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
      <input
        ref={ref}
        {...props}
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all',
          icon && 'pl-10',
          error && 'border-red-400 focus:ring-red-400',
          className
        )}
      />
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
));
Input.displayName = 'Input';
