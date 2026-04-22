import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password required'),
});
type Form = z.infer<typeof schema>;

// Animated ink drop letters
const HEADLINES = [
  'TRUTH MATTERS',
  'FACT OR FICTION?',
  'THE PEOPLE DECIDE',
  'AI-POWERED ACCURACY',
];

const InkLetter = ({ char, delay }: { char: string; delay: number }) => (
  <motion.span
    initial={{ opacity: 0, y: -30, rotateX: -90 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    style={{ display: 'inline-block', transformOrigin: 'bottom' }}
  >
    {char === ' ' ? '\u00A0' : char}
  </motion.span>
);

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');
  const [headlineIdx, setHeadlineIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeadlineIdx(i => (i+1) % HEADLINES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (d: Form) => {
    setServerError('');
    try {
      const { data } = await authService.login(d.email, d.password);
      setAuth(data.data.user, data.data.accessToken);
      toast.success('Welcome back!');
      navigate('/');
    } catch (e: any) {
      setServerError(e?.response?.data?.error?.message || 'Invalid credentials');
    }
  };

  const headline = HEADLINES[headlineIdx];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>

      {/* ── LEFT: Newspaper front page ── */}
      <div className="hidden lg:flex w-1/2 flex-col relative overflow-hidden"
        style={{ background: 'var(--paper-dark)', borderRight: '3px double var(--rule)' }}>

        {/* Animated noise texture overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")', backgroundSize: '200px' }}
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        {/* Masthead */}
        <div className="relative z-10 p-8">
          <div className="rule-thick pb-2 mb-1" style={{ borderTopWidth: '5px', borderTopStyle: 'double', borderTopColor: 'var(--ink)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <p className="font-masthead text-6xl text-center tracking-widest" style={{ color: 'var(--ink)' }}>
                Verifact
              </p>
            </motion.div>
            <div className="rule-bottom mt-1" />
          </div>
          <div className="flex justify-between items-center mt-1 mb-4">
            <span className="news-byline" style={{ fontSize: '10px' }}>
              {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).toUpperCase()}
            </span>
            <span className="news-byline" style={{ fontSize: '10px' }}>TRUTH · ACCURACY · INTEGRITY</span>
            <span className="news-byline" style={{ fontSize: '10px' }}>ISSUE NO. 1</span>
          </div>
          <div className="rule-thin" />
        </div>

        {/* Rotating headline */}
        <div className="relative z-10 px-8 flex-1 flex flex-col justify-center">
          <div className="mb-2">
            <span className="news-kicker">BREAKING</span>
          </div>
          <div className="mb-4 overflow-hidden" style={{ minHeight: '90px' }}>
            <motion.h2
              key={headlineIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="font-headline text-5xl font-black leading-tight"
              style={{ color: 'var(--ink)' }}
            >
              {headline}
            </motion.h2>
          </div>

          <div className="rule-thin mb-4" />

          {/* Fake article columns */}
          <div className="grid grid-cols-2 gap-4 col-rule">
            {['AI-powered fact-checking now available to the public. Community members vote on the veracity of breaking news.', 'Trust scores track accuracy over time. Verified users hold greater influence in the democratic voting process.'].map((txt, i) => (
              <motion.div key={i}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.2 }}
              >
                <p className="news-kicker mb-1" style={{ fontSize: '9px' }}>
                  {i === 0 ? 'TECHNOLOGY' : 'COMMUNITY'}
                </p>
                <p className="news-body text-xs" style={{ lineHeight: '1.6' }}>{txt}</p>
              </motion.div>
            ))}
          </div>

          <div className="rule-thin mt-4 mb-3" />

          {/* Breaking news ticker */}
          <div className="ticker-wrap py-1.5" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
            <span className="font-sans text-xs font-bold px-3 mr-2" style={{ background: 'var(--news-red)', color: 'white' }}>
              LIVE
            </span>
            <span className="ticker-content font-sans text-xs tracking-wide">
              VERIFACT LAUNCHES AI FACT-CHECKING PLATFORM &nbsp;&bull;&nbsp; COMMUNITY VOTING NOW OPEN &nbsp;&bull;&nbsp; SUBMIT CLAIMS FOR REVIEW &nbsp;&bull;&nbsp; TRUST SCORES LIVE &nbsp;&bull;&nbsp; JOIN THE FACT-CHECKING REVOLUTION
            </span>
          </div>
        </div>

        {/* Bottom masthead line */}
        <div className="relative z-10 px-8 pb-6">
          <div className="rule-thin mt-4 mb-2" />
          <p className="font-sans text-center" style={{ fontSize: '9px', color: 'var(--ink-faint)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Truth, Verified by the Crowd and the Machine
          </p>
        </div>
      </div>

      {/* ── RIGHT: Login form ── */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'var(--paper)' }}>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          {/* Mobile masthead */}
          <div className="lg:hidden text-center mb-8">
            <p className="font-masthead text-5xl" style={{ color: 'var(--ink)' }}>Verifact</p>
            <div className="rule-thin mt-2" />
          </div>

          {/* Form header */}
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}>
            <p className="news-kicker mb-1">READER ACCESS</p>
            <h1 className="font-headline text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
              Sign In
            </h1>
            <p className="font-sans text-sm mb-6" style={{ color: 'var(--ink-faint)' }}>
              Access your account to vote and submit claims.
            </p>
          </motion.div>

          <div className="rule-thin mb-6" />

          {/* Error */}
          {serverError && (
            <motion.div
              initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
              className="mb-4 px-4 py-3 border-l-4 font-sans text-sm"
              style={{ borderLeftColor: 'var(--rumor-red)', background: '#c0392b11', color: 'var(--rumor-red)' }}
            >
              {serverError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.2}}>
              <label className="font-sans text-xs font-semibold tracking-widest uppercase mb-1 block" style={{ color: 'var(--ink-faint)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-faint)' }} />
                <input type="email" placeholder="correspondent@press.com"
                  className={`input-ink pl-10 ${errors.email ? 'error' : ''}`}
                  {...register('email')} autoComplete="email" />
              </div>
              {errors.email && <p className="font-sans text-xs mt-1" style={{ color: 'var(--rumor-red)' }}>{errors.email.message}</p>}
            </motion.div>

            <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.27}}>
              <div className="flex justify-between items-center mb-1">
                <label className="font-sans text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-faint)' }}>Password</label>
                <Link to="/forgot-password" className="font-sans text-xs hover:underline" style={{ color: 'var(--red)' }}>Forgot?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-faint)' }} />
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  className={`input-ink pl-10 pr-10 ${errors.password ? 'error' : ''}`}
                  {...register('password')} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.34}}>
              <motion.button type="submit" disabled={isSubmitting}
                whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
                className="btn-ink w-full py-3 mt-2 flex items-center justify-center gap-2">
                {isSubmitting
                  ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'transparent', borderTopColor: 'var(--paper)' }} />
                  : 'SIGN IN'}
              </motion.button>
            </motion.div>
          </form>

          <div className="rule-thin my-5" />
          <p className="font-sans text-sm text-center" style={{ color: 'var(--ink-faint)' }}>
            New reader?{' '}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: 'var(--ink)' }}>
              Subscribe — it's free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
