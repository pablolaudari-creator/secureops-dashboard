import React, { useState } from 'react';
import { AlertTriangle, Plus, X, Check, Clock, ChevronRight, BookOpen } from 'lucide-react';
import { useLocalStorage } from '../hooks/useAppHooks';

interface NC {
  id: string;
  codigo: string;
  clausula: string;
  area: string;
  titulo: string;
  hallazgo: string;
  responsable: string;
  auditor: string;
  deadline: string;
  estado: 'abierta' | 'en_curso' | 'cerrada' | 'verificada';
  acciones: string[];
  accionesCerradas: number;
  tipo: 'real' | 'potencial' | 'observacion';
  sede: string;
}

interface RevisionSGC {
  id: number;
  titulo: string;
  clausula: string;
  estado: 'sin_iniciar' | 'en_curso' | 'no_empezado' | 'sin_estado';
  prioridad?: 'alta' | 'media' | 'baja';
}

const REAL_NC_DATA: NC[] = [
  {
    id: 'nc-001',
    codigo: 'NC-001',
    clausula: 'ISO 6.2.1 b)',
    area: 'Gestión',
    titulo: 'Objetivos de calidad sin metas ni medición por proceso',
    hallazgo: 'No se evidenciaron objetivos de calidad con metas e indicadores medibles por proceso (tiempo de respuesta alarmas, % cumplimiento rondas, rotación personal)',
    responsable: 'María I. Torres',
    auditor: 'ENG',
    deadline: '30/04/2026',
    estado: 'abierta',
    tipo: 'real',
    acciones: [
      'Registrar evidencia de cumplimiento de objetivos por proceso',
      'Actualizar matriz de procesos con KPIs medibles',
      'Definir KPIs por proceso',
    ],
    accionesCerradas: 0,
    sede: 'Todas las sedes',
  },
  {
    id: 'nc-002',
    codigo: 'NC-002',
    clausula: 'ISO 9.3.3 a) b) c)',
    area: 'Gestión/Dirección',
    titulo: 'Revisión por la Dirección sin conclusiones documentadas',
    hallazgo: 'Sin evidencia de que el informe de revisión por la dirección contenga conclusiones sobre recursos, revisiones anteriores y riesgos altos',
    responsable: 'María I. Torres',
    auditor: 'ENG',
    deadline: '30/04/2026',
    estado: 'abierta',
    tipo: 'real',
    acciones: [
      'Emitir informe Revisión Dirección con conclusiones cláusula 9.3.3',
      'Actualizar formato informe para incluir conclusiones obligatorias',
    ],
    accionesCerradas: 0,
    sede: 'Todas las sedes',
  },
  {
    id: 'nc-003',
    codigo: 'NC-003',
    clausula: 'ISO 8.4.2 b)',
    area: 'Compras',
    titulo: 'Evaluación de proveedores incompleta (2 de 11 evaluados)',
    hallazgo: 'De 11 proveedores activos, solo 2 tienen evaluación completa conforme ADM-PRO-001. 9 proveedores sin evaluación formal.',
    responsable: 'María I. Torres',
    auditor: 'ENG',
    deadline: '30/04/2026',
    estado: 'abierta',
    tipo: 'real',
    acciones: [
      'Registrar evaluación de 9 proveedores faltantes conforme ADM-PRO-001',
      'Verificar 100% evaluados antes de 2ª auditoría',
    ],
    accionesCerradas: 0,
    sede: 'Todas las sedes',
  },
  {
    id: 'nc-004',
    codigo: 'NC-004',
    clausula: 'ISO 9.2.1 b)',
    area: 'Gestión/Auditores',
    titulo: 'Auditorías internas no planificadas en procesos clave',
    hallazgo: 'Sin evidencia de planificación ni ejecución de auditorías internas en: dirección, SGC y servicios nuevos',
    responsable: 'María I. Torres',
    auditor: 'ENG',
    deadline: '30/04/2026',
    estado: 'abierta',
    tipo: 'real',
    acciones: [
      'Elaborar programa anual de auditorías internas con cronograma para todos los procesos clave',
      'Ejecutar auditoría interna SGC y servicios nuevos',
      'Generar informe con hallazgos',
    ],
    accionesCerradas: 0,
    sede: 'Todas las sedes',
  },
];

