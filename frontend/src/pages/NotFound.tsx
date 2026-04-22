import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--paper)' }}>
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="text-center max-w-md px-6">
        <div style={{ borderBottom:'3px double var(--rule)', borderTop:'5px solid var(--ink)', padding:'24px 0 16px' }}>
          <p className="font-masthead text-3xl mb-1" style={{ color:'var(--ink)' }}>Verifact</p>
          <p className="font-sans text-xs tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>
            SPECIAL EDITION
          </p>
        </div>
        <div className="py-8">
          <p className="news-kicker mb-2">BREAKING</p>
          <p className="font-headline text-8xl font-black" style={{ color:'var(--ink)', lineHeight:1 }}>404</p>
          <h1 className="font-headline text-2xl font-bold mt-2 mb-3" style={{ color:'var(--ink)' }}>
            Page Not Found
          </h1>
          <p className="news-body text-sm mb-6">
            The story you were looking for has been removed, relocated, or never existed. Our editorial team is investigating.
          </p>
          <Link to="/" className="btn-ink inline-flex items-center gap-2">
            ← Return to Front Page
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
