import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  QrCode, Plus, X, Check, ChevronDown, AlertTriangle,
  AlertOctagon, ArrowRight, Shield, Clock,
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useAppHooks';

// ─── REAL DATA — Período Mar-Abr 2026 ────────────────────────────────────────

interface Servicio {
  id: string;
  codigo: string;
  vigilador: string;
  cliente: string;
  fecha: string;
  nc: number;
  calificacion: 'ACEPTABLE' | 'CRITICO' | 'OBSERVADO';
  riesgo: 'critico' | 'alto' | 'aceptable';
  nota?: string;
}

const SERVICIOS: Servicio[] = [
  { id: 's1', codigo: 'S1', vigilador: 'Rodríguez Luis', cliente: 'Gimenez', fecha: '14/03/2026', nc: 10, calificacion: 'ACEPTABLE', riesgo: 'aceptable', nota: 'Antigüedad: 2a 5m' },
  { id: 's2', codigo: 'S2', vigilador: 'Franco Fabio', cliente: 'Gimenez', fecha: '14/03/2026', nc: 12, calificacion: 'ACEPTABLE', riesgo: 'aceptable', nota: 'Antigüedad: 4m / 31a experiencia' },
  { id: 's3', codigo: 'S3', vigilador: 'Britos Daniel + T. Padilla', cliente: 'Gimenez', fecha: '14/03/2026', nc: 10, calificacion: 'ACEPTABLE', riesgo: 'aceptable' },
  { id: 's4', codigo: 'S4', vigilador: 'Martínez E. / Gamarra M. / Zelaya A.', cliente: 'La Bernaleza — Konig (Parque Industrial)', fecha: '18/03/2026', nc: 12, calificacion: 'ACEPTABLE', riesgo: 'alto' },
  { id: 's5', codigo: 'S5', vigilador: 'Sup: I. Torena', cliente: 'Konig', fecha: 'Mar–Abr 2026', nc: 11, calificacion: 'ACEPTABLE', riesgo: 'alto' },
  { id: 's6', codigo: 'S6', vigilador: 'Sup: W. Rodríguez', cliente: 'Racing Club Nogoya CABA', fecha: 'Mar–Abr 2026', nc: 14, calificacion: 'ACEPTABLE', riesgo: 'critico', nota: 'CCTV crítico' },
  { id: 's7', codigo: 'S7', vigilador: 'Sandoval Carlos', cliente: 'Depósito Logístico', fecha: 'Mar–Abr 2026', nc: 17, calificacion: 'ACEPTABLE', riesgo: 'critico', nota: '⚠ Mayor NC del período' },
];

interface Hallazgo {
  id: string;
  nivel: 'critico' | 'alto' | 'medio';
  texto: string;
  detalle?: string;
}

const HALLAZGOS: Hallazgo[] = [
  { id: 'h1', nivel: 'critico', texto: 'Novedades relevantes NO registradas en libro de guardia', detalle: 'Incluye robo de cables y corte de CCTV — múltiples servicios — pérdida total de trazabilidad' },
  { id: 'h2', nivel: 'critico', texto: 'CCTV Racing Club: 10+ cámaras fuera de servicio hace 4+ meses', detalle: 'Sin vigilancia visual activa. Incumplimiento crítico de seguridad. Acción: reparación urgente.' },
  { id: 'h3', nivel: 'critico', texto: 'Botón antipánico SIN RESPUESTA de Control 24', detalle: 'Inactivo en: Uruguay 720 | Espinosa 90 | T. Padilla Playon — Riesgo operativo máximo' },
  { id: 'h4', nivel: 'critico', texto: 'Sistema de rondas QR fuera de servicio al momento de auditoría', detalle: 'Imposible verificar cumplimiento real. Tasa QR global < 60%. Brecha Jotform: 18 días sin registros (26/02–15/03). En seguimiento desde 16/04/2026.' },
  { id: 'h5', nivel: 'alto', texto: 'Matafuegos ausentes en sectores con tableros eléctricos', detalle: 'Detectado en varios objetivos. Riesgo de incendio sin extintor certificado ABC 10kg.' },
  { id: 'h6', nivel: 'alto', texto: 'Jotform campo urgencia contradictorio — alertas automáticas inoperativas', detalle: '"Hay novedad" vs "Sin novedad" marcados simultáneamente. Guardias sin capacitación en uso correcto.' },
  { id: 'h7', nivel: 'medio', texto: 'Supervisor W. Rodríguez con sobrecarga operativa crítica', detalle: '10+ objetivos / 3 turnos vs Iván Torena: solo 3 objetivos. Redistribución urgente.' },
];

