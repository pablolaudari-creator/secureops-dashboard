import React, { useMemo, useState } from 'react';
import {
  X, Users, Building2, AlertTriangle, Clock,
  ChevronDown, ChevronUp, Search, Calendar,
  AlertOctagon,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RegistroP {
  id?: string;
  nombreApellido?: string;
  nombre?: string;
  nroDocumento?: string;
  objetivo?: string;
  clienteObjetivo?: string;
  turno?: string;
  estado?: string;
  fecha?: string;
  horaIngreso?: string;
  observaciones?: string;
  timestamp?: number;
}

// ─── Lector universal de presentismo ─────────────────────────────────────────

function leerPresentismo(): RegistroP[] {
  const seen = new Set<string>();
  const result: RegistroP[] = [];
  const keys = [
    'spi_sgc_spi_presentismo_v1',
    'spi_presentismo',
    'spi_sgc_presentismo',
  ];
  // también rastrear cualquier otra key del localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !keys.includes(k)) keys.push(k);
    }
  } catch { /**/ }

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw || !raw.startsWith('[')) continue;
      const arr = JSON.parse(raw) as RegistroP[];
      if (!Array.isArray(arr)) continue;
      for (const r of arr) {
        const estado = String(r.estado ?? '');
        if (!['Ausente', 'Tardanza', 'Presente'].includes(estado)) continue;
        const uid = String(r.id ?? r.timestamp ?? Math.random());
        if (seen.has(uid)) continue;
        seen.add(uid);
        result.push(r);
      }
    } catch { /**/ }
  }
  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNombre(r: RegistroP) {
  return (r.nombreApellido || r.nombre || 'Sin nombre').trim();
}

function getObjetivo(r: RegistroP) {
  return (r.objetivo || r.clienteObjetivo || 'Sin objetivo').trim();
}

function parseDate(r: RegistroP): Date {
  if (r.timestamp && r.timestamp > 0) return new Date(r.timestamp);
  if (r.fecha) {
    const m = r.fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  }
  return new Date(0);
}

