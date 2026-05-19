import React, { useState } from 'react';
import {
  FileText, Printer, QrCode, AlertTriangle, Shield,
  Camera, ClipboardCheck, AlertOctagon, Users,
  ChevronDown, ChevronUp, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Minus, Download
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── DATOS REALES ABRIL 2026 (fuente: PDFs Control de Rondas) ─────────────────

const PERIODO = 'Abril 2026 (03–15/04/2026)';
const FECHA_GENERACION = '01/05/2026';

// ── Rondas por sede ──────────────────────────────────────────────────────────
interface SedeRondas {
  codigo: string;
  sede: string;
  supervisor: string;
  responsableQHSE: string;
  rondasPlanificadas: number;
  rondasRealizadas: number;
  tasaQR: number; // % rondas con escaneo QR confirmado
  ncActivas: number;
  riesgo: 'critico' | 'alto' | 'medio' | 'aceptable';
  novedades: string[];
}

const RONDAS_ABRIL: SedeRondas[] = [
  {
    codigo: 'RC',
    sede: 'Racing Club — Nogoyá 3045',
    supervisor: 'Pablo Otero (291) / Luis Viera / Nora Torres (241)',
    responsableQHSE: 'W. Rodríguez',
    rondasPlanificadas: 48,
    rondasRealizadas: 46,
    tasaQR: 72,
    ncActivas: 1,
    riesgo: 'aceptable',
    novedades: [
      'Baño masculino en obra/clausurado — rondas 10–13/04',
      'Cancha básquet ocupada — partido de voley oficial 13/04',
      'Portón Helguera cerrado por supervisor Pablo Otero (291) — AMPIL Nogoyá 3051 el 14/04',
    ],
  },
  {
    codigo: 'KG',
    sede: 'Konig — La Bernalesa + Uruguay 720 + Depósito U552',
    supervisor: 'Sebastián Martínez (265) / Lucas Gamarra / Enzo Martínez / Joel Benítez (262)',
    responsableQHSE: 'I. Torena',
    rondasPlanificadas: 32,
    rondasRealizadas: 28,
    tasaQR: 34,
    ncActivas: 2,
    riesgo: 'alto',
    novedades: [
      '03/04 — Konig U720: goteras e ingreso de agua por diferentes sectores (Joel Benítez leg. 262)',
      '04/04 — Binka M1060: matafuego n°74854 vacío en PB frente a Elaboración Graneles',
      '04/04 — Binka M1060: cámara 10 falla de video (va y vuelve imagen)',
    ],
  },
  {
    codigo: 'AT',
    sede: 'ATILRA — Independencia 3332',
    supervisor: 'Franco Luis de Armas (257)',
    responsableQHSE: 'I. Torena',
    rondasPlanificadas: 20,
    rondasRealizadas: 18,
    tasaQR: 60,
    ncActivas: 3,
    riesgo: 'alto',
    novedades: [
      '07/04 — Foco quemado en cuartito junto al portón vehicular — varios días sin reparar',
      '07/04 — QR chico faltante en sector Archivos b/c (QR grande presente y OK)',
      '08/04 — Matafuego puesto n°4 faltante (señal en pared, equipo ausente) · n°7 faltante · n°8 OK',
    ],
  },
  {
    codigo: 'CO',
    sede: 'Consorcio — Coronel Díaz 2241',
    supervisor: 'Gisela Benedetti / Alcides Cumare / Franco Luis de Armas (257)',
    responsableQHSE: 'I. Torena',
    rondasPlanificadas: 24,
    rondasRealizadas: 18,
    tasaQR: 21,
    ncActivas: 2,
    riesgo: 'alto',
    novedades: [
      '15/04 — Estacionamiento inundado por lluvias — filmado y enviado al grupo de coordinación',
      '15/04 — Caño con goteras en ingreso vehicular y pasillo exterior',
      'Doble recorrido realizado por condiciones climáticas — sin compromiso de mercadería',
    ],
  },
  {
    codigo: 'HP',
    sede: 'HPCC — Los Jazmines + Campanillas (Bunker)',
    supervisor: 'López Matías (237) / Esteban Ruiz (249) / Gonzalo Conde (229)',
    responsableQHSE: 'W. Rodríguez',
    rondasPlanificadas: 36,
    rondasRealizadas: 21,
    tasaQR: 58,
    ncActivas: 2,
    riesgo: 'critico',
    novedades: [
      '04/04 — Supervisor Búnker deshabilita cámaras analíticas (Zebruno, Overo, Albino, Rabicano Fondo, Palomo, Lunarejo Sur, Capilla) — 🚨 Sistema sin cobertura perimetral',
      '04/04 — Cámaras restablecidas a las 06:18hs por Supervisor Búnker (Esteban Ruiz, leg. 249)',
      '06/04 — Zonas 8 a 12 sin luz perimetral — cámaras y micrófono funcionando (López Matías, leg. 237)',
    ],
  },
  {
    codigo: 'BK',
    sede: 'Binka — Méjico 1060 / Avellaneda Espinosa 100',
    supervisor: 'Franco Luis de Armas (257) / Gabriel Rodríguez / Guillermo David Leiva',
    responsableQHSE: 'I. Torena',
    rondasPlanificadas: 28,
    rondasRealizadas: 22,
    tasaQR: 40,
    ncActivas: 2,
    riesgo: 'alto',
    novedades: [
      '03/04 — Avellaneda Espinosa 100: agujero en pared sector Depósito de Desechos Sólidos y Líquidos (Gabriel Gallo, leg. 206)',
      '09/04 — Binka M1060: monitoreo sin escaneo QR — matafuegos verificados por Franco de Armas',
    ],
  },
];

// ── Incidentes del período ──────────────────────────────────────────────────
interface IncidenteAbril {
  codigo: string;
  fecha: string;
  sede: string;
  gravedad: 'critica' | 'alta' | 'media' | 'baja';
  titulo: string;
  descripcion: string;
  personal: string;
  estado: 'abierto' | 'investigando' | 'cerrado';
  accion: string;
}

const INCIDENTES_ABRIL: IncidenteAbril[] = [
  {
    codigo: 'INC-PDF-006',
    fecha: '04/04/2026',
    sede: 'HPCC — Bunker',
    gravedad: 'critica',
    titulo: 'Cámaras analíticas deshabilitadas por Supervisor Búnker',
    descripcion: 'El Supervisor del Búnker deshabilita múltiples cámaras analíticas durante la noche del 03/04. Sistema sin cobertura perimetral por varias horas.',
    personal: 'Esteban Ruiz (leg. 249) — Sup. SPI · Supervisor Búnker (cliente)',
    estado: 'investigando',
    accion: 'Restablecido 06:18hs del 04/04. Requiere investigación del motivo. NC-001 activa.',
  },
  {
    codigo: 'INC-PDF-003',
    fecha: '04/04/2026',
    sede: 'Binka — Méjico 1060',
    gravedad: 'critica',
    titulo: 'Matafuego n°74854 vacío — PB frente a Elaboración Graneles',
    descripcion: 'Matafuego encontrado completamente vacío en zona de elaboración/graneles. Riesgo de incendio no controlable.',
    personal: 'Franco Luis de Armas (leg. 257) · Sup: I. Torena',
    estado: 'abierto',
    accion: 'Documentado en planilla. Sin reposición confirmada. Requiere NC formal y recarga inmediata.',
  },
  {
    codigo: 'INC-PDF-004',
    fecha: '08/04/2026',
    sede: 'ATILRA — Independencia 3332',
    gravedad: 'critica',
    titulo: 'Matafuegos puestos n°4 y n°7 faltantes',
    descripcion: 'Equipos faltantes durante múltiples rondas del 07 al 09/04. Señalización presente pero equipo ausente.',
    personal: 'Franco Luis de Armas (leg. 257) · Sup: I. Torena',
    estado: 'abierto',
    accion: 'Reportado en planillas 07, 08 y 09/04. Sin reposición. Requiere NC formal y recarga inmediata.',
  },
  {
    codigo: 'INC-PDF-001',
    fecha: '03/04/2026',
    sede: 'Avellaneda — Espinosa 100',
    gravedad: 'alta',
    titulo: 'Agujero en pared — Sector Depósito de Desechos Sólidos y Líquidos',
    descripcion: 'Agujero producido por golpe en sector de residuos peligrosos. Riesgo de acceso no autorizado.',
    personal: 'Gabriel Gallo (leg. 206) · Sup: W. Rodríguez',
    estado: 'abierto',
    accion: 'Filmado y documentado. Notificado a supervisión. Pendiente: reparación por cliente y NC formal.',
  },
  {
    codigo: 'INC-PDF-002',
    fecha: '04/04/2026',
    sede: 'Binka — Méjico 1060',
    gravedad: 'alta',
    titulo: 'Cámara 10 con falla intermitente de video',
    descripcion: 'Cámara 10 presenta imagen que "va y vuelve". Falla persiste al 09/04.',
    personal: 'Franco Luis de Armas (leg. 257) · Sup: I. Torena',
    estado: 'investigando',
    accion: 'Reportado 04/04 y 09/04. Pendiente asignación técnico CCTV.',
  },
  {
    codigo: 'INC-PDF-007',
    fecha: '06/04/2026',
    sede: 'HPCC — Los Jazmines (Bunker)',
    gravedad: 'alta',
    titulo: 'Zonas 8–12 sin luz perimetral',
    descripcion: '5 zonas del perímetro sur del predio sin iluminación. Cámaras y micrófono operativos.',
    personal: 'López Matías (leg. 237) · Sup: W. Rodríguez',
    estado: 'investigando',
    accion: 'Documentado. Técnico eléctrico del cliente pendiente de asignación.',
  },
  {
    codigo: 'INC-PDF-005',
    fecha: '07/04/2026',
    sede: 'ATILRA — Independencia 3332',
    gravedad: 'media',
    titulo: 'Foco quemado en cuartito junto al portón vehicular',
    descripcion: 'Sin iluminación en zona de acceso vehicular. Sin reparación confirmada en días siguientes.',
    personal: 'Franco Luis de Armas (leg. 257) · Sup: I. Torena',
    estado: 'investigando',
    accion: 'Documentado planillas 07–09/04. Comunicado verbalmente al responsable del objetivo.',
  },
  {
    codigo: 'INC-PDF-008',
    fecha: '15/04/2026',
    sede: 'Consorcio — Coronel Díaz 2241',
    gravedad: 'media',
    titulo: 'Estacionamiento inundado + caño con goteras',
    descripcion: 'Inundación por lluvias. Goteras en ingreso vehicular y pasillo exterior. Sin compromiso de mercadería.',
    personal: 'Franco Luis de Armas (leg. 257) · Sup: I. Torena',
    estado: 'abierto',
    accion: 'Filmado. Enviado al grupo de coordinación. Sin NC formal abierta.',
  },
  {
    codigo: 'INC-PDF-010',
    fecha: '07/04/2026',
    sede: 'ATILRA — Independencia 3332',
    gravedad: 'baja',
    titulo: 'QR chico faltante en sector Archivos b/c',
    descripcion: 'Tag QR chico ausente en punto de control Archivos b/c. QR grande presente y OK.',
    personal: 'Franco Luis de Armas (leg. 257) · Sup: I. Torena',
    estado: 'abierto',
    accion: 'Documentado. Pendiente reposición tag QR por SPI.',
  },
];

// ── Acciones correctivas pendientes ─────────────────────────────────────────
interface AccionPendiente {
  urgencia: 'inmediata' | 'corto' | 'q2';
  responsable: string;
  descripcion: string;
  deadline: string;
  estado: 'pendiente' | 'en_curso' | 'cerrada';
}

const ACCIONES_PENDIENTES: AccionPendiente[] = [
  { urgencia: 'inmediata', responsable: 'V. Gómez', descripcion: 'Reponer y recargar matafuegos faltantes/vacíos: ATILRA n°4 y n°7, Binka n°74854', deadline: 'INMEDIATO', estado: 'pendiente' },
  { urgencia: 'inmediata', responsable: 'V. Gómez', descripcion: 'Investigar causa de deshabilitación de cámaras analíticas HPCC Bunker (04/04)', deadline: 'INMEDIATO', estado: 'en_curso' },
  { urgencia: 'inmediata', responsable: 'V. Gómez / I. Torena', descripcion: 'Reparar agujero en pared Avellaneda Espinosa 100 — sector depósito residuos', deadline: 'INMEDIATO', estado: 'pendiente' },
  { urgencia: 'corto', responsable: 'V. Gómez', descripcion: 'Reparar iluminación zonas 8–12 HPCC Bunker — técnico eléctrico del cliente', deadline: '15/05/2026', estado: 'pendiente' },
  { urgencia: 'corto', responsable: 'I. Torena', descripcion: 'Reponer tag QR chico en sector Archivos b/c ATILRA y reemplazar foco portón vehicular', deadline: '15/05/2026', estado: 'pendiente' },
  { urgencia: 'corto', responsable: 'I. Torena / W. Rodríguez', descripcion: 'Asignar técnico CCTV para cámara 10 Binka M1060 (falla video intermitente)', deadline: '15/05/2026', estado: 'en_curso' },
  { urgencia: 'corto', responsable: 'V. Gómez', descripcion: 'Mejorar tasa QR Konig (34%) y Consorcio Díaz (21%) — capacitar vigiladores en escaneo obligatorio', deadline: '01/05/2026', estado: 'pendiente' },
  { urgencia: 'corto', responsable: 'V. Gómez', descripcion: 'Documentar protocolo escalada antipánico: Operador → Supervisión → Gómez → López', deadline: '30/04/2026', estado: 'en_curso' },
  { urgencia: 'q2', responsable: 'V. Gómez', descripcion: 'Reparación CCTV Racing Club — 10+ cámaras fuera de servicio 5+ meses', deadline: 'Q2 2026', estado: 'pendiente' },
  { urgencia: 'q2', responsable: 'V. Gómez', descripcion: 'Redistribuir carga supervisores (W. Rodríguez 10+ objetivos vs I. Torena 3) o incorporar 3.° supervisor', deadline: 'Q2 2026', estado: 'pendiente' },
];

// ── Personal activo abril ────────────────────────────────────────────────────
const PERSONAL_ABRIL = [
  { legajo: '291', nombre: 'Pablo Otero', sede: 'Racing Club', turno: 'Noche', supervisor: 'W. Rodríguez' },
  { legajo: '—', nombre: 'Luis Viera', sede: 'Racing Club', turno: 'Noche', supervisor: 'W. Rodríguez' },
  { legajo: '241', nombre: 'Nora Torres', sede: 'Racing Club', turno: 'Mañana', supervisor: 'W. Rodríguez' },
  { legajo: '265', nombre: 'Sebastián Martínez', sede: 'Konig La Bernalesa', turno: 'Noche', supervisor: 'I. Torena' },
  { legajo: '—', nombre: 'Lucas Gamarra', sede: 'Konig La Bernalesa', turno: 'Mañana', supervisor: 'I. Torena' },
  { legajo: '—', nombre: 'Enzo Martínez', sede: 'Konig U720', turno: 'Noche', supervisor: 'I. Torena' },
  { legajo: '262', nombre: 'Joel Benítez', sede: 'Konig U720', turno: 'Noche', supervisor: 'I. Torena' },
  { legajo: '257', nombre: 'Franco Luis de Armas', sede: 'ATILRA / Consorcio / Binka', turno: 'Noche/Madrugada', supervisor: 'I. Torena' },
  { legajo: '237', nombre: 'López Matías', sede: 'HPCC Los Jazmines', turno: 'Noche', supervisor: 'W. Rodríguez' },
  { legajo: '249', nombre: 'Esteban Ruiz', sede: 'HPCC Bunker', turno: 'Noche', supervisor: 'W. Rodríguez' },
  { legajo: '229', nombre: 'Gonzalo Conde', sede: 'Highland Park', turno: 'Noche', supervisor: 'W. Rodríguez' },
  { legajo: '206', nombre: 'Gabriel Gallo', sede: 'Avellaneda Espinosa 100', turno: 'Noche', supervisor: 'W. Rodríguez' },
  { legajo: '—', nombre: 'Guillermo David Leiva', sede: 'Binka M1060', turno: 'Madrugada', supervisor: 'I. Torena' },
];

// ─── UTILS ───────────────────────────────────────────────────────────────────

const gravColors = {
  critica: { badge: 'bg-red-500/15 border-red-500/30 text-red-400', label: '🚨 Crítica', bar: 'bg-red-500' },
  alta:    { badge: 'bg-orange-500/15 border-orange-500/30 text-orange-400', label: '🔴 Alta', bar: 'bg-orange-500' },
  medio:   { badge: 'bg-amber-500/15 border-amber-500/25 text-amber-400', label: '🟡 Medio', bar: 'bg-amber-500' },
  media:   { badge: 'bg-amber-500/15 border-amber-500/25 text-amber-400', label: '🟡 Media', bar: 'bg-amber-500' },
  aceptable:{ badge: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400', label: '🟢 Aceptable', bar: 'bg-emerald-500' },
  baja:    { badge: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400', label: '🟢 Baja', bar: 'bg-emerald-500' },
};

const estadoColors = {
  abierto:      'bg-red-500/10 border-red-500/25 text-red-400',
  investigando: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
  cerrado:      'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
};

const urgColors = {
  inmediata: { bg: 'bg-red-500/10 border-red-500/25 text-red-400', label: '🚨 INMEDIATA' },
  corto:     { bg: 'bg-amber-500/10 border-amber-500/25 text-amber-400', label: '📅 Corto plazo' },
  q2:        { bg: 'bg-blue-500/10 border-blue-500/25 text-blue-400', label: '📌 Q2 2026' },
};

const estadoAccionColors = {
  pendiente: 'text-white/40',
  en_curso:  'text-sky-400',
  cerrada:   'text-emerald-400',
};

// ── KPI totales ──────────────────────────────────────────────────────────────
const totalRondasPlan = RONDAS_ABRIL.reduce((a, s) => a + s.rondasPlanificadas, 0);
const totalRondasReal = RONDAS_ABRIL.reduce((a, s) => a + s.rondasRealizadas, 0);
const tasaQRPromedio = Math.round(RONDAS_ABRIL.reduce((a, s) => a + s.tasaQR, 0) / RONDAS_ABRIL.length);
const totalNCActivas = RONDAS_ABRIL.reduce((a, s) => a + s.ncActivas, 0);
const totalIncidentes = INCIDENTES_ABRIL.length;
const incCriticos = INCIDENTES_ABRIL.filter(i => i.gravedad === 'critica').length;
const incAbiertos = INCIDENTES_ABRIL.filter(i => i.estado === 'abierto').length;

// ─── COMPONENT ───────────────────────────────────────────────────────────────

const Seccion: React.FC<{ icon: React.ReactNode; title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  icon, title, badge, children, defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#0d1117] rounded-2xl border border-white/5 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-white/50">{icon}</span>
          <span className="text-sm font-semibold text-white">{title}</span>
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">{badge}</span>
          )}
        </div>
        <span className="text-white/30">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
};

const ReporteAbril: React.FC = () => {
  const [expandedInc, setExpandedInc] = useState<string | null>(null);
  const [expandedSede, setExpandedSede] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto print:p-4 print:max-w-none">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <FileText size={18} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Reporte Operativo — Abril 2026</h1>
              <p className="text-xs text-white/40">SPI S.A. · Control de Rondas QR · Período 03–15/04/2026</p>
            </div>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium transition-colors shrink-0"
        >
          <Printer size={15} /> Imprimir / PDF
        </button>
      </div>

      {/* ── PRINT HEADER (solo visible al imprimir) ── */}
      <div className="hidden print:block mb-6">
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">SPI S.A.</p>
            <p className="text-xs text-slate-500 mt-0.5">Sistema de Gestión de Calidad — ISO 9001:2015</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-bold text-slate-700">REPORTE OPERATIVO — ABRIL 2026</p>
            <p>Período: {PERIODO}</p>
            <p>Generado: {FECHA_GENERACION}</p>
            <p>Responsable: V. Gómez / I. Torres</p>
          </div>
        </div>
      </div>

      {/* ── KPIs RESUMEN ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Rondas Realizadas',
            value: `${totalRondasReal}/${totalRondasPlan}`,
            sub: `${Math.round((totalRondasReal / totalRondasPlan) * 100)}% cumplimiento`,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/8 border-emerald-500/20',
            icon: <QrCode size={16} />,
          },
          {
            label: 'Tasa QR Promedio',
            value: `${tasaQRPromedio}%`,
            sub: 'meta ≥ 75%',
            color: tasaQRPromedio >= 75 ? 'text-emerald-400' : 'text-red-400',
            bg: tasaQRPromedio >= 75 ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-red-500/10 border-red-500/25',
            icon: <TrendingUp size={16} />,
          },
          {
            label: 'NC Activas',
            value: `${totalNCActivas}`,
            sub: '6 sedes auditadas',
            color: 'text-amber-400',
            bg: 'bg-amber-500/8 border-amber-500/20',
            icon: <AlertTriangle size={16} />,
          },
          {
            label: 'Incidentes',
            value: `${incCriticos} críticos`,
            sub: `${incAbiertos} abiertos de ${totalIncidentes}`,
            color: 'text-red-400',
            bg: 'bg-red-500/10 border-red-500/25',
            icon: <AlertOctagon size={16} />,
          },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.bg}`}>
            <div className={`flex items-center gap-1.5 mb-1 ${k.color}`}>
              {k.icon}
              <p className="text-[10px] uppercase tracking-wider font-semibold">{k.label}</p>
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── RONDAS POR SEDE ── */}
      <Seccion icon={<QrCode size={16} />} title="Control de Rondas por Sede" badge={`${RONDAS_ABRIL.length} sedes`}>
        <div className="space-y-3 mt-1">
          {RONDAS_ABRIL.map((s) => {
            const gc = gravColors[s.riesgo] ?? gravColors.aceptable;
            const cumplPct = Math.round((s.rondasRealizadas / s.rondasPlanificadas) * 100);
            const isExpanded = expandedSede === s.codigo;
            return (
              <div key={s.codigo} className={`rounded-xl border ${s.riesgo === 'critico' ? 'border-red-500/30' : s.riesgo === 'alto' ? 'border-orange-500/20' : 'border-white/5'} overflow-hidden`}>
                <div
                  className="flex items-start gap-4 p-4 cursor-pointer hover:bg-white/2 transition-colors"
                  onClick={() => setExpandedSede(isExpanded ? null : s.codigo)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded">{s.codigo}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-bold', gc.badge)}>{gc.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{s.sede}</p>
                    <p className="text-[10px] text-white/35 mt-0.5">Sup: {s.supervisor} · QHSE: {s.responsableQHSE}</p>
                    {/* mini bars */}
                    <div className="mt-2 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-white/30 mb-1">Cumplimiento</p>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', cumplPct >= 90 ? 'bg-emerald-500' : cumplPct >= 75 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${cumplPct}%` }} />
                        </div>
                        <p className={cn('text-[10px] font-bold mt-0.5', cumplPct >= 90 ? 'text-emerald-400' : cumplPct >= 75 ? 'text-amber-400' : 'text-red-400')}>{cumplPct}% ({s.rondasRealizadas}/{s.rondasPlanificadas})</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 mb-1">Tasa QR</p>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', s.tasaQR >= 75 ? 'bg-emerald-500' : s.tasaQR >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${s.tasaQR}%` }} />
                        </div>
                        <p className={cn('text-[10px] font-bold mt-0.5', s.tasaQR >= 75 ? 'text-emerald-400' : s.tasaQR >= 50 ? 'text-amber-400' : 'text-red-400')}>{s.tasaQR}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 mb-1">NC Activas</p>
                        <p className={cn('text-sm font-bold', s.ncActivas === 0 ? 'text-emerald-400' : s.ncActivas >= 3 ? 'text-red-400' : 'text-amber-400')}>{s.ncActivas}</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-white/20 shrink-0 mt-1">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                </div>
                {isExpanded && s.novedades.length > 0 && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Novedades del período</p>
                    {s.novedades.map((n, i) => (
                      <div key={i} className={cn('flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs leading-snug border',
                        s.riesgo === 'critico' ? 'bg-red-500/8 border-red-500/20 text-red-300/80' :
                        s.riesgo === 'alto' ? 'bg-orange-500/8 border-orange-500/15 text-orange-300/70' :
                        'bg-white/3 border-white/8 text-white/55'
                      )}>
                        <span className="shrink-0 mt-0.5">{s.riesgo === 'critico' ? '🔴' : s.riesgo === 'alto' ? '🟠' : '🟡'}</span>
                        <span>{n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Tabla resumen QR */}
        <div className="mt-4 bg-white/3 border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Sede</th>
                <th className="text-center px-3 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Rondas</th>
                <th className="text-center px-3 py-2.5 text-white/30 font-semibold uppercase tracking-wide">QR%</th>
                <th className="text-center px-3 py-2.5 text-white/30 font-semibold uppercase tracking-wide">NC</th>
                <th className="text-center px-3 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Riesgo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {RONDAS_ABRIL.map((s) => {
                const gc = gravColors[s.riesgo] ?? gravColors.aceptable;
                return (
                  <tr key={s.codigo} className="hover:bg-white/2">
                    <td className="px-4 py-2.5 text-white/70 font-medium">{s.sede.split('—')[0].trim()}</td>
                    <td className="px-3 py-2.5 text-center text-white/50">{s.rondasRealizadas}/{s.rondasPlanificadas}</td>
                    <td className={cn('px-3 py-2.5 text-center font-bold', s.tasaQR >= 75 ? 'text-emerald-400' : s.tasaQR >= 50 ? 'text-amber-400' : 'text-red-400')}>{s.tasaQR}%</td>
                    <td className={cn('px-3 py-2.5 text-center font-bold', s.ncActivas === 0 ? 'text-emerald-400' : s.ncActivas >= 3 ? 'text-red-400' : 'text-amber-400')}>{s.ncActivas}</td>
                    <td className="px-3 py-2.5 text-center"><span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-bold', gc.badge)}>{gc.label}</span></td>
                  </tr>
                );
              })}
              <tr className="border-t border-white/10 font-bold">
                <td className="px-4 py-2.5 text-white/50 text-[11px]">TOTALES</td>
                <td className="px-3 py-2.5 text-center text-white/70">{totalRondasReal}/{totalRondasPlan}</td>
                <td className={cn('px-3 py-2.5 text-center font-bold', tasaQRPromedio >= 75 ? 'text-emerald-400' : 'text-red-400')}>{tasaQRPromedio}%</td>
                <td className="px-3 py-2.5 text-center text-amber-400">{totalNCActivas}</td>
                <td className="px-3 py-2.5 text-center text-white/30 text-[10px]">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Seccion>

      {/* ── INCIDENTES ── */}
      <Seccion icon={<AlertOctagon size={16} />} title="Incidentes y Hallazgos" badge={`${incCriticos} críticos · ${incAbiertos} abiertos`}>
        <div className="space-y-2 mt-1">
          {INCIDENTES_ABRIL.map((inc) => {
            const gc = gravColors[inc.gravedad] ?? gravColors.baja;
            const isExp = expandedInc === inc.codigo;
            return (
              <div key={inc.codigo} className={cn('rounded-xl border overflow-hidden', inc.gravedad === 'critica' ? 'border-red-500/30' : inc.gravedad === 'alta' ? 'border-orange-500/20' : 'border-white/5')}>
                <div
                  className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-white/2 transition-colors"
                  onClick={() => setExpandedInc(isExp ? null : inc.codigo)}
                >
                  <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40 shrink-0')}>{inc.codigo}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-snug">{inc.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-white/30">📅 {inc.fecha}</span>
                      <span className="text-[10px] text-white/30">📍 {inc.sede}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-bold', gc.badge)}>{gc.label}</span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-bold', estadoColors[inc.estado])}>
                      {inc.estado === 'abierto' ? '🔴 Abierto' : inc.estado === 'investigando' ? '🟡 Investigando' : '🟢 Cerrado'}
                    </span>
                    <span className="text-white/20">{isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
                  </div>
                </div>
                {isExp && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
                    <p className="text-xs text-white/60 leading-relaxed">{inc.descripcion}</p>
                    <p className="text-[11px] text-white/40"><span className="text-white/25">Personal:</span> {inc.personal}</p>
                    <div className="bg-white/3 border border-white/8 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-white/30 mb-0.5">Acción tomada / estado</p>
                      <p className="text-xs text-white/60">{inc.accion}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Seccion>

      {/* ── ACCIONES CORRECTIVAS ── */}
      <Seccion icon={<ClipboardCheck size={16} />} title="Acciones Correctivas Pendientes" badge={`${ACCIONES_PENDIENTES.filter(a => a.estado !== 'cerrada').length} abiertas`}>
        <div className="space-y-2 mt-1">
          {(['inmediata', 'corto', 'q2'] as const).map((urg) => {
            const grupo = ACCIONES_PENDIENTES.filter(a => a.urgencia === urg);
            if (grupo.length === 0) return null;
            const uc = urgColors[urg];
            return (
              <div key={urg}>
                <p className={cn('text-[10px] font-bold px-2 py-1 rounded-lg mb-2 inline-block border', uc.bg)}>{uc.label}</p>
                <div className="space-y-1.5">
                  {grupo.map((a, i) => {
                    const sc = estadoAccionColors[a.estado];
                    return (
                      <div key={i} className="flex items-start gap-3 rounded-xl bg-white/2 border border-white/5 px-4 py-3">
                        <div className="flex-1">
                          <p className="text-xs text-white/70 leading-snug">{a.descripcion}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[10px] text-white/30">👤 {a.responsable}</span>
                            <span className="text-[10px] text-white/25">⏰ {a.deadline}</span>
                          </div>
                        </div>
                        <span className={cn('text-[10px] font-bold shrink-0', sc)}>
                          {a.estado === 'pendiente' ? '⏳ Pendiente' : a.estado === 'en_curso' ? '🔵 En curso' : '✅ Cerrada'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Seccion>

      {/* ── PERSONAL ACTIVO ── */}
      <Seccion icon={<Users size={16} />} title="Personal Activo — Abril 2026" badge={`${PERSONAL_ABRIL.length} efectivos`} defaultOpen={false}>
        <div className="overflow-x-auto mt-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Legajo</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Sede</th>
                <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Turno</th>
                <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Supervisor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {PERSONAL_ABRIL.map((p, i) => (
                <tr key={i} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-white/40">{p.legajo}</td>
                  <td className="px-4 py-2.5 text-white/70 font-medium">{p.nombre}</td>
                  <td className="px-4 py-2.5 text-white/50">{p.sede}</td>
                  <td className="px-4 py-2.5 text-center text-white/40">{p.turno}</td>
                  <td className="px-4 py-2.5 text-center text-white/40">{p.supervisor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      {/* ── RESUMEN EJECUTIVO ── */}
      <Seccion icon={<Shield size={16} />} title="Resumen Ejecutivo" badge="Para dirección">
        <div className="space-y-3 mt-2">
          <div className="bg-red-500/8 border border-red-500/25 rounded-xl px-4 py-3">
            <p className="text-xs font-bold text-red-400 mb-1.5">🚨 Alertas Críticas del Período</p>
            <ul className="space-y-1.5">
              {[
                'HPCC Bunker: cámaras analíticas deshabilitadas por personal del cliente (04/04) — sistema sin cobertura perimetral por horas. Requiere investigación y protocolo preventivo.',
                'ATILRA: 2 matafuegos faltantes + 1 vacío (Binka) — riesgo de incendio sin capacidad de respuesta. Reposición inmediata.',
                'Tasa QR muy baja: Consorcio Díaz 21% · Konig 34% — vigiladores no escanean en cada ronda. Capacitación urgente.',
                'HPCC: zonas 8–12 sin luz perimetral — visibilidad nocturna comprometida en 5 zonas del perímetro sur.',
              ].map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-red-300/80 leading-snug">
                  <span className="shrink-0 mt-0.5">•</span><span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3">
            <p className="text-xs font-bold text-emerald-400 mb-1.5">✅ Aspectos Positivos</p>
            <ul className="space-y-1.5">
              {[
                'Racing Club: 98% cumplimiento de rondas — equipo estable con Pablo Otero, Luis Viera y Nora Torres.',
                'Highland Park (Gonzalo Conde, leg. 229): cámaras en funcionamiento confirmado — sin novedades.',
                'HPCC: cámaras restablecidas rápidamente (06:18hs) tras incidente de deshabilitación — respuesta oportuna de SPI.',
                'Consorcio Díaz 15/04: doble recorrido por lluvias — protocolo de respuesta ante eventos climáticos ejecutado correctamente.',
              ].map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-emerald-300/80 leading-snug">
                  <span className="shrink-0 mt-0.5">•</span><span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
            <p className="text-xs text-white/40 leading-relaxed">
              <span className="text-white/60 font-semibold">Fuente:</span> PDFs "Control de Rondas Compilado" (20–23/03/2026) y "Control de Rondas Abril" (03–15/04/2026). {PERSONAL_ABRIL.length} vigiladores activos en {RONDAS_ABRIL.length} sedes. {totalRondasReal} rondas documentadas sobre {totalRondasPlan} planificadas. Tasa QR promedio: {tasaQRPromedio}% (meta: ≥75%). Responsable QHSE: I. Torres / V. Gómez.
            </p>
          </div>
        </div>
      </Seccion>

      {/* ── PRINT STYLES ── */}
      <style>{`
        @media print {
          body { background: white !important; color: #111 !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default ReporteAbril;
