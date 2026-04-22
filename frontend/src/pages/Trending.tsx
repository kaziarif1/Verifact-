import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { claimsService } from '../services/claims.service';
import { ClaimCard, ClaimCardSkeleton } from '../components/claims/ClaimCard';
import type { IClaim } from '../types';

export default function Trending() {
  const { data:facts, isLoading:lf } = useQuery({
    queryKey:['trending','facts'],
    queryFn: () => claimsService.getTrendingFacts().then(r => r.data.data as IClaim[]),
  });
  const { data:rumors, isLoading:lr } = useQuery({
    queryKey:['trending','rumors'],
    queryFn: () => claimsService.getTrendingRumors().then(r => r.data.data as IClaim[]),
  });

  return (
    <div>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="mb-6 pb-4" style={{ borderBottom:'3px double var(--rule)' }}>
        <p className="news-kicker mb-1">TODAY'S</p>
        <h1 className="font-headline text-4xl font-black" style={{ color:'var(--ink)' }}>Trending</h1>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom:'2px solid var(--fact-green)' }}>
            <TrendingUp className="w-4 h-4" style={{ color:'var(--fact-green)' }} />
            <h2 className="font-sans text-xs font-black tracking-widest uppercase" style={{ color:'var(--fact-green)' }}>
              Top Verified Facts
            </h2>
          </div>
          {lf ? Array.from({length:4}).map((_,i)=><ClaimCardSkeleton key={i}/>) :
            (facts??[]).length===0
              ? <p className="font-sans text-sm py-6" style={{ color:'var(--ink-faint)' }}>No trending facts yet.</p>
              : (facts??[]).map((c,i)=><ClaimCard key={c._id} claim={c} index={i} variant="compact"/>)
          }
        </section>
        <section>
          <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom:'2px solid var(--rumor-red)' }}>
            <TrendingDown className="w-4 h-4" style={{ color:'var(--rumor-red)' }} />
            <h2 className="font-sans text-xs font-black tracking-widest uppercase" style={{ color:'var(--rumor-red)' }}>
              Top Debunked Rumors
            </h2>
          </div>
          {lr ? Array.from({length:4}).map((_,i)=><ClaimCardSkeleton key={i}/>) :
            (rumors??[]).length===0
              ? <p className="font-sans text-sm py-6" style={{ color:'var(--ink-faint)' }}>No trending rumors yet.</p>
              : (rumors??[]).map((c,i)=><ClaimCard key={c._id} claim={c} index={i} variant="compact"/>)
          }
        </section>
      </div>
    </div>
  );
}
