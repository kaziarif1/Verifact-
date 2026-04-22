import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, AtSign, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const schema = z.object({
  displayName: z.string().min(2, 'At least 2 characters').max(50),
  username:    z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, 'Lowercase, numbers, underscores only'),
  email:       z.string().email('Enter a valid email'),
  password:    z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must include at least 1 uppercase letter')
    .regex(/[0-9]/, 'Must include at least 1 number'),
});
type Form = z.infer<typeof schema>;

const perks = [
  'Vote on claims with weighted trust',
  'AI analysis on every submission',
  'Build your reputation score',
  'Direct messages with other readers',
];

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const getApiErrorMessage = (error: any) => {
    const data = error?.response?.data;
    const details = data?.error?.details;

    if (Array.isArray(details) && details.length > 0) {
      return details.map((item: any) => item.msg).filter(Boolean).join(', ');
    }

    return data?.error?.message || 'Registration failed';
  };

  const onSubmit = async (d: Form) => {
    setServerError('');
    try {
      const { data } = await authService.register(d);
      setAuth(data.data.user, data.data.accessToken);
      toast.success('Account created! Welcome to Verifact.');
      navigate('/');
    } catch (e: any) {
      setServerError(getApiErrorMessage(e));
    }
  };

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -12 },
    show:   { opacity: 1, x: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>

      {/* LEFT: Benefits panel */}
      <div className="hidden lg:flex w-2/5 flex-col justify-center p-10"
        style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6 }}>
          <p className="font-masthead text-5xl mb-1" style={{ color: 'var(--paper)' }}>Verifact</p>
          <div style={{ borderTop: '1px solid rgba(245,240,232,0.3)', marginBottom: '8px' }} />
          <p className="font-sans text-xs tracking-widest uppercase mb-8" style={{ color: 'rgba(245,240,232,0.5)' }}>
            Join the fact-checking press
          </p>
          <h2 className="font-headline text-3xl font-bold mb-6 leading-tight" style={{ color: 'var(--paper)' }}>
            Your free subscription includes:
          </h2>
          <motion.ul variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
            {perks.map((perk, i) => (
              <motion.li key={perk} variants={itemVariants}
                className="flex items-center gap-3 font-sans text-sm"
                style={{ color: 'rgba(245,240,232,0.85)' }}>
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#6EE7B7' }} />
                {perk}
              </motion.li>
            ))}
          </motion.ul>
          <div style={{ borderTop: '1px solid rgba(245,240,232,0.2)', marginTop: '32px', paddingTop: '16px' }}>
            <p className="font-sans text-xs italic" style={{ color: 'rgba(245,240,232,0.4)' }}>
              "The only platform where the community and AI agree on the truth."
            </p>
          </div>
        </motion.div>
      </div>

      {/* RIGHT: Form */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'var(--paper)' }}>
        <motion.div
          initial={{ opacity:0, y:20 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.45, ease:'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden text-center mb-6">
            <p className="font-masthead text-4xl" style={{ color: 'var(--ink)' }}>Verifact</p>
            <div className="rule-thin mt-2" />
          </div>

          <p className="news-kicker mb-1">NEW SUBSCRIPTION</p>
          <h1 className="font-headline text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Create Account</h1>
          <p className="font-sans text-sm mb-5" style={{ color: 'var(--ink-faint)' }}>Free forever. No card required.</p>
          <div className="rule-thin mb-5" />

          {serverError && (
            <motion.div initial={{ opacity:0,y:-6 }} animate={{ opacity:1,y:0 }}
              className="mb-4 px-4 py-3 border-l-4 font-sans text-sm"
              style={{ borderLeftColor:'var(--rumor-red)', background:'#c0392b11', color:'var(--rumor-red)' }}>
              {serverError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            {[
              { name:'displayName', label:'Full Name', Icon:User, type:'text', placeholder:'Jane Smith', ac:'name' },
              { name:'username',    label:'Username',  Icon:AtSign,type:'text', placeholder:'janesmith', ac:'username' },
              { name:'email',       label:'Email',     Icon:Mail,  type:'email',placeholder:'jane@press.com', ac:'email' },
            ].map(({ name, label, Icon, type, placeholder, ac }, i) => (
              <motion.div key={name}
                initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                transition={{ delay: 0.1 + i*0.07 }}>
                <label className="font-sans text-xs font-semibold tracking-widest uppercase mb-1 block" style={{ color:'var(--ink-faint)' }}>
                  {label}
                </label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'var(--ink-faint)' }} />
                  <input {...register(name as any)} type={type} placeholder={placeholder} autoComplete={ac}
                    className={`input-ink pl-10 ${(errors as any)[name] ? 'error' : ''}`} />
                </div>
                {(errors as any)[name] && (
                  <p className="font-sans text-xs mt-0.5" style={{ color:'var(--rumor-red)' }}>
                    {(errors as any)[name]?.message}
                  </p>
                )}
              </motion.div>
            ))}

            <motion.div initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.31 }}>
              <label className="font-sans text-xs font-semibold tracking-widest uppercase mb-1 block" style={{ color:'var(--ink-faint)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'var(--ink-faint)' }} />
                <input {...register('password')} type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 chars, 1 uppercase, 1 number" autoComplete="new-password"
                  className={`input-ink pl-10 pr-10 ${errors.password ? 'error' : ''}`} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--ink-faint)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="font-sans text-xs mt-0.5" style={{ color:'var(--rumor-red)' }}>{errors.password.message}</p>}
            </motion.div>

            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.38 }}>
              <motion.button type="submit" disabled={isSubmitting}
                whileTap={{ scale:0.97 }}
                className="btn-ink w-full py-3 mt-1 flex items-center justify-center gap-2">
                {isSubmitting
                  ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor:'transparent', borderTopColor:'var(--paper)' }} />
                  : 'CREATE FREE ACCOUNT'}
              </motion.button>
            </motion.div>
          </form>

          <div className="rule-thin my-5" />
          <p className="font-sans text-sm text-center" style={{ color:'var(--ink-faint)' }}>
            Already a subscriber?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color:'var(--ink)' }}>Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
