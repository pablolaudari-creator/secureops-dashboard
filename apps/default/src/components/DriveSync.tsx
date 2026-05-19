import React, { useState, useCallback, useRef } from 'react';
import {
  HardDrive, Upload, FileSpreadsheet, FileText,
  CheckCircle2, AlertTriangle, RefreshCw, Info,
  ChevronDown, ChevronUp, X, Loader2, Database,
  ArrowRight, ClipboardCheck, QrCode, Users, AlertOctagon
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportStatus = 'idle' | 'parsing' | 'done' | 'error';
type DataType = 'rondas' | 'presentismo' | 'supervisiones' | 'novedades' | 'desconocido';

interface ParsedRecord {
  type: DataType;
  count: number;
  sample: string;
  data: object[];
}

interface ImportResult {
  filename: string;
  type: DataType;
  count: number;
  status: 'ok' | 'error';
  message: string;
}

// ─── Business Key: genera ID estable basado en CONTENIDO del registro ─────────
// Reemplaza el ID por timestamp que cambia entre importaciones.
// Si el CSV tiene un campo 'id' propio se respeta; si no, se construye
// una clave que identifica unívocamente el REGISTRO DE NEGOCIO:
//   Ronda      → fecha + objetivo/sede + vigilador + turno
//   Presentismo→ fecha + nombre + nroDocumento (o turno si no hay doc)
//   Supervisión→ fecha + supervisor + clienteObjetivo + puntaje
//   Novedad    → fecha + objetivo + item
//
// Esto garantiza que importar el mismo archivo N veces produce el mismo conjunto
// de IDs → el dedup de mergeToLS los salta → sin duplicados.

function slugify(s: string): string {
  return String(s || '').toLowerCase().trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-./]/g, '')
    .slice(0, 40);
}

function makeRondaKey(row: Record<string, string>, ts: number): string {
  const fecha   = slugify(row.fecha || row.date || String(ts).slice(0, 10));
  const objetivo = slugify(row.objetivo || row['cliente/objetivo'] || row.cliente || row.location || 'x');
  const vigilador= slugify(row['vigilador nombre'] || row['nombre vigilador'] || row.vigilador || row.nombre || 'x');
  const turno    = slugify(row.turno || row.shift || 'x');
  return `ronda::${fecha}::${objetivo}::${vigilador}::${turno}`;
}

function makePresentismoKey(row: Record<string, string>, ts: number): string {
  const fecha    = slugify(row.fecha || row.date || String(ts).slice(0, 10));
  const nombre   = slugify(row['nombre y apellido'] || row.nombreApellido || row.nombre || row.name || 'x');
  const doc      = slugify(row['nro documento'] || row.documento || row.dni || row.nroDocumento || row.turno || 'x');
  return `pres::${fecha}::${nombre}::${doc}`;
}

function makeSupervisionKey(row: Record<string, string>, ts: number): string {
  const fecha    = slugify(row.fecha || row.date || String(ts).slice(0, 10));
  const sup      = slugify(row.supervisor || 'x');
  const objetivo = slugify(row.objetivo || row['cliente/objetivo'] || row.cliente || row.clienteObjetivo || 'x');
  const puntaje  = slugify(row.puntaje || row.score || row.cumplimiento || 'x');
  return `sup::${fecha}::${sup}::${objetivo}::${puntaje}`;
}

function makeNovedadKey(row: Record<string, string>, ts: number): string {
  const fecha    = slugify(row.fecha || String(ts).slice(0, 10));
  const objetivo = slugify(row.objetivo || row.location || 'x');
  const item     = slugify((row.item || row.descripcion || row.description || 'x').slice(0, 30));
  return `nov::${fecha}::${objetivo}::${item}`;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const values: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    values.push(cur.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  }).filter(r => Object.values(r).some(v => v !== ''));
}

// ─── Auto-detect data type from headers/filename ──────────────────────────────

function detectType(filename: string, headers: string[]): DataType {
  const fname = filename.toLowerCase();
  const h = headers.join(' ').toLowerCase();

  if (fname.includes('ronda') || fname.includes('qr') || h.includes('vigilador') || h.includes('ronda') || h.includes('escaneo')) return 'rondas';
  if (fname.includes('presentismo') || fname.includes('asistencia') || fname.includes('presentismo') || h.includes('nombre') && h.includes('turno') && h.includes('estado')) return 'presentismo';
  if (fname.includes('supervision') || fname.includes('supervisión') || h.includes('puntaje') || h.includes('checklist') || h.includes('cumplimiento')) return 'supervisiones';
  if (fname.includes('novedad') || fname.includes('incidente') || h.includes('novedad') || h.includes('prioridad') && h.includes('estado')) return 'novedades';
  return 'desconocido';
}

