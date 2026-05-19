import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode, X, Check, Pen, Mail, ChevronDown,
  Clock, Building2, Plus, Trash2, Eye, Shield,
  AlertTriangle, User, Hash
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useAppHooks';
import { cn } from '../lib/utils';
import { getClientesObjetivos } from './ClientesObjetivos';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RondaRegistro {
  id: string;
  fecha: string;
  turno: string;
  nroRonda: string;
  clienteObjetivo: string;
  direccionObjetivo: string;
  nivelCriticidad: string;
  vigiladorNombre: string;
  legajo: string;
  supervisorZona: string;
  codigoQR: string;
  nombrePunto: string;
  sectorZona: string;
  horaProgramada: string;
  horaRealEscaneo: string;
  escaneoOk: string;
  hayNovedad: string;
  itemsVerificados: string[];
  observaciones: string;
  firmaUrl: string;
  emailSupervisor: string;
  timestamp: number;
}

// ─── Opciones ──────────────────────────────────────────────────────────────────

const TURNOS = [
  'Turno mañana de 07 a 15',
  'Turno tarde de 15 a 23',
  'Turno noche de 19 a 07',
  'Turno 24 hs',
  'Turno fijo diurno',
];

// Objetivos dinámicos — se cargan desde el módulo Clientes & Objetivos
// Se actualiza en tiempo real cuando se agrega un nuevo cliente
const getObjetivosRonda = () => getClientesObjetivos();

const CRITICIDAD_OPTIONS = [
  { value: 'Alta', color: 'text-red-400' },
  { value: 'Media', color: 'text-amber-400' },
  { value: 'Baja', color: 'text-emerald-400' },
];

const SUPERVISORES = [
  'Iván Torena',
  'W. Rodríguez',
  'Otro',
];

const ITEMS_POSIBLES = [
  'Condiciones Climáticas',
  'Estado de puertas/accesos',
  'Iluminación',
  'Cámaras CCTV operativas',
  'Matafuegos presentes',
  'Botón antipánico',
  'Libro de guardia al día',
  'Elementos de seguridad',
  'Señalización de emergencia',
  'Estado de instalaciones',
  'Personal en puesto',
];

const ESCANEO_OPTIONS = [
  { value: 'SI — Escaneado correctamente', icon: '✅' },
  { value: 'NO — Sin escaneo', icon: '❌' },
  { value: 'NO — QR dañado', icon: '⚠️' },
];

const NOVEDAD_OPTIONS = [
  { value: 'NO — Sin novedad', icon: '✅' },
  { value: 'SI — Ver observaciones', icon: '🔴' },
];

// ─── Signature Pad ────────────────────────────────────────────────────────────

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
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
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
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">Firma digital del vigilador — dibujá en el recuadro</p>
      <canvas
        ref={canvasRef}
        width={420}
        height={130}
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
        <button onClick={clear} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors">Limpiar</button>
        <button onClick={() => { const c = canvasRef.current; if (c) onSave(c.toDataURL()); }} disabled={!hasDrawn}
          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium transition-colors">
          Usar esta firma
        </button>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors">Cancelar</button>
      </div>
    </div>
  );
};

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm = (): Omit<RondaRegistro, 'id' | 'timestamp'> => ({
  fecha: new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  turno: TURNOS[0],
  nroRonda: '',
  clienteObjetivo: getObjetivosRonda()[0] || '',
  direccionObjetivo: '',
  nivelCriticidad: 'Media',
  vigiladorNombre: '',
  legajo: '',
  supervisorZona: SUPERVISORES[0],
  codigoQR: '',
  nombrePunto: '',
  sectorZona: '',
  horaProgramada: '',
  horaRealEscaneo: '',
  escaneoOk: ESCANEO_OPTIONS[0].value,
  hayNovedad: NOVEDAD_OPTIONS[0].value,
  itemsVerificados: [],
  observaciones: '',
  firmaUrl: '',
  emailSupervisor: 'controlderondas@spiseguridad.com.ar',
});

// ─── Email sender ─────────────────────────────────────────────────────────────

