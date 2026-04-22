import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

interface VoteBarProps {
  upPct: number; showLabels?: boolean;
  height?: string; className?: string; label?: string;
}

export const VoteBar = ({ upPct, showLabels=false, height='h-2', className='', label }: VoteBarProps) => {
  const safeUp = Math.min(100, Math.max(0, upPct));
  const downPct = Math.round((100 - safeUp) * 10) / 10;
  return (
    <div className={className}>
      {label && <p className="font-sans text-xs mb-1" style={{ color:'var(--ink-faint)' }}>{label}</p>}
      <div className={`w-full flex overflow-hidden ${height}`} style={{ background:'var(--paper-mid)' }}>
        <motion.div initial={{ width:0 }} animate={{ width:`${safeUp}%` }}
          transition={{ duration:0.9, ease:[0.25,0.46,0.45,0.94] }}
          style={{ background:'var(--fact-green)' }} />
        <motion.div initial={{ width:0 }} animate={{ width:`${downPct}%` }}
          transition={{ duration:0.9, ease:[0.25,0.46,0.45,0.94], delay:0.05 }}
          style={{ background:'var(--rumor-red)' }} />
      </div>
      {showLabels && (
        <div className="flex justify-between mt-1">
          <span className="font-sans text-xs font-semibold flex items-center gap-1" style={{ color:'var(--fact-green)' }}>
            <CheckCircle2 className="w-3 h-3" />{safeUp.toFixed(1)}% Fact
          </span>
          <span className="font-sans text-xs font-semibold flex items-center gap-1" style={{ color:'var(--rumor-red)' }}>
            {downPct.toFixed(1)}% Rumor<XCircle className="w-3 h-3" />
          </span>
        </div>
      )}
    </div>
  );
};
