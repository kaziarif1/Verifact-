import { motion } from 'framer-motion';

interface FeedFiltersProps {
  category:string; verdict:string; sort:string;
  onCategory:(c:string)=>void; onVerdict:(v:string)=>void; onSort:(s:string)=>void;
}

const CATS = ['all','politics','health','science','technology','entertainment','sports','finance'];
const VERDICTS = [['','ALL'],['Fact','FACTS'],['Rumor','RUMORS'],['Pending','PENDING']];
const SORTS = [['newest','LATEST'],['trending','TRENDING'],['mostVoted','TOP']];

const Pill = ({ active, onClick, children }: { active:boolean; onClick:()=>void; children:React.ReactNode }) => (
  <motion.button whileTap={{ scale:0.94 }} onClick={onClick}
    className="font-sans text-xs font-bold tracking-wide px-3 py-1 transition-all whitespace-nowrap"
    style={{
      background: active ? 'var(--ink)' : 'transparent',
      color: active ? 'var(--paper)' : 'var(--ink-faint)',
      border: '1px solid var(--paper-mid)',
      borderRadius: '1px',
      letterSpacing: '0.5px',
    }}>
    {children}
  </motion.button>
);

export const FeedFilters = ({ category, verdict, sort, onCategory, onVerdict, onSort }: FeedFiltersProps) => (
  <div className="space-y-2">
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
      {CATS.map(c => (
        <Pill key={c} active={category===(c==='all'?'':c)} onClick={() => onCategory(c==='all'?'':c)}>
          {c.toUpperCase()}
        </Pill>
      ))}
    </div>
    <div className="flex items-center gap-1.5 flex-wrap">
      {VERDICTS.map(([v,l]) => (
        <Pill key={v} active={verdict===v} onClick={() => onVerdict(v)}>{l}</Pill>
      ))}
      <div className="flex-1" />
      {SORTS.map(([v,l]) => (
        <Pill key={v} active={sort===v} onClick={() => onSort(v)}>{l}</Pill>
      ))}
    </div>
  </div>
);