// ─── Map CSV row → internal record format ─────────────────────────────────────

// ─── Mappers — producen los MISMOS campos canónicos que los formularios reales ─
// Esto garantiza que Dashboard, DataAudit y todos los módulos los reconozcan.

function mapToRonda(row: Record<string, string>, idx: number, batchId: string, archivoOrigen: string): object {
  const ts = parseTimestamp(row.fecha || row.date || '') || (Date.now() - idx * 86400000);
  const objetivo = row.objetivo || row['cliente/objetivo'] || row.cliente || row.location || '—';
  const vigilador = row['vigilador nombre'] || row['nombre vigilador'] || row.vigilador || row.nombre || '—';
  const escaneoRaw = row.resultado || row.escaneo || row['escaneo ok'] || row['escaneo_ok'] || '';
  const escaneoOk = normalizeResultado(escaneoRaw); // 'OK' | 'Incompleto'

  // Normalizar resultado al formato que espera RondasQR: 'completa' | 'parcial' | 'incompleta'
  const resultadoRondas = escaneoOk === 'OK' ? 'completa' : escaneoOk === 'Incompleto' ? 'incompleta' : 'parcial';

  // Hora: extraer de timestamp o del campo raw
  const horaRaw = row.hora || row.hour || row.time || '';
  const hora = horaRaw || new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  // ID estable: usar business key para deduplicar por contenido (no por momento de importación)
  const businessKey = row.id || makeRondaKey(row, ts);

  return {
    id: businessKey,
    fecha: row.fecha || row.date || formatDate(ts),
    turno: row.turno || row.shift || 'Sin turno',
    hora,
    // Campos para RondasQR (useLocalStorage('rondas_v2') → spi_sgc_rondas_v2)
    sede: objetivo,              // RondasQR muestra 'sede'
    resultado: resultadoRondas, // RondasQR espera 'completa' | 'parcial' | 'incompleta'
    obs: row.observaciones || row.obs || '',
    // Campos canónicos que usa el Dashboard para clasificar y los módulos para mostrar
    clienteObjetivo: objetivo,   // Dashboard: esRonda via 'clienteObjetivo'
    objetivo,                    // alias legacy
    vigiladorNombre: vigilador,  // Dashboard: esRonda via 'vigiladorNombre'
    vigilador,                   // alias legacy
    escaneoOk,                   // Dashboard + DataAudit badge
    hayNovedad: parseBoolean(row['hay novedad'] || row.novedad || row.novedades || ''),
    timestamp: ts,
    // Trazabilidad de importación (para auditoría y limpieza selectiva)
    _batchId: batchId,
    _archivoOrigen: archivoOrigen,
    _fechaImport: new Date().toISOString(),
  };
}

function mapToPresentismo(row: Record<string, string>, idx: number, batchId: string, archivoOrigen: string): object {
  const ts = parseTimestamp(row.fecha || row.date || '') || (Date.now() - idx * 86400000);
  const estado = normalizeEstado(row.estado || row.asistencia || row.status || 'Presente');
  // Nombre canónico que usa el formulario real
  const nombreApellido =
    row['nombre y apellido'] || row['nombre apellido'] || row['nombreapellido'] ||
    row['nombre_apellido'] || row.nombreApellido || row.nombre || row.name || '—';
  const nroDocumento =
    row['nro documento'] || row['nro_documento'] || row.nrodocumento ||
    row.documento || row.dni || row.nroDocumento || '—';
  const objetivo = row.objetivo || row.location || row['objetivo de seguridad'] || '—';

  // ID estable basado en contenido del registro
  const businessKey = row.id || makePresentismoKey(row, ts);

  return {
    id: businessKey,
    fecha: row.fecha || row.date || formatDate(ts),
    // Campos canónicos del formulario real de Presentismo
    nombreApellido,   // DataAudit + Dashboard
    nroDocumento,     // DataAudit
    nombre: nombreApellido, // alias legacy
    estado,           // Dashboard clasifica por este campo (Presente/Ausente/Tardanza)
    turno: row.turno || row.shift || '—',
    objetivo,
    horaIngreso: row['hora ingreso'] || row.horaIngreso || row.hora || '—',
    timestamp: ts,
    // Trazabilidad
    _batchId: batchId,
    _archivoOrigen: archivoOrigen,
    _fechaImport: new Date().toISOString(),
  };
}

