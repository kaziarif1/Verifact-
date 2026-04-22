import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon } from 'lucide-react';
import { claimsService } from '../services/claims.service';
import { ClaimCard, ClaimCardSkeleton } from '../components/claims/ClaimCard';
import type { IClaim } from '../types';

const TOPICS = ['Politics','Health','Science','Technology','Finance','Sports','Entertainment'];

export default function Search() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');

  useEffect(() => { setQ(sp.get('q') || ''); }, [sp]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => claimsService.search({ q }).then(r => r.data),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) setSp({ q: q.trim() });
  };

  const claims: IClaim[] = data?.data ?? [];

  return (
    <div>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="mb-6 pb-4" style={{ borderBottom:'3px double var(--rule)' }}>
        <p className="news-kicker mb-1">ARCHIVE SEARCH</p>
        <h1 className="font-headline text-4xl font-black" style={{ color:'var(--ink)' }}>Search</h1>
      </motion.div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-0" style={{ border:'1.5px solid var(--ink)', borderRadius:'1px', maxWidth:520 }}>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search claims, topics, categories..."
            className="flex-1 font-sans text-sm px-4 py-3 outline-none"
            style={{ background:'var(--paper)', color:'var(--ink)', borderRadius:'1px 0 0 1px' }} />
          <button type="submit"
            className="btn-ink !rounded-none px-5 !py-3 flex items-center gap-2">
            <SearchIcon className="w-4 h-4" /> SEARCH
          </button>
        </div>
      </form>

      {!q.trim() && (
        <div>
          <p className="font-sans text-xs font-bold tracking-widest uppercase mb-3" style={{ color:'var(--ink-faint)' }}>
            Browse by Topic
          </p>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map(t => (
              <motion.button key={t} whileTap={{ scale:0.95 }}
                onClick={() => { setQ(t.toLowerCase()); setSp({ q:t.toLowerCase() }); }}
                className="font-sans text-xs font-bold px-4 py-2 transition-all"
                style={{ border:'1px solid var(--paper-mid)', background:'var(--paper-dark)', color:'var(--ink)', borderRadius:'1px', letterSpacing:'0.5px' }}>
                {t.toUpperCase()}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-0">
          {Array.from({length:5}).map((_,i)=><ClaimCardSkeleton key={i}/>)}
        </div>
      )}

      {!isLoading && q.trim().length >= 2 && (
        <div>
          <p className="font-sans text-xs mb-3" style={{ color:'var(--ink-faint)' }}>
            {claims.length} result{claims.length !== 1 ? 's' : ''} for "{q}"
          </p>
          <AnimatePresence>
            {claims.length === 0 ? (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="py-12 text-center" style={{ borderTop:'1px solid var(--paper-mid)' }}>
                <SearchIcon className="w-10 h-10 mx-auto mb-3" style={{ color:'var(--paper-mid)' }} />
                <p className="font-headline text-xl" style={{ color:'var(--ink-faint)' }}>Nothing found</p>
                <p className="font-sans text-sm mt-1" style={{ color:'var(--ink-faint)' }}>Try different keywords</p>
              </motion.div>
            ) : claims.map((c,i)=>(
              <ClaimCard key={c._id} claim={c} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
