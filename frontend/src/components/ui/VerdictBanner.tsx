import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { FinalVerdict } from '../../types';

interface VerdictBannerProps { verdict:FinalVerdict; compact?:boolean }

const CFG = {
  Fact:    { Icon:CheckCircle2, text:'VERIFIED FACT',    bg:'var(--fact-green)',    cls:'stamp-fact-filled'  },
  Rumor:   { Icon:XCircle,      text:'CONFIRMED RUMOR',  bg:'var(--rumor-red)',     cls:'stamp-rumor-filled' },
  Pending: { Icon:Clock,        text:'VERDICT PENDING',  bg:'var(--pending-amber)', cls:'stamp-pending'      },
};

export const VerdictBanner = ({ verdict, compact=false }: VerdictBannerProps) => {
  const { Icon, text, bg, cls } = CFG[verdict];
  if (compact) return (
    <motion.span initial={{ scale:0, rotate:-15 }} animate={{ scale:1, rotate:0 }}
      transition={{ type:'spring', stiffness:300, damping:18 }}
      className={cls} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'9px', padding:'2px 7px' }}>
      <Icon size={10} />{text}
    </motion.span>
  );
  return (
    <motion.div initial={{ opacity:0, y:-8, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
      transition={{ type:'spring', stiffness:260, damping:22 }}
      className="flex items-center justify-center gap-2 py-2.5 px-4 w-full font-sans font-black text-sm tracking-widest uppercase"
      style={{ background:bg, color:'white', letterSpacing:'2px' }}>
      <Icon className="w-5 h-5" />{text}
    </motion.div>
  );
};
