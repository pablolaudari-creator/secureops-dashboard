/**
 * DataConfigHub — Hub central de Datos & Configuración
 *
 * Conecta Sincronizar Datos, Auditoría de Datos y Clientes & Objetivos
 * en un único panel con flujo visual hacia el Dashboard, Formularios, SGC y Reportes.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HardDrive, Database, Building2, LayoutDashboard, QrCode,
  Users, Shield, AlertTriangle, BarChart3, ArrowRight,
  CheckCircle2, RefreshCw, Activity, Zap, FileText,
  ClipboardCheck, TrendingUp, ChevronRight, Circle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { ModuleId } from '../App';
import DriveSync from './DriveSync';
import DataAudit from './DataAudit';
import ClientesObjetivos from './ClientesObjetivos';

// ─── Lector universal de LS ───────────────────────────────────────────────────

function countLS(keys: string[]): number {
  let total = 0;
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw || !raw.startsWith('[')) continue;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) total += arr.length;
    } catch { /* noop */ }
  }
  return total;
}

const LS_KEYS = {
  rondas:        ['spi_rondas', 'spi_sgc_spi_rondas_form_v1', 'spi_sgc_rondas_v2'],
  presentismo:   ['spi_presentismo', 'spi_sgc_spi_presentismo_v1'],
  supervisiones: ['spi_supervisiones', 'spi_sgc_supervisiones'],
  novedades:     ['spi_novedades'],
  clientes:      ['spi_clientes_objetivos'],
};

function buildCounts() {
  return {
    rondas:        countLS(LS_KEYS.rondas),
    presentismo:   countLS(LS_KEYS.presentismo),
    supervisiones: countLS(LS_KEYS.supervisiones),
    novedades:     countLS(LS_KEYS.novedades),
    clientes:      countLS(LS_KEYS.clientes),
  };
}

// ─── Flujo de datos visual ────────────────────────────────────────────────────

interface FlowConnection {
  from: string;
  to: string;
  label: string;
  active: boolean;
  color: string;
}

// ─── Sub-tabs ─────────────────────────────────────────────────────────────────

type SubTab = 'overview' | 'sync' | 'audit' | 'clientes';

interface DataConfigHubProps {
  onNavigate: (id: ModuleId) => void;
  searchQuery?: string;
}

// ─── Módulo de destino con estado ─────────────────────────────────────────────

interface DestModule {
  id: ModuleId;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  dataKeys: string[];
  feeds: string[]; // qué tipos de datos alimenta
}

const DEST_MODULES: DestModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard SGC',
    shortLabel: 'Dashboard',
    icon: <LayoutDashboard size={15} />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/25',
    description: 'KPIs, rondas, presentismo y supervisiones en tiempo real',
    dataKeys: [...LS_KEYS.rondas, ...LS_KEYS.presentismo, ...LS_KEYS.supervisiones],
    feeds: ['rondas', 'presentismo', 'supervisiones'],
  },
  {
    id: 'rondas',
    label: 'Inspecciones & Rondas',
    shortLabel: 'Rondas',
    icon: <QrCode size={15} />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/25',
    description: 'Historial de rondas QR e inspecciones por objetivo',
    dataKeys: LS_KEYS.rondas,
    feeds: ['rondas'],
  },
  {
    id: 'presentismo',
    label: 'Control de Presentismo',
    shortLabel: 'Presentismo',
    icon: <Users size={15} />,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/25',
    description: 'Asistencia, cobertura y ausentismo del personal',
    dataKeys: LS_KEYS.presentismo,
    feeds: ['presentismo'],
  },
  {
    id: 'supervision',
    label: 'Supervisión Operativa',
    shortLabel: 'Supervisión',
    icon: <ClipboardCheck size={15} />,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/25',
    description: 'Puntajes de supervisión y checklist por servicio',
    dataKeys: LS_KEYS.supervisiones,
    feeds: ['supervisiones'],
  },
  {
    id: 'noconformidades',
    label: 'No Conformidades',
    shortLabel: 'SGC / NC',
    icon: <AlertTriangle size={15} />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/25',
    description: 'NC generadas desde rondas, supervisiones e incidentes',
    dataKeys: LS_KEYS.novedades,
    feeds: ['novedades'],
  },
  {
    id: 'reporte-abril',
    label: 'Reportes',
    shortLabel: 'Reportes',
    icon: <BarChart3 size={15} />,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/25',
    description: 'Resumen Ene→May, reporte de abril y análisis de tendencias',
    dataKeys: [...LS_KEYS.rondas, ...LS_KEYS.presentismo, ...LS_KEYS.supervisiones],
    feeds: ['rondas', 'presentismo', 'supervisiones'],
  },
];

