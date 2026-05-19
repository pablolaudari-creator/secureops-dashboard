import React, { useEffect, useState } from 'react';
import { GraduationCap, Plus, X, Check } from 'lucide-react';

interface Cap {
  id: string;
  titulo: string;
  modulo: string;
  descripcion: string;
  instructor: string;
  estado: 'planificado' | 'en_curso' | 'completado' | 'cancelado';
  participantes: number;
  aprobados: number;
  sede: string;
}

const estadoConfig = {
  planificado: { label: '📋 Planificado', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
  en_curso: { label: '🔄 En Curso', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  completado: { label: '✅ Completado', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  cancelado: { label: '❌ Cancelado', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
};

const sedes = ['Todas las sedes', 'Racing Club', 'HPCC', 'Konig', 'ATILRA', 'Avellaneda', 'Supervisores'];

const Capacitaciones: React.FC = () => {
  const [caps, setCaps] = useState<Cap[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterEstado, setFilterEstado] = useState('all');
  const [form, setForm] = useState({
    modulo: '', descripcion: '', instructor: '', estado: 'planificado', participantes: 0, sede: sedes[0],
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/taskade/projects/MpWxE1PpWjLk74dm/nodes');
      const data = await res.json();
      if (data.ok && data.payload?.nodes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: Cap[] = (data.payload.nodes as Record<string, any>[])
          .filter((n) => n.fieldValues['/text'])
          .map((n) => ({
            id: n.id,
            titulo: n.fieldValues['/text'] || '',
            modulo: n.fieldValues['/attributes/@cap01'] || '',
            descripcion: n.fieldValues['/attributes/@cap02'] || '',
            instructor: n.fieldValues['/attributes/@cap03'] || '',
            estado: n.fieldValues['/attributes/@cap04'] || 'planificado',
            participantes: n.fieldValues['/attributes/@cap07'] || 0,
            aprobados: n.fieldValues['/attributes/@cap08'] || 0,
            sede: n.fieldValues['/attributes/@cap09'] || '',
          }));
        setCaps(parsed);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/taskade/projects/MpWxE1PpWjLk74dm/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '/text': `${form.modulo} — ${form.descripcion.slice(0, 40)}`,
          '/attributes/@cap01': form.modulo,
          '/attributes/@cap02': form.descripcion,
          '/attributes/@cap03': form.instructor,
          '/attributes/@cap04': form.estado,
          '/attributes/@cap07': form.participantes,
          '/attributes/@cap09': form.sede,
        }),
      });
      setShowForm(false);
      setForm({ modulo: '', descripcion: '', instructor: '', estado: 'planificado', participantes: 0, sede: sedes[0] });
      await fetchData();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const filtered = filterEstado === 'all' ? caps : caps.filter(c => c.estado === filterEstado);
  const completados = caps.filter(c => c.estado === 'completado').length;
  const enCurso = caps.filter(c => c.estado === 'en_curso').length;
  const planificados = caps.filter(c => c.estado === 'planificado').length;
  const pctAvance = caps.length > 0 ? Math.round((completados / caps.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <GraduationCap size={18} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Plan Capacitaciones 2026</h2>
            <p className="text-xs text-white/40">Módulos por estado — avance del programa anual</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Agregar Módulo
        </button>
      </div>

      {/* Progress overview */}
      <div className="bg-[#0d1117] rounded-xl border border-white/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Avance del Programa 2026</h3>
          <span className="text-sm font-bold text-cyan-400">{pctAvance}% completado</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 rounded-full transition-all duration-700"
            style={{ width: `${pctAvance}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/30 mt-2">
          <span>{completados} completados</span>
          <span>{enCurso} en curso</span>
          <span>{planificados} planificados</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0d1117] rounded-xl border border-white/5 p-4">
          <p className="text-xs text-white/40">Total Módulos</p>
          <p className="text-3xl font-bold text-white mt-1">{caps.length}</p>
        </div>
        <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-4">
          <p className="text-xs text-emerald-400">✅ Completados</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{completados}</p>
        </div>
        <div className="bg-blue-500/10 rounded-xl border border-blue-500/20 p-4">
          <p className="text-xs text-blue-400">🔄 En Curso</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{enCurso}</p>
        </div>
        <div className="bg-indigo-500/10 rounded-xl border border-indigo-500/20 p-4">
          <p className="text-xs text-indigo-400">📋 Planificados</p>
          <p className="text-3xl font-bold text-indigo-400 mt-1">{planificados}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[{ k: 'all', l: 'Todos' }, { k: 'planificado', l: '📋 Planificados' }, { k: 'en_curso', l: '🔄 En Curso' }, { k: 'completado', l: '✅ Completados' }, { k: 'cancelado', l: '❌ Cancelados' }].map(f => (
          <button
            key={f.k}
            onClick={() => setFilterEstado(f.k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterEstado === f.k ? 'bg-cyan-700 text-white' : 'bg-white/5 text-white/50 hover:text-white/70'}`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* Modules list */}
      {loading ? (
        <div className="text-center text-white/30 py-12 text-sm">Cargando módulos...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(cap => {
            const ec = estadoConfig[cap.estado] || estadoConfig.planificado;
            const hasParticipantes = cap.participantes > 0;
            const hasAprobados = cap.aprobados > 0;
            return (
              <div key={cap.id} className="bg-[#0d1117] rounded-xl border border-white/5 p-5 hover:border-white/10 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    {cap.modulo && <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">{cap.modulo}</span>}
                    <p className="text-sm font-semibold text-white mt-2 leading-snug">{cap.titulo}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${ec.bg} ${ec.border} ${ec.text}`}>{ec.label}</span>
                </div>
                {cap.descripcion && <p className="text-xs text-white/40 leading-relaxed mb-3">{cap.descripcion}</p>}
                <div className="flex items-center justify-between text-xs text-white/30 pt-3 border-t border-white/5 flex-wrap gap-2">
                  {cap.instructor && <span>👤 {cap.instructor}</span>}
                  {cap.sede && <span>📍 {cap.sede}</span>}
                  {hasParticipantes && <span>👥 {cap.participantes} participantes</span>}
                  {hasAprobados && <span className="text-emerald-400">{cap.aprobados}% aprobados</span>}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center text-white/30 py-12 text-sm">No hay módulos en este estado.</div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Agregar Módulo de Capacitación</h3>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Módulo (ej: Módulo 7)</label>
                  <input value={form.modulo} onChange={e => setForm({ ...form, modulo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20" placeholder="Módulo X" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Estado</label>
                  <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="planificado" className="bg-[#0d1117]">📋 Planificado</option>
                    <option value="en_curso" className="bg-[#0d1117]">🔄 En Curso</option>
                    <option value="completado" className="bg-[#0d1117]">✅ Completado</option>
                    <option value="cancelado" className="bg-[#0d1117]">❌ Cancelado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none" rows={2} placeholder="Tema y contenido de la capacitación..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Instructor</label>
                  <input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20" placeholder="Nombre" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Participantes</label>
                  <input type="number" value={form.participantes} onChange={e => setForm({ ...form, participantes: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Sede</label>
                <select value={form.sede} onChange={e => setForm({ ...form, sede: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  {sedes.map(s => <option key={s} value={s} className="bg-[#0d1117]">{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.descripcion} className="flex-1 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                {saving ? 'Guardando...' : <><Check size={14} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Capacitaciones;