function mapToSupervision(row: Record<string, string>, idx: number, batchId: string, archivoOrigen: string): object {
  const ts = parseTimestamp(row.fecha || row.date || '') || (Date.now() - idx * 86400000);
  const puntajeRaw = parseFloat(row.puntaje || row.score || row.cumplimiento || '0') || 0;
  // Normalizar: si viene como decimal (0–1) convertir a porcentaje
  const puntaje = puntajeRaw > 1 ? puntajeRaw : Math.round(puntajeRaw * 100);
  const resultado = normalizeResultadoSup(puntaje);
  const objetivo = row.objetivo || row['cliente/objetivo'] || row.cliente || row.clienteObjetivo || '—';

  // ID estable basado en contenido
  const businessKey = row.id || makeSupervisionKey(row, ts);

  return {
    id: businessKey,
    fecha: row.fecha || row.date || formatDate(ts),
    hora: row.hora || row.hour || '—',
    supervisor: row.supervisor || '—',  // Dashboard clasifica por 'supervisor' + 'puntaje'
    clienteObjetivo: objetivo,
    objetivo,
    puntaje,
    resultado,
    satisfaccionCliente: row.satisfaccion || row['satisfaccion cliente'] || row.satisfaccionCliente || null,
    observaciones: row.observaciones || row.obs || '',
    timestamp: ts,
    // Trazabilidad
    _batchId: batchId,
    _archivoOrigen: archivoOrigen,
    _fechaImport: new Date().toISOString(),
  };
}

function mapToNovedad(row: Record<string, string>, idx: number, batchId: string, archivoOrigen: string): object {
  const ts = parseTimestamp(row.fecha || '') || (Date.now() - idx * 86400000);
  const businessKey = row.id || makeNovedadKey(row, ts);
  return {
    id: businessKey,
    fecha: row.fecha || formatDate(ts),
    tipo: 'No Conformidad Operativa',
    origen: row.origen || 'Importación Drive',
    objetivo: row.objetivo || row.location || '—',
    supervisor: row.supervisor || '—',
    item: row.item || row.descripcion || row.description || '—',
    resultado: 'No cumple',
    estado: (row.estado || '').toLowerCase() === 'cerrada' ? 'Cerrada' : 'Abierta',
    prioridad: (row.prioridad || '').toLowerCase().includes('alta') ? 'Alta' : 'Media',
    timestamp: ts,
    // Trazabilidad
    _batchId: batchId,
    _archivoOrigen: archivoOrigen,
    _fechaImport: new Date().toISOString(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTimestamp(dateStr: string): number | null {
  if (!dateStr) return null;
  // Try DD/MM/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const d = new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  // Try ISO / other
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es-AR');
}

function normalizeEstado(val: string): 'Presente' | 'Ausente' | 'Tardanza' {
  const v = val.toLowerCase();
  if (v.includes('ausente') || v.includes('ausencia') || v === 'no') return 'Ausente';
  if (v.includes('tardanza') || v.includes('tarde') || v.includes('tardy')) return 'Tardanza';
  return 'Presente';
}

function normalizeResultado(val: string): string {
  const v = val.toLowerCase();
  if (v.includes('ok') || v.includes('completo') || v.includes('si') || v.includes('sí') || v === '1') return 'OK';
  if (v.includes('no') || v.includes('incom') || v === '0') return 'Incompleto';
  return val || 'OK';
}

function normalizeResultadoSup(pct: number): string {
  if (pct >= 90) return 'EXCELENTE';
  if (pct >= 75) return 'SATISFACTORIO';
  if (pct >= 60) return 'REGULAR';
  if (pct > 0) return 'CRÍTICO';
  return '—';
}

function parseBoolean(val: string): boolean {
  const v = val.toLowerCase();
  return v === 'si' || v === 'sí' || v === 'yes' || v === '1' || v === 'true';
}

// ─── Merge into localStorage without duplicates ───────────────────────────────
// CORRECCIÓN: deduplicar al LEER de múltiples keys para no acumular registros
// repetidos en existingRecords (que luego se re-escriben multiplicados).
// También deduplicar newRecords entre sí antes de comparar con existentes.

function mergeToLS(key: string, newRecords: object[], extraKeys: string[] = []): { added: number; skipped: number } {
  try {
    // ── 1. Leer y deduplicar existentes de TODAS las keys ───────────────────
    // CRÍTICO: leer de todas las keys pero deduplicar por ID para que
    // si la misma data está en spi_rondas Y spi_sgc_rondas_v2, no se duplique
    // en existingRecords.
    const allReadKeys = [key, ...extraKeys];
    const existingById = new Map<string, { id?: string; timestamp?: number }>();

    for (const k of allReadKeys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw || !raw.startsWith('[')) continue;
        const arr: { id?: string; timestamp?: number }[] = JSON.parse(raw);
        if (!Array.isArray(arr)) continue;
        for (const r of arr) {
          // Preferir registros con ID explícito; si hay colisión, conservar el primero visto
          // (que viene de la key principal, que tiene prioridad)
          const uid = r.id || String(r.timestamp || '');
          if (uid && !existingById.has(uid)) {
            existingById.set(uid, r);
          }
        }
      } catch { /* noop */ }
    }

    // ── 2. Deduplicar newRecords entre sí (misma business key en el CSV) ──
    const newById = new Map<string, object>();
    for (const rec of newRecords) {
      const r = rec as { id?: string; timestamp?: number };
      const uid = r.id || String(r.timestamp || '');
      if (uid && !newById.has(uid)) newById.set(uid, rec);
    }

    // ── 3. Separar nuevos vs ya existentes ──────────────────────────────────
    let added = 0;
    let skipped = 0;
    const toAdd: object[] = [];

    for (const [uid, rec] of newById) {
      if (existingById.has(uid)) {
        skipped++;
      } else {
        existingById.set(uid, rec as { id?: string; timestamp?: number });
        toAdd.push(rec);
        added++;
      }
    }

    // ── 4. Combinar y ordenar por fecha descendente ──────────────────────────
    const allRecords = Array.from(existingById.values());
    allRecords.sort((a, b) => ((b.timestamp || 0) - (a.timestamp || 0)));

    const serialized = JSON.stringify(allRecords);

    // ── 5. Escribir en TODAS las keys (principal + extras) ───────────────────
    const allWriteKeys = [...new Set([key, ...extraKeys])];
    for (const k of allWriteKeys) {
      localStorage.setItem(k, serialized);
      window.dispatchEvent(new StorageEvent('storage', { key: k }));
    }

    return { added, skipped };
  } catch {
    return { added: 0, skipped: 0 };
  }
}

// ─── Purga de duplicados en localStorage (ejecutar al iniciar y bajo demanda) ─
// Recorre cada key conocida, deduplica por ID y reescribe.
// Expuesta globalmente para que el agente la pueda llamar.
export function purgeLocalStorageDuplicates(): { key: string; antes: number; despues: number }[] {
  const allKeys = [
    'spi_rondas', 'spi_sgc_spi_rondas_form_v1', 'spi_sgc_rondas_v2',
    'spi_presentismo', 'spi_sgc_spi_presentismo_v1',
    'spi_supervisiones', 'spi_sgc_supervisiones',
    'spi_novedades',
  ];
  const report: { key: string; antes: number; despues: number }[] = [];

  for (const k of allKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw || !raw.startsWith('[')) continue;
      const arr: { id?: string; timestamp?: number }[] = JSON.parse(raw);
      if (!Array.isArray(arr)) continue;

      const antes = arr.length;
      const seen = new Map<string, { id?: string; timestamp?: number }>();
      for (const r of arr) {
        const uid = r.id || String(r.timestamp || Math.random());
        if (!seen.has(uid)) seen.set(uid, r);
      }
      const deduped = Array.from(seen.values());
      const despues = deduped.length;

      if (antes !== despues) {
        deduped.sort((a, b) => ((b.timestamp || 0) - (a.timestamp || 0)));
        localStorage.setItem(k, JSON.stringify(deduped));
        window.dispatchEvent(new StorageEvent('storage', { key: k }));
      }
      if (antes > 0) report.push({ key: k, antes, despues });
    } catch { /* noop */ }
  }

  return report;
}

