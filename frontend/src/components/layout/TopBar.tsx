import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Sun, Moon, Menu, Search, LogIn, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useNotificationStore } from '../../store/notificationStore';
import { authService } from '../../services/auth.service';
import toast from 'react-hot-toast';

const TODAY = new Date().toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'}).toUpperCase();

export const TopBar = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { theme, toggleTheme, setSidebarOpen } = useUIStore();
  const { unreadCount } = useNotificationStore();
  const [q, setQ] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (loc.pathname === '/search') setQ(new URLSearchParams(loc.search).get('q') || '');
  }, [loc]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const handleLogout = async () => {
    try { await authService.logout(); } catch { }
    clearAuth();
    toast.success('Logged out.');
    nav('/login');
  };

  return (
    <header style={{ background: 'var(--paper)', borderBottom: '3px double var(--rule)' }}>
      {/* ── Top strip: date + masthead + actions ── */}
      <div className="flex items-center justify-between px-4 py-1.5"
        style={{ borderBottom: '1px solid var(--paper-mid)' }}>
        <span className="font-sans text-xs" style={{ color: 'var(--ink-faint)' }}>{TODAY}</span>
        <button onClick={() => nav('/')}
          className="font-masthead text-2xl leading-none tracking-wider hover:opacity-80 transition-opacity"
          style={{ color: 'var(--ink)' }}>
          Verifact
        </button>
        <span className="font-sans text-xs italic" style={{ color: 'var(--ink-faint)' }}>
          Truth · Accuracy · Integrity
        </span>
      </div>

      {/* ── Nav row ── */}
      <div className="flex items-center gap-2 px-4 py-2">
        <button onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded hover:opacity-70 transition-opacity"
          style={{ color: 'var(--ink)' }}>
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs hidden sm:block">
          <motion.div animate={{ scale: searchFocused ? 1.01 : 1 }} transition={{ duration: 0.12 }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color:'var(--ink-faint)' }} />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search the archive..."
                style={{
                  fontFamily: '"DM Sans", sans-serif', fontSize: '12px',
                  padding: '6px 12px 6px 30px',
                  border: '1px solid var(--paper-mid)',
                  background: 'var(--paper-dark)',
                  color: 'var(--ink)',
                  outline: 'none', width: '100%',
                  borderRadius: '1px',
                }}
                className="focus:border-ink"
              />
            </div>
          </motion.div>
        </form>

        {/* Section nav links — like newspaper sections */}
        <div className="hidden md:flex items-center gap-0 ml-2">
          {[
            ['/', 'Home'],
            ['/trending', 'Trending'],
            ['/search', 'Archive'],
          ].map(([path, label]) => (
            <button key={path} onClick={() => nav(path)}
              className="font-sans text-xs font-semibold tracking-wide px-3 py-1 transition-all hover:underline"
              style={{
                color: loc.pathname === path ? 'var(--ink)' : 'var(--ink-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                textUnderlineOffset: '3px',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => nav('/search')}
            className="sm:hidden p-1.5" style={{ color:'var(--ink)' }}>
            <Search className="w-4 h-4" />
          </button>

          {/* Theme */}
          <motion.button whileTap={{ rotate: 180 }} onClick={toggleTheme}
            className="p-1.5 rounded hover:opacity-70 transition-opacity" style={{ color:'var(--ink)' }}>
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </motion.button>

          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <motion.button whileTap={{ scale:0.9 }} onClick={() => nav('/notifications')}
                className="relative p-1.5" style={{ color:'var(--ink)' }}>
                <Bell className="w-4 h-4" />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                      className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 rounded-full text-white text-[9px] flex items-center justify-center font-bold px-0.5"
                      style={{ background:'var(--rumor-red)' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <button onClick={() => nav(`/profile/${user?.username}`)}
                className="flex items-center gap-2 px-2 py-1 hover:opacity-80 transition-opacity rounded">
                <Avatar src={user?.avatarUrl} name={user?.displayName} size="sm" />
                <span className="hidden md:block font-sans text-xs font-semibold max-w-[80px] truncate" style={{ color:'var(--ink)' }}>
                  {user?.displayName}
                </span>
              </button>

              <button onClick={handleLogout}
                className="hidden md:flex items-center gap-1 font-sans text-xs px-2 py-1 rounded hover:opacity-70 transition-opacity"
                style={{ color:'var(--ink-faint)' }}>
                <LogOut className="w-3.5 h-3.5" />
                Out
              </button>
            </>
          ) : (
            <button onClick={() => nav('/login')}
              className="btn-ink flex items-center gap-1.5 !py-1.5 !px-3 !text-xs">
              <LogIn className="w-3 h-3" /> Subscribe
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
