import { NavLink, useNavigate } from 'react-router-dom';
import { Home, TrendingUp, Search, PlusSquare, Settings, Shield, LogOut, ChevronRight, ChevronLeft, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Avatar } from '../ui/Avatar';
import { authService } from '../../services/auth.service';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import toast from 'react-hot-toast';

const NAV = [
  { to:'/', icon:Home, label:'Front Page', exact:true },
  { to:'/trending', icon:TrendingUp, label:'Trending' },
  { to:'/search', icon:Search, label:'Archive' },
  { to:'/submit', icon:PlusSquare, label:'Submit Story' },
  { to:'/messages', icon:MessageSquare, label:'Messages' },
];

export const Sidebar = () => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const nav = useNavigate();
  const isLocalAdmin = user?.role === 'admin' && user.email?.toLowerCase() === 'kazarif02@gmail.com';
  const { unreadCount } = useUnreadMessages();

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    clearAuth();
    toast.success('Logged out.');
    nav('/login');
  };

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div key="bd" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 z-20"
            style={{ background: 'rgba(26,16,8,0.6)', backdropFilter:'blur(2px)' }} />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 60 }}
        transition={{ duration:0.2, ease:[0.25,0.46,0.45,0.94] }}
        className="fixed left-0 top-0 h-full z-30 hidden lg:flex flex-col overflow-hidden"
        style={{ background:'var(--paper-dark)', borderRight:'3px double var(--rule)', minWidth: sidebarOpen ? 240 : 60 }}
      >
        {/* Header */}
        <div className="flex items-center h-16 px-3" style={{ borderBottom:'1px solid var(--paper-mid)' }}>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span initial={{ opacity:0,x:-6 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-6 }}
                className="font-masthead text-xl flex-1 overflow-hidden" style={{ color:'var(--ink)' }}>
                Verifact
              </motion.span>
            )}
          </AnimatePresence>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:opacity-60 transition-opacity ml-auto flex-shrink-0" style={{ color:'var(--ink)' }}>
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Section label */}
        {sidebarOpen && (
          <div className="px-4 pt-3 pb-1">
            <p className="font-sans text-xs font-bold tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>
              Sections
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon:Icon, label, exact }) => {
            const isMessages = to === '/messages';
            const displayLabel = isMessages && unreadCount > 0 ? `Messages (${unreadCount})` : label;
            return (
            <NavLink key={to} to={to} end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded transition-all duration-150 group relative ${
                  isActive
                    ? 'font-semibold'
                    : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--ink)' : 'transparent',
                color: isActive ? 'var(--paper)' : 'var(--ink)',
              })}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span initial={{ opacity:0,x:-4 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0 }}
                    className="font-sans text-sm font-medium whitespace-nowrap overflow-hidden">
                    {displayLabel}
                  </motion.span>
                )}
              </AnimatePresence>
              {isMessages && unreadCount > 0 && !sidebarOpen && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background:'var(--ink)', color:'var(--paper)' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {!sidebarOpen && (
                <span className="absolute left-full ml-3 px-2 py-1 rounded text-xs font-sans font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md"
                  style={{ background:'var(--ink)', color:'var(--paper)' }}>
                  {displayLabel}
                </span>
              )}
            </NavLink>
          )})}

          {isLocalAdmin && (
            <NavLink to="/admin"
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded transition-all group relative`}
              style={({ isActive }) => ({ background: isActive ? 'var(--ink)' : 'transparent', color: isActive ? 'var(--paper)' : 'var(--ink)' })}>
              <Shield className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="font-sans text-sm font-medium">Admin Desk</span>}
            </NavLink>
          )}
        </nav>

        {/* User section */}
        <div className="p-2" style={{ borderTop:'1px solid var(--paper-mid)' }}>
          {isAuthenticated && user ? (
            <>
              <button onClick={() => nav(`/profile/${user.username}`)}
                className="flex items-center gap-2.5 w-full px-2 py-2 rounded hover:opacity-80 transition-opacity text-left">
                <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 min-w-0">
                      <p className="font-sans text-xs font-bold truncate" style={{ color:'var(--ink)' }}>{user.displayName}</p>
                      <p className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>Trust: {Math.round(user.trustScore?.current??50)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
              {sidebarOpen && (
                <div className="flex gap-1 mt-1">
                  <button onClick={() => nav('/settings')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 font-sans text-xs rounded hover:opacity-70 transition-opacity"
                    style={{ color:'var(--ink-faint)' }}>
                    <Settings className="w-3 h-3" /> Settings
                  </button>
                  <button onClick={handleLogout}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 font-sans text-xs rounded hover:opacity-70 transition-opacity"
                    style={{ color:'var(--ink-faint)' }}>
                    <LogOut className="w-3 h-3" /> Log out
                  </button>
                </div>
              )}
            </>
          ) : sidebarOpen ? (
            <button onClick={() => nav('/login')}
              className="btn-ink w-full !py-2 !text-xs flex items-center justify-center gap-1.5">
              Sign In
            </button>
          ) : null}
        </div>
      </motion.aside>
    </>
  );
};