// ─── Parse file and classify ──────────────────────────────────────────────────

function parseFile(filename: string, content: string): ParsedRecord | null {
  let rows: Record<string, string>[] = [];

  if (filename.endsWith('.csv') || filename.endsWith('.tsv')) {
    const sep = filename.endsWith('.tsv') ? '\t' : ',';
    rows = sep === '\t'
      ? content.trim().split(/\r?\n/).slice(1).map(l => {
          const vals = l.split('\t');
          return { col0: vals[0], col1: vals[1], col2: vals[2] };
        })
      : parseCSV(content);
  } else if (filename.endsWith('.json')) {
    try {
      const parsed = JSON.parse(content);
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } catch { return null; }
  } else {
    // Try as CSV anyway
    rows = parseCSV(content);
  }

  if (rows.length === 0) return null;
  const headers = Object.keys(rows[0]);
  const type = detectType(filename, headers);
  const sample = headers.slice(0, 5).join(', ');

  return { type, count: rows.length, sample, data: rows };
}

// ─── Import into localStorage ─────────────────────────────────────────────────

// Keys donde escribe cada tipo de dato (principal + todos los alias que leen
// el Dashboard, la Auditoría y los módulos individuales)
//
// RONDAS:
//   spi_rondas                  → Dashboard (legacy read)
//   spi_sgc_spi_rondas_form_v1  → Dashboard scan + DataAudit
//   spi_sgc_rondas_v2           → RondasQR (useLocalStorage('rondas_v2') → prefija con spi_sgc_)
//
// PRESENTISMO:
//   spi_presentismo             → Dashboard (legacy read)
//   spi_sgc_spi_presentismo_v1  → Presentismo.tsx (useLocalStorage('spi_presentismo_v1'))
//
// SUPERVISIONES:
//   spi_supervisiones           → Dashboard + SupervisionOperativa (legacy read)
//   spi_sgc_supervisiones       → SupervisionOperativa dual-write
//   spi_sgc_supervisiones       → Supervision.tsx (useLocalStorage('supervisiones') → spi_sgc_supervisiones)
const TYPE_WRITE_KEYS: Record<string, string[]> = {
  rondas:        ['spi_rondas', 'spi_sgc_spi_rondas_form_v1', 'spi_sgc_rondas_v2'],
  presentismo:   ['spi_presentismo', 'spi_sgc_spi_presentismo_v1'],
  supervisiones: ['spi_supervisiones', 'spi_sgc_supervisiones'],
  novedades:     ['spi_novedades'],
};