const REVISIONES_SGC: RevisionSGC[] = [
  { id: 1, titulo: 'Revisión por la Dirección', clausula: '9.3 (13 requisitos ISO 9001:2015)', estado: 'sin_iniciar', prioridad: 'alta' },
  { id: 2, titulo: 'Revisión de Objetivos SMART', clausula: 'documentación pendiente', estado: 'sin_estado' },
  { id: 3, titulo: 'Revisión última auditoría interna — cierre NC y observaciones', clausula: '9.2', estado: 'sin_iniciar', prioridad: 'alta' },
  { id: 4, titulo: 'Contraste Revisión por la Dirección 2023-24 vs 2025', clausula: '9.3', estado: 'sin_estado' },
  { id: 5, titulo: 'Fijar objetivos de calidad SMART', clausula: '6.2', estado: 'en_curso' },
  { id: 6, titulo: 'Revisión sistema actual y documentación completa', clausula: '4.4 / 7.5', estado: 'en_curso' },
  { id: 7, titulo: 'Planificación auditoría interna (cronograma + designación auditores)', clausula: '9.2.1', estado: 'no_empezado' },
  { id: 8, titulo: 'Ejecución auditoría interna (procedimientos + hallazgos)', clausula: '9.2.2', estado: 'no_empezado' },
  { id: 9, titulo: 'Gestión de incidentes — implementación acciones preventivas en curso', clausula: '10.2', estado: 'en_curso' },
  { id: 10, titulo: 'Revisión desempeño proveedores externos', clausula: '8.4', estado: 'sin_iniciar' },
];

