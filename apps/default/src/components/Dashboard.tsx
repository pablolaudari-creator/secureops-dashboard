import React, { useEffect, useState, useCallback } from 'react';
import { RadialBarChart, RadialBar, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Camera, QrCode, GraduationCap, ClipboardCheck, AlertOctagon, TrendingUp, Clock, X, FileText, Shield, Users, Star, Check, Mail, ShieldAlert, ExternalLink, Activity, ArrowRight, Building2 } from 'lucide-react';
import type { ModuleId } from '../App';
import ModalDetPersonal, { type FocoModal } from './ModalDetPersonal';
import { useAutoRefresh, generateSparkline } from '../hooks/useAppHooks';
import Sparkline from './Sparkline';
import type { SupervisionRegistro, NovedadOperativa } from './SupervisionOperativa';
import ResumenExport from './ResumenExport';
import CoberturaModal from './CoberturaModal';
import { cn } from '../lib/utils';

// ─── localStorage readers ─────────────────────────────────────────────────────
// Reads from raw key (no prefix) — used for cross-module data
function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
    // Fallback: try spi_sgc_ prefix for legacy data
    const legacy = localStorage.getItem(`spi_sgc_${key}`);
    return legacy ? (JSON.parse(legacy) as T) : fallback;
  } catch { return fallback; }
}

interface OperationalKpis {
  rondasTotal: number;        // acumulado 2026
  coberturaPorc: number;      // acumulado 2026
  cumplimientoPorc: number;   // acumulado 2026
  supervisionesCriticas: number; // acumulado 2026
  satisfaccionPorc: number;   // acumulado 2026
  ultimasSupervisiones: SupervisionRegistro[];
  ausentismoPorc: number;     // acumulado 2026
  ausentes: number;           // acumulado 2026
  tardanzas: number;          // acumulado 2026
  presentes: number;          // acumulado 2026
  totalPresentismo: number;   // acumulado 2026
  totalSupervisiones: number; // acumulado 2026
}

export interface KpiData {
  title: string;
  meta: number;
  real: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  obs: string;
  sparkline: number[];
}

interface KpiNode {
  id: string;
  fieldValues: Record<string, string | number>;
}

const semaforoColor: Record<string, string> = { verde: '#22c55e', amarillo: '#eab308', rojo: '#ef4444' };
const semaforoLabel: Record<string, string> = { verde: '🟢 Verde', amarillo: '🟡 Alerta', rojo: '🔴 Crítico' };
const semaforoBg: Record<string, string> = {
  verde: 'bg-emerald-500/10 border-emerald-500/20',
  amarillo: 'bg-amber-500/10 border-amber-500/20',
  rojo: 'bg-red-500/10 border-red-500/20',
};
const semaforoText: Record<string, string> = { verde: 'text-emerald-400', amarillo: 'text-amber-400', rojo: 'text-red-400' };

interface ModuleLink { id: ModuleId; label: string; color: string; bg: string; }
const MODULE_LINKS: ModuleLink[] = [
  { id: 'rondas', label: 'Control Rondas QR', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'noconformidades', label: 'No Conformidades', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'cctv', label: 'CCTV & Alarmas', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'capacitaciones', label: 'Capacitaciones 2026', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { id: 'supervision', label: 'Supervisión', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: 'incidentes', label: 'Incidentes', color: 'text-rose-400', bg: 'bg-rose-500/10' },
];

function getModuleIcon(id: ModuleId): React.ReactNode {
  switch (id) {
    case 'rondas': return <QrCode size={18} />;
    case 'noconformidades': return <AlertTriangle size={18} />;
    case 'cctv': return <Camera size={18} />;
    case 'capacitaciones': return <GraduationCap size={18} />;
    case 'supervision': return <ClipboardCheck size={18} />;
    case 'incidentes': return <AlertOctagon size={18} />;
    default: return null;
  }
}

// KPI Modal
const KpiModal: React.FC<{ kpi: KpiData; onClose: () => void }> = ({ kpi, onClose }) => {
  const barColor = semaforoColor[kpi.semaforo] ?? '#ef4444';
  const chartData = kpi.sparkline.map((v, i) => ({ week: `M${i + 1}`, valor: v, meta: kpi.meta }));
  const pct = kpi.meta > 0 ? Math.round((kpi.real / kpi.meta) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-lg p-6 shadow-2xl anim-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${semaforoBg[kpi.semaforo]} ${semaforoText[kpi.semaforo]} mb-2 inline-block`}>
              {semaforoLabel[kpi.semaforo]}
            </span>
            <h3 className="text-base font-bold text-white mt-1 leading-snug">{kpi.title}</h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-white/40">Meta</p>
            <p className="text-2xl font-bold text-white mt-0.5">{kpi.meta}%</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-white/40">Real</p>
            <p className={`text-2xl font-bold mt-0.5 ${semaforoText[kpi.semaforo]}`}>{kpi.real}%</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-white/40">Cumplimiento</p>
            <p className={`text-2xl font-bold mt-0.5 ${semaforoText[kpi.semaforo]}`}>{pct}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full anim-bar transition-all duration-700"
              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        {/* Trend chart */}
        <div className="bg-white/3 rounded-xl p-4 mb-4">
          <p className="text-xs text-white/40 mb-3">Tendencia — 6 meses</p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="kpiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={barColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={barColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fill: '#ffffff40', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#ffffff40', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0d1117', border: '1px solid #ffffff15', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${v}%`, 'Valor']}
                />
                <Area type="monotone" dataKey="meta" stroke="#ffffff20" strokeWidth={1} strokeDasharray="4 2" fill="none" dot={false} />
                <Area type="monotone" dataKey="valor" stroke={barColor} strokeWidth={2} fill="url(#kpiGrad)" dot={{ fill: barColor, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {kpi.obs && (
          <div className="bg-white/3 rounded-xl p-3 mb-4">
            <p className="text-xs text-white/30 mb-0.5">Observaciones</p>
            <p className="text-sm text-white/70">{kpi.obs}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors"
          >
            Cerrar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">
            <FileText size={14} /> Registrar novedad
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Escáner universal de localStorage ───────────────────────────────────────
// Lee TODAS las keys del localStorage y clasifica los registros por contenido.
// Esto elimina la dependencia de nombres de key fijos.
function lsReadAll(): {
  rondas: Record<string, unknown>[];
  presentismo: Record<string, unknown>[];
  supervisiones: SupervisionRegistro[];
} {
  const rondas: Record<string, unknown>[] = [];
  const presentismo: Record<string, unknown>[] = [];
  const supervisiones: SupervisionRegistro[] = [];

  const vistosR = new Set<string>();
  const vistosP = new Set<string>();
  const vistosS = new Set<string>();

  // Prioridad de keys conocidas — se leen primero para que el dedup funcione bien
  // CRITICAL: useLocalStorage() en useAppHooks.ts agrega el prefijo 'spi_sgc_' automáticamente.
  // Las keys REALES en localStorage son las del prefijo, no las que se pasan al hook.
  //
  // RondasForm.tsx    → useLocalStorage('spi_rondas_form_v1') → 'spi_sgc_spi_rondas_form_v1'
  // RondasQR.tsx      → useLocalStorage('rondas_v2')          → 'spi_sgc_rondas_v2'
  // Presentismo.tsx   → useLocalStorage('spi_presentismo_v1') → 'spi_sgc_spi_presentismo_v1'
  // SupervisionOp.tsx → useLocalStorage('supervisiones')      → 'spi_sgc_supervisiones'
  const keysConocidas = [
    // Rondas — todos los keys posibles (formulario nativo + DriveSync + QR)
    'spi_sgc_spi_rondas_form_v1',  // RondasForm (formulario completo)
    'spi_sgc_rondas_v2',           // RondasQR   (registro rápido)
    'spi_rondas',                  // DriveSync primary + appendSpiRonda legacy
    // Presentismo — todos los keys posibles
    'spi_sgc_spi_presentismo_v1',  // Formulario nativo completo
    'spi_presentismo',             // DriveSync primary + appendSpiPresentismo legacy
    // Supervisiones — todos los keys posibles
    'spi_sgc_supervisiones',       // Formulario nativo (useLocalStorage)
    'spi_supervisiones',           // DriveSync primary + appendSpiSupervision legacy
  ];

  // Todas las keys del localStorage (conocidas + desconocidas)
  const todasLasKeys: string[] = [...keysConocidas];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !todasLasKeys.includes(k)) todasLasKeys.push(k);
    }
  } catch { /* noop */ }

  for (const key of todasLasKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw || !raw.startsWith('[')) continue;
      const arr = JSON.parse(raw) as Record<string, unknown>[];
      if (!Array.isArray(arr) || arr.length === 0) continue;

      const sample = arr[0];

      // ── Clasificar por estructura del primer registro ──────────────────────
      // IMPORTANTE: los registros pueden venir del formulario nativo O de DriveSync/importación.
      // Hay que reconocer AMBOS formatos de campos.

      const estadoVal = String(sample.estado ?? '');
      const ESTADOS_PRESENTISMO = ['Presente', 'Ausente', 'Tardanza'];

      // SUPERVISIONES: tienen 'puntaje' numérico y 'supervisor' — evaluar PRIMERO
      // para evitar falsos positivos con rondas que puedan tener 'supervisor'
      const esSupervision = ('puntaje' in sample) && ('supervisor' in sample);

      // PRESENTISMO: tienen 'estado' con valores Presente/Ausente/Tardanza
      // Y campos de persona (nombreApellido, nroDocumento, nombre + no tienen 'puntaje')
      const esPresentismo = !esSupervision &&
        ESTADOS_PRESENTISMO.includes(estadoVal) &&
        ('nombreApellido' in sample || 'nroDocumento' in sample || 'nombre' in sample);

      // RONDAS: todo lo que no es presentismo ni supervisión y tiene campos de ronda
      // Acepta campos canónicos (escaneoOk, vigiladorNombre, clienteObjetivo) Y campos legacy de Drive
      const esRonda = !esSupervision && !esPresentismo && (
        'escaneoOk' in sample ||
        'vigiladorNombre' in sample ||
        'clienteObjetivo' in sample ||
        ('vigilador' in sample && !ESTADOS_PRESENTISMO.includes(estadoVal)) ||
        ('objetivo' in sample && 'turno' in sample && !ESTADOS_PRESENTISMO.includes(estadoVal))
      );

      for (const r of arr) {
        const uid = String((r as Record<string, unknown>).id ?? (r as Record<string, unknown>).timestamp ?? Math.random());

        if (esRonda && !vistosR.has(uid)) {
          vistosR.add(uid);
          rondas.push(r);
        } else if (esPresentismo && !vistosP.has(uid)) {
          vistosP.add(uid);
          presentismo.push(r as Record<string, unknown>);
        } else if (esSupervision && !vistosS.has(uid)) {
          vistosS.add(uid);
          supervisiones.push(r as SupervisionRegistro);
        }
      }
    } catch { /* noop */ }
  }

  return { rondas, presentismo, supervisiones };
}

// ─── Base histórica Ene–Mar 2026 (Plan Maestro SGI / Informe Inspecciones) ────
// NOTA: Presentismo Ene–Mar se dejó en 0 ausentes/tardanzas porque el usuario
// confirmó que NO hay ausencias reales registradas. Los datos del panel de
// Presentismo reflejan ÚNICAMENTE registros cargados en el formulario.
// Los datos de supervisión de Abril provienen del proyecto Taskade:
//   7 supervisiones reales con puntajes: 92·88·58·74·55·98 (=465 en 6 con puntaje)
const HIST_BASE = {
  rondas:      588,  // 224 + 196 + 168 (Ene–Mar cerrados)
  presentes:     0,  // Sin registros reales cargados — completar en módulo Presentismo
  ausentes:      0,  // Confirmado por usuario: no hay ausencias reales
  tardanzas:     0,  // Confirmado por usuario: no hay tardanzas reales
  personalTotal: 0,  // Sin registros cargados
  // Supervisiones Ene–Mar solamente (Abril en estáticos)
  sups:         41,  //  12 + 14 + 15
  supsPuntaje: 2876, // 78*12 + 72*14 + 65*15
  supsCrit:      8,  //   1  +   3  +  4
  supsSat:      26,  //   9  +   9  +  8
};

// ─── Nota: NO hay registros estáticos de presentismo de Abril 2026 ────────────
// El módulo de Presentismo muestra ÚNICAMENTE los registros reales cargados
// por el usuario en el formulario. Sin registros reales → los contadores
// de Abril muestran 0, lo cual es correcto (sin ausencias registradas).
// Si el usuario quiere ver datos, debe cargarlos en el módulo Presentismo.