function importParsed(filename: string, parsed: ParsedRecord): ImportResult {
  const rows = parsed.data as Record<string, string>[];
  let mapped: object[] = [];

  // batchId único por importación — permite identificar y revertir un batch completo
  const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const archivoOrigen = filename;

  switch (parsed.type) {
    case 'rondas':        mapped = rows.map((r, i) => mapToRonda(r, i, batchId, archivoOrigen));        break;
    case 'presentismo':   mapped = rows.map((r, i) => mapToPresentismo(r, i, batchId, archivoOrigen));  break;
    case 'supervisiones': mapped = rows.map((r, i) => mapToSupervision(r, i, batchId, archivoOrigen));  break;
    case 'novedades':     mapped = rows.map((r, i) => mapToNovedad(r, i, batchId, archivoOrigen));      break;
    default:
      return { filename, type: 'desconocido', count: 0, status: 'error', message: 'Tipo de datos no reconocido. Revisá los encabezados del archivo.' };
  }

  const writeKeys = TYPE_WRITE_KEYS[parsed.type] ?? [];
  const [primaryKey, ...extraKeys] = writeKeys;
  const { added, skipped } = mergeToLS(primaryKey, mapped, extraKeys);

  return {
    filename,
    type: parsed.type,
    count: added,
    status: 'ok',
    message: `${added} registros importados${skipped > 0 ? `, ${skipped} ya existían (omitidos)` : ''} · batch: ${batchId}`,
  };
}

// ─── Icons per type ───────────────────────────────────────────────────────────

const TYPE_META: Record<DataType, { label: string; color: string; icon: React.ReactNode; key: string; allKeys: string[] }> = {
  rondas:       { label: 'Rondas',        color: 'text-emerald-400', icon: <QrCode size={14} />,        key: 'spi_rondas',        allKeys: ['spi_rondas', 'spi_sgc_spi_rondas_form_v1', 'spi_sgc_rondas_v2'] },
  presentismo:  { label: 'Presentismo',   color: 'text-sky-400',     icon: <Users size={14} />,          key: 'spi_presentismo',   allKeys: ['spi_presentismo', 'spi_sgc_spi_presentismo_v1'] },
  supervisiones:{ label: 'Supervisiones', color: 'text-violet-400',  icon: <ClipboardCheck size={14} />, key: 'spi_supervisiones', allKeys: ['spi_supervisiones', 'spi_sgc_supervisiones'] },
  novedades:    { label: 'Novedades',     color: 'text-rose-400',    icon: <AlertOctagon size={14} />,   key: 'spi_novedades',     allKeys: ['spi_novedades'] },
  desconocido:  { label: 'Desconocido',   color: 'text-white/30',    icon: <FileText size={14} />,       key: '',                  allKeys: [] },
};

// Lee y deduplica registros de múltiples keys para mostrar el total real
function getLocalStorageCount(keys: string[]): number {
  const seen = new Set<string>();
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const arr = JSON.parse(raw) as { id?: string; timestamp?: number }[];
      if (!Array.isArray(arr)) continue;
      for (const r of arr) seen.add(r.id || String(r.timestamp));
    } catch { /* noop */ }
  }
  return seen.size;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface DriveSyncProps { searchQuery?: string; onNavigate?: (id: string) => void; onImportDone?: () => void; }

