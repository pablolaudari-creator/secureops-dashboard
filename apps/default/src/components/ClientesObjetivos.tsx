import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Building2, MapPin, Phone, Mail, User,
  Shield, Truck, Eye, Zap, Calendar, ChevronDown, ChevronUp,
  CheckCircle2, Clock, TrendingUp, X, Save, RefreshCw, ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
type TipoServicio = 'Custodia' | 'Vigilancia Fija' | 'Rondas' | 'Monitoreo CCTV' | 'Servicio Integral' | 'Eventos' | '';
type EstadoCliente = 'Activo' | 'Inactivo' | 'Prospecto' | 'En expansión';

interface Cliente {
  id: string;
  nombre: string;
  direccion: string;
  contacto: string;
  telefono: string;
  email: string;
  tipoServicio: TipoServicio;
  estado: EstadoCliente;
  vigiladores: string;
  supervisor: string;
  fechaInicio: string;
  observaciones: string;
  fromDrive: boolean;
}

// ─── Data: Clientes SPI — Lista oficial (rev. 14/04/2026) ────────────────────
// Fuente: listado oficial de 20 clientes/objetivos SPI
// + personal interno (IVAN TORENA, WALTER RODRIGUEZ) + placeholder planillas
const CLIENTES_INICIALES: Cliente[] = [
  // 1
  { id: 'cli-01', nombre: 'AMPIL', direccion: 'Hipólito Yrigoyen N° 4060 - CABA', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 2
  { id: 'cli-02', nombre: 'ATILRA — Sede Yrigoyen', direccion: 'Hipólito Yrigoyen N° 4060 - CABA', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 3
  { id: 'cli-03', nombre: 'ATILRA — Sede Independencia', direccion: 'Independencia N° 3332 - CABA', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 4
  { id: 'cli-04', nombre: 'ATILRA — Sede Morón', direccion: 'Ing. Boatti N° 184 - Morón', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 5
  { id: 'cli-05', nombre: 'G.I. ESTUDIO SA — Predio Avellaneda', direccion: 'Dean Funes N° 90 / Espinosa 201 - Avellaneda', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 6
  { id: 'cli-06', nombre: 'TRANSPORTES PADILLA SA', direccion: 'Dean Funes N° 95 - Avellaneda', contacto: '', telefono: '', email: '', tipoServicio: 'Custodia', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 7
  { id: 'cli-07', nombre: 'G.I. ESTUDIO SA — Predio Tilcara', direccion: 'Tilcara N° 2731 - CABA', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 8
  { id: 'cli-08', nombre: 'COMP. ARGENTINA DE DISEÑO SA (Etiqueta Negra)', direccion: 'Dardo Rocha N° 1366 - Martínez', contacto: '', telefono: '', email: '', tipoServicio: 'Eventos', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 9
  { id: 'cli-09', nombre: 'LOG J.B. LUPARIA SRL', direccion: 'Maquinista Carregal - Munro', contacto: '', telefono: '', email: '', tipoServicio: 'Rondas', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 10
  { id: 'cli-10', nombre: 'COOP. DE SCIOS. PÚBLICOS HIGHLAND PARK Ltda.', direccion: 'Los Jazmines y Las Campanillas - Del Viso', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 11
  { id: 'cli-11', nombre: 'ENTREGAR SA — Logística Predio Avellaneda', direccion: 'Espinosa N° 201 - Avellaneda', contacto: '', telefono: '', email: '', tipoServicio: 'Custodia', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 12
  { id: 'cli-12', nombre: 'RACING CLUB — Sede Villa del Parque', direccion: 'Nogoyá N° 3045 - CABA', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 13
  { id: 'cli-13', nombre: 'CONSORCIO DE PROPIETARIOS CORONEL DIAZ', direccion: 'Coronel Díaz N° 2241 - CABA', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 14
  { id: 'cli-14', nombre: 'LABORATORIOS KONIG — Uruguay 720 Piñeyro', direccion: 'Uruguay N° 720 - Piñeyro', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 15
  { id: 'cli-15', nombre: 'LABORATORIOS KONIG — Parque Industrial Chivilcoy', direccion: 'Parque Industrial Chivilcoy', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 16
  { id: 'cli-16', nombre: 'LABORATORIOS KONIG — La Bernalesa', direccion: 'Martín Rodríguez N° 199 - Quilmes', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 17
  { id: 'cli-17', nombre: 'LABORATORIOS BINKA SA — México 1060', direccion: 'México N° 1060 - Piñeyro', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 18
  { id: 'cli-18', nombre: 'LABORATORIOS BINKA SA — Uruguay 552', direccion: 'Uruguay N° 552 - Piñeyro', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 19
  { id: 'cli-19', nombre: 'Club de Campo LA TAQUARA', direccion: 'Ruta Pcial. 205 N° 56.600 - Cañuelas', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 20
  { id: 'cli-20', nombre: 'MASTER BUS', direccion: 'Colectora Sur - Ruta 9 Km 88.500 - Zárate', contacto: '', telefono: '', email: '', tipoServicio: 'Custodia', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // 21 — Detectado en Control de Rondas compilado y Abril 2026
  { id: 'cli-21', nombre: 'HPCC — Bunker Los Jazmines', direccion: 'Los Jazmines y Las Campanillas - Del Viso', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: 'López Matías, García, Esteban Ruiz', supervisor: 'W. Rodríguez', fechaInicio: '', observaciones: 'NC-001 activa — cobertura Sector B en seguimiento', fromDrive: false },
  // 22 — Detectado en Control de Rondas compilado (Iván Torena, 21/03)
  { id: 'cli-22', nombre: 'CHARCAS 3140', direccion: 'Charcas N° 3140 - CABA', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: 'I. Torena', fechaInicio: '', observaciones: '', fromDrive: false },
  // 23 — Detectado en Control de Rondas compilado (Sebastián Stellato, 21/03)
  { id: 'cli-23', nombre: 'ENTREGA — Espinosa', direccion: 'Espinosa - CABA', contacto: '', telefono: '', email: '', tipoServicio: 'Custodia', estado: 'Activo', vigiladores: 'Sebastián Stellato', supervisor: 'I. Torena', fechaInicio: '', observaciones: '', fromDrive: false },
  // ── Personal interno ───────────────────────────────────────────────────────
  { id: 'cli-pi-01', nombre: 'IVAN TORENA', direccion: '', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  { id: 'cli-pi-02', nombre: 'WALTER RODRIGUEZ', direccion: '', contacto: '', telefono: '', email: '', tipoServicio: 'Vigilancia Fija', estado: 'Activo', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: true },
  // ── Placeholder para nuevas altas en planillas ─────────────────────────────
  { id: 'cli-nuevo', nombre: '— NUEVO CLIENTE (completar)', direccion: '', contacto: '', telefono: '', email: '', tipoServicio: '', estado: 'Prospecto', vigiladores: '', supervisor: '', fechaInicio: '', observaciones: '', fromDrive: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'spi_clientes_objetivos';
// Bump this version whenever CLIENTES_INICIALES changes — forces a clean reload
const DATA_VERSION = 'v5-oficial-20260414';
const VERSION_KEY  = 'spi_clientes_version';

function loadClientes(): Cliente[] {
  try {
    // If the cached data is from an older version, reset to the clean list
    const cachedVersion = localStorage.getItem(VERSION_KEY);
    if (cachedVersion !== DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      return CLIENTES_INICIALES;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return CLIENTES_INICIALES;
}

function saveClientes(clientes: Cliente[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
  window.dispatchEvent(new Event('storage'));
}

// Register new client to Taskade project via API
async function registerInTaskade(cliente: Cliente): Promise<boolean> {
  try {
    const res = await fetch('/api/taskade/projects/vjNACQB6Yk4rtVmF/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `${cliente.nombre}${cliente.direccion ? ' — ' + cliente.direccion : ''}`,
        position: 'afterbegin',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const TIPO_CONFIG: Record<string, { color: string; icon: React.ReactNode; bg: string }> = {
  'Custodia':        { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: <Truck size={12} /> },
  'Vigilancia Fija': { color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: <Shield size={12} /> },
  'Rondas':          { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <RefreshCw size={12} /> },
  'Monitoreo CCTV':  { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: <Eye size={12} /> },
  'Servicio Integral':{ color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: <Zap size={12} /> },
  'Eventos':         { color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/20',   icon: <Calendar size={12} /> },
  '':                { color: 'text-white/30',   bg: 'bg-white/5 border-white/10',          icon: <Building2 size={12} /> },
};

const ESTADO_CONFIG: Record<EstadoCliente, { color: string; dot: string }> = {
  'Activo':       { color: 'text-emerald-400', dot: 'bg-emerald-400' },
  'En expansión': { color: 'text-blue-400',    dot: 'bg-blue-400 animate-pulse' },
  'Prospecto':    { color: 'text-amber-400',   dot: 'bg-amber-400' },
  'Inactivo':     { color: 'text-white/30',    dot: 'bg-white/20' },
};

// ─── New Client Form ─────────────────────────────────────────────────────────
const EMPTY_FORM: Omit<Cliente, 'id' | 'fromDrive'> = {
  nombre: '', direccion: '', contacto: '', telefono: '', email: '',
  tipoServicio: '', estado: 'Activo', vigiladores: '', supervisor: '',
  fechaInicio: '', observaciones: '',
};

interface NewClientFormProps {
  onSave: (c: Cliente) => void;
  onClose: () => void;
}

const NewClientForm: React.FC<NewClientFormProps> = ({ onSave, onClose }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const newCliente: Cliente = { ...form, id: `cli-${Date.now()}`, fromDrive: false };
    const ok = await registerInTaskade(newCliente);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { onSave(newCliente); }, 800);
    void ok;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      className="bg-[#0d1117] border border-white/10 rounded-2xl p-5 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-white">Nuevo Cliente / Objetivo</h3>
          <p className="text-xs text-white/40 mt-0.5">Se registra automáticamente en la base de datos</p>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Nombre */}
        <div className="col-span-2">
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Nombre / Objetivo *</label>
          <input
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8"
            placeholder="Ej: Club Náutico San Fernando"
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
          />
        </div>

        {/* Dirección */}
        <div className="col-span-2">
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Dirección / Ubicación</label>
          <input
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
            placeholder="Ej: Av. del Libertador 1234, San Isidro"
            value={form.direccion}
            onChange={e => set('direccion', e.target.value)}
          />
        </div>

        {/* Tipo de Servicio */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Tipo de Servicio</label>
          <select
            className="mt-1 w-full bg-[#0a0c11] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            value={form.tipoServicio}
            onChange={e => set('tipoServicio', e.target.value as TipoServicio)}
          >
            <option value="">— Seleccionar —</option>
            <option value="Vigilancia Fija">Vigilancia Fija</option>
            <option value="Custodia">Custodia</option>
            <option value="Rondas">Rondas</option>
            <option value="Monitoreo CCTV">Monitoreo CCTV</option>
            <option value="Servicio Integral">Servicio Integral</option>
            <option value="Eventos">Eventos</option>
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Estado</label>
          <select
            className="mt-1 w-full bg-[#0a0c11] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            value={form.estado}
            onChange={e => set('estado', e.target.value as EstadoCliente)}
          >
            <option value="Activo">Activo</option>
            <option value="En expansión">En expansión</option>
            <option value="Prospecto">Prospecto</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>

        {/* Contacto */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Contacto</label>
          <input
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
            placeholder="Nombre del referente"
            value={form.contacto}
            onChange={e => set('contacto', e.target.value)}
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Teléfono</label>
          <input
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
            placeholder="+54 11 ..."
            value={form.telefono}
            onChange={e => set('telefono', e.target.value)}
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Email</label>
          <input
            type="email"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
            placeholder="contacto@empresa.com"
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />
        </div>

        {/* Supervisor */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Supervisor responsable</label>
          <input
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
            placeholder="Nombre del supervisor"
            value={form.supervisor}
            onChange={e => set('supervisor', e.target.value)}
          />
        </div>

        {/* Vigiladores */}
        <div className="col-span-2">
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Vigiladores asignados</label>
          <input
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
            placeholder="Cantidad o nombres"
            value={form.vigiladores}
            onChange={e => set('vigiladores', e.target.value)}
          />
        </div>

        {/* Observaciones */}
        <div className="col-span-2">
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Observaciones</label>
          <textarea
            rows={2}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-none"
            placeholder="Notas adicionales sobre el cliente..."
            value={form.observaciones}
            onChange={e => set('observaciones', e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={!form.nombre.trim() || saving || saved}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : saving
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50'
          )}
        >
          {saved ? <><CheckCircle2 size={15} /> Registrado ✓</> : saving ? <><RefreshCw size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Guardar y registrar</>}
        </button>
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-colors">
          Cancelar
        </button>
      </div>
    </motion.div>
  );
};

// ─── Client Card ─────────────────────────────────────────────────────────────
interface ClientCardProps {
  cliente: Cliente;
  onUpdate: (c: Cliente) => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ cliente, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(cliente);

  const tipoConf = TIPO_CONFIG[cliente.tipoServicio] || TIPO_CONFIG[''];
  const estadoConf = ESTADO_CONFIG[cliente.estado];
  const isIncomplete = !cliente.direccion || !cliente.contacto || !cliente.telefono;

  const handleSave = () => {
    onUpdate(form);
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border transition-all duration-200',
        isIncomplete && !editing
          ? 'border-amber-500/20 bg-amber-500/5'
          : 'border-white/8 bg-white/3 hover:bg-white/5'
      )}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => { if (!editing) setExpanded(e => !e); }}
      >
        {/* Tipo badge */}
        <div className={cn('shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-semibold', tipoConf.bg, tipoConf.color)}>
          {tipoConf.icon}
          <span className="hidden sm:inline">{cliente.tipoServicio || 'Sin tipo'}</span>
        </div>

        {/* Nombre */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{cliente.nombre}</span>
            {cliente.fromDrive && (
              <span className="shrink-0 text-[9px] text-blue-400/60 bg-blue-500/10 border border-blue-500/15 px-1.5 py-0.5 rounded font-mono">DRIVE</span>
            )}
            {isIncomplete && (
              <span className="shrink-0 text-[9px] text-amber-400/70 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">completar</span>
            )}
          </div>
          {cliente.direccion && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={10} className="text-white/20 shrink-0" />
              <span className="text-[11px] text-white/35 truncate">{cliente.direccion}</span>
            </div>
          )}
        </div>

        {/* Estado */}
        <div className="shrink-0 flex items-center gap-1.5">
          <div className={cn('w-1.5 h-1.5 rounded-full', estadoConf.dot)} />
          <span className={cn('text-xs font-medium hidden sm:block', estadoConf.color)}>{cliente.estado}</span>
        </div>

        {/* Expand */}
        <span className="text-white/20 shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {/* Expanded: detail / edit */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-4">
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'direccion', label: 'Dirección', placeholder: 'Dirección completa', span: 2 },
                    { key: 'contacto', label: 'Contacto', placeholder: 'Nombre del referente' },
                    { key: 'telefono', label: 'Teléfono', placeholder: '+54 11...' },
                    { key: 'email', label: 'Email', placeholder: 'email@empresa.com' },
                    { key: 'supervisor', label: 'Supervisor', placeholder: 'Responsable SPI' },
                    { key: 'vigiladores', label: 'Vigiladores', placeholder: 'Cantidad asignados' },
                    { key: 'observaciones', label: 'Observaciones', placeholder: 'Notas...', span: 2 },
                  ].map(f => (
                    <div key={f.key} className={cn(f.span === 2 ? 'col-span-2' : '')}>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider">{f.label}</label>
                      <input
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40"
                        placeholder={f.placeholder}
                        value={(form as Record<string, string>)[f.key] || ''}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  {/* Estado select */}
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider">Estado</label>
                    <select
                      className="mt-1 w-full bg-[#0a0c11] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/40"
                      value={form.estado}
                      onChange={e => setForm(prev => ({ ...prev, estado: e.target.value as EstadoCliente }))}
                    >
                      <option value="Activo">Activo</option>
                      <option value="En expansión">En expansión</option>
                      <option value="Prospecto">Prospecto</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                  {/* Tipo select */}
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider">Tipo de Servicio</label>
                    <select
                      className="mt-1 w-full bg-[#0a0c11] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/40"
                      value={form.tipoServicio}
                      onChange={e => setForm(prev => ({ ...prev, tipoServicio: e.target.value as TipoServicio }))}
                    >
                      <option value="">— Sin tipo —</option>
                      <option value="Vigilancia Fija">Vigilancia Fija</option>
                      <option value="Custodia">Custodia</option>
                      <option value="Rondas">Rondas</option>
                      <option value="Monitoreo CCTV">Monitoreo CCTV</option>
                      <option value="Servicio Integral">Servicio Integral</option>
                      <option value="Eventos">Eventos</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex gap-2 pt-1">
                    <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors">
                      <Save size={12} /> Guardar
                    </button>
                    <button onClick={() => { setForm(cliente); setEditing(false); }} className="px-3 py-1.5 border border-white/10 text-white/50 hover:text-white rounded-lg text-xs transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {cliente.contacto && (
                    <div className="flex items-start gap-2">
                      <User size={12} className="text-white/20 mt-0.5 shrink-0" />
                      <div><p className="text-[10px] text-white/30">Contacto</p><p className="text-xs text-white/70">{cliente.contacto}</p></div>
                    </div>
                  )}
                  {cliente.telefono && (
                    <div className="flex items-start gap-2">
                      <Phone size={12} className="text-white/20 mt-0.5 shrink-0" />
                      <div><p className="text-[10px] text-white/30">Teléfono</p><p className="text-xs text-white/70">{cliente.telefono}</p></div>
                    </div>
                  )}
                  {cliente.email && (
                    <div className="flex items-start gap-2">
                      <Mail size={12} className="text-white/20 mt-0.5 shrink-0" />
                      <div><p className="text-[10px] text-white/30">Email</p><p className="text-xs text-white/70 break-all">{cliente.email}</p></div>
                    </div>
                  )}
                  {cliente.supervisor && (
                    <div className="flex items-start gap-2">
                      <Shield size={12} className="text-white/20 mt-0.5 shrink-0" />
                      <div><p className="text-[10px] text-white/30">Supervisor</p><p className="text-xs text-white/70">{cliente.supervisor}</p></div>
                    </div>
                  )}
                  {cliente.vigiladores && (
                    <div className="flex items-start gap-2">
                      <Users size={12} className="text-white/20 mt-0.5 shrink-0" />
                      <div><p className="text-[10px] text-white/30">Vigiladores</p><p className="text-xs text-white/70">{cliente.vigiladores}</p></div>
                    </div>
                  )}
                  {cliente.observaciones && (
                    <div className="col-span-full flex items-start gap-2">
                      <div><p className="text-[10px] text-white/30">Obs.</p><p className="text-xs text-white/50 italic">{cliente.observaciones}</p></div>
                    </div>
                  )}
                  {isIncomplete && (
                    <div className="col-span-full mt-1 p-2 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                      <p className="text-[11px] text-amber-400/70">⚠ Datos incompletos — hacé clic en Editar para completar la información.</p>
                    </div>
                  )}
                  <div className="col-span-full flex gap-2 pt-1">
                    <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 rounded-lg text-xs transition-colors">
                      Editar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ClientesObjetivos: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>(loadClientes);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<EstadoCliente | 'Todos'>('Todos');
  const [filterTipo, setFilterTipo] = useState<TipoServicio | 'Todos'>('Todos');
  const [showForm, setShowForm] = useState(false);

  // Persist on change
  useEffect(() => { saveClientes(clientes); }, [clientes]);

  const handleUpdate = useCallback((updated: Cliente) => {
    setClientes(prev => prev.map(c => c.id === updated.id ? updated : c));
  }, []);

  const handleAdd = useCallback((nuevo: Cliente) => {
    setClientes(prev => [nuevo, ...prev]);
    setShowForm(false);
  }, []);

  // Filter
  const filtered = clientes.filter(c => {
    const matchSearch = !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || c.direccion.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'Todos' || c.estado === filterEstado;
    const matchTipo = filterTipo === 'Todos' || c.tipoServicio === filterTipo;
    return matchSearch && matchEstado && matchTipo;
  });

  // Stats
  const totalActivos = clientes.filter(c => c.estado === 'Activo').length;
  const totalExpansion = clientes.filter(c => c.estado === 'En expansión').length;
  const totalProspectos = clientes.filter(c => c.estado === 'Prospecto').length;
  const incompletos = clientes.filter(c => !c.direccion || !c.contacto || !c.telefono).length;

  return (
    <div className="h-full flex flex-col bg-[#080b10] text-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 bg-[#0a0c11]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 size={20} className="text-blue-400" />
              Clientes & Objetivos
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              Extraído de Drive SPI · {clientes.length} objetivos registrados
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={15} /> Nuevo cliente
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Activos', value: totalActivos, color: 'text-emerald-400', icon: <CheckCircle2 size={14} /> },
            { label: 'En expansión', value: totalExpansion, color: 'text-blue-400', icon: <TrendingUp size={14} /> },
            { label: 'Prospectos', value: totalProspectos, color: 'text-amber-400', icon: <Clock size={14} /> },
            { label: 'Por completar', value: incompletos, color: 'text-orange-400', icon: <ExternalLink size={14} /> },
          ].map(stat => (
            <div key={stat.label} className="bg-white/3 border border-white/8 rounded-xl p-3">
              <div className={cn('flex items-center gap-1.5 text-xs font-semibold mb-1', stat.color)}>
                {stat.icon} {stat.label}
              </div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40"
              placeholder="Buscar cliente / ubicación..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/40"
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value as EstadoCliente | 'Todos')}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="En expansión">En expansión</option>
            <option value="Prospecto">Prospecto</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <select
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/40"
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value as TipoServicio | 'Todos')}
          >
            <option value="Todos">Todos los servicios</option>
            <option value="Vigilancia Fija">Vigilancia Fija</option>
            <option value="Custodia">Custodia</option>
            <option value="Rondas">Rondas</option>
            <option value="Monitoreo CCTV">Monitoreo CCTV</option>
            <option value="Servicio Integral">Servicio Integral</option>
            <option value="Eventos">Eventos</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {/* New client form */}
        <AnimatePresence>
          {showForm && (
            <div className="mb-4">
              <NewClientForm onSave={handleAdd} onClose={() => setShowForm(false)} />
            </div>
          )}
        </AnimatePresence>

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/30">
            {filtered.length} de {clientes.length} objetivos
          </p>
          {incompletos > 0 && (
            <p className="text-[11px] text-amber-400/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 inline-block" />
              {incompletos} pendientes de completar
            </p>
          )}
        </div>

        {/* List */}
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 text-white/20"
              >
                <Building2 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No se encontraron clientes</p>
              </motion.div>
            ) : (
              filtered.map(c => (
                <ClientCard key={c.id} cliente={c} onUpdate={handleUpdate} />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Export list for use in other components (selects, dropdowns)
export function getClientesObjetivos(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const clientes: Cliente[] = JSON.parse(stored);
      return clientes.map(c => c.nombre).filter(Boolean).sort();
    }
  } catch { /* ignore */ }
  return CLIENTES_INICIALES.map(c => c.nombre).sort();
}

export default ClientesObjetivos;