const DESTINATARIOS_SUPERVISORES = 'controlderondas@spiseguridad.com.ar,itorres@spiseguridad.com.ar';
const QHSE_EMAIL = 'plaudari.qhse@spiseguridad.com.ar';
const CC_EMAILS = 'controlderondas@spiseguridad.com.ar,itorres@spiseguridad.com.ar';

// Notify Dashboard that rondas data changed.
// useLocalStorage() prefixes keys with 'spi_sgc_', so the real key is:
// 'spi_sgc_' + 'spi_rondas_form_v1' = 'spi_sgc_spi_rondas_form_v1'
// We fire StorageEvents so the Dashboard refreshes in the same tab
// and keep spi_rondas (legacy cache) in sync so all readers find data.
function appendSpiRonda(_r: RondaRegistro): void {
  try {
    const REAL_KEY = 'spi_sgc_spi_rondas_form_v1';
    window.dispatchEvent(new StorageEvent('storage', { key: REAL_KEY }));
    const raw = localStorage.getItem(REAL_KEY);
    if (raw) {
      localStorage.setItem('spi_rondas', raw);
      window.dispatchEvent(new StorageEvent('storage', { key: 'spi_rondas' }));
    }
  } catch { /* ignore */ }
}

const openQhseRondaMailto = (r: RondaRegistro) => {
  const resultado = r.escaneoOk.startsWith('SI') ? 'OK' : 'Incompleto';
  const subject = encodeURIComponent(
    `[SPI] Nueva Ronda Registrada — ${r.clienteObjetivo} — ${r.fecha}`
  );
  const body = encodeURIComponent(
    `Se registró una nueva ronda de seguridad.\n\n` +
    `Objetivo: ${r.clienteObjetivo}\n` +
    `Turno: ${r.turno}\n` +
    `Vigilador: ${r.vigiladorNombre}${r.legajo ? ` (Leg. ${r.legajo})` : ''}\n` +
    `Resultado: ${resultado}\n` +
    `Fecha: ${r.fecha}\n\n` +
    `── DETALLE ADICIONAL ──────────────────\n` +
    `N° de ronda: ${r.nroRonda || '—'}\n` +
    `Dirección: ${r.direccionObjetivo || '—'}\n` +
    `Criticidad: ${r.nivelCriticidad}\n` +
    `Supervisor de zona: ${r.supervisorZona}\n` +
    `Punto de control: ${r.nombrePunto || '—'}\n` +
    `Escaneo QR: ${r.escaneoOk}\n` +
    `¿Hay novedad?: ${r.hayNovedad}\n` +
    `Observaciones: ${r.observaciones || 'Sin observaciones'}\n\n` +
    (r.hayNovedad.startsWith('SI') ? `⚠ HAY NOVEDAD — REVISAR OBSERVACIONES DE INMEDIATO\n\n` : '') +
    `--\nSPI SecureOps Dashboard`
  );
  window.open(`mailto:${QHSE_EMAIL}?cc=${CC_EMAILS}&subject=${subject}&body=${body}`, '_blank');
};

