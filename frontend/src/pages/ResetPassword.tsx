import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';

const schema = z.object({
  password: z.string().min(8),
  confirm:  z.string(),
}).refine(d=>d.password===d.confirm,{message:"Passwords don't match",path:['confirm']});
type Form = z.infer<typeof schema>;

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const token = sp.get('token') || '';
  const { register, handleSubmit, formState:{ errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (d: Form) => {
    try {
      await authService.resetPassword(token, d.password);
      toast.success('Password reset! Please sign in.');
      nav('/login');
    } catch (e:any) { toast.error(e?.response?.data?.error?.message || 'Reset failed'); }
  };

  if (!token) return <div className="text-center py-20" style={{ color:'var(--rumor-red)' }}>Invalid reset link.</div>;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--paper)' }}>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="w-full max-w-sm px-6">
        <div className="text-center mb-6 pb-4" style={{ borderBottom:'3px double var(--rule)' }}>
          <p className="font-masthead text-4xl" style={{ color:'var(--ink)' }}>Verifact</p>
        </div>
        <p className="news-kicker mb-1">NEW PASSWORD</p>
        <h1 className="font-headline text-2xl font-bold mb-4" style={{ color:'var(--ink)' }}>Reset Password</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {(['password','confirm'] as const).map(f=>(
            <div key={f}>
              <label className="font-sans text-xs font-semibold tracking-widest uppercase mb-1.5 block" style={{ color:'var(--ink-faint)' }}>
                {f==='password'?'New Password':'Confirm Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'var(--ink-faint)' }}/>
                <input type="password" {...register(f)} className={`input-ink pl-10 ${errors[f]?'error':''}`}/>
              </div>
              {errors[f] && <p className="font-sans text-xs mt-1" style={{ color:'var(--rumor-red)' }}>{errors[f]?.message}</p>}
            </div>
          ))}
          <button type="submit" disabled={isSubmitting} className="btn-ink w-full py-3 flex items-center justify-center">
            {isSubmitting ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor:'transparent', borderTopColor:'var(--paper)' }}/> : 'Reset Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
