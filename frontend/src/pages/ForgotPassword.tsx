import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';

const schema = z.object({ email: z.string().email() });
type Form = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState:{ errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (d: Form) => {
    try { await authService.forgotPassword(d.email); setSent(true); }
    catch { toast.error('Something went wrong'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--paper)' }}>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="w-full max-w-sm px-6">
        <div className="text-center mb-6 pb-4" style={{ borderBottom:'3px double var(--rule)' }}>
          <p className="font-masthead text-4xl" style={{ color:'var(--ink)' }}>Verifact</p>
        </div>
        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-4" style={{ color:'var(--fact-green)' }}/>
            <h2 className="font-headline text-2xl font-bold mb-2" style={{ color:'var(--ink)' }}>Check your inbox</h2>
            <p className="font-sans text-sm mb-5" style={{ color:'var(--ink-faint)' }}>If that email exists, we've sent a reset link.</p>
            <Link to="/login" className="btn-outline">← Back to sign in</Link>
          </div>
        ) : (
          <>
            <p className="news-kicker mb-1">ACCOUNT RECOVERY</p>
            <h1 className="font-headline text-2xl font-bold mb-1" style={{ color:'var(--ink)' }}>Forgot Password?</h1>
            <p className="font-sans text-sm mb-5" style={{ color:'var(--ink-faint)' }}>Enter your email for a reset link.</p>
            <div className="rule-thin mb-5"/>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="font-sans text-xs font-semibold tracking-widest uppercase mb-1.5 block" style={{ color:'var(--ink-faint)' }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'var(--ink-faint)' }}/>
                  <input type="email" {...register('email')} placeholder="your@email.com"
                    className={`input-ink pl-10 ${errors.email?'error':''}`}/>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-ink w-full py-3 flex items-center justify-center gap-2">
                {isSubmitting ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor:'transparent', borderTopColor:'var(--paper)' }}/> : 'Send Reset Link'}
              </button>
            </form>
            <p className="font-sans text-sm text-center mt-4" style={{ color:'var(--ink-faint)' }}>
              <Link to="/login" className="hover:underline" style={{ color:'var(--ink)' }}>← Back to sign in</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