const openRondaMailto = (r: RondaRegistro) => {
  const ahora = new Date(r.timestamp);
  const fechaHora = ahora.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const puntoLabel = r.nombrePunto || r.clienteObjetivo;
  const hayNovedadFlag = r.hayNovedad.startsWith('SI');
  const escaneoFail = r.escaneoOk.startsWith('NO');

  const subject = encodeURIComponent(
    `[SPI] Ronda registrada — ${puntoLabel} — ${fechaHora}`
  );

  const body = encodeURIComponent(
    `CONTROL DE RONDAS CON QR — SPI S.A.\n` +
    `==========================================\n\n` +
    `📅 Fecha y hora: ${fechaHora}\n` +
    `🔄 Turno: ${r.turno}\n` +
    `#️⃣ N° de ronda del turno: ${r.nroRonda || '—'}\n\n` +
    `── OBJETIVO ────────────────────────────\n` +
    `🏢 Cliente / Objetivo: ${r.clienteObjetivo}\n` +
    `📍 Dirección: ${r.direccionObjetivo || '—'}\n` +
    `⚠ Criticidad: ${r.nivelCriticidad}\n\n` +
    `── PERSONAL ────────────────────────────\n` +
    `👤 Vigilador: ${r.vigiladorNombre}\n` +
    `🪪 Legajo: ${r.legajo || '—'}\n` +
    `🛡 Supervisor de zona: ${r.supervisorZona}\n\n` +
    `── PUNTO DE CONTROL ────────────────────\n` +
    `📱 Código QR: ${r.codigoQR || '—'}\n` +
    `📌 Punto de control: ${r.nombrePunto || '—'}\n` +
    `🗂 Sector / Zona: ${r.sectorZona || '—'}\n` +
    `⏰ Hora programada: ${r.horaProgramada || '—'}\n` +
    `⏱ Hora real de escaneo: ${r.horaRealEscaneo || '—'}\n` +
    `✅ Escaneo QR: ${r.escaneoOk}\n` +
    `🔔 ¿Hay novedad?: ${r.hayNovedad}\n\n` +
    (r.itemsVerificados.length > 0
      ? `── ÍTEMS VERIFICADOS ───────────────────\n${r.itemsVerificados.map(i => `  ✓ ${i}`).join('\n')}\n\n`
      : '') +
    `── OBSERVACIONES ───────────────────────\n` +
    `${r.observaciones || 'Sin observaciones'}\n\n` +
    (hayNovedadFlag ? `⚠⚠⚠ HAY NOVEDAD EN ESTE PUNTO — REVISAR OBSERVACIONES DE INMEDIATO ⚠⚠⚠\n\n` : '') +
    (escaneoFail ? `❌ ESCANEO QR FALLIDO — VERIFICAR PUNTO DE CONTROL\n\n` : '') +
    `--\n` +
    `Enviado desde SecureOps Dashboard — plaudari.qhse@spiseguridad.com.ar`
  );

  window.open(`mailto:${DESTINATARIOS_SUPERVISORES}?subject=${subject}&body=${body}`, '_blank');
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

interface RondasFormProps { searchQuery?: string; }

const RondasForm: React.FC<RondasFormProps> = ({ searchQuery = '' }) => {
  const [registros, setRegistros] = useLocalStorage<RondaRegistro[]>('spi_rondas_form_v1', []);
  const [tab, setTab] = useState<'nuevo' | 'historial'>('nuevo');
  const [form, setForm] = useState(emptyForm());
  const [showSig, setShowSig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewReg, setViewReg] = useState<RondaRegistro | null>(null);

  const toggleItem = (item: string) => {
    setForm(f => ({
      ...f,
      itemsVerificados: f.itemsVerificados.includes(item)
        ? f.itemsVerificados.filter(i => i !== item)
        : [...f.itemsVerificados, item],
    }));
  };

  const isValid = form.vigiladorNombre.trim() && form.clienteObjetivo && form.turno;

  const handleDelete = (id: string) => {
    setRegistros(prev => {
      const updated = prev.filter(r => r.id !== id);
      // Keep legacy cache (spi_rondas) in sync after deletion
      try {
        localStorage.setItem('spi_rondas', JSON.stringify(updated));
        window.dispatchEvent(new StorageEvent('storage', { key: 'spi_sgc_spi_rondas_form_v1' }));
        window.dispatchEvent(new StorageEvent('storage', { key: 'spi_rondas' }));
      } catch { /* ignore */ }
      return updated;
    });
  };

  // ── Email notification modal state ────────────────────────────────────────
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingReg, setPendingReg] = useState<RondaRegistro | null>(null);

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 350));
    const reg: RondaRegistro = { id: `ronda-${Date.now()}`, ...form, timestamp: Date.now() };
    setRegistros(prev => [reg, ...prev]);
    // Dual-write to spi_rondas for Dashboard
    appendSpiRonda(reg);
    setSaving(false);
    setSaved(true);
    setPendingReg(reg);
    setTimeout(() => {
      setSaved(false);
      setShowEmailModal(true);
    }, 900);
  };

  const handleEmailModalClose = (sendEmail: boolean, sendQhse: boolean) => {
    if (sendEmail && pendingReg) {
      openRondaMailto(pendingReg);
    }
    if (sendQhse && pendingReg) {
      openQhseRondaMailto(pendingReg);
    }
    setShowEmailModal(false);
    setPendingReg(null);
    setForm(emptyForm());
    setTab('historial');
  };

  const filtered = registros.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.vigiladorNombre.toLowerCase().includes(q) ||
      r.clienteObjetivo.toLowerCase().includes(q) ||
      r.supervisorZona.toLowerCase().includes(q) ||
      r.nombrePunto.toLowerCase().includes(q);
  });

  const hayNovedadSelected = form.hayNovedad.startsWith('SI');
  const escaneoFalse = form.escaneoOk.startsWith('NO');

  const criticidadColor = {
    Alta: 'text-red-400 bg-red-500/10 border-red-500/30',
    Media: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Baja: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  }[form.nivelCriticidad] ?? 'text-white/50';

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <QrCode size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Control de Rondas con QR — SPI S.A.</h2>
            <p className="text-xs text-white/40">Formulario oficial de registro de rondas por punto de control</p>
          </div>
        </div>
        <span className="text-xs text-white/30 bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
          {registros.length} ronda{registros.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        {[
          { k: 'nuevo', l: '✏️ Nueva ronda' },
          { k: 'historial', l: `📋 Historial (${registros.length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
            className={cn('px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
              tab === t.k ? 'bg-emerald-700 text-white' : 'text-white/50 hover:text-white/70')}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════
          TAB: NUEVO REGISTRO
      ════════════════════════════════════════════════ */}
      {tab === 'nuevo' && (
        <div className="bg-[#0d1117] rounded-2xl border border-white/5 p-6 space-y-6">

          {/* Header formulario */}
          <div className="flex items-center gap-4 pb-4 border-b border-white/5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shrink-0">
              <QrCode size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">CONTROL DE RONDAS CON QR — SPI S.A.</h3>
              <p className="text-xs text-white/40">Registro de punto de control por turno</p>
            </div>
            <div className="ml-auto">
              <p className="text-xs text-white/30 text-right">{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          {/* ── SECCIÓN 1: Datos del turno ── */}
          <div>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-4">Datos del Turno</p>
            <div className="grid md:grid-cols-3 gap-5">

              {/* Fecha */}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-2 block">Fecha de la ronda</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/60">
                  {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Turno */}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-2 block">Turno <span className="text-red-400">*</span></label>
                <div className="relative">
                  <select value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none">
                    {TURNOS.map(t => <option key={t} value={t} className="bg-[#0d1117]">{t}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* N° Ronda */}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-2 block">N° de ronda del turno</label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={form.nroRonda} onChange={e => setForm(f => ({ ...f, nroRonda: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                    placeholder="Ej: 6" />
                </div>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 2: Objetivo ── */}
          <div>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-4">Datos del Objetivo</p>
            <div className="grid md:grid-cols-2 gap-5">

              {/* Cliente */}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-2 block">
                  Cliente / Nombre del objetivo <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <select value={form.clienteObjetivo} onChange={e => setForm(f => ({ ...f, clienteObjetivo: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none">
                    <option value="" className="bg-[#0d1117] text-white/40">— Seleccionar objetivo —</option>
                    {getObjetivosRonda().map(o => <option key={o} value={o} className="bg-[#0d1117]">{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-2 block">Dirección del objetivo</label>
                <input value={form.direccionObjetivo} onChange={e => setForm(f => ({ ...f, direccionObjetivo: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Ej: Martín Rodríguez 199" />
              </div>

              {/* Criticidad */}
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-white/60 mb-2 block">Nivel de criticidad del objetivo</label>
                <div className="flex gap-3">
                  {CRITICIDAD_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setForm(f => ({ ...f, nivelCriticidad: opt.value }))}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors',
                        form.nivelCriticidad === opt.value
                          ? cn(opt.color, 'border-current bg-current/10')
                          : 'text-white/30 border-white/10 bg-white/5 hover:bg-white/10'
                      )}>
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 3: Personal ── */}
          <div>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-4">Personal de Guardia</p>
            <div className="grid md:grid-cols-3 gap-5">

              {/* Vigilador */}
              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-white/60 mb-2 block">
                  Vigilador — Nombre y Apellido <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={form.vigiladorNombre} onChange={e => setForm(f => ({ ...f, vigiladorNombre: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                    placeholder="Ej: Sebastián Martínez" />
                </div>
              </div>

              {/* Legajo */}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-2 block">Legajo del vigilador</label>
                <input value={form.legajo} onChange={e => setForm(f => ({ ...f, legajo: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Ej: 265" />
              </div>

              {/* Supervisor */}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-2 block">Supervisor de zona</label>
                <div className="relative">
                  <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <select value={form.supervisorZona} onChange={e => setForm(f => ({ ...f, supervisorZona: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none">
                    {SUPERVISORES.map(s => <option key={s} value={s} className="bg-[#0d1117]">{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 4: Punto de control ── */}
          <div>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-4">Punto de Control QR</p>
            <div className="grid md:grid-cols-2 gap-5">

              {/* Código QR */}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-2 block">Código QR escaneado</label>
                <div className="relative">
                  <QrCode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={form.codigoQR} onChange={e => setForm(f => ({ ...f, codigoQR: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                    placeholder="Ej: 03" />
                </div>
              </div>

              {/* Nombre del punto */}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-2 block">Nombre del punto de control</label>
                <input value={form.nombrePunto} onChange={e => setForm(f => ({ ...f, nombrePunto: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Ej: Inflamables" />
              </div>

              {/* Sector */}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-2 block">Sector / Zona</label>
                <input value={form.sectorZona} onChange={e => setForm(f => ({ ...f, sectorZona: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Ej: Líquidos inflamables" />
              </div>

              {/* Horarios */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-2 block">Hora programada</label>
                  <div className="relative">
                    <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="time" value={form.horaProgramada} onChange={e => setForm(f => ({ ...f, horaProgramada: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-2 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/60 mb-2 block">Hora real escaneo</label>
                  <div className="relative">
                    <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="time" value={form.horaRealEscaneo} onChange={e => setForm(f => ({ ...f, horaRealEscaneo: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-2 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
              </div>
            </div>

            {/* ¿Se completó el escaneo? */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-white/60 mb-3 block">¿Se completó el escaneo correctamente?</label>
              <div className="flex gap-3 flex-wrap">
                {ESCANEO_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setForm(f => ({ ...f, escaneoOk: opt.value }))}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                      form.escaneoOk === opt.value
                        ? opt.value.startsWith('SI')
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    )}>
                    <span>{opt.icon}</span> {opt.value}
                  </button>
                ))}
              </div>
            </div>

            {/* ¿Hay novedad? */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-white/60 mb-3 block">¿Hay novedad en este punto?</label>
              <div className="flex gap-3 flex-wrap">
                {NOVEDAD_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setForm(f => ({ ...f, hayNovedad: opt.value }))}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                      form.hayNovedad === opt.value
                        ? opt.value.startsWith('SI')
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    )}>
                    <span>{opt.icon}</span> {opt.value}
                  </button>
                ))}
              </div>
              {hayNovedadSelected && (
                <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-400 font-semibold">⚠ HAY NOVEDAD — Describí el detalle en Observaciones adicionales</p>
                </div>
              )}
            </div>

            {/* Ítems verificados */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-white/60 mb-3 block">Ítems verificados en el punto</label>
              <div className="flex flex-wrap gap-2">
                {ITEMS_POSIBLES.map(item => {
                  const sel = form.itemsVerificados.includes(item);
                  return (
                    <button key={item} onClick={() => toggleItem(item)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                        sel ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                      )}>
                      {sel ? '✓ ' : ''}{item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Observaciones ── */}
          <div>
            <label className="text-xs font-semibold text-white/60 mb-2 block">Observaciones adicionales</label>
            <textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 resize-none"
              placeholder={hayNovedadSelected ? '⚠ Describí la novedad con detalle...' : 'Sin observaciones'} />
          </div>

          {/* ── Firma digital ── */}
          <div>
            <label className="text-xs font-semibold text-white/60 mb-2 block">Firma digital del vigilador</label>
            {!showSig && !form.firmaUrl && (
              <button onClick={() => setShowSig(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-dashed border-white/10 hover:border-emerald-500/40 text-white/40 text-sm transition-colors w-full justify-center">
                <Pen size={15} /> Firmar aquí
              </button>
            )}
            {form.firmaUrl && !showSig && (
              <div className="relative inline-block">
                <img src={form.firmaUrl} alt="Firma" className="h-20 rounded-xl bg-white/5 border border-white/10 p-2" />
                <button onClick={() => { setForm(f => ({ ...f, firmaUrl: '' })); setShowSig(true); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40 transition-colors">
                  <X size={12} />
                </button>
              </div>
            )}
            {showSig && (
              <SignaturePad onSave={url => { setForm(f => ({ ...f, firmaUrl: url })); setShowSig(false); }} onClose={() => setShowSig(false)} />
            )}
          </div>

          {/* ── Email supervisor ── */}
          <div>
            <label className="text-xs font-semibold text-white/60 mb-2 block">Email del supervisor (para notificación)</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="email" value={form.emailSupervisor} onChange={e => setForm(f => ({ ...f, emailSupervisor: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                placeholder="controlderondas@spiseguridad.com.ar" />
            </div>
          </div>

          {/* ── ACCIONES ── */}
          <div className="flex gap-3 pt-2 border-t border-white/5">
            <button onClick={() => setForm(emptyForm())}
              className="px-4 py-3 rounded-xl bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors">
              Limpiar
            </button>
            <button onClick={handleSave} disabled={!isValid || saving || saved}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white'
              )}>
              {saved
                ? <><Check size={16} /> ¡Guardada!</>
                : saving
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                  : <><Check size={15} /> Guardar ronda</>}
            </button>
          </div>
          {!isValid && (
            <p className="text-[10px] text-white/30 text-center">* Campos obligatorios: Vigilador, Cliente/Objetivo, Turno</p>
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
              <QrCode size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">
                {searchQuery ? 'Sin resultados para esa búsqueda' : 'Aún no hay rondas registradas'}
              </p>
              <button onClick={() => setTab('nuevo')}
                className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors">
                Registrar ronda
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-white/30">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
              <div className="space-y-3">
                {filtered.map(reg => {
                  const hayNov = reg.hayNovedad.startsWith('SI');
                  const escaneoFail = reg.escaneoOk.startsWith('NO');
                  return (
                    <div key={reg.id}
                      className={cn(
                        'bg-[#0d1117] rounded-xl border p-4 flex items-center gap-4 transition-colors',
                        hayNov ? 'border-red-500/30' : 'border-white/5 hover:border-emerald-500/20'
                      )}>
                      {/* Icon */}
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        hayNov ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20')}>
                        <QrCode size={16} className={hayNov ? 'text-red-400' : 'text-emerald-400'} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white">{reg.vigiladorNombre}</p>
                          {reg.legajo && <span className="text-[10px] text-white/30 font-mono">Leg. {reg.legajo}</span>}
                          {hayNov && <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">⚠ NOVEDAD</span>}
                          {escaneoFail && <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">❌ Sin escaneo</span>}
                        </div>
                        <p className="text-xs text-white/40 mt-0.5 truncate">{reg.clienteObjetivo}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-white/30">{reg.turno}</span>
                          {reg.nroRonda && <span className="text-[10px] text-emerald-400">Ronda #{reg.nroRonda}</span>}
                          {reg.nombrePunto && <span className="text-[10px] text-white/30">📍 {reg.nombrePunto}</span>}
                        </div>
                      </div>

                      {/* Firma badge */}
                      {reg.firmaUrl && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">✓ Firmado</span>
                      )}

                      {/* Acciones */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setViewReg(reg)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-colors">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => openRondaMailto(reg)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 flex items-center justify-center transition-colors">
                          <Mail size={13} />
                        </button>
                        <button onClick={() => handleDelete(reg.id)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 flex items-center justify-center transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODAL DETALLE ── */}
      {viewReg && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Detalle de Ronda</h3>
                <p className="text-xs text-white/30">{viewReg.fecha} — {viewReg.turno}</p>
              </div>
              <button onClick={() => setViewReg(null)} className="text-white/40 hover:text-white/70"><X size={18} /></button>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Fecha', value: viewReg.fecha },
                { label: 'Turno', value: viewReg.turno },
                { label: 'N° de ronda', value: viewReg.nroRonda || '—' },
                { label: 'Cliente / Objetivo', value: viewReg.clienteObjetivo },
                { label: 'Dirección', value: viewReg.direccionObjetivo || '—' },
                { label: 'Nivel de criticidad', value: viewReg.nivelCriticidad },
                { label: 'Vigilador', value: viewReg.vigiladorNombre },
                { label: 'Legajo', value: viewReg.legajo || '—' },
                { label: 'Supervisor de zona', value: viewReg.supervisorZona },
                { label: 'Código QR', value: viewReg.codigoQR || '—' },
                { label: 'Punto de control', value: viewReg.nombrePunto || '—' },
                { label: 'Sector / Zona', value: viewReg.sectorZona || '—' },
                { label: 'Hora programada', value: viewReg.horaProgramada || '—' },
                { label: 'Hora real escaneo', value: viewReg.horaRealEscaneo || '—' },
                { label: '¿Escaneo OK?', value: viewReg.escaneoOk },
                { label: '¿Hay novedad?', value: viewReg.hayNovedad },
                { label: 'Ítems verificados', value: viewReg.itemsVerificados.length > 0 ? viewReg.itemsVerificados.join(', ') : '—' },
                { label: 'Observaciones', value: viewReg.observaciones || 'Sin observaciones' },
                { label: 'Email supervisor', value: viewReg.emailSupervisor },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="text-xs font-semibold text-white/40 w-40 shrink-0">{row.label}</span>
                  <span className={cn('text-sm flex-1',
                    row.label === '¿Hay novedad?' && viewReg.hayNovedad.startsWith('SI') ? 'text-red-400 font-semibold' : 'text-white'
                  )}>{row.value}</span>
                </div>
              ))}
            </div>

            {viewReg.firmaUrl && (
              <div>
                <p className="text-xs font-semibold text-white/50 mb-2">Firma digital del vigilador</p>
                <img src={viewReg.firmaUrl} alt="Firma" className="h-20 rounded-xl bg-white/5 border border-white/10 p-2" />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => openRondaMailto(viewReg)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                <Mail size={14} /> Enviar por Email
              </button>
              <button onClick={() => setViewReg(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR NOTIFICACIÓN EMAIL ── */}
      {showEmailModal && pendingReg && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div
            className="bg-[#0d1117] rounded-2xl border border-emerald-500/20 w-full max-w-sm p-6 space-y-5 shadow-2xl shadow-black/60"
            style={{ animation: 'slideUp 0.22s cubic-bezier(0.22,1,0.36,1)' }}
          >
            {/* Icon + título */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <Check size={28} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">✅ Ronda guardada</h3>
                <p className="text-xs text-white/40 mt-1">¿Querés notificar a QHSE?</p>
              </div>
            </div>

            {/* Resumen de la ronda */}
            <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 space-y-1">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2">Ronda registrada</p>
              <p className="text-xs text-white/70">📌 <span className="text-white font-semibold">{pendingReg.nombrePunto || pendingReg.clienteObjetivo}</span></p>
              <p className="text-xs text-white/50">👤 {pendingReg.vigiladorNombre}{pendingReg.legajo ? ` · Leg. ${pendingReg.legajo}` : ''}</p>
              <p className="text-xs text-white/50">🔄 {pendingReg.turno}</p>
              <p className="text-xs text-white/50">📅 {pendingReg.fecha}</p>
              {pendingReg.hayNovedad.startsWith('SI') && (
                <p className="text-xs text-red-400 font-semibold mt-1.5">⚠ Hay novedad en este punto</p>
              )}
            </div>

            {/* QHSE info */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5">
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">📧 Notificar a QHSE</p>
              <p className="text-[10px] text-white/40">plaudari.qhse@spiseguridad.com.ar</p>
              <p className="text-[10px] text-white/30">CC: controlderondas · itorres</p>
            </div>

            {/* Botones */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleEmailModalClose(false, true)}
                className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Mail size={16} />
                📧 Notificar a QHSE
              </button>
              <button
                onClick={() => handleEmailModalClose(true, false)}
                className="w-full py-2.5 rounded-xl bg-emerald-700/60 hover:bg-emerald-700 text-white/80 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Mail size={14} />
                Notificar solo supervisores
              </button>
              <button
                onClick={() => handleEmailModalClose(false, false)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 text-sm font-medium transition-colors"
              >
                No enviar notificación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RondasForm;
