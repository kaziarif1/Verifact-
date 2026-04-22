import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { useSocket } from '../../hooks/useSocket';
import { useUIStore } from '../../store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';

export const AppShell = () => {
  useSocket();
  const { sidebarOpen } = useUIStore();
  const loc = useLocation();

  return (
    <div style={{ minHeight:'100vh', background:'var(--paper)' }}>
      <TopBar />
      <div className="flex">
        <Sidebar />
        <main
          className="flex-1 min-w-0 transition-all duration-200"
          style={{ marginLeft: sidebarOpen ? '240px' : '60px', padding:'24px 24px 80px 24px' }}
        >
          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={loc.pathname}
                initial={{ opacity:0, y:6 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0 }}
                transition={{ duration:0.2, ease:'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
};
