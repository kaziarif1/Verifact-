import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowBigUp, ArrowBigDown, Eye, Trash2, Clock } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { IClaim, FinalVerdict } from '../../types';

const CATEGORY_LABELS: Record<string, string> = {
  politics:'POLITICS', health:'HEALTH', science:'SCIENCE', technology:'TECHNOLOGY',
  entertainment:'ENTERTAINMENT', sports:'SPORTS', finance:'FINANCE', other:'OTHER',
};

const verdictStamp = (v: FinalVerdict) => {
  if (v === 'Fact')    return <span className="stamp-fact-filled font-sans !text-[9px] !py-0.5 !px-2 !rotate-0" style={{ display:'inline-flex', alignItems:'center', letterSpacing:'1px' }}>VERIFIED FACT</span>;
  if (v === 'Rumor')   return <span className="stamp-rumor-filled font-sans !text-[9px] !py-0.5 !px-2 !rotate-0" style={{ display:'inline-flex', alignItems:'center', letterSpacing:'1px' }}>RUMOR</span>;
  return null;
};

const mlBadge = (label: string, conf: number) => {
  if (label === 'PENDING') return <span className="font-sans text-[9px] italic" style={{ color:'var(--ink-faint)' }}>AI analyzing...</span>;
  const color = label === 'FACT' ? 'var(--fact-green)' : label === 'RUMOR' ? 'var(--rumor-red)' : 'var(--pending-amber)';
  return (
    <span className="font-sans text-[9px] font-semibold" style={{ color }}>
      AI: {label} {(conf * 100).toFixed(0)}%
    </span>
  );
};

interface ClaimCardProps {
  claim: IClaim; index?: number;
  onVote?: (id:string, dir:'up'|'down') => void;
  showDelete?: boolean; onDelete?: (id:string) => void;
  variant?: 'default' | 'featured' | 'compact';
}