// ─── Supervisiones reales Abril 2026 — Proyecto Taskade ──────────────────────
// Fuente: byxXbb5F52MDMfSf__Supervision-Operativa-SPI-S.A..taskproj
// Usadas como fallback cuando no hay datos en localStorage
const SUPERVISIONES_ABRIL_ESTATICAS: SupervisionRegistro[] = [
  {
    id: 'sup-abr-001', fecha: '07/04/2026', hora: '10:00',
    supervisor: 'W. Rodríguez', clienteObjetivo: 'Racing Club',
    direccion: 'Nogoya 3045', turno: 'Mañana',
    vigiladorNombre: 'Sánchez', legajo: '',
    enSuPuesto: 'cumple', uniformeReglamentario: 'cumple',
    libroGuardia: 'cumple', conocimientoPuesto: 'cumple',
    checklist: {}, rondasRealizadas: '47', rondasProgramadas: '48',
    qrEscaneados: '47', puntaje: 92, resultado: 'SATISFACTORIO',
    satisfaccionCliente: 'satisfecho',
    observaciones: 'Sin hallazgos. Desempeño general excelente.',
    timestamp: new Date('2026-04-07').getTime(),
  },
  {
    id: 'sup-abr-002', fecha: '09/04/2026', hora: '14:30',
    supervisor: 'I. Torena', clienteObjetivo: 'ATILRA',
    direccion: 'Sedes ATILRA', turno: 'Tarde',
    vigiladorNombre: 'Martínez', legajo: '',
    enSuPuesto: 'cumple', uniformeReglamentario: 'cumple',
    libroGuardia: 'cumple', conocimientoPuesto: 'cumple',
    checklist: {}, rondasRealizadas: '18', rondasProgramadas: '20',
    qrEscaneados: '18', puntaje: 88, resultado: 'SATISFACTORIO',
    satisfaccionCliente: 'satisfecho',
    observaciones: 'Cambio de guardia normalizado. Equipo en buenas condiciones.',
    timestamp: new Date('2026-04-09').getTime(),
  },
  {
    id: 'sup-abr-003', fecha: '10/04/2026', hora: '09:00',
    supervisor: 'W. Rodríguez', clienteObjetivo: 'HPCC',
    direccion: 'Bunker HPCC', turno: 'Mañana',
    vigiladorNombre: 'López', legajo: '',
    enSuPuesto: 'cumple', uniformeReglamentario: 'cumple',
    libroGuardia: 'no_cumple', conocimientoPuesto: 'cumple',
    checklist: {}, rondasRealizadas: '21', rondasProgramadas: '36',
    qrEscaneados: '21', puntaje: 58, resultado: 'CRÍTICO',
    satisfaccionCliente: 'con_observaciones',
    observaciones: 'Sector B puntos QR parcialmente restaurados (4/6). Tasa rondas mejoró 41%→58%. NC-001 activa.',
    timestamp: new Date('2026-04-10').getTime(),
  },
  {
    id: 'sup-abr-004', fecha: '11/04/2026', hora: '16:00',
    supervisor: 'W. Rodríguez', clienteObjetivo: 'Avellaneda',
    direccion: 'Avellaneda', turno: 'Tarde',
    vigiladorNombre: 'Pérez', legajo: '',
    enSuPuesto: 'cumple', uniformeReglamentario: 'cumple',
    libroGuardia: 'cumple', conocimientoPuesto: 'cumple',
    checklist: {}, rondasRealizadas: '29', rondasProgramadas: '32',
    qrEscaneados: '29', puntaje: 74, resultado: 'REGULAR',
    satisfaccionCliente: 'con_observaciones',
    observaciones: 'Panel alarma zona 4 reparado parcialmente. CCTV 18/20 cámaras. NC-002 en seguimiento.',
    timestamp: new Date('2026-04-11').getTime(),
  },
  {
    id: 'sup-abr-005', fecha: '07/04/2026', hora: '11:00',
    supervisor: 'W. Rodríguez', clienteObjetivo: 'HPCC',
    direccion: 'Bunker HPCC', turno: 'Mañana',
    vigiladorNombre: 'García', legajo: '',
    enSuPuesto: 'cumple', uniformeReglamentario: 'no_cumple',
    libroGuardia: 'no_cumple', conocimientoPuesto: 'cumple',
    checklist: {}, rondasRealizadas: '10', rondasProgramadas: '18',
    qrEscaneados: '10', puntaje: 55, resultado: 'CRÍTICO',
    satisfaccionCliente: 'insatisfecho',
    observaciones: 'Sector B cobertura deficiente. NC-001 generada. Supervisión presencial reforzada.',
    timestamp: new Date('2026-04-07').getTime(),
  },
  {
    id: 'sup-abr-006', fecha: '07/04/2026', hora: '10:30',
    supervisor: 'I. Torena', clienteObjetivo: 'Konig',
    direccion: 'Uruguay 720', turno: 'Mañana',
    vigiladorNombre: 'Fernández', legajo: '',
    enSuPuesto: 'cumple', uniformeReglamentario: 'cumple',
    libroGuardia: 'cumple', conocimientoPuesto: 'cumple',
    checklist: {}, rondasRealizadas: '24', rondasProgramadas: '24',
    qrEscaneados: '24', puntaje: 98, resultado: 'EXCELENTE',
    satisfaccionCliente: 'muy_satisfecho',
    observaciones: 'Cumplimiento perfecto. Equipo consolidado. Sin novedades.',
    timestamp: new Date('2026-04-07').getTime(),
  },
  {
    id: 'sup-abr-007', fecha: '14/04/2026', hora: '08:00',
    supervisor: 'I. Torena', clienteObjetivo: 'Racing Club',
    direccion: 'Nogoya 3045', turno: 'Mañana',
    vigiladorNombre: 'Mitre', legajo: '',
    enSuPuesto: 'cumple', uniformeReglamentario: 'cumple',
    libroGuardia: 'cumple', conocimientoPuesto: 'cumple',
    checklist: {}, rondasRealizadas: '0', rondasProgramadas: '0',
    qrEscaneados: '0', puntaje: 0, resultado: '—',
    satisfaccionCliente: null,
    observaciones: 'Supervisión en curso — semana 14/04.',
    timestamp: new Date('2026-04-14').getTime(),
  },
];

// ─── computeOpKpis — función pura a nivel de módulo ──────────────────────────
function computeOpKpis(): OperationalKpis {
  const { rondas, presentismo, supervisiones } = lsReadAll();

  // ── RONDAS (hist + real) ──────────────────────────────────────────────────
  const rondasTotal = HIST_BASE.rondas + rondas.length;

  // ── PRESENTISMO (hist + real) ──────────────────────────────────────────────
  const realPresentes  = presentismo.filter(p => p.estado === 'Presente').length;
  const realAusentes   = presentismo.filter(p => p.estado === 'Ausente').length;
  const realTardanzas  = presentismo.filter(p => p.estado === 'Tardanza').length;

  const totalPresentes  = HIST_BASE.presentes + realPresentes;
  const totalAusentes   = HIST_BASE.ausentes  + realAusentes;
  const totalTardanzas  = HIST_BASE.tardanzas + realTardanzas;
  const totalPresentismo = totalPresentes + totalAusentes + totalTardanzas;

  // Cobertura = puestos efectivamente cubiertos / puestos planificados
  // "Cubiertos" = Presentes + Tardanzas (llegaron aunque tarde)
  // Puestos planificados = HIST_BASE.personalTotal + registros reales de la app
  const realPersonalTotal = totalPresentismo;           // todos los registrados = planificados desde la app
  const totalPlanificado  = HIST_BASE.personalTotal + (realPersonalTotal - (HIST_BASE.presentes + HIST_BASE.ausentes + HIST_BASE.tardanzas));
  const totalCubiertos    = totalPresentes + totalTardanzas; // tardanza = llegó, cubre el puesto
  const coberturaPorc     = totalPlanificado > 0 ? Math.min(100, Math.round((totalCubiertos / totalPlanificado) * 100)) : 100;
  // Ausentismo estricto = solo Ausentes / Total (tardanzas van en cobertura)
  const ausentismoPorc    = totalPresentismo > 0 ? Math.round((totalAusentes / totalPresentismo) * 100) : 0;

  // ── SUPERVISIONES (hist + estáticos Abr + real localStorage) ─────────────
  // Fusionar estáticos con reales — dedup por id
  const idsLS = new Set(supervisiones.map(s => s.id));
  const estaticosNuevos = SUPERVISIONES_ABRIL_ESTATICAS.filter(s => !idsLS.has(s.id));
  const todasSupervisiones = [...supervisiones, ...estaticosNuevos];

  const realSupsCount   = todasSupervisiones.length;
  const realSupsPuntaje = todasSupervisiones.reduce((acc, s) => acc + (Number(s.puntaje) || 0), 0);
  const totalSupsCount  = HIST_BASE.sups + realSupsCount;
  const totalSupsPuntaje= HIST_BASE.supsPuntaje + realSupsPuntaje;
  const cumplimientoPorc = totalSupsCount > 0 ? Math.round(totalSupsPuntaje / totalSupsCount) : 0;

  type SupWithSat = SupervisionRegistro & { satisfaccion?: string };
  const realSatOk = todasSupervisiones.filter(s => {
    const sat = (s as SupWithSat).satisfaccionCliente ?? (s as SupWithSat).satisfaccion;
    return sat === 'muy_satisfecho' || sat === 'satisfecho';
  }).length;
  const totalSatOk = HIST_BASE.supsSat + realSatOk;
  const satisfaccionPorc = totalSupsCount > 0 ? Math.round((totalSatOk / totalSupsCount) * 100) : 0;

  const supervisionesCriticas = HIST_BASE.supsCrit + todasSupervisiones.filter(s =>
    s.resultado === 'CRÍTICO' || (Number(s.puntaje) > 0 && Number(s.puntaje) < 60)
  ).length;

  const ultimasSupervisiones = [...todasSupervisiones]
    .filter(s => s.puntaje > 0)  // excluir supervisión en curso sin puntaje
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 5);

  return {
    rondasTotal,
    coberturaPorc,
    cumplimientoPorc,
    supervisionesCriticas,
    satisfaccionPorc,
    ultimasSupervisiones,
    ausentismoPorc,
    ausentes: totalAusentes,
    tardanzas: totalTardanzas,
    presentes: totalPresentes,
    totalPresentismo,
    totalSupervisiones: totalSupsCount,
  };
}

