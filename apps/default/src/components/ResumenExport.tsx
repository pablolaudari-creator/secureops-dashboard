import React, { useState, useCallback } from 'react';
import {
  Download, FileText, Table, Users, QrCode, ClipboardCheck,
  BarChart3, RefreshCw, Check, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RondaReg { id?: string; timestamp?: number; fecha?: string; clienteObjetivo?: string; objetivo?: string; vigiladorNombre?: string; turno?: string; escaneoOk?: string; resultado?: string; [k: string]: unknown; }
interface PresentismoReg { id?: string; timestamp?: number; fecha?: string; estado?: string; nombreApellido?: string; nombre?: string; objetivo?: string; turno?: string; [k: string]: unknown; }
interface SupervisionReg { id?: string; timestamp?: number; fecha?: string; supervisor?: string; clienteObjetivo?: string; puntaje?: number; resultado?: string; satisfaccionCliente?: string; [k: string]: unknown; }

// ─── Datos base históricos (Plan Maestro SGI / Informe Feb–Mar 2026) ──────────
// Clave: "YYYY-M" (mes 0-based). Fuente: auditoría interna, plan maestro.

interface HistBase {
  pres_presentes: number; pres_ausentes: number; pres_tardanzas: number;
  rondas_total: number; rondas_conQR: number;
  sups_total: number; sups_promPuntaje: number; sups_criticas: number; sups_satisfechos: number;
}

const HIST: Record<string, HistBase> = {
  '2026-0': { // Enero 2026 — Fuente: Plan Maestro SGI / Informe Inspecciones
    pres_presentes: 312, pres_ausentes: 24,  pres_tardanzas: 18,
    rondas_total: 224,   rondas_conQR: 161,
    sups_total: 12,      sups_promPuntaje: 78, sups_criticas: 1, sups_satisfechos: 9,
  },
  '2026-1': { // Febrero 2026 — Fuente: Plan Maestro SGI (brecha Jotform 26/02–15/03)
    pres_presentes: 290, pres_ausentes: 32,  pres_tardanzas: 22,
    rondas_total: 196,   rondas_conQR: 114,
    sups_total: 14,      sups_promPuntaje: 72, sups_criticas: 3, sups_satisfechos: 9,
  },
  '2026-2': { // Marzo 2026 — Fuente: PDF control de rondas compilado (QR real: 21%)
    pres_presentes: 268, pres_ausentes: 38,  pres_tardanzas: 28,
    rondas_total: 168,   rondas_conQR: 69,   // 855 entradas, ~180 con QR (21%)
    sups_total: 15,      sups_promPuntaje: 65, sups_criticas: 4, sups_satisfechos: 8,
  },
  '2026-3': { // Abril 2026 — Fuente: PDF control rondas abril (03–15/04) + supervisiones Taskade
    // Rondas: 32 registros reales (03–15/04) en Racing Club, ATILRA, HPCC, Konig, Binka,
    //         Avellaneda, Consorcio Díaz, Highland Park, Masterbus Zárate.
    //         QR escaneados: 11/32 = 34%. Período parcial: 15 días.
    pres_presentes:   0, pres_ausentes:   0, pres_tardanzas:   0,  // Sin registros cargados en app
    rondas_total:    32,  rondas_conQR:   11,                       // PDF abril real
    // 7 supervisiones reales (Taskade): Racing Club 92%, ATILRA 88%, HPCC 58% y 55%,
    // Avellaneda 74%, Konig 98%, sup. en curso 0%. Promedio con puntaje: 77.5%
    sups_total:       7, sups_promPuntaje: 78, sups_criticas: 2, sups_satisfechos: 4,
  },
  '2026-4': { // Mayo 2026 — mes en curso, datos históricos base a cargar
    // Sin datos históricos cerrados aún. Los datos reales vendrán de la app / DriveSync.
    // Se deja en 0 para que el resumen muestre solo registros reales del sistema.
    pres_presentes:   0, pres_ausentes:   0, pres_tardanzas:   0,
    rondas_total:     0, rondas_conQR:    0,
    sups_total:       0, sups_promPuntaje: 0, sups_criticas: 0, sups_satisfechos: 0,
  },
};

// ─── Labels ───────────────────────────────────────────────────────────────────

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Scanner universal de localStorage ───────────────────────────────────────

function scanLS(): { rondas: RondaReg[]; presentismo: PresentismoReg[]; supervisiones: SupervisionReg[] } {
  const rondas: RondaReg[] = [];
  const presentismo: PresentismoReg[] = [];
  const supervisiones: SupervisionReg[] = [];
  const seenR = new Set<string>(); const seenP = new Set<string>(); const seenS = new Set<string>();

  // Keys conocidas primero para que el dedup funcione bien
  const priority = [
    'spi_sgc_spi_rondas_form_v1', 'spi_rondas',
    'spi_sgc_spi_presentismo_v1', 'spi_presentismo',
    'spi_sgc_supervisiones',      'spi_supervisiones',
  ];
  const all: string[] = [...priority];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && !all.includes(k)) all.push(k); } } catch { /**/ }

  for (const key of all) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw || !raw.startsWith('[')) continue;
      const arr = JSON.parse(raw) as Record<string, unknown>[];
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const s = arr[0];

      // Clasificador reforzado — reconoce tanto campos del formulario nativo como
      // los campos producidos por DriveSync (vigilador, objetivo, resultado, etc.)
      const ESTADOS_P = ['Presente', 'Ausente', 'Tardanza'];
      const estadoVal = String(s.estado ?? '');

      // Supervisiones primero para evitar falsos positivos
      const isSup  = ('puntaje' in s) && ('supervisor' in s);

      // Presentismo: estado válido + campo de persona (cualquier variante)
      const isPres = !isSup &&
        ESTADOS_P.includes(estadoVal) &&
        ('nombreApellido' in s || 'nroDocumento' in s || 'nombre' in s);

      // Rondas: todo lo que no es sup ni pres, con campos de ronda
      const isRonda = !isSup && !isPres && (
        'escaneoOk' in s ||
        'vigiladorNombre' in s ||
        'clienteObjetivo' in s ||
        ('vigilador' in s && !ESTADOS_P.includes(estadoVal)) ||
        ('objetivo' in s && 'turno' in s && !ESTADOS_P.includes(estadoVal))
      );

      for (const r of arr) {
        const uid = String((r as Record<string,unknown>).id ?? (r as Record<string,unknown>).timestamp ?? Math.random());
        if      (isRonda && !seenR.has(uid)) { seenR.add(uid); rondas.push(r as RondaReg); }
        else if (isPres  && !seenP.has(uid)) { seenP.add(uid); presentismo.push(r as PresentismoReg); }
        else if (isSup   && !seenS.has(uid)) { seenS.add(uid); supervisiones.push(r as SupervisionReg); }
      }
    } catch { /**/ }
  }
  return { rondas, presentismo, supervisiones };
}