interface AccionCorrectiva {
  id: number;
  urgencia: 'urgente' | 'corto' | 'q2';
  descripcion: string;
  responsable: string;
  deadline: string;
}

const ACCIONES: AccionCorrectiva[] = [
  { id: 1, urgencia: 'urgente', descripcion: 'Documentar protocolo de escalada antipánico: Operador → Supervisión → Victor Gómez → Martín López', responsable: 'Victor Gómez', deadline: '30/04/2026' },
  { id: 2, urgencia: 'urgente', descripcion: 'Reparación CCTV Racing Club (10+ cámaras fuera de servicio 5+ meses)', responsable: 'Victor Gómez', deadline: '30/04/2026' },
  { id: 3, urgencia: 'urgente', descripcion: 'Estandarizar libro de guardia en todos los objetivos: tinta negra, formato novedad, campo supervisor', responsable: 'Torena + Rodríguez', deadline: '30/04/2026' },
  { id: 4, urgencia: 'corto', descripcion: 'Instalar matafuegos ABC 10kg en sectores con tableros eléctricos', responsable: 'Victor Gómez', deadline: '30/04/2026' },
  { id: 5, urgencia: 'corto', descripcion: 'Corregir campo urgencia Jotform + capacitar guardias en uso correcto del sistema', responsable: 'V. Gómez / Torena + Rodríguez', deadline: '30/04/2026' },
  { id: 6, urgencia: 'corto', descripcion: 'Implementar KPIs mensuales: % rondas completadas, % QR escaneados, tiempo respuesta, NC abiertas/cerradas', responsable: 'Victor Gómez', deadline: '30/04/2026' },
  { id: 7, urgencia: 'corto', descripcion: 'Redistribuir carga de trabajo entre supervisores o incorporar tercer supervisor', responsable: 'Victor Gómez', deadline: '30/04/2026' },
  { id: 8, urgencia: 'q2', descripcion: 'Desarrollar Programa SPI-Konig 3 sedes (Chivilcoy, Bernal, Avellaneda) con objetivos anuales', responsable: 'Victor Gómez', deadline: 'Q2 2026' },
  { id: 9, urgencia: 'q2', descripcion: 'Capacitación riesgo químico/farmacéutico sedes Konig — Q2 2026', responsable: 'Iván Torena', deadline: 'Q2 2026' },
  { id: 10, urgencia: 'q2', descripcion: 'Implementar metodología 5S en sectores críticos Konig Uruguay 720 y México 1060', responsable: 'Iván Torena', deadline: 'Q2 2026' },
];

const OBJETIVOS_RIESGO = {
  critico: ['Racing Club Nogoya CABA', 'Konig U720', 'Bunker HPCC', 'Espinosa 90'],
  alto: ['Tilcara 2731', 'T. Padilla', 'Etiqueta Negra'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getNcColor = (nc: number) => nc >= 15 ? '#ef4444' : nc >= 10 ? '#eab308' : '#22c55e';
const getRiesgoStyle = (r: Servicio['riesgo']) => ({
  critico: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: '🔴 Crítico' },
  alto: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: '🟠 Alto' },
  aceptable: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: '🟡 Aceptable' },
}[r]);

const hallazgoStyle = {
  critico: { icon: '🔴', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'CRÍTICO' },
  alto: { icon: '🟠', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'ALTO' },
  medio: { icon: '⚠️', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'MEDIO' },
};