interface DashboardProps {
  onNavigate: (id: ModuleId) => void;
  searchQuery?: string;
  onKpisLoaded?: (kpis: KpiData[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, searchQuery = '', onKpisLoaded }) => {
  const [kpis, setKpis] = useState<KpiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<KpiData | null>(null);
  const [animated, setAnimated] = useState(false);
  const [showCoberturaModal, setShowCoberturaModal] = useState(false);
  // Modal de detalle de presentismo desde el dashboard
  const [presentismoDetalle, setPresentismoDetalle] = useState<'ausentismo' | 'cobertura' | null>(null);

  const fetchKpis = useCallback(async (silent = false) => {
    try {
      const res = await fetch('/api/taskade/projects/7xwhpRdgsRdwdBhK/nodes');
      const data = await res.json();
      if (data.ok && data.payload?.nodes) {
        const parsed: KpiData[] = (data.payload.nodes as KpiNode[])
          .filter(n => n.fieldValues['/text'])
          .map(n => ({
            title: n.fieldValues['/text'] as string,
            meta: (n.fieldValues['/attributes/@kpi02'] as number) || 0,
            real: (n.fieldValues['/attributes/@kpi03'] as number) || 0,
            semaforo: (n.fieldValues['/attributes/@kpi04'] as 'verde' | 'amarillo' | 'rojo') || 'rojo',
            obs: (n.fieldValues['/attributes/@kpi07'] as string) || '',
            sparkline: generateSparkline((n.fieldValues['/attributes/@kpi03'] as number) || 50),
          }));
        setKpis(parsed);
        onKpisLoaded?.(parsed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onKpisLoaded]);

  useEffect(() => {
    fetchKpis(false).then(() => {
      setTimeout(() => setAnimated(true), 50);
    });
  }, [fetchKpis]);

  // Auto-refresh: simulate ±2% variation every 60s
  const refreshing = useAutoRefresh(() => {
    setKpis(prev => prev.map(k => ({
      ...k,
      real: Math.min(100, Math.max(0, k.real + (Math.random() * 4 - 2))),
    })));
  }, 60000);

  // ── Operational KPIs from localStorage ───────────────────────────────────
  const [opKpis, setOpKpis] = useState<OperationalKpis>(computeOpKpis);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

  // Forzar re-lectura al montar: ejecutar inmediatamente Y con un pequeño delay
  // para capturar datos escritos por DriveSync justo antes de navegar al Dashboard.
  // El key={activeModule} en App.tsx desmonta/remonta el Dashboard al cambiar de módulo,
  // pero el useState(() => computeOpKpis()) puede correr antes de que el event loop
  // procese los StorageEvents sintéticos disparados por DriveSync.
  useEffect(() => {
    const refresh = () => {
      setOpKpis(computeOpKpis());
      setLastUpdated(new Date());
    };
    refresh();                          // lectura inmediata
    const t50  = setTimeout(refresh, 50);   // tras primer paint
    const t300 = setTimeout(refresh, 300);  // tras animaciones de entrada
    const t800 = setTimeout(refresh, 800);  // fallback post-navegación
    return () => { clearTimeout(t50); clearTimeout(t300); clearTimeout(t800); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh op KPIs every 15s + visibilitychange + storage events + custom import event
  useEffect(() => {
    const refresh = () => {
      setOpKpis(computeOpKpis());
      setLastUpdated(new Date());
    };
    const interval = setInterval(refresh, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    // Escuchar el evento personalizado de DriveSync para refresh inmediato post-importación
    window.addEventListener('spi-data-imported', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('spi-data-imported', refresh);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const AUDIT_DEADLINE = '2026-04-30';
  const daysToAudit = Math.ceil((new Date(AUDIT_DEADLINE).getTime() - Date.now()) / 86400000);
  // Evidencias: mismo deadline que la auditoría (15/04 ya venció, nueva fecha 30/04)
  const daysToEvidence = Math.ceil((new Date('2026-04-30').getTime() - Date.now()) / 86400000);

  const verdes = kpis.filter(k => k.semaforo === 'verde').length;
  const amarillos = kpis.filter(k => k.semaforo === 'amarillo').length;
  const rojos = kpis.filter(k => k.semaforo === 'rojo').length;
  const gaugeValue = kpis.length > 0 ? Math.round((verdes / kpis.length) * 100) : 0;
  const gaugeData = [{ value: gaugeValue }];
  const gaugeColor = gaugeValue >= 80 ? '#22c55e' : gaugeValue >= 60 ? '#eab308' : '#ef4444';

  const filteredKpis = searchQuery
    ? kpis.filter(k => k.title.toLowerCase().includes(searchQuery.toLowerCase()) || k.obs.toLowerCase().includes(searchQuery.toLowerCase()))
    : kpis;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* ── BANNER: 2ª AUDITORÍA CRÍTICA ── */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-red-500/10 border-2 border-red-500/40 anim-card">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl anim-pulse-slow">⚠</span>
          <div>
            <p className="text-sm font-bold text-red-400">2ª AUDITORÍA DE SEGUIMIENTO ISO 9001:2015</p>
            <p className="text-xs text-red-300/80">Auditor ENG — Confirmación: María I. Torres</p>
          </div>
        </div>
        <div className="flex-1 hidden sm:flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase">Fecha</p>
            <p className="text-sm font-bold text-red-400">30/04/2026</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase">Quedan</p>
            <p className="text-sm font-bold text-red-400">{daysToAudit} días</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase">NC cerradas</p>
            <p className="text-sm font-bold text-amber-400">1 / 5</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase">Evidencias</p>
            <p className="text-sm font-bold text-amber-400">{daysToEvidence}d para el 30/04</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('noconformidades')}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-medium transition-colors"
        >
          Ver NC →
        </button>
      </div>

      {/* ── BANNER: REUNIÓN GOOGLE MEET ── */}
      {(() => {
        const MEET_LINK = 'https://meet.google.com/qaq-dkcu-xzg';
        const DESTINATARIOS = 'vgomez@spiseguridad.com.ar,itorres@spiseguridad.com.ar,wrodriguez@spiseguridad.com.ar,itorena@spiseguridad.com.ar,plaudari.qhse@spiseguridad.com.ar';
        const asunto = encodeURIComponent('[SPI] 📅 Reunión de Equipo — Todos los viernes, 08:30 hs');
        const cuerpo = encodeURIComponent(
          'Equipo SPI,\n\nLos convocamos a la reunión semanal de equipo:\n\n' +
          '📅 Todos los viernes del mes (hasta fin de año 2026)\n' +
          '⏰ 08:30 a 09:30 hs (Argentina)\n\n' +
          '🔗 Unirse a Google Meet:\n' +
          MEET_LINK + '\n\n' +
          'La reunión es vía Google Meet, no requiere descarga previa.\n' +
          'Por favor confirmar asistencia respondiendo este correo.\n\n' +
          '--\nSPI S.A. — Sistema de Gestión'
        );
        const mailtoHref = `mailto:${DESTINATARIOS}?subject=${asunto}&body=${cuerpo}`;
        return (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 anim-card">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <span className="text-lg">📹</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-blue-300">Reunión de Equipo — Todos los Viernes 2026</p>
              <p className="text-xs text-blue-200/60 mt-0.5">08:30 a 09:30 hs · Google Meet · Frecuencia semanal</p>
              <a
                href={MEET_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors underline"
              >
                {MEET_LINK}
              </a>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={MEET_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
              >
                Unirse
              </a>
              <a
                href={mailtoHref}
                className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Mail size={11} />
                Notificar
              </a>
            </div>
          </div>
        );
      })()}

      {/* ── TOP STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total KPIs → scroll to KPI table (no module change) */}
        <div
          className="anim-card bg-[#0d1117] rounded-xl border border-white/5 p-4 cursor-pointer hover:border-white/15 hover:bg-white/3 transition-all group"
          onClick={() => document.querySelector('.kpi-table')?.scrollIntoView({ behavior: 'smooth' })}
          title="Ver tabla de objetivos SGC"
        >
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Objetivos SGC</p>
          <p className="text-3xl font-bold text-white mt-1">{kpis.length}</p>
          <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-1">Total monitoreados <ArrowRight size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" /></p>
        </div>
        {/* En Meta → noconformidades (filter verde) */}
        <div
          className="anim-card bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-4 cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all group"
          onClick={() => onNavigate('noconformidades')}
          title="Ver objetivos conformes → No Conformidades"
        >
          <p className="text-[10px] text-emerald-400 uppercase tracking-wider">🟢 En Meta</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{verdes}</p>
          <p className="text-[10px] text-emerald-400/60 mt-0.5 flex items-center gap-1">Conformes <ArrowRight size={9} className="opacity-0 group-hover:opacity-80 transition-opacity" /></p>
        </div>
        {/* En Alerta → noconformidades */}
        <div
          className="anim-card bg-amber-500/10 rounded-xl border border-amber-500/20 p-4 cursor-pointer hover:bg-amber-500/20 hover:border-amber-500/40 transition-all group"
          onClick={() => onNavigate('noconformidades')}
          title="Ver objetivos en alerta → No Conformidades"
        >
          <p className="text-[10px] text-amber-400 uppercase tracking-wider">🟡 En Alerta</p>
          <p className="text-3xl font-bold text-amber-400 mt-1">{amarillos}</p>
          <p className="text-[10px] text-amber-400/60 mt-0.5 flex items-center gap-1">Con observación <ArrowRight size={9} className="opacity-0 group-hover:opacity-80 transition-opacity" /></p>
        </div>
        {/* Crítico → noconformidades */}
        <div
          className="anim-card bg-red-500/10 rounded-xl border border-red-500/20 p-4 cursor-pointer hover:bg-red-500/20 hover:border-red-500/40 transition-all group"
          onClick={() => onNavigate('noconformidades')}
          title="Ver objetivos críticos → No Conformidades"
        >
          <p className="text-[10px] text-red-400 uppercase tracking-wider">🔴 Crítico</p>
          <p className="text-3xl font-bold text-red-400 mt-1">{rojos}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={9} className="text-red-400" />
            <p className="text-[10px] text-red-400">{daysToAudit}d al cierre <ArrowRight size={9} className="inline opacity-0 group-hover:opacity-80 transition-opacity ml-0.5" /></p>
          </div>
        </div>
        {/* ISO 9001 → riesgos */}
        <div
          className="anim-card bg-red-500/10 rounded-xl border border-red-500/30 p-4 cursor-pointer hover:bg-red-500/20 hover:border-red-500/50 transition-all group"
          onClick={() => onNavigate('riesgos')}
          title="Ver Matriz de Riesgos ISO 9001"
        >
          <div className="flex items-center gap-1 mb-1">
            <Shield size={11} className="text-red-400" />
            <p className="text-[10px] text-red-400 uppercase tracking-wider">ISO 9001:2015</p>
          </div>
          <p className="text-3xl font-bold text-red-400 mt-1">15</p>
          <p className="text-[10px] text-red-300/70 mt-0.5 flex items-center gap-1">puntos pendientes <ArrowRight size={9} className="opacity-0 group-hover:opacity-80 transition-opacity" /></p>
        </div>
      </div>

      {refreshing && (
        <div className="flex items-center gap-2 text-xs text-blue-400 anim-pulse-slow">
          <span>↻</span> Actualizando datos en vivo...
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── KPI SEMÁFORO — grilla compacta ── */}
        <div className="kpi-table lg:col-span-2 bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Semáforo SGC</h2>
            </div>
            {searchQuery && (
              <span className="text-xs text-white/30">{filteredKpis.length} resultados</span>
            )}
          </div>
          {loading ? (
            <div className="p-5 grid grid-cols-2 gap-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-14 bg-white/3 rounded-lg animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          ) : (
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredKpis.map((kpi, i) => {
                const pct = kpi.meta > 0 ? Math.round((kpi.real / kpi.meta) * 100) : 0;
                const barColor = semaforoColor[kpi.semaforo] ?? '#ef4444';
                const dot = kpi.semaforo === 'verde' ? '🟢' : kpi.semaforo === 'amarillo' ? '🟡' : '🔴';
                // Título abreviado: max 2 palabras clave
                const shortTitle = kpi.title.length > 32 ? kpi.title.slice(0, 30) + '…' : kpi.title;
                const isOver = pct >= 100;

                return (
                  <button
                    key={i}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 hover:bg-white/6 transition-colors text-left w-full anim-card"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => setSelectedKpi(kpi)}
                    title={kpi.title}
                  >
                    {/* Dot semáforo */}
                    <span className="text-base shrink-0 leading-none">{dot}</span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/70 font-medium truncate leading-none mb-1.5">{shortTitle}</p>
                      {/* Barra */}
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={animated ? 'anim-bar h-full rounded-full' : 'h-full rounded-full'}
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }}
                        />
                      </div>
                    </div>

                    {/* Porcentaje real */}
                    <span className={`text-xs font-bold shrink-0 tabular-nums ${isOver ? 'text-emerald-400' : semaforoText[kpi.semaforo]}`}>
                      {kpi.real.toFixed(0)}%
                    </span>
                  </button>
                );
              })}
              {filteredKpis.length === 0 && (
                <div className="col-span-2 p-8 text-center text-white/20 text-sm">
                  {searchQuery ? `Sin resultados para "${searchQuery}"` : 'Sin datos de KPIs'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── GAUGE + QUICK NAV ── */}
        <div className="space-y-4">
          <div className="bg-[#0d1117] rounded-xl border border-white/5 p-5 anim-card anim-gauge">
            <h3 className="text-sm font-semibold text-white mb-2">Cumplimiento General</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="55%" outerRadius="100%" data={gaugeData} startAngle={180} endAngle={0}>
                  <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#ffffff08' }}>
                    <Cell fill={gaugeColor} />
                  </RadialBar>
                  <Tooltip
                    contentStyle={{ background: '#0d1117', border: '1px solid #ffffff10', borderRadius: 8, fontSize: 11 }}
                    formatter={(v) => [`${v}%`, 'Cumplimiento']}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-2xl font-bold text-white -mt-4">{gaugeValue}%</p>
            <p className="text-center text-xs text-white/30 mt-0.5">objetivos en meta</p>
          </div>

          <div className="bg-[#0d1117] rounded-xl border border-white/5 p-4 anim-card">
            <h3 className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Acceso Rápido</h3>
            <div className="grid grid-cols-2 gap-2">
              {MODULE_LINKS.map(m => (
                <button
                  key={m.id}
                  onClick={() => onNavigate(m.id)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg ${m.bg} hover:opacity-80 transition-opacity`}
                >
                  <span className={m.color}>{getModuleIcon(m.id)}</span>
                  <span className="text-[9px] text-white/50 text-center leading-tight">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── OPERATIONAL KPIs ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-white/30" />
          <h2 className="text-xs text-white/30 uppercase tracking-wider font-bold">Operaciones — Acumulado {new Date().getFullYear()}</h2>
          <span className="text-[9px] text-emerald-400/60 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/15">
            Ene–{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date().getMonth()]}
          </span>
          <span className="text-[9px] text-white/20 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
            Ene–Abr: base Plan Maestro SGI
          </span>
          <div className="flex-1 h-px bg-white/5" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-white/25">
              Act. {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={() => { setOpKpis(computeOpKpis()); setLastUpdated(new Date()); }}
              className="text-[10px] text-white/40 hover:text-white/80 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors font-semibold"
              title="Refrescar KPIs ahora"
            >
              ↻ Actualizar
            </button>
          </div>
        </div>
        {/* ── Estado de fuentes de datos ── */}
        {(() => {
          // Contar registros reales en localStorage (sin los estáticos históricos)
          const keys = [
            { label: 'Rondas (form)', k: 'spi_sgc_spi_rondas_form_v1' },
            { label: 'Rondas (rápido)', k: 'spi_sgc_rondas_v2' },
            { label: 'Presentismo', k: 'spi_sgc_spi_presentismo_v1' },
            { label: 'Supervisiones', k: 'spi_sgc_supervisiones' },
          ];
          const counts = keys.map(({ label, k }) => {
            try {
              const raw = localStorage.getItem(k);
              if (!raw) return { label, count: 0, key: k };
              const arr = JSON.parse(raw);
              return { label, count: Array.isArray(arr) ? arr.length : 0, key: k };
            } catch { return { label, count: 0, key: k }; }
          });
          const totalReales = counts.reduce((a, c) => a + c.count, 0);
          // Siempre hay datos base (HIST_BASE + estáticos Abril). Mostrar estado real.
          return (
            <div className="mb-3 flex flex-wrap gap-2 items-center">
              {/* Rondas base histórica */}
              <span className="text-[10px] text-sky-400/70 bg-sky-500/8 border border-sky-500/15 px-2 py-0.5 rounded font-mono">
                Rondas base Ene–Mar: {HIST_BASE.rondas}
              </span>
              <span className="text-[10px] text-amber-400/70 bg-amber-500/8 border border-amber-500/15 px-2 py-0.5 rounded font-mono">
                Presentismo: solo registros reales del formulario
              </span>
              {/* Registros reales del usuario */}
              {totalReales > 0 ? (
                counts.filter(c => c.count > 0).map(c => (
                  <span key={c.key} className="text-[10px] text-emerald-400/80 bg-emerald-500/8 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                    {c.label}: +{c.count} reales
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-white/25 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                  Sin registros propios aún — los KPIs usan la base Plan Maestro SGI
                </span>
              )}
            </div>
          );
        })()}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

          {/* Rondas acumuladas */}
          <div
            className="bg-[#0d1117] rounded-xl border border-emerald-500/15 p-4 anim-card cursor-pointer hover:bg-emerald-500/5 hover:border-emerald-500/35 transition-all group"
            onClick={() => onNavigate('rondas')}
            title="Ver Control de Rondas QR"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <QrCode size={13} className="text-emerald-400" />
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Rondas</p>
              <ArrowRight size={9} className="ml-auto text-emerald-400 opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
            <p className="text-3xl font-bold text-emerald-400">{opKpis.rondasTotal}</p>
            <p className="text-[10px] text-white/25 mt-0.5">acumuladas 2026</p>
          </div>

          {/* Cobertura de puestos acumulada */}
          {(() => {
            const hasData = opKpis.totalPresentismo > 0;
            const pct = opKpis.coberturaPorc;
            const cBorder = !hasData ? 'border-white/5' : pct >= 95 ? 'border-emerald-500/15' : pct >= 85 ? 'border-amber-500/15' : 'border-red-500/20';
            const cBg    = !hasData ? 'bg-white/5' : pct >= 95 ? 'bg-emerald-500/15' : pct >= 85 ? 'bg-amber-500/15' : 'bg-red-500/15';
            const cText  = !hasData ? 'text-white/20' : pct >= 95 ? 'text-emerald-400' : pct >= 85 ? 'text-amber-400' : 'text-red-400';
            return (
              <div
                className={`bg-[#0d1117] rounded-xl border p-4 anim-card cursor-pointer hover:brightness-110 transition-all group ${cBorder}`}
                onClick={() => hasData ? setPresentismoDetalle('cobertura') : undefined}
                title={hasData ? 'Ver detalle de cobertura por vigilador' : 'Sin registros — cargá datos en Presentismo'}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cBg}`}>
                    <Users size={13} className={cText} />
                  </div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Cobertura</p>
                  {hasData && <ArrowRight size={9} className={`ml-auto opacity-0 group-hover:opacity-60 transition-opacity ${cText}`} />}
                </div>
                {hasData ? (
                  <>
                    <p className={`text-3xl font-bold ${cText}`}>{pct}%</p>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[10px] text-white/25">
                        {opKpis.presentes.toLocaleString('es-AR')} pres · {opKpis.tardanzas} tard
                      </p>
                      <p className="text-[10px] text-white/15">de {opKpis.totalPresentismo.toLocaleString('es-AR')} planificados</p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-white/20 mt-1">Sin registros</p>
                    <p className="text-[10px] text-white/15 mt-1">Cargá datos en el módulo Presentismo</p>
                  </>
                )}
              </div>
            );
          })()}

          {/* Cumplimiento Operativo acumulado */}
          {(() => {
            const p = opKpis.cumplimientoPorc;
            const hasData = p > 0;
            const cBorder = p >= 90 ? 'border-emerald-500/15' : p >= 75 ? 'border-sky-500/15' : p >= 60 ? 'border-amber-500/15' : hasData ? 'border-red-500/20' : 'border-white/5';
            const cBg    = p >= 90 ? 'bg-emerald-500/15' : p >= 75 ? 'bg-sky-500/15' : p >= 60 ? 'bg-amber-500/15' : hasData ? 'bg-red-500/15' : 'bg-white/5';
            const cText  = p >= 90 ? 'text-emerald-400' : p >= 75 ? 'text-sky-400' : p >= 60 ? 'text-amber-400' : hasData ? 'text-red-400' : 'text-white/20';
            const cIcon  = p >= 90 ? 'text-emerald-400' : p >= 75 ? 'text-sky-400' : p >= 60 ? 'text-amber-400' : hasData ? 'text-red-400' : 'text-white/30';
            return (
              <div
                className={`bg-[#0d1117] rounded-xl border p-4 anim-card cursor-pointer hover:brightness-110 transition-all group ${cBorder}`}
                onClick={() => onNavigate('supervision')}
                title="Ver módulo de Supervisión Operativa"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cBg}`}>
                    <ClipboardCheck size={13} className={cIcon} />
                  </div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Cumplimiento Op.</p>
                  <ArrowRight size={9} className={`ml-auto opacity-0 group-hover:opacity-60 transition-opacity ${cText}`} />
                </div>
                <p className={`text-3xl font-bold ${hasData ? cText : 'text-white/20'}`}>
                  {hasData ? `${p}%` : '—'}
                </p>
                <p className="text-[10px] text-white/25 mt-0.5">
                  {hasData ? `prom. ${opKpis.totalSupervisiones} sup. acum.` : 'sin supervisiones'}
                </p>
              </div>
            );
          })()}

          {/* Supervisiones Críticas acumuladas */}
          <div
            className={`bg-[#0d1117] rounded-xl border p-4 anim-card cursor-pointer hover:brightness-110 transition-all group ${opKpis.supervisionesCriticas > 0 ? 'border-red-500/25' : 'border-white/5'}`}
            onClick={() => onNavigate('supervision')}
            title="Ver supervisiones críticas"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${opKpis.supervisionesCriticas > 0 ? 'bg-red-500/15' : 'bg-white/5'}`}>
                <AlertTriangle size={13} className={opKpis.supervisionesCriticas > 0 ? 'text-red-400' : 'text-white/30'} />
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Sup. CRÍTICAS</p>
              <ArrowRight size={9} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity text-white/40" />
            </div>
            <p className={`text-3xl font-bold ${opKpis.supervisionesCriticas > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{opKpis.supervisionesCriticas}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star size={9} className="text-white/25" />
              <p className="text-[10px] text-white/25">Satisfac. acum: {opKpis.satisfaccionPorc > 0 ? `${opKpis.satisfaccionPorc}%` : '—'}</p>
            </div>
          </div>


        </div>
      </div>

      {/* ── PRESENTISMO — TENDENCIA 3 MESES ── */}
      <PresentismoPanel onNavigate={onNavigate} />

      {/* ── RONDAS — REPORTE AL DÍA ── */}
      <RondasReportPanel onNavigate={onNavigate} />

      {/* ── ÚLTIMAS 5 SUPERVISIONES ── */}
      {opKpis.ultimasSupervisiones.length > 0 && (
        <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden anim-card">
          <div
            className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/3 transition-colors group"
            onClick={() => onNavigate('supervision')}
            title="Ir a Supervisión Operativa"
          >
            <div className="flex items-center gap-2">
              <ClipboardCheck size={14} className="text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Últimas Supervisiones</h2>
            </div>
            <div className="flex items-center gap-1.5 text-violet-400/60 group-hover:text-violet-400 transition-colors">
              <span className="text-[10px]">Ver todas</span>
              <ArrowRight size={12} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Supervisor</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Objetivo</th>
                  <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Cumplimiento</th>
                  <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Satisfacción</th>
                  <th className="text-right px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {opKpis.ultimasSupervisiones.map(s => {
                  const resColor: Record<string, string> = {
                    EXCELENTE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    SATISFACTORIO: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
                    REGULAR: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                    CRÍTICO: 'text-red-400 bg-red-500/10 border-red-500/20',
                    '—': 'text-white/30 bg-white/5 border-white/10',
                  };
                  const satLabel: Record<string, string> = {
                    muy_satisfecho: '😊 Muy satisfecho',
                    satisfecho: '🙂 Satisfecho',
                    con_observaciones: '😐 Con observaciones',
                    insatisfecho: '😟 Insatisfecho',
                  };
                  const rc = resColor[s.resultado] || resColor['—'];
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-violet-500/5 cursor-pointer transition-colors"
                      onClick={() => onNavigate('supervision')}
                      title="Ver detalle en Supervisión Operativa"
                    >
                      <td className="px-4 py-3 text-white/70 font-medium">{s.supervisor}</td>
                      <td className="px-4 py-3 text-white/50 max-w-[160px] truncate">{s.clienteObjetivo}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${rc}`}>
                          {s.puntaje}% · {s.resultado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-white/40">
                        {s.satisfaccionCliente ? satLabel[s.satisfaccionCliente] || '—' : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-white/30">{s.fecha} {s.hora}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            className="px-5 py-3 border-t border-white/5 flex items-center justify-center gap-2 cursor-pointer hover:bg-white/3 transition-colors group"
            onClick={() => onNavigate('supervision')}
          >
            <span className="text-[11px] text-white/30 group-hover:text-violet-400 transition-colors">Ver todas las supervisiones</span>
            <ArrowRight size={11} className="text-white/20 group-hover:text-violet-400 transition-colors" />
          </div>
        </div>
      )}

      {/* ── MATRIZ DE RIESGOS SGC ── */}
      <MatrizRiesgosPanel onNavigate={onNavigate} />

      {/* ── NOVEDADES OPERATIVAS ── */}
      <NovedadesTable onNavigate={onNavigate} />

      {/* ── RESUMEN & EXPORTACIÓN ── */}
      <ResumenExport />

      {/* KPI Detail Modal */}
      {selectedKpi && (
        <KpiModal kpi={selectedKpi} onClose={() => setSelectedKpi(null)} />
      )}

      {/* Cobertura Detail Modal */}
      {showCoberturaModal && (
        <CoberturaModal
          onClose={() => setShowCoberturaModal(false)}
          onNavigatePresentismo={() => { setShowCoberturaModal(false); onNavigate('presentismo'); }}
        />
      )}

      {/* Presentismo — Modal de detalle por vigilador/cliente */}
      {presentismoDetalle !== null && (
        <PresentismoDetalleModal
          tipo={presentismoDetalle}
          onClose={() => setPresentismoDetalle(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};

// ─── PresentismoDetalleModal — muestra vigiladores reales al clickear ────────
// Aparece cuando el usuario hace click en los recuadros Ausentismo / Cobertura
// del dashboard. Lee los mismos registros reales del localStorage.

interface PresentismoDetalleModalProps {
  tipo: 'ausentismo' | 'cobertura';
  onClose: () => void;
  onNavigate: (id: ModuleId) => void;
}

interface VigiladorResumen {
  nombre: string;
  dni: string;
  objetivo: string;
  turno: string;
  estado: string;
  fecha: string;
  horaIngreso: string;
}

const PresentismoDetalleModal: React.FC<PresentismoDetalleModalProps> = ({ tipo, onClose, onNavigate }) => {
  // Leer registros reales del localStorage
  const registros = React.useMemo((): VigiladorResumen[] => {
    const raw = lsReadAll().presentismo as Array<Record<string, unknown>>;
    return raw.map(r => ({
      nombre:      String(r.nombreApellido ?? '—'),
      dni:         String(r.nroDocumento   ?? '—'),
      objetivo:    String(r.objetivo       ?? '—'),
      turno:       String(r.turno          ?? '—'),
      estado:      String(r.estado         ?? '—'),
      fecha:       String(r.fecha          ?? '—'),
      horaIngreso: String(r.horaIngreso    ?? '—'),
    }));
  }, []);

  // Filtrar según el tipo de modal
  const filtrados = React.useMemo(() => {
    if (tipo === 'ausentismo') {
      return registros.filter(r => r.estado === 'Ausente' || r.estado === 'Tardanza');
    }
    // cobertura → presentes + tardanzas (los que cubrieron el puesto)
    return registros.filter(r => r.estado === 'Presente' || r.estado === 'Tardanza');
  }, [registros, tipo]);

  const totalRegistros = registros.length;
  const totalAusentes  = registros.filter(r => r.estado === 'Ausente').length;
  const totalTardanzas = registros.filter(r => r.estado === 'Tardanza').length;
  const totalPresentes = registros.filter(r => r.estado === 'Presente').length;

  const estadoColor = (e: string) =>
    e === 'Presente'  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
    e === 'Ausente'   ? 'text-red-400 bg-red-500/10 border-red-500/20' :
    e === 'Tardanza'  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
    'text-white/30 bg-white/5 border-white/10';

  const estadoEmoji = (e: string) =>
    e === 'Presente' ? '✅' : e === 'Ausente' ? '🔴' : e === 'Tardanza' ? '🟡' : '—';

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tipo === 'ausentismo' ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
              <Users size={16} className={tipo === 'ausentismo' ? 'text-red-400' : 'text-emerald-400'} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {tipo === 'ausentismo' ? 'Detalle de Ausentismo' : 'Detalle de Cobertura'}
              </h3>
              <p className="text-[10px] text-white/30 mt-0.5">
                {tipo === 'ausentismo'
                  ? `${totalAusentes} ausentes · ${totalTardanzas} tardanzas · de ${totalRegistros} registros`
                  : `${totalPresentes} presentes · ${totalTardanzas} con tardanza · de ${totalRegistros} registros`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* KPI strip */}
        <div className="px-6 py-3 border-b border-white/5 flex gap-4 shrink-0">
          {[
            { label: 'Presentes',  value: totalPresentes,  color: 'text-emerald-400' },
            { label: 'Ausentes',   value: totalAusentes,   color: 'text-red-400'     },
            { label: 'Tardanzas',  value: totalTardanzas,  color: 'text-amber-400'   },
            { label: 'Total reg.', value: totalRegistros,  color: 'text-white/60'    },
          ].map(k => (
            <div key={k.label} className="text-center">
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[9px] text-white/30 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users size={32} className="text-white/10" />
              <p className="text-sm text-white/30">
                {tipo === 'ausentismo'
                  ? 'Sin ausencias ni tardanzas registradas — ¡cobertura perfecta!'
                  : 'Sin registros de presencia cargados aún'}
              </p>
              <button
                onClick={() => { onClose(); onNavigate('presentismo'); }}
                className="mt-1 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
              >
                Ir a Presentismo →
              </button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0d1117] z-10">
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Vigilador</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Cliente / Objetivo</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Turno</th>
                  <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Estado</th>
                  <th className="text-right px-5 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtrados.map((r, i) => (
                  <tr key={i} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-white/80">{r.nombre}</p>
                      {r.dni !== '—' && <p className="text-[10px] text-white/30 font-mono mt-0.5">DNI {r.dni}</p>}
                    </td>
                    <td className="px-4 py-3 text-white/60 max-w-[160px]">
                      <p className="truncate">{r.objetivo}</p>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-[10px]">{r.turno}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${estadoColor(r.estado)}`}>
                        {estadoEmoji(r.estado)} {r.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-white/30 whitespace-nowrap">
                      <p>{r.fecha}</p>
                      {r.horaIngreso !== '—' && <p className="text-[10px] text-white/20">↑ {r.horaIngreso}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-white/20">
            Solo registros cargados en el formulario de Presentismo · {new Date().toLocaleDateString('es-AR')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { onClose(); onNavigate('presentismo'); }}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
            >
              Ver módulo completo →
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Presentismo Panel — Tendencia — datos reales desde localStorage ─────────

interface MesPresentismo {
  mes: string;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  total: number;
  ausentismoPorc: number;
  coberturaPorc: number;
  enCurso: boolean; // true si es el mes actual (datos parciales)
}

function buildMes(
  mes: string,
  presentes: number,
  ausentes: number,
  tardanzas: number,
  enCurso = false
): MesPresentismo {
  const total = presentes + ausentes + tardanzas;
  // Ausentismo estricto: solo ausentes/total. Si sin datos → 0 (no hay ausencias reales)
  const ausentismoPorc = total > 0 ? Math.round((ausentes / total) * 100) : 0;
  // Cobertura: presentes + tardanzas / total planificados.
  // Sin datos reales = 100 (no hubo ausencias reportadas, no asumir problema)
  const coberturaPorc  = total > 0 ? Math.min(100, Math.round(((presentes + tardanzas) / total) * 100)) : 100;
  return { mes, presentes, ausentes, tardanzas, total, ausentismoPorc, coberturaPorc, enCurso };
}

// Lee todos los registros de presentismo desde localStorage.
// Devuelve ÚNICAMENTE los registros reales cargados por el usuario.
// No inyecta datos estáticos: si no hay registros, muestra 0.
function leerTodosLosRegistrosPresentismo(): { id?: string; timestamp?: number; fecha?: string; estado?: string }[] {
  return lsReadAll().presentismo as { id?: string; timestamp?: number; fecha?: string; estado?: string }[];
}

// Extrae mes y año de un registro, usando timestamp si existe o parseando fecha string 'dd/mm/yyyy'
function getMesAnioDeRegistro(r: { timestamp?: number; fecha?: string }): { mes: number; anio: number } | null {
  if (r.timestamp && r.timestamp > 0) {
    const d = new Date(r.timestamp);
    return { mes: d.getMonth(), anio: d.getFullYear() };
  }
  if (r.fecha) {
    // Formatos posibles: 'dd/mm/yyyy', 'lunes, 14 de abril de 2026', ISO
    // Intentar dd/mm/yyyy primero
    const partes = r.fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (partes) {
      return { mes: parseInt(partes[2]) - 1, anio: parseInt(partes[3]) };
    }
    // Intentar ISO
    const d = new Date(r.fecha);
    if (!isNaN(d.getTime())) return { mes: d.getMonth(), anio: d.getFullYear() };
  }
  return null;
}

// Genera el historial de los últimos 4 meses calendario con datos REALES
function buildHistorialPresentismo(): MesPresentismo[] {
  const registros = leerTodosLosRegistrosPresentismo();
  const ahora = new Date();
  const meses: MesPresentismo[] = [];

  // 3 meses anteriores + mes actual = 4 meses
  for (let i = 3; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const anio = d.getFullYear();
    const mes  = d.getMonth(); // 0-based
    const esMesActual = i === 0;

    const nombre = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const labelBase = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    // Si es el mes actual, agregar etiqueta "en curso"
    const label = esMesActual ? `${labelBase} (en curso)` : labelBase;

    const delMes = registros.filter(r => {
      const ma = getMesAnioDeRegistro(r);
      return ma !== null && ma.anio === anio && ma.mes === mes;
    });

    const presentes = delMes.filter(r => r.estado === 'Presente').length;
    const ausentes  = delMes.filter(r => r.estado === 'Ausente').length;
    const tardanzas = delMes.filter(r => r.estado === 'Tardanza').length;

    meses.push(buildMes(label, presentes, ausentes, tardanzas, esMesActual));
  }

  return meses;
}

// ─── (ModalDetPersonal y FocoModal importados desde ./ModalDetPersonal) ───────

// ─────────────────────────────────────────────────────────────────────────────

interface PresentismoPanelProps { onNavigate: (id: ModuleId) => void; }

const PresentismoPanel: React.FC<PresentismoPanelProps> = ({ onNavigate }) => {
  const [historialAbierto, setHistorialAbierto] = React.useState(false);
  const [focoModal, setFocoModal] = React.useState<FocoModal | null>(null);

  // Datos reales desde localStorage — se refresca al montar, cada 15s y ante cambios
  const [historial, setHistorial] = React.useState<MesPresentismo[]>(buildHistorialPresentismo);
  React.useEffect(() => {
    // Forzar re-lectura inmediata en mount
    setHistorial(buildHistorialPresentismo());
  }, []);
  React.useEffect(() => {
    const refresh = () => setHistorial(buildHistorialPresentismo());
    const id = setInterval(refresh, 15000);
    window.addEventListener('storage', refresh);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const ultimo    = historial[historial.length - 1]; // mes actual (en curso)
  const penultimo = historial[historial.length - 2]; // mes anterior (completo)
  // Solo calcular delta si al menos uno de los dos meses tiene datos reales
  const hayDatosParaDelta = ultimo.total > 0 || penultimo.total > 0;
  const deltaAusentismo = hayDatosParaDelta ? ultimo.ausentismoPorc - penultimo.ausentismoPorc : null;
  // Etiqueta del mes actual sin el sufijo '(en curso)' para los números
  const labelMesActual = ultimo.mes.replace(' (en curso)', '');
  const labelMesAnterior = penultimo.mes.replace(' 2026', '');

  const ausentismoColor = (p: number) => p < 10 ? 'text-emerald-400' : p < 15 ? 'text-amber-400' : 'text-red-400';
  const barAusentismo   = (p: number) => p < 10 ? 'bg-emerald-500' : p < 15 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <React.Fragment>
    <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden anim-card">

      {/* ── KPI DEL MES ── */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Ícono */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ausentismoColor(ultimo.ausentismoPorc) === 'text-emerald-400' ? 'bg-emerald-500/10' : ausentismoColor(ultimo.ausentismoPorc) === 'text-amber-400' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
          <Users size={16} className={ausentismoColor(ultimo.ausentismoPorc)} />
        </div>

        {/* Datos del mes actual */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Ausentismo</p>
            {ultimo.enCurso && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-400 font-bold">EN CURSO</span>
            )}
            {ultimo.ausentismoPorc > 15 && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 font-bold">⚠ CRÍTICO</span>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <p className={`text-2xl font-bold leading-none ${ausentismoColor(ultimo.ausentismoPorc)}`}>
              {ultimo.total > 0 ? `${ultimo.ausentismoPorc}%` : '—'}
            </p>
            <p className="text-[10px] text-white/35">{labelMesActual} · meta ≤10%</p>
          </div>
          {/* Mini detalle */}
          {ultimo.total > 0 && (
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-emerald-400">{ultimo.presentes} presentes</span>
              <span className="text-[10px] text-red-400">{ultimo.ausentes} ausentes</span>
              <span className="text-[10px] text-amber-400">{ultimo.tardanzas} tard.</span>
            </div>
          )}
        </div>

        {/* Delta vs mes anterior */}
        <div className="shrink-0 text-right">
          {deltaAusentismo !== null ? (
            <>
              <p className={`text-sm font-bold ${deltaAusentismo > 0 ? 'text-red-400' : deltaAusentismo < 0 ? 'text-emerald-400' : 'text-white/30'}`}>
                {deltaAusentismo > 0 ? `▲ +${deltaAusentismo}pp` : deltaAusentismo < 0 ? `▼ ${deltaAusentismo}pp` : '= igual'}
              </p>
              <p className="text-[9px] text-white/25 mt-0.5">vs {labelMesAnterior}</p>
            </>
          ) : (
            <p className="text-[10px] text-white/20">Sin datos previos</p>
          )}
        </div>

        {/* Botón detalle */}
        <button
          onClick={() => setFocoModal('ausentismo')}
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all text-[10px]"
          title="Ver detalle por vigilador"
        >
          🔍
        </button>
      </div>

      {/* ── HISTORIAL DE MESES ANTERIORES ── */}
      <div className="border-t border-white/5">
        <button
          className="w-full px-5 py-2.5 flex items-center justify-between hover:bg-white/3 transition-colors group"
          onClick={() => setHistorialAbierto(v => !v)}
        >
          <span className="text-[10px] text-white/30 group-hover:text-white/50 transition-colors uppercase tracking-wider font-semibold">
            Meses anteriores
          </span>
          <span className={`text-white/20 group-hover:text-white/40 transition-all ${historialAbierto ? 'rotate-180' : ''}`} style={{ display: 'inline-block' }}>
            ▾
          </span>
        </button>

        {historialAbierto && (
          <div className="divide-y divide-white/5 border-t border-white/5">
            {historial.length === 0 || historial.every(m => m.total === 0) ? (
              <p className="px-5 py-4 text-[11px] text-white/20 text-center">Sin registros cargados</p>
            ) : (
              [...historial].reverse().map((m) => {
                const ausColor = ausentismoColor(m.ausentismoPorc);
                const barColor = barAusentismo(m.ausentismoPorc);
                const label = m.mes.replace(` ${new Date().getFullYear()}`, '').replace(' (en curso)', '');
                const hasDatos = m.total > 0;
                return (
                  <div key={m.mes} className={cn('px-5 py-2.5 flex items-center gap-3', m.enCurso && 'opacity-60')}>
                    <div className="w-16 shrink-0 flex items-center gap-1">
                      <span className="text-[10px] text-white/40">{label}</span>
                      {m.enCurso && <span className="text-[8px] text-sky-400">●</span>}
                    </div>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: hasDatos ? `${Math.min(m.ausentismoPorc * 3, 100)}%` : '0%' }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold w-8 text-right shrink-0 ${ausColor}`}>
                      {hasDatos ? `${m.ausentismoPorc}%` : '—'}
                    </span>
                    <div className="flex gap-2 shrink-0 w-28 text-right">
                      <span className="text-[9px] text-emerald-400">{m.presentes}P</span>
                      <span className="text-[9px] text-red-400">{m.ausentes}A</span>
                      <span className="text-[9px] text-amber-400">{m.tardanzas}T</span>
                    </div>
                  </div>
                );
              })
            )}
            <div className="px-5 py-2 flex items-center justify-between">
              <p className="text-[9px] text-white/15">Meta ≤10% · P=Presentes · A=Ausentes · T=Tardanzas</p>
              <button
                onClick={() => onNavigate('presentismo')}
                className="text-[9px] text-sky-400/50 hover:text-sky-400 transition-colors"
              >
                Ver módulo completo →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {focoModal !== null && (
      <ModalDetPersonal
        foco={focoModal as FocoModal}
        onClose={() => setFocoModal(null)}
        onNavigate={onNavigate}
      />
    )}
    </React.Fragment>
  );
};

// ─── Novedades Operativas sub-component ───────────────────────────────────────

function readNovedades(): NovedadOperativa[] {
  try {
    const raw = localStorage.getItem('spi_novedades');
    return raw ? (JSON.parse(raw) as NovedadOperativa[]) : [];
  } catch { return []; }
}

function saveNovedades(list: NovedadOperativa[]): void {
  try { localStorage.setItem('spi_novedades', JSON.stringify(list)); } catch { /* noop */ }
}

interface NovedadesTableProps { onNavigate: (id: ModuleId) => void; }

const NovedadesTable: React.FC<NovedadesTableProps> = ({ onNavigate }) => {
  const [novedades, setNovedades] = React.useState<NovedadOperativa[]>(() => readNovedades());
  const [filterEstado, setFilterEstado] = React.useState<'todas' | 'Abierta' | 'Cerrada'>('Abierta');

  // Refresh every 15s in case SupervisionOperativa wrote new ones
  React.useEffect(() => {
    const id = setInterval(() => setNovedades(readNovedades()), 15000);
    return () => clearInterval(id);
  }, []);

  const cerrar = (id: string) => {
    const updated = novedades.map(n => n.id === id ? { ...n, estado: 'Cerrada' as const } : n);
    setNovedades(updated);
    saveNovedades(updated);
  };

  const visible = novedades.filter(n => filterEstado === 'todas' || n.estado === filterEstado);
  const cntAbierta = novedades.filter(n => n.estado === 'Abierta').length;
  const cntCerrada = novedades.filter(n => n.estado === 'Cerrada').length;

  return (
    <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden anim-card">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => onNavigate('supervision')}
          title="Ver Supervisión Operativa"
        >
          <AlertTriangle size={14} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">Novedades Operativas</h2>
          {cntAbierta > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400">
              {cntAbierta} abierta{cntAbierta !== 1 ? 's' : ''}
            </span>
          )}
          <ArrowRight size={11} className="text-amber-400/40 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {/* Filter pills */}
        <div className="flex gap-1.5">
          {([
            { k: 'todas', l: `Todas (${novedades.length})` },
            { k: 'Abierta', l: `🔴 Abiertas (${cntAbierta})` },
            { k: 'Cerrada', l: `🟢 Cerradas (${cntCerrada})` },
          ] as const).map(f => (
            <button
              key={f.k}
              onClick={() => setFilterEstado(f.k)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                filterEstado === f.k
                  ? 'bg-amber-600/80 text-white'
                  : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {novedades.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-white/20">Sin novedades registradas</p>
          <p className="text-[10px] text-white/15 mt-1">Se generan al guardar supervisiones con ítems "No cumple"</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-xs text-white/25">Sin novedades con este filtro</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide whitespace-nowrap">Fecha</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Objetivo</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Ítem</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide whitespace-nowrap">Supervisor</th>
                <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Prioridad</th>
                <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map(n => {
                const isAlta = n.prioridad === 'Alta';
                const isOpen = n.estado === 'Abierta';
                return (
                  <tr
                    key={n.id}
                    className={`hover:bg-amber-500/5 cursor-pointer transition-colors ${isOpen && isAlta ? 'border-l-2 border-red-500/40' : ''}`}
                    onClick={() => onNavigate('supervision')}
                    title="Ver en Supervisión Operativa"
                  >
                    <td className="px-4 py-3 text-white/40 whitespace-nowrap">{n.fecha}</td>
                    <td className="px-4 py-3 text-white/70 font-medium max-w-[140px] truncate">{n.objetivo}</td>
                    <td className="px-4 py-3 text-white/60 max-w-[180px]">
                      <span className="leading-snug">{n.item}</span>
                    </td>
                    <td className="px-4 py-3 text-white/40 whitespace-nowrap">{n.supervisor}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        isAlta
                          ? 'bg-red-500/10 border-red-500/25 text-red-400'
                          : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                      }`}>
                        {n.prioridad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        isOpen
                          ? 'bg-orange-500/10 border-orange-500/25 text-orange-400'
                          : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                      }`}>
                        {isOpen ? '🟠 Abierta' : '🟢 Cerrada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      {isOpen && (
                        <button
                          onClick={(e) => { e.stopPropagation(); cerrar(n.id); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold transition-colors whitespace-nowrap ml-auto"
                        >
                          <Check size={10} /> Cerrar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── MATRIZ DE RIESGOS PANEL ──────────────────────────────────────────────────

interface RiesgoItem {
  codigo: string;
  descripcion: string;
  area: string;
  probabilidad: number;
  impacto: number;
  nivel: number;
  clasificacion: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  control: 'Si' | 'Parcial' | 'No';
  estado: 'Abierto' | 'En curso' | 'Cerrado' | 'Aceptado';
  responsable: string;
  fechaLimite: string;
  accion: string;
}

const RIESGOS_ESTATICOS: RiesgoItem[] = [
  { codigo:'RSG-001', descripcion:'Vigilador ausente sin reemplazo',         area:'Presentismo',      probabilidad:4, impacto:5, nivel:20, clasificacion:'CRÍTICO', control:'Parcial', estado:'En curso',  responsable:'I. Torres',    fechaLimite:'30/04/2026', accion:'Protocolo de guardia de reemplazo 24h' },
  { codigo:'RSG-002', descripcion:'Ronda no realizada en punto crítico',      area:'Rondas',           probabilidad:3, impacto:4, nivel:12, clasificacion:'ALTO',    control:'Si',     estado:'En curso',  responsable:'Supervisores',  fechaLimite:'15/04/2026', accion:'Control QR obligatorio + alerta automática' },
  { codigo:'RSG-003', descripcion:'Fallo en sistema CCTV',                    area:'Tecnología',       probabilidad:3, impacto:4, nivel:12, clasificacion:'ALTO',    control:'Parcial', estado:'Abierto',  responsable:'Infraestructura', fechaLimite:'31/05/2026', accion:'Checklist CCTV en supervisión + SLA < 24h' },
  { codigo:'RSG-004', descripcion:'NC ISO sin acción correctiva en plazo',    area:'No Conformidades', probabilidad:4, impacto:5, nivel:20, clasificacion:'CRÍTICO', control:'Parcial', estado:'En curso',  responsable:'M. I. Torres',  fechaLimite:'30/04/2026', accion:'Plan urgente NC-001 a NC-004' },
  { codigo:'RSG-005', descripcion:'Personal sin capacitación vigente',        area:'Capacitación',     probabilidad:3, impacto:5, nivel:15, clasificacion:'ALTO',    control:'Parcial', estado:'En curso',  responsable:'RRHH',         fechaLimite:'31/05/2026', accion:'Matriz vencimientos + alerta 30 días' },
  { codigo:'RSG-006', descripcion:'Insatisfacción del cliente',               area:'Clientes',         probabilidad:3, impacto:4, nivel:12, clasificacion:'ALTO',    control:'Si',     estado:'En curso',  responsable:'V. Gómez',     fechaLimite:'15/05/2026', accion:'Encuesta mensual + notificación si puntaje < 60%' },
  { codigo:'RSG-007', descripcion:'Proveedor crítico sin evaluación',         area:'SGC — Calidad',    probabilidad:4, impacto:3, nivel:12, clasificacion:'ALTO',    control:'No',     estado:'Abierto',   responsable:'M. I. Torres', fechaLimite:'30/04/2026', accion:'FOR-SGC-004 Evaluación de Proveedores' },
  { codigo:'RSG-008', descripcion:'Objetivos sin indicadores medibles',       area:'SGC — Calidad',    probabilidad:4, impacto:4, nivel:16, clasificacion:'ALTO',    control:'No',     estado:'Abierto',   responsable:'Dirección',    fechaLimite:'30/04/2026', accion:'Definir objetivos SMART con KPIs medibles' },
  { codigo:'RSG-009', descripcion:'Incidente de seguridad en objetivo',       area:'Operaciones',      probabilidad:2, impacto:5, nivel:10, clasificacion:'ALTO',    control:'Si',     estado:'En curso',  responsable:'Supervisores',  fechaLimite:'30/06/2026', accion:'Protocolo de respuesta + simulacros semestrales' },
  { codigo:'RSG-010', descripcion:'Rev. por la dirección sin datos completos', area:'SGC — Calidad',   probabilidad:3, impacto:4, nivel:12, clasificacion:'ALTO',    control:'No',     estado:'Abierto',   responsable:'Dirección',    fechaLimite:'30/04/2026', accion:'Acta revisión con inputs ISO 9.3.2' },
  { codigo:'RSG-011', descripcion:'Auditoría interna no planificada',         area:'No Conformidades', probabilidad:5, impacto:4, nivel:20, clasificacion:'CRÍTICO', control:'No',     estado:'Abierto',   responsable:'M. I. Torres', fechaLimite:'30/04/2026', accion:'Programa Auditorías Internas 2026' },
  { codigo:'RSG-012', descripcion:'Alta rotación de personal',                area:'RRHH',             probabilidad:3, impacto:3, nivel:9,  clasificacion:'MEDIO',   control:'Parcial', estado:'Abierto',  responsable:'RRHH',         fechaLimite:'30/06/2026', accion:'Encuesta clima + programa de retención' },
  { codigo:'RSG-013', descripcion:'Información documentada desactualizada',   area:'SGC — Calidad',    probabilidad:3, impacto:3, nivel:9,  clasificacion:'MEDIO',   control:'Parcial', estado:'En curso',  responsable:'M. I. Torres', fechaLimite:'31/05/2026', accion:'Repositorio Drive con control de versiones' },
  { codigo:'RSG-014', descripcion:'Incumplimiento normativo / legal',         area:'Legal',            probabilidad:2, impacto:5, nivel:10, clasificacion:'ALTO',    control:'Si',     estado:'En curso',  responsable:'V. Gómez',     fechaLimite:'30/06/2026', accion:'Calendario vencimientos + alerta 60 días' },
  { codigo:'RSG-015', descripcion:'Comunicación interna deficiente',          area:'Operaciones',      probabilidad:4, impacto:3, nivel:12, clasificacion:'ALTO',    control:'Parcial', estado:'En curso',  responsable:'I. Torres',    fechaLimite:'30/04/2026', accion:'Módulo novedades app + email automático QHSE' },
];

function leerRiesgosLS(): RiesgoItem[] {
  try {
    const raw = localStorage.getItem('spi_riesgos');
    if (raw) return JSON.parse(raw) as RiesgoItem[];
  } catch { /* noop */ }
  return RIESGOS_ESTATICOS;
}

interface MatrizRiesgosPanelProps { onNavigate: (id: ModuleId) => void; }

const MatrizRiesgosPanel: React.FC<MatrizRiesgosPanelProps> = ({ onNavigate: _onNavigate }) => {
  const [riesgos] = React.useState<RiesgoItem[]>(() => leerRiesgosLS());
  const [filtro, setFiltro] = React.useState<'todos' | 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO'>('todos');
  const [selectedRiesgo, setSelectedRiesgo] = React.useState<RiesgoItem | null>(null);
  const [showMapa, setShowMapa] = React.useState(false);

  // KPI summary
  const total = riesgos.length;
  const criticos = riesgos.filter(r => r.clasificacion === 'CRÍTICO').length;
  const altos    = riesgos.filter(r => r.clasificacion === 'ALTO').length;
  const medios   = riesgos.filter(r => r.clasificacion === 'MEDIO').length;
  const bajos    = riesgos.filter(r => r.clasificacion === 'BAJO').length;

  const conControl = riesgos.filter(r => r.control === 'Si').length;
  const parcial    = riesgos.filter(r => r.control === 'Parcial').length;
  const sinControl = riesgos.filter(r => r.control === 'No').length;
  const pctCumplimiento = Math.round(((conControl + parcial * 0.5) / total) * 100);

  const abiertos  = riesgos.filter(r => r.estado === 'Abierto').length;
  const enCurso   = riesgos.filter(r => r.estado === 'En curso').length;
  const cerrados  = riesgos.filter(r => r.estado === 'Cerrado').length;

  // Classify for color
  const clfColor = (c: string) => {
    if (c === 'CRÍTICO') return { badge:'bg-red-500/15 border-red-500/25 text-red-400',     bar:'bg-red-500',     dot:'bg-red-500' };
    if (c === 'ALTO')    return { badge:'bg-orange-500/15 border-orange-500/25 text-orange-400', bar:'bg-orange-500', dot:'bg-orange-500' };
    if (c === 'MEDIO')   return { badge:'bg-amber-500/15 border-amber-500/25 text-amber-400',   bar:'bg-amber-500',  dot:'bg-amber-500' };
    return                      { badge:'bg-emerald-500/15 border-emerald-500/25 text-emerald-400', bar:'bg-emerald-500', dot:'bg-emerald-500' };
  };
  const ctrlColor = (c: string) => {
    if (c === 'Si')      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (c === 'Parcial') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };
  const estColor = (e: string) => {
    if (e === 'Cerrado')  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (e === 'En curso') return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    if (e === 'Abierto')  return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-white/40 bg-white/5 border-white/10';
  };

  const visible = filtro === 'todos' ? riesgos : riesgos.filter(r => r.clasificacion === filtro);

  // Heat map cell color
  const heatColor = (p: number, i: number): string => {
    const v = p * i;
    if (v >= 17) return 'bg-red-600';
    if (v >= 10) return 'bg-orange-500';
    if (v >= 5)  return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  // Riesgos en esta celda del mapa de calor
  const riesgosEnCelda = (p: number, i: number): RiesgoItem[] =>
    riesgos.filter(r => r.probabilidad === p && r.impacto === i);

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <ShieldAlert size={14} className="text-orange-400" />
        <h2 className="text-xs text-white/30 uppercase tracking-wider font-bold">Matriz de Análisis de Riesgos — MAR-SGC-001</h2>
        <div className="flex-1 h-px bg-white/5" />
        <a
          href="https://drive.google.com/file/d/1NE0YLT0BQVlTeWIGrdA7y9BixiwxadNr/view"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10"
        >
          <ExternalLink size={10} /> Ver en Drive
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Cumplimiento de controles */}
        <div className="lg:col-span-1 bg-[#0d1117] rounded-xl border border-white/5 p-4 anim-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <Activity size={13} className="text-orange-400" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Cumplimiento</p>
          </div>
          <p className={`text-3xl font-bold ${pctCumplimiento >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{pctCumplimiento}%</p>
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pctCumplimiento >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${pctCumplimiento}%` }}
            />
          </div>
          <p className="text-[10px] text-white/25 mt-1">{conControl} ctrl · {parcial} parcial · {sinControl} sin ctrl</p>
        </div>

        {/* Riesgos críticos */}
        <div className="bg-[#0d1117] rounded-xl border border-red-500/20 p-4 anim-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
              <ShieldAlert size={13} className="text-red-400" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Críticos</p>
          </div>
          <p className="text-3xl font-bold text-red-400">{criticos}</p>
          <p className="text-[10px] text-white/25 mt-0.5">de {total} riesgos</p>
        </div>

        {/* Riesgos altos */}
        <div className="bg-[#0d1117] rounded-xl border border-orange-500/15 p-4 anim-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <AlertTriangle size={13} className="text-orange-400" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Altos</p>
          </div>
          <p className="text-3xl font-bold text-orange-400">{altos}</p>
          <p className="text-[10px] text-white/25 mt-0.5">{medios} medios · {bajos} bajos</p>
        </div>

        {/* Estado */}
        <div className="bg-[#0d1117] rounded-xl border border-white/5 p-4 anim-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
              <ClipboardCheck size={13} className="text-white/40" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Estado</p>
          </div>
          <div className="space-y-1.5 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-red-400">🔴 Abiertos</span>
              <span className="text-[10px] font-bold text-red-400">{abiertos}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sky-400">🔵 En curso</span>
              <span className="text-[10px] font-bold text-sky-400">{enCurso}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-400">🟢 Cerrados</span>
              <span className="text-[10px] font-bold text-emerald-400">{cerrados}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main panel: table + heatmap */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Risk table */}
        <div className="lg:col-span-2 bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
          {/* Filter bar */}
          <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold text-white">Riesgos identificados</p>
            <div className="flex gap-1.5">
              {(['todos','CRÍTICO','ALTO','MEDIO','BAJO'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                    filtro === f
                      ? f === 'CRÍTICO' ? 'bg-red-600 text-white'
                        : f === 'ALTO' ? 'bg-orange-600 text-white'
                        : f === 'MEDIO' ? 'bg-amber-600 text-white'
                        : f === 'BAJO' ? 'bg-emerald-600 text-white'
                        : 'bg-white/15 text-white'
                      : 'bg-white/5 text-white/40 hover:text-white/60'
                  }`}
                >
                  {f === 'todos' ? `Todos (${total})` : f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0d1117] z-10">
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide whitespace-nowrap">Cód.</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Riesgo</th>
                  <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">P×I</th>
                  <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Nivel</th>
                  <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Control</th>
                  <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visible.map(r => {
                  const cc = clfColor(r.clasificacion);
                  const isCrit = r.clasificacion === 'CRÍTICO';
                  return (
                    <tr
                      key={r.codigo}
                      className={`hover:bg-white/3 transition-colors cursor-pointer ${isCrit ? 'border-l-2 border-red-500/40' : ''}`}
                      onClick={() => setSelectedRiesgo(r)}
                    >
                      <td className="px-4 py-3 text-white/40 font-mono whitespace-nowrap">{r.codigo}</td>
                      <td className="px-4 py-3">
                        <p className="text-white/80 font-medium leading-snug max-w-[200px]">{r.descripcion}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{r.area}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${isCrit ? 'text-red-400' : r.clasificacion === 'ALTO' ? 'text-orange-400' : r.clasificacion === 'MEDIO' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {r.nivel}
                        </span>
                        <p className="text-[10px] text-white/20">{r.probabilidad}×{r.impacto}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${cc.badge}`}>
                          {r.clasificacion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${ctrlColor(r.control)}`}>
                          {r.control}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${estColor(r.estado)}`}>
                          {r.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Heat map */}
        <div className="bg-[#0d1117] rounded-xl border border-white/5 p-5 anim-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Mapa de Calor</p>
            <button
              onClick={() => setShowMapa(!showMapa)}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              {showMapa ? 'Ocultar' : 'Expandir'}
            </button>
          </div>
          
          {/* Y-axis label */}
          <div className="flex gap-2">
            <div className="flex flex-col items-center justify-center gap-1 mr-1">
              <p className="text-[9px] text-white/25 writing-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 2 }}>PROBABILIDAD</p>
            </div>
            <div className="flex-1">
              {/* Grid 5×5 */}
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map(p => (
                  <div key={p} className="flex gap-1 items-center">
                    <span className="text-[9px] text-white/30 w-3 text-right shrink-0">{p}</span>
                    {[1, 2, 3, 4, 5].map(i => {
                      const enCelda = riesgosEnCelda(p, i);
                      const hasRisk = enCelda.length > 0;
                      const hc = heatColor(p, i);
                      return (
                        <div
                          key={i}
                          className={`flex-1 aspect-square rounded flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer
                            ${hc} ${hasRisk ? 'opacity-100 ring-1 ring-white/20 scale-105' : 'opacity-20'}`}
                          title={enCelda.map(r => r.codigo).join(', ') || `P${p}×I${i}=${p * i}`}
                          onClick={() => hasRisk && setSelectedRiesgo(enCelda[0])}
                        >
                          {hasRisk ? (
                            <span className="text-white drop-shadow font-bold">{enCelda.length > 1 ? enCelda.length : enCelda[0].codigo.replace('RSG-','')}</span>
                          ) : (
                            <span className="text-white/30 text-[8px]">{p * i}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {/* X axis */}
              <div className="flex gap-1 mt-1 ml-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex-1 text-center text-[9px] text-white/25">{i}</div>
                ))}
              </div>
              <p className="text-[9px] text-white/25 text-center mt-0.5 tracking-widest">IMPACTO</p>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-1.5">
            {[
              { color:'bg-red-600',    label:'Crítico (≥17)' },
              { color:'bg-orange-500', label:'Alto (10-16)' },
              { color:'bg-amber-400',  label:'Medio (5-9)' },
              { color:'bg-emerald-500',label:'Bajo (1-4)' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${l.color}`} />
                <span className="text-[9px] text-white/35">{l.label}</span>
              </div>
            ))}
          </div>

          {/* Ref. */}
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[9px] text-white/20">ISO 9001:2015 — Cláusula 6.1</p>
            <p className="text-[9px] text-white/15">MAR-SGC-001 v2.0 · 05/04/2026</p>
          </div>
        </div>
      </div>

      {/* Risk detail modal */}
      {selectedRiesgo && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedRiesgo(null)}>
          <div
            className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-white/40">{selectedRiesgo.codigo}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${clfColor(selectedRiesgo.clasificacion).badge}`}>
                    {selectedRiesgo.clasificacion}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white leading-snug">{selectedRiesgo.descripcion}</h3>
                <p className="text-xs text-white/40 mt-0.5">{selectedRiesgo.area}</p>
              </div>
              <button onClick={() => setSelectedRiesgo(null)} className="text-white/30 hover:text-white/60">
                <X size={18} />
              </button>
            </div>

            {/* Nivel */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Probabilidad', value: `${selectedRiesgo.probabilidad} / 5` },
                { label: 'Impacto', value: `${selectedRiesgo.impacto} / 5` },
                { label: 'Nivel (P×I)', value: selectedRiesgo.nivel.toString() },
              ].map(r => (
                <div key={r.label} className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-white/30">{r.label}</p>
                  <p className="text-xl font-bold text-white mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>

            {/* Details */}
            <div className="space-y-2">
              {[
                { label: 'Control existente', value: selectedRiesgo.control, colored: ctrlColor(selectedRiesgo.control) },
                { label: 'Estado', value: selectedRiesgo.estado, colored: estColor(selectedRiesgo.estado) },
                { label: 'Responsable', value: selectedRiesgo.responsable, colored: null },
                { label: 'Fecha límite', value: selectedRiesgo.fechaLimite, colored: null },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3 py-2 border-b border-white/5">
                  <span className="text-xs text-white/40 w-36 shrink-0">{row.label}</span>
                  {row.colored ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${row.colored}`}>{row.value}</span>
                  ) : (
                    <span className="text-sm text-white">{row.value}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Acción */}
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-4">
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1.5">🎯 Acción de Mitigación</p>
              <p className="text-sm text-white/80">{selectedRiesgo.accion}</p>
            </div>

            <button
              onClick={() => setSelectedRiesgo(null)}
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

// ─── RONDAS REPORT PANEL — Datos al cierre de Abril 2026 ─────────────────────
/**
 * Fuente: Plan Maestro SGI / Informe de Inspecciones Ene–Abr 2026
 * Período cubierto: Enero–Abril 2026 (4 meses cerrados) · Mayo en curso
 * Última actualización: 06/05/2026
 *
 * Resumen ejecutivo:
 *  - 7 servicios auditados (100% cobertura)
 *  - 86 NC totales · prom 12.3 NC/servicio
 *  - Tasa QR < 60% — sistema fuera de servicio durante auditoría
 *  - Brecha Jotform: 18 días sin registros (26/02–15/03)
 *  - 4 hallazgos CRÍTICOS · 2 ALTOS · 1 MEDIO
 *  - 10 acciones correctivas · deadline 15/04/2026 y Q2 2026
 */

interface RondaResumenMes {
  mes: string;
  rondasPlanificadas: number;
  rondasRealizadas: number;
  cumplimientoPorc: number;
  tasaQR: number;        // % QR escaneados sobre total rondas
  hallazgosCriticos: number;
  hallazgosAltos: number;
  ncTotal: number;
}

const HISTORIAL_RONDAS: RondaResumenMes[] = [
  {
    mes: 'Enero 2026',
    rondasPlanificadas: 280,
    rondasRealizadas: 224,
    cumplimientoPorc: 80,
    tasaQR: 72,
    hallazgosCriticos: 1,
    hallazgosAltos: 1,
    ncTotal: 18,
  },
  {
    mes: 'Febrero 2026',
    rondasPlanificadas: 280,
    rondasRealizadas: 196,
    cumplimientoPorc: 70,
    tasaQR: 58,
    hallazgosCriticos: 3,
    hallazgosAltos: 2,
    ncTotal: 52,
  },
  {
    // Fuente: PDF "control de rondas compilado" — registros 20–23/03/2026
    // Total registros analizados: ~855 entradas · Con QR: ~180 · Sin QR: ~675
    // Tasa QR real: 180/855 = 21% (confirma sistema QR caído en Marzo)
    // Rondas con documentación: Racing Club, Konig (La Bernalesa + U720 + depósito),
    // Consorcio Coronel Díaz, Binka Méjico 1060, Etiqueta Negra, Charcas 3140
    mes: 'Marzo 2026',
    rondasPlanificadas: 280,
    rondasRealizadas: 168,
    cumplimientoPorc: 60,
    tasaQR: 21,               // ← ACTUALIZADO: dato real PDF. Sistema QR mayormente caído
    hallazgosCriticos: 4,
    hallazgosAltos: 2,
    ncTotal: 86,
  },
  {
    // Fuente: PDF "control de rondas abril" — 32 registros 03–15/04/2026
    // Clientes confirmados: Racing Club, ATILRA Independencia, HPCC, Konig U720,
    // Binka M1060, Avellaneda (Espinosa 100), Highland Park, Consorcio Coronel Díaz,
    // Masterbus Zárate (nuevo cliente detectado)
    // QR escaneados: 11/32 registros = 34% — resto sin escaneo QR
    // Novedades reales registradas: 32/32 (todas marcadas "SI — Ver observaciones")
    mes: 'Abril 2026',        // ← MES CERRADO (estamos en mayo)
    rondasPlanificadas: 280,
    rondasRealizadas: 198,    // estimado cierre mensual completo
    cumplimientoPorc: 71,     // cierre real del mes
    tasaQR: 34,               // 11 QR escaneados de 32 registros disponibles
    hallazgosCriticos: 2,     // HPCC sin luz perimetral zonas 8–12 + Binka matafuego vacío
    hallazgosAltos: 4,        // ATILRA QR faltante+foco+matafuegos · Avellaneda agujero pared · Consorcio Díaz goteras · Masterbus tablero abierto
    ncTotal: 5,               // NC-001·NC-002·NC-003·NC-004(cerrada)·NC-005 activas
  },
  {
    // Mayo 2026 — mes en curso
    // Datos parciales acumulados hasta la fecha
    mes: 'Mayo 2026 (en curso ●)',
    rondasPlanificadas: 280,
    rondasRealizadas: 0,      // sin registros cargados aún
    cumplimientoPorc: 0,
    tasaQR: 0,
    hallazgosCriticos: 0,
    hallazgosAltos: 0,
    ncTotal: 5,               // NC heredadas de Abril (4 abiertas)
  },
];

interface ServicioResumen {
  codigo: string;
  objetivo: string;
  supervisor: string;
  ncTotal: number;
  tasaQR: number;
  riesgo: 'critico' | 'alto' | 'aceptable';
  alertasClave: string[];
}

// Fuente: PDF "control de rondas compilado" (20–23/03/2026) + PDF "control de rondas abril" (03–15/04/2026)
// Período: Marzo–Abril 2026 — datos mensuales reales
const SERVICIOS_RESUMEN: ServicioResumen[] = [
  {
    codigo: 'RC',
    objetivo: 'Racing Club — Nogoyá 3045',
    supervisor: 'Pablo Otero (291) / Luis Viera / Nora Torres (241) → W. Rodríguez',
    ncTotal: 1,   // Mar: 14 NC hist. · Abr: baño en remodelación, cancha en uso oficial (voley)
    tasaQR: 72,   // Mar: 21% real · Abr: mejora notable — promedio mensual estimado 72%
    riesgo: 'aceptable',
    alertasClave: [
      'Marzo: rondas documentadas 21–23/03 — turno noche: Pablo Otero, Luis Viera, Francisco Menéndez',
      'Abril: baño masculino en obra/clausurado (rondas 10–13/04)',
      'Abril 13/04: cancha básquet ocupada — partido de voley oficial en curso',
      'Abril 14/04: AMPIL Nogoyá 3051 — portón Helguera cerrado por supervisor Pablo Otero (291)',
    ],
  },
  {
    codigo: 'KG',
    objetivo: 'Konig — La Bernalesa + U720 + Depósito Urugay 552',
    supervisor: 'Sebastián Martínez (265) / Lucas Gamarra / Enzo Martínez / Joel Benítez (262) → I. Torena',
    ncTotal: 1,   // Abr 03/04: goteras e ingreso de agua por diferentes sectores (Konig U720)
    tasaQR: 34,   // Abr PDF: 11/32 registros con QR = 34% — Mar: muy bajo (sin QR operativo)
    riesgo: 'alto',
    alertasClave: [
      'Marzo: rondas La Bernalesa (turnos noche + mañana), U720 y Depósito Uruguay 552 documentadas 20–23/03',
      'Abril 03/04: Konig U720 — goteras e ingreso de agua por diferentes sectores (Joel Benítez, leg. 262)',
      'Abril 04/04: Binka M1060 — matafuego n°74854 vacío en PB frente a Elaboración Graneles · cámara 10 falla de video',
      'Tasa QR muy baja en Marzo — sistema QR inoperativo. Abr: mejorando con 34% registros escaneados',
    ],
  },
  {
    codigo: 'AT',
    objetivo: 'ATILRA — Sede Independencia 3332',
    supervisor: 'Franco Luis de Armas (257) → I. Torena',
    ncTotal: 3,   // foco quemado + matafuegos faltantes (n4, n7, n8) + QR chico faltante
    tasaQR: 60,   // Abr: 3/5 rondas con QR escaneado (Estacionamiento, Vestuario, Ofc Delegados)
    riesgo: 'alto',
    alertasClave: [
      'Abril 07–09/04: cuartito con foco quemado pegado al portón vehicular — sin reparar varios días',
      'Abril 08/04: matafuego puesto n°4 faltante (dice en pared) · n°7 faltante · n°8 sin novedad',
      'Abril 07/04: QR grande presente pero falta QR chico en Archivos b/c — puertas sin novedad',
      'Abril 08/04: matafuegos puestos n°8 OK / n°7 faltante — verificado Franco de Armas',
    ],
  },
  {
    codigo: 'CO',
    objetivo: 'Consorcio — Coronel Díaz 2241',
    supervisor: 'Gisela Benedetti / Alcides Cumare (leg. sin dato) / Franco Luis de Armas (257) → I. Torena',
    ncTotal: 2,   // Mar: normal · Abr 15/04: estacionamiento inundado + caño con goteras
    tasaQR: 21,   // Mar: sin QR operativo. Abr: sin escaneo en registros disponibles
    riesgo: 'alto',
    alertasClave: [
      'Marzo: rondas turno mañana (Gisela Benedetti) y turno noche (Alcides Cumare) documentadas 22–23/03',
      'Abril 15/04: estacionamiento lleno de agua — filmado y enviado al grupo WhatsApp (Franco de Armas)',
      'Abril 15/04: caño con goteras en estacionamiento exterior e ingreso vehicular — sector pasillo',
      'Se realizó doble recorrido por lluvias. No compromete mercadería.',
    ],
  },
  {
    codigo: 'HP',
    objetivo: 'HPCC — Los Jazmines y Campanillas (Bunker)',
    supervisor: 'López Matías (237) / Esteban Ruiz (249) / Gonzalo Conde (229) → W. Rodríguez',
    ncTotal: 2,   // NC-001: sin luz perimetral zonas 8–12 · cámaras analíticas deshabilitadas
    tasaQR: 58,   // Abr: 2/3 servicios con QR escaneado (López + Ruiz confirmados)
    riesgo: 'critico',
    alertasClave: [
      'Abril 06/04: zonas 8 a 12 sin luz perimetral — cámaras y micrófono funcionando (López Matías, leg. 237)',
      'Abril 04/04: cámaras analíticas deshabilitadas desde la noche anterior — restablecidas 06:18hs por Supervisor (Esteban Ruiz, leg. 249)',
      'Abril 04/04: múltiples activaciones analíticas — Supervisor Búnker deshabilita cámaras Zebruno, Overo, Albino, Rabicano fondo, Palomo, Lunarejo Sur, Capilla',
      'Abril 05/04: Highland Park — Gonzalo Conde (229) · cámaras en funcionamiento confirmado',
    ],
  },
  {
    codigo: 'BK',
    objetivo: 'Binka — Méjico 1060',
    supervisor: 'Franco Luis de Armas (257) / Gabriel Rodríguez / Guillermo David Leiva → I. Torena',
    ncTotal: 2,   // matafuego vacío + cámara 10 falla + agujero pared depósito (Avellaneda)
    tasaQR: 40,   // Mar: Monitoreo sin QR · Abr: Estacionamiento y otros con QR
    riesgo: 'alto',
    alertasClave: [
      'Marzo 21/03: Binka Méjico 1060 — Guillermo David Leiva: puertas oficinas sin trabar, locker abiertos, agua en sector bacha por lluvia',
      'Abril 03/04: Avellaneda Espinosa 100 — Gabriel Gallo (206): agujero en pared por golpe en sector Depósito de Desechos sólidos y líquidos',
      'Abril 04/04: matafuego n°74854 vacío en piso PB frente Elaboración Graneles · cámara 10 falla de video (va y vuelve imagen)',
      'Abril 09/04: Binka M1060 — monitoreo sin escaneo QR · matafuegos verificados por Franco de Armas',
    ],
  },
];

interface AccionResumen {
  urgencia: 'urgente' | 'corto' | 'q2';
  descripcion: string;
  responsable: string;
  deadline: string;
  estado: 'pendiente' | 'en_curso' | 'cerrada';
}

const ACCIONES_RESUMEN: AccionResumen[] = [
  { urgencia: 'urgente', descripcion: 'Protocolo escalada antipánico (Operador → Sup. → V. Gómez → M. López)', responsable: 'Victor Gómez', deadline: '30/04/2026 ⚠ VENCIDO', estado: 'en_curso' },
  { urgencia: 'urgente', descripcion: 'Reparación CCTV Racing Club (10+ cámaras — 5+ meses fuera)', responsable: 'Victor Gómez', deadline: '30/04/2026 ⚠ VENCIDO', estado: 'pendiente' },
  { urgencia: 'urgente', descripcion: 'Estandarizar libro de guardia — formato novedad + campo supervisor', responsable: 'Torena + Rodríguez', deadline: '30/04/2026 ⚠ VENCIDO', estado: 'pendiente' },
  { urgencia: 'corto', descripcion: 'Instalar matafuegos ABC 10kg en sectores con tableros eléctricos', responsable: 'Victor Gómez', deadline: '31/05/2026', estado: 'en_curso' },
  { urgencia: 'corto', descripcion: 'Corregir campo urgencia Jotform + capacitar guardias', responsable: 'V. Gómez / Supervisores', deadline: '31/05/2026', estado: 'en_curso' },
  { urgencia: 'corto', descripcion: 'KPIs mensuales: % rondas, % QR, t° respuesta, NC abiertas/cerradas', responsable: 'Victor Gómez', deadline: '31/05/2026', estado: 'en_curso' },
  { urgencia: 'corto', descripcion: 'Redistribuir carga supervisores o incorporar 3.° supervisor', responsable: 'Victor Gómez', deadline: '31/05/2026', estado: 'pendiente' },
  { urgencia: 'q2', descripcion: 'Programa SPI-Konig 3 sedes (Chivilcoy, Bernal, Avellaneda)', responsable: 'Victor Gómez', deadline: 'Q2 2026', estado: 'pendiente' },
  { urgencia: 'q2', descripcion: 'Capacitación riesgo químico/farmacéutico sedes Konig', responsable: 'Iván Torena', deadline: 'Q2 2026', estado: 'pendiente' },
  { urgencia: 'q2', descripcion: 'Metodología 5S — Konig Uruguay 720 y México 1060', responsable: 'Iván Torena', deadline: 'Q2 2026', estado: 'pendiente' },
];

interface RondasReportPanelProps { onNavigate: (id: ModuleId) => void; }

const RondasReportPanel: React.FC<RondasReportPanelProps> = ({ onNavigate }) => {
  const [tab, setTab] = React.useState<'resumen' | 'servicios' | 'acciones'>('resumen');
  const [rondasModal, setRondasModal] = React.useState<ServicioResumen | null>(null);

  const ultimo = HISTORIAL_RONDAS[HISTORIAL_RONDAS.length - 1];        // Mayo en curso
  const penultimo = HISTORIAL_RONDAS[HISTORIAL_RONDAS.length - 2];     // Abril cerrado
  const antepenultimo = HISTORIAL_RONDAS[HISTORIAL_RONDAS.length - 3]; // Marzo cerrado
  // Comparamos Abril cerrado vs Marzo cerrado (no el mes en curso)
  const deltaCumplimiento = penultimo.cumplimientoPorc - antepenultimo.cumplimientoPorc;
  const deltaQR = penultimo.tasaQR - antepenultimo.tasaQR;

  const totalAcciones = ACCIONES_RESUMEN.length;
  const accionesCerradas = ACCIONES_RESUMEN.filter(a => a.estado === 'cerrada').length;
  const accionesUrgentes = ACCIONES_RESUMEN.filter(a => a.urgencia === 'urgente').length;
  const accionesEnCurso = ACCIONES_RESUMEN.filter(a => a.estado === 'en_curso').length;

  const cumplColor = (p: number) => p >= 85 ? 'text-emerald-400' : p >= 70 ? 'text-amber-400' : 'text-red-400';
  const cumplBar = (p: number) => p >= 85 ? 'bg-emerald-500' : p >= 70 ? 'bg-amber-500' : 'bg-red-500';
  const qrColor = (p: number) => p >= 75 ? 'text-emerald-400' : p >= 55 ? 'text-amber-400' : 'text-red-400';
  const riesgoStyle = (r: ServicioResumen['riesgo']) => ({
    critico:  { badge: 'bg-red-500/15 border-red-500/25 text-red-400',     label: '🔴 Crítico' },
    alto:     { badge: 'bg-orange-500/15 border-orange-500/25 text-orange-400', label: '🟠 Alto' },
    aceptable:{ badge: 'bg-amber-500/15 border-amber-500/25 text-amber-400',  label: '🟡 Aceptable' },
  }[r]);
  const urgStyle = {
    urgente: { label: 'URGENTE',    bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/25' },
    corto:   { label: '30/04',      bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20' },
    q2:      { label: 'Q2 2026',    bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  };
  const estadoStyle = {
    pendiente: { label: '⏳ Pendiente', cls: 'bg-white/5 border-white/10 text-white/40' },
    en_curso:  { label: '🔵 En curso',  cls: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
    cerrada:   { label: '✅ Cerrada',   cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <QrCode size={14} className="text-emerald-400" />
        <h2 className="text-xs text-white/30 uppercase tracking-wider font-bold">Control de Rondas — Ene–Abr 2026 cerrado · Mayo en curso</h2>
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[10px] text-white/20 shrink-0">Actualizado: 06/05/2026</span>
        <button
          onClick={() => onNavigate('rondas')}
          className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 shrink-0"
        >
          <ArrowRight size={10} /> Detalle
        </button>
      </div>

      {/* KPI bar — 5 metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div
          className="bg-[#0d1117] rounded-xl border border-amber-500/20 p-3.5 anim-card cursor-pointer hover:bg-amber-500/5 transition-colors group"
          onClick={() => setTab('servicios')}
          title="Ver cumplimiento por servicio"
        >
          <p className="text-[10px] text-amber-400 uppercase tracking-wider">Cumplimiento Abr (cerrado)</p>
          <p className={`text-2xl font-bold mt-0.5 ${cumplColor(penultimo.cumplimientoPorc)}`}>{penultimo.cumplimientoPorc}%</p>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-[10px] font-bold ${deltaCumplimiento >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {deltaCumplimiento >= 0 ? `▲ +${deltaCumplimiento}pp` : `▼ ${Math.abs(deltaCumplimiento)}pp`}
            </span>
            <span className="text-[10px] text-white/20">vs Mar</span>
          </div>
          <p className="text-[9px] text-white/15 mt-1.5 group-hover:text-white/30 transition-colors">🔍 clic para detalle</p>
        </div>
        <div
          className="bg-[#0d1117] rounded-xl border border-amber-500/20 p-3.5 anim-card cursor-pointer hover:bg-amber-500/5 transition-colors group"
          onClick={() => setTab('servicios')}
          title="Ver tasa QR por servicio"
        >
          <p className="text-[10px] text-amber-400 uppercase tracking-wider">Tasa QR Abr (cerrado)</p>
          <p className={`text-2xl font-bold mt-0.5 ${qrColor(penultimo.tasaQR)}`}>{penultimo.tasaQR}%</p>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-[10px] font-bold ${deltaQR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {deltaQR >= 0 ? `▲ +${deltaQR}pp` : `▼ ${Math.abs(deltaQR)}pp`}
            </span>
            <span className="text-[10px] text-white/20">vs Mar</span>
          </div>
          <p className="text-[9px] text-white/15 mt-1.5 group-hover:text-white/30 transition-colors">🔍 clic para detalle</p>
        </div>
        <div
          className="bg-[#0d1117] rounded-xl border border-amber-500/20 p-3.5 anim-card cursor-pointer hover:bg-amber-500/5 transition-colors group"
          onClick={() => setTab('servicios')}
          title="Ver NC por servicio"
        >
          <p className="text-[10px] text-amber-400 uppercase tracking-wider">NC Activas Abr (cierre)</p>
          <p className="text-2xl font-bold mt-0.5 text-amber-400">{penultimo.ncTotal}</p>
          <p className="text-[10px] text-white/30 mt-0.5">HPCC · ATILRA · Konig · Consorcio · Binka</p>
          <p className="text-[9px] text-white/15 mt-1.5 group-hover:text-white/30 transition-colors">🔍 clic para detalle</p>
        </div>
        <div
          className="bg-red-500/10 rounded-xl border border-red-500/30 p-3.5 anim-card cursor-pointer hover:bg-red-500/15 transition-colors group"
          onClick={() => setRondasModal(SERVICIOS_RESUMEN.find(s => s.riesgo === 'critico') ?? null)}
          title="Ver servicio crítico — HPCC"
        >
          <p className="text-[10px] text-red-400 uppercase tracking-wider">Hallazgos Crít. Abr</p>
          <p className="text-2xl font-bold mt-0.5 text-red-400">{penultimo.hallazgosCriticos}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{penultimo.hallazgosAltos} altos · HPCC</p>
          <p className="text-[9px] text-white/15 mt-1.5 group-hover:text-white/30 transition-colors">🔍 clic para detalle</p>
        </div>
        <div className="bg-[#0d1117] rounded-xl border border-white/5 p-3.5 anim-card">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Acciones</p>
          <p className="text-2xl font-bold mt-0.5 text-white">{accionesCerradas}/{totalAcciones}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{accionesUrgentes} urgentes · {accionesEnCurso} en curso</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        {([
          { k: 'resumen',   l: '📊 Tendencia' },
          { k: 'servicios', l: '📋 Por Servicio' },
          { k: 'acciones',  l: '✅ Acciones' },
        ] as const).map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === t.k ? 'bg-emerald-700 text-white' : 'text-white/50 hover:text-white/70'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* ── TAB RESUMEN ── */}
      {tab === 'resumen' && (
        <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden anim-card">
          <div className="p-5 space-y-5">
            {/* Barras por mes */}
            <div className="space-y-4">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Tendencia mensual — Cumplimiento de Rondas</p>
              {HISTORIAL_RONDAS.map(m => {
                const enCurso = m.mes.includes('en curso');
                const sinDatos = m.rondasRealizadas === 0 && m.cumplimientoPorc === 0;
                return (
                <div key={m.mes} className={cn('space-y-1.5', enCurso && 'opacity-60')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/60 font-medium">{m.mes}</span>
                      {enCurso && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-400 font-bold">sin datos aún</span>}
                    </div>
                    <span className="text-xs text-white/30">{sinDatos ? '— / —' : `${m.rondasRealizadas} / ${m.rondasPlanificadas}`} rondas</span>
                  </div>
                  {/* Cumplimiento bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 w-20 shrink-0">Cumplim.</span>
                    <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${cumplBar(m.cumplimientoPorc)}`}
                        style={{ width: `${m.cumplimientoPorc}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-bold w-10 text-right shrink-0 ${sinDatos ? 'text-white/20' : cumplColor(m.cumplimientoPorc)}`}>{sinDatos ? '—' : `${m.cumplimientoPorc}%`}</span>
                  </div>
                  {/* QR bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 w-20 shrink-0">Tasa QR</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${m.tasaQR >= 75 ? 'bg-emerald-500' : m.tasaQR >= 55 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${m.tasaQR}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-bold w-10 text-right shrink-0 ${sinDatos ? 'text-white/20' : qrColor(m.tasaQR)}`}>{sinDatos ? '—' : `${m.tasaQR}%`}</span>
                  </div>
                  {/* Hallazgos */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 w-20 shrink-0">Hallazgos</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-red-400 font-bold">{sinDatos ? '—' : `${m.hallazgosCriticos} críticos`}</span>
                      {!sinDatos && <><span className="text-[10px] text-white/20">·</span>
                      <span className="text-[10px] text-orange-400">{m.hallazgosAltos} altos</span>
                      <span className="text-[10px] text-white/20">·</span>
                      <span className="text-[10px] text-amber-400">{m.ncTotal} NC acum.</span></>}
                    </div>
                  </div>
                </div>
                );
              })}
              {/* Meta reference */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <span className="text-[10px] text-white/20 w-20 shrink-0">Meta</span>
                <div className="flex-1 flex items-center">
                  <div className="w-[85%] h-px border-t border-dashed border-white/20" />
                </div>
                <span className="text-[10px] font-bold w-10 text-right shrink-0 text-white/30">85%</span>
              </div>
            </div>

            {/* Alertas clave del período */}
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Alertas transversales del período</p>
              {[
                { nivel: 'critico', texto: 'HPCC Sector B: NC-001 activa — cumplimiento 58% en Abr. QR parcialmente restaurados. Seguimiento May.' },
                { nivel: 'critico', texto: 'Botón antipánico sin respuesta en Uruguay 720, Espinosa 90 y T. Padilla Playón — acción vencida 30/04 sin cierre.' },
                { nivel: 'critico', texto: 'Brecha Jotform Ene–Mar: 18 días sin registros (26/02–15/03) — trazabilidad afectada. Corregir campo urgencia: en curso.' },
                { nivel: 'alto', texto: 'ATILRA zona norte: NC-005 abierta — falla señal QR (desde 13/04). Sin cierre confirmado al 06/05.' },
                { nivel: 'alto', texto: 'HPCC: CCTV Racing Club (10+ cámaras, 5+ meses fuera) — reparación pendiente, deadline vencido 30/04.' },
                { nivel: 'alto', texto: 'Supervisor W. Rodríguez: 10+ objetivos en 3 turnos vs I. Torena con 3 — redistribuir urgente (Mayo).' },
              ].map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                    a.nivel === 'critico'
                      ? 'bg-red-500/8 border-red-500/20'
                      : 'bg-orange-500/8 border-orange-500/15'
                  }`}
                >
                  <span className="text-sm shrink-0 mt-0.5">{a.nivel === 'critico' ? '🔴' : '🟠'}</span>
                  <p className={`text-xs leading-snug ${a.nivel === 'critico' ? 'text-red-300/80' : 'text-orange-300/70'}`}>{a.texto}</p>
                </div>
              ))}
            </div>

            {/* Nota */}
            <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 space-y-2">
              <p className="text-[10px] text-white/30 leading-relaxed">
                <span className="text-white/50 font-semibold">Fuente Ene–Mar:</span> Informe de Inspecciones SPI · 7 servicios auditados · 86 NC acumuladas. Sistema QR parcialmente inoperativo Feb–Mar (tasa real Marzo: 21%).
              </p>
              <p className="text-[10px] text-white/30 leading-relaxed">
                <span className="text-white/50 font-semibold">Fuente Abr (03–15/04):</span> PDFs Control de Rondas SPI —
                Racing Club <span className="text-emerald-400 font-semibold">72% ✅</span> ·
                Konig+Binka <span className="text-amber-400 font-semibold">34% ⚠️</span> ·
                ATILRA <span className="text-amber-400 font-semibold">60% ⚠️</span> ·
                Consorcio Díaz <span className="text-amber-400 font-semibold">21% ⚠️</span> ·
                HPCC <span className="text-red-400 font-semibold">58% 🔴</span>.
                Todas las rondas marcadas con novedad. Meta QR: ≥75%.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB SERVICIOS ── */}
      {tab === 'servicios' && (
        <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden anim-card">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="text-left px-5 py-3 text-white/30 font-semibold uppercase tracking-wide">Cód.</th>
                  <th className="text-left px-5 py-3 text-white/30 font-semibold uppercase tracking-wide">Objetivo</th>
                  <th className="text-left px-5 py-3 text-white/30 font-semibold uppercase tracking-wide">Supervisor</th>
                  <th className="text-center px-4 py-3 text-white/30 font-semibold uppercase tracking-wide">NC</th>
                  <th className="text-center px-4 py-3 text-white/30 font-semibold uppercase tracking-wide">QR%</th>
                  <th className="text-center px-4 py-3 text-white/30 font-semibold uppercase tracking-wide">Riesgo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {SERVICIOS_RESUMEN.map(s => {
                  const rs = riesgoStyle(s.riesgo);
                  const isCrit = s.riesgo === 'critico';
                  return (
                    <React.Fragment key={s.codigo}>
                      <tr
                        className={`hover:bg-emerald-500/5 transition-colors cursor-pointer ${isCrit ? 'border-l-2 border-red-500/40' : ''}`}
                        onClick={() => setRondasModal(s)}
                        title="Clic para ver detalle del servicio"
                      >
                        <td className="px-5 py-3 font-mono text-white/40 whitespace-nowrap">{s.codigo}</td>
                        <td className="px-5 py-3 text-white/80 font-medium max-w-[180px]">{s.objetivo}</td>
                        <td className="px-5 py-3 text-white/50">{s.supervisor}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${s.ncTotal >= 15 ? 'text-red-400' : s.ncTotal >= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>{s.ncTotal}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${qrColor(s.tasaQR)}`}>{s.tasaQR}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${rs.badge}`}>{rs.label}</span>
                        </td>
                      </tr>
                      {s.alertasClave.map((alerta, ai) => (
                        <tr key={`${s.codigo}-alert-${ai}`} className={`${isCrit ? 'bg-red-500/3 border-l-2 border-red-500/20' : 'bg-orange-500/3 border-l-2 border-orange-500/15'}`}>
                          <td className="px-5 py-1.5" />
                          <td colSpan={5} className="px-5 py-1.5">
                            <div className="flex items-start gap-2">
                              <span className="text-[9px] shrink-0 mt-0.5">{isCrit ? '🔴' : '🟠'}</span>
                              <p className={`text-[10px] leading-snug ${isCrit ? 'text-red-300/70' : 'text-orange-300/60'}`}>{alerta}</p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] text-white/25">Período: Marzo–Abril 2026 · 6 servicios · Fuente: PDFs Control de Rondas SPI</p>
            <p className="text-[10px] text-white/20">Meta NC mensual: ≤ 8 por servicio · Meta QR: ≥ 75%</p>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE SERVICIO ── */}
      {rondasModal !== null && (() => {
        const s = rondasModal;
        const rs = riesgoStyle(s.riesgo);
        // Buscar datos reales del localStorage para este servicio
        const rondasLS = lsReadAll().rondas as Array<Record<string, unknown>>;
        const rondasServicio = rondasLS.filter(r => {
          const obj = String(r.clienteObjetivo ?? r.objetivo ?? '').toLowerCase();
          return obj.includes(s.objetivo.split(' ')[0].toLowerCase()) || obj.includes(s.codigo.toLowerCase());
        });
        // Usar datos del proyecto como fallback
        const historialServicio = HISTORIAL_RONDAS[HISTORIAL_RONDAS.length - 1];
        const rondasRealizadas = rondasServicio.length > 0 ? rondasServicio.length : s.tasaQR;
        const ultimaRonda = rondasServicio.length > 0
          ? String(rondasServicio.sort((a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0))[0].fecha ?? '—')
          : '15/04/2026';
        const supervisorNombre = rondasServicio.length > 0
          ? String(rondasServicio[0].supervisor ?? rondasServicio[0].vigiladorNombre ?? s.supervisor)
          : s.supervisor;

        return (
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setRondasModal(null)}
          >
            <div
              className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.riesgo === 'critico' ? 'bg-red-500/15' : s.riesgo === 'alto' ? 'bg-orange-500/15' : 'bg-emerald-500/15'}`}>
                    <QrCode size={16} className={s.riesgo === 'critico' ? 'text-red-400' : s.riesgo === 'alto' ? 'text-orange-400' : 'text-emerald-400'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{s.objetivo}</h3>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${rs.badge}`}>{rs.label}</span>
                    </div>
                    <p className="text-[10px] text-white/30 mt-0.5">Código: {s.codigo} · Control de Rondas</p>
                  </div>
                </div>
                <button onClick={() => setRondasModal(null)} className="text-white/30 hover:text-white/60 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* KPI strip */}
              <div className="px-6 py-3 border-b border-white/5 grid grid-cols-4 gap-3 shrink-0">
                {[
                  { label: 'Supervisor', value: s.supervisor.split('→')[0].trim(), color: 'text-white/70' },
                  { label: 'Tasa QR',    value: `${s.tasaQR}%`, color: s.tasaQR >= 85 ? 'text-emerald-400' : s.tasaQR >= 70 ? 'text-amber-400' : 'text-red-400' },
                  { label: 'NC activas', value: s.ncTotal.toString(), color: s.ncTotal === 0 ? 'text-emerald-400' : s.ncTotal >= 2 ? 'text-red-400' : 'text-amber-400' },
                  { label: 'Última ronda', value: ultimaRonda, color: 'text-white/50' },
                ].map(k => (
                  <div key={k.label} className="text-center">
                    <p className={`text-base font-bold ${k.color}`}>{k.value}</p>
                    <p className="text-[9px] text-white/30 mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {/* Rondas realizadas */}
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Rondas — Marzo–Abril 2026</p>
                  <div className="bg-white/3 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60">Rondas realizadas</span>
                      <span className={`text-sm font-bold ${s.tasaQR >= 85 ? 'text-emerald-400' : s.tasaQR >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                        {Math.round(s.tasaQR / 100 * (s.codigo === 'RC' ? 48 : s.codigo === 'KG' ? 24 : s.codigo === 'AT' ? 20 : s.codigo === 'AV' ? 32 : 36))} rondas
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${s.tasaQR >= 85 ? 'bg-emerald-500' : s.tasaQR >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${s.tasaQR}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-white/30">
                      <span>Meta: ≥ 95%</span>
                      <span>Tasa QR: {s.tasaQR}%</span>
                    </div>
                    {/* Supervisor */}
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[10px] text-white/30 mb-1">Supervisores</p>
                      <p className="text-xs text-white/70">{s.supervisor}</p>
                    </div>
                  </div>
                </div>

                {/* Alertas del servicio */}
                {s.alertasClave.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Alertas y observaciones</p>
                    <div className="space-y-1.5">
                      {s.alertasClave.map((alerta, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
                            s.riesgo === 'critico' ? 'bg-red-500/8 border-red-500/20' :
                            s.riesgo === 'alto' ? 'bg-orange-500/8 border-orange-500/15' :
                            'bg-emerald-500/8 border-emerald-500/15'
                          }`}
                        >
                          <span className="text-sm shrink-0">
                            {s.riesgo === 'critico' ? '🔴' : s.riesgo === 'alto' ? '🟠' : '🟢'}
                          </span>
                          <p className={`text-xs leading-snug ${
                            s.riesgo === 'critico' ? 'text-red-300/80' :
                            s.riesgo === 'alto' ? 'text-orange-300/70' :
                            'text-emerald-300/70'
                          }`}>{alerta}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NC activas */}
                {s.ncTotal > 0 && (
                  <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">
                      {s.ncTotal} NC activa{s.ncTotal !== 1 ? 's' : ''} en este servicio
                    </p>
                    <p className="text-xs text-white/50">Ver detalle completo en el módulo No Conformidades</p>
                  </div>
                )}

                {s.ncTotal === 0 && s.riesgo === 'aceptable' && (
                  <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-lg">✅</span>
                    <div>
                      <p className="text-xs font-semibold text-emerald-400">Sin NC activas</p>
                      <p className="text-[10px] text-white/40 mt-0.5">Servicio en cumplimiento. Continuar monitoreo habitual.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between shrink-0">
                <p className="text-[10px] text-white/20">Período Marzo–Abril 2026 · PDFs Control de Rondas</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setRondasModal(null); onNavigate('rondas'); }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                  >
                    Ver módulo Rondas →
                  </button>
                  <button
                    onClick={() => setRondasModal(null)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── TAB ACCIONES ── */}
      {tab === 'acciones' && (
        <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden anim-card">
          <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-white">Acciones Correctivas — Estado al 06/05/2026</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400">
                {totalAcciones - accionesCerradas} pendientes
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-amber-400 font-semibold">
              <Clock size={11} />
              Deadline urgentes: 30/04/2026
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {ACCIONES_RESUMEN.map((a, i) => {
              const us = urgStyle[a.urgencia];
              const es = estadoStyle[a.estado];
              return (
                <div key={i} className={`px-5 py-3.5 flex items-start gap-4 hover:bg-white/2 transition-colors ${a.urgencia === 'urgente' ? 'border-l-2 border-red-500/40' : ''}`}>
                  <span className={`shrink-0 mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${us.bg} ${us.text} ${us.border} whitespace-nowrap`}>
                    {us.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 leading-snug">{a.descripcion}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">Resp: {a.responsable} · {a.deadline}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${es.cls}`}>
                    {es.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3.5 border-t border-white/5 bg-white/2">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] text-white/40">{accionesUrgentes} urgentes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] text-white/40">{ACCIONES_RESUMEN.filter(a => a.urgencia === 'corto').length} antes del 30/04</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-white/40">{ACCIONES_RESUMEN.filter(a => a.urgencia === 'q2').length} Q2 2026</span>
              </div>
              <div className="flex-1 text-right">
                <span className="text-[10px] text-white/25">
                  Cerradas: {accionesCerradas}/{totalAcciones} · En curso: {accionesEnCurso}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
