import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowBigUp, ArrowBigDown, ArrowLeft, Bot, Users, ShieldCheck, Trash2, Eye, Zap } from 'lucide-react';
import { useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { claimsService } from '../services/claims.service';
import { Avatar } from '../components/ui/Avatar';
import { VoteBar } from '../components/ui/VoteBar';
import { MLBadge } from '../components/ui/MLBadge';
import { VerdictBanner } from '../components/ui/VerdictBanner';
import { TrustBadge } from '../components/ui/TrustBadge';
import { ClaimCard, ClaimCardSkeleton } from '../components/claims/ClaimCard';
import { useClaimSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/authStore';
import { timeAgo, formatDate } from '../utils/format';
import type { IClaim, VoteStats, MLLabel } from '../types';
import toast from 'react-hot-toast';

// Animated confidence ring
const ConfidenceRing = ({ confidence, label }: { confidence:number; label:MLLabel }) => {
  const colors: Record<string,string> = { FACT:'var(--fact-green)', RUMOR:'var(--rumor-red)', UNCERTAIN:'var(--pending-amber)', PENDING:'var(--ink-faint)' };
  const color = colors[label] ?? 'var(--ink-faint)';
  const r=36, circ=2*Math.PI*r, pct=label==='PENDING'?0:confidence;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90 absolute inset-0">
          <circle cx="48" cy="48" r={r} fill="none" stroke="var(--paper-mid)" strokeWidth="8"/>
          <motion.circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="butt" strokeDasharray={circ}
            initial={{ strokeDashoffset:circ }}
            animate={{ strokeDashoffset:circ-pct*circ }}
            transition={{ duration:1.2, ease:'easeOut', delay:0.3 }}/>
        </svg>
        <motion.div className="flex flex-col items-center z-10"
          initial={{ opacity:0, scale:0.5 }} animate={{ opacity:1, scale:1 }}
          transition={{ delay:0.5, type:'spring' }}>
          {label==='PENDING'
            ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor:'transparent', borderTopColor:'var(--ink-faint)' }}/>
            : <span className="font-mono text-base font-black" style={{ color }}>{(confidence*100).toFixed(0)}%</span>
          }
        </motion.div>
      </div>
      <MLBadge label={label} confidence={confidence} size="sm"/>
    </div>
  );
};