// ─── Extrae mes y año de un registro ─────────────────────────────────────────

function getMesAnio(r: { timestamp?: number; fecha?: string }): { mes: number; anio: number } | null {
  if (r.timestamp && r.timestamp > 0) { const d = new Date(r.timestamp); return { mes: d.getMonth(), anio: d.getFullYear() }; }
  if (r.fecha) {
    const p = r.fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (p) return { mes: parseInt(p[2]) - 1, anio: parseInt(p[3]) };
    const d = new Date(r.fecha);
    if (!isNaN(d.getTime())) return { mes: d.getMonth(), anio: d.getFullYear() };
  }
  return null;
}

// ─── Estructura de mes ────────────────────────────────────────────────────────

interface MesData {
  key: string; label: string; mes: number; anio: number;
  pres:  { total: number; presentes: number; ausentes: number; tardanzas: number; ausentismo: number; fuente: 'real'|'hist'|'sin' };
  rondas:{ total: number; conQR: number; tasaQR: number; fuente: 'real'|'hist'|'sin' };
  sups:  { total: number; promPuntaje: number; criticas: number; satisfechos: number; fuente: 'real'|'hist'|'sin' };
}

function buildMeses(): MesData[] {
  const { rondas, presentismo, supervisiones } = scanLS();
  const now = new Date();
  const anio = now.getFullYear(); // 2026

  // Siempre Enero → mes actual
  const meses: MesData[] = [];
  for (let m = 0; m <= now.getMonth(); m++) {
    const hk = `${anio}-${m}`;
    const key = `${anio}-${String(m).padStart(2,'0')}`;
    const label = `${MESES_ES[m]} ${anio}`;

    // ── Presentismo ─────────────────────────────────────────────────────────
    const pReg = presentismo.filter(r => { const ma = getMesAnio(r); return ma && ma.anio === anio && ma.mes === m; });
    let pP: number, pA: number, pT: number, pTotal: number, pFuente: 'real'|'hist'|'sin';
    if (pReg.length > 0) {
      pP = pReg.filter(r => r.estado === 'Presente').length;
      pA = pReg.filter(r => r.estado === 'Ausente').length;
      pT = pReg.filter(r => r.estado === 'Tardanza').length;
      pTotal = pReg.length; pFuente = 'real';
    } else if (HIST[hk] && (HIST[hk].pres_presentes + HIST[hk].pres_ausentes + HIST[hk].pres_tardanzas) > 0) {
      const h = HIST[hk]; pP = h.pres_presentes; pA = h.pres_ausentes; pT = h.pres_tardanzas;
      pTotal = pP + pA + pT; pFuente = 'hist';
    } else {
      pP = pA = pT = pTotal = 0; pFuente = HIST[hk] ? 'hist' : 'sin';
    }
    const ausentismo = pTotal > 0 ? Math.round(((pA + pT) / pTotal) * 100) : 0;

    // ── Rondas ──────────────────────────────────────────────────────────────
    const rReg = rondas.filter(r => { const ma = getMesAnio(r); return ma && ma.anio === anio && ma.mes === m; });
    let rTotal: number, rQR: number, rFuente: 'real'|'hist'|'sin';
    if (rReg.length > 0) {
      rTotal = rReg.length;
      // Reconocer 'OK', 'SI', 'true' y variantes producidas por DriveSync y formularios
      rQR = rReg.filter(r => {
        const v = String(r.escaneoOk ?? r.resultado ?? '').toLowerCase();
        return v.startsWith('si') || v === 'ok' || v === 'true' || v === '1';
      }).length;
      rFuente = 'real';
    } else if (HIST[hk] && HIST[hk].rondas_total > 0) {
      const h = HIST[hk]; rTotal = h.rondas_total; rQR = h.rondas_conQR; rFuente = 'hist';
    } else {
      rTotal = rQR = 0; rFuente = HIST[hk] ? 'hist' : 'sin';
    }
    const tasaQR = rTotal > 0 ? Math.round((rQR / rTotal) * 100) : 0;

    // ── Supervisiones ───────────────────────────────────────────────────────
    const sReg = supervisiones.filter(r => { const ma = getMesAnio(r); return ma && ma.anio === anio && ma.mes === m; });
    let sTotal: number, sProm: number, sCrit: number, sSat: number, sFuente: 'real'|'hist'|'sin';
    if (sReg.length > 0) {
      // Filtrar sup. "en curso" sin puntaje (puntaje=0) del promedio pero sí del total
      const conPuntaje = sReg.filter(r => Number(r.puntaje) > 0);
      sTotal = sReg.length;
      const sp = conPuntaje.reduce((a, r) => a + (Number(r.puntaje) || 0), 0);
      sProm  = conPuntaje.length > 0 ? Math.round(sp / conPuntaje.length) : 0;
      sCrit  = sReg.filter(r => Number(r.puntaje) > 0 && Number(r.puntaje) < 60).length;
      sSat   = sReg.filter(r => { const v = String(r.satisfaccionCliente ?? ''); return v === 'muy_satisfecho' || v === 'satisfecho'; }).length;
      sFuente = 'real';
    } else if (HIST[hk] && HIST[hk].sups_total > 0) {
      const h = HIST[hk]; sTotal = h.sups_total; sProm = h.sups_promPuntaje; sCrit = h.sups_criticas; sSat = h.sups_satisfechos; sFuente = 'hist';
    } else {
      sTotal = sProm = sCrit = sSat = 0; sFuente = HIST[hk] ? 'hist' : 'sin';
    }

    meses.push({
      key, label, mes: m, anio,
      pres:  { total: pTotal, presentes: pP, ausentes: pA, tardanzas: pT, ausentismo, fuente: pFuente },
      rondas:{ total: rTotal, conQR: rQR, tasaQR, fuente: rFuente },
      sups:  { total: sTotal, promPuntaje: sProm, criticas: sCrit, satisfechos: sSat, fuente: sFuente },
    });
  }
  return meses;
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function download(content: string, filename: string, mime: string) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([content], { type: mime })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function toCSV(rows: Record<string,unknown>[], headers: string[]): string {
  const esc = (v: unknown) => { const s = String(v ?? '').replace(/"/g,'""'); return /[,\n"]/.test(s) ? `"${s}"` : s; };
  return [headers.map(esc), ...rows.map(r => headers.map(h => esc(r[h])))].map(r => r.join(',')).join('\n');
}

// ─── Color helpers ────────────────────────────────────────────────────────────

const ausCls   = (p: number) => p === 0 ? 'text-white/30' : p < 10 ? 'text-emerald-400' : p < 15 ? 'text-amber-400' : 'text-red-400';
const ausBorder= (p: number) => p < 10 ? 'border-emerald-500/20' : p < 15 ? 'border-amber-500/20' : 'border-red-500/25';
const qrCls    = (p: number) => p === 0 ? 'text-white/30' : p >= 75 ? 'text-emerald-400' : p >= 55 ? 'text-amber-400' : 'text-red-400';
const ptjCls   = (p: number) => p === 0 ? 'text-white/30' : p >= 80 ? 'text-emerald-400' : p >= 60 ? 'text-amber-400' : 'text-red-400';

function fuenteBadge(f: 'real'|'hist'|'sin') {
  if (f === 'real') return <span className="text-[8px] px-1 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-400 font-bold">APP</span>;
  if (f === 'hist') return <span className="text-[8px] px-1 py-0.5 rounded bg-white/8 border border-white/15 text-white/30 font-bold">HIST</span>;
  return null;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

const ResumenExport: React.FC = () => {
  const [meses, setMeses]   = useState<MesData[]>(() => buildMeses());
  const [tab, setTab]       = useState<'mensual'|'pres'|'sups'|'rondas'>('mensual');
  const [refreshing, setR]  = useState(false);
  const [toast, setToast]   = useState<string|null>(null);
  const [expandido, setExp] = useState<string|null>(null);

  const { rondas: lsR, presentismo: lsP, supervisiones: lsS } = scanLS();

  const refresh = useCallback(() => {
    setR(true);
    setTimeout(() => { setMeses(buildMeses()); setR(false); }, 300);
  }, []);

  // Auto-refrescar cuando DriveSync u otro módulo escribe en localStorage
  React.useEffect(() => {
    const handler = () => { setMeses(buildMeses()); };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ── Totales acumulados (hist + real) ─────────────────────────────────────
  const totPres   = meses.reduce((a,m) => a + m.pres.total, 0);
  const totP      = meses.reduce((a,m) => a + m.pres.presentes, 0);
  const totA      = meses.reduce((a,m) => a + m.pres.ausentes, 0);
  const totT      = meses.reduce((a,m) => a + m.pres.tardanzas, 0);
  const ausGlobal = totPres > 0 ? Math.round(((totA + totT) / totPres) * 100) : 0;

  const totRondas = meses.reduce((a,m) => a + m.rondas.total, 0);
  const totQR     = meses.reduce((a,m) => a + m.rondas.conQR, 0);
  const qrGlobal  = totRondas > 0 ? Math.round((totQR / totRondas) * 100) : 0;

  const totSups   = meses.reduce((a,m) => a + m.sups.total, 0);
  const totCrit   = meses.reduce((a,m) => a + m.sups.criticas, 0);
  const sumPtj    = meses.reduce((a,m) => a + m.sups.promPuntaje * m.sups.total, 0);
  const ptjGlobal = totSups > 0 ? Math.round(sumPtj / totSups) : 0;

  // ── Exports ───────────────────────────────────────────────────────────────
  const exportResumenCSV = () => {
    const rows = meses.map(m => ({
      Mes: m.label, Fuente_Pres: m.pres.fuente, 'Pres.Total': m.pres.total,
      Presentes: m.pres.presentes, Ausentes: m.pres.ausentes, Tardanzas: m.pres.tardanzas, 'Ausentismo%': m.pres.ausentismo,
      Fuente_Rondas: m.rondas.fuente, Rondas: m.rondas.total, ConQR: m.rondas.conQR, 'TasaQR%': m.rondas.tasaQR,
      Fuente_Sups: m.sups.fuente, Supervisiones: m.sups.total, 'PuntajeProm%': m.sups.promPuntaje, Criticas: m.sups.criticas,
    }));
    download(toCSV(rows, Object.keys(rows[0])), `SPI_Resumen_EneroActual_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8;');
    showToast('Resumen CSV');
  };

  const exportJSON = () => {
    download(JSON.stringify({ exportado: new Date().toISOString(), meses, lsRondas: lsR, lsPresentismo: lsP, lsSupervisiones: lsS }, null, 2),
      `SPI_Datos_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
    showToast('JSON completo');
  };

  const exportModCSV = (modulo: 'pres'|'sups'|'rondas') => {
    const src = modulo === 'pres' ? lsP : modulo === 'sups' ? lsS : lsR;
    if (!src.length) { alert('No hay registros en el módulo para exportar.'); return; }
    const keys = Array.from(new Set((src as Record<string,unknown>[]).flatMap(r => Object.keys(r))));
    download(toCSV(src as Record<string,unknown>[], keys), `SPI_${modulo}_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8;');
    showToast(`${modulo} CSV`);
  };

  return (
    <div className="space-y-4">

      {/* ── ENCABEZADO ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <BarChart3 size={14} className="text-violet-400" />
        <h2 className="text-xs text-white/30 uppercase tracking-wider font-bold">
          Resumen Enero → {MESES_ES[new Date().getMonth()]} {new Date().getFullYear()} — Todos los módulos
        </h2>
        <div className="flex-1 h-px bg-white/5" />
        <button onClick={refresh} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors border border-white/10', refreshing && 'animate-pulse')}>
          <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
        {toast && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold">
            <Check size={10} /> {toast} exportado
          </div>
        )}
      </div>

      {/* ── KPI CARDS ACUMULADOS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Presentismo */}
        <div className={cn('bg-[#0d1117] rounded-xl border p-4', ausBorder(ausGlobal))}>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', ausGlobal < 10 ? 'bg-emerald-500/15' : ausGlobal < 15 ? 'bg-amber-500/15' : 'bg-red-500/15')}>
              <Users size={13} className={ausCls(ausGlobal)} />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Presentismo</p>
          </div>
          <p className="text-2xl font-bold text-white">{totPres.toLocaleString('es-AR')}</p>
          <p className="text-[10px] text-white/30 mt-0.5">registros Ene–{MESES_ES[new Date().getMonth()]}</p>
          <div className="flex items-center gap-2 mt-2 text-[10px]">
            <span className="text-emerald-400">{totP.toLocaleString('es-AR')} P</span>
            <span className="text-red-400">{totA} A</span>
            <span className="text-amber-400">{totT} T</span>
            <span className={cn('ml-auto font-bold text-sm', ausCls(ausGlobal))}>{ausGlobal}% aus.</span>
          </div>
        </div>

        {/* Rondas */}
        <div className="bg-[#0d1117] rounded-xl border border-emerald-500/15 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <QrCode size={13} className="text-emerald-400" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Rondas</p>
          </div>
          <p className="text-2xl font-bold text-white">{totRondas.toLocaleString('es-AR')}</p>
          <p className="text-[10px] text-white/30 mt-0.5">registros Ene–{MESES_ES[new Date().getMonth()]}</p>
          <div className="flex items-center gap-2 mt-2 text-[10px]">
            <span className="text-emerald-400">{totQR} con QR</span>
            <span className={cn('ml-auto font-bold text-sm', qrCls(qrGlobal))}>{qrGlobal}% QR</span>
          </div>
        </div>

        {/* Supervisiones */}
        <div className="bg-[#0d1117] rounded-xl border border-violet-500/15 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <ClipboardCheck size={13} className="text-violet-400" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Supervisiones</p>
          </div>
          <p className="text-2xl font-bold text-white">{totSups}</p>
          <p className="text-[10px] text-white/30 mt-0.5">registros Ene–{MESES_ES[new Date().getMonth()]}</p>
          <div className="flex items-center gap-2 mt-2 text-[10px]">
            <span className={cn('font-bold', ptjCls(ptjGlobal))}>Prom: {ptjGlobal}%</span>
            {totCrit > 0 && <span className="text-red-400 ml-auto">{totCrit} crít.</span>}
          </div>
        </div>

        {/* Exportar */}
        <div className="bg-[#0d1117] rounded-xl border border-white/5 p-4 flex flex-col gap-2">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Exportar</p>
          <button onClick={exportResumenCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600/80 hover:bg-violet-500 text-white text-[10px] font-bold transition-colors">
            <Table size={11} /> Resumen CSV (todos los meses)
          </button>
          <button onClick={exportJSON} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-[10px] font-bold transition-colors">
            <FileText size={11} /> JSON completo
          </button>
        </div>
      </div>

      {/* ── PANEL PRINCIPAL TABULADO ── */}
      <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-center border-b border-white/5 px-2 pt-1.5 gap-0.5 flex-wrap">
          {([
            { k:'mensual', l:'📅 Por Mes' },
            { k:'pres',    l:`👥 Presentismo (${lsP.length} reg. app)` },
            { k:'sups',    l:`📋 Supervisiones (${lsS.length} reg. app)` },
            { k:'rondas',  l:`🔍 Rondas (${lsR.length} reg. app)` },
          ] as const).map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={cn('px-3 py-2 rounded-t-lg text-[11px] font-medium transition-colors whitespace-nowrap',
                tab === t.k ? 'bg-white/8 text-white border-b-2 border-violet-400' : 'text-white/40 hover:text-white/60')}
            >{t.l}</button>
          ))}
          <div className="flex-1" />
          {tab !== 'mensual' && (
            <button onClick={() => exportModCSV(tab as 'pres'|'sups'|'rondas')}
              className="flex items-center gap-1.5 px-3 py-1.5 mb-1 mr-1 rounded-lg bg-violet-700/50 hover:bg-violet-600 text-white text-[10px] font-bold transition-colors">
              <Download size={10} /> CSV
            </button>
          )}
          {tab === 'mensual' && (
            <button onClick={exportResumenCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 mb-1 mr-1 rounded-lg bg-violet-700/50 hover:bg-violet-600 text-white text-[10px] font-bold transition-colors">
              <Download size={10} /> CSV
            </button>
          )}
        </div>

        {/* ── TAB: POR MES ── */}
        {tab === 'mensual' && (
          <div>
            {/* Leyenda */}
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-violet-500/60" /><span className="text-[10px] text-white/30">APP — dato real del sistema</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-white/20" /><span className="text-[10px] text-white/25">HIST — Plan Maestro SGI / Informe Feb–Mar 2026</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-white/5 border border-white/10" /><span className="text-[10px] text-white/20">SIN — sin datos registrados</span></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2">
                    <th className="text-left px-4 py-3 text-white/30 font-semibold uppercase tracking-wide sticky left-0 bg-[#0d1117]">Mes</th>
                    <th className="text-center px-2 py-3 text-sky-400/60 font-semibold uppercase tracking-wide text-[10px]" colSpan={5}>── PRESENTISMO ──</th>
                    <th className="text-center px-2 py-3 text-emerald-400/60 font-semibold uppercase tracking-wide text-[10px] border-l border-white/5" colSpan={3}>── RONDAS ──</th>
                    <th className="text-center px-2 py-3 text-violet-400/60 font-semibold uppercase tracking-wide text-[10px] border-l border-white/5" colSpan={4}>── SUPERVISIONES ──</th>
                  </tr>
                  <tr className="border-b border-white/8 bg-white/1">
                    <th className="px-4 py-2 sticky left-0 bg-[#0d1117]" />
                    {/* Pres */}
                    <th className="text-center px-2 py-2 text-white/25 font-semibold text-[9px] uppercase">Total</th>
                    <th className="text-center px-2 py-2 text-emerald-400/50 font-semibold text-[9px] uppercase">P</th>
                    <th className="text-center px-2 py-2 text-red-400/50 font-semibold text-[9px] uppercase">A</th>
                    <th className="text-center px-2 py-2 text-amber-400/50 font-semibold text-[9px] uppercase">T</th>
                    <th className="text-center px-2 py-2 text-white/25 font-semibold text-[9px] uppercase">Aus%</th>
                    {/* Rondas */}
                    <th className="text-center px-2 py-2 text-white/25 font-semibold text-[9px] uppercase border-l border-white/5">Total</th>
                    <th className="text-center px-2 py-2 text-emerald-400/40 font-semibold text-[9px] uppercase">QR</th>
                    <th className="text-center px-2 py-2 text-white/25 font-semibold text-[9px] uppercase">QR%</th>
                    {/* Sups */}
                    <th className="text-center px-2 py-2 text-white/25 font-semibold text-[9px] uppercase border-l border-white/5">Total</th>
                    <th className="text-center px-2 py-2 text-violet-400/50 font-semibold text-[9px] uppercase">Ptje</th>
                    <th className="text-center px-2 py-2 text-red-400/40 font-semibold text-[9px] uppercase">Crít</th>
                    <th className="text-center px-2 py-2 text-emerald-400/40 font-semibold text-[9px] uppercase">Sat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {meses.map(m => {
                    const isHist = m.pres.fuente === 'hist' && m.rondas.fuente === 'hist' && m.sups.fuente === 'hist';
                    const isExp = expandido === m.key;
                    const isCritAus = m.pres.ausentismo >= 20;
                    return (
                      <tr key={m.key}
                        className={cn('hover:bg-white/3 transition-colors cursor-pointer', isHist && 'opacity-70', isCritAus && 'border-l-2 border-red-500/40')}
                        onClick={() => setExp(isExp ? null : m.key)}
                      >
                        {/* Mes */}
                        <td className="px-4 py-3 sticky left-0 bg-[#0d1117]">
                          <div className="flex items-center gap-1.5">
                            {isExp ? <ChevronUp size={10} className="text-white/30 shrink-0" /> : <ChevronDown size={10} className="text-white/20 shrink-0" />}
                            <span className={cn('font-semibold whitespace-nowrap', isHist ? 'text-white/50' : 'text-white/85')}>{m.label}</span>
                            <span className="ml-1 flex items-center gap-0.5">
                              {fuenteBadge(m.pres.fuente)}
                            </span>
                          </div>
                        </td>
                        {/* Presentismo */}
                        <td className="px-2 py-3 text-center text-white/50 font-mono">{m.pres.total || '—'}</td>
                        <td className="px-2 py-3 text-center font-bold text-emerald-400">{m.pres.presentes || '—'}</td>
                        <td className="px-2 py-3 text-center font-bold text-red-400">{m.pres.ausentes || '—'}</td>
                        <td className="px-2 py-3 text-center font-bold text-amber-400">{m.pres.tardanzas || '—'}</td>
                        <td className="px-2 py-3 text-center">
                          {m.pres.total > 0
                            ? <span className={cn('font-bold', ausCls(m.pres.ausentismo))}>{m.pres.ausentismo}%</span>
                            : <span className="text-white/15">—</span>}
                        </td>
                        {/* Rondas */}
                        <td className="px-2 py-3 text-center text-white/50 font-mono border-l border-white/5">{m.rondas.total || '—'}</td>
                        <td className="px-2 py-3 text-center text-emerald-400 font-bold">{m.rondas.conQR || '—'}</td>
                        <td className="px-2 py-3 text-center">
                          {m.rondas.total > 0
                            ? <span className={cn('font-bold', qrCls(m.rondas.tasaQR))}>{m.rondas.tasaQR}%</span>
                            : <span className="text-white/15">—</span>}
                        </td>
                        {/* Sups */}
                        <td className="px-2 py-3 text-center text-white/50 font-mono border-l border-white/5">{m.sups.total || '—'}</td>
                        <td className="px-2 py-3 text-center">
                          {m.sups.total > 0
                            ? <span className={cn('font-bold', ptjCls(m.sups.promPuntaje))}>{m.sups.promPuntaje}%</span>
                            : <span className="text-white/15">—</span>}
                        </td>
                        <td className="px-2 py-3 text-center">
                          {m.sups.criticas > 0
                            ? <span className="font-bold text-red-400">{m.sups.criticas}</span>
                            : m.sups.total > 0 ? <span className="text-emerald-400">0</span>
                            : <span className="text-white/15">—</span>}
                        </td>
                        <td className="px-2 py-3 text-center">
                          {m.sups.satisfechos > 0
                            ? <span className="font-bold text-emerald-400">{m.sups.satisfechos}</span>
                            : <span className="text-white/15">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* TOTALES */}
                <tfoot>
                  <tr className="border-t-2 border-white/15 bg-white/4 font-bold">
                    <td className="px-4 py-3 text-white text-xs sticky left-0 bg-[#0a0e14]">ACUMULADO {new Date().getFullYear()}</td>
                    <td className="px-2 py-3 text-center text-white font-mono">{totPres.toLocaleString('es-AR')}</td>
                    <td className="px-2 py-3 text-center text-emerald-400">{totP.toLocaleString('es-AR')}</td>
                    <td className="px-2 py-3 text-center text-red-400">{totA}</td>
                    <td className="px-2 py-3 text-center text-amber-400">{totT}</td>
                    <td className="px-2 py-3 text-center"><span className={cn('text-xs', ausCls(ausGlobal))}>{ausGlobal}%</span></td>
                    <td className="px-2 py-3 text-center text-white font-mono border-l border-white/5">{totRondas.toLocaleString('es-AR')}</td>
                    <td className="px-2 py-3 text-center text-emerald-400">{totQR}</td>
                    <td className="px-2 py-3 text-center"><span className={cn('text-xs', qrCls(qrGlobal))}>{qrGlobal}%</span></td>
                    <td className="px-2 py-3 text-center text-white font-mono border-l border-white/5">{totSups}</td>
                    <td className="px-2 py-3 text-center"><span className={cn('text-xs', ptjCls(ptjGlobal))}>{ptjGlobal}%</span></td>
                    <td className="px-2 py-3 text-center text-red-400">{totCrit || '0'}</td>
                    <td className="px-2 py-3 text-center text-emerald-400">{meses.reduce((a,m) => a + m.sups.satisfechos, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Nota metodológica */}
            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
              <p className="text-[10px] text-white/20">
                <span className="text-white/35 font-semibold">HIST:</span> Enero–Marzo 2026 basado en Plan Maestro SGI e Informe de Inspecciones Feb–Mar 2026.
                Datos posteriores provienen de registros reales de la app.
              </p>
              <p className="text-[10px] text-white/15">Meta ausentismo ≤10% · QR ≥75% · Puntaje sup. ≥80%</p>
            </div>
          </div>
        )}

        {/* ── TAB PRESENTISMO ── */}
        {tab === 'pres' && <TabDetalle rows={lsP as Record<string,unknown>[]} cols={['nombreApellido','nombre','objetivo','turno','estado','fecha']} labels={['Nombre','Nombre (alt)','Objetivo','Turno','Estado','Fecha']} estadoCls={estadoCls} />}

        {/* ── TAB SUPERVISIONES ── */}
        {tab === 'sups' && <TabDetalle rows={lsS as Record<string,unknown>[]} cols={['supervisor','clienteObjetivo','puntaje','resultado','satisfaccionCliente','fecha']} labels={['Supervisor','Objetivo','Puntaje','Resultado','Satisfacción','Fecha']} />}

        {/* ── TAB RONDAS ── */}
        {tab === 'rondas' && <TabDetalle rows={lsR as Record<string,unknown>[]} cols={['clienteObjetivo','objetivo','vigiladorNombre','turno','escaneoOk','resultado','fecha']} labels={['Objetivo','Obj (alt)','Vigilador','Turno','Escaneo','Resultado','Fecha']} />}
      </div>
    </div>
  );
};

// ─── BADGE de estado presentismo ──────────────────────────────────────────────
const estadoCls: Record<string,string> = {
  Presente:  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  Ausente:   'bg-red-500/10 border-red-500/20 text-red-400',
  Tardanza:  'bg-amber-500/10 border-amber-500/20 text-amber-400',
};

// ─── Tab genérico de detalle ──────────────────────────────────────────────────
interface TabDetalleProps {
  rows: Record<string,unknown>[];
  cols: string[];
  labels: string[];
  estadoCls?: Record<string,string>;
}

const TabDetalle: React.FC<TabDetalleProps> = ({ rows, cols, labels, estadoCls: eCls }) => {
  const sorted = [...rows].sort((a, b) => (Number(b.timestamp ?? 0)) - (Number(a.timestamp ?? 0)));

  if (!rows.length) return (
    <div className="p-10 text-center">
      <p className="text-sm text-white/20">Sin registros en la app para este módulo</p>
      <p className="text-xs text-white/15 mt-1">Los datos históricos Ene–Mar son de fuente externa (Plan Maestro SGI)</p>
    </div>
  );

  return (
    <div className="overflow-x-auto max-h-72 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[#0d1117] z-10">
          <tr className="border-b border-white/5">
            {labels.map((l, i) => <th key={i} className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide whitespace-nowrap">{l}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sorted.map((r, i) => (
            <tr key={String(r.id ?? i)} className="hover:bg-white/3 transition-colors">
              {cols.map((c, ci) => {
                const val = String(r[c] ?? '—');
                const badge = eCls?.[val];
                return (
                  <td key={ci} className="px-4 py-2.5 text-white/60 max-w-[200px] truncate">
                    {badge
                      ? <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold', badge)}>{val}</span>
                      : val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResumenExport;