// ─── Componente de nodo de flujo ─────────────────────────────────────────────

const FlowNode: React.FC<{
  module: DestModule;
  count: number;
  onClick: () => void;
  pulse?: boolean;
}> = ({ module, count, onClick, pulse }) => {
  const hasData = count > 0;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group',
        hasData
          ? `${module.bgColor} ${module.borderColor}`
          : 'bg-white/3 border-white/8 hover:border-white/15',
        pulse && 'animate-pulse'
      )}
    >
      <div className={cn('flex items-center gap-2', hasData ? module.color : 'text-white/30')}>
        {module.icon}
        <span className="text-[10px] font-bold uppercase tracking-wider truncate">{module.shortLabel}</span>
        {hasData && (
          <span className={cn('ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded-full', module.bgColor, module.color)}>
            {count}
          </span>
        )}
      </div>
      <p className="text-[9px] text-white/30 leading-snug">{module.description}</p>
      <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className={cn('text-[9px] font-semibold', hasData ? module.color : 'text-white/30')}>
          {hasData ? 'Ver módulo' : 'Sin datos aún'}
        </span>
        <ChevronRight size={9} className={hasData ? module.color : 'text-white/20'} />
      </div>
    </button>
  );
};

// ─── Pulso de actividad ───────────────────────────────────────────────────────

const ActivityPulse: React.FC<{ active: boolean; color: string }> = ({ active, color }) => (
  <div className="relative flex items-center justify-center w-3 h-3">
    {active && (
      <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', color.replace('text-', 'bg-'))} />
    )}
    <Circle size={6} className={cn('relative', active ? color : 'text-white/15')} fill="currentColor" />
  </div>
);

// ─── MAIN HUB ─────────────────────────────────────────────────────────────────

