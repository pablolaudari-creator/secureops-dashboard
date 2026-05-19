import React, { useState, useCallback } from 'react';
import {
  Database, RefreshCw, Download, Trash2, ChevronDown, ChevronRight,
  QrCode, Users, Shield, AlertTriangle, FileText, Activity,
  CheckCircle, XCircle, Clock, BarChart3, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Mapa completo de keys de localStorage ────────────────────────────────────
// Fuente: revisión de cada componente de la app
//
// El hook useLocalStorage antepone 'spi_sgc_' al key dado.
// Algunos módulos también hacen dual-write en keys sin prefijo para el Dashboard.
//
// Módulo                 → key principal                    → dual-write (opcional)
// RondasForm             → spi_sgc_spi_rondas_form_v1       → spi_rondas
// Presentismo            → spi_sgc_spi_presentismo_v1       → spi_presentismo
// SupervisionOperativa   → spi_sgc_supervisiones            → spi_supervisiones
// SupervisionOperativa   → (novedades)                      → spi_novedades
// ClientesObjetivos      → spi_sgc_clientes_objetivos_v1    → (ninguno)

interface ModuloConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  keys: {
    principal: string;      // key primaria (fuente de verdad)
    dualWrite?: string;     // key de dual-write si existe
    descripcion: string;
  }[];
  // Qué campo usar como título/resumen en cada registro
  getLabel: (r: Record<string, unknown>) => string;
  getSubtitle: (r: Record<string, unknown>) => string;
  getBadge?: (r: Record<string, unknown>) => { text: string; color: string } | null;
}

const MODULOS: ModuloConfig[] = [
  {
    id: 'rondas',
    label: 'Control de Rondas QR',
    icon: <QrCode size={15} />,
    color: 'emerald',
    keys: [
      {
        principal: 'spi_sgc_spi_rondas_form_v1',
        dualWrite: 'spi_rondas',
        descripcion: 'Registros del formulario de rondas con QR',
      },
    ],
    getLabel: r => String(r.clienteObjetivo ?? r.objetivo ?? '—'),
    getSubtitle: r => `${r.vigiladorNombre ?? r.vigilador ?? '—'} · ${r.turno ?? '—'} · ${r.fecha ?? '—'}`,
    getBadge: r => {
      const escaneo = String(r.escaneoOk ?? r.resultado ?? '');
      if (escaneo.startsWith('SI') || escaneo === 'OK') return { text: '✅ QR OK', color: 'emerald' };
      if (escaneo.startsWith('NO') || escaneo === 'Incompleto') return { text: '❌ Sin QR', color: 'red' };
      return null;
    },
  },
  {
    id: 'presentismo',
    label: 'Control de Presentismo',
    icon: <Users size={15} />,
    color: 'sky',
    keys: [
      {
        principal: 'spi_sgc_spi_presentismo_v1',
        dualWrite: 'spi_presentismo',
        descripcion: 'Registros de asistencia del personal de seguridad',
      },
    ],
    getLabel: r => String(r.nombreApellido ?? r.nombre ?? '—'),
    getSubtitle: r => `DNI ${r.nroDocumento ?? '—'} · ${r.objetivo ?? '—'} · ${r.turno ?? '—'} · ${r.fecha ?? '—'}`,
    getBadge: r => {
      const e = String(r.estado ?? '');
      if (e === 'Presente') return { text: '✅ Presente', color: 'emerald' };
      if (e === 'Tardanza') return { text: '🟡 Tardanza', color: 'amber' };
      if (e === 'Ausente')  return { text: '🔴 Ausente',  color: 'red' };
      return null;
    },
  },
  {
    id: 'supervisiones',
    label: 'Supervisión Operativa',
    icon: <Shield size={15} />,
    color: 'indigo',
    keys: [
      {
        principal: 'spi_sgc_supervisiones',
        dualWrite: 'spi_supervisiones',
        descripcion: 'Inspecciones de supervisión con checklist y puntaje',
      },
    ],
    getLabel: r => String(r.clienteObjetivo ?? '—'),
    getSubtitle: r => `${r.supervisor ?? '—'} · ${r.fecha ?? '—'} · ${r.hora ?? '—'} · Puntaje: ${r.puntaje ?? '—'}%`,
    getBadge: r => {
      const res = String(r.resultado ?? '');
      if (res.includes('EXCELENTE') || res.includes('MUY BIEN')) return { text: res, color: 'emerald' };
      if (res.includes('REGULAR') || res.includes('BAJO')) return { text: res, color: 'amber' };
      if (res.includes('CRÍTICO') || res.includes('CRITICO')) return { text: res, color: 'red' };
      return { text: res || '—', color: 'white' };
    },
  },
  {
    id: 'novedades',
    label: 'Novedades Operativas',
    icon: <AlertTriangle size={15} />,
    color: 'orange',
    keys: [
      {
        principal: 'spi_novedades',
        descripcion: 'Novedades generadas automáticamente desde Supervisión Operativa',
      },
    ],
    getLabel: r => String(r.item ?? r.titulo ?? '—'),
    getSubtitle: r => `${r.objetivo ?? '—'} · ${r.supervisor ?? '—'} · ${r.fecha ?? '—'}`,
    getBadge: r => {
      const p = String(r.prioridad ?? '');
      const e = String(r.estado ?? '');
      if (e === 'Cerrada') return { text: '✅ Cerrada', color: 'emerald' };
      if (p === 'Alta') return { text: '🔴 Alta', color: 'red' };
      if (p === 'Media') return { text: '🟡 Media', color: 'amber' };
      return null;
    },
  },
  {
    id: 'clientes',
    label: 'Clientes & Objetivos',
    icon: <FileText size={15} />,
    color: 'violet',
    keys: [
      {
        principal: 'spi_sgc_clientes_objetivos_v1',
        descripcion: 'Listado de clientes/objetivos de seguridad',
      },
    ],
    getLabel: r => String(r.nombre ?? '—'),
    getSubtitle: r => `${r.direccion ?? '—'} · ${r.tipoServicio ?? '—'} · ${r.estado ?? '—'}`,
    getBadge: r => {
      const e = String(r.estado ?? '');
      if (e === 'Activo') return { text: '🟢 Activo', color: 'emerald' };
      if (e === 'Inactivo') return { text: '⚫ Inactivo', color: 'white' };
      if (e === 'Prospecto') return { text: '🔵 Prospecto', color: 'sky' };
      return null;
    },
  },
];

