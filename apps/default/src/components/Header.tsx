import React from 'react';
import { Menu, Sun, Moon, Printer, Search, Wifi, WifiOff, Clock } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useClock, useCountdown, useOnlineStatus } from '../hooks/useAppHooks';
import type { ModuleId } from '../App';

const titles: Partial<Record<ModuleId, string>> & { default: string } = {
  default:              'SPI S.A. — SGC ISO 9001:2015',
  dashboard:            'Dashboard KPIs Operativos',
  rondas:               'Control de Rondas QR',
  rondasform:           'Formulario de Rondas QR',
  presentismo:          'Control de Presentismo',
  noconformidades:      'No Conformidades & Acciones Correctivas',
  riesgos:              'Matriz de Riesgos SGC',
  cctv:                 'Control CCTV & Alarmas por Sede',
  capacitaciones:       'Plan Capacitaciones 2026',
  supervision:          'Supervisión Operativa',
  'supervision-operativa': 'Supervisión Operativa (campo)',
  incidentes:           'Registro de Incidentes & Novedades',
  'reporte-semanal':    'Reporte Semanal',
  'reporte-abril':      'Reportes & Análisis 2026',
  'datos-config':       'Datos & Configuración',
  'drive-sync':         'Datos & Configuración',
  clientes:             'Datos & Configuración',
  auditoria:            'Datos & Configuración',
};

// Deadline 2ª auditoría seguimiento
const AUDIT_DEADLINE = '2026-04-30';

interface HeaderProps {
  activeModule: ModuleId;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onPrint: () => void;
  refreshing?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  activeModule,
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  onPrint,
  refreshing = false,
}) => {
  const { theme, toggle } = useTheme();
  const now = useClock();
  const online = useOnlineStatus();
  const { days } = useCountdown(AUDIT_DEADLINE);

  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });

  const deadlineUrgent = days <= 10;
  const deadlineColor = deadlineUrgent ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-emerald-400';
  const deadlineBg = deadlineUrgent ? 'bg-red-500/10 border-red-500/30' : days <= 30 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10';

  return (
    <header className="flex items-center gap-3 px-4 py-3 bg-[#0d1117] border-b border-white/5 shrink-0 no-print">
      {/* Sidebar toggle — mobile */}
      <button
        onClick={onToggleSidebar}
        className="text-white/40 hover:text-white/70 transition-colors shrink-0 md:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Module title */}
      <div className="min-w-0 hidden sm:block">
        <h1 className="text-sm font-semibold text-white truncate leading-tight">{titles[activeModule] ?? titles.default}</h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock size={10} className="text-white/30" />
          <span className="text-[11px] text-white/30 font-mono">{timeStr}</span>
          <span className="text-[11px] text-white/20">{dateStr}</span>
          {refreshing && (
            <span className="text-[10px] text-blue-400 animate-pulse ml-1">↻ Actualizando...</span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xs ml-2">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
          <Search size={13} className="text-white/30 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar sede, objetivo, NC..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/20 outline-none min-w-0"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="text-white/30 hover:text-white/60 text-xs">✕</button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* Countdown */}
        <div className={`hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${deadlineBg} ${deadlineColor}`}>
          {deadlineUrgent && <span className="anim-pulse-slow">⚠</span>}
          <span>{days}d · 2ª Auditoría</span>
        </div>

        {/* Online status */}
        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs ${online ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {online
            ? <Wifi size={12} />
            : <WifiOff size={12} />
          }
          <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
        </div>

        {/* Print */}
        <button
          onClick={onPrint}
          title="Exportar PDF"
          className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <Printer size={15} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
