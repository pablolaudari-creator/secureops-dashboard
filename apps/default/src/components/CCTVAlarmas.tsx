import React, { useEffect, useState } from 'react';
import { Camera, Plus, X, Check, Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface Sede {
  id: string;
  nombre: string;
  camarasTotales: number;
  camarasOperativas: number;
  estadoCCTV: 'operativo' | 'parcial' | 'fuera';
  estadoAlarmas: 'activa' | 'alerta' | 'inactiva';
  tecnico: string;
  obs: string;
}

const cctvConfig = {
  operativo: { label: '🟢 Operativo', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  parcial: { label: '🟡 Parcial', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  fuera: { label: '🔴 Fuera de Servicio', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
};

const alarmaConfig = {
  activa: { label: '🟢 Activa', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  alerta: { label: '🟡 En Alerta', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  inactiva: { label: '🔴 Inactiva', bg: 'bg-red-500/10', text: 'text-red-400' },
};

const sedesDefault = ['Racing Club', 'HPCC', 'Konig', 'ATILRA', 'Avellaneda'];

const CCTVAlarmas: React.FC = () => {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: sedesDefault[0], camarasTotales: 12, camarasOperativas: 12,
    estadoCCTV: 'operativo', estadoAlarmas: 'activa', tecnico: '', obs: '',
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/taskade/projects/HJWcqZm7hNZ8bWAu/nodes');
      const data = await res.json();
      if (data.ok && data.payload?.nodes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: Sede[] = (data.payload.nodes as Record<string, any>[])
          .filter((n) => n.fieldValues['/text'])
          .map((n) => ({
            id: n.id,
            nombre: n.fieldValues['/attributes/@cctv01'] || n.fieldValues['/text'],
            camarasTotales: n.fieldValues['/attributes/@cctv02'] || 0,
            camarasOperativas: n.fieldValues['/attributes/@cctv03'] || 0,
            estadoCCTV: n.fieldValues['/attributes/@cctv04'] || 'fuera',
            estadoAlarmas: n.fieldValues['/attributes/@cctv05'] || 'inactiva',
            tecnico: n.fieldValues['/attributes/@cctv07'] || '',
            obs: n.fieldValues['/attributes/@cctv08'] || '',
          }));
        setSedes(parsed);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/taskade/projects/HJWcqZm7hNZ8bWAu/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '/text': form.nombre,
          '/attributes/@cctv01': form.nombre,
          '/attributes/@cctv02': form.camarasTotales,
          '/attributes/@cctv03': form.camarasOperativas,
          '/attributes/@cctv04': form.estadoCCTV,
          '/attributes/@cctv05': form.estadoAlarmas,
          '/attributes/@cctv07': form.tecnico,
          '/attributes/@cctv08': form.obs,
        }),
      });
      setShowForm(false);
      await fetchData();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const operativas = sedes.filter(s => s.estadoCCTV === 'operativo' && s.estadoAlarmas === 'activa').length;
  const conProblemas = sedes.filter(s => s.estadoCCTV !== 'operativo' || s.estadoAlarmas !== 'activa').length;
  const totalCams = sedes.reduce((a, s) => a + s.camarasTotales, 0);
  const totalOp = sedes.reduce((a, s) => a + s.camarasOperativas, 0);
  const pctCams = totalCams > 0 ? Math.round((totalOp / totalCams) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Camera size={18} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Control CCTV & Alarmas</h2>
            <p className="text-xs text-white/40">Estado por sede — Racing Club, HPCC, Konig, ATILRA, Avellaneda</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Actualizar Sede
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-4">
          <p className="text-xs text-emerald-400">Sedes OK</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{operativas}</p>
          <p className="text-xs text-white/30 mt-0.5">CCTV + Alarmas activas</p>
        </div>
        <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-4">
          <p className="text-xs text-red-400">Con Problemas</p>
          <p className="text-3xl font-bold text-red-400 mt-1">{conProblemas}</p>
          <p className="text-xs text-white/30 mt-0.5">requieren atención</p>
        </div>
        <div className="bg-[#0d1117] rounded-xl border border-white/5 p-4">
          <p className="text-xs text-white/40">Cámaras Totales</p>
          <p className="text-3xl font-bold text-white mt-1">{totalCams}</p>
          <p className="text-xs text-white/30 mt-0.5">instaladas</p>
        </div>
        <div className={`rounded-xl border p-4 ${pctCams >= 98 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <p className={`text-xs ${pctCams >= 98 ? 'text-emerald-400' : 'text-amber-400'}`}>Operatividad Cámaras</p>
          <p className={`text-3xl font-bold mt-1 ${pctCams >= 98 ? 'text-emerald-400' : 'text-amber-400'}`}>{pctCams}%</p>
          <p className="text-xs text-white/30 mt-0.5">{totalOp}/{totalCams} operativas</p>
        </div>
      </div>

      {/* Sede Cards */}
      {loading ? (
        <div className="text-center text-white/30 py-12 text-sm">Cargando sedes...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sedes.map(sede => {
            const cctv = cctvConfig[sede.estadoCCTV] || cctvConfig.fuera;
            const alarma = alarmaConfig[sede.estadoAlarmas] || alarmaConfig.inactiva;
            const camPct = sede.camarasTotales > 0 ? Math.round((sede.camarasOperativas / sede.camarasTotales) * 100) : 0;
            const hasIssue = sede.estadoCCTV !== 'operativo' || sede.estadoAlarmas !== 'activa';

            return (
              <div key={sede.id} className={`bg-[#0d1117] rounded-xl border p-5 transition-colors ${hasIssue ? 'border-amber-500/20' : 'border-white/5'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${cctv.dot} ${!hasIssue ? 'animate-pulse' : ''}`} />
                      <h3 className="text-base font-bold text-white">{sede.nombre}</h3>
                    </div>
                    {sede.tecnico && <p className="text-xs text-white/30 mt-0.5">{sede.tecnico}</p>}
                  </div>
                  {hasIssue ? <AlertCircle size={18} className="text-amber-400 shrink-0" /> : <Wifi size={18} className="text-emerald-400 shrink-0" />}
                </div>

                {/* Camera bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>Cámaras</span>
                    <span>{sede.camarasOperativas}/{sede.camarasTotales}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${camPct}%`, backgroundColor: camPct >= 98 ? '#22c55e' : camPct >= 80 ? '#eab308' : '#ef4444' }}
                    />
                  </div>
                  <p className="text-xs text-white/30 mt-1 text-right">{camPct}% operativas</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className={`px-2.5 py-2 rounded-lg text-center ${cctv.bg}`}>
                    <p className="text-[10px] text-white/40 mb-0.5">CCTV</p>
                    <p className={`text-xs font-medium ${cctv.text}`}>{cctv.label}</p>
                  </div>
                  <div className={`px-2.5 py-2 rounded-lg text-center ${alarma.bg}`}>
                    <p className="text-[10px] text-white/40 mb-0.5">Alarmas</p>
                    <p className={`text-xs font-medium ${alarma.text}`}>{alarma.label}</p>
                  </div>
                </div>

                {sede.obs && (
                  <p className="text-xs text-white/40 mt-3 pt-3 border-t border-white/5 leading-relaxed">{sede.obs}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Actualizar Estado de Sede</h3>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Sede</label>
                <select value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  {sedesDefault.map(s => <option key={s} value={s} className="bg-[#0d1117]">{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Cámaras Totales</label>
                  <input type="number" value={form.camarasTotales} onChange={e => setForm({ ...form, camarasTotales: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Cámaras Operativas</label>
                  <input type="number" value={form.camarasOperativas} onChange={e => setForm({ ...form, camarasOperativas: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Estado CCTV</label>
                  <select value={form.estadoCCTV} onChange={e => setForm({ ...form, estadoCCTV: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="operativo" className="bg-[#0d1117]">🟢 Operativo</option>
                    <option value="parcial" className="bg-[#0d1117]">🟡 Parcial</option>
                    <option value="fuera" className="bg-[#0d1117]">🔴 Fuera de Servicio</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Estado Alarmas</label>
                  <select value={form.estadoAlarmas} onChange={e => setForm({ ...form, estadoAlarmas: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="activa" className="bg-[#0d1117]">🟢 Activa</option>
                    <option value="alerta" className="bg-[#0d1117]">🟡 En Alerta</option>
                    <option value="inactiva" className="bg-[#0d1117]">🔴 Inactiva</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Técnico Responsable</label>
                <input value={form.tecnico} onChange={e => setForm({ ...form, tecnico: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20" placeholder="Nombre del técnico" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Observaciones</label>
                <textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none" rows={2} placeholder="Estado, fallas, acciones pendientes..." />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                {saving ? 'Guardando...' : <><Check size={14} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CCTVAlarmas;
