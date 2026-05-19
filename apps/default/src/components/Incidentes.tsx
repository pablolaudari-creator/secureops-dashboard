import React, { useEffect, useState, useCallback } from 'react';
import { AlertOctagon, Plus, X, Check, AlertTriangle, CheckCircle, Mail, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { NovedadOperativa } from './SupervisionOperativa';

const QHSE_EMAIL_INC = 'plaudari.qhse@spiseguridad.com.ar';
const CC_EMAILS_INC = 'vgomez@spiseguridad.com.ar,itorres@spiseguridad.com.ar,wrodriguez@spiseguridad.com.ar,itorena@spiseguridad.com.ar';

function openQhseNovedadMailto(n: NovedadOperativa): void {
  const subject = encodeURIComponent(
    `[SPI] ⚠ Novedad Operativa — ${n.item} — ${n.objetivo}`
  );
  const body = encodeURIComponent(
    `NOVEDAD OPERATIVA DETECTADA — SPI S.A.\n` +
    `==========================================\n\n` +
    `📅 Fecha: ${n.fecha}\n` +
    `🏢 Objetivo: ${n.objetivo}\n` +
    `👤 Supervisor: ${n.supervisor}\n\n` +
    `❌ Ítem con incumplimiento: ${n.item}\n` +
    `📊 Resultado: ${n.resultado}\n` +
    `🚨 Prioridad: ${n.prioridad}\n` +
    `📋 Tipo: ${n.tipo}\n` +
    `🔍 Origen: ${n.origen}\n\n` +
    `Estado actual: ${n.estado}\n\n` +
    `⚠ ACCIÓN REQUERIDA — Verificar y gestionar el incumplimiento\n\n` +
    `--\nSPI SGC Dashboard`
  );
  window.open(`mailto:${QHSE_EMAIL_INC}?cc=${CC_EMAILS_INC}&subject=${subject}&body=${body}`, '_blank');
}

interface Incidente {
  id: string;
  titulo: string;
  codigo: string;
  sede: string;
  tipo: string;
  gravedad: 'baja' | 'media' | 'alta' | 'critica';
  estado: 'abierto' | 'investigando' | 'cerrado';
  descripcion: string;
  personal: string;
  acciones: string;
  fecha?: string;
  fuente?: 'pdf' | 'api' | 'manual';
}

// ── Hallazgos críticos extraídos de PDFs de Control de Rondas (Mar–Abr 2026) ──
const HALLAZGOS_PDF: Incidente[] = [
  {
    id: 'pdf-001',
    titulo: 'Agujero en pared — Sector Depósito de Desechos (Avellaneda)',
    codigo: 'INC-PDF-001',
    sede: 'Avellaneda — G.I. Estudio',
    tipo: 'tecnico',
    gravedad: 'alta',
    estado: 'abierto',
    fecha: '03/04/2026',
    fuente: 'pdf',
    descripcion: 'Agujero en pared producido por golpe en sector Depósito de Desechos Sólidos y Líquidos. Detectado durante ronda nocturna. Riesgo de acceso no autorizado al sector de residuos peligrosos.',
    personal: 'Gabriel Gallo (leg. 206) — Vigilador turno noche. Supervisor: W. Rodríguez',
    acciones: 'Filmado y documentado en planilla de rondas. Notificación enviada a supervisión. Pendiente: reparación por parte del cliente y NC formal.',
  },
  {
    id: 'pdf-002',
    titulo: 'Cámara 10 con falla intermitente de video — Binka Méjico 1060',
    codigo: 'INC-PDF-002',
    sede: 'Binka — Méjico 1060',
    tipo: 'tecnico',
    gravedad: 'alta',
    estado: 'investigando',
    fecha: '04/04/2026',
    fuente: 'pdf',
    descripcion: 'Cámara 10 del sistema CCTV presenta falla de imagen intermitente ("va y vuelve imagen"). Detectada durante verificación de sistema en ronda de seguridad. Sector afectado: zona de elaboración / depósito.',
    personal: 'Franco Luis de Armas (leg. 257) — Vigilador. Supervisor: I. Torena',
    acciones: 'Reportado en planilla de rondas (04/04). Verificado nuevamente en ronda 09/04 — falla persiste. Pendiente: técnico de CCTV asignado por cliente o SPI.',
  },
  {
    id: 'pdf-003',
    titulo: 'Matafuego n°74854 vacío — PB frente a Elaboración Graneles (Binka Méjico 1060)',
    codigo: 'INC-PDF-003',
    sede: 'Binka — Méjico 1060',
    tipo: 'seguridad',
    gravedad: 'critica',
    estado: 'abierto',
    fecha: '04/04/2026',
    fuente: 'pdf',
    descripcion: 'Matafuego identificado como n°74854 encontrado completamente vacío en planta baja frente al sector de Elaboración Graneles. Riesgo de incendio no controlable en área de manipulación de materiales a granel.',
    personal: 'Franco Luis de Armas (leg. 257) — Vigilador. Supervisor: I. Torena',
    acciones: 'Documentado en planilla de rondas (04/04). Sin reposición confirmada. Requiere NC formal y recarga/reposición inmediata. Notificación a responsable de HSE del cliente pendiente.',
  },
  {
    id: 'pdf-004',
    titulo: 'Matafuegos puestos n°4 y n°7 faltantes — ATILRA Independencia 3332',
    codigo: 'INC-PDF-004',
    sede: 'ATILRA — Independencia 3332',
    tipo: 'seguridad',
    gravedad: 'critica',
    estado: 'abierto',
    fecha: '08/04/2026',
    fuente: 'pdf',
    descripcion: 'Matafuego puesto n°4 faltante (señalización en pared indica su ubicación pero el equipo no está). Matafuego n°7 también faltante. Matafuego n°8 verificado OK. Detectados durante múltiples rondas del 07 al 09 de abril.',
    personal: 'Franco Luis de Armas (leg. 257) — Vigilador turno noche. Supervisor: I. Torena',
    acciones: 'Reportado en planillas 07, 08 y 09/04. Sin reposición confirmada en los días siguientes. Requiere NC formal, notificación al cliente y recarga inmediata de los equipos faltantes.',
  },
  {
    id: 'pdf-005',
    titulo: 'Foco quemado en cuartito junto al portón vehicular — ATILRA Independencia 3332',
    codigo: 'INC-PDF-005',
    sede: 'ATILRA — Independencia 3332',
    tipo: 'tecnico',
    gravedad: 'media',
    estado: 'investigando',
    fecha: '07/04/2026',
    fuente: 'pdf',
    descripcion: 'Foco quemado en cuartito pegado al portón vehicular de acceso. Detectado el 07/04 y sin reparación confirmada en los días siguientes. Compromete visibilidad en zona de acceso vehicular durante turnos nocturnos.',
    personal: 'Franco Luis de Armas (leg. 257) — Vigilador. Supervisor: I. Torena',
    acciones: 'Documentado en planillas de rondas 07, 08 y 09/04. Sin confirmación de reparación. Comunicado verbalmente al responsable del objetivo.',
  },
  {
    id: 'pdf-006',
    titulo: 'Cámaras analíticas deshabilitadas por Supervisor Búnker — HPCC Los Jazmines',
    codigo: 'INC-PDF-006',
    sede: 'HPCC — Los Jazmines (Bunker)',
    tipo: 'seguridad',
    gravedad: 'critica',
    estado: 'investigando',
    fecha: '04/04/2026',
    fuente: 'pdf',
    descripcion: 'El Supervisor del Búnker HPCC deshabilita múltiples cámaras analíticas en la noche del 03/04. Cámaras afectadas: Zebruno, Overo, Albino, Rabicano Fondo, Palomo, Lunarejo Sur, Capilla. Sistema CCTV analítico queda sin cobertura perimetral por varias horas. Restablecido a las 06:18hs del 04/04 tras intervención de SPI.',
    personal: 'Esteban Ruiz (leg. 249) — Vigilador noche. Supervisor HPCC (personal del cliente). Supervisor SPI: W. Rodríguez',
    acciones: 'Restablecido por Supervisor Búnker a las 06:18hs del 04/04. Documentado en planilla de rondas. Requiere investigación sobre motivo de la deshabilitación. NC-001 abierta.',
  },
  {
    id: 'pdf-007',
    titulo: 'Zonas 8–12 sin luz perimetral — HPCC Los Jazmines (Bunker)',
    codigo: 'INC-PDF-007',
    sede: 'HPCC — Los Jazmines (Bunker)',
    tipo: 'tecnico',
    gravedad: 'alta',
    estado: 'investigando',
    fecha: '06/04/2026',
    fuente: 'pdf',
    descripcion: 'Zonas 8 a 12 del perímetro del Búnker HPCC sin iluminación. Cámaras y micrófono funcionando. Compromete visibilidad nocturna en 5 zonas del perímetro sur del predio.',
    personal: 'López Matías (leg. 237) — Vigilador. Supervisor: W. Rodríguez',
    acciones: 'Documentado en planilla de rondas (06/04). Cámaras verificadas operativas. Técnico eléctrico del cliente pendiente de asignación.',
  },
  {
    id: 'pdf-008',
    titulo: 'Estacionamiento inundado y caño con goteras — Consorcio Coronel Díaz 2241',
    codigo: 'INC-PDF-008',
    sede: 'Consorcio — Coronel Díaz 2241',
    tipo: 'tecnico',
    gravedad: 'media',
    estado: 'abierto',
    fecha: '15/04/2026',
    fuente: 'pdf',
    descripcion: 'Fuerte lluvia provoca inundación del estacionamiento. Caño con goteras en ingreso vehicular y pasillo exterior. Zona documentada en video y enviada al grupo WhatsApp de coordinación. No compromete mercadería.',
    personal: 'Franco Luis de Armas (leg. 257) — Vigilador. Supervisor: I. Torena',
    acciones: 'Filmado y enviado al grupo de coordinación. Se realizó doble recorrido de verificación por condiciones climáticas. Sin NC formal abierta aún.',
  },
  {
    id: 'pdf-009',
    titulo: 'Locker abiertos y puertas de oficinas sin trabar — Binka Méjico 1060',
    codigo: 'INC-PDF-009',
    sede: 'Binka — Méjico 1060',
    tipo: 'seguridad',
    gravedad: 'media',
    estado: 'cerrado',
    fecha: '21/03/2026',
    fuente: 'pdf',
    descripcion: 'Durante ronda de madrugada se detectan puertas de oficinas sin trabar y lockers abiertos. Además, agua acumulada en sector bacha por infiltración de lluvia. Detectado por guardia en turno solitario.',
    personal: 'Guillermo David Leiva — Vigilador turno madrugada. Supervisor: I. Torena',
    acciones: 'Documentado en planilla de rondas (21/03). Puertas aseguradas por el vigilador. Comunicado al supervisor para seguimiento con el cliente.',
  },
  {
    id: 'pdf-010',
    titulo: 'QR chico faltante en sector Archivos b/c — ATILRA Independencia 3332',
    codigo: 'INC-PDF-010',
    sede: 'ATILRA — Independencia 3332',
    tipo: 'tecnico',
    gravedad: 'baja',
    estado: 'abierto',
    fecha: '07/04/2026',
    fuente: 'pdf',
    descripcion: 'QR grande presente y verificado. QR chico faltante en sector Archivos b/c. Sin el QR chico el sistema no puede verificar la ronda completa en ese punto de control.',
    personal: 'Franco Luis de Armas (leg. 257) — Vigilador. Supervisor: I. Torena',
    acciones: 'Documentado en planilla. Pendiente: reposición del tag QR chico por parte de SPI.',
  },
];

const gravedadConfig = {
  baja: { label: 'Baja', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  media: { label: 'Media', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  alta: { label: 'Alta', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
  critica: { label: '🚨 Crítica', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
};

const estadoConfig = {
  abierto: { label: '🔴 Abierto', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  investigando: { label: '🟡 Investigando', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  cerrado: { label: '🟢 Cerrado', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const tipoEmojis: Record<string, string> = {
  seguridad: '🔐 Seguridad', tecnico: '🔧 Técnico', personal: '👤 Personal',
  novedad: '📋 Novedad', emergencia: '🚨 Emergencia',
};

const sedes = [
  'Racing Club — Nogoyá 3045',
  'HPCC — Los Jazmines (Bunker)',
  'Konig — Uruguay 720',
  'Konig — La Bernalesa',
  'Konig — Chivilcoy',
  'ATILRA — Independencia 3332',
  'ATILRA — Yrigoyen 4060',
  'ATILRA — Morón',
  'Avellaneda — G.I. Estudio',
  'Binka — Méjico 1060',
  'Binka — Uruguay 552',
  'Consorcio — Coronel Díaz 2241',
  'Masterbus — Zárate',
  'Highland Park — Del Viso',
  'La Taquara — Cañuelas',
  'AMPIL — Nogoyá 3051',
];

const Incidentes: React.FC = () => {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterGrav, setFilterGrav] = useState('all');
  const [filterFuente, setFilterFuente] = useState<'todos' | 'pdf' | 'api' | 'manual'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    codigo: '', sede: sedes[0], tipo: 'seguridad', gravedad: 'media',
    descripcion: '', personal: '', acciones: '', fecha: '',
  });

  // ── Novedades Operativas (from spi_novedades localStorage) ─────────────────
  const [novedades, setNovedades] = useState<NovedadOperativa[]>([]);
  const [filterNov, setFilterNov] = useState<'todas' | 'Abierta' | 'Cerrada'>('todas');

  const loadNovedades = useCallback(() => {
    try {
      const raw = localStorage.getItem('spi_novedades');
      setNovedades(raw ? (JSON.parse(raw) as NovedadOperativa[]) : []);
    } catch { setNovedades([]); }
  }, []);

  useEffect(() => { loadNovedades(); }, [loadNovedades]);

  const cerrarNovedad = (id: string) => {
    try {
      const raw = localStorage.getItem('spi_novedades');
      const prev: NovedadOperativa[] = raw ? JSON.parse(raw) : [];
      const updated = prev.map(n => n.id === id ? { ...n, estado: 'Cerrada' as const } : n);
      localStorage.setItem('spi_novedades', JSON.stringify(updated));
      setNovedades(updated);
    } catch { /* ignore */ }
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/taskade/projects/MaeyHhRmdEJXjLuy/nodes');
      const data = await res.json();
      if (data.ok && data.payload?.nodes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: Incidente[] = (data.payload.nodes as Record<string, any>[])
          .filter((n) => n.fieldValues['/text'])
          .map((n) => ({
            id: n.id,
            titulo: n.fieldValues['/text'] || '',
            codigo: n.fieldValues['/attributes/@inc01'] || '',
            sede: n.fieldValues['/attributes/@inc02'] || '',
            tipo: n.fieldValues['/attributes/@inc04'] || 'novedad',
            gravedad: n.fieldValues['/attributes/@inc05'] || 'baja',
            estado: n.fieldValues['/attributes/@inc06'] || 'abierto',
            descripcion: n.fieldValues['/attributes/@inc07'] || '',
            personal: n.fieldValues['/attributes/@inc08'] || '',
            acciones: n.fieldValues['/attributes/@inc09'] || '',
            fuente: 'api' as const,
          }));
        // Merge PDF hallazgos + API incidentes (PDF primero, más recientes)
        setIncidentes([...HALLAZGOS_PDF, ...parsed]);
      } else {
        // API error or empty — show PDF hallazgos only
        setIncidentes([...HALLAZGOS_PDF]);
      }
    } catch (e) {
      console.error(e);
      setIncidentes([...HALLAZGOS_PDF]);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const nextNum = String(incidentes.length + 1).padStart(3, '0');
      const codigo = form.codigo || `INC-${nextNum}-2026`;
      await fetch('/api/taskade/projects/MaeyHhRmdEJXjLuy/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '/text': `${codigo} — ${form.descripcion.slice(0, 50)}`,
          '/attributes/@inc01': codigo,
          '/attributes/@inc02': form.sede,
          '/attributes/@inc04': form.tipo,
          '/attributes/@inc05': form.gravedad,
          '/attributes/@inc06': 'abierto',
          '/attributes/@inc07': form.descripcion,
          '/attributes/@inc08': form.personal,
          '/attributes/@inc09': form.acciones,
        }),
      });
      setShowForm(false);
      setForm({ codigo: '', sede: sedes[0], tipo: 'seguridad', gravedad: 'media', descripcion: '', personal: '', acciones: '', fecha: '' });
      await fetchData();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const filtered = incidentes
    .filter(i => filterGrav === 'all' || i.gravedad === filterGrav)
    .filter(i => filterFuente === 'todos' || i.fuente === filterFuente);
  const abiertos = incidentes.filter(i => i.estado === 'abierto').length;
  const criticos = incidentes.filter(i => i.gravedad === 'critica' || i.gravedad === 'alta').length;
  const cerrados = incidentes.filter(i => i.estado === 'cerrado').length;
  const desdePdf = incidentes.filter(i => i.fuente === 'pdf').length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <AlertOctagon size={18} className="text-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Registro de Incidentes & Novedades</h2>
            <p className="text-xs text-white/40">Clasificación por tipo, gravedad y estado de resolución</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Registrar Incidente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-4">
          <p className="text-xs text-red-400">🔴 Abiertos</p>
          <p className="text-3xl font-bold text-red-400 mt-1">{abiertos}</p>
          <p className="text-xs text-white/30 mt-0.5">requieren seguimiento</p>
        </div>
        <div className="bg-orange-500/10 rounded-xl border border-orange-500/20 p-4">
          <p className="text-xs text-orange-400">⚠️ Alta/Crítica Gravedad</p>
          <p className="text-3xl font-bold text-orange-400 mt-1">{criticos}</p>
          <p className="text-xs text-white/30 mt-0.5">prioridad máxima</p>
        </div>
        <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-4">
          <p className="text-xs text-emerald-400">✅ Cerrados</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{cerrados}</p>
          <p className="text-xs text-white/30 mt-0.5">resueltos</p>
        </div>
        <div className="bg-blue-500/10 rounded-xl border border-blue-500/20 p-4">
          <p className="text-xs text-blue-400">📄 Desde PDF Rondas</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{desdePdf}</p>
          <p className="text-xs text-white/30 mt-0.5">Mar–Abr 2026</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-1.5">
          {[{ k: 'all', l: 'Todos' }, { k: 'critica', l: '🚨 Críticos' }, { k: 'alta', l: '🔴 Alta' }, { k: 'media', l: '🟡 Media' }, { k: 'baja', l: '🟢 Baja' }].map(f => (
            <button
              key={f.k}
              onClick={() => setFilterGrav(f.k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterGrav === f.k ? 'bg-rose-700 text-white' : 'bg-white/5 text-white/50 hover:text-white/70'}`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-white/10" />
        <div className="flex gap-1.5">
          {([
            { k: 'todos', l: 'Todas las fuentes' },
            { k: 'pdf', l: '📄 PDF Rondas' },
            { k: 'api', l: '🔗 SGC' },
          ] as const).map(f => (
            <button
              key={f.k}
              onClick={() => setFilterFuente(f.k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterFuente === f.k ? 'bg-blue-700 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'}`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents list */}
      {loading ? (
        <div className="text-center text-white/30 py-12 text-sm">Cargando incidentes...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inc => {
            const gc = gravedadConfig[inc.gravedad] || gravedadConfig.baja;
            const ec = estadoConfig[inc.estado] || estadoConfig.abierto;
            const isCrit = inc.gravedad === 'critica';
            const isExpanded = expandedId === inc.id;
            return (
              <div
                key={inc.id}
                className={`bg-[#0d1117] rounded-xl border transition-colors ${isCrit ? 'border-red-500/30' : inc.gravedad === 'alta' ? 'border-orange-500/20' : 'border-white/5'}`}
              >
                {/* Card Header — always visible */}
                <div
                  className="flex items-start justify-between gap-4 p-5 cursor-pointer hover:bg-white/2 rounded-xl transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : inc.id)}
                >
                  <div className="flex-1 min-w-0">
                    {/* Meta row */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded">{inc.codigo}</span>
                      {inc.fuente === 'pdf' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
                          <FileText size={9} /> PDF Rondas
                        </span>
                      )}
                      <span className="text-[10px] text-white/30">{tipoEmojis[inc.tipo] || inc.tipo}</span>
                      {inc.fecha && <span className="text-[10px] text-white/25">📅 {inc.fecha}</span>}
                    </div>
                    {/* Title */}
                    <p className="text-sm font-medium text-white leading-snug">{inc.titulo}</p>
                    {/* Sede */}
                    {inc.sede && <p className="text-[11px] text-white/35 mt-1">📍 {inc.sede}</p>}
                  </div>
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${gc.bg} ${gc.border} ${gc.text}`}>{gc.label}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${ec.bg} ${ec.border} ${ec.text}`}>{ec.label}</span>
                    <span className="text-white/20 mt-1">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
                    {inc.descripcion && (
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Descripción</p>
                        <p className="text-xs text-white/60 leading-relaxed">{inc.descripcion}</p>
                      </div>
                    )}
                    {inc.personal && (
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Personal involucrado</p>
                        <p className="text-xs text-white/55 leading-snug">{inc.personal}</p>
                      </div>
                    )}
                    {inc.acciones && (
                      <div className="p-3 rounded-lg bg-white/3 border border-white/5">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Acciones tomadas</p>
                        <p className="text-xs text-white/60 leading-relaxed">{inc.acciones}</p>
                      </div>
                    )}
                    {inc.estado === 'abierto' && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                          ⚠ Requiere acción — notificar a QHSE o NC formal
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-white/30 py-12 text-sm">No hay incidentes con este filtro.</div>
          )}
        </div>
      )}

      {/* ── NOVEDADES OPERATIVAS (desde Supervisión) ── */}
      <div className="bg-[#0d1117] rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Novedades Operativas</h2>
            <span className="text-[10px] text-white/30 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
              Generadas desde Supervisión Operativa
            </span>
          </div>
          {/* Filter */}
          <div className="flex gap-1.5">
            {(['todas', 'Abierta', 'Cerrada'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterNov(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterNov === f
                    ? f === 'Abierta' ? 'bg-red-700 text-white' : f === 'Cerrada' ? 'bg-emerald-700 text-white' : 'bg-amber-700 text-white'
                    : 'bg-white/5 text-white/40 hover:text-white/60'
                }`}
              >
                {f === 'todas' ? `Todas (${novedades.length})` : f === 'Abierta' ? `🔴 Abiertas (${novedades.filter(n => n.estado === 'Abierta').length})` : `🟢 Cerradas (${novedades.filter(n => n.estado === 'Cerrada').length})`}
              </button>
            ))}
          </div>
        </div>

        {novedades.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle size={28} className="text-emerald-500/30 mx-auto mb-2" />
            <p className="text-sm text-white/25">Sin novedades operativas registradas</p>
            <p className="text-xs text-white/15 mt-1">Se generan automáticamente al guardar supervisiones con ítems "No cumple"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Objetivo</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Ítem</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Supervisor</th>
                  <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Estado</th>
                  <th className="text-center px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wide">Prioridad</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {novedades
                  .filter(n => filterNov === 'todas' || n.estado === filterNov)
                  .map(n => {
                    const isOpen = n.estado === 'Abierta';
                    const isAlta = n.prioridad === 'Alta';
                    return (
                      <tr
                        key={n.id}
                        className={`hover:bg-white/3 transition-colors ${isOpen && isAlta ? 'border-l-2 border-red-500/40' : ''}`}
                      >
                        <td className="px-4 py-3 text-white/40 whitespace-nowrap">{n.fecha}</td>
                        <td className="px-4 py-3 text-white/70 font-medium max-w-[140px] truncate">{n.objetivo}</td>
                        <td className="px-4 py-3 text-white/60 max-w-[160px]">
                          <span className="leading-snug block">{n.item}</span>
                        </td>
                        <td className="px-4 py-3 text-white/40 whitespace-nowrap">{n.supervisor}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            isOpen
                              ? 'bg-red-500/10 border-red-500/25 text-red-400'
                              : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                          }`}>
                            {isOpen ? '🔴 Abierta' : '🟢 Cerrada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            isAlta
                              ? 'bg-red-500/10 border-red-500/25 text-red-400'
                              : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                          }`}>
                            {n.prioridad}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openQhseNovedadMailto(n)}
                              title="Notificar a QHSE"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-semibold transition-colors whitespace-nowrap"
                            >
                              <Mail size={10} /> QHSE
                            </button>
                            {isOpen && (
                              <button
                                onClick={() => cerrarNovedad(n.id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold transition-colors whitespace-nowrap"
                              >
                                <Check size={10} /> Cerrar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {novedades.filter(n => filterNov === 'todas' || n.estado === filterNov).length === 0 && (
              <p className="text-center text-white/25 text-xs py-8">Sin novedades con este filtro</p>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Registrar Incidente o Novedad</h3>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Código (opcional)</label>
                  <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20" placeholder="INC-XXX-2026" />
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
                    <option value="seguridad" className="bg-[#0d1117]">🔐 Seguridad</option>
                    <option value="tecnico" className="bg-[#0d1117]">🔧 Técnico</option>
                    <option value="personal" className="bg-[#0d1117]">👤 Personal</option>
                    <option value="novedad" className="bg-[#0d1117]">📋 Novedad</option>
                    <option value="emergencia" className="bg-[#0d1117]">🚨 Emergencia</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Gravedad</label>
                  <select value={form.gravedad} onChange={e => setForm({ ...form, gravedad: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="baja" className="bg-[#0d1117]">Baja</option>
                    <option value="media" className="bg-[#0d1117]">Media</option>
                    <option value="alta" className="bg-[#0d1117]">Alta</option>
                    <option value="critica" className="bg-[#0d1117]">🚨 Crítica</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Descripción del Incidente</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none" rows={3} placeholder="Describir qué ocurrió, cómo y cuándo..." />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Personal Involucrado</label>
                <input value={form.personal} onChange={e => setForm({ ...form, personal: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20" placeholder="Vigiladores, supervisores..." />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Acciones Tomadas</label>
                <textarea value={form.acciones} onChange={e => setForm({ ...form, acciones: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none" rows={2} placeholder="Acciones de respuesta inmediata..." />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.descripcion} className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                {saving ? 'Guardando...' : <><Check size={14} /> Registrar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidentes;