export default function ClaimDetail() {
  const { id } = useParams<{id:string}>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const [liveStats, setLiveStats] = useState<Partial<VoteStats>|null>(null);
  const [liveMl, setLiveMl] = useState<{label:MLLabel;confidence:number}|null>(null);

  const { data:claim, isLoading } = useQuery({
    queryKey: ['claim', id],
    queryFn: () => claimsService.getById(id!).then(r => r.data.data as IClaim),
    enabled: !!id,
  });

  const { data:related } = useQuery({
    queryKey: ['related', id, claim?.title],
    queryFn: () => claimsService.search({ q:claim!.title.split(' ').slice(0,4).join(' '), limit:'3' })
      .then(r=>(r.data.data as IClaim[]).filter(c=>c._id!==id).slice(0,3)),
    enabled: !!claim?.title, staleTime:60_000,
  });

  const onVoteUpdate  = useCallback((d:any)=>setLiveStats(d),[]);
  const onVerdictSet  = useCallback(()=>qc.invalidateQueries({queryKey:['claim',id]}),[id,qc]);
  const onMlResult    = useCallback((d:any)=>setLiveMl({label:d.label,confidence:d.confidence}),[]);
  useClaimSocket(id!,onVoteUpdate,onVerdictSet,onMlResult);

  const voteMut = useMutation({
    mutationFn: (dir:'up'|'down') => claimsService.vote(id!,dir),
    onSuccess: ()=>qc.invalidateQueries({queryKey:['claim',id]}),
    onError: (e:any)=>toast.error(e?.response?.data?.error?.message||'Vote failed'),
  });
  const deleteMut = useMutation({
    mutationFn: ()=>claimsService.delete(id!),
    onSuccess: ()=>{ toast.success('Claim deleted'); nav('/'); },
    onError: ()=>toast.error('Could not delete'),
  });

  if (isLoading) return <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="skeleton h-12"/>)}</div>;
  if (!claim) return <div className="py-20 text-center"><p className="font-headline text-2xl" style={{color:'var(--ink-faint)'}}>Claim not found</p></div>;

  const stats = { ...claim.voteStats, ...liveStats };
  const mlLabel = liveMl?.label ?? claim.mlPrediction?.label ?? 'PENDING';
  const mlConf  = liveMl?.confidence ?? claim.mlPrediction?.confidence ?? 0;
  const isOwnPost = user?._id === (claim.author as any)?._id;

  const pieData = [
    { name:'Normal ↑',   value:Math.max(0,(stats.totalUpvotes??0)-(stats.trustedUpvotes??0)) },
    { name:'Verified ↑', value:stats.trustedUpvotes??0 },
    { name:'Normal ↓',   value:Math.max(0,(stats.totalDownvotes??0)-(stats.trustedDownvotes??0)) },
    { name:'Verified ↓', value:stats.trustedDownvotes??0 },
  ].filter(d=>d.value>0);
  const PIE=['#86EFAC','#1e8449','#FCA5A5','#c0392b'];

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <button onClick={()=>nav(-1)}
        className="flex items-center gap-1.5 font-sans text-xs font-semibold mb-4 hover:opacity-70 transition-opacity"
        style={{ color:'var(--ink-faint)' }}>
        <ArrowLeft className="w-3.5 h-3.5"/> Back to feed
      </button>

      <VerdictBanner verdict={claim.finalVerdict}/>

      {/* Main story */}
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
        className="mt-4 pb-4" style={{ borderBottom:'1px solid var(--paper-mid)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="news-kicker">{claim.category.toUpperCase()}</span>
          {isOwnPost && (
            <button onClick={()=>{ if(window.confirm('Delete this claim?')) deleteMut.mutate(); }}
              disabled={deleteMut.isPending}
              className="ml-auto btn-outline flex items-center gap-1.5 !py-1 !px-2.5 !text-xs !border-rumor-red"
              style={{ color:'var(--rumor-red)', borderColor:'var(--rumor-red)' }}>
              <Trash2 className="w-3.5 h-3.5"/>
              {deleteMut.isPending ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        <h1 className="font-headline text-3xl font-black leading-tight mb-4" style={{ color:'var(--ink)', lineHeight:1.15 }}>
          {claim.title}
        </h1>

        <div className="flex items-center gap-3 mb-4" style={{ borderBottom:'1px solid var(--paper-mid)', paddingBottom:'12px' }}>
          <button
            type="button"
            onClick={() => nav(`/profile/${claim.author?.username}`)}
            className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
          >
            <Avatar src={claim.author?.avatarUrl} name={claim.author?.displayName} size="sm"/>
            <div>
              <p className="news-byline">{claim.author?.displayName}</p>
              <p className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>@{claim.author?.username}</p>
            </div>
          </button>
          <TrustBadge score={claim.author?.trustScore?.current??50} size="sm"/>
          <span className="ml-auto flex items-center gap-1 font-sans text-xs" style={{ color:'var(--ink-faint)' }}>
            <Eye className="w-3 h-3"/>{claim.viewCount??0} views
          </span>
        </div>

        {claim.body && (
          <p className="news-body drop-cap mb-4">{claim.body}</p>
        )}

        {claim.media?.type==='image' && claim.media.url && (
          <figure className="mb-4" style={{ border:'1px solid var(--paper-mid)' }}>
            <img src={claim.media.url} alt="" className="w-full max-h-96 object-contain" style={{ background:'var(--paper-dark)' }}/>
          </figure>
        )}

        {claim.adminNote && (
          <div className="px-4 py-3 mt-3" style={{ borderLeft:'3px solid var(--verified)', background:'var(--paper-dark)' }}>
            <p className="font-sans text-xs font-bold tracking-widest uppercase mb-1" style={{ color:'var(--verified)' }}>
              Editor's Note
            </p>
            <p className="font-sans text-sm italic" style={{ color:'var(--ink)' }}>"{claim.adminNote}"</p>
          </div>
        )}
      </motion.div>

      {/* 3-panel verdict */}
      <div className="grid grid-cols-3 gap-0 mt-4 mb-4"
        style={{ border:'1px solid var(--paper-mid)' }}>
        {[
          { Icon:Users, title:'Community Vote', content:(
            <div className="space-y-2">
              <VoteBar upPct={stats.upvotePct??0} showLabels height="h-2"/>
              <div className="flex justify-between text-xs font-sans" style={{ color:'var(--ink-faint)' }}>
                <span>Weighted: <strong style={{color:'var(--ink)'}}>{(stats.weightedScore??0).toFixed(1)}%</strong></span>
                <span>{stats.totalVotes??0} votes</span>
              </div>
            </div>
          )},
          { Icon:Bot, title:'AI Analysis', content:(
            <div className="flex justify-center pt-1">
              <ConfidenceRing confidence={mlConf} label={mlLabel}/>
            </div>
          )},
          { Icon:ShieldCheck, title:'Admin Verdict', content:(
            <div className="text-center">
              <p className="font-headline text-lg font-black" style={{
                color: claim.adminDecision==='Fact'?'var(--fact-green)':claim.adminDecision==='Rumor'?'var(--rumor-red)':'var(--pending-amber)'
              }}>{claim.adminDecision??'Processing'}</p>
              {(claim.adminDecidedBy as any)?.username && (
                <p className="font-sans text-xs mt-1" style={{ color:'var(--ink-faint)' }}>
                  by @{(claim.adminDecidedBy as any).username}
                </p>
              )}
            </div>
          )},
        ].map(({ Icon, title, content },i) => (
          <motion.div key={title} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:0.1+i*0.08 }}
            className="p-4" style={{ borderRight: i<2 ? '1px solid var(--paper-mid)' : 'none' }}>
            <div className="flex items-center gap-1.5 mb-3" style={{ borderBottom:'1px solid var(--paper-mid)', paddingBottom:'6px' }}>
              <Icon className="w-3.5 h-3.5" style={{ color:'var(--ink-faint)' }}/>
              <span className="font-sans text-[9px] font-black tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>{title}</span>
            </div>
            {content}
          </motion.div>
        ))}
      </div>

      {/* Vote buttons */}
      {isAuthenticated ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }}
          className="p-4 mb-4" style={{ border:'1px solid var(--paper-mid)', background:'var(--paper-dark)' }}>
          <p className="font-sans text-xs font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5" style={{ color:'var(--ink-faint)' }}>
            <Zap className="w-3.5 h-3.5" style={{ color:'var(--news-gold)' }}/> CAST YOUR VOTE
          </p>
          {isOwnPost ? (
            <p className="font-sans text-sm text-center py-2" style={{ color:'var(--ink-faint)' }}>You cannot vote on your own claim.</p>
          ) : (
            <div className="flex gap-3">
              {[
                { dir:'up' as const, Icon:ArrowBigUp, label:'UPVOTE · FACT', count:stats.totalUpvotes??0, activeColor:'var(--fact-green)', active:claim.myVote==='up' },
                { dir:'down' as const, Icon:ArrowBigDown, label:'DOWNVOTE · RUMOR', count:stats.totalDownvotes??0, activeColor:'var(--rumor-red)', active:claim.myVote==='down' },
              ].map(({ dir, Icon, label, count, activeColor, active }) => (
                <motion.button key={dir} whileTap={{ scale:0.96 }}
                  onClick={()=>voteMut.mutate(dir)} disabled={voteMut.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 font-sans text-xs font-black tracking-widest uppercase transition-all"
                  style={{
                    border: `2px solid ${active ? activeColor : 'var(--paper-mid)'}`,
                    background: active ? activeColor : 'transparent',
                    color: active ? 'var(--paper)' : 'var(--ink-faint)',
                  }}>
                  <Icon className="w-5 h-5"/> {label} ({count})
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <div className="p-4 mb-4 text-center" style={{ border:'1px solid var(--paper-mid)' }}>
          <p className="font-sans text-sm mb-2" style={{ color:'var(--ink-faint)' }}>Sign in to vote</p>
          <Link to="/login" className="btn-ink inline-flex items-center gap-1.5">Sign In</Link>
        </div>
      )}

      {/* Vote breakdown */}
      {(stats.totalVotes??0)>0 && (
        <div className="p-4 mb-6" style={{ border:'1px solid var(--paper-mid)' }}>
          <p className="font-sans text-xs font-black tracking-widest uppercase mb-3" style={{ color:'var(--ink-faint)' }}>Vote Breakdown</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={54}
                  paddingAngle={2} dataKey="value" animationBegin={300}>
                  {pieData.map((_,i)=><Cell key={i} fill={PIE[i%PIE.length]}/>)}
                </Pie>
                <Tooltip formatter={(v:any,n:any)=>[`${v} votes`,n]}
                  contentStyle={{ border:'1px solid var(--rule)', background:'var(--paper)', fontFamily:'DM Sans', fontSize:11, borderRadius:0 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {pieData.map((d,i)=>(
                <div key={d.name} className="flex items-center gap-2 font-sans text-xs">
                  <span className="w-3 h-3 flex-shrink-0" style={{ background:PIE[i%PIE.length] }}/>
                  <span style={{ color:'var(--ink-faint)' }} className="flex-1">{d.name}</span>
                  <span className="font-mono font-bold" style={{ color:'var(--ink)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Related */}
      {related && related.length>0 && (
        <div>
          <p className="font-sans text-xs font-black tracking-widest uppercase mb-2 pb-2"
            style={{ color:'var(--ink-faint)', borderBottom:'2px solid var(--ink)' }}>
            Related Stories
          </p>
          {related.map((c,i)=><ClaimCard key={c._id} claim={c} index={i} variant="compact"/>)}
        </div>
      )}
    </div>
  );
}