// ─── Lector de registros con deduplicación por ID ─────────────────────────────
function leerRegistros(keys: string[]): Record<string, unknown>[] {
  const vistos = new Set<string>();
  const lista: Record<string, unknown>[] = [];
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) continue;
      for (const r of arr as Record<string, unknown>[]) {
        const uid = String(r.id ?? r.timestamp ?? Math.random());
        if (!vistos.has(uid)) { vistos.add(uid); lista.push(r); }
      }
    } catch { /* noop */ }
  }
  // Ordenar por timestamp desc si existe
  return lista.sort((a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0));
}

// ─── Colores por nombre ───────────────────────────────────────────────────────
const badgeColors: Record<string, string> = {
  emerald: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
  amber:   'bg-amber-500/15 border-amber-500/25 text-amber-400',
  red:     'bg-red-500/15 border-red-500/25 text-red-400',
  sky:     'bg-sky-500/15 border-sky-500/25 text-sky-400',
  indigo:  'bg-indigo-500/15 border-indigo-500/25 text-indigo-400',
  orange:  'bg-orange-500/15 border-orange-500/25 text-orange-400',
  violet:  'bg-violet-500/15 border-violet-500/25 text-violet-400',
  white:   'bg-white/10 border-white/15 text-white/50',
};

const moduleColors: Record<string, string> = {
  emerald: 'border-l-emerald-500/40 bg-emerald-500/5',
  sky:     'border-l-sky-500/40 bg-sky-500/5',
  indigo:  'border-l-indigo-500/40 bg-indigo-500/5',
  orange:  'border-l-orange-500/40 bg-orange-500/5',
  violet:  'border-l-violet-500/40 bg-violet-500/5',
};

const moduleIconColors: Record<string, string> = {
  emerald: 'text-emerald-400',
  sky:     'text-sky-400',
  indigo:  'text-indigo-400',
  orange:  'text-orange-400',
  violet:  'text-violet-400',
};

// ─── Componente principal ─────────────────────────────────────────────────────
interface DataAuditProps {
  searchQuery?: string;
  onNavigate?: (id: string) => void;
}

