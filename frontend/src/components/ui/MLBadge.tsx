import { motion } from 'framer-motion';
import { Bot, Loader2 } from 'lucide-react';
import type { MLLabel } from '../../types';

interface MLBadgeProps { label:MLLabel; confidence:number; size?:'sm'|'md' }

const CFG: Record<string,{ text:string; color:string }> = {
  FACT:      { text:'FACT',      color:'var(--fact-green)' },
  RUMOR:     { text:'RUMOR',     color:'var(--rumor-red)'  },
  UNCERTAIN: { text:'UNCERTAIN', color:'var(--pending-amber)' },
  PENDING:   { text:'',          color:'var(--ink-faint)'  },
};

export const MLBadge = ({ label, confidence, size='sm' }: MLBadgeProps) => {
  const { text, color } = CFG[label] ?? CFG.UNCERTAIN;
  const pct = size === 'sm' ? '10px' : '11px';
  if (label === 'PENDING') return (
    <span className="inline-flex items-center gap-1 font-sans font-semibold"
      style={{ fontSize:pct, color:'var(--ink-faint)', letterSpacing:'0.5px' }}>
      <Loader2 className="w-3 h-3 animate-spin" /> AI analyzing...
    </span>
  );
  return (
    <motion.span initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
      transition={{ type:'spring', stiffness:400 }}
      className="inline-flex items-center gap-1 font-sans font-semibold"
      style={{ fontSize:pct, color, letterSpacing:'0.5px' }}>
      <Bot className="w-3 h-3" />
      AI:{text} {(confidence*100).toFixed(0)}%
    </motion.span>
  );
};