export const ClaimCard = ({ claim, index=0, onVote, showDelete, onDelete, variant='default' }: ClaimCardProps) => {
  const nav = useNavigate();
  const upPct = claim.voteStats?.upvotePct ?? 50;

  const handleVote = (e: React.MouseEvent, dir: 'up'|'down') => {
    e.stopPropagation();
    onVote?.(claim._id, dir);
  };

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
        transition={{ delay:index*0.04 }}
        onClick={() => nav(`/claims/${claim._id}`)}
        className="flex gap-3 py-3 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ borderBottom:'1px solid var(--paper-mid)' }}
      >
        <div className="font-mono text-lg font-black w-8 flex-shrink-0 leading-none mt-0.5" style={{ color:'var(--paper-mid)' }}>
          {String(index+1).padStart(2,'0')}
        </div>
        <div className="flex-1 min-w-0">
          <span className="category-pill mr-2">{CATEGORY_LABELS[claim.category]}</span>
          <p className="font-headline text-sm font-bold leading-snug mt-1" style={{ color:'var(--ink)' }}>
            {claim.title}
          </p>
          <p className="font-sans text-xs mt-1" style={{ color:'var(--ink-faint)' }}>
            {timeAgo(claim.createdAt)} · {claim.voteStats?.totalVotes??0} votes
          </p>
        </div>
        {verdictStamp(claim.finalVerdict)}
      </motion.div>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.article
        initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4, delay:index*0.05 }}
        onClick={() => nav(`/claims/${claim._id}`)}
        className="cursor-pointer paper-card-hover"
        style={{ borderTop:'4px solid var(--ink)' }}
      >
        {claim.media?.type === 'image' && claim.media.url && (
          <div className="h-48 overflow-hidden">
            <motion.img src={claim.media.url} alt="" whileHover={{ scale:1.03 }}
              transition={{ duration:0.4 }}
              className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="news-kicker">{CATEGORY_LABELS[claim.category]}</span>
            {verdictStamp(claim.finalVerdict)}
          </div>
          <h2 className="font-headline text-2xl font-bold leading-tight mb-3" style={{ color:'var(--ink)', lineHeight:1.2 }}>
            {claim.title}
          </h2>
          {claim.body && (
            <p className="news-body text-sm line-clamp-3 mb-3">{claim.body}</p>
          )}
          <div className="flex items-center gap-2 mt-3" style={{ borderTop:'1px solid var(--paper-mid)', paddingTop:'10px' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nav(`/profile/${claim.author?.username}`);
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Avatar src={claim.author?.avatarUrl} name={claim.author?.displayName} size="xs" />
              <span className="news-byline">{claim.author?.displayName}</span>
            </button>
            <span className="font-sans text-xs ml-auto" style={{ color:'var(--ink-faint)' }}>
              {timeAgo(claim.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2" onClick={e => e.stopPropagation()}>
            {onVote && (
              <>
                <motion.button whileTap={{ scale:0.85 }} onClick={e => handleVote(e,'up')}
                  className="flex items-center gap-1 font-sans text-xs font-bold transition-all"
                  style={{ color: claim.myVote==='up' ? 'var(--fact-green)' : 'var(--ink-faint)' }}>
                  <ArrowBigUp className="w-4 h-4" /> {claim.voteStats?.totalUpvotes??0}
                </motion.button>
                <motion.button whileTap={{ scale:0.85 }} onClick={e => handleVote(e,'down')}
                  className="flex items-center gap-1 font-sans text-xs font-bold transition-all"
                  style={{ color: claim.myVote==='down' ? 'var(--rumor-red)' : 'var(--ink-faint)' }}>
                  <ArrowBigDown className="w-4 h-4" /> {claim.voteStats?.totalDownvotes??0}
                </motion.button>
              </>
            )}
            {mlBadge(claim.mlPrediction?.label, claim.mlPrediction?.confidence??0)}
            <span className="ml-auto flex items-center gap-1 font-sans text-xs" style={{ color:'var(--ink-faint)' }}>
              <Eye className="w-3 h-3" /> {claim.viewCount??0}
            </span>
          </div>
        </div>
      </motion.article>
    );
  }

  // Default card — newspaper column style
  return (
    <motion.article
      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.3, delay:index*0.04 }}
      onClick={() => nav(`/claims/${claim._id}`)}
      className="cursor-pointer py-4 hover:opacity-90 transition-opacity"
      style={{ borderBottom:'1px solid var(--paper-mid)' }}
    >
      <div className="flex gap-3">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5" onClick={e => e.stopPropagation()}>
          {onVote ? (
            <>
              <motion.button whileTap={{ scale:0.8 }} onClick={e => handleVote(e,'up')}
                className="p-1 rounded transition-colors"
                style={{ color: claim.myVote==='up' ? 'var(--fact-green)' : 'var(--ink-faint)', background: claim.myVote==='up' ? '#1e844911' : 'transparent' }}>
                <ArrowBigUp className="w-5 h-5" />
              </motion.button>
              <span className="font-mono text-xs font-bold" style={{ color:'var(--ink)', fontSize:'11px' }}>
                {(claim.voteStats?.totalUpvotes??0) - (claim.voteStats?.totalDownvotes??0) >= 0 ? '+' : ''}
                {(claim.voteStats?.totalUpvotes??0) - (claim.voteStats?.totalDownvotes??0)}
              </span>
              <motion.button whileTap={{ scale:0.8 }} onClick={e => handleVote(e,'down')}
                className="p-1 rounded transition-colors"
                style={{ color: claim.myVote==='down' ? 'var(--rumor-red)' : 'var(--ink-faint)', background: claim.myVote==='down' ? '#c0392b11' : 'transparent' }}>
                <ArrowBigDown className="w-5 h-5" />
              </motion.button>
            </>
          ) : (
            <div className="font-mono text-sm font-black" style={{ color:'var(--paper-mid)' }}>
              {String(index+1).padStart(2,'0')}
            </div>
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="category-pill">{CATEGORY_LABELS[claim.category]}</span>
            {verdictStamp(claim.finalVerdict)}
          </div>

          <h3 className="font-headline text-base font-bold leading-snug mb-1" style={{ color:'var(--ink)', lineHeight:1.25 }}>
            {claim.title}
          </h3>

          {claim.body && (
            <p className="font-sans text-xs line-clamp-2 mb-2" style={{ color:'var(--ink-faint)', lineHeight:1.5 }}>
              {claim.body}
            </p>
          )}

          {/* Media thumbnail */}
          {claim.media?.type !== 'none' && claim.media?.thumbnailUrl && (
            <div className="h-28 overflow-hidden mb-2" style={{ border:'1px solid var(--paper-mid)' }}>
              <img src={claim.media.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nav(`/profile/${claim.author?.username}`);
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Avatar src={claim.author?.avatarUrl} name={claim.author?.displayName} size="xs" />
              <span className="news-byline">{claim.author?.displayName}</span>
            </button>
            <span className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>·</span>
            <span className="font-sans text-xs flex items-center gap-1" style={{ color:'var(--ink-faint)' }}>
              <Clock className="w-3 h-3" />{timeAgo(claim.createdAt)}
            </span>
            <span className="ml-auto flex items-center gap-3">
              {mlBadge(claim.mlPrediction?.label, claim.mlPrediction?.confidence??0)}
              <span className="font-sans text-xs flex items-center gap-1" style={{ color:'var(--ink-faint)' }}>
                <Eye className="w-3 h-3" />{claim.viewCount??0}
              </span>
              {showDelete && onDelete && (
                <motion.button whileTap={{ scale:0.9 }}
                  onClick={e => { e.stopPropagation(); if (window.confirm('Delete?')) onDelete(claim._id); }}
                  className="p-1 rounded hover:opacity-70 transition-opacity"
                  style={{ color:'var(--ink-faint)' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export const ClaimCardSkeleton = () => (
  <div className="py-4" style={{ borderBottom:'1px solid var(--paper-mid)' }}>
    <div className="flex gap-3">
      <div className="skeleton w-10 h-16 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-5 w-4/5" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="flex gap-2 mt-1">
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-4 w-20" />
        </div>
      </div>
    </div>
  </div>
);