const estadoConfig = {
  abierta: { label: '🔴 Abierta', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
  en_curso: { label: '🟡 En Curso', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  cerrada: { label: '🟢 Cerrada', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  verificada: { label: '✅ Verificada', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
};

const revEstadoConfig = {
  sin_iniciar: { label: 'SIN INICIAR', bg: 'bg-red-500/10', text: 'text-red-400' },
  en_curso: { label: 'EN CURSO', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  no_empezado: { label: 'NO EMPEZADO', bg: 'bg-slate-500/10', text: 'text-slate-400' },
  sin_estado: { label: 'SIN ESTADO', bg: 'bg-white/5', text: 'text-white/40' },
};

interface NoConformidadesProps {
  searchQuery?: string;
}

const NoConformidades: React.FC<NoConformidadesProps> = ({ searchQuery = '' }) => {
  const [tab, setTab] = useState<'nc' | 'revisiones'>('nc');
  const [extraNCs, setExtraNCs] = useLocalStorage<NC[]>('ncs_extra', []);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterEstado, setFilterEstado] = useState('all');
  const [expandedNc, setExpandedNc] = useState<string | null>(null);
  const [form, setForm] = useState({
    codigo: '', clausula: '', area: 'Gestión', titulo: '', hallazgo: '',
    responsable: '', deadline: '30/04/2026', tipo: 'real', accion1: '',
  });

  const allNCs = [...REAL_NC_DATA, ...extraNCs];

  const filtered = allNCs
    .filter(nc => filterEstado === 'all' || nc.estado === filterEstado)
    .filter(nc => !searchQuery || [nc.titulo, nc.hallazgo, nc.responsable, nc.codigo, nc.clausula, nc.area]
      .some(f => f.toLowerCase().includes(searchQuery.toLowerCase())));

  const abiertas = allNCs.filter(n => n.estado === 'abierta').length;
  const enCurso = allNCs.filter(n => n.estado === 'en_curso').length;
  const cerradas = allNCs.filter(n => n.estado === 'cerrada' || n.estado === 'verificada').length;
  const daysToAudit = Math.ceil((new Date('2026-04-30').getTime() - Date.now()) / 86400000);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const nextNum = allNCs.length + 1;
    const newNC: NC = {
      id: `nc-extra-${Date.now()}`,
      codigo: form.codigo || `NC-${String(nextNum).padStart(3, '0')}`,
      clausula: form.clausula,
      area: form.area,
      titulo: form.titulo,
      hallazgo: form.hallazgo,
      responsable: form.responsable,
      auditor: 'SGC',
      deadline: form.deadline,
      estado: 'abierta',
      tipo: form.tipo as 'real' | 'potencial' | 'observacion',
      acciones: form.accion1 ? [form.accion1] : [],
      accionesCerradas: 0,
      sede: 'A definir',
    };
    setExtraNCs(prev => [...prev, newNC]);
    setShowForm(false);
    setForm({ codigo: '', clausula: '', area: 'Gestión', titulo: '', hallazgo: '', responsable: '', deadline: '30/04/2026', tipo: 'real', accion1: '' });
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">No Conformidades — Auditoría 07/01/2026</h2>
            <p className="text-xs text-white/40">Coord. evidencias: Inés Torres | Operativo: Víctor Gómez | Revisión final: María I. Torres</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Nueva NC
        </button>
      </div>

      {/* Deadline Alert */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30">
        <Clock size={16} className="text-red-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-red-400">⚠ 2ª Auditoría Seguimiento: 30/04/2026 — {daysToAudit} días | 0/4 NC cerradas</p>
          <p className="text-xs text-white/40 mt-0.5">Paquete de evidencias: preparar 15/04 – 28/04/2026 | Auditor: ENG</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('nc')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'nc' ? 'bg-amber-600 text-white' : 'text-white/50 hover:text-white/70'}`}
        >
          <AlertTriangle size={14} /> No Conformidades ({allNCs.length})
        </button>
        <button
          onClick={() => setTab('revisiones')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'revisiones' ? 'bg-blue-600 text-white' : 'text-white/50 hover:text-white/70'}`}
        >
          <BookOpen size={14} /> Revisiones SGC ({REVISIONES_SGC.length})
        </button>
      </div>

      {tab === 'nc' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#0d1117] rounded-xl border border-white/5 p-3.5 text-center">
              <p className="text-xs text-white/40">Total</p>
              <p className="text-2xl font-bold text-white mt-0.5">{allNCs.length}</p>
            </div>
            <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-3.5 text-center">
              <p className="text-xs text-red-400">🔴 Abiertas</p>
              <p className="text-2xl font-bold text-red-400 mt-0.5">{abiertas}</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl border border-amber-500/20 p-3.5 text-center">
              <p className="text-xs text-amber-400">🟡 En Curso</p>
              <p className="text-2xl font-bold text-amber-400 mt-0.5">{enCurso}</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-3.5 text-center">
              <p className="text-xs text-emerald-400">✅ Cerradas</p>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{cerradas}</p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {[{ k: 'all', l: 'Todas' }, { k: 'abierta', l: '🔴 Abiertas' }, { k: 'en_curso', l: '🟡 En Curso' }, { k: 'cerrada', l: '🟢 Cerradas' }].map(f => (
              <button
                key={f.k}
                onClick={() => setFilterEstado(f.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterEstado === f.k ? 'bg-amber-600 text-white' : 'bg-white/5 text-white/50 hover:text-white/70'}`}
              >
                {f.l}
              </button>
            ))}
          </div>

          {/* NC Cards */}
          <div className="space-y-3">
            {filtered.map(nc => {
              const ec = estadoConfig[nc.estado] ?? estadoConfig.abierta;
              const isExpanded = expandedNc === nc.id;
              const totalAcciones = nc.acciones.length;
              const pctAcciones = totalAcciones > 0 ? Math.round((nc.accionesCerradas / totalAcciones) * 100) : 0;

              return (
                <div
                  key={nc.id}
                  className={`bg-[#0d1117] rounded-xl border p-5 transition-all ${nc.estado === 'abierta' ? 'border-red-500/20' : 'border-white/5'}`}
                >
                  <div
                    className="flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedNc(isExpanded ? null : nc.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{nc.codigo}</span>
                        <span className="text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded font-mono">{nc.clausula}</span>
                        <span className="text-xs text-white/40">{nc.area}</span>
                      </div>
                      <p className="text-sm font-semibold text-white leading-snug">{nc.titulo}</p>

                      {/* Progress bar acciones */}
                      {totalAcciones > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-32">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pctAcciones}%` }} />
                          </div>
                          <span className="text-[10px] text-white/30">{nc.accionesCerradas}/{totalAcciones} acciones</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${ec.bg} ${ec.border} ${ec.text}`}>{ec.label}</span>
                      <div className="flex items-center gap-1 text-xs text-white/30">
                        <Clock size={10} />
                        <span>{nc.deadline}</span>
                      </div>
                      <ChevronRight size={14} className={`text-white/20 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Hallazgo</p>
                        <p className="text-xs text-white/60 leading-relaxed">{nc.hallazgo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Acciones Correctivas ({nc.accionesCerradas}/{totalAcciones} cerradas)</p>
                        <div className="space-y-1.5">
                          {nc.acciones.map((a, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-white/60 bg-white/3 rounded-lg px-3 py-2">
                              <span className="text-white/20 shrink-0 mt-0.5">{i + 1}.</span>
                              <span className="leading-snug">{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/30 flex-wrap">
                        <span>👤 Resp: <span className="text-white/50">{nc.responsable}</span></span>
                        <span>🔍 Auditor: <span className="text-white/50">{nc.auditor}</span></span>
                        <span>📅 Deadline: <span className="text-amber-400">{nc.deadline}</span></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center text-white/20 py-10 text-sm">
                {searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay NC en este estado.'}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'revisiones' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/50">10 revisiones SGC identificadas para 2ª auditoría</p>
            <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              {REVISIONES_SGC.filter(r => r.estado === 'sin_iniciar' || r.estado === 'no_empezado').length} sin iniciar
            </span>
          </div>
          {REVISIONES_SGC.map(rev => {
            const ec = revEstadoConfig[rev.estado];
            return (
              <div key={rev.id} className="bg-[#0d1117] rounded-xl border border-white/5 p-4 flex items-center gap-4 hover:border-white/10 transition-colors">
                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/30 shrink-0">
                  {rev.id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white leading-snug">{rev.titulo}</p>
                  <p className="text-xs text-white/30 mt-0.5">Cláusula {rev.clausula}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {rev.prioridad === 'alta' && (
                    <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold">Alta</span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full ${ec.bg} ${ec.text} font-medium`}>{ec.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW NC FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Registrar No Conformidad</h3>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Código</label>
                  <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20" placeholder="NC-XXX" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Cláusula ISO</label>
                  <input value={form.clausula} onChange={e => setForm({ ...form, clausula: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20" placeholder="ISO 6.2.1 b)" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Área</label>
                  <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {['Gestión', 'Dirección', 'Compras', 'Operaciones', 'Recursos Humanos'].map(a => <option key={a} value={a} className="bg-[#0d1117]">{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="real" className="bg-[#0d1117]">NC Real</option>
                    <option value="potencial" className="bg-[#0d1117]">NC Potencial</option>
                    <option value="observacion" className="bg-[#0d1117]">Observación</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Título / Descripción breve</label>
                <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20" placeholder="Descripción del hallazgo..." />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Hallazgo detallado</label>
                <textarea value={form.hallazgo} onChange={e => setForm({ ...form, hallazgo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none" rows={3} placeholder="Describir evidencia del hallazgo..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Responsable</label>
                  <input value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20" placeholder="Nombre" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Deadline</label>
                  <input value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="30/04/2026" />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Acción Correctiva Principal</label>
                <textarea value={form.accion1} onChange={e => setForm({ ...form, accion1: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none" rows={2} placeholder="Acción correctiva propuesta..." />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.titulo}
                className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? 'Guardando...' : <><Check size={14} /> Registrar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoConformidades;
