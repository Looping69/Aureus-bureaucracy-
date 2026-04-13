import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

const AUTO_DISMISS_MS = 2400;

export const NotificationOverlay = ({ 
  notification, 
  onClose 
}: { 
  notification: { title: string, msg: string } | null, 
  onClose: () => void 
}) => {
  React.useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(onClose, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeout);
  }, [notification, onClose]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex justify-center px-4"
        >
          <div className="w-full max-w-[280px] overflow-hidden rounded-2xl border-[3px] border-black bg-white shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
            <div className="flex items-center gap-3 border-b-[3px] border-black bg-amber-400 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black text-amber-400 shadow-sm">
                <AlertTriangle size={16} />
              </div>
              <h2 className="text-sm font-black uppercase leading-none tracking-tight text-black">{notification.title}</h2>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-semibold leading-snug text-slate-800/90">
                {notification.msg}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