const urgenciaStyle = {
  urgente: { label: 'URGENTE', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  corto: { label: 'ANTES 30/04', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  q2: { label: 'Q2 2026', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
};

const sedes = ['Racing Club', 'HPCC', 'Konig U720', 'Konig México', 'Depósito Logístico', 'Espinosa 90', 'Uruguay 720'];

interface LocalRonda {
  id: string;
  sede: string;
  vigilador: string;
  hora: string;
  fecha: string;
  resultado: string;
  obs: string;
}

// ─── Custom Bar label ─────────────────────────────────────────────────────────
interface BarLabelProps { x?: number; y?: number; width?: number; value?: number; }
const BarLabel: React.FC<BarLabelProps> = ({ x = 0, y = 0, width = 0, value }) => (
  <text x={x + width / 2} y={y - 4} fill="#ffffff80" textAnchor="middle" fontSize={11} fontWeight={600}>
    {value}
  </text>
);

// ─── COMPONENT ───────────────────────────────────────────────────────────────

interface RondasQRProps { searchQuery?: string; }

const RondasQR: React.FC<RondasQRProps> = ({ searchQuery = '' }) => {
  const [tab, setTab] = useState<'alertas' | 'servicios' | 'acciones'>('alertas');
  const [localRondas, setLocalRondas] = useLocalStorage<LocalRonda[]>('rondas_v2', []);
  const [showForm, setShowForm] = useState(false);
  const [showInline, setShowInline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedH, setExpandedH] = useState<string | null>(null);
  const [form, setForm] = useState({ sede: sedes[0], vigilador: '', hora: '', resultado: 'completa', obs: '' });

  const barData = SERVICIOS.map(s => ({ name: s.codigo, nc: s.nc, fill: getNcColor(s.nc) }));

  const filteredServicios = SERVICIOS.filter(s =>
    !searchQuery || [s.vigilador, s.cliente, s.codigo]
      .some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    const now = new Date();
    setLocalRondas(prev => {
      const updated = [...prev, {
        id: `r-${Date.now()}`,
        sede: form.sede,
        vigilador: form.vigilador,
        hora: form.hora || now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        fecha: now.toLocaleDateString('es-AR'),
        resultado: form.resultado,
        obs: form.obs,
      }];
      // Notify Dashboard in same tab (storage events don't fire for same-tab writes)
      // useLocalStorage() prefixes with 'spi_sgc_', so real key = 'spi_sgc_rondas_v2'
      try {
        window.dispatchEvent(new StorageEvent('storage', { key: 'spi_sgc_rondas_v2' }));
      } catch { /* ignore */ }
      return updated;
    });
    setShowForm(false);
    setShowInline(false);
    setForm({ sede: sedes[0], vigilador: '', hora: '', resultado: 'completa', obs: '' });
    setSaving(false);
  };

  const daysToDeadline = Math.ceil((new Date('2026-04-30').getTime() - Date.now()) / 86400000);

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <QrCode size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Control de Inspecciones y Rondas SPI 2026</h2>
            <p className="text-xs text-white/40">Plan Maestro SGI — Período Marzo–Abril 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInline(s => !s)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 text-xs transition-colors"
          >
            <Plus size={13} /> Ronda rápida
            <ChevronDown size={11} className={`transition-transform ${showInline ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
          >
            <Plus size={13} /> Registrar
          </button>
        </div>
      </div>

      {/* ── INLINE QUICK FORM ── */}
      {showInline && (
        <div className="bg-[#0d1117] rounded-xl border border-emerald-500/20 p-4 anim-card">
          <p className="text-xs text-emerald-400 font-bold mb-3 uppercase tracking-wider">⚡ Registro Rápido</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Objetivo / Sede</label>
              <select value={form.sede} onChange={e => setForm({ ...form, sede: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white">
                {sedes.map(s => <option key={s} value={s} className="bg-[#0d1117]">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Vigilador</label>
              <input value={form.vigilador} onChange={e => setForm({ ...form, vigilador: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-white/20" placeholder="Nombre" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Hora</label>
              <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Resultado</label>
              <select value={form.resultado} onChange={e => setForm({ ...form, resultado: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white">
                <option value="completa" className="bg-[#0d1117]">✅ Completa</option>
                <option value="parcial" className="bg-[#0d1117]">⚠️ Parcial</option>
                <option value="no_realizada" className="bg-[#0d1117]">🔴 No realizada</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <input value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20" placeholder="Observación..." />
            <button onClick={handleSave} disabled={saving || !form.vigilador} className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0">
              <Check size={11} /> {saving ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* ── MÉTRICAS PRINCIPALES ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#0d1117] rounded-xl border border-white/5 p-3.5 anim-card">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Servicios</p>
          <p className="text-2xl font-bold text-white mt-0.5">7 / 7</p>
          <p className="text-[10px] text-emerald-400 mt-0.5">100% auditados</p>
        </div>
        <div className="bg-amber-500/10 rounded-xl border border-amber-500/20 p-3.5 anim-card">
          <p className="text-[10px] text-amber-400 uppercase tracking-wider">NC Totales</p>
          <p className="text-2xl font-bold text-amber-400 mt-0.5">86</p>
          <p className="text-[10px] text-white/30 mt-0.5">Prom: 12.3 / servicio</p>
        </div>
        <div className="bg-red-500/10 rounded-xl border border-red-500/30 p-3.5 anim-card">
          <p className="text-[10px] text-red-400 uppercase tracking-wider">Tasa QR</p>
          <p className="text-2xl font-bold text-red-400 mt-0.5">&lt; 60%</p>
          <p className="text-[10px] text-white/30 mt-0.5">Sistema fuera de servicio</p>
        </div>
        <div className="bg-red-500/10 rounded-xl border border-red-500/30 p-3.5 anim-card">
          <p className="text-[10px] text-red-400 uppercase tracking-wider">Brecha Jotform</p>
          <p className="text-2xl font-bold text-red-400 mt-0.5">18 días</p>
          <p className="text-[10px] text-white/30 mt-0.5">26/02 – 15/03 sin registros</p>
        </div>
        <div className="bg-[#0d1117] rounded-xl border border-white/5 p-3.5 anim-card">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Deadline acciones</p>
          <p className={`text-2xl font-bold mt-0.5 ${daysToDeadline <= 10 ? 'text-red-400' : 'text-amber-400'}`}>{daysToDeadline}d</p>
          <p className="text-[10px] text-white/30 mt-0.5">30/04/2026</p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        {[
          { k: 'alertas', l: '🚨 Alertas & Hallazgos' },
          { k: 'servicios', l: '📋 Servicios Auditados' },
          { k: 'acciones', l: '✅ Acciones Correctivas' },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === t.k ? 'bg-emerald-700 text-white' : 'text-white/50 hover:text-white/70'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB: ALERTAS & HALLAZGOS
      ═══════════════════════════════════════════════════════════ */}
      {tab === 'alertas' && (
        <div className="space-y-4">
          {/* Panel alertas */}
          <div className="space-y-2">
            <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">Panel de riesgo — Hallazgos transversales</p>
            {HALLAZGOS.map(h => {
              const s = hallazgoStyle[h.nivel];
              const isExp = expandedH === h.id;
              return (
                <div
                  key={h.id}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${s.bg} ${s.border} anim-card`}
                  onClick={() => setExpandedH(isExp ? null : h.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-base shrink-0 mt-0.5">{s.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.bg} ${s.text} border ${s.border}`}>{s.badge}</span>
                          <p className={`text-sm font-semibold ${s.text}`}>{h.texto}</p>
                        </div>
                        {isExp && h.detalle && (
                          <p className="text-xs text-white/60 mt-2 leading-relaxed">{h.detalle}</p>
                        )}
                      </div>
                    </div>
                    <ChevronDown size={14} className={`text-white/20 shrink-0 mt-1 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Objetivos por nivel de riesgo */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-500/10 rounded-xl border border-red-500/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertOctagon size={14} className="text-red-400" />
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Riesgo Crítico 🔴 — Revisión Inmediata</p>
              </div>
              <div className="space-y-1.5">
                {OBJETIVOS_RIESGO.critico.map(o => (
                  <div key={o} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <span className="text-sm text-white/80">{o}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-red-300/60 mt-2.5">Umbral: &lt; 80% cumplimiento = revisión inmediata</p>
            </div>
            <div className="bg-orange-500/10 rounded-xl border border-orange-500/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-orange-400" />
                <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Riesgo Alto 🟠 — Seguimiento</p>
              </div>
              <div className="space-y-1.5">
                {OBJETIVOS_RIESGO.alto.map(o => (
                  <div key={o} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                    <span className="text-sm text-white/80">{o}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-orange-300/60 mt-2.5">Supervisión reforzada + seguimiento semanal</p>
            </div>
          </div>

          {/* Cadena de escalada */}
          <div className="bg-[#0d1117] rounded-xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} className="text-blue-400" />
              <p className="text-xs font-bold text-white uppercase tracking-wider">Cadena de Escalada — Protocolo Antipánico</p>
              <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">SIN DOCUMENTAR</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'Operador', sub: 'En guardia', color: 'bg-slate-500/20 border-slate-500/30 text-slate-300' },
                { label: 'W. Rodríguez', sub: 'Supervisión', color: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' },
                { label: 'I. Torena', sub: 'Supervisión', color: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' },
                { label: 'Victor Gómez', sub: 'Jefe Operaciones', color: 'bg-amber-500/20 border-amber-500/30 text-amber-300' },
                { label: 'Martín López', sub: 'Dirección', color: 'bg-red-500/20 border-red-500/30 text-red-300' },
              ].map((node, i, arr) => (
                <React.Fragment key={node.label}>
                  <div className={`px-3 py-2.5 rounded-xl border text-center min-w-[90px] ${node.color}`}>
                    <p className="text-xs font-bold leading-tight">{node.label}</p>
                    <p className="text-[9px] opacity-70 mt-0.5">{node.sub}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight size={16} className="text-white/20 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-[10px] text-white/30 mt-3">Acción pendiente: Victor Gómez debe documentar este protocolo — Deadline: 30/04/2026</p>
          </div>

          {/* Registros locales recientes */}
          {localRondas.length > 0 && (
            <div className="bg-[#0d1117] rounded-xl border border-emerald-500/10 p-4">
              <p className="text-xs text-emerald-400 font-semibold mb-3">📱 Rondas registradas localmente ({localRondas.length})</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {localRondas.slice().reverse().map(r => (
                  <div key={r.id} className="flex items-center gap-3 text-xs text-white/60 bg-white/3 rounded-lg px-3 py-2">
                    <span className="font-mono text-white/30">{r.hora}</span>
                    <span className="font-medium text-white/70">{r.sede}</span>
                    <span className="text-white/40">{r.vigilador}</span>
                    <span className={`ml-auto ${r.resultado === 'completa' ? 'text-emerald-400' : r.resultado === 'parcial' ? 'text-amber-400' : 'text-red-400'}`}>
                      {r.resultado === 'completa' ? '✅' : r.resultado === 'parcial' ? '⚠️' : '🔴'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: SERVICIOS AUDITADOS
      ═══════════════════════════════════════════════════════════ */}
      {tab === 'servicios' && (
        <div className="space-y-5">
          {/* Bar chart NC por servicio */}
          <div className="bg-[#0d1117] rounded-xl border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Distribución NC por Servicio — Mar/Abr 2026</p>
              <div className="flex items-center gap-3 text-[10px] text-white/30">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> &lt;10</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> 10–14</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> ≥15</span>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#ffffff60', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#ffffff40', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 20]} />
                  <Tooltip
                    contentStyle={{ background: '#0d1117', border: '1px solid #ffffff15', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [`${v} NC`, 'No Conformidades']}
                    cursor={{ fill: '#ffffff05' }}
                  />
                  <ReferenceLine y={10} stroke="#eab30850" strokeDasharray="4 3" />
                  <ReferenceLine y={15} stroke="#ef444450" strokeDasharray="4 3" />
                  <Bar dataKey="nc" radius={[6, 6, 0, 0]} label={<BarLabel />}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-[10px] text-white/30">
              <span>— — Umbral alerta (10 NC)</span>
              <span>— — Umbral crítico (15 NC)</span>
            </div>
          </div>

          {/* Tabla servicios */}
          <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <p className="text-sm font-semibold text-white">Servicios auditados — 7 / 7 (100%)</p>
              <p className="text-xs text-white/30 mt-0.5">Clientes: Gimenez ×4 | Konig / La Bernaleza ×2 | Racing Club Nogoya CABA ×1</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Cód.</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Vigilador / Personal</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Fecha</th>
                    <th className="text-center px-4 py-3 text-xs text-white/40 font-medium">NC</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Semáforo NC</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Riesgo</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Calif.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredServicios.map(s => {
                    const rStyle = getRiesgoStyle(s.riesgo);
                    const ncColor = getNcColor(s.nc);
                    const ncLabel = s.nc >= 15 ? '🔴 Crítico' : s.nc >= 10 ? '🟡 Alerta' : '🟢 Normal';
                    const isCritico = s.riesgo === 'critico';
                    return (
                      <tr key={s.id} className={`transition-colors hover:bg-white/2 ${isCritico ? 'border-l-2 border-red-500/40' : ''}`}>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{s.codigo}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white font-medium leading-tight">{s.vigilador}</p>
                          {s.nota && <p className="text-[10px] text-white/30 mt-0.5">{s.nota}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-white/60">{s.cliente}</td>
                        <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">{s.fecha}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-base font-bold" style={{ color: ncColor }}>{s.nc}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min((s.nc / 20) * 100, 100)}%`, backgroundColor: ncColor }} />
                            </div>
                            <span className="text-xs" style={{ color: ncColor }}>{ncLabel}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full border ${rStyle.bg} ${rStyle.border} ${rStyle.text}`}>{rStyle.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">{s.calificacion}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-white/5 bg-white/2">
              <p className="text-xs text-white/30">Calificación general: <span className="text-amber-400 font-semibold">ACEPTABLE</span> — Todos dentro del umbral mínimo. Peor servicio: S7 Sandoval Carlos / Depósito Logístico (17 NC) — Auditoría Mar–Abr 2026</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: ACCIONES CORRECTIVAS
      ═══════════════════════════════════════════════════════════ */}
      {tab === 'acciones' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30">
            <Clock size={14} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">
              <span className="font-bold">{daysToDeadline} días</span> para el deadline global — 30/04/2026 — {ACCIONES.filter(a => a.urgencia !== 'q2').length} acciones pendientes
            </p>
          </div>

          {(['urgente', 'corto', 'q2'] as const).map(urgencia => {
            const items = ACCIONES.filter(a => a.urgencia === urgencia);
            const uStyle = urgenciaStyle[urgencia];
            const labels = { urgente: '🚨 URGENTE — Acción inmediata', corto: '📅 Corto plazo — antes del 30/04/2026', q2: '📌 Mediano plazo — Q2 2026' };
            return (
              <div key={urgencia} className="space-y-2">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest">{labels[urgencia]}</p>
                {items.map(a => (
                  <div key={a.id} className={`bg-[#0d1117] rounded-xl border p-4 flex items-start gap-4 anim-card ${urgencia === 'urgente' ? 'border-red-500/20' : 'border-white/5'}`}>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${uStyle.bg} ${uStyle.border} ${uStyle.text}`}>{a.id}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-snug">{a.descripcion}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-white/40">👤 <span className="text-white/60">{a.responsable}</span></span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${uStyle.bg} ${uStyle.border} ${uStyle.text}`}>{uStyle.label}</span>
                        <span className="text-xs text-white/30">📅 {a.deadline}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL FORM ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Registrar Ronda / Inspección</h3>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Objetivo / Sede</label>
                <select value={form.sede} onChange={e => setForm({ ...form, sede: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  {sedes.map(s => <option key={s} value={s} className="bg-[#0d1117]">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Vigilador / Personal</label>
                <input value={form.vigilador} onChange={e => setForm({ ...form, vigilador: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20" placeholder="Nombre" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Hora</label>
                  <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Resultado</label>
                  <select value={form.resultado} onChange={e => setForm({ ...form, resultado: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="completa" className="bg-[#0d1117]">✅ Completa</option>
                    <option value="parcial" className="bg-[#0d1117]">⚠️ Parcial</option>
                    <option value="no_realizada" className="bg-[#0d1117]">🔴 No realizada</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Observaciones</label>
                <textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none" rows={2} placeholder="Novedades, hallazgos, incidentes..." />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.vigilador} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                {saving ? 'Guardando...' : <><Check size={14} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RondasQR;
