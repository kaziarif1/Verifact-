import { NavLink, useNavigate } from 'react-router-dom';
import { Home, TrendingUp, PlusSquare, Bell, UserCircle, Shield, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';

export const MobileNav = () => {
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { unreadCount: unreadMessages } = useUnreadMessages();
  const profileTo = user ? `/profile/${user.username}` : '/login';
  const isLocalAdmin = user?.role === 'admin' && user.email?.toLowerCase() === 'kazarif02@gmail.com';

  const items = [
    { to:'/', icon:Home, label:'Home', exact:true },
    { to:'/trending', icon:TrendingUp, label:'Trending' },
    { to:'/submit', icon:PlusSquare, label:'Submit', cta:true },
    { to:'/messages', icon:MessageSquare, label:'Messages', badge:unreadMessages },
    ...(isLocalAdmin ? [{ to:'/admin', icon:Shield, label:'Admin' }] : []),
    { to:'/notifications', icon:Bell, label:'Alerts', badge:unreadCount },
    { to:profileTo, icon:UserCircle, label:'Profile' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30"
      style={{ background:'var(--paper)', borderTop:'2px solid var(--rule)' }}>
      <div className="flex items-end justify-around h-14 px-1">
        {items.map(({ to, icon:Icon, label, exact, cta, badge }) => (
          <NavLink key={to} to={to} end={exact}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 px-2 relative transition-opacity ${
                cta ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-50 hover:opacity-70'
              }`
            }>
            {({ isActive }) => (
              <>
                <div className={`relative ${cta ? 'p-2 -mt-3' : ''}`}
                  style={{ background: cta ? 'var(--ink)' : 'transparent', borderRadius:cta?'2px':undefined }}>
                  <Icon className="w-5 h-5" style={{ color: cta ? 'var(--paper)' : 'var(--ink)' }} />
                  <AnimatePresence>
                    {!!badge && badge > 0 && (
                      <motion.span initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                        className="absolute -top-1 -right-1 min-w-[13px] h-3.5 rounded-full flex items-center justify-center font-bold font-sans"
                        style={{ background:'var(--rumor-red)', color:'white', fontSize:'8px', padding:'0 3px' }}>
                        {badge > 9 ? '9+' : badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <span className="font-sans" style={{ fontSize:'9px', fontWeight:600, letterSpacing:'0.5px', color: cta ? 'var(--ink)' : 'var(--ink)' }}>
                  {label.toUpperCase()}
                </span>
                {isActive && !cta && (
                  <motion.span layoutId="mob-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5"
                    style={{ background:'var(--ink)' }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
