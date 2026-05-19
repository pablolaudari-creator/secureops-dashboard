import React from 'react';
import { cn } from '../lib/utils';
import type { ModuleId } from '../App';
import {
  LayoutDashboard, QrCode, AlertTriangle, Camera,
  GraduationCap, ClipboardCheck, AlertOctagon, Shield, ChevronLeft, ChevronRight,
  Users, FileText, ShieldAlert, BarChart3, Zap
} from 'lucide-react';

const modules: { id: ModuleId; label: string; icon: React.ReactNode; color: string; group?: string }[] = [
  { id: 'dashboard',        label: 'Dashboard SGC',            icon: <LayoutDashboard size={18} />, color: 'text-blue-400' },
  { id: 'rondas',           label: 'Inspecciones & Rondas',    icon: <QrCode size={18} />,          color: 'text-emerald-400', group: 'Formularios Operativos' },
  { id: 'rondasform',       label: 'Formulario Rondas QR',     icon: <FileText size={18} />,         color: 'text-teal-400',    group: 'Formularios Operativos' },
  { id: 'presentismo',      label: 'Control de Presentismo',   icon: <Users size={18} />,            color: 'text-sky-400',     group: 'Formularios Operativos' },
  { id: 'supervision',      label: 'Supervisión Operativa',    icon: <ClipboardCheck size={18} />,   color: 'text-indigo-400',  group: 'Formularios Operativos' },
  { id: 'noconformidades',  label: 'No Conformidades',         icon: <AlertTriangle size={18} />,    color: 'text-amber-400',   group: 'SGC & Calidad' },
  { id: 'riesgos',          label: 'Matriz de Riesgos',        icon: <ShieldAlert size={18} />,      color: 'text-orange-400',  group: 'SGC & Calidad' },
  { id: 'incidentes',       label: 'Incidentes & Novedades',   icon: <AlertOctagon size={18} />,     color: 'text-rose-400',    group: 'SGC & Calidad' },
  { id: 'cctv',             label: 'CCTV & Alarmas',           icon: <Camera size={18} />,           color: 'text-purple-400',  group: 'SGC & Calidad' },
  { id: 'capacitaciones',   label: 'Capacitaciones 2026',      icon: <GraduationCap size={18} />,    color: 'text-cyan-400',    group: 'SGC & Calidad' },
  { id: 'reporte-abril',    label: 'Reportes & Análisis',      icon: <BarChart3 size={18} />,        color: 'text-violet-400',  group: 'Reportes' },
  // Hub unificado — reemplaza drive-sync, clientes y auditoria por separado
  { id: 'datos-config',     label: 'Datos & Configuración',    icon: <Zap size={18} />,              color: 'text-blue-400',    group: 'Datos & Config' },
];

interface SidebarProps {
  activeModule: ModuleId;
  onNavigate: (id: ModuleId) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// ── Mini indicador de datos vivos ────────────────────────────────────────────
function countLSQuick(keys: string[]): number {
  let n = 0;
  for (const k of keys) {
    try {
      const r = localStorage.getItem(k);
      if (r && r.startsWith('[')) { const a = JSON.parse(r); if (Array.isArray(a)) n += a.length; }
    } catch { /* noop */ }
  }
  return n;
}

const DataStatusMini: React.FC = () => {
  const [counts, setCounts] = React.useState(() => ({
    r: countLSQuick(['spi_rondas','spi_sgc_spi_rondas_form_v1','spi_sgc_rondas_v2']),
    p: countLSQuick(['spi_presentismo','spi_sgc_spi_presentismo_v1']),
    s: countLSQuick(['spi_supervisiones','spi_sgc_supervisiones']),
  }));
  React.useEffect(() => {
    const h = () => setCounts({
      r: countLSQuick(['spi_rondas','spi_sgc_spi_rondas_form_v1','spi_sgc_rondas_v2']),
      p: countLSQuick(['spi_presentismo','spi_sgc_spi_presentismo_v1']),
      s: countLSQuick(['spi_supervisiones','spi_sgc_supervisiones']),
    });
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);
  const rows = [
    { label: 'Rondas', val: counts.r, color: 'text-emerald-400' },
    { label: 'Presentismo', val: counts.p, color: 'text-sky-400' },
    { label: 'Supervisiones', val: counts.s, color: 'text-indigo-400' },
  ];
  return (
    <div className="space-y-1">
      {rows.map(row => (
        <div key={row.label} className="flex items-center justify-between">
          <span className="text-[10px] text-white/30">{row.label}</span>
          <span className={`text-[10px] font-bold ${row.val > 0 ? row.color : 'text-white/15'}`}>
            {row.val > 0 ? row.val : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeModule, onNavigate, isOpen, onToggle }) => {
  return (
    <aside className={cn(
      'flex flex-col bg-[#0d1117] border-r border-white/5 transition-all duration-300 shrink-0',
      isOpen ? 'w-64' : 'w-16'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        {isOpen && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">SPI S.A.</p>
            <p className="text-[10px] text-white/40 truncate">SGC ISO 9001:2015</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-white/30 hover:text-white/70 transition-colors shrink-0"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {modules.map((mod, idx) => {
          // El hub datos-config cubre también los IDs legacy (drive-sync, clientes, auditoria)
          const HUB_IDS = ['datos-config', 'drive-sync', 'clientes', 'auditoria'];
          const isActive = activeModule === mod.id ||
            (mod.id === 'datos-config' && HUB_IDS.includes(activeModule));
          const showGroupLabel = isOpen && mod.group && (idx === 0 || modules[idx - 1].group !== mod.group);
          return (
            <React.Fragment key={mod.id}>
              {showGroupLabel && (
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold px-3 pt-3 pb-1">
                  {mod.group}
                </p>
              )}
              <button
                onClick={() => onNavigate(mod.id)}
                title={!isOpen ? mod.label : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5',
                  mod.group && !isActive ? 'pl-4' : ''
                )}
              >
                <span className={cn('shrink-0', isActive ? mod.color : '')}>{mod.icon}</span>
                {isOpen && <span className="truncate font-medium">{mod.label}</span>}
                {isOpen && isActive && (
                  <span className={cn('ml-auto w-1.5 h-1.5 rounded-full shrink-0', mod.color.replace('text-', 'bg-'))} />
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Estado de datos vivo */}
      {isOpen && (
        <div className="m-3 p-3 rounded-lg bg-white/4 border border-white/8 space-y-2">
          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Datos en sistema</p>
          <DataStatusMini />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
