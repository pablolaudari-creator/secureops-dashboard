import React, { useState, useRef } from 'react';
import {
  Users, Plus, X, Check, Camera, Pen, Trash2,
  Mail, ChevronDown, Clock, Building2, Search,
  FileText, Download, Eye
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useAppHooks';
import { cn } from '../lib/utils';
import { getClientesObjetivos } from './ClientesObjetivos';

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoPresente = 'Presente' | 'Ausente' | 'Tardanza';

interface RegistroPresente {
  id: string;
  nombreApellido: string;
  nroDocumento: string;
  fotoUrl: string;
  fecha: string;
  horaIngreso: string;
  horaEgreso: string;
  observaciones: string;
  objetivo: string;
  turno: string;
  estado: EstadoPresente;
  firmaUrl: string;
  emailEnvio: string;
  timestamp: number;
}

// ─── Turnos ───────────────────────────────────────────────────────────────────

const TURNOS_PRES = [
  'Mañana (07:00 – 15:00)',
  'Tarde (15:00 – 23:00)',
  'Noche (19:00 – 07:00)',
  'Diurno fijo',
];

const ESTADOS_PRESENTES: { value: EstadoPresente; label: string; color: string }[] = [
  { value: 'Presente', label: '✅ Presente', color: 'emerald' },
  { value: 'Tardanza', label: '🟡 Tardanza', color: 'amber' },
  { value: 'Ausente', label: '🔴 Ausente', color: 'red' },
];

const QHSE_EMAIL_PRES = 'plaudari.qhse@spiseguridad.com.ar';
const CC_EMAILS_PRES = 'vgomez@spiseguridad.com.ar,presentismo@spiseguridad.com.ar,wrodriguez@spiseguridad.com.ar,itorena@spiseguridad.com.ar';

// Notify Dashboard that presentismo data changed.
// useLocalStorage() prefixes keys with 'spi_sgc_', so the real key is:
// 'spi_sgc_' + 'spi_presentismo_v1' = 'spi_sgc_spi_presentismo_v1'
// We fire StorageEvents so the Dashboard refreshes in the same tab
// and keep spi_presentismo (legacy cache) in sync so all readers find data.
function appendSpiPresentismo(_r: RegistroPresente): void {
  try {
    const REAL_KEY = 'spi_sgc_spi_presentismo_v1';
    window.dispatchEvent(new StorageEvent('storage', { key: REAL_KEY }));
    const raw = localStorage.getItem(REAL_KEY);
    if (raw) {
      localStorage.setItem('spi_presentismo', raw);
      window.dispatchEvent(new StorageEvent('storage', { key: 'spi_presentismo' }));
    }
  } catch { /* ignore */ }
}

const openQhseAusenciaMailto = (r: RegistroPresente) => {
  const esAusente = r.estado === 'Ausente';
  const subject = encodeURIComponent(
    `[SPI] ⚠ ${esAusente ? 'Ausencia' : 'Tardanza'} detectada — ${r.objetivo} — ${r.turno}`
  );
  const body = encodeURIComponent(
    `ALERTA DE ${r.estado.toUpperCase()} — SPI S.A.\n` +
    `==========================================\n\n` +
    `📅 Fecha: ${r.fecha}\n` +
    `🔄 Turno: ${r.turno}\n` +
    `🏢 Objetivo: ${r.objetivo}\n\n` +
    `👤 Personal: ${r.nombreApellido}\n` +
    `🪪 DNI: ${r.nroDocumento}\n` +
    `📊 Estado: ${r.estado}\n` +
    `⏰ Hora ingreso: ${r.horaIngreso || '—'}\n` +
    `⏰ Hora egreso: ${r.horaEgreso || '—'}\n\n` +
    `Observaciones: ${r.observaciones || 'Sin observaciones'}\n\n` +
    `⚠ ACCIÓN REQUERIDA — Verificar cobertura del puesto\n\n` +
    `--\nSPI SGC Dashboard`
  );
  window.open(`mailto:${QHSE_EMAIL_PRES}?cc=${CC_EMAILS_PRES}&subject=${subject}&body=${body}`, '_blank');
};

// ─── Objetivos ────────────────────────────────────────────────────────────────

// Objetivos dinámicos — se leen desde el módulo Clientes & Objetivos
const getObjetivos = () => getClientesObjetivos();

// ─── Signature Canvas ─────────────────────────────────────────────────────────

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    lastPos.current = getPos(e, canvas);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPos.current) return;
    e.preventDefault();
    const pos = getPos(e, canvas);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => { drawing.current = false; lastPos.current = null; };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">Dibujá tu firma en el recuadro</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={140}
        className="w-full bg-white/5 border border-white/10 rounded-xl cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div className="flex gap-2">
        <button onClick={clear} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors">
          Limpiar
        </button>
        <button
          onClick={save}
          disabled={!hasDrawn}
          className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
        >
          Usar esta firma
        </button>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ─── Form inicial ─────────────────────────────────────────────────────────────

