import { useState, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { claimsService } from '../services/claims.service';
import { ClaimCard, ClaimCardSkeleton } from '../components/claims/ClaimCard';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const SECTIONS = ['all','politics','health','science','technology','entertainment','sports','finance'];
const SORTS = [{ v:'newest', label:'Latest' }, { v:'trending', label:'Most Read' }, { v:'mostVoted', label:'Most Voted' }];

const TODAY_DATE = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [section, setSection] = useState('all');
  const [sort, setSort] = useState('newest');
  const [verdict, setVerdict] = useState('');
  const observer = useRef<IntersectionObserver|null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['claims', section, sort, verdict],
    queryFn: ({ pageParam }) => {
      const p: Record<string,string> = { sort };
      if (section !== 'all') p.category = section;
      if (verdict) p.verdict = verdict;
      if (pageParam) p.cursor = pageParam as string;
      return claimsService.getFeed(p).then(r => r.data);
    },
    initialPageParam: undefined,
    getNextPageParam: last => last.meta?.hasMore ? last.meta.cursor : undefined,
    staleTime: 30_000,
  });

  const lastRef = useCallback((node: HTMLDivElement|null) => {
    if (isFetchingNextPage) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
    }, { rootMargin:'120px' });
    if (node) observer.current.observe(node);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const voteMutation = useMutation({
    mutationFn: ({ id, dir }: { id:string; dir:'up'|'down' }) => claimsService.vote(id, dir),
    onSuccess: () => qc.invalidateQueries({ queryKey:['claims'] }),
    onError: (e:any) => toast.error(e?.response?.data?.error?.message || 'Vote failed'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id:string) => claimsService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['claims'] }); toast.success('Deleted'); },
  });

  const claims = data?.pages.flatMap(p => p.data) ?? [];
  const featured = claims[0];
  const rest = claims.slice(1);

  return (
    <div>
      {/* Newspaper date header */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.4 }}
        className="pb-3 mb-4" style={{ borderBottom:'3px double var(--rule)' }}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-sans text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color:'var(--ink-faint)' }}>
              {TODAY_DATE}
            </p>
            <h1 className="font-headline text-4xl font-black leading-none" style={{ color:'var(--ink)' }}>
              Latest Claims
            </h1>
          </div>
          <button onClick={() => nav('/submit')}
            className="btn-ink flex-shrink-0 flex items-center gap-1.5">
            + Submit Story
          </button>
        </div>
      </motion.div>

      {/* Section tabs */}
      <div className="flex gap-0 overflow-x-auto mb-4 scrollbar-none" style={{ borderBottom:'1px solid var(--paper-mid)' }}>
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setSection(s)}
            className="font-sans text-xs font-bold tracking-wide uppercase px-4 py-2 whitespace-nowrap transition-all flex-shrink-0"
            style={{
              borderBottom: section===s ? '2px solid var(--ink)' : '2px solid transparent',
              color: section===s ? 'var(--ink)' : 'var(--ink-faint)',
              background: 'transparent',
            }}>
            {s === 'all' ? 'ALL NEWS' : s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Sort + Verdict filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-2">
          {SORTS.map(s => (
            <button key={s.v} onClick={() => setSort(s.v)}
              className="font-sans text-xs px-3 py-1 transition-all"
              style={{
                background: sort===s.v ? 'var(--ink)' : 'transparent',
                color: sort===s.v ? 'var(--paper)' : 'var(--ink-faint)',
                border: '1px solid var(--paper-mid)',
                borderRadius: '1px',
              }}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {[['','All'],['Fact','Facts'],['Rumor','Rumors'],['Pending','Pending']].map(([v,l]) => (
            <button key={v} onClick={() => setVerdict(v)}
              className="font-sans text-xs px-2.5 py-1 transition-all"
              style={{
                background: verdict===v ? 'var(--ink)' : 'transparent',
                color: verdict===v ? 'var(--paper)' : 'var(--ink-faint)',
                border: '1px solid var(--paper-mid)',
                borderRadius: '1px',
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Content grid — newspaper layout */}
      {isLoading ? (
        <div className="space-y-0">
          {Array.from({length:6}).map((_,i)=><ClaimCardSkeleton key={i}/>)}
        </div>
      ) : claims.length === 0 ? (
        <div className="py-20 text-center" style={{ borderTop:'1px solid var(--paper-mid)' }}>
          <p className="font-headline text-2xl mb-2" style={{ color:'var(--ink-faint)' }}>No stories found</p>
          <p className="font-sans text-sm" style={{ color:'var(--ink-faint)' }}>Adjust filters or be the first to submit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column — featured + list */}
          <div className="lg:col-span-2">
            {featured && (
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="mb-6">
                <ClaimCard claim={featured} variant="featured" index={0}
                  onVote={isAuthenticated ? (id,dir)=>voteMutation.mutate({id,dir}) : undefined}
                  showDelete={!!user && featured.author?._id===user._id}
                  onDelete={id=>deleteMutation.mutate(id)} />
              </motion.div>
            )}

            <div className="rule-thin mb-2" />
            <p className="font-sans text-xs font-bold tracking-widest uppercase mb-1" style={{ color:'var(--ink-faint)' }}>
              More Stories
            </p>

            <AnimatePresence>
              {rest.map((claim, i) => (
                <div key={claim._id} ref={i===rest.length-1 ? lastRef : undefined}>
                  <ClaimCard claim={claim} index={i+1}
                    onVote={isAuthenticated ? (id,dir)=>voteMutation.mutate({id,dir}) : undefined}
                    showDelete={!!user && claim.author?._id===user._id}
                    onDelete={id=>deleteMutation.mutate(id)} />
                </div>
              ))}
            </AnimatePresence>

            {isFetchingNextPage && <ClaimCardSkeleton />}
          </div>

          {/* Right sidebar — top stories */}
          <div className="hidden lg:block">
            <div className="sticky top-4" style={{ borderLeft:'1px solid var(--paper-mid)', paddingLeft:'20px' }}>
              <p className="font-sans text-xs font-bold tracking-widest uppercase mb-2 pb-1"
                style={{ color:'var(--ink-faint)', borderBottom:'2px solid var(--ink)' }}>
                Top Stories
              </p>
              {claims.slice(0,8).map((c,i) => (
                <ClaimCard key={c._id} claim={c} index={i} variant="compact" />
              ))}

              {/* Breaking news box */}
              <div className="mt-6 p-4" style={{ background:'var(--ink)', color:'var(--paper)' }}>
                <p className="font-sans text-xs font-bold tracking-widest uppercase mb-2">
                  Submit a Story
                </p>
                <p className="font-sans text-xs mb-3" style={{ color:'rgba(245,240,232,0.7)', lineHeight:1.5 }}>
                  Have evidence of a claim? Submit it for community verification.
                </p>
                <button onClick={() => nav('/submit')}
                  className="font-sans text-xs font-bold uppercase tracking-wide px-4 py-2 w-full transition-all hover:opacity-90"
                  style={{ background:'var(--paper)', color:'var(--ink)' }}>
                  Submit Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
