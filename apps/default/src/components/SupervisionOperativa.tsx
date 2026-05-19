import React, { useState } from 'react';
import {
  Shield, ChevronDown, Check, X, AlertTriangle,
  User, Building2, Clock, ClipboardList, Star,
  ChevronLeft, Save, CheckCircle2, Circle,
  MinusCircle, Mail,
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useAppHooks';
import { cn } from '../lib/utils';
import { getClientesObjetivos } from './ClientesObjetivos';

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoItem = 'cumple' | 'no_cumple' | 'no_aplica' | null;
type Satisfaccion = 'muy_satisfecho' | 'satisfecho' | 'con_observaciones' | 'insatisfecho' | null;

export interface NovedadOperativa {
  id: string;
  fecha: string;
  tipo: 'No Conformidad Operativa';
  origen: 'Supervisión Operativa';
  objetivo: string;
  supervisor: string;
  item: string;
  resultado: 'No cumple';
  estado: 'Abierta' | 'Cerrada';
  prioridad: 'Alta' | 'Media';
  timestamp: number;
}

export interface SupervisionRegistro {
  id: string;
  fecha: string;
  hora: string;
  supervisor: string;
  clienteObjetivo: string;
  direccion: string;
  turno: string;
  vigiladorNombre: string;
  legajo: string;
  enSuPuesto: string;
  uniformeReglamentario: string;
  libroGuardia: string;
  conocimientoPuesto: string;
  checklist: Record<string, EstadoItem>;
  rondasRealizadas: string;
  rondasProgramadas: string;
  qrEscaneados: string;
  puntaje: number;
  resultado: string;
  satisfaccionCliente: Satisfaccion;
  observaciones: string;
  timestamp: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SUPERVISORES = ['Martín López', 'Iván Torena', 'W. Rodríguez', 'Victor Gómez'];
const TURNOS = ['Mañana (07:00 – 15:00)', 'Tarde (15:00 – 23:00)', 'Noche (19:00 – 07:00)'];

const ITEMS_OBJETIVO: { key: string; label: string }[] = [
  { key: 'accesos', label: 'Accesos controlados' },
  { key: 'cctv', label: 'CCTV operativo' },
  { key: 'iluminacion', label: 'Iluminación adecuada' },
  { key: 'antipanico', label: 'Botón antipánico operativo' },
  { key: 'matafuegos', label: 'Matafuegos vigentes' },
  { key: 'señalizacion', label: 'Señalización de emergencia' },
  { key: 'equipamiento', label: 'Equipamiento de seguridad' },
  { key: 'libro_novedades', label: 'Libro de novedades al día' },
];

// Ítems que disparan prioridad Alta en novedades
const ITEMS_ALTA_PRIORIDAD = new Set(['cctv', 'antipanico', 'accesos']);

// Write novedades to spi_novedades (raw key, no prefix)
function appendNovedades(nuevas: NovedadOperativa[]): void {
  try {
    const raw = localStorage.getItem('spi_novedades');
    const prev: NovedadOperativa[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem('spi_novedades', JSON.stringify([...nuevas, ...prev]));
  } catch { /* ignore */ }
}

// Write simplified record to spi_supervisiones for Dashboard
function appendSpiSupervision(r: SupervisionRegistro): void {
  try {
    const raw = localStorage.getItem('spi_supervisiones');
    const prev = raw ? JSON.parse(raw) : [];
    prev.unshift({
      id: r.id,
      fecha: r.fecha,
      hora: r.hora,
      supervisor: r.supervisor,
      clienteObjetivo: r.clienteObjetivo,
      puntaje: r.puntaje,
      resultado: r.resultado,
      satisfaccionCliente: r.satisfaccionCliente,
      timestamp: r.timestamp,
    });
    localStorage.setItem('spi_supervisiones', JSON.stringify(prev));
    // También sincronizamos el key con prefijo que lee el Dashboard
    localStorage.setItem('spi_sgc_supervisiones', JSON.stringify(prev));
    window.dispatchEvent(new StorageEvent('storage', { key: 'spi_supervisiones' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'spi_sgc_supervisiones' }));
  } catch { /* ignore */ }
}

const QHSE_EMAIL_SUP = 'plaudari.qhse@spiseguridad.com.ar';
const CC_EMAILS_SUP = 'vgomez@spiseguridad.com.ar,itorres@spiseguridad.com.ar,wrodriguez@spiseguridad.com.ar,itorena@spiseguridad.com.ar';

function openQhseSupervisionMailto(r: SupervisionRegistro, itemsNoCumplen: string[]): void {
  const subject = encodeURIComponent(
    `[SPI] Supervisión Operativa — ${r.resultado} — ${r.clienteObjetivo} — ${r.fecha}`
  );
  const body = encodeURIComponent(
    `Supervisión realizada por ${r.supervisor} en ${r.clienteObjetivo} el ${r.fecha}.\n` +
    `Puntaje: ${r.puntaje}%\n` +
    `Resultado: ${r.resultado}\n` +
    `Turno: ${r.turno}\n\n` +
    `── DETALLE ────────────────────────────────\n` +
    `Vigilador: ${r.vigiladorNombre}${r.legajo ? ` (Leg. ${r.legajo})` : ''}\n` +
    `Dirección: ${r.direccion || '—'}\n` +
    `Hora: ${r.hora}\n\n` +
    (itemsNoCumplen.length > 0
      ? `❌ Ítems que no cumplen:\n${itemsNoCumplen.map(i => `  • ${i}`).join('\n')}\n\n`
      : '') +
    `Observaciones: ${r.observaciones || 'Sin observaciones'}\n\n` +
    (r.puntaje < 75 ? `⚠ ATENCIÓN — Resultado por debajo del umbral aceptable. Requiere acción correctiva.\n\n` : '') +
    `--\nSPI SecureOps Dashboard`
  );
  window.open(`mailto:${QHSE_EMAIL_SUP}?cc=${CC_EMAILS_SUP}&subject=${subject}&body=${body}`, '_blank');
}

const SATISFACCION_OPTS: { value: Satisfaccion; label: string; color: string }[] = [
  { value: 'muy_satisfecho', label: '😊 Muy satisfecho', color: 'emerald' },
  { value: 'satisfecho', label: '🙂 Satisfecho', color: 'sky' },
  { value: 'con_observaciones', label: '😐 Con observaciones', color: 'amber' },
  { value: 'insatisfecho', label: '😟 Insatisfecho', color: 'red' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcPuntaje(checklist: Record<string, EstadoItem>): { puntaje: number; resultado: string; color: string } {
  const aplicables = ITEMS_OBJETIVO.filter(i => checklist[i.key] !== 'no_aplica' && checklist[i.key] !== null);
  const cumple = aplicables.filter(i => checklist[i.key] === 'cumple').length;
  if (aplicables.length === 0) return { puntaje: 0, resultado: '—', color: 'white' };
  const pct = Math.round((cumple / aplicables.length) * 100);
  if (pct >= 90) return { puntaje: pct, resultado: 'EXCELENTE', color: 'emerald' };
  if (pct >= 75) return { puntaje: pct, resultado: 'SATISFACTORIO', color: 'sky' };
  if (pct >= 60) return { puntaje: pct, resultado: 'REGULAR', color: 'amber' };
  return { puntaje: pct, resultado: 'CRÍTICO', color: 'red' };
}

function nowStr() {
  const d = new Date();
  return {
    fecha: d.toLocaleDateString('es-AR'),
    hora: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-4 mt-6">
    <div className="text-white/40">{icon}</div>
    <p className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-bold">{title}</p>
    <div className="flex-1 h-px bg-white/5" />
  </div>
);

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}
const SelectField: React.FC<SelectFieldProps> = ({ label, value, options, onChange, placeholder }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-white/40 font-medium">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all pr-10"
      >
        <option value="" disabled className="bg-[#0f1218] text-white/40">{placeholder || 'Seleccionar...'}</option>
        {options.map(o => (
          <option key={o} value={o} className="bg-[#0f1218] text-white">{o}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
    </div>
  </div>
);

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}
const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-white/40 font-medium">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
    />
  </div>
);

interface SiNoProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}
const SiNo: React.FC<SiNoProps> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5">
    <span className="text-sm text-white/70 flex-1 pr-4">{label}</span>
    <div className="flex gap-2">
      {['SI', 'NO'].map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            'px-4 py-1.5 rounded-lg text-xs font-bold border transition-all',
            value === opt
              ? opt === 'SI'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/8'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

interface ChecklistRowProps {
  label: string;
  value: EstadoItem;
  onChange: (v: EstadoItem) => void;
}
const ChecklistRow: React.FC<ChecklistRowProps> = ({ label, value, onChange }) => {
  const opts: { val: EstadoItem; label: string; icon: React.ReactNode; active: string }[] = [
    { val: 'cumple', label: 'Cumple', icon: <Check size={12} />, active: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' },
    { val: 'no_cumple', label: 'No cumple', icon: <X size={12} />, active: 'bg-red-500/20 border-red-500/40 text-red-400' },
    { val: 'no_aplica', label: 'N/A', icon: <MinusCircle size={12} />, active: 'bg-white/10 border-white/20 text-white/50' },
  ];
  return (
    <div className="py-3 border-b border-white/5">
      <p className="text-sm text-white/70 mb-2">{label}</p>
      <div className="flex gap-2">
        {opts.map(o => (
          <button
            key={o.val}
            onClick={() => onChange(value === o.val ? null : o.val)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
              value === o.val ? o.active : 'bg-white/5 border-white/8 text-white/25 hover:bg-white/8'
            )}
          >
            {o.icon}{o.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface SupervisionOperativaProps {
  onBack?: () => void;
}

const SupervisionOperativa: React.FC<SupervisionOperativaProps> = ({ onBack }) => {
  const { fecha, hora } = nowStr();
  const [supervisiones, setSupervisiones] = useLocalStorage<SupervisionRegistro[]>('supervisiones', []);
  const [savedResult, setSavedResult] = useState<{
    puntaje: number; resultado: string; color: string; novedades: NovedadOperativa[];
    needsQhse: boolean; registro: SupervisionRegistro; itemsNoCumplen: string[];
  } | null>(null);

  // Form state
  const [supervisor, setSupervisor] = useState('');
  const [clienteObjetivo, setClienteObjetivo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [turno, setTurno] = useState('');
  const [vigiladorNombre, setVigiladorNombre] = useState('');
  const [legajo, setLegajo] = useState('');
  const [enSuPuesto, setEnSuPuesto] = useState('');
  const [uniformeReglamentario, setUniformeReglamentario] = useState('');
  const [libroGuardia, setLibroGuardia] = useState('');
  const [conocimientoPuesto, setConocimientoPuesto] = useState('');
  const [checklist, setChecklist] = useState<Record<string, EstadoItem>>(() =>
    Object.fromEntries(ITEMS_OBJETIVO.map(i => [i.key, null]))
  );
  const [rondasRealizadas, setRondasRealizadas] = useState('');
  const [rondasProgramadas, setRondasProgramadas] = useState('');
  const [qrEscaneados, setQrEscaneados] = useState('');
  const [satisfaccion, setSatisfaccion] = useState<Satisfaccion>(null);
  const [observaciones, setObservaciones] = useState('');

  const { puntaje, resultado, color } = calcPuntaje(checklist);

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    sky: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    amber: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    red: 'bg-red-500/15 border-red-500/30 text-red-400',
    white: 'bg-white/5 border-white/10 text-white/30',
  };

  const handleSetChecklist = (key: string, val: EstadoItem) => {
    setChecklist(prev => ({ ...prev, [key]: val }));
  };

  const canSave = supervisor && clienteObjetivo && turno && vigiladorNombre;

  const handleSave = () => {
    if (!canSave) return;
    const now = Date.now();
    const registro: SupervisionRegistro = {
      id: `sup_${now}`,
      fecha,
      hora,
      supervisor,
      clienteObjetivo,
      direccion,
      turno,
      vigiladorNombre,
      legajo,
      enSuPuesto,
      uniformeReglamentario,
      libroGuardia,
      conocimientoPuesto,
      checklist,
      rondasRealizadas,
      rondasProgramadas,
      qrEscaneados,
      puntaje,
      resultado,
      satisfaccionCliente: satisfaccion,
      observaciones,
      timestamp: now,
    };
    setSupervisiones(prev => [registro, ...prev]);
    // Dual-write to spi_supervisiones for Dashboard
    appendSpiSupervision(registro);

    // ── Generar novedades por ítems "No cumple" ──────────────────────────────
    const itemsNoCumplen = ITEMS_OBJETIVO.filter(item => checklist[item.key] === 'no_cumple');
    const novedades: NovedadOperativa[] = itemsNoCumplen.map((item, idx) => ({
      id: `nov_${now}_${idx}`,
      fecha,
      tipo: 'No Conformidad Operativa' as const,
      origen: 'Supervisión Operativa' as const,
      objetivo: clienteObjetivo,
      supervisor,
      item: item.label,
      resultado: 'No cumple' as const,
      estado: 'Abierta' as const,
      prioridad: ITEMS_ALTA_PRIORIDAD.has(item.key) ? 'Alta' as const : 'Media' as const,
      timestamp: now,
    }));

    if (novedades.length > 0) {
      appendNovedades(novedades);
    }

    // QHSE trigger for CRÍTICO (<60%) or REGULAR (<75%)
    const needsQhse = puntaje < 75;

    setSavedResult({ puntaje, resultado, color, novedades, needsQhse, registro, itemsNoCumplen: itemsNoCumplen.map(i => i.label) });
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (savedResult) {
    const { puntaje: sp, resultado: sr, color: sc, novedades, needsQhse, registro: regSaved, itemsNoCumplen } = savedResult;
    return (
      <div className="min-h-screen bg-[#080b10] flex flex-col items-center justify-center gap-5 px-6 py-10">
        <div className={cn('w-20 h-20 rounded-full border-2 flex items-center justify-center', colorMap[sc])}>
          <CheckCircle2 size={40} className={`text-${sc}-400`} />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-white">Supervisión guardada</p>
          <p className="text-sm text-white/40 mt-1">
            Resultado:{' '}
            <span className={`text-${sc}-400 font-bold`}>{sr} ({sp}%)</span>
          </p>
          <p className="text-xs text-white/25 mt-1">{supervisor} · {clienteObjetivo}</p>
        </div>

        {/* Resumen novedades */}
        {novedades.length > 0 ? (
          <div className="w-full max-w-sm bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <p className="text-sm font-bold text-red-400">
                Se generaron {novedades.length} novedad{novedades.length !== 1 ? 'es' : ''} operativa{novedades.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-1.5">
              {novedades.map(n => (
                <div key={n.id} className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-xs text-white/70 flex-1">{n.item}</span>
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                    n.prioridad === 'Alta'
                      ? 'text-red-400 bg-red-500/10 border-red-500/30'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  )}>
                    {n.prioridad}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-red-300/60 text-center">Registradas en Novedades Operativas</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <Check size={14} className="text-emerald-400" />
            <p className="text-xs text-emerald-400 font-medium">Sin ítems "No cumple" — Sin novedades generadas</p>
          </div>
        )}

        {/* QHSE email button — always visible, color based on result */}
        {(() => {
          const isCritico = sp < 60;
          const isRegular = sp >= 60 && sp < 75;
          const isCriticalOrRegular = isCritico || isRegular;
          const btnClass = isCritico
            ? 'bg-red-600 hover:bg-red-500 border-red-500/30'
            : isRegular
              ? 'bg-orange-600 hover:bg-orange-500 border-orange-500/30'
              : 'bg-emerald-700/80 hover:bg-emerald-700 border-emerald-500/20';
          const btnLabel = isCritico
            ? '⚠️ Notificar QHSE — Supervisión Crítica'
            : isRegular
              ? '⚠️ Notificar QHSE — Supervisión Regular'
              : '📧 Notificar a QHSE';
          return (
            <button
              onClick={() => openQhseSupervisionMailto(regSaved, itemsNoCumplen)}
              className={`w-full max-w-sm py-3.5 rounded-xl border text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors ${btnClass}`}
            >
              <Mail size={16} />
              {btnLabel}
            </button>
          );
        })()}
        {!needsQhse && (
          <p className="text-[10px] text-white/25 -mt-2 text-center max-w-sm">
            Resultado dentro del umbral — notificación informativa
          </p>
        )}

        <button
          onClick={() => { setSavedResult(null); if (onBack) onBack(); }}
          className="mt-1 px-6 py-3 rounded-xl bg-white/8 hover:bg-white/12 text-white/60 text-sm font-medium transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080b10] text-white flex flex-col" style={{ WebkitTapHighlightColor: 'transparent' }}>

      {/* TOP BAR */}
      <div className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-[#0a0c11]/95 backdrop-blur-md border-b border-white/5">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/40 active:text-white text-sm transition-colors px-2 py-1 rounded-lg"
          >
            <ChevronLeft size={16} /> Inicio
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">Supervisión Operativa</p>
          <p className="text-[10px] text-white/30">SPI S.A.</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0">
          <Shield size={14} className="text-white" />
        </div>
      </div>

      {/* FORM CONTENT */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-4 pb-10">

          {/* Fecha/hora auto */}
          <div className="mt-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8">
            <Clock size={14} className="text-white/30" />
            <span className="text-sm text-white/50 font-medium">{fecha} · {hora}</span>
          </div>

          {/* ── DATOS DE LA SUPERVISIÓN ── */}
          <SectionTitle icon={<ClipboardList size={14} />} title="Datos de la Supervisión" />
          <div className="space-y-3">
            <SelectField label="Supervisor" value={supervisor} options={SUPERVISORES} onChange={setSupervisor} placeholder="Seleccionar supervisor..." />
            <SelectField label="Cliente / Objetivo" value={clienteObjetivo} options={getClientesObjetivos()} onChange={setClienteObjetivo} placeholder="Seleccionar objetivo..." />
            <InputField label="Dirección" value={direccion} onChange={setDireccion} placeholder="Dirección del objetivo" />
            <SelectField label="Turno" value={turno} options={TURNOS} onChange={setTurno} placeholder="Seleccionar turno..." />
          </div>

          {/* ── DATOS DEL VIGILADOR ── */}
          <SectionTitle icon={<User size={14} />} title="Datos del Vigilador" />
          <div className="space-y-3 mb-3">
            <InputField label="Nombre y Apellido" value={vigiladorNombre} onChange={setVigiladorNombre} placeholder="Nombre completo del vigilador" />
            <InputField label="Legajo" value={legajo} onChange={setLegajo} placeholder="Nº de legajo" type="number" />
          </div>
          <div className="bg-white/3 border border-white/8 rounded-xl px-4 divide-y divide-white/0">
            <SiNo label="¿En su puesto?" value={enSuPuesto} onChange={setEnSuPuesto} />
            <SiNo label="Uniforme reglamentario" value={uniformeReglamentario} onChange={setUniformeReglamentario} />
            <SiNo label="Libro de guardia al día" value={libroGuardia} onChange={setLibroGuardia} />
            <SiNo label="Conocimiento del puesto" value={conocimientoPuesto} onChange={setConocimientoPuesto} />
          </div>

          {/* ── ESTADO DEL OBJETIVO ── */}
          <SectionTitle icon={<Building2 size={14} />} title="Estado del Objetivo" />

          {/* Score badge live */}
          {resultado !== '—' && (
            <div className={cn('flex items-center justify-between px-4 py-3 rounded-xl border mb-4', colorMap[color])}>
              <span className="text-xs font-bold uppercase tracking-wide">{resultado}</span>
              <span className="text-2xl font-black">{puntaje}%</span>
            </div>
          )}

          <div className="bg-white/3 border border-white/8 rounded-xl px-4">
            {ITEMS_OBJETIVO.map(item => (
              <ChecklistRow
                key={item.key}
                label={item.label}
                value={checklist[item.key]}
                onChange={val => handleSetChecklist(item.key, val)}
              />
            ))}
          </div>

          {/* ── CONTROL DE RONDAS ── */}
          <SectionTitle icon={<Shield size={14} />} title="Control de Rondas" />
          <div className="space-y-3 mb-3">
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Rondas realizadas" value={rondasRealizadas} onChange={setRondasRealizadas} placeholder="0" type="number" />
              <InputField label="Rondas programadas" value={rondasProgramadas} onChange={setRondasProgramadas} placeholder="0" type="number" />
            </div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-xl px-4">
            <SiNo label="QR escaneados correctamente" value={qrEscaneados} onChange={setQrEscaneados} />
          </div>

          {/* ── SATISFACCIÓN DEL CLIENTE ── */}
          <SectionTitle icon={<Star size={14} />} title="Satisfacción del Cliente" />
          <div className="grid grid-cols-2 gap-2">
            {SATISFACCION_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSatisfaccion(satisfaccion === opt.value ? null : opt.value)}
                className={cn(
                  'flex items-center gap-2 px-3 py-3 rounded-xl border text-left text-xs font-semibold transition-all',
                  satisfaccion === opt.value
                    ? `bg-${opt.color}-500/15 border-${opt.color}-500/35 text-${opt.color}-400`
                    : 'bg-white/3 border-white/8 text-white/35 hover:bg-white/6'
                )}
              >
                {satisfaccion === opt.value
                  ? <CheckCircle2 size={14} />
                  : <Circle size={14} className="opacity-40" />}
                <span className="leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* ── OBSERVACIONES ── */}
          <SectionTitle icon={<ClipboardList size={14} />} title="Observaciones" />
          <textarea
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Novedades, observaciones generales, incidentes..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 resize-none transition-all"
          />

          {/* ── BOTÓN GUARDAR ── */}
          <div className="mt-6">
            {!canSave && (
              <p className="text-center text-xs text-amber-400/70 mb-3 flex items-center justify-center gap-1.5">
                <AlertTriangle size={12} /> Completá supervisor, objetivo, turno y vigilador
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={cn(
                'w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                canSave
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/40 active:scale-98'
                  : 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
              )}
            >
              <Save size={16} />
              Guardar Supervisión
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SupervisionOperativa;
