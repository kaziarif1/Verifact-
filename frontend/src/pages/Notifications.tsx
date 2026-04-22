import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Scale, ShieldCheck, Trophy, Megaphone, UserPlus, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationsService } from '../services/notifications.service';
import { useNotificationStore } from '../store/notificationStore';
import { timeAgo } from '../utils/format';
import type { INotification } from '../types';

const TYPE_CFG: Record<string,{ Icon:React.ElementType; label:string; color:string }> = {
  verdict_set:      { Icon:Scale,          label:'VERDICT',   color:'var(--verified)'       },
  verified_granted: { Icon:ShieldCheck,    label:'VERIFIED',  color:'var(--fact-green)'     },
  vote_milestone:   { Icon:Trophy,         label:'MILESTONE', color:'var(--news-gold)'      },
  admin_message:    { Icon:Megaphone,      label:'ADMIN',     color:'var(--ink)'            },
  new_follower:     { Icon:UserPlus,       label:'FOLLOWER',  color:'var(--pending-amber)'  },
  new_message:      { Icon:MessageSquare,  label:'MESSAGE',   color:'var(--verified)'       },
};

export default function Notifications() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { markAllRead: storeMarkAll } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getAll().then(r => r.data),
  });

  const markAll = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => { qc.invalidateQueries({queryKey:['notifications']}); storeMarkAll(); },
  });

  const notifications: INotification[] = data?.data ?? [];
  const unread = notifications.filter(n=>!n.isRead).length;

  return (
    <div>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="mb-6 pb-4 flex items-end justify-between" style={{ borderBottom:'3px double var(--rule)' }}>
        <div>
          <p className="news-kicker mb-1">INBOX</p>
          <h1 className="font-headline text-4xl font-black" style={{ color:'var(--ink)' }}>Notifications</h1>
          {unread > 0 && <p className="font-sans text-sm mt-0.5" style={{ color:'var(--ink-faint)' }}>{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={()=>markAll.mutate()}
            className="btn-outline flex items-center gap-1.5 !py-1.5 !text-xs">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </motion.div>

      {isLoading && Array.from({length:5}).map((_,i)=>(
        <div key={i} className="skeleton h-14 mb-3" />
      ))}

      {!isLoading && notifications.length === 0 && (
        <div className="py-20 text-center" style={{ borderTop:'1px solid var(--paper-mid)' }}>
          <Bell className="w-10 h-10 mx-auto mb-3" style={{ color:'var(--paper-mid)' }} />
          <p className="font-headline text-xl" style={{ color:'var(--ink-faint)' }}>All caught up</p>
        </div>
      )}

      <div className="space-y-0">
        <AnimatePresence>
          {notifications.map((n,i) => {
            const { Icon, label, color } = TYPE_CFG[n.type] ?? { Icon:Bell, label:'NEWS', color:'var(--ink)' };
            return (
              <motion.div key={n._id}
                initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                transition={{ delay:i*0.03 }}
                onClick={() => { nav(n.link); notificationsService.markOneRead(n._id).catch(()=>{}); }}
                className="flex gap-4 py-4 cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  borderBottom: '1px solid var(--paper-mid)',
                  background: n.isRead ? 'transparent' : 'var(--paper-dark)',
                  paddingLeft: n.isRead ? 0 : 12,
                  paddingRight: n.isRead ? 0 : 12,
                }}>
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
                  style={{ border:`1.5px solid ${color}` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-sans text-[9px] font-black tracking-widest" style={{ color }}>
                      {label}
                    </span>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background:'var(--rumor-red)' }} />
                    )}
                  </div>
                  <p className="font-sans text-sm font-semibold" style={{ color:'var(--ink)' }}>{n.title}</p>
                  <p className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>{n.message}</p>
                </div>
                <span className="font-sans text-xs flex-shrink-0" style={{ color:'var(--ink-faint)' }}>
                  {timeAgo(n.createdAt)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
