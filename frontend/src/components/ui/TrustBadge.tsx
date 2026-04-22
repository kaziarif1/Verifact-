import { motion } from 'framer-motion';
import { trustColor } from '../../utils/format';

interface TrustBadgeProps { score:number; size?:'xs'|'sm'|'md'; animate?:boolean; className?:string }

export const TrustBadge = ({ score, size='sm', animate=false, className='' }: TrustBadgeProps) => {
  const color = trustColor(score);
  const sizes = { xs:'text-[9px] px-1 py-0', sm:'text-[10px] px-1.5 py-0.5', md:'text-xs px-2 py-1' };
  return (
    <motion.span whileHover={{ scale:1.05 }}
      className={`inline-flex items-center font-mono font-bold ${sizes[size]} ${className}`}
      style={{ color, border:`1.5px solid ${color}`, borderRadius:'1px' }}
      title={`Trust Score: ${Math.round(score)}/100`}>
      {Math.round(score)}
    </motion.span>
  );
};

export const TrustScoreGauge = ({ score }: { score:number }) => {
  const color = trustColor(score);
  const r = 54, circ = 2*Math.PI*r;
  const dash = (score/100)*circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--paper-mid)" strokeWidth="10"/>
        <motion.circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="butt" strokeDasharray={circ}
          initial={{ strokeDashoffset:circ }}
          animate={{ strokeDashoffset:circ-dash }}
          transition={{ duration:1.4, ease:'easeOut', delay:0.2 }}/>
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span className="font-mono text-3xl font-black" style={{ color }}
          initial={{ opacity:0, scale:0.5 }} animate={{ opacity:1, scale:1 }}
          transition={{ delay:0.5, type:'spring' }}>
          {Math.round(score)}
        </motion.span>
        <span className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>/100</span>
      </div>
    </div>
  );
};
