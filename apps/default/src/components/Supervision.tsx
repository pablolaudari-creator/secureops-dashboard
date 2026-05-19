import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, X, Check } from 'lucide-react';

interface Sup {
  id: string;
  titulo: string;
  supervisor: string;
  sede: string;
  tipo: 'rutina' | 'sorpresiva' | 'especial';
  resultado: 'conforme' | 'observacion' | 'noconforme';
  hallazgos: string;
  acciones: string;
  firma: string;
}

const resultadoConfig = {
  conforme: { label: '✅ Conforme', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  observacion: { label: '⚠️ Con Observación', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  noconforme: { label: '❌ No Conforme', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
};

const tipoConfig = {
  rutina: { label: 'Rutina', color: 'text-indigo-400' },
  sorpresiva: { label: 'Sorpresiva', color: 'text-orange-400' },
  especial: { label: 'Especial', color: 'text-violet-400' },
};

const supervisores = ['W. Rodríguez', 'I. Torena'];
const sedes = ['Racing Club', 'HPCC', 'Konig', 'ATILRA', 'Avellaneda'];

const Supervision: React.FC = () => {
  const [registros, setRegistros] = useState<Sup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterSup, setFilterSup] = useState('Todos');
  const [form, setForm] = useState({
    supervisor: supervisores[0], sede: sedes[0], tipo: 'rutina',
    resultado: 'conforme', hallazgos: '', acciones: '',
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/taskade/projects/byxXbb5F52MDMfSf/nodes');
      const data = await res.json();
      if (data.ok && data.payload?.nodes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: Sup[] = (data.payload.nodes as Record<string, any>[])
          .filter((n) => n.fieldValues['/text'])
          .map((n) => ({
            id: n.id,
            titulo: n.fieldValues['/text'] || '',
            supervisor: n.fieldValues['/attributes/@sup01'] || '',
            sede: n.fieldValues['/attributes/@sup02'] || '',
            tipo: n.fieldValues['/attributes/@sup04'] || 'rutina',
            resultado: n.fieldValues['/attributes/@sup05'] || 'conforme',
            hallazgos: n.fieldValues['/attributes/@sup06'] || '',
            acciones: n.fieldValues['/attributes/@sup07'] || '',
            firma: n.fieldValues['/attributes/@sup08'] || '',
          }));
        setRegistros(parsed);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/taskade/projects/byxXbb5F52MDMfSf/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '/text': `Supervisión ${form.sede} — ${form.supervisor}`,
          '/attributes/@sup01': form.supervisor,
          '/attributes/@sup02': form.sede,
          '/attributes/@sup04': form.tipo,
          '/attributes/@sup05': form.resultado,
          '/attributes/@sup06': form.hallazgos,
          '/attributes/@sup07': form.acciones,
          '/attributes/@sup08': form.supervisor,
        }),
      });
      setShowForm(false);
      setForm({ supervisor: supervisores[0], sede: sedes[0], tipo: 'rutina', resultado: 'conforme', hallazgos: '', acciones: '' });
      await fetchData();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const filtered = filterSup === 'Todos' ? registros : registros.filter(r => r.supervisor === filterSup);
  const conformes = registros.filter(r => r.resultado === 'conforme').length;
  const conObs = registros.filter(r => r.resultado === 'observacion').length;
  const noConformes = registros.filter(r => r.resultado === 'noconforme').length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <ClipboardCheck size={18} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Supervisión Operativa</h2>
            <p className="text-xs text-white/40">Registros de W. Rodríguez e I. Torena por sede</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Cargar Supervisión
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-4">
          <p className="text-xs text-emerald-400">✅ Conformes</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{conformes}</p>
        </div>
        <div className="bg-amber-500/10 rounded-xl border border-amber-500/20 p-4">
          <p className="text-xs text-amber-400">⚠️ Con Observación</p>
          <p className="text-3xl font-bold text-amber-400 mt-1">{conObs}</p>
        </div>
        <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-4">
          <p className="text-xs text-red-400">❌ No Conformes</p>
          <p className="text-3xl font-bold text-red-400 mt-1">{noConformes}</p>
        </div>
      </div>

      {/* Supervisor filter */}
      <div className="flex gap-2">
        {['Todos', ...supervisores].map(s => (
          <button
            key={s}
            onClick={() => setFilterSup(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterSup === s ? 'bg-indigo-700 text-white' : 'bg-white/5 text-white/50 hover:text-white/70'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Records */}
      {loading ? (
        <div className="text-center text-white/30 py-12 text-sm">Cargando registros...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const rc = resultadoConfig[r.resultado] || resultadoConfig.conforme;
            const tc = tipoConfig[r.tipo] || tipoConfig.rutina;
            return (
              <div key={r.id} className="bg-[#0d1117] rounded-xl border border-white/5 p-5 hover:border-white/10 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-indigo-400">{r.supervisor}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-sm text-white/70">{r.sede}</span>
                      <span className={`text-xs ${tc.color}`}>({tc.label})</span>
                    </div>
                    {r.hallazgos && r.hallazgos !== 'Sin hallazgos' && (
                      <div className="mt-2">
                        <p className="text-xs text-white/30 mb-0.5">Hallazgos</p>
                        <p className="text-xs text-white/60 leading-relaxed">{r.hallazgos}</p>
                      </div>
                    )}
                    {r.acciones && r.acciones !== 'N/A' && (
                      <div className="mt-2 p-2.5 rounded-lg bg-white/3 border border-white/5">
                        <p className="text-xs text-white/30 mb-0.5">Acciones a Tomar</p>
                        <p className="text-xs text-white/60">{r.acciones}</p>
                      </div>
                    )}
                    {r.firma && <p className="text-xs text-white/30 mt-2">Firma: <span className="text-white/50">{r.firma}</span></p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${rc.bg} ${rc.border} ${rc.text}`}>{rc.label}</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-white/30 py-12 text-sm">No hay registros de supervisión para este filtro.</div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Cargar Supervisión</h3>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Supervisor</label>
                  <select value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {supervisores.map(s => <option key={s} value={s} className="bg-[#0d1117]">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Sede</label>
                  <select value={form.sede} onChange={e => setForm({ ...form, sede: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {sedes.map(s => <option key={s} value={s} className="bg-[#0d1117]">{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="rutina" className="bg-[#0d1117]">Rutina</option>
                    <option value="sorpresiva" className="bg-[#0d1117]">Sorpresiva</option>
                    <option value="especial" className="bg-[#0d1117]">Especial</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Resultado</label>
                  <select value={form.resultado} onChange={e => setForm({ ...form, resultado: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="conforme" className="bg-[#0d1117]">✅ Conforme</option>
                    <option value="observacion" className="bg-[#0d1117]">⚠️ Con Observación</option>
                    <option value="noconforme" className="bg-[#0d1117]">❌ No Conforme</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Hallazgos</label>
                <textarea value={form.hallazgos} onChange={e => setForm({ ...form, hallazgos: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none" rows={2} placeholder="Describir hallazgos encontrados..." />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Acciones a Tomar</label>
                <textarea value={form.acciones} onChange={e => setForm({ ...form, acciones: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none" rows={2} placeholder="Acciones correctivas o preventivas..." />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                {saving ? 'Guardando...' : <><Check size={14} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Supervision;