function formatDate(d: Date) {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const MES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Componente ───────────────────────────────────────────────────────────────

interface CoberturaModalProps {
  onClose: () => void;
  onNavigatePresentismo: () => void;
}

const CoberturaModal: React.FC<CoberturaModalProps> = ({ onClose, onNavigatePresentismo }) => {
  const [search, setSearch]   = useState('');
  const [tab, setTab]         = useState<'personas'|'clientes'|'cronologia'>('personas');
  const [expandido, setExp]   = useState<string|null>(null);
  const [filtroMes, setFiltroMes] = useState<string>('todos');

  // Leer todos los registros
  const todos    = useMemo(() => leerPresentismo(), []);
  const ausentes = useMemo(() => todos.filter(r => r.estado === 'Ausente'), [todos]);
  const tardanzas= useMemo(() => todos.filter(r => r.estado === 'Tardanza'), [todos]);
  const problemas= useMemo(() => [...ausentes, ...tardanzas].sort((a,b) => parseDate(b).getTime() - parseDate(a).getTime()), [ausentes, tardanzas]);

  // Meses disponibles
  const mesesDisp = useMemo(() => {
    const set = new Set<string>();
    problemas.forEach(r => {
      const d = parseDate(r);
      if (d.getTime() > 0) set.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return Array.from(set).sort().reverse();
  }, [problemas]);

  // Filtrar por mes
  const filtrados = useMemo(() => {
    let base = problemas;
    if (filtroMes !== 'todos') {
      const [y, m] = filtroMes.split('-').map(Number);
      base = base.filter(r => { const d = parseDate(r); return d.getFullYear() === y && d.getMonth() === m; });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(r =>
        getNombre(r).toLowerCase().includes(q) ||
        getObjetivo(r).toLowerCase().includes(q) ||
        String(r.turno ?? '').toLowerCase().includes(q)
      );
    }
    return base;
  }, [problemas, filtroMes, search]);

  // ── Por Persona ──────────────────────────────────────────────────────────
  const porPersona = useMemo(() => {
    const map = new Map<string, { nombre: string; ausencias: RegistroP[]; tardanzas: RegistroP[]; objetivos: Set<string> }>();
    filtrados.forEach(r => {
      const nombre = getNombre(r);
      if (!map.has(nombre)) map.set(nombre, { nombre, ausencias: [], tardanzas: [], objetivos: new Set() });
      const entry = map.get(nombre)!;
      if (r.estado === 'Ausente')   entry.ausencias.push(r);
      if (r.estado === 'Tardanza')  entry.tardanzas.push(r);
      entry.objetivos.add(getObjetivo(r));
    });
    return Array.from(map.values()).sort((a,b) => (b.ausencias.length + b.tardanzas.length) - (a.ausencias.length + a.tardanzas.length));
  }, [filtrados]);

  // ── Por Cliente/Objetivo ─────────────────────────────────────────────────
  const porCliente = useMemo(() => {
    const map = new Map<string, { objetivo: string; ausencias: RegistroP[]; tardanzas: RegistroP[]; personas: Set<string>; turnos: Set<string> }>();
    filtrados.forEach(r => {
      const obj = getObjetivo(r);
      if (!map.has(obj)) map.set(obj, { objetivo: obj, ausencias: [], tardanzas: [], personas: new Set(), turnos: new Set() });
      const entry = map.get(obj)!;
      if (r.estado === 'Ausente')   entry.ausencias.push(r);
      if (r.estado === 'Tardanza')  entry.tardanzas.push(r);
      entry.personas.add(getNombre(r));
      entry.turnos.add(String(r.turno ?? '—'));
    });
    return Array.from(map.values()).sort((a,b) => (b.ausencias.length + b.tardanzas.length) - (a.ausencias.length + a.tardanzas.length));
  }, [filtrados]);

  const totalRegistros = todos.length;
  const tasaAus = totalRegistros > 0 ? ((ausentes.length / totalRegistros) * 100).toFixed(1) : '0.0';
  const tasaTard= totalRegistros > 0 ? ((tardanzas.length / totalRegistros) * 100).toFixed(1) : '0.0';

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-3xl my-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
            <Users size={16} className="text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white">Detalle de Cobertura — Ausencias y Tardanzas</h2>
            <p className="text-[10px] text-white/30 mt-0.5">Ene {new Date().getFullYear()} → {MES_ES[new Date().getMonth()]} {new Date().getFullYear()} · {totalRegistros} registros totales</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/8">
            <X size={16} />
          </button>
        </div>

        {/* ── KPI PILLS ── */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertOctagon size={11} className="text-red-400" />
            <span className="text-[11px] font-bold text-red-400">{ausentes.length} ausencias</span>
            <span className="text-[10px] text-red-400/60">({tasaAus}%)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Clock size={11} className="text-amber-400" />
            <span className="text-[11px] font-bold text-amber-400">{tardanzas.length} tardanzas</span>
            <span className="text-[10px] text-amber-400/60">({tasaTard}%)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Building2 size={11} className="text-violet-400" />
            <span className="text-[11px] font-bold text-violet-400">{porCliente.length} clientes afectados</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => { onClose(); onNavigatePresentismo(); }}
            className="text-[10px] text-white/40 hover:text-white/80 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors font-semibold"
          >
            Ir a Presentismo →
          </button>
        </div>

        {/* ── FILTROS ── */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3 flex-wrap">
          {/* Buscador */}
          <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-white/5 rounded-lg px-3 py-2 border border-white/8">
            <Search size={11} className="text-white/30 shrink-0" />
            <input
              type="text"
              placeholder="Buscar persona, objetivo, turno..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-[11px] text-white/70 placeholder:text-white/20 outline-none w-full"
            />
            {search && <button onClick={() => setSearch('')} className="text-white/20 hover:text-white/50"><X size={10} /></button>}
          </div>
          {/* Filtro mes */}
          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1.5 border border-white/8">
            <Calendar size={10} className="text-white/30" />
            <select
              value={filtroMes}
              onChange={e => setFiltroMes(e.target.value)}
              className="bg-transparent text-[11px] text-white/60 outline-none cursor-pointer"
            >
              <option value="todos">Todos los meses</option>
              {mesesDisp.map(mk => {
                const [y, m] = mk.split('-').map(Number);
                return <option key={mk} value={mk}>{MES_ES[m]} {y}</option>;
              })}
            </select>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-white/5 px-2">
          {([
            { k: 'personas',    l: `👤 Por Persona (${porPersona.length})` },
            { k: 'clientes',    l: `🏢 Por Cliente (${porCliente.length})` },
            { k: 'cronologia',  l: `📅 Cronología (${filtrados.length})` },
          ] as const).map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={cn(
                'px-4 py-2.5 text-[11px] font-medium transition-colors whitespace-nowrap',
                tab === t.k
                  ? 'text-white border-b-2 border-violet-400 -mb-px'
                  : 'text-white/35 hover:text-white/60'
              )}
            >{t.l}</button>
          ))}
        </div>

        <div className="max-h-[50vh] overflow-y-auto">

          {/* ── TAB PERSONAS ── */}
          {tab === 'personas' && (
            <div className="divide-y divide-white/5">
              {porPersona.length === 0 && (
                <div className="p-10 text-center text-white/25 text-sm">Sin registros para el filtro aplicado</div>
              )}
              {porPersona.map(p => {
                const total = p.ausencias.length + p.tardanzas.length;
                const isExp = expandido === p.nombre;
                const isCritico = p.ausencias.length >= 3;
                return (
                  <div key={p.nombre}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-6 py-3.5 cursor-pointer hover:bg-white/3 transition-colors',
                        isCritico && 'border-l-2 border-red-500/50'
                      )}
                      onClick={() => setExp(isExp ? null : p.nombre)}
                    >
                      {/* Avatar inicial */}
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        isCritico ? 'bg-red-500/20 text-red-400' : p.ausencias.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/15 text-amber-300'
                      )}>
                        {p.nombre.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[12px] font-semibold text-white/90 truncate">{p.nombre}</p>
                          {isCritico && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 font-bold">REINCIDENTE</span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/30 truncate mt-0.5">
                          {Array.from(p.objetivos).join(' · ')}
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {p.ausencias.length > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/12 border border-red-500/20 text-[10px] font-bold text-red-400">
                            <AlertOctagon size={9} /> {p.ausencias.length}A
                          </span>
                        )}
                        {p.tardanzas.length > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/12 border border-amber-500/20 text-[10px] font-bold text-amber-400">
                            <Clock size={9} /> {p.tardanzas.length}T
                          </span>
                        )}
                        <span className="text-[10px] text-white/20 font-mono">{total} total</span>
                        {isExp ? <ChevronUp size={12} className="text-white/25" /> : <ChevronDown size={12} className="text-white/20" />}
                      </div>
                    </div>

                    {/* Detalle expandido */}
                    {isExp && (
                      <div className="px-6 pb-4 bg-white/2 border-t border-white/5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {[...p.ausencias.map(r => ({...r, _t:'A'})), ...p.tardanzas.map(r => ({...r, _t:'T'}))]
                            .sort((a,b) => parseDate(b as RegistroP).getTime() - parseDate(a as RegistroP).getTime())
                            .map((r, i) => {
                              const isAus = (r as {_t:string})._t === 'A';
                              return (
                                <div key={i} className={cn(
                                  'flex items-start gap-2.5 p-2.5 rounded-lg border text-[10px]',
                                  isAus ? 'bg-red-500/5 border-red-500/15' : 'bg-amber-500/5 border-amber-500/15'
                                )}>
                                  <span className={cn('mt-0.5 font-bold', isAus ? 'text-red-400' : 'text-amber-400')}>
                                    {isAus ? 'AUS' : 'TAR'}
                                  </span>
                                  <div className="min-w-0">
                                    <p className={cn('font-semibold', isAus ? 'text-red-300/80' : 'text-amber-300/80')}>
                                      {formatDate(parseDate(r as RegistroP))}
                                    </p>
                                    <p className="text-white/40 truncate">{getObjetivo(r as RegistroP)}</p>
                                    <p className="text-white/25 truncate">{String((r as RegistroP).turno ?? '—')}</p>
                                    {(r as RegistroP).observaciones && (
                                      <p className="text-white/30 truncate italic mt-0.5">"{(r as RegistroP).observaciones}"</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TAB CLIENTES ── */}
          {tab === 'clientes' && (
            <div className="divide-y divide-white/5">
              {porCliente.length === 0 && (
                <div className="p-10 text-center text-white/25 text-sm">Sin registros para el filtro aplicado</div>
              )}
              {porCliente.map(c => {
                const total = c.ausencias.length + c.tardanzas.length;
                const isExp = expandido === c.objetivo;
                const isCritico = c.ausencias.length >= 3;
                const impacto = c.ausencias.length > 0 ? 'ALTO' : c.tardanzas.length >= 2 ? 'MEDIO' : 'BAJO';
                const impactoCls = impacto === 'ALTO' ? 'text-red-400 bg-red-500/10 border-red-500/20' : impacto === 'MEDIO' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                return (
                  <div key={c.objetivo}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-6 py-3.5 cursor-pointer hover:bg-white/3 transition-colors',
                        isCritico && 'border-l-2 border-red-500/50'
                      )}
                      onClick={() => setExp(isExp ? null : c.objetivo)}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        isCritico ? 'bg-red-500/15' : 'bg-violet-500/15'
                      )}>
                        <Building2 size={14} className={isCritico ? 'text-red-400' : 'text-violet-400'} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-white/90 truncate">{c.objetivo}</p>
                        <p className="text-[10px] text-white/30 mt-0.5 truncate">
                          {c.personas.size} persona{c.personas.size !== 1 ? 's' : ''} ·{' '}
                          {Array.from(c.turnos).filter(Boolean).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-bold', impactoCls)}>
                          {impacto}
                        </span>
                        {c.ausencias.length > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/12 border border-red-500/20 text-[10px] font-bold text-red-400">
                            <AlertOctagon size={9} /> {c.ausencias.length}A
                          </span>
                        )}
                        {c.tardanzas.length > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/12 border border-amber-500/20 text-[10px] font-bold text-amber-400">
                            <Clock size={9} /> {c.tardanzas.length}T
                          </span>
                        )}
                        {isExp ? <ChevronUp size={12} className="text-white/25" /> : <ChevronDown size={12} className="text-white/20" />}
                      </div>
                    </div>

                    {/* Detalle expandido del cliente */}
                    {isExp && (
                      <div className="px-6 pb-4 bg-white/2 border-t border-white/5">
                        {/* Personas involucradas */}
                        <div className="mt-3 mb-2">
                          <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <AlertTriangle size={9} /> Personal involucrado en este objetivo
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(c.personas).map(nombre => {
                              const ausP = c.ausencias.filter(r => getNombre(r) === nombre).length;
                              const tarP = c.tardanzas.filter(r => getNombre(r) === nombre).length;
                              return (
                                <div key={nombre} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 text-[10px]">
                                  <span className="font-medium text-white/70">{nombre}</span>
                                  {ausP > 0 && <span className="text-red-400 font-bold">{ausP}A</span>}
                                  {tarP > 0 && <span className="text-amber-400 font-bold">{tarP}T</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Fechas del cliente */}
                        <div className="mt-3">
                          <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Calendar size={9} /> Fechas registradas
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {[...c.ausencias.map(r => ({r, t:'A'})), ...c.tardanzas.map(r => ({r, t:'T'}))]
                              .sort((a,b) => parseDate(b.r).getTime() - parseDate(a.r).getTime())
                              .map(({r, t}, i) => (
                                <div key={i} className={cn(
                                  'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono',
                                  t === 'A' ? 'bg-red-500/8 border-red-500/15 text-red-300/70' : 'bg-amber-500/8 border-amber-500/15 text-amber-300/70'
                                )}>
                                  <span className="font-bold">{t === 'A' ? 'AUS' : 'TAR'}</span>
                                  <span>{formatDate(parseDate(r))}</span>
                                  <span className="text-white/25">· {getNombre(r).split(' ')[0]}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TAB CRONOLOGÍA ── */}
          {tab === 'cronologia' && (
            <div className="divide-y divide-white/5">
              {filtrados.length === 0 && (
                <div className="p-10 text-center text-white/25 text-sm">Sin registros para el filtro aplicado</div>
              )}
              {filtrados.map((r, i) => {
                const isAus = r.estado === 'Ausente';
                const d = parseDate(r);
                return (
                  <div key={String(r.id ?? i)} className={cn(
                    'flex items-center gap-4 px-6 py-3 hover:bg-white/3 transition-colors',
                    isAus && 'border-l-2 border-red-500/30'
                  )}>
                    {/* Fecha */}
                    <div className="text-center shrink-0 w-12">
                      <p className="text-[9px] text-white/25 uppercase">{d.getTime() > 0 ? MES_ES[d.getMonth()] : '—'}</p>
                      <p className="text-[14px] font-bold text-white/70 leading-none">{d.getTime() > 0 ? d.getDate() : '?'}</p>
                    </div>
                    {/* Badge */}
                    <span className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold shrink-0',
                      isAus ? 'bg-red-500/12 border-red-500/20 text-red-400' : 'bg-amber-500/12 border-amber-500/20 text-amber-400'
                    )}>
                      {isAus ? <AlertOctagon size={9} /> : <Clock size={9} />}
                      {isAus ? 'AUSENTE' : 'TARDANZA'}
                    </span>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-white/85 truncate">{getNombre(r)}</p>
                      <p className="text-[10px] text-white/35 truncate">{getObjetivo(r)} · {String(r.turno ?? '—')}</p>
                    </div>
                    {/* Hora */}
                    {r.horaIngreso && (
                      <p className="text-[10px] text-white/25 font-mono shrink-0">{r.horaIngreso}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="px-6 py-3 border-t border-white/8 flex items-center justify-between">
          <p className="text-[10px] text-white/20">
            {filtrados.length} registros mostrados de {problemas.length} totales con problemas
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 text-[11px] font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoberturaModal;
