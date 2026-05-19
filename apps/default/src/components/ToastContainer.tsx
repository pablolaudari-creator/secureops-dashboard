import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, AlertOctagon, Info, CheckCircle } from 'lucide-react';
import type { Toast } from '../hooks/useAppHooks';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const icons = {
  error: <AlertOctagon size={16} className="text-red-400 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
  info: <Info size={16} className="text-blue-400 shrink-0" />,
  success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
};

const borders = {
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
  success: 'border-emerald-500/30 bg-emerald-500/10',
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.animation = 'toast-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    const timer = setTimeout(() => {
      if (el) el.style.animation = 'toast-out 0.3s ease-in forwards';
    }, 4800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={ref}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl w-80 max-w-[calc(100vw-2rem)] ${borders[toast.type]}`}
      style={{ opacity: 0 }}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white leading-tight">{toast.title}</p>
        <p className="text-xs text-white/60 mt-0.5 leading-snug">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-white/30 hover:text-white/60 transition-colors shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
};

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