const DataConfigHub: React.FC<DataConfigHubProps> = ({ onNavigate, searchQuery = '' }) => {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [counts, setCounts] = useState(buildCounts);
  const [lastImport, setLastImport] = useState<Date | null>(null);
  const [importedTypes, setImportedTypes] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setCounts(buildCounts());
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  // Escuchar eventos de storage → refrescar contadores automáticamente
  useEffect(() => {
    const handler = () => setCounts(buildCounts());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Callback que recibe DriveSync cuando termina una importación
  const handleImportDone = useCallback(() => {
    setCounts(buildCounts());
    setLastImport(new Date());
    // Detectar qué tipos cambiaron
    const nc = buildCounts();
    const types: string[] = [];
    if (nc.rondas > counts.rondas) types.push('rondas');
    if (nc.presentismo > counts.presentismo) types.push('presentismo');
    if (nc.supervisiones > counts.supervisiones) types.push('supervisiones');
    if (nc.novedades > counts.novedades) types.push('novedades');
    setImportedTypes(types);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setImportedTypes([]), 5000);
  }, [counts]);

  // Total de registros en el sistema
  const totalRecords = counts.rondas + counts.presentismo + counts.supervisiones + counts.novedades;
  const hasData = totalRecords > 0;

  // Estado de salud por módulo de destino
  const moduleCount = (mod: DestModule): number => {
    const key = mod.feeds[0] as keyof typeof counts;
    if (mod.id === 'dashboard' || mod.id === 'reporte-abril') {
      return counts.rondas + counts.presentismo + counts.supervisiones;
    }
    return counts[key] ?? 0;
  };

  const tabs: { id: SubTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Flujo de datos', icon: <Activity size={13} /> },
    { id: 'sync',     label: 'Sincronizar', icon: <HardDrive size={13} />, count: 0 },
    { id: 'audit',    label: 'Auditoría', icon: <Database size={13} />, count: totalRecords },
    { id: 'clientes', label: 'Clientes', icon: <Building2 size={13} />, count: counts.clientes },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-white/5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-700 flex items-center justify-center shadow-lg shadow-blue-900/30 shrink-0">
              <Zap size={17} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Datos & Configuración</h1>
              <p className="text-[11px] text-white/40 mt-0.5">
                Centro de control · {totalRecords.toLocaleString('es-AR')} registros en sistema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {lastImport && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 size={10} /> Importado {lastImport.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={refresh}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 border border-white/8 transition-colors',
                refreshing && 'animate-pulse'
              )}
            >
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Estado global de salud */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'rondas', label: 'Rondas', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <QrCode size={12} /> },
            { key: 'presentismo', label: 'Presentismo', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', icon: <Users size={12} /> },
            { key: 'supervisiones', label: 'Supervisiones', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: <Shield size={12} /> },
            { key: 'novedades', label: 'Novedades', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <AlertTriangle size={12} /> },
          ].map(({ key, label, color, bg, border, icon }) => {
            const c = counts[key as keyof typeof counts];
            const isPulsing = importedTypes.includes(key);
            return (
              <div key={key} className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all', c > 0 ? `${bg} ${border}` : 'bg-white/3 border-white/5')}>
                <ActivityPulse active={isPulsing || c > 0} color={c > 0 ? color : 'text-white/15'} />
                <div className="min-w-0">
                  <p className={cn('text-xs font-bold', c > 0 ? color : 'text-white/20')}>{c > 0 ? c.toLocaleString('es-AR') : '—'}</p>
                  <p className="text-[9px] text-white/25 truncate">{label}</p>
                </div>
                <span className={cn('ml-auto shrink-0', c > 0 ? color : 'text-white/10')}>{icon}</span>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-white/4 p-1 rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap',
                subTab === t.id
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              )}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">

        {/* ── TAB: FLUJO DE DATOS ── */}
        {subTab === 'overview' && (
          <div className="p-5 space-y-6">

            {/* Banner de importación exitosa */}
            {importedTypes.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 animate-pulse">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-emerald-300">
                    Datos sincronizados · {importedTypes.join(', ')} actualizados
                  </p>
                  <p className="text-[10px] text-emerald-400/60 mt-0.5">
                    El Dashboard y todos los módulos ya reflejan los nuevos datos.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold transition-colors shrink-0"
                >
                  Ver Dashboard <ArrowRight size={11} />
                </button>
              </div>
            )}

            {/* Estado sin datos */}
            {!hasData && (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center">
                  <HardDrive size={26} className="text-white/20" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/40">Sin datos en el sistema</p>
                  <p className="text-[11px] text-white/25 mt-1 max-w-xs">
                    Importá un CSV desde Google Drive o cargá datos en los formularios para ver el flujo activo.
                  </p>
                </div>
                <button
                  onClick={() => setSubTab('sync')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                >
                  <HardDrive size={13} /> Ir a Sincronizar Datos
                </button>
              </div>
            )}

            {/* Diagrama de flujo */}
            {hasData && (
              <div className="space-y-5">

                {/* ── FUENTES → NODO CENTRAL ── */}
                <div>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-3">Fuentes de datos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                    {/* Formularios operativos */}
                    <div className="bg-[#0d1117] rounded-xl border border-white/8 p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText size={13} className="text-teal-400" />
                        <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Formularios Operativos</p>
                      </div>
                      {[
                        { id: 'rondasform' as ModuleId, label: 'Rondas QR', color: 'text-emerald-400', count: counts.rondas, icon: <QrCode size={11} /> },
                        { id: 'presentismo' as ModuleId, label: 'Presentismo', color: 'text-sky-400', count: counts.presentismo, icon: <Users size={11} /> },
                        { id: 'supervision' as ModuleId, label: 'Supervisión Op.', color: 'text-indigo-400', count: counts.supervisiones, icon: <ClipboardCheck size={11} /> },
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => onNavigate(f.id)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/15 transition-colors group"
                        >
                          <span className={f.color}>{f.icon}</span>
                          <span className="text-[11px] text-white/60 group-hover:text-white/80 flex-1 text-left">{f.label}</span>
                          <span className={cn('text-[10px] font-bold', f.count > 0 ? f.color : 'text-white/20')}>
                            {f.count > 0 ? f.count : '—'}
                          </span>
                          <ChevronRight size={10} className="text-white/20 group-hover:text-white/50" />
                        </button>
                      ))}
                    </div>

                    {/* Drive / CSV */}
                    <div className="bg-[#0d1117] rounded-xl border border-blue-500/20 p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <HardDrive size={13} className="text-blue-400" />
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Sincronizar Datos</p>
                      </div>
                      <p className="text-[10px] text-white/30 leading-snug">
                        CSV / JSON desde Google Drive, Excel o cualquier planilla exportada.
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {[
                          { label: 'Rondas importadas', count: counts.rondas, color: 'text-emerald-400' },
                          { label: 'Presentismo imp.', count: counts.presentismo, color: 'text-sky-400' },
                          { label: 'Supervisiones imp.', count: counts.supervisiones, color: 'text-indigo-400' },
                        ].map(r => (
                          <div key={r.label} className="flex items-center gap-2">
                            <ActivityPulse active={r.count > 0} color={r.color} />
                            <span className="text-[10px] text-white/35 flex-1">{r.label}</span>
                            <span className={cn('text-[10px] font-bold', r.count > 0 ? r.color : 'text-white/15')}>{r.count > 0 ? r.count : '—'}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setSubTab('sync')}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors"
                      >
                        <HardDrive size={11} /> Importar datos
                      </button>
                    </div>

                    {/* Clientes */}
                    <div className="bg-[#0d1117] rounded-xl border border-cyan-500/15 p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 size={13} className="text-cyan-400" />
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Clientes & Objetivos</p>
                      </div>
                      <p className="text-[10px] text-white/30 leading-snug">
                        Base de clientes activos. Alimenta los formularios con los objetivos de seguridad.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <ActivityPulse active={counts.clientes > 0} color="text-cyan-400" />
                        <span className="text-[10px] text-white/35">Clientes registrados</span>
                        <span className={cn('ml-auto text-[10px] font-bold', counts.clientes > 0 ? 'text-cyan-400' : 'text-white/15')}>
                          {counts.clientes > 0 ? counts.clientes : '—'}
                        </span>
                      </div>
                      <button
                        onClick={() => setSubTab('clientes')}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-700/60 hover:bg-cyan-600/80 text-white text-[11px] font-bold transition-colors"
                      >
                        <Building2 size={11} /> Gestionar clientes
                      </button>
                    </div>

                  </div>
                </div>

                {/* ── FLECHA CENTRAL ── */}
                <div className="flex items-center gap-3 px-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/8">
                    <TrendingUp size={11} className="text-white/40" />
                    <span className="text-[10px] text-white/40 font-semibold">Los datos fluyen hacia →</span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                {/* ── MÓDULOS DE DESTINO ── */}
                <div>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-3">Módulos que reciben datos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {DEST_MODULES.map(mod => (
                      <FlowNode
                        key={mod.id}
                        module={mod}
                        count={moduleCount(mod)}
                        onClick={() => onNavigate(mod.id)}
                        pulse={importedTypes.some(t => mod.feeds.includes(t))}
                      />
                    ))}
                  </div>
                </div>

                {/* ── AUDITORÍA RÁPIDA ── */}
                <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database size={13} className="text-violet-400" />
                      <p className="text-xs font-semibold text-white">Estado de datos — visión rápida</p>
                    </div>
                    <button
                      onClick={() => setSubTab('audit')}
                      className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                    >
                      Ver auditoría completa <ArrowRight size={10} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/5">
                    {[
                      { label: 'Rondas', key: 'rondas', color: 'text-emerald-400', icon: <QrCode size={14} />, target: 'rondas' as ModuleId },
                      { label: 'Presentismo', key: 'presentismo', color: 'text-sky-400', icon: <Users size={14} />, target: 'presentismo' as ModuleId },
                      { label: 'Supervisiones', key: 'supervisiones', color: 'text-indigo-400', icon: <Shield size={14} />, target: 'supervision' as ModuleId },
                      { label: 'Novedades', key: 'novedades', color: 'text-amber-400', icon: <AlertTriangle size={14} />, target: 'noconformidades' as ModuleId },
                    ].map(({ label, key, color, icon, target }) => {
                      const c = counts[key as keyof typeof counts];
                      return (
                        <button
                          key={key}
                          onClick={() => onNavigate(target)}
                          className="p-4 hover:bg-white/3 transition-colors group text-left"
                        >
                          <div className={cn('mb-2', c > 0 ? color : 'text-white/15')}>{icon}</div>
                          <p className={cn('text-xl font-bold', c > 0 ? color : 'text-white/15')}>{c || '—'}</p>
                          <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
                          <p className="text-[9px] text-white/15 group-hover:text-white/30 mt-1 transition-colors">
                            {c > 0 ? 'Ver en módulo →' : 'Sin datos'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── ACCIONES RÁPIDAS ── */}
                <div>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-3">Acciones rápidas</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Ver Dashboard', desc: 'KPIs actualizados', icon: <LayoutDashboard size={14} />, color: 'bg-blue-600/80 hover:bg-blue-500', target: 'dashboard' as ModuleId },
                      { label: 'Importar CSV', desc: 'Desde Drive o PC', icon: <HardDrive size={14} />, color: 'bg-blue-700/60 hover:bg-blue-600/80', target: null, action: () => setSubTab('sync') },
                      { label: 'Auditoría', desc: 'Verificar integridad', icon: <Database size={14} />, color: 'bg-violet-700/60 hover:bg-violet-600/80', target: null, action: () => setSubTab('audit') },
                      { label: 'Reportes', desc: 'Ene→May 2026', icon: <BarChart3 size={14} />, color: 'bg-violet-600/80 hover:bg-violet-500', target: 'reporte-abril' as ModuleId },
                    ].map((a, i) => (
                      <button
                        key={i}
                        onClick={() => a.target ? onNavigate(a.target) : a.action?.()}
                        className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-white text-xs font-semibold transition-colors text-left', a.color)}
                      >
                        <span className="shrink-0">{a.icon}</span>
                        <div className="min-w-0">
                          <p className="font-bold truncate">{a.label}</p>
                          <p className="text-[10px] text-white/60 font-normal truncate">{a.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── TAB: SINCRONIZAR ── */}
        {subTab === 'sync' && (
          <div className="p-5">
            {/* Breadcrumb de retorno */}
            <div className="flex items-center gap-2 mb-4 text-[11px] text-white/30">
              <button onClick={() => setSubTab('overview')} className="hover:text-white/60 transition-colors">
                Flujo de datos
              </button>
              <ChevronRight size={10} />
              <span className="text-white/60">Sincronizar Datos</span>
            </div>
            <DriveSync onNavigate={onNavigate} onImportDone={handleImportDone} />
          </div>
        )}

        {/* ── TAB: AUDITORÍA ── */}
        {subTab === 'audit' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4 text-[11px] text-white/30">
              <button onClick={() => setSubTab('overview')} className="hover:text-white/60 transition-colors">
                Flujo de datos
              </button>
              <ChevronRight size={10} />
              <span className="text-white/60">Auditoría de Datos</span>
            </div>
            <DataAudit searchQuery={searchQuery} onNavigate={onNavigate} />
          </div>
        )}

        {/* ── TAB: CLIENTES ── */}
        {subTab === 'clientes' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4 text-[11px] text-white/30">
              <button onClick={() => setSubTab('overview')} className="hover:text-white/60 transition-colors">
                Flujo de datos
              </button>
              <ChevronRight size={10} />
              <span className="text-white/60">Clientes & Objetivos</span>
            </div>
            <ClientesObjetivos />
          </div>
        )}

      </div>
    </div>
  );
};

export default DataConfigHub;