const DataAudit: React.FC<DataAuditProps> = ({ searchQuery = '', onNavigate }) => {
  const [activeModule, setActiveModule] = useState<string>('rondas');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Escuchar storage events externos (ej: otro módulo guardó datos)
  // y refrescar la vista automáticamente
  React.useEffect(() => {
    const onStorage = () => setTick(t => t + 1);
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Dispara StorageEvents para que el Dashboard (y cualquier otro listener)
  // re-lea los datos cuando el usuario presiona "Actualizar"
  const fireStorageEvents = useCallback(() => {
    const allKeys = MODULOS.flatMap(m =>
      m.keys.flatMap(k => [k.principal, ...(k.dualWrite ? [k.dualWrite] : [])])
    );
    const unique = [...new Set(allKeys)];
    unique.forEach(key => {
      window.dispatchEvent(new StorageEvent('storage', { key }));
    });
  }, []);

  const refresh = useCallback(() => {
    setTick(t => t + 1);
    fireStorageEvents();
  }, [fireStorageEvents]);

  // Leer registros del módulo activo
  const modulo = MODULOS.find(m => m.id === activeModule)!;
  const todasLasKeys = modulo.keys.flatMap(k => [k.principal, ...(k.dualWrite ? [k.dualWrite] : [])]);
  const registros = React.useMemo(
    () => leerRegistros(todasLasKeys),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeModule, tick]
  );

  // Filtro por searchQuery
  const filtered = searchQuery
    ? registros.filter(r => JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase()))
    : registros;

  // Totales por módulo para el resumen
  const totales = React.useMemo(() => {
    return MODULOS.map(m => {
      const keys = m.keys.flatMap(k => [k.principal, ...(k.dualWrite ? [k.dualWrite] : [])]);
      const regs = leerRegistros(keys);
      return { id: m.id, count: regs.length };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const totalGeneral = totales.reduce((acc, t) => acc + t.count, 0);

  // Export JSON del módulo activo
  const handleExportModulo = () => {
    const blob = new Blob([JSON.stringify(registros, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spi_${activeModule}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV del módulo activo
  const handleExportCSV = () => {
    if (registros.length === 0) return;
    const keys = Object.keys(registros[0]).filter(k => k !== 'firmaUrl' && k !== 'fotoUrl' && k !== 'checklist');
    const header = keys.join(',');
    const rows = registros.map(r =>
      keys.map(k => {
        const v = r[k];
        if (v === null || v === undefined) return '';
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spi_${activeModule}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export todo el sistema
  const handleExportAll = () => {
    const snapshot: Record<string, unknown[]> = {};
    for (const m of MODULOS) {
      const keys = m.keys.flatMap(k => [k.principal, ...(k.dualWrite ? [k.dualWrite] : [])]);
      snapshot[m.id] = leerRegistros(keys);
    }
    snapshot['_meta'] = [{
      exportedAt: new Date().toISOString(),
      totalRegistros: totalGeneral,
      modulos: MODULOS.map(m => m.label),
    }];
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spi_completo_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Formatear timestamp
  const fmtTs = (ts: unknown) => {
    if (!ts) return '—';
    try {
      return new Date(Number(ts)).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return '—'; }
  };

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
            <Database size={17} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Auditoría de Datos</h1>
            <p className="text-[11px] text-white/35">
              {totalGeneral} registros totales · Todos los módulos desde el inicio de actividad
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 text-xs transition-colors"
          >
            <RefreshCw size={12} /> Actualizar
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 text-xs transition-colors"
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={handleExportModulo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 text-xs transition-colors"
          >
            <Download size={12} /> JSON módulo
          </button>
          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 border border-violet-500/30 text-white text-xs font-semibold transition-colors"
          >
            <Download size={12} /> Exportar Todo
          </button>
        </div>
      </div>

      {/* ── Resumen de módulos ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {MODULOS.map(m => {
          const t = totales.find(x => x.id === m.id);
          const isActive = activeModule === m.id;
          return (
            <button
              key={m.id}
              onClick={() => { setActiveModule(m.id); setExpandedId(null); setShowRaw(null); }}
              className={cn(
                'flex flex-col gap-2 p-3 rounded-xl border text-left transition-all',
                isActive
                  ? `border-${m.color}-500/40 bg-${m.color}-500/10`
                  : 'border-white/8 bg-white/3 hover:bg-white/6'
              )}
            >
              <div className={cn('flex items-center gap-2', moduleIconColors[m.color])}>
                {m.icon}
                <span className="text-[11px] font-semibold truncate">{m.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn('text-2xl font-bold', isActive ? moduleIconColors[m.color] : 'text-white/70')}>
                  {t?.count ?? 0}
                </span>
                <span className="text-[10px] text-white/25">registros</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Panel del módulo activo ── */}
      <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">

        {/* Sub-header */}
        <div className={cn('px-5 py-3.5 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap border-l-2', moduleColors[modulo.color])}>
          <div className="flex items-center gap-2.5">
            <span className={moduleIconColors[modulo.color]}>{modulo.icon}</span>
            <div>
              <p className="text-sm font-semibold text-white">{modulo.label}</p>
              <p className="text-[10px] text-white/30">{modulo.keys[0].descripcion}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/30">
              {filtered.length} de {registros.length} registros
              {searchQuery ? ` · filtrando "${searchQuery}"` : ''}
            </span>
            {modulo.keys.map(k => (
              <span key={k.principal} className="text-[9px] font-mono text-white/20 bg-white/5 px-2 py-0.5 rounded">
                {k.principal}
              </span>
            ))}
          </div>
        </div>

        {/* Lista de registros */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/4 flex items-center justify-center mx-auto mb-3">
              <Database size={22} className="text-white/15" />
            </div>
            <p className="text-sm font-semibold text-white/30">Sin registros</p>
            <p className="text-[11px] text-white/20 mt-1 max-w-xs mx-auto">
              Los registros aparecen aquí al cargar datos en el módulo correspondiente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/4 max-h-[60vh] overflow-y-auto">
            {filtered.map((r, i) => {
              const uid = String(r.id ?? r.timestamp ?? i);
              const isExpanded = expandedId === uid;
              const isRaw = showRaw === uid;
              const badge = modulo.getBadge?.(r);
              const label = modulo.getLabel(r);
              const subtitle = modulo.getSubtitle(r);

              // Campos a mostrar en detalle (excluir binarios pesados)
              const detailEntries = Object.entries(r).filter(
                ([k]) => !['firmaUrl', 'fotoUrl', 'checklist'].includes(k)
              );

              return (
                <div key={uid} className="group">
                  {/* Fila resumen */}
                  <div
                    className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/2 transition-colors"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : uid);
                      if (isExpanded) setShowRaw(null);
                    }}
                  >
                    {/* Número */}
                    <span className="text-[10px] text-white/20 font-mono w-7 shrink-0 text-right">
                      {i + 1}
                    </span>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white/85 truncate">{label}</p>
                      <p className="text-[11px] text-white/35 truncate">{subtitle}</p>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-white/25 shrink-0 hidden sm:block">
                      {fmtTs(r.timestamp)}
                    </span>

                    {/* Badge estado */}
                    {badge && (
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                        badgeColors[badge.color] ?? badgeColors.white
                      )}>
                        {badge.text}
                      </span>
                    )}

                    {/* Expand icon */}
                    <span className="text-white/20 shrink-0">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </div>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="px-5 pb-4 bg-white/2 border-t border-white/4">
                      {/* Toolbar */}
                      <div className="flex items-center gap-2 pt-3 pb-3">
                        <button
                          onClick={() => setShowRaw(isRaw ? null : uid)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/8 text-white/40 text-[11px] transition-colors"
                        >
                          {isRaw ? <EyeOff size={11} /> : <Eye size={11} />}
                          {isRaw ? 'Vista normal' : 'Ver JSON raw'}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(JSON.stringify(r, null, 2));
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/8 text-white/40 text-[11px] transition-colors"
                        >
                          <FileText size={11} /> Copiar JSON
                        </button>
                      </div>

                      {isRaw ? (
                        <pre className="text-[10px] text-emerald-300/70 bg-black/40 rounded-lg p-3 overflow-x-auto max-h-60 leading-relaxed font-mono">
                          {JSON.stringify(r, null, 2)}
                        </pre>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {detailEntries.map(([k, v]) => {
                            const display = v === null || v === undefined
                              ? '—'
                              : typeof v === 'object'
                                ? Array.isArray(v)
                                  ? (v as unknown[]).join(', ') || '—'
                                  : JSON.stringify(v)
                                : String(v) || '—';
                            return (
                              <div key={k} className="bg-white/3 rounded-lg px-3 py-2">
                                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5 font-semibold">
                                  {k}
                                </p>
                                <p className="text-[11px] text-white/70 break-words leading-snug">
                                  {display}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] text-white/20">
              Fuente: {modulo.keys.map(k => k.principal).join(', ')}
            </p>
            <div className="flex items-center gap-3">
              <StatsBar registros={registros} modulo={modulo} />
            </div>
          </div>
        )}
      </div>

      {/* ── Panel de estadísticas rápidas ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DiagnosticoPanel tick={tick} />
        <ResumenGlobal totales={totales} modulos={MODULOS} />
      </div>
    </div>
  );
};

// ─── Stats bar inline ─────────────────────────────────────────────────────────
const StatsBar: React.FC<{
  registros: Record<string, unknown>[];
  modulo: ModuloConfig;
}> = ({ registros, modulo }) => {
  if (modulo.id === 'presentismo') {
    const p = registros.filter(r => r.estado === 'Presente').length;
    const a = registros.filter(r => r.estado === 'Ausente').length;
    const t = registros.filter(r => r.estado === 'Tardanza').length;
    return (
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-emerald-400">{p} P</span>
        <span className="text-red-400">{a} A</span>
        <span className="text-amber-400">{t} T</span>
      </div>
    );
  }
  if (modulo.id === 'rondas') {
    const ok = registros.filter(r => String(r.escaneoOk ?? r.resultado ?? '').startsWith('SI') || r.resultado === 'OK').length;
    const mal = registros.length - ok;
    return (
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-emerald-400">{ok} QR OK</span>
        <span className="text-red-400">{mal} sin QR</span>
      </div>
    );
  }
  if (modulo.id === 'supervisiones') {
    const criticas = registros.filter(r => (r.puntaje as number) < 60).length;
    const prom = registros.length > 0
      ? Math.round(registros.reduce((acc, r) => acc + (Number(r.puntaje) || 0), 0) / registros.length)
      : 0;
    return (
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-white/40">Prom: <span className="text-white/70 font-bold">{prom}%</span></span>
        {criticas > 0 && <span className="text-red-400">{criticas} críticas</span>}
      </div>
    );
  }
  return null;
};

// ─── Diagnóstico de localStorage ─────────────────────────────────────────────
const DiagnosticoPanel: React.FC<{ tick: number }> = ({ tick }) => {
  const diagnostico = React.useMemo(() => {
    const todas = MODULOS.flatMap(m => m.keys.flatMap(k => [k.principal, ...(k.dualWrite ? [k.dualWrite] : [])]));
    const unicas = [...new Set(todas)];
    return unicas.map(key => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return { key, estado: 'vacía', count: 0, bytes: 0 };
        const arr = JSON.parse(raw);
        const count = Array.isArray(arr) ? arr.length : -1;
        const bytes = new Blob([raw]).size;
        return { key, estado: 'ok', count, bytes };
      } catch {
        return { key, estado: 'error', count: 0, bytes: 0 };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return (
    <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <Activity size={13} className="text-white/40" />
        <p className="text-xs font-semibold text-white/70">Estado de almacenamiento local</p>
      </div>
      <div className="divide-y divide-white/4">
        {diagnostico.map(d => (
          <div key={d.key} className="px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {d.estado === 'ok' && d.count > 0
                ? <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                : d.estado === 'error'
                  ? <XCircle size={12} className="text-red-400 shrink-0" />
                  : <Clock size={12} className="text-white/20 shrink-0" />
              }
              <span className="text-[10px] font-mono text-white/40 truncate">{d.key}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {d.count >= 0 && (
                <span className={cn(
                  'text-[10px] font-bold',
                  d.count > 0 ? 'text-white/60' : 'text-white/20'
                )}>
                  {d.count} reg.
                </span>
              )}
              {d.bytes > 0 && (
                <span className="text-[9px] text-white/20">
                  {d.bytes > 1024 ? `${(d.bytes / 1024).toFixed(1)} KB` : `${d.bytes} B`}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Resumen global ───────────────────────────────────────────────────────────
const ResumenGlobal: React.FC<{
  totales: { id: string; count: number }[];
  modulos: ModuloConfig[];
}> = ({ totales, modulos }) => {
  const total = totales.reduce((acc, t) => acc + t.count, 0);
  return (
    <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <BarChart3 size={13} className="text-white/40" />
        <p className="text-xs font-semibold text-white/70">Resumen global del sistema</p>
      </div>
      <div className="p-4 space-y-3">
        {modulos.map(m => {
          const t = totales.find(x => x.id === m.id);
          const count = t?.count ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={m.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className={cn('flex items-center gap-1.5 text-[11px]', moduleIconColors[m.color])}>
                  {m.icon}
                  <span className="text-white/50">{m.label}</span>
                </div>
                <span className="text-[11px] font-bold text-white/60">{count}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', {
                    'bg-emerald-500': m.color === 'emerald',
                    'bg-sky-500': m.color === 'sky',
                    'bg-indigo-500': m.color === 'indigo',
                    'bg-orange-500': m.color === 'orange',
                    'bg-violet-500': m.color === 'violet',
                  })}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-white/30">Total general</span>
          <span className="text-sm font-bold text-white/70">{total}</span>
        </div>
      </div>
    </div>
  );
};

export default DataAudit;