const emptyForm = () => ({
  nombreApellido: '',
  nroDocumento: '',
  fotoUrl: '',
  fecha: new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  horaIngreso: '',
  horaEgreso: '',
  observaciones: '',
  objetivo: getObjetivos()[0] || '',
  turno: TURNOS_PRES[0],
  estado: 'Presente' as EstadoPresente,
  firmaUrl: '',
  emailEnvio: '',
});

// ─── Send via mailto ──────────────────────────────────────────────────────────

const sendEmail = (reg: Omit<RegistroPresente, 'id' | 'timestamp'> | RegistroPresente) => {
  const estadoEmoji = reg.estado === 'Presente' ? '✅' : reg.estado === 'Ausente' ? '🔴' : '🟡';
  const subject = encodeURIComponent(
    `[SPI] Control de Presentismo — ${reg.objetivo} — ${reg.turno} — ${reg.estado} — ${reg.fecha}`
  );
  const body = encodeURIComponent(
    `FORMULARIO DE CONTROL DE PRESENTISMO SPI\n` +
    `==========================================\n\n` +
    `${estadoEmoji} Estado de Asistencia: ${reg.estado}\n\n` +
    `Nombre y Apellido:              ${reg.nombreApellido}\n` +
    `Número de Documento:            ${reg.nroDocumento}\n` +
    `Fecha:                          ${reg.fecha}\n` +
    `Turno:                          ${reg.turno}\n` +
    `Hora de Ingreso:                ${reg.horaIngreso || '—'}\n` +
    `Hora de Egreso:                 ${reg.horaEgreso || '—'}\n` +
    `Nombre del objetivo de seguridad: ${reg.objetivo}\n` +
    `Observaciones:                  ${reg.observaciones || 'Sin observaciones'}\n\n` +
    `─────────────────────────────────────────\n` +
    `Registrado vía SPI SGC Dashboard\n` +
    `Email de envío: ${reg.emailEnvio || 'presentismo@spiseguridad.com.ar'}`
  );
  const to = 'presentismo@spiseguridad.com.ar';
  const cc = encodeURIComponent(`${CC_EMAILS_PRES}${reg.emailEnvio && reg.emailEnvio !== 'presentismo@spiseguridad.com.ar' ? `,${reg.emailEnvio}` : ''}`);
  window.open(`mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`, '_blank');
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

interface PresentismoProps { searchQuery?: string; }

const Presentismo: React.FC<PresentismoProps> = ({ searchQuery = '' }) => {
  const [registros, setRegistros] = useLocalStorage<RegistroPresente[]>('spi_presentismo_v1', []);
  const [tab, setTab] = useState<'nuevo' | 'historial' | 'analisis'>('nuevo');
  const [form, setForm] = useState(emptyForm());
  const [showSig, setShowSig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewReg, setViewReg] = useState<RegistroPresente | null>(null);
  const [pendingQhse, setPendingQhse] = useState<RegistroPresente | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, fotoUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const isValid = form.nombreApellido.trim() && form.nroDocumento.trim() && form.objetivo && form.horaIngreso;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const reg: RegistroPresente = {
      id: `p-${Date.now()}`,
      ...form,
      timestamp: Date.now(),
    };
    setRegistros(prev => [reg, ...prev]);
    // Dual-write to spi_presentismo for Dashboard
    appendSpiPresentismo(reg);
    setSaved(true);
    setSaving(false);
    setTimeout(() => {
      setSaved(false);
      // If Ausente or Tardanza → show QHSE modal (modal buttons handle reset+nav)
      if (reg.estado === 'Ausente' || reg.estado === 'Tardanza') {
        setPendingQhse(reg);
      } else {
        setForm(emptyForm());
        setTab('historial');
      }
    }, 900);
  };

  const handleDelete = (id: string) => {
    setRegistros(prev => {
      const updated = prev.filter(r => r.id !== id);
      // Keep legacy cache (spi_presentismo) in sync after deletion
      try {
        localStorage.setItem('spi_presentismo', JSON.stringify(updated));
        window.dispatchEvent(new StorageEvent('storage', { key: 'spi_sgc_spi_presentismo_v1' }));
        window.dispatchEvent(new StorageEvent('storage', { key: 'spi_presentismo' }));
      } catch { /* ignore */ }
      return updated;
    });
  };

  const filtered = registros.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.nombreApellido.toLowerCase().includes(q) ||
      r.nroDocumento.includes(q) ||
      r.objetivo.toLowerCase().includes(q);
  });

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Users size={18} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Control de Presentismo SPI</h2>
            <p className="text-xs text-white/40">Registra y monitorea la asistencia del personal</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-xs text-white/30 bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
            {registros.length} registro{registros.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        {[
          { k: 'nuevo', l: '✏️ Nuevo registro' },
          { k: 'historial', l: `📋 Historial (${registros.length})` },
          { k: 'analisis', l: '📊 Análisis' },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
              tab === t.k ? 'bg-sky-700 text-white' : 'text-white/50 hover:text-white/70'
            )}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════
          TAB: NUEVO REGISTRO
      ════════════════════════════════════════════════ */}
      {tab === 'nuevo' && (
        <div className="bg-[#0d1117] rounded-2xl border border-white/5 p-6 space-y-6">

          {/* Logo SPI + título */}
          <div className="flex items-center gap-4 pb-4 border-b border-white/5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">SPI</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Formulario de Control de Presentismo SPI</h3>
              <p className="text-xs text-white/40">Registra y monitorea la asistencia de los participantes</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-white/30">{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          {/* Nombre y Apellido */}
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white/70 mb-2 block">
                Nombre y Apellido <span className="text-red-400">*</span>
              </label>
              <input
                value={form.nombreApellido}
                onChange={e => setForm(f => ({ ...f, nombreApellido: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/50 transition-colors"
                placeholder="Ej: Alcides Cumare"
              />
            </div>

            {/* Número de Documento */}
            <div>
              <label className="text-xs font-semibold text-white/70 mb-2 block">
                Número de Documento <span className="text-red-400">*</span>
              </label>
              <input
                value={form.nroDocumento}
                onChange={e => setForm(f => ({ ...f, nroDocumento: e.target.value.replace(/\D/g, '') }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/50 transition-colors"
                placeholder="Ej: 96194286"
                maxLength={10}
              />
            </div>
          </div>

          {/* Foto del rostro */}
          <div>
            <label className="text-xs font-semibold text-white/70 mb-2 block">
              Adjuntar foto del rostro del usuario
            </label>
            <div className="flex items-start gap-4">
              <div
                className="w-32 h-32 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-sky-500/40 transition-colors shrink-0 overflow-hidden bg-white/3"
                onClick={() => photoRef.current?.click()}
              >
                {form.fotoUrl ? (
                  <img src={form.fotoUrl} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={24} className="text-white/20 mb-2" />
                    <span className="text-[10px] text-white/30 text-center px-2">Subir foto</span>
                  </>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <button
                  onClick={() => photoRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 text-sm transition-colors w-full justify-center"
                >
                  <Camera size={15} /> Seleccionar foto
                </button>
                {form.fotoUrl && (
                  <button
                    onClick={() => setForm(f => ({ ...f, fotoUrl: '' }))}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm transition-colors w-full justify-center"
                  >
                    <X size={14} /> Quitar foto
                  </button>
                )}
                <p className="text-[10px] text-white/20 text-center">JPG, PNG — se guardará localmente</p>
              </div>
            </div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          {/* Fecha + Horarios */}
          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-semibold text-white/70 mb-2 block">Fecha</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/60">
                {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 mb-2 block">
                Hora de Ingreso <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="time"
                  value={form.horaIngreso}
                  onChange={e => setForm(f => ({ ...f, horaIngreso: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 mb-2 block">Hora de Egreso</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="time"
                  value={form.horaEgreso}
                  onChange={e => setForm(f => ({ ...f, horaEgreso: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Nombre del objetivo */}
          <div>
            <label className="text-xs font-semibold text-white/70 mb-2 block">
              Nombre del objetivo de seguridad <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <select
                value={form.objetivo}
                onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors appearance-none"
              >
                <option value="" className="bg-[#0d1117] text-white/40">— Seleccionar objetivo —</option>
                {getObjetivos().map(o => (
                  <option key={o} value={o} className="bg-[#0d1117]">{o}</option>
                ))}
                <option value="__otro__" className="bg-[#0d1117]">Otro (escribir abajo)</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
            {form.objetivo === '__otro__' && (
              <input
                className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/50"
                placeholder="Escribí el nombre del objetivo..."
                onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
              />
            )}
          </div>

          {/* Turno + Estado */}
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white/70 mb-2 block">Turno</label>
              <div className="relative">
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <select
                  value={form.turno}
                  onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/50 appearance-none"
                >
                  {TURNOS_PRES.map(t => <option key={t} value={t} className="bg-[#0d1117]">{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/70 mb-2 block">Estado de Asistencia <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                {ESTADOS_PRESENTES.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, estado: opt.value }))}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl border text-xs font-bold transition-colors',
                      form.estado === opt.value
                        ? opt.color === 'emerald'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : opt.color === 'amber'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {(form.estado === 'Ausente' || form.estado === 'Tardanza') && (
                <p className="text-[10px] text-amber-400 mt-1.5 flex items-center gap-1">
                  ⚠ Se ofrecerá notificar a QHSE al guardar
                </p>
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="text-xs font-semibold text-white/70 mb-2 block">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/50 transition-colors resize-none"
              placeholder="Sin observaciones"
            />
          </div>

          {/* Firma */}
          <div>
            <label className="text-xs font-semibold text-white/70 mb-2 block">Firma</label>
            {!showSig && !form.firmaUrl && (
              <button
                onClick={() => setShowSig(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-dashed border-white/10 hover:border-sky-500/40 text-white/40 text-sm transition-colors w-full justify-center"
              >
                <Pen size={15} /> Firmar aquí
              </button>
            )}
            {form.firmaUrl && !showSig && (
              <div className="relative">
                <img src={form.firmaUrl} alt="Firma" className="h-20 rounded-xl bg-white/5 border border-white/10 p-2" />
                <button
                  onClick={() => { setForm(f => ({ ...f, firmaUrl: '' })); setShowSig(true); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            {showSig && (
              <SignaturePad
                onSave={url => { setForm(f => ({ ...f, firmaUrl: url })); setShowSig(false); }}
                onClose={() => setShowSig(false)}
              />
            )}
          </div>

          {/* Email de envío */}
          <div>
            <label className="text-xs font-semibold text-white/70 mb-2 block">
              Correo Electrónico para Envío
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="email"
                value={form.emailEnvio}
                onChange={e => setForm(f => ({ ...f, emailEnvio: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/50 transition-colors"
                placeholder="presentismo@spiseguridad.com.ar"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2 border-t border-white/5">
            <button
              onClick={() => setForm(emptyForm())}
              className="px-4 py-3 rounded-xl bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || saving || saved}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white'
              )}
            >
              {saved ? <><Check size={16} /> ¡Guardado!</> : saving ? 'Guardando...' : <><Check size={15} /> Guardar registro</>}
            </button>
            <button
              onClick={() => {
                if (!isValid) return;
                sendEmail({ ...form });
              }}
              disabled={!isValid}
              title="Enviar por email"
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-sky-400 hover:border-sky-500/30 text-sm transition-colors flex items-center gap-2 disabled:opacity-40"
            >
              <Mail size={15} /> Enviar
            </button>
          </div>

          {!isValid && (
            <p className="text-[10px] text-white/30 text-center">
              * Campos obligatorios: Nombre y Apellido, DNI, Hora de Ingreso, Objetivo de seguridad
            </p>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB: HISTORIAL
      ════════════════════════════════════════════════ */}
      {tab === 'historial' && (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-[#0d1117] rounded-2xl border border-white/5 p-12 text-center">
              <Users size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">
                {searchQuery ? 'Sin resultados para esa búsqueda' : 'Aún no hay registros de presentismo'}
              </p>
              <button
                onClick={() => setTab('nuevo')}
                className="mt-4 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
              >
                Registrar ahora
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-white/30">{filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
              <div className="space-y-3">
                {filtered.map(reg => (
                  <div
                    key={reg.id}
                    className="bg-[#0d1117] rounded-xl border border-white/5 p-4 flex items-center gap-4 hover:border-sky-500/20 transition-colors"
                  >
                    {/* Foto */}
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      {reg.fotoUrl ? (
                        <img src={reg.fotoUrl} alt={reg.nombreApellido} className="w-full h-full object-cover" />
                      ) : (
                        <Users size={18} className="text-white/20" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white">{reg.nombreApellido}</p>
                        <span className="text-[10px] text-white/30 font-mono">DNI {reg.nroDocumento}</span>
                        {reg.estado && reg.estado !== 'Presente' && (
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full border font-bold',
                            reg.estado === 'Ausente'
                              ? 'bg-red-500/10 border-red-500/20 text-red-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          )}>
                            {reg.estado === 'Ausente' ? '🔴 Ausente' : '🟡 Tardanza'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-0.5 truncate">{reg.objetivo}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-emerald-400">↑ {reg.horaIngreso}</span>
                        {reg.horaEgreso && <span className="text-[10px] text-rose-400">↓ {reg.horaEgreso}</span>}
                        <span className="text-[10px] text-white/20">{reg.fecha}</span>
                        {reg.turno && <span className="text-[10px] text-white/20 truncate">{reg.turno}</span>}
                      </div>
                    </div>

                    {/* Firma badge */}
                    {reg.firmaUrl && (
                      <div className="shrink-0">
                        <span className="text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">✓ Firmado</span>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setViewReg(reg)}
                        title="Ver detalle"
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => sendEmail(reg)}
                        title="Enviar por email"
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-sky-500/10 text-white/40 hover:text-sky-400 flex items-center justify-center transition-colors"
                      >
                        <Mail size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(reg.id)}
                        title="Eliminar"
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB: ANÁLISIS POR OBJETIVO
      ════════════════════════════════════════════════ */}
      {tab === 'analisis' && (
        <AnalisisPorObjetivo registros={registros} />
      )}

      {/* ── MODAL: NOTIFICAR QHSE POR AUSENCIA/TARDANZA ── */}
      {pendingQhse && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-amber-500/30 w-full max-w-sm p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                <Mail size={26} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {pendingQhse.estado === 'Ausente' ? '🔴 Ausencia detectada' : '🟡 Tardanza detectada'}
                </h3>
                <p className="text-xs text-white/40 mt-1">¿Notificar a QHSE y supervisores?</p>
              </div>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-1.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Detalle del registro</p>
              <p className="text-xs text-white/70">👤 <span className="font-semibold text-white">{pendingQhse.nombreApellido}</span></p>
              <p className="text-xs text-white/50">🏢 {pendingQhse.objetivo}</p>
              <p className="text-xs text-white/50">🔄 {pendingQhse.turno}</p>
              <p className={cn('text-xs font-bold mt-1', pendingQhse.estado === 'Ausente' ? 'text-red-400' : 'text-amber-400')}>
                📊 Estado: {pendingQhse.estado}
              </p>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Se notificará a</p>
              <p className="text-xs text-amber-400 font-semibold">plaudari.qhse@spiseguridad.com.ar</p>
              <p className="text-[10px] text-white/30 mt-1">CC: vgomez · presentismo · wrodriguez</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { openQhseAusenciaMailto(pendingQhse); setPendingQhse(null); setForm(emptyForm()); setTab('historial'); }}
                className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Mail size={16} /> Sí, notificar a QHSE
              </button>
              <button
                onClick={() => { setPendingQhse(null); setForm(emptyForm()); setTab('historial'); }}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors"
              >
                No, solo guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE ── */}
      {viewReg && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Detalle del Registro</h3>
                <p className="text-xs text-white/30">{viewReg.fecha}</p>
              </div>
              <button onClick={() => setViewReg(null)} className="text-white/40 hover:text-white/70">
                <X size={18} />
              </button>
            </div>

            {viewReg.fotoUrl && (
              <div className="flex justify-center">
                <img src={viewReg.fotoUrl} alt={viewReg.nombreApellido} className="w-36 h-36 object-cover rounded-xl border border-white/10" />
              </div>
            )}

            <div className="space-y-3">
              {[
                { label: 'Nombre y Apellido', value: viewReg.nombreApellido },
                { label: 'Número de Documento', value: viewReg.nroDocumento },
                { label: 'Fecha', value: viewReg.fecha },
                { label: 'Hora de Ingreso', value: viewReg.horaIngreso },
                { label: 'Hora de Egreso', value: viewReg.horaEgreso || '—' },
                { label: 'Objetivo de Seguridad', value: viewReg.objetivo },
                { label: 'Observaciones', value: viewReg.observaciones || 'Sin observaciones' },
                { label: 'Correo para Envío', value: viewReg.emailEnvio || 'presentismo@spiseguridad.com.ar' },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="text-xs font-semibold text-white/50 w-44 shrink-0">{row.label}</span>
                  <span className="text-sm text-white flex-1">{row.value}</span>
                </div>
              ))}
            </div>

            {viewReg.firmaUrl && (
              <div>
                <p className="text-xs font-semibold text-white/50 mb-2">Firma</p>
                <img src={viewReg.firmaUrl} alt="Firma" className="h-20 rounded-xl bg-white/5 border border-white/10 p-2" />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { sendEmail(viewReg); }}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Mail size={14} /> Enviar por Email
              </button>
              <button onClick={() => setViewReg(null)} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ANÁLISIS POR OBJETIVO ────────────────────────────────────────────────────

interface ObjetivoStats {
  objetivo: string;
  total: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  ausentismoPorc: number;
  coberturaPorc: number;
  personal: {
    nombre: string;
    dni: string;
    ausencias: number;
    tardanzas: number;
    ultimaFecha: string;
    turno: string;
  }[];
}

interface AnalisisPorObjetivoProps {
  registros: RegistroPresente[];
}

const AnalisisPorObjetivo: React.FC<AnalisisPorObjetivoProps> = ({ registros }) => {
  const [selectedObjetivo, setSelectedObjetivo] = useState<ObjetivoStats | null>(null);
  const [filterEstado, setFilterEstado] = useState<'todos' | 'Ausente' | 'Tardanza'>('todos');
  const [sortBy, setSortBy] = useState<'ausentismo' | 'total' | 'ausentes'>('ausentismo');
  const [searchObj, setSearchObj] = useState('');

  // ── Compute stats per objetivo from all registros ──
  const stats = React.useMemo((): ObjetivoStats[] => {
    const map = new Map<string, {
      total: number; presentes: number; ausentes: number; tardanzas: number;
      personal: Map<string, { nombre: string; dni: string; ausencias: number; tardanzas: number; fechas: string[]; turnos: string[] }>;
    }>();

    for (const r of registros) {
      const obj = r.objetivo || 'Sin objetivo';
      if (!map.has(obj)) {
        map.set(obj, { total: 0, presentes: 0, ausentes: 0, tardanzas: 0, personal: new Map() });
      }
      const entry = map.get(obj)!;
      entry.total++;
      if (r.estado === 'Presente') entry.presentes++;
      else if (r.estado === 'Ausente') entry.ausentes++;
      else if (r.estado === 'Tardanza') entry.tardanzas++;

      // Track per-person stats
      const key = r.nroDocumento || r.nombreApellido;
      if (!entry.personal.has(key)) {
        entry.personal.set(key, { nombre: r.nombreApellido, dni: r.nroDocumento, ausencias: 0, tardanzas: 0, fechas: [], turnos: [] });
      }
      const p = entry.personal.get(key)!;
      if (r.estado === 'Ausente') p.ausencias++;
      if (r.estado === 'Tardanza') p.tardanzas++;
      if (r.fecha) p.fechas.push(r.fecha);
      if (r.turno && !p.turnos.includes(r.turno)) p.turnos.push(r.turno);
    }

    return Array.from(map.entries()).map(([objetivo, d]) => {
      const total = d.total;
      // Ausentismo estricto: solo ausentes / total (misma fórmula que Dashboard)
      const ausentismoPorc = total > 0 ? Math.round((d.ausentes / total) * 100) : 0;
      // Cobertura: presentes + tardanzas (llegaron) / total planificados
      const coberturaPorc = total > 0 ? Math.min(100, Math.round(((d.presentes + d.tardanzas) / total) * 100)) : 0;
      const personal = Array.from(d.personal.values())
        .map(p => ({
          nombre: p.nombre,
          dni: p.dni,
          ausencias: p.ausencias,
          tardanzas: p.tardanzas,
          ultimaFecha: p.fechas.sort().reverse()[0] || '—',
          turno: p.turnos[0] || '—',
        }))
        .filter(p => filterEstado === 'todos' || (filterEstado === 'Ausente' ? p.ausencias > 0 : p.tardanzas > 0))
        .sort((a, b) => (b.ausencias + b.tardanzas) - (a.ausencias + a.tardanzas));
      return { objetivo, total, presentes: d.presentes, ausentes: d.ausentes, tardanzas: d.tardanzas, ausentismoPorc, coberturaPorc, personal };
    });
  }, [registros, filterEstado]);

  const filtered = stats
    .filter(s => {
      if (filterEstado === 'Ausente') return s.ausentes > 0;
      if (filterEstado === 'Tardanza') return s.tardanzas > 0;
      return true;
    })
    .filter(s => !searchObj || s.objetivo.toLowerCase().includes(searchObj.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'ausentismo') return b.ausentismoPorc - a.ausentismoPorc;
      if (sortBy === 'ausentes') return (b.ausentes + b.tardanzas) - (a.ausentes + a.tardanzas);
      return b.total - a.total;
    });

  const maxAusentismo = Math.max(...filtered.map(s => s.ausentismoPorc), 1);
  const totalAusencias = stats.reduce((acc, s) => acc + s.ausentes, 0);
  const totalTardanzas = stats.reduce((acc, s) => acc + s.tardanzas, 0);
  const totalRegistros = stats.reduce((acc, s) => acc + s.total, 0);
  const objetivosConProblema = stats.filter(s => s.ausentismoPorc > 15).length;

  const semColor = (p: number) =>
    p === 0 ? 'text-emerald-400' : p < 10 ? 'text-emerald-400' : p < 20 ? 'text-amber-400' : 'text-red-400';
  const semBarColor = (p: number) =>
    p === 0 ? 'bg-emerald-500' : p < 10 ? 'bg-emerald-500' : p < 20 ? 'bg-amber-500' : 'bg-red-500';
  const semBadge = (p: number) =>
    p === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    : p < 10 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    : p < 20 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    : 'bg-red-500/10 border-red-500/20 text-red-400';

  if (registros.length === 0) {
    return (
      <div className="bg-[#0d1117] rounded-2xl border border-white/5 p-12 text-center">
        <Users size={32} className="text-white/10 mx-auto mb-3" />
        <p className="text-sm text-white/30">Sin registros para analizar</p>
        <p className="text-xs text-white/20 mt-1">Cargá registros de presentismo para ver el análisis por cliente</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── KPI SUMMARY ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0d1117] rounded-xl border border-white/5 p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Clientes analizados</p>
          <p className="text-3xl font-bold text-white mt-1">{stats.length}</p>
          <p className="text-[10px] text-white/25 mt-0.5">{totalRegistros} registros totales</p>
        </div>
        <div className={`bg-[#0d1117] rounded-xl border p-4 ${objetivosConProblema > 0 ? 'border-red-500/25' : 'border-emerald-500/20'}`}>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Con ausentismo crítico</p>
          <p className={`text-3xl font-bold mt-1 ${objetivosConProblema > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{objetivosConProblema}</p>
          <p className="text-[10px] text-white/25 mt-0.5">clientes con {'>'} 20% ausentismo</p>
        </div>
        <div className={`bg-[#0d1117] rounded-xl border p-4 ${totalAusencias > 0 ? 'border-red-500/20' : 'border-white/5'}`}>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Ausencias totales</p>
          <p className={`text-3xl font-bold mt-1 ${totalAusencias > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{totalAusencias}</p>
          <p className="text-[10px] text-white/25 mt-0.5">{totalTardanzas} tardanzas adicionales</p>
        </div>
        <div className={`bg-[#0d1117] rounded-xl border p-4 ${totalTardanzas > 0 ? 'border-amber-500/20' : 'border-white/5'}`}>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Personal con incidencias</p>
          <p className={`text-3xl font-bold mt-1 ${totalTardanzas > 0 || totalAusencias > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {stats.reduce((acc, s) => acc + s.personal.filter(p => p.ausencias > 0 || p.tardanzas > 0).length, 0)}
          </p>
          <p className="text-[10px] text-white/25 mt-0.5">con al menos 1 ausencia o tardanza</p>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={searchObj}
            onChange={e => setSearchObj(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 transition-colors"
          />
        </div>
        {/* Filter */}
        <div className="flex gap-1.5">
          {([
            { k: 'todos', l: 'Todos' },
            { k: 'Ausente', l: '🔴 Solo ausentes' },
            { k: 'Tardanza', l: '🟡 Solo tardanzas' },
          ] as const).map(f => (
            <button
              key={f.k}
              onClick={() => setFilterEstado(f.k)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                filterEstado === f.k ? 'bg-sky-700 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
        {/* Sort */}
        <div className="flex gap-1.5 items-center">
          <span className="text-[10px] text-white/30">Ordenar:</span>
          {([
            { k: 'ausentismo', l: '% Ausentismo' },
            { k: 'ausentes', l: 'N° incidencias' },
            { k: 'total', l: 'Total registros' },
          ] as const).map(s => (
            <button
              key={s.k}
              onClick={() => setSortBy(s.k)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                sortBy === s.k ? 'bg-violet-700 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── RANKING POR OBJETIVO ── */}
      <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Ranking de Ausentismo por Cliente</h3>
          </div>
          <span className="text-xs text-white/30">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-white/20 text-sm">Sin clientes con ese criterio</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((s, idx) => {
              const barWidth = maxAusentismo > 0 ? (s.ausentismoPorc / maxAusentismo) * 100 : 0;
              const isCrit = s.ausentismoPorc >= 20;
              const hasPersonal = s.ausentes + s.tardanzas > 0;
              return (
                <div
                  key={s.objetivo}
                  className={`px-5 py-4 hover:bg-white/3 transition-colors cursor-pointer group ${isCrit ? 'border-l-2 border-red-500/40' : ''}`}
                  onClick={() => setSelectedObjetivo(s)}
                  title="Clic para ver el personal con incidencias en este cliente"
                >
                  {/* Header row */}
                  <div className="flex items-center gap-3 mb-2">
                    {/* Rank badge */}
                    <span className={`text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-red-500/20 text-red-400' : idx === 1 ? 'bg-orange-500/15 text-orange-400' : 'bg-white/5 text-white/30'
                    }`}>
                      {idx + 1}
                    </span>
                    {/* Nombre objetivo */}
                    <p className="text-sm font-semibold text-white flex-1 truncate group-hover:text-sky-300 transition-colors">
                      {s.objetivo}
                    </p>
                    {/* Semáforo badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold shrink-0 ${semBadge(s.ausentismoPorc)}`}>
                      {s.ausentismoPorc}% aus.
                    </span>
                    {/* Personal con problema */}
                    {hasPersonal && (
                      <span className="text-[10px] text-white/40 shrink-0 group-hover:text-sky-400 transition-colors">
                        {s.ausentes + s.tardanzas} incid. →
                      </span>
                    )}
                  </div>

                  {/* Bar */}
                  <div className="flex items-center gap-3 ml-9">
                    <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${semBarColor(s.ausentismoPorc)}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] shrink-0">
                      <span className="text-emerald-400">{s.presentes}P</span>
                      <span className="text-red-400">{s.ausentes}A</span>
                      <span className="text-amber-400">{s.tardanzas}T</span>
                      <span className="text-white/20">/ {s.total} reg.</span>
                    </div>
                  </div>

                  {/* Personal preview — top 3 con incidencias */}
                  {hasPersonal && (
                    <div className="ml-9 mt-2 flex flex-wrap gap-1.5">
                      {s.personal.slice(0, 3).map(p => (
                        <span
                          key={p.dni || p.nombre}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50"
                        >
                          <span className={p.ausencias > 0 ? 'text-red-400' : 'text-amber-400'}>●</span>
                          {p.nombre.split(' ').slice(0, 2).join(' ')}
                          {p.ausencias > 0 && <span className="text-red-400 font-bold">{p.ausencias}A</span>}
                          {p.tardanzas > 0 && <span className="text-amber-400 font-bold">{p.tardanzas}T</span>}
                        </span>
                      ))}
                      {s.personal.length > 3 && (
                        <span className="text-[10px] text-white/25 px-2 py-0.5">+{s.personal.length - 3} más</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── NOTA ── */}
      <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
        <p className="text-[10px] text-white/30 leading-relaxed">
          <span className="text-white/50 font-semibold">📌 Nota:</span> El análisis se basa en los registros cargados en el historial de presentismo de esta app.
          Los datos históricos (Ene–Mar 2026) provienen del Plan Maestro SGI y no están incluidos en este desglose individual.
          Hacé clic en cualquier cliente para ver el detalle del personal con incidencias.
        </p>
      </div>

      {/* ── MODAL DETALLE OBJETIVO ── */}
      {selectedObjetivo && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedObjetivo(null)}
        >
          <div
            className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={14} className="text-sky-400" />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Cliente</span>
                </div>
                <h3 className="text-base font-bold text-white leading-snug">{selectedObjetivo.objetivo}</h3>
              </div>
              <button onClick={() => setSelectedObjetivo(null)} className="text-white/30 hover:text-white/60 shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* KPIs objetivo */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total reg.', value: selectedObjetivo.total, color: 'text-white' },
                { label: 'Presentes', value: selectedObjetivo.presentes, color: 'text-emerald-400' },
                { label: 'Ausentes', value: selectedObjetivo.ausentes, color: 'text-red-400' },
                { label: 'Tardanzas', value: selectedObjetivo.tardanzas, color: 'text-amber-400' },
              ].map(k => (
                <div key={k.label} className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-white/30">{k.label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Ausentismo bar */}
            <div className="bg-white/3 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Tasa de ausentismo</span>
                <span className={`text-lg font-bold ${semColor(selectedObjetivo.ausentismoPorc)}`}>
                  {selectedObjetivo.ausentismoPorc}%
                </span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${semBarColor(selectedObjetivo.ausentismoPorc)}`}
                  style={{ width: `${selectedObjetivo.ausentismoPorc}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/25">Meta: ≤ 10%</span>
                <span className={selectedObjetivo.ausentismoPorc > 10 ? 'text-red-400 font-semibold' : 'text-emerald-400'}>
                  {selectedObjetivo.ausentismoPorc > 10
                    ? `⚠ ${selectedObjetivo.ausentismoPorc - 10}pp sobre la meta`
                    : '✅ Dentro de la meta'}
                </span>
              </div>
            </div>

            {/* Personal con incidencias */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={13} className="text-white/40" />
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Personal con incidencias en este cliente
                </p>
              </div>
              {selectedObjetivo.personal.filter(p => p.ausencias > 0 || p.tardanzas > 0).length === 0 ? (
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-center">
                  <p className="text-sm text-emerald-400">✅ Sin ausentismo registrado en este cliente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedObjetivo.personal
                    .filter(p => p.ausencias > 0 || p.tardanzas > 0)
                    .map((p, i) => {
                      const total = p.ausencias + p.tardanzas;
                      const nivel = p.ausencias >= 3 ? 'critico' : p.ausencias >= 1 ? 'alto' : 'medio';
                      return (
                        <div
                          key={p.dni || p.nombre}
                          className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
                            nivel === 'critico' ? 'border-red-500/25 bg-red-500/5' :
                            nivel === 'alto' ? 'border-orange-500/20 bg-orange-500/5' :
                            'border-amber-500/15 bg-amber-500/5'
                          }`}
                        >
                          {/* Rank */}
                          <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            i === 0 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/30'
                          }`}>
                            {i + 1}
                          </span>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white truncate">{p.nombre}</p>
                              {p.dni && <span className="text-[10px] text-white/30 font-mono shrink-0">DNI {p.dni}</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] text-white/30">{p.turno}</span>
                              <span className="text-[10px] text-white/20">Último: {p.ultimaFecha}</span>
                            </div>
                          </div>
                          {/* Badges */}
                          <div className="flex items-center gap-2 shrink-0">
                            {p.ausencias > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400">
                                {p.ausencias} {p.ausencias === 1 ? 'ausencia' : 'ausencias'}
                              </span>
                            )}
                            {p.tardanzas > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">
                                {p.tardanzas} {p.tardanzas === 1 ? 'tardanza' : 'tardanzas'}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              nivel === 'critico' ? 'bg-red-500/15 border-red-500/30 text-red-300' :
                              nivel === 'alto' ? 'bg-orange-500/15 border-orange-500/25 text-orange-300' :
                              'bg-amber-500/15 border-amber-500/20 text-amber-300'
                            }`}>
                              {total} total
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Todo el personal en este objetivo */}
            {selectedObjetivo.personal.filter(p => p.ausencias === 0 && p.tardanzas === 0).length > 0 && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Personal sin incidencias en este cliente</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedObjetivo.personal
                    .filter(p => p.ausencias === 0 && p.tardanzas === 0)
                    .map(p => (
                      <span
                        key={p.dni || p.nombre}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/8 border border-emerald-500/15 text-emerald-400/70"
                      >
                        ✅ {p.nombre.split(' ').slice(0, 2).join(' ')}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedObjetivo(null)}
              className="w-full py-2.5 rounded-xl bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Presentismo;
