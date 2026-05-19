import React, { useEffect, useState } from 'react';
import {
  QrCode, Users, Shield, Clock, ChevronRight,
  Wifi, WifiOff, LayoutDashboard, ClipboardCheck, Copy, CheckCheck,
} from 'lucide-react';
import type { ModuleId } from '../App';

interface MobileLandingProps {
  onNavigate: (id: ModuleId) => void;
}

// ── QR Card con código real escaneable ───────────────────────────────────────
interface QRCardProps {
  label: string;
  sublabel: string;
  color: 'emerald' | 'sky' | 'violet';
  url: string;
}

const QRCard: React.FC<QRCardProps> = ({ label, sublabel, color, url }) => {
  const [copied, setCopied] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  // QR real via API pública — codifica la URL exacta
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(url)}`;

  const borderColor = {
    emerald: 'border-emerald-500/25',
    sky: 'border-sky-500/25',
    violet: 'border-violet-500/25',
  }[color];

  const accentText = {
    emerald: 'text-emerald-400',
    sky: 'text-sky-400',
    violet: 'text-violet-400',
  }[color];

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className={`rounded-2xl border bg-white/3 ${borderColor} p-5 flex flex-col items-center gap-3`}>

      {/* QR real */}
      <div className="bg-white p-2.5 rounded-xl shadow-lg">
        {imgOk ? (
          <img
            src={qrSrc}
            alt={`QR ${label}`}
            width={150}
            height={150}
            className="block rounded"
            onError={() => setImgOk(false)}
          />
        ) : (
          // Fallback si no hay internet para cargar el QR
          <div className="w-[150px] h-[150px] flex flex-col items-center justify-center gap-2 text-black/40">
            <QrCode size={40} />
            <p className="text-[10px] text-center font-medium px-2">Sin conexión — usá el link</p>
          </div>
        )}
      </div>

      {/* Label y URL */}
      <div className="text-center">
        <p className={`text-sm font-bold ${accentText}`}>{label}</p>
        <p className="text-[10px] text-white/40 mt-0.5">{sublabel}</p>
        <p className="text-[9px] text-white/20 mt-1.5 break-all font-mono">{url}</p>
      </div>

      {/* Botones */}
      <div className="flex gap-2 w-full">
        <button
          onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
            copied
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
          }`}
        >
          {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
          {copied ? '¡Copiado!' : 'Copiar link'}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${borderColor} bg-white/5 ${accentText} hover:bg-white/10 transition-all`}
        >
          Abrir →
        </a>
      </div>
    </div>
  );
};

// ── MAIN ─────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://secureops-dashboard-7890.taskade.app';

const MobileLanding: React.FC<MobileLandingProps> = ({ onNavigate }) => {
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    const goOn = () => setOnline(true);
    const goOff = () => setOnline(false);
    window.addEventListener('online', goOn);
    window.addEventListener('offline', goOff);
    return () => {
      clearInterval(tick);
      window.removeEventListener('online', goOn);
      window.removeEventListener('offline', goOff);
    };
  }, []);

  const hora = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const fecha = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const turno = () => {
    const h = now.getHours();
    if (h >= 7 && h < 15) return { label: 'Turno Mañana', horario: '07:00 – 15:00' };
    if (h >= 15 && h < 23) return { label: 'Turno Tarde', horario: '15:00 – 23:00' };
    return { label: 'Turno Noche', horario: '19:00 – 07:00' };
  };
  const t = turno();

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col" style={{ WebkitTapHighlightColor: 'transparent' }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Shield size={17} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">SPI S.A.</p>
            <p className="text-[10px] text-white/35 mt-0.5">Seguridad Privada Integral</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium ${online ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
          {online ? <Wifi size={10} /> : <WifiOff size={10} />}
          {online ? 'En línea' : 'Sin conexión'}
        </div>
      </div>

      {/* ── CLOCK ── */}
      <div className="px-5 py-5 text-center">
        <p className="text-6xl font-black text-white tabular-nums tracking-tight">
          {hora}
        </p>
        <p className="text-sm text-white/40 mt-2 capitalize">{fecha}</p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/8">
          <Clock size={11} className="text-white/35" />
          <span className="text-xs text-white/45 font-medium">{t.label} · {t.horario}</span>
        </div>
      </div>

      {/* ── FORMULARIOS OPERATIVOS ── */}
      <div className="px-5 mb-3">
        <p className="text-[10px] text-white/25 uppercase tracking-[0.15em] font-bold text-center">
          Formularios operativos
        </p>
      </div>

      <div className="px-4 space-y-3">

        {/* Control de Rondas */}
        <button
          onClick={() => onNavigate('rondasform')}
          className="w-full text-left rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] active:bg-emerald-500/20 transition-colors"
        >
          <div className="flex items-center gap-4 p-5">
            <div className="w-13 h-13 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 p-3">
              <QrCode size={26} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white leading-tight">Control de Rondas</p>
              <p className="text-xs text-emerald-400/80 font-medium mt-0.5">con QR — SPI S.A.</p>
              <p className="text-[11px] text-white/28 mt-1.5">Turno · Punto QR · Novedades · Firma</p>
            </div>
            <ChevronRight size={20} className="text-emerald-500/35 shrink-0" />
          </div>
        </button>

        {/* Control de Presentismo */}
        <button
          onClick={() => onNavigate('presentismo')}
          className="w-full text-left rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] active:bg-sky-500/20 transition-colors"
        >
          <div className="flex items-center gap-4 p-5">
            <div className="w-13 h-13 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0 p-3">
              <Users size={26} className="text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white leading-tight">Control de Presentismo</p>
              <p className="text-xs text-sky-400/80 font-medium mt-0.5">Registro de asistencia — SPI</p>
              <p className="text-[11px] text-white/28 mt-1.5">Nombre · DNI · Foto · Ingreso · Egreso · Firma</p>
            </div>
            <ChevronRight size={20} className="text-sky-500/35 shrink-0" />
          </div>
        </button>

        {/* Supervisión Operativa */}
        <button
          onClick={() => onNavigate('supervision-operativa')}
          className="w-full text-left rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] active:bg-violet-500/20 transition-colors"
        >
          <div className="flex items-center gap-4 p-5">
            <div className="w-13 h-13 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0 p-3">
              <ClipboardCheck size={26} className="text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white leading-tight">Supervisión Operativa</p>
              <p className="text-xs text-violet-400/80 font-medium mt-0.5">Checklist de control — SPI S.A.</p>
              <p className="text-[11px] text-white/28 mt-1.5">Objetivo · Personal · Cumplimiento · Firma</p>
            </div>
            <ChevronRight size={20} className="text-violet-500/35 shrink-0" />
          </div>
        </button>

        {/* Panel completo (supervisores) */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-full text-left rounded-2xl border border-white/8 bg-white/[0.02] active:bg-white/8 transition-colors"
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <LayoutDashboard size={18} className="text-white/35" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white/55">Panel SGC completo</p>
              <p className="text-[11px] text-white/25 mt-0.5">Solo supervisores · Dashboard · NC · CCTV · Reporte</p>
            </div>
            <ChevronRight size={16} className="text-white/18 shrink-0" />
          </div>
        </button>
      </div>

      {/* ── SECCIÓN QR ── */}
      <div className="px-5 mt-8 mb-3">
        <div className="flex items-center gap-2">
          <QrCode size={13} className="text-white/25" />
          <p className="text-[10px] text-white/25 uppercase tracking-[0.15em] font-bold">
            Acceso Rápido — Códigos QR
          </p>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <p className="text-[11px] text-white/20 mt-1.5 text-center">
          Imprimí y pegá en cada puesto de guardia
        </p>
      </div>

      <div className="px-4 grid grid-cols-1 gap-3 mb-4">
        <QRCard
          label="Control de Rondas QR"
          sublabel="Escaneá para registrar la ronda"
          color="emerald"
          url={`${BASE_URL}/#rondas`}
        />
        <QRCard
          label="Control de Presentismo"
          sublabel="Escaneá para registrar asistencia"
          color="sky"
          url={`${BASE_URL}/#presentismo`}
        />
        <QRCard
          label="Supervisión Operativa"
          sublabel="Escaneá para completar el checklist"
          color="violet"
          url={`${BASE_URL}/#supervision`}
        />
      </div>

      {/* ── FOOTER ── */}
      <div className="px-5 py-6 text-center">
        <p className="text-[10px] text-white/15">SPI S.A. · Sistema de Gestión de Calidad · ISO 9001:2015</p>
      </div>
    </div>
  );
};

export default MobileLanding;