const DriveSync: React.FC<DriveSyncProps> = ({ onNavigate, onImportDone }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [pendingFiles, setPendingFiles] = useState<{ file: File; parsed: ParsedRecord | null }[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [overrideTypes, setOverrideTypes] = useState<Record<string, DataType>>({});
  const [showGuide, setShowGuide] = useState(false);
  const [lsCounts, setLsCounts] = useState(() => ({
    rondas:        getLocalStorageCount(TYPE_META.rondas.allKeys),
    presentismo:   getLocalStorageCount(TYPE_META.presentismo.allKeys),
    supervisiones: getLocalStorageCount(TYPE_META.supervisiones.allKeys),
    novedades:     getLocalStorageCount(TYPE_META.novedades.allKeys),
  }));

  const refreshCounts = useCallback(() => {
    setLsCounts({
      rondas:        getLocalStorageCount(TYPE_META.rondas.allKeys),
      presentismo:   getLocalStorageCount(TYPE_META.presentismo.allKeys),
      supervisiones: getLocalStorageCount(TYPE_META.supervisiones.allKeys),
      novedades:     getLocalStorageCount(TYPE_META.novedades.allKeys),
    });
  }, []);

  // Auto-refrescar contadores cuando otro módulo guarda datos
  React.useEffect(() => {
    window.addEventListener('storage', refreshCounts);
    return () => window.removeEventListener('storage', refreshCounts);
  }, [refreshCounts]);

  // Purgar duplicados al montar (limpieza automática silenciosa)
  React.useEffect(() => {
    const report = purgeLocalStorageDuplicates();
    const removed = report.reduce((acc, r) => acc + (r.antes - r.despues), 0);
    if (removed > 0) {
      console.info(`[DriveSync] Purga automática: ${removed} duplicados eliminados de localStorage`, report);
      refreshCounts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setStatus('parsing');
    const arr = Array.from(files);
    const pending: { file: File; parsed: ParsedRecord | null }[] = [];
    for (const file of arr) {
      const text = await file.text();
      const parsed = parseFile(file.name, text);
      pending.push({ file, parsed });
    }
    setPendingFiles(prev => [...prev, ...pending]);
    setStatus('idle');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleImportAll = () => {
    const newResults: ImportResult[] = [];
    for (const { file, parsed } of pendingFiles) {
      if (!parsed) {
        newResults.push({ filename: file.name, type: 'desconocido', count: 0, status: 'error', message: 'No se pudieron leer datos del archivo.' });
        continue;
      }
      // Allow user-overridden type
      const effectiveParsed = overrideTypes[file.name]
        ? { ...parsed, type: overrideTypes[file.name] }
        : parsed;
      newResults.push(importParsed(file.name, effectiveParsed));
    }
    setResults(newResults);
    setPendingFiles([]);
    setOverrideTypes({});
    refreshCounts();
    setStatus('done');
    // Notificar al hub que hubo una importación exitosa
    if (newResults.some(r => r.status === 'ok')) {
      onImportDone?.();
      // Disparar un evento global de CustomEvent para que el Dashboard
      // lo escuche y fuerce re-lectura aunque esté en otra pestaña de módulo
      window.dispatchEvent(new CustomEvent('spi-data-imported', { detail: { types: newResults.filter(r => r.status === 'ok').map(r => r.type) } }));
      // También disparar un storage event genérico como fallback adicional
      window.dispatchEvent(new StorageEvent('storage', { key: 'spi_import_done' }));
    }
  };

  const clearAll = () => {
    setPendingFiles([]);
    setResults([]);
    setOverrideTypes({});
    setStatus('idle');
  };

  // Limpieza manual de duplicados con reporte visible al usuario
  const [purgeReport, setPurgeReport] = React.useState<{ key: string; antes: number; despues: number }[] | null>(null);
  const handlePurge = () => {
    const report = purgeLocalStorageDuplicates();
    const withDupes = report.filter(r => r.antes !== r.despues);
    setPurgeReport(withDupes.length > 0 ? withDupes : []);
    refreshCounts();
    window.dispatchEvent(new CustomEvent('spi-data-imported', {}));
    setTimeout(() => setPurgeReport(null), 6000);
  };

  const clearLocalStorage = (type: DataType) => {
    const meta = TYPE_META[type];
    for (const k of meta.allKeys) {
      localStorage.removeItem(k);
      window.dispatchEvent(new StorageEvent('storage', { key: k }));
    }
    refreshCounts();
  };

  const types: DataType[] = ['rondas', 'presentismo', 'supervisiones', 'novedades'];

  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
            <HardDrive size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Sincronización de Datos</h2>
            <p className="text-xs text-white/40">Importa archivos de Drive o de tu PC para alimentar el Dashboard</p>
          </div>
        </div>
        <button
          onClick={() => setShowGuide(g => !g)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
        >
          <Info size={13} /> Guía de importación {showGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* ── GUÍA ── */}
      {showGuide && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-blue-300">📋 Cómo importar tus datos desde Google Drive</p>
          <ol className="space-y-2 text-xs text-white/60 list-decimal list-inside">
            <li>En Google Drive, abrí tu carpeta SPI</li>
            <li>Para cada Google Sheet: <strong className="text-white/80">Archivo → Descargar → CSV</strong></li>
            <li>Arrastrá los archivos CSV descargados al área de carga abajo</li>
            <li>El sistema detecta automáticamente si son Rondas, Presentismo, Supervisiones o Novedades</li>
            <li>Hacé clic en <strong className="text-white/80">"Importar al Dashboard"</strong></li>
          </ol>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              { type: 'Rondas', cols: 'fecha, turno, objetivo, vigilador, escaneo_ok, hay_novedad' },
              { type: 'Presentismo', cols: 'fecha, nombre, turno, objetivo, estado (Presente/Ausente/Tardanza)' },
              { type: 'Supervisiones', cols: 'fecha, supervisor, objetivo, puntaje, resultado' },
              { type: 'Novedades', cols: 'fecha, objetivo, item, supervisor, prioridad, estado' },
            ].map(g => (
              <div key={g.type} className="bg-white/3 rounded-lg p-3">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1">{g.type}</p>
                <p className="text-[10px] text-white/35 font-mono">{g.cols}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/30 mt-2">
            ℹ️ Los encabezados no tienen que ser exactos — el sistema detecta variaciones comunes (ej: "Nombre y Apellido", "nombre_apellido", "nombre").
            También acepta archivos JSON con arrays de objetos.
          </p>
        </div>
      )}

      {/* ── ESTADO ACTUAL DEL DASHBOARD ── */}
      <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-white/40" />
            <h3 className="text-sm font-semibold text-white">Datos actuales en el Dashboard</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshCounts} className="text-[10px] text-white/30 hover:text-white/60 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1">
              <RefreshCw size={10} /> Actualizar
            </button>
            <button
              onClick={handlePurge}
              title="Detectar y eliminar registros duplicados en todos los módulos"
              className="text-[10px] text-amber-400/60 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/30 transition-colors flex items-center gap-1"
            >
              <X size={10} /> Purgar duplicados
            </button>
          </div>
        </div>

        {/* Reporte de purga */}
        {purgeReport !== null && (
          <div className={cn(
            "px-5 py-2.5 border-b border-white/5 text-[11px]",
            purgeReport.length === 0 ? "text-emerald-400/70" : "text-amber-400/80"
          )}>
            {purgeReport.length === 0
              ? "✅ Sin duplicados detectados — los datos están limpios."
              : (
                <span>
                  🧹 Duplicados eliminados: {purgeReport.map(r => (
                    <span key={r.key} className="ml-2 font-mono bg-white/5 px-1 rounded">
                      {r.key.replace('spi_sgc_', '').replace('spi_', '')}: {r.antes}→{r.despues}
                    </span>
                  ))}
                </span>
              )
            }
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/5">
          {types.map(t => {
            const meta = TYPE_META[t];
            const count = lsCounts[t as keyof typeof lsCounts];
            return (
              <div key={t} className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={meta.color}>{meta.icon}</span>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">{meta.label}</p>
                </div>
                <p className={`text-2xl font-bold ${count > 0 ? meta.color : 'text-white/15'}`}>{count}</p>
                <p className="text-[10px] text-white/25">registros</p>
                {count > 0 && (
                  <button
                    onClick={() => { if (confirm(`¿Eliminar todos los registros de ${meta.label}? Esta acción no se puede deshacer.`)) clearLocalStorage(t); }}
                    className="text-[9px] text-red-400/50 hover:text-red-400 transition-colors"
                  >
                    ✕ limpiar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ZONA DE CARGA ── */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="relative border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-2xl transition-colors bg-white/2 hover:bg-blue-500/3"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.tsv,.json,.xlsx"
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center py-10 gap-3 pointer-events-none">
          {status === 'parsing' ? (
            <Loader2 size={32} className="text-blue-400 animate-spin" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Upload size={24} className="text-blue-400" />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-white/70">
              {status === 'parsing' ? 'Procesando archivos...' : 'Arrastrá tus archivos aquí'}
            </p>
            <p className="text-xs text-white/30 mt-1">CSV, JSON · Exportados de Google Sheets o Excel</p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/80 text-white text-xs font-medium pointer-events-auto cursor-pointer"
              onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet size={13} /> Seleccionar archivos
            </div>
          </div>
        </div>
      </div>

      {/* ── ARCHIVOS PENDIENTES ── */}
      {pendingFiles.length > 0 && (
        <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{pendingFiles.length} archivo{pendingFiles.length !== 1 ? 's' : ''} listos para importar</p>
            <button onClick={clearAll} className="text-xs text-white/30 hover:text-white/60 transition-colors">Cancelar todo</button>
          </div>
          <div className="divide-y divide-white/5">
            {pendingFiles.map(({ file, parsed }) => {
              const effectiveType = overrideTypes[file.name] || (parsed?.type ?? 'desconocido');
              const meta = TYPE_META[effectiveType];
              const isUnknown = effectiveType === 'desconocido';
              return (
                <div key={file.name} className="px-5 py-3.5 flex items-center gap-4">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    isUnknown ? 'bg-white/5' : 'bg-white/5')}>
                    <span className={meta.color}>{meta.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{file.name}</p>
                    {parsed ? (
                      <p className="text-xs text-white/35 mt-0.5 truncate">
                        {parsed.count} filas · columnas: {parsed.sample}
                      </p>
                    ) : (
                      <p className="text-xs text-red-400 mt-0.5">No se pudieron leer datos</p>
                    )}
                  </div>
                  {/* Type override selector */}
                  <div className="shrink-0">
                    <select
                      value={effectiveType}
                      onChange={e => setOverrideTypes(prev => ({ ...prev, [file.name]: e.target.value as DataType }))}
                      className={cn(
                        'appearance-none text-xs px-3 py-1.5 rounded-lg border transition-colors bg-[#0d1117] focus:outline-none',
                        isUnknown
                          ? 'border-amber-500/40 text-amber-400'
                          : `border-white/10 ${meta.color}`
                      )}
                    >
                      <option value="rondas">📍 Rondas</option>
                      <option value="presentismo">👤 Presentismo</option>
                      <option value="supervisiones">🛡 Supervisiones</option>
                      <option value="novedades">⚠ Novedades</option>
                      <option value="desconocido">❓ Desconocido</option>
                    </select>
                  </div>
                  <button onClick={() => setPendingFiles(prev => prev.filter(f => f.file.name !== file.name))}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/30 hover:text-red-400 flex items-center justify-center transition-colors shrink-0">
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between gap-3">
            <p className="text-xs text-white/30">
              {pendingFiles.some(f => (overrideTypes[f.file.name] || f.parsed?.type) === 'desconocido')
                ? '⚠ Algunos archivos no fueron reconocidos. Seleccioná el tipo manualmente.'
                : '✅ Todos los archivos reconocidos'}
            </p>
            <button
              onClick={handleImportAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
            >
              <ArrowRight size={15} /> Importar al Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ── RESULTADOS ── */}
      {results.length > 0 && (
        <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <p className="text-sm font-semibold text-white">Importación completada</p>
            </div>
            <button onClick={() => setResults([])} className="text-xs text-white/30 hover:text-white/60 transition-colors">Cerrar</button>
          </div>
          <div className="divide-y divide-white/5">
            {results.map(r => {
              const meta = TYPE_META[r.type];
              return (
                <div key={r.filename} className={cn('px-5 py-3.5 flex items-center gap-4',
                  r.status === 'error' ? 'bg-red-500/5' : '')}>
                  <span className={r.status === 'ok' ? meta.color : 'text-red-400'}>{r.status === 'ok' ? meta.icon : <AlertTriangle size={14} />}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{r.filename}</p>
                    <p className={cn('text-xs mt-0.5', r.status === 'ok' ? 'text-white/40' : 'text-red-400')}>{r.message}</p>
                  </div>
                  {r.status === 'ok' && (
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                      +{r.count} registros
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 bg-emerald-500/5 border-t border-emerald-500/15">
            <p className="text-xs text-emerald-400">
              ✅ Los datos ya están disponibles en el Dashboard. Navegá a "Dashboard SGC" para verlos actualizados.
            </p>
          </div>
        </div>
      )}

      {/* ── INSTRUCCIONES GOOGLE DRIVE ── */}
      <div className="bg-[#0d1117] rounded-xl border border-white/5 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <HardDrive size={14} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Exportar desde Google Drive</h3>
        </div>
        <div className="grid gap-3">
          {[
            {
              step: '1',
              title: 'Abrí tu carpeta SPI en Drive',
              desc: 'drive.google.com → Carpeta SPI → Subcarpetas de Rondas, Presentismo, Supervisiones',
              icon: '📁',
            },
            {
              step: '2',
              title: 'Exportá cada planilla como CSV',
              desc: 'Google Sheets → Archivo → Descargar → Valores separados por comas (.csv)',
              icon: '📊',
            },
            {
              step: '3',
              title: 'Arrastrá todos los CSV acá arriba',
              desc: 'Podés cargar varios archivos a la vez. El sistema los clasifica automáticamente.',
              icon: '⬆️',
            },
            {
              step: '4',
              title: 'Importá y revisá en el Dashboard',
              desc: 'Los datos se integran sin duplicar registros existentes. Los KPIs se actualizan al instante.',
              icon: '✅',
            },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-400">{s.step}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80">{s.icon} {s.title}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <p className="text-[10px] text-amber-400/80">
            <strong>Tip:</strong> También podés ir a Google Drive → hacer click derecho en la carpeta SPI → 
            "Descargar" → te baja un ZIP con todos los archivos que podés descomprimir y subir todos juntos acá.
          </p>
        </div>
      </div>

    </div>
  );
};

export default DriveSync;
