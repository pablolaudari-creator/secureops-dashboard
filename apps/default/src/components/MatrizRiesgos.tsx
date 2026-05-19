import React, { useState, useMemo } from 'react';
import {
  ShieldAlert, ExternalLink, X, LayoutGrid, Flame, MapPin, Download,
  Database, FileText, Monitor, Users, ClipboardList, Search,
  AlertTriangle, Clock, CheckCircle2, ChevronRight, BookOpen,
  Filter, Eye, TrendingUp, Layers, Info,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { exportMatrizRiesgosXLS } from '../lib/exportMatrizRiesgos';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Sistema de origen que generó la evidencia del riesgo */
export type SistemaFuente =
  | 'App SGC'           // Módulos de la aplicación (presentismo, rondas, supervisiones)
  | 'Dashboard SGC'     // Panel de control con KPIs consolidados
  | 'Drive / Doc'       // Repositorio documental Google Drive
  | 'Informe Supervisor'// Informes escritos de supervisores de campo
  | 'Auditoría Interna' // Hallazgos de procesos de auditoría interna
  | 'RRHH'              // Registros de recursos humanos (altas, bajas, capacitaciones)
  | 'Marco Legal'       // Normativa externa (Ley 12.297, resoluciones)
  | 'Evaluación Campo'  // Relevamiento presencial en objetivos
  | 'Análisis Propio';  // Análisis de contexto / evaluación de riesgo inherente

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
  isoRef: string;
  /** Descripción detallada de la fuente, separada por · */
  fuente: string;
  /** Sistema principal que originó la evidencia del riesgo */
  sistemaFuente: SistemaFuente;
  /** Fecha en que fue detectado o actualizado este riesgo */
  fechaDeteccion: string;
}

type TabId = 'tabla' | 'calor' | 'area' | 'fuentes';

// ─── Risk data — 32 riesgos · Revisión: 08/04/2026 ──────────────────────────
// Criterio de clasificación: P×I  CRÍTICO ≥ 16 | ALTO 9–15 | MEDIO 4–8 | BAJO 1–3
// Estados actualizados al 08/04/2026 en función de:
//   · Auditoría ENG programada 30/04/2026 (22 días hábiles restantes)
//   · Ausentismo acumulado 2026: 15.3% (base 418 registros Ene–Mar + app)
//   · Brecha Jotform 18 días detectada (26/02–15/03)
//   · 86 NC en período Ene–Mar 2026 (prom. 12.3 NC/servicio)
//   · Tasa QR < 60% en auditoría anterior
//   · Supervisor W. Rodríguez: sobrecarga crítica (10+ objetivos / 3 turnos)

const RIESGOS: RiesgoItem[] = [

  // ── CRÍTICOS (P×I ≥ 16) ─────────────────────────────────────────────────

  // RSG-001 · Sin cambio — persiste ausentismo 15.3% acumulado 2026
  { codigo:'RSG-001', descripcion:'Vigilador ausente sin reemplazo oportuno en turno',
    area:'Operaciones — Presentismo',
    probabilidad:4, impacto:5, nivel:20, clasificacion:'CRÍTICO',
    control:'Parcial', estado:'En curso',
    responsable:'I. Torres / Supervisores',
    fechaLimite:'30/04/2026',
    accion:'Protocolo guardia de reemplazo 24h activo. Lista de disponibles por zona. Notificación automática a supervisor si ausencia no cubierta en ≤ 30 min. Ausentismo acumulado 2026: 15.3% (64 ausencias/tardanzas sobre 418 reg.) — requiere reducción a < 8% antes de auditoría.',
    isoRef:'ISO 8.1 / 8.5.1',
    fuente:'App SGC — Módulo Presentismo: 418 registros Ene–Mar 2026 · 64 eventos Ausente/Tardanza · Tasa 15.3% · Alerta por umbral > 8%',
    sistemaFuente:'App SGC', fechaDeteccion:'08/04/2026' },

  // RSG-004 · Actualizado — plazo vence 22 días, 86 NC pendientes de cierre
  { codigo:'RSG-004', descripcion:'NC ISO sin acción correctiva cerrada antes de auditoría',
    area:'SGC — No Conformidades',
    probabilidad:5, impacto:5, nivel:25, clasificacion:'CRÍTICO',
    control:'Parcial', estado:'En curso',
    responsable:'M. I. Torres / Dirección',
    fechaLimite:'30/04/2026',
    accion:'⚠ URGENTE — 86 NC detectadas Ene–Mar. Priorizar NC-001 a NC-010 con evidencia documentada antes del 30/04. Dashboard SGC muestra semáforo de cumplimiento. Revisión diaria con Dirección hasta cierre de auditoría. Sin cierre = observación mayor en 2ª auditoría ENG.',
    isoRef:'ISO 10.2 / 9.2.1b / 9.3.3 / 6.2.1b / 8.4.2b',
    fuente:'Dashboard SGC — Registro de NC Ene–Mar 2026: 86 no conformidades (prom. 12.3 NC/servicio) · Hallazgo auditoría interna previa · Semáforo SGC en rojo',
    sistemaFuente:'Dashboard SGC', fechaDeteccion:'08/04/2026' },

  // RSG-011 · Actualizado — programa elaborado, primera auditoría aún no ejecutada
  { codigo:'RSG-011', descripcion:'Auditoría interna 2026 planificada pero no ejecutada',
    area:'SGC — No Conformidades',
    probabilidad:4, impacto:5, nivel:20, clasificacion:'CRÍTICO',
    control:'Parcial', estado:'En curso',
    responsable:'M. I. Torres',
    fechaLimite:'25/04/2026',
    accion:'Programa de auditorías internas 2026 elaborado. Pendiente: ejecución de 1ª auditoría interna antes del 25/04. Auditor interno capacitado (confirmar). Informe a Dirección con hallazgos antes de auditoría ENG. Riesgo de NC mayor si ENG detecta ausencia de ejecución.',
    isoRef:'ISO 9.2.1a / 9.2.1b',
    fuente:'Programa de Auditorías Internas 2026 (Drive SGC) · Verificación manual: 0 auditorías ejecutadas al 08/04 · Requisito ISO 9.2 no cumplido',
    sistemaFuente:'Drive / Doc', fechaDeteccion:'08/04/2026' },

  // RSG-016 · ESCALADO — deadline 15/04 en 7 días, monitoreo diario insuficiente
  { codigo:'RSG-016', descripcion:'Pérdida de cliente clave por incumplimiento de SLA en cobertura',
    area:'Clientes / Objetivos',
    probabilidad:4, impacto:5, nivel:20, clasificacion:'CRÍTICO',
    control:'Parcial', estado:'En curso',
    responsable:'V. Gómez / Dirección',
    fechaLimite:'15/04/2026',
    accion:'⚠ VENCE EN 7 DÍAS — Cobertura mínima 95% por objetivo. Verificar ahora cada servicio activo. Reunión de cuenta urgente con clientes en riesgo. Si cobertura < 95% en algún objetivo: escalamiento a Dirección inmediato. Riesgo escalado por proximidad de deadline y ausentismo 15.3%.',
    isoRef:'ISO 9.1.2 / 8.2.1 / 6.2',
    fuente:'App SGC — Dashboard Supervisiones: cobertura por objetivo · Cruce con ausentismo 15.3% → riesgo incumplimiento SLA · Informe V. Gómez Feb–Mar 2026',
    sistemaFuente:'App SGC', fechaDeteccion:'08/04/2026' },

  // RSG-017 · Sin cambio — puntos críticos aún pendientes de revisión
  { codigo:'RSG-017', descripcion:'Robo o intrusión en objetivo por falla de vigilancia',
    area:'Operaciones — Seguridad',
    probabilidad:3, impacto:5, nivel:15, clasificacion:'CRÍTICO',
    control:'Parcial', estado:'Abierto',
    responsable:'Supervisores / I. Torres',
    fechaLimite:'30/04/2026',
    accion:'Revisión de puntos críticos por objetivo pendiente. Protocolo de respuesta inmediata a redactar (PRO-OPS-002). Simulacros trimestrales programados Q2. Coordinación con fuerzas de seguridad locales. Botón antipánico sin respuesta en 3 objetivos — CORREGIR URGENTE.',
    isoRef:'ISO 8.5.1 / 8.7',
    fuente:'Informe de supervisión operativa (supervisores, Feb–Mar 2026) · Registro FOR-OPS-003: botón antipánico sin respuesta en 3 objetivos identificados · Evaluación in situ pendiente',
    sistemaFuente:'Informe Supervisor', fechaDeteccion:'15/03/2026' },

  // RSG-008 · ESCALADO a CRÍTICO — P4×I4=16, indicadores aún no definidos
  { codigo:'RSG-008', descripcion:'Objetivos de calidad sin indicadores medibles ni seguimiento',
    area:'SGC — Calidad',
    probabilidad:4, impacto:4, nivel:16, clasificacion:'CRÍTICO',
    control:'Parcial', estado:'En curso',
    responsable:'M. I. Torres / Dirección',
    fechaLimite:'30/04/2026',
    accion:'Dashboard operativo activo como fuente parcial. Pendiente: formalizar objetivos SMART por proceso con meta, frecuencia y responsable en documento oficial FOR-SGC-003. KPIs del Dashboard deben vincularse al registro documentado. Auditoría ENG verificará evidencia de seguimiento.',
    isoRef:'ISO 6.2.1b / 9.1.1',
    fuente:'Revisión documental SGC: FOR-SGC-003 no confeccionado al 08/04 · Dashboard activo pero sin vinculación a objetivos formales documentados · Gap detectado en autoevaluación ISO 6.2',
    sistemaFuente:'Drive / Doc', fechaDeteccion:'08/04/2026' },

  // ── ALTOS (P×I 9–15) ────────────────────────────────────────────────────

  // RSG-005 · Actualizado — capacitación en curso, matrix parcial
  { codigo:'RSG-005', descripcion:'Personal sin capacitación reglamentaria vigente',
    area:'RRHH — Capacitación',
    probabilidad:3, impacto:5, nivel:15, clasificacion:'ALTO',
    control:'Parcial', estado:'En curso',
    responsable:'RRHH / I. Torres',
    fechaLimite:'31/05/2026',
    accion:'Matriz de capacitaciones iniciada. Vencimientos a cargar en app. Alerta automática 30 días antes de cada vencimiento. Registro de asistencia obligatorio. Verificar habilitaciones legales de vigiladores activos antes del 30/04.',
    isoRef:'ISO 7.2 / 7.3',
    fuente:'Matriz de Capacitaciones RRHH (Drive) — vencimientos detectados sin renovar · Verificación de habilitaciones legales de vigiladores: incompleta al 08/04 · Requerimiento auditoría ENG',
    sistemaFuente:'RRHH', fechaDeteccion:'01/04/2026' },

  // RSG-002 · Actualizado — tasa QR < 60% en auditoría anterior, mejorar
  { codigo:'RSG-002', descripcion:'Ronda de seguridad no realizada o sin evidencia QR',
    area:'Operaciones — Rondas',
    probabilidad:3, impacto:4, nivel:12, clasificacion:'ALTO',
    control:'Si', estado:'En curso',
    responsable:'Supervisores / I. Torres',
    fechaLimite:'15/04/2026',
    accion:'Control QR activo. Tasa de registro histórica < 60% — objetivo: ≥ 90% antes del 30/04. Alerta automática si ronda no registrada en tiempo programado. Reporte diario al supervisor. Brecha Jotform 18 días (feb–mar) documentada como hallazgo histórico.',
    isoRef:'ISO 8.5.1 / 9.1.1',
    fuente:'App SGC — Módulo Rondas QR: tasa de cumplimiento Ene–Mar 2026 < 60% · Brecha Jotform 26/02–15/03 (18 días sin registros) · Informe auditoría interna anterior',
    sistemaFuente:'App SGC', fechaDeteccion:'15/03/2026' },

  // RSG-003 · Sin cambio
  { codigo:'RSG-003', descripcion:'Fallo en sistema CCTV / cámaras de vigilancia',
    area:'Tecnología / CCTV',
    probabilidad:3, impacto:4, nivel:12, clasificacion:'ALTO',
    control:'Parcial', estado:'Abierto',
    responsable:'Infraestructura',
    fechaLimite:'31/05/2026',
    accion:'Checklist CCTV incluido en supervisión operativa. Reporte inmediato de fallas. Gestionar contrato de mantenimiento con SLA < 24h. Inventario de cámaras con estado actual pendiente.',
    isoRef:'ISO 7.1.3',
    fuente:'Checklist de supervisión operativa (supervisores, mensual) · Reportes de fallas de cámaras en formulario FOR-OPS · Inventario CCTV pendiente de confección',
    sistemaFuente:'Evaluación Campo', fechaDeteccion:'28/02/2026' },

  // RSG-006 · Sin cambio
  { codigo:'RSG-006', descripcion:'Insatisfacción del cliente por baja calidad del servicio',
    area:'Clientes / Objetivos',
    probabilidad:3, impacto:4, nivel:12, clasificacion:'ALTO',
    control:'Si', estado:'En curso',
    responsable:'V. Gómez / Supervisores',
    fechaLimite:'15/05/2026',
    accion:'Encuesta de satisfacción mensual activa. Dashboard de supervisiones por cliente operativo. Notificación a gerencia si puntaje < 60%. Monitoreo especial clientes con cobertura < 95%.',
    isoRef:'ISO 9.1.2 / 8.2.1',
    fuente:'Encuestas de satisfacción de clientes (V. Gómez, mensual) · Dashboard SGC — Supervisiones por objetivo · Feedback directo de clientes en reuniones de cuenta',
    sistemaFuente:'Dashboard SGC', fechaDeteccion:'31/03/2026' },

  // RSG-007 · Actualizado — FOR-SGC-004 aún no aplicado
  { codigo:'RSG-007', descripcion:'Proveedor crítico sin evaluación vigente',
    area:'SGC — Calidad',
    probabilidad:4, impacto:3, nivel:12, clasificacion:'ALTO',
    control:'No', estado:'Abierto',
    responsable:'M. I. Torres',
    fechaLimite:'30/04/2026',
    accion:'⚠ Deadline en 22 días — FOR-SGC-004 Evaluación de Proveedores debe estar aplicado antes de auditoría ENG. Criterios: calidad, plazo, precio, cumplimiento. Reevaluación anual. Lista de proveedores críticos a confeccionar.',
    isoRef:'ISO 8.4.2b',
    fuente:'Revisión documental SGC: FOR-SGC-004 no aplicado al 08/04 · Lista de proveedores críticos sin confeccionar · Requisito cláusula 8.4 detectado en autoevaluación pre-auditoría',
    sistemaFuente:'Drive / Doc', fechaDeteccion:'08/04/2026' },

  // RSG-009 · Sin cambio
  { codigo:'RSG-009', descripcion:'Incidente de seguridad en objetivo sin protocolo de respuesta',
    area:'Operaciones — Seguridad',
    probabilidad:2, impacto:5, nivel:10, clasificacion:'ALTO',
    control:'Si', estado:'En curso',
    responsable:'Supervisores / V. Gómez',
    fechaLimite:'30/06/2026',
    accion:'Protocolo de respuesta a incidentes activo. Reporte obligatorio (FOR-OPS-003) en ≤ 2 horas. Simulacros semestrales programados. Coordinación con fuerzas de seguridad locales.',
    isoRef:'ISO 8.5.1 / 8.7',
    fuente:'Registro de incidentes FOR-OPS-003 · Análisis de eventos pasados en objetivos (informes supervisores) · Evaluación de riesgo operativo inherente al rubro vigilancia privada',
    sistemaFuente:'Informe Supervisor', fechaDeteccion:'31/01/2026' },

  // RSG-010 · Actualizado — acta de revisión debe prepararse para auditoría
  { codigo:'RSG-010', descripcion:'Revisión por la dirección sin evidencia documentada',
    area:'SGC — Calidad',
    probabilidad:3, impacto:4, nivel:12, clasificacion:'ALTO',
    control:'Parcial', estado:'En curso',
    responsable:'M. I. Torres / Dirección',
    fechaLimite:'25/04/2026',
    accion:'Acta de Revisión por la Dirección debe estar firmada antes del 25/04 con todos los inputs ISO 9.3.2: política, objetivos, desempeño de procesos, NC, satisfacción, recursos. Dashboard SGC como fuente de datos. Evidencia requerida para auditoría ENG.',
    isoRef:'ISO 9.3.2 / 9.3.3',
    fuente:'Revisión documental SGC: acta de revisión por la dirección ausente para ciclo 2025–2026 · Requisito ISO 9.3 verificado en autoevaluación · Gap detectado vs. checklist auditoría ENG',
    sistemaFuente:'Auditoría Interna', fechaDeteccion:'08/04/2026' },

  // RSG-014 · Sin cambio
  { codigo:'RSG-014', descripcion:'Incumplimiento normativo o legal vigente',
    area:'Legal / Normativo',
    probabilidad:2, impacto:5, nivel:10, clasificacion:'ALTO',
    control:'Si', estado:'En curso',
    responsable:'V. Gómez / Administración',
    fechaLimite:'30/06/2026',
    accion:'Calendario de vencimientos legales activo. Alerta automática 60 días antes. Responsable legal designado. Verificar habilitaciones municipales de cada objetivo.',
    isoRef:'ISO 6.1 / 4.2',
    fuente:'Calendario de vencimientos legales (Administración) · Registro de habilitaciones municipales por objetivo · Marco regulatorio aplicable: Ley 12.297 de Seguridad Privada (Pcia. Bs. As.)',
    sistemaFuente:'Marco Legal', fechaDeteccion:'31/03/2026' },

  // RSG-015 · Actualizado — app activa, comunicación mejorada
  { codigo:'RSG-015', descripcion:'Comunicación interna deficiente entre turnos y supervisores',
    area:'Operaciones — Seguridad',
    probabilidad:3, impacto:3, nivel:9, clasificacion:'ALTO',
    control:'Parcial', estado:'En curso',
    responsable:'Supervisores / I. Torres',
    fechaLimite:'30/04/2026',
    accion:'App SGC activa con módulo de supervisiones y alertas por ausencia. Email automático QHSE ante Ausente/Tardanza. Pendiente: libro digital de guardia y módulo de novedades entre turnos.',
    isoRef:'ISO 7.4',
    fuente:'Informe de supervisores (I. Torres, Feb–Mar 2026): comunicación verbal entre turnos sin registro · Brecha detectada en traspaso de turno · Feedback de vigiladores sobre falta de información operativa',
    sistemaFuente:'Informe Supervisor', fechaDeteccion:'28/02/2026' },

  // RSG-018 · Actualizado — sobrecarga W. Rodríguez documentada
  { codigo:'RSG-018', descripcion:'Supervisor con sobrecarga crítica de objetivos asignados',
    area:'Operaciones — Supervisión',
    probabilidad:4, impacto:4, nivel:16, clasificacion:'CRÍTICO',
    control:'Parcial', estado:'Abierto',
    responsable:'V. Gómez / Dirección',
    fechaLimite:'15/04/2026',
    accion:'⚠ ESCALADO — Supervisor W. Rodríguez con 10+ objetivos / 3 turnos (sobrecarga crítica documentada en informe Feb–Mar). Redistribuir objetivos URGENTE. Máximo recomendado: 5 objetivos por supervisor. Supervisor I. Torena con capacidad disponible (3 obj.). Acción antes del 15/04.',
    isoRef:'ISO 7.1.2 / 8.5.1 / 9.1.1',
    fuente:'Informe de distribución de objetivos por supervisor (V. Gómez, Feb–Mar 2026) · App SGC — Módulo Supervisiones: W. Rodríguez con 10+ objetivos asignados en 3 turnos simultáneos',
    sistemaFuente:'Informe Supervisor', fechaDeteccion:'28/02/2026' },

  // RSG-019 · Actualizado — fix de sincronía aplicado en app
  { codigo:'RSG-019', descripcion:'Datos de presentismo desincronizados entre sistema y RRHH',
    area:'Operaciones — Presentismo',
    probabilidad:2, impacto:4, nivel:8, clasificacion:'MEDIO',
    control:'Si', estado:'En curso',
    responsable:'I. Torres / RRHH',
    fechaLimite:'15/05/2026',
    accion:'Fix de sincronía entre módulos aplicado (08/04/2026). Pendiente: validación cruzada con planillas RRHH del primer trimestre. Auditoría mensual de asistencias. Alerta por discrepancias en sistema.',
    isoRef:'ISO 8.5.1 / 7.1.2',
    fuente:'App SGC — Detección de discrepancias entre tablas spi_presentismo y spi_presentismo_v1 · Validación cruzada con planillas RRHH: diferencias en registros Ene–Mar 2026 · Fix aplicado 08/04',
    sistemaFuente:'App SGC', fechaDeteccion:'08/04/2026' },

  // RSG-020 · Sin cambio
  { codigo:'RSG-020', descripcion:'Equipamiento de vigilancia obsoleto o defectuoso',
    area:'Tecnología / CCTV',
    probabilidad:3, impacto:4, nivel:12, clasificacion:'ALTO',
    control:'No', estado:'Abierto',
    responsable:'Infraestructura / V. Gómez',
    fechaLimite:'31/05/2026',
    accion:'Inventario de equipos no confeccionado. Plan de reposición sin presupuesto aprobado. Priorizar: equipos en objetivos con NC activas. Indicador: equipos operativos / total por objetivo.',
    isoRef:'ISO 7.1.3 / 7.1.4',
    fuente:'Reportes de fallas de equipos en supervisiones operativas · Ausencia de inventario formal de equipamiento · Relevamiento visual por supervisores: equipos con antigüedad > 5 años en múltiples objetivos',
    sistemaFuente:'Evaluación Campo', fechaDeteccion:'28/02/2026' },

  // ── MEDIOS (P×I 4–8) ────────────────────────────────────────────────────

  // RSG-012 · Sin cambio — rotación alta documentada
  { codigo:'RSG-012', descripcion:'Alta rotación de personal de vigilancia',
    area:'RRHH — Capacitación',
    probabilidad:3, impacto:3, nivel:9, clasificacion:'ALTO',
    control:'Parcial', estado:'Abierto',
    responsable:'RRHH / V. Gómez',
    fechaLimite:'30/06/2026',
    accion:'Encuesta de clima laboral semestral pendiente. Programa de retención a diseñar. Indicador de rotación mensual incluir en Dashboard. Causa principal a identificar (condiciones, salario, supervisión).',
    isoRef:'ISO 7.1.2',
    fuente:'Registros de altas y bajas RRHH — Ene–Mar 2026 · Informe de V. Gómez: rotación percibida como alta sin métrica formal definida · Ausencia de indicador de rotación en Dashboard',
    sistemaFuente:'RRHH', fechaDeteccion:'31/03/2026' },

  // RSG-013 · Actualizado — Drive activo pero control de versiones informal
  { codigo:'RSG-013', descripcion:'Información documentada desactualizada o sin control de versiones',
    area:'SGC — Calidad',
    probabilidad:3, impacto:3, nivel:9, clasificacion:'ALTO',
    control:'Parcial', estado:'En curso',
    responsable:'M. I. Torres',
    fechaLimite:'31/05/2026',
    accion:'Repositorio Google Drive activo. Pendiente: formalizar control de versiones (fecha, versión, aprobación). Revisar 100% de documentos antes de auditoría ENG. FOR-SGC y PRO-OPS deben tener versión aprobada vigente.',
    isoRef:'ISO 7.5.2 / 7.5.3',
    fuente:'Revisión del repositorio Google Drive SGC (M. I. Torres, Mar 2026): documentos sin fecha de versión ni firma de aprobación · Checklist pre-auditoría ENG: ítem 7.5 observado',
    sistemaFuente:'Drive / Doc', fechaDeteccion:'31/03/2026' },

  // RSG-021 · Sin cambio
  { codigo:'RSG-021', descripcion:'Registro de incidentes incompleto o fuera de plazo',
    area:'Operaciones — Incidentes',
    probabilidad:3, impacto:3, nivel:9, clasificacion:'ALTO',
    control:'Parcial', estado:'En curso',
    responsable:'Supervisores / M. I. Torres',
    fechaLimite:'30/04/2026',
    accion:'FOR-OPS-003 de carga obligatoria. Plazo máximo de reporte: 2 horas desde el incidente. Seguimiento semanal de registros incompletos. Capacitar supervisores en uso del formulario.',
    isoRef:'ISO 10.2 / 8.7',
    fuente:'Revisión de formularios FOR-OPS-003 (M. I. Torres): incidentes registrados fuera de plazo o con campos vacíos · Seguimiento semanal detecta brechas en Ene–Mar 2026',
    sistemaFuente:'Informe Supervisor', fechaDeteccion:'08/04/2026' },

  // RSG-022 · Sin cambio
  { codigo:'RSG-022', descripcion:'Falta de procedimiento escrito para emergencias',
    area:'Operaciones — Seguridad',
    probabilidad:2, impacto:4, nivel:8, clasificacion:'MEDIO',
    control:'No', estado:'Abierto',
    responsable:'M. I. Torres / Supervisores',
    fechaLimite:'31/05/2026',
    accion:'Redactar PRO-OPS-001 Procedimiento de Emergencias: fuego, robo, persona caída, evacuación. Difundir en todos los objetivos. Evidencia de recepción por parte del personal.',
    isoRef:'ISO 8.5.1 / 7.3',
    fuente:'Revisión documental SGC: PRO-OPS-001 no redactado al 08/04 · Checklist auditoría ENG: procedimiento de emergencias requerido como evidencia obligatoria (cláusula 8.5.1)',
    sistemaFuente:'Auditoría Interna', fechaDeteccion:'08/04/2026' },

  // RSG-023 · Sin cambio
  { codigo:'RSG-023', descripcion:'Backups de información crítica sin periodicidad definida',
    area:'Tecnología / CCTV',
    probabilidad:2, impacto:4, nivel:8, clasificacion:'MEDIO',
    control:'No', estado:'Abierto',
    responsable:'Infraestructura',
    fechaLimite:'30/06/2026',
    accion:'Configurar backups automáticos diarios de base SGC y Drive. Test mensual de restauración documentado. Backup de registros de presentismo, rondas e incidentes como prioritarios.',
    isoRef:'ISO 7.5 / 7.1.3',
    fuente:'Verificación de infraestructura tecnológica: ausencia de política de backup documentada · Base de datos SGC y Google Drive sin respaldo automático configurado al 08/04',
    sistemaFuente:'Análisis Propio', fechaDeteccion:'08/04/2026' },

  // RSG-024 · Actualizado — Dashboard disponible, KPIs parciales
  { codigo:'RSG-024', descripcion:'Sin indicadores de desempeño formalizados para supervisores',
    area:'Operaciones — Supervisión',
    probabilidad:3, impacto:3, nivel:9, clasificacion:'ALTO',
    control:'Parcial', estado:'En curso',
    responsable:'V. Gómez / Dirección',
    fechaLimite:'31/05/2026',
    accion:'Dashboard operativo con métricas de rondas, supervisiones y presentismo activo. Pendiente: formalizar KPIs individuales por supervisor (visitas, NC detectadas, capacitaciones, puntualidad). Vincular a evaluación de desempeño.',
    isoRef:'ISO 9.1.1 / 6.2.1b',
    fuente:'Dashboard SGC: métricas operativas disponibles pero sin KPIs individuales por supervisor · Autoevaluación ISO 6.2: objetivos de calidad sin responsable ni meta asignados formalmente',
    sistemaFuente:'Dashboard SGC', fechaDeteccion:'08/04/2026' },

  // RSG-025 · Sin cambio
  { codigo:'RSG-025', descripcion:'Demora en respuesta a solicitudes de clientes',
    area:'Clientes / Objetivos',
    probabilidad:3, impacto:3, nivel:9, clasificacion:'ALTO',
    control:'Parcial', estado:'En curso',
    responsable:'V. Gómez / Supervisores',
    fechaLimite:'15/05/2026',
    accion:'Tiempo de respuesta objetivo: ≤ 4 horas hábiles. Canal unificado de comunicación a implementar. Registro de solicitudes en sistema. Indicador de SLA de respuesta mensual.',
    isoRef:'ISO 8.2.1 / 9.1.2',
    fuente:'Feedback de clientes en reuniones de cuenta (V. Gómez, Q1 2026) · Ausencia de registro formal de solicitudes y tiempos de respuesta · Sin indicador de SLA definido en Dashboard',
    sistemaFuente:'Informe Supervisor', fechaDeteccion:'31/03/2026' },

  // RSG-026 · Sin cambio
  { codigo:'RSG-026', descripcion:'Capacitación impartida sin evaluación de eficacia',
    area:'RRHH — Capacitación',
    probabilidad:4, impacto:2, nivel:8, clasificacion:'MEDIO',
    control:'Parcial', estado:'En curso',
    responsable:'RRHH / M. I. Torres',
    fechaLimite:'31/05/2026',
    accion:'Incluir evaluación pre/post en todas las capacitaciones. Indicador de eficacia: aprobados / total. Umbral mínimo: 70%. Capacitaciones con eficacia < 70% deben repetirse.',
    isoRef:'ISO 7.2 / 9.1.1',
    fuente:'Revisión de registros de capacitación RRHH: asistencia registrada pero sin evaluación de eficacia · Requisito ISO 7.2 detectado en autoevaluación pre-auditoría ENG',
    sistemaFuente:'RRHH', fechaDeteccion:'31/03/2026' },

  // ── BAJOS (P×I 1–3) ─────────────────────────────────────────────────────

  // RSG-027 · Sin cambio
  { codigo:'RSG-027', descripcion:'Condiciones climáticas extremas afectan rondas de seguridad',
    area:'Operaciones — Rondas',
    probabilidad:2, impacto:2, nivel:4, clasificacion:'BAJO',
    control:'Si', estado:'Aceptado',
    responsable:'Supervisores',
    fechaLimite:'30/06/2026',
    accion:'Protocolo de rondas en condiciones adversas definido. Equipamiento de lluvia y frío disponible. Decisión de adaptación de ruta a cargo del supervisor en campo.',
    isoRef:'ISO 8.1 / 7.1.4',
    fuente:'Análisis de contexto operativo: riesgo inherente al trabajo a la intemperie · Antecedentes de eventos climáticos extremos en zona Bs. As. (temporadas de lluvias/granizo) · Evaluación de riesgo operativo SPI',
    sistemaFuente:'Análisis Propio', fechaDeteccion:'31/01/2026' },

  // RSG-028 · Sin cambio
  { codigo:'RSG-028', descripcion:'Pérdida de credenciales de acceso al sistema SGC',
    area:'Tecnología / CCTV',
    probabilidad:2, impacto:2, nivel:4, clasificacion:'BAJO',
    control:'Si', estado:'Aceptado',
    responsable:'Infraestructura',
    fechaLimite:'30/06/2026',
    accion:'Política de contraseñas seguras en vigor. Recuperación de acceso en ≤ 1 hora hábil. Doble factor de autenticación para administradores.',
    isoRef:'ISO 7.5 / 7.1.3',
    fuente:'Evaluación de riesgos tecnológicos (análisis de contexto interno) · Incidente menor de acceso previo documentado por Infraestructura · Política de seguridad de sistemas en revisión',
    sistemaFuente:'Análisis Propio', fechaDeteccion:'31/01/2026' },

  // RSG-029 · CERRADO — fix aplicado 08/04/2026
  { codigo:'RSG-029', descripcion:'Duplicidad en registros de asistencia (RESUELTO)',
    area:'Operaciones — Presentismo',
    probabilidad:1, impacto:2, nivel:2, clasificacion:'BAJO',
    control:'Si', estado:'Cerrado',
    responsable:'I. Torres / RRHH',
    fechaLimite:'08/04/2026',
    accion:'✅ CERRADO 08/04/2026 — Validación automática de duplicados implementada. Sincronía entre spi_presentismo y spi_presentismo_v1 corregida. Log de modificaciones con timestamp activo. Verificación cruzada mensual como control permanente.',
    isoRef:'ISO 7.5 / 8.5.1',
    fuente:'App SGC — Detección directa en base de datos: registros duplicados en tablas spi_presentismo y spi_presentismo_v1 · Validación cruzada con planillas RRHH Feb–Mar 2026 · CERRADO 08/04/2026',
    sistemaFuente:'App SGC', fechaDeteccion:'08/04/2026' },

  // RSG-030 · Sin cambio
  { codigo:'RSG-030', descripcion:'Falta de señalización en puntos de ronda QR',
    area:'Operaciones — Rondas',
    probabilidad:2, impacto:2, nivel:4, clasificacion:'BAJO',
    control:'Parcial', estado:'En curso',
    responsable:'Supervisores / Infraestructura',
    fechaLimite:'30/06/2026',
    accion:'Relevamiento de puntos QR sin señalizar. Colocación de cartelería estandarizada. Registro fotográfico de verificación por objetivo.',
    isoRef:'ISO 7.1.3 / 8.5.1',
    fuente:'Recorrida de supervisores en objetivos (informe Ene–Feb 2026): puntos QR sin cartelería identificatoria · Tasa de escaneo < 60% correlacionada parcialmente con falta de señalización',
    sistemaFuente:'Evaluación Campo', fechaDeteccion:'28/02/2026' },

  // ── NUEVOS (detectados en revisión 08/04/2026) ───────────────────────────

  // RSG-031 · NUEVO — tendencia de ausentismo en alza sostenida
  { codigo:'RSG-031', descripcion:'Tendencia de ausentismo en alza sostenida (Ene 10% → Mar 20%)',
    area:'Operaciones — Presentismo',
    probabilidad:4, impacto:4, nivel:16, clasificacion:'CRÍTICO',
    control:'No', estado:'Abierto',
    responsable:'I. Torres / RRHH / Dirección',
    fechaLimite:'30/04/2026',
    accion:'⚠ NUEVO RIESGO CRÍTICO — Ausentismo creció de 9.9% (Ene) a 20.4% (Mar). Causa raíz sin identificar. Acciones: (1) entrevista a personal con mayor ausentismo, (2) verificar condiciones de trabajo por objetivo, (3) cruzar datos con rotación, (4) plan de mejora a Dirección antes del 30/04. Meta: < 10% para auditoría.',
    isoRef:'ISO 7.1.2 / 9.1.1 / 8.5.1',
    fuente:'App SGC — Módulo Presentismo: análisis de tendencia mensual Ene–Mar 2026 · Enero: 9.9% (20/202 reg.) → Febrero: 15.6% (28/180 reg.) → Marzo: 20.4% (16/78 reg. parcial) · Detección automática por umbral',
    sistemaFuente:'App SGC', fechaDeteccion:'08/04/2026' },

  // RSG-032 · NUEVO — datos base históricos sin respaldo documental formal
  { codigo:'RSG-032', descripcion:'Datos operativos históricos sin respaldo documental verificable',
    area:'SGC — Calidad',
    probabilidad:3, impacto:3, nivel:9, clasificacion:'ALTO',
    control:'No', estado:'Abierto',
    responsable:'M. I. Torres / I. Torres',
    fechaLimite:'25/04/2026',
    accion:'NUEVO — La base histórica Ene–Mar 2026 (rondas, presentismo, supervisiones) usada en Dashboard no tiene soporte documental formal. Generar informe consolidado del período con fuentes: planillas RRHH, informes de supervisores, jotform logs. Archivar en Drive antes del 25/04 para evidenciar en auditoría.',
    isoRef:'ISO 7.5.1 / 9.1.1 / 9.3.2',
    fuente:'Revisión de trazabilidad de datos del Dashboard SGC: métricas provienen de base de datos app sin respaldo documental firmado · Brecha Jotform 18 días (26/02–15/03) sin registro alternativo · Detectado en autoevaluación 08/04',
    sistemaFuente:'Auditoría Interna', fechaDeteccion:'08/04/2026' },
];

// ─── Areas únicas ─────────────────────────────────────────────────────────────
const AREAS = [...new Set(RIESGOS.map(r => r.area))].sort();

// ─── Sistema de fuente — iconos y colores ─────────────────────────────────────
const SISTEMA_META: Record<SistemaFuente, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  'App SGC':           { icon: <Monitor size={12}/>,      color:'text-sky-400',     bg:'bg-sky-500/10',     border:'border-sky-500/20' },
  'Dashboard SGC':     { icon: <TrendingUp size={12}/>,   color:'text-blue-400',    bg:'bg-blue-500/10',    border:'border-blue-500/20' },
  'Drive / Doc':       { icon: <FileText size={12}/>,     color:'text-amber-400',   bg:'bg-amber-500/10',   border:'border-amber-500/20' },
  'Informe Supervisor':{ icon: <Users size={12}/>,        color:'text-orange-400',  bg:'bg-orange-500/10',  border:'border-orange-500/20' },
  'Auditoría Interna': { icon: <ClipboardList size={12}/>,color:'text-violet-400',  bg:'bg-violet-500/10',  border:'border-violet-500/20' },
  'RRHH':              { icon: <Users size={12}/>,        color:'text-pink-400',    bg:'bg-pink-500/10',    border:'border-pink-500/20' },
  'Marco Legal':       { icon: <BookOpen size={12}/>,     color:'text-emerald-400', bg:'bg-emerald-500/10', border:'border-emerald-500/20' },
  'Evaluación Campo':  { icon: <Eye size={12}/>,          color:'text-teal-400',    bg:'bg-teal-500/10',    border:'border-teal-500/20' },
  'Análisis Propio':   { icon: <Layers size={12}/>,       color:'text-white/50',    bg:'bg-white/5',        border:'border-white/10' },
};

const SistemaBadge: React.FC<{ sistema: SistemaFuente; small?: boolean }> = ({ sistema, small }) => {
  const m = SISTEMA_META[sistema];
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-semibold',
      m.color, m.bg, m.border,
      small ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
    )}>
      {m.icon}{sistema}
    </span>
  );
};

// ─── Días restantes hasta deadline ───────────────────────────────────────────
function diasRestantes(fecha: string): number {
  const [d, m, a] = fecha.split('/').map(Number);
  const dl = new Date(a, m - 1, d);
  const hoy = new Date(2026, 3, 9); // 09/04/2026
  return Math.ceil((dl.getTime() - hoy.getTime()) / 86400000);
}

function DeadlineBadge({ fecha }: { fecha: string }) {
  const dias = diasRestantes(fecha);
  const isVencido = dias < 0;
  const isUrgente = dias >= 0 && dias <= 7;
  const isProximo = dias > 7 && dias <= 21;
  const cls = isVencido
    ? 'text-red-300 bg-red-600/20 border-red-500/40 animate-pulse'
    : isUrgente
    ? 'text-orange-300 bg-orange-500/15 border-orange-500/30'
    : isProximo
    ? 'text-amber-300 bg-amber-500/10 border-amber-500/20'
    : 'text-white/40 bg-white/5 border-white/10';
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-mono', cls)}>
      <Clock size={9}/>
      {isVencido ? `Vencido ${Math.abs(dias)}d` : dias === 0 ? 'HOY' : `${dias}d`}
    </span>
  );
}

// ─── Color helpers ────────────────────────────────────────────────────────────
const clfColor = (c: string) => {
  if (c === 'CRÍTICO') return { badge:'bg-red-500/15 border-red-500/25 text-red-400',         bar:'bg-red-500',     border:'border-l-red-500/50' };
  if (c === 'ALTO')    return { badge:'bg-orange-500/15 border-orange-500/25 text-orange-400', bar:'bg-orange-500',  border:'border-l-orange-500/40' };
  if (c === 'MEDIO')   return { badge:'bg-amber-500/15 border-amber-500/25 text-amber-400',    bar:'bg-amber-500',   border:'border-l-amber-500/30' };
  return { badge:'bg-emerald-500/15 border-emerald-500/25 text-emerald-400', bar:'bg-emerald-500', border:'border-l-emerald-500/30' };
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

const heatColor = (p: number, i: number): string => {
  const v = p * i;
  if (v >= 17) return 'bg-red-600 text-white';
  if (v >= 10) return 'bg-orange-500 text-white';
  if (v >= 5)  return 'bg-amber-400 text-black';
  return 'bg-emerald-500 text-white';
};

// ─── Sub-components ──────────────────────────────────────────────────────────

// Detail Modal — enriquecido con fuente estructurada
const RiesgoModal: React.FC<{ riesgo: RiesgoItem; onClose: () => void }> = ({ riesgo, onClose }) => {
  const cc = clfColor(riesgo.clasificacion);
  const fuenteBullets = riesgo.fuente.split('·').map(s => s.trim()).filter(Boolean);
  const sm = SISTEMA_META[riesgo.sistemaFuente];
  const dias = diasRestantes(riesgo.fechaLimite);
  const nivelColor = riesgo.clasificacion === 'CRÍTICO' ? 'text-red-400' : riesgo.clasificacion === 'ALTO' ? 'text-orange-400' : riesgo.clasificacion === 'MEDIO' ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#0a0e17] rounded-2xl border border-white/10 w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header con barra de color según clasificación */}
        <div className={cn('h-1 rounded-t-2xl', cc.bar)} />

        <div className="p-6 space-y-5">
          {/* Título */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-md">{riesgo.codigo}</span>
                <span className={cn('text-[10px] px-2.5 py-0.5 rounded-full border font-bold', cc.badge)}>{riesgo.clasificacion}</span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold', estColor(riesgo.estado))}>{riesgo.estado}</span>
                <DeadlineBadge fecha={riesgo.fechaLimite}/>
              </div>
              <h3 className="text-sm font-bold text-white leading-snug">{riesgo.descripcion}</h3>
              <p className="text-[11px] text-white/35 mt-1">{riesgo.area}</p>
            </div>
            <button onClick={onClose} className="text-white/20 hover:text-white/60 transition-colors shrink-0 mt-0.5">
              <X size={17}/>
            </button>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label:'Probabilidad', value: riesgo.probabilidad, sub:'/5' },
              { label:'Impacto',      value: riesgo.impacto,      sub:'/5' },
              { label:'Nivel P×I',   value: riesgo.nivel,         sub:'' },
              { label:'Días restantes', value: Math.abs(dias), sub: dias < 0 ? ' (vencido)' : 'd' },
            ].map(k => (
              <div key={k.label} className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/5">
                <p className="text-[9px] text-white/25 uppercase tracking-wide leading-tight mb-1">{k.label}</p>
                <p className={cn('text-lg font-bold leading-none', k.label === 'Nivel P×I' ? nivelColor : 'text-white')}>
                  {k.value}<span className="text-xs font-normal text-white/30">{k.sub}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              { label:'Control',      node: <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold', ctrlColor(riesgo.control))}>{riesgo.control}</span> },
              { label:'Detectado',    node: <span className="text-xs text-white/70">{riesgo.fechaDeteccion}</span> },
              { label:'Responsable',  node: <span className="text-xs text-white/70">{riesgo.responsable}</span> },
              { label:'Fecha límite', node: <span className="text-xs text-white/70">{riesgo.fechaLimite}</span> },
              { label:'Ref. ISO',     node: <span className="text-xs text-white/50 font-mono">{riesgo.isoRef}</span> },
              { label:'Sistema',      node: <SistemaBadge sistema={riesgo.sistemaFuente}/> },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="text-[10px] text-white/25 w-20 shrink-0">{row.label}</span>
                {row.node}
              </div>
            ))}
          </div>

          {/* Acción */}
          <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-4">
            <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-2">🎯 Acción de Mitigación</p>
            <p className="text-xs text-white/80 leading-relaxed">{riesgo.accion}</p>
          </div>

          {/* Fuente estructurada */}
          <div className="bg-violet-500/6 border border-violet-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] text-violet-400 font-bold uppercase tracking-widest">🗂️ Trazabilidad de la Fuente</p>
              <SistemaBadge sistema={riesgo.sistemaFuente}/>
            </div>
            <ul className="space-y-1.5">
              {fuenteBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={cn('mt-1 w-1.5 h-1.5 rounded-full shrink-0', sm.bg.replace('/10',''), sm.border.replace('border-','bg-').replace('/20',''))}>
                    <span className={cn('block w-1.5 h-1.5 rounded-full', sm.color.replace('text-','bg-').replace('-400','-400'))} />
                  </span>
                  <span className="text-xs text-white/65 leading-snug">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Acciones */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href="https://drive.google.com/file/d/1NE0YLT0BQVlTeWIGrdA7y9BixiwxadNr/view"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-500/10 text-violet-400 text-xs hover:bg-violet-500/20 transition-colors border border-violet-500/20 font-semibold"
            >
              <ExternalLink size={12}/> Ver en Drive
            </a>
            <button
              onClick={onClose}
              className="py-2.5 rounded-xl bg-white/5 text-white/40 text-xs hover:bg-white/10 transition-colors border border-white/5"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tabla Tab — con fuente, sistema badge y deadline countdown
const TablaTab: React.FC<{ riesgos: RiesgoItem[]; total: number; onSelect: (r: RiesgoItem) => void }> = ({ riesgos, total, onSelect }) => (
  <div className="bg-[#0a0e17] rounded-xl border border-white/5 overflow-hidden">
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[#0a0e17] z-10 border-b border-white/5">
          <tr>
            <th className="text-left px-3 py-3 text-white/25 font-semibold uppercase tracking-wide whitespace-nowrap">Cód.</th>
            <th className="text-left px-3 py-3 text-white/25 font-semibold uppercase tracking-wide">Riesgo / Área</th>
            <th className="text-center px-3 py-3 text-white/25 font-semibold uppercase tracking-wide whitespace-nowrap">P×I</th>
            <th className="text-center px-3 py-3 text-white/25 font-semibold uppercase tracking-wide">Clasificación</th>
            <th className="text-center px-3 py-3 text-white/25 font-semibold uppercase tracking-wide whitespace-nowrap">Control</th>
            <th className="text-center px-3 py-3 text-white/25 font-semibold uppercase tracking-wide">Estado</th>
            <th className="text-left px-3 py-3 text-white/25 font-semibold uppercase tracking-wide">Sistema fuente</th>
            <th className="text-left px-3 py-3 text-white/25 font-semibold uppercase tracking-wide">Evidencia primaria</th>
            <th className="text-center px-3 py-3 text-white/25 font-semibold uppercase tracking-wide whitespace-nowrap">Deadline</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {riesgos.map(r => {
            const cc = clfColor(r.clasificacion);
            const isCrit = r.clasificacion === 'CRÍTICO';
            const isAlto = r.clasificacion === 'ALTO';
            const nivelColor = isCrit ? 'text-red-400' : isAlto ? 'text-orange-400' : r.clasificacion === 'MEDIO' ? 'text-amber-400' : 'text-emerald-400';
            const dias = diasRestantes(r.fechaLimite);
            const isVencido = dias < 0;
            const isUrgente = dias >= 0 && dias <= 7;
            const rowBg = isCrit ? 'hover:bg-red-500/[0.04]' : isAlto ? 'hover:bg-orange-500/[0.03]' : 'hover:bg-white/[0.02]';
            return (
              <tr
                key={r.codigo}
                className={cn('transition-colors cursor-pointer group', rowBg,
                  isCrit && 'border-l-2 border-red-500/40',
                  isAlto && 'border-l-2 border-orange-500/25',
                  isVencido && 'bg-red-900/10',
                )}
                onClick={() => onSelect(r)}
              >
                <td className="px-3 py-3 text-white/30 font-mono whitespace-nowrap text-[10px]">{r.codigo}</td>
                <td className="px-3 py-3">
                  <p className="text-white/80 font-medium leading-snug max-w-[220px] group-hover:text-white transition-colors">{r.descripcion}</p>
                  <p className="text-[10px] text-white/20 mt-0.5 max-w-[220px]">{r.area}</p>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={cn('text-sm font-bold tabular-nums', nivelColor)}>{r.nivel}</span>
                  <p className="text-[9px] text-white/20">{r.probabilidad}×{r.impacto}</p>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold', cc.badge)}>
                    {r.clasificacion}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold', ctrlColor(r.control))}>
                    {r.control}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold', estColor(r.estado))}>
                    {r.estado}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <SistemaBadge sistema={r.sistemaFuente} small/>
                  <p className="text-[9px] text-white/20 mt-0.5">{r.fechaDeteccion}</p>
                </td>
                <td className="px-3 py-3 max-w-[200px]">
                  <p className="text-[10px] text-white/50 leading-snug line-clamp-2">{r.fuente.split('·')[0].trim()}</p>
                </td>
                <td className="px-3 py-3 text-center">
                  <DeadlineBadge fecha={r.fechaLimite}/>
                </td>
              </tr>
            );
          })}
          {riesgos.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-12 text-center text-white/20 text-sm">Sin riesgos para este filtro</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <div className="px-4 py-2.5 border-t border-white/5 flex justify-between items-center bg-white/[0.01]">
      <p className="text-[10px] text-white/20">Mostrando <span className="text-white/50 font-semibold">{riesgos.length}</span> de {total} riesgos</p>
      <p className="text-[10px] text-white/15">Haga clic en una fila para ver el detalle completo</p>
    </div>
  </div>
);

// ─── Tab: Trazabilidad de Fuentes ─────────────────────────────────────────────
const FuentesTab: React.FC<{ riesgos: RiesgoItem[]; onSelect: (r: RiesgoItem) => void }> = ({ riesgos, onSelect }) => {
  const sistemas = Object.keys(SISTEMA_META) as SistemaFuente[];
  const activos = sistemas.filter(s => riesgos.some(r => r.sistemaFuente === s));

  return (
    <div className="space-y-4">
      {/* Leyenda */}
      <div className="bg-[#0a0e17] rounded-xl border border-violet-500/15 p-4">
        <div className="flex items-start gap-3">
          <Info size={14} className="text-violet-400 mt-0.5 shrink-0"/>
          <div>
            <p className="text-xs font-semibold text-violet-300 mb-1">Trazabilidad de fuentes de información</p>
            <p className="text-[11px] text-white/40 leading-relaxed">
              Cada riesgo está vinculado al sistema o documento que generó la evidencia. Esta vista agrupa los riesgos por sistema de origen para que puedas verificar, cerrar o actualizar la fuente cuando la situación mejore.
            </p>
          </div>
        </div>
      </div>

      {/* Grupos por sistema */}
      {activos.map(sistema => {
        const grupo = riesgos.filter(r => r.sistemaFuente === sistema).sort((a, b) => b.nivel - a.nivel);
        const sm = SISTEMA_META[sistema];
        const criticos = grupo.filter(r => r.clasificacion === 'CRÍTICO').length;
        const abiertos = grupo.filter(r => r.estado === 'Abierto').length;
        const maxNivel = Math.max(...grupo.map(r => r.nivel));

        return (
          <div key={sistema} className={cn('bg-[#0a0e17] rounded-xl border overflow-hidden', sm.border)}>
            {/* Cabecera de sistema */}
            <div className={cn('flex items-center justify-between px-5 py-3 border-b', sm.bg, sm.border)}>
              <div className="flex items-center gap-2.5">
                <span className={cn('p-1.5 rounded-lg', sm.bg, sm.border, 'border', sm.color)}>{sm.icon}</span>
                <div>
                  <p className={cn('text-sm font-bold', sm.color)}>{sistema}</p>
                  <p className="text-[10px] text-white/30">{grupo.length} riesgo{grupo.length !== 1 ? 's' : ''} vinculados</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {criticos > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 font-bold">{criticos} crítico{criticos !== 1 ? 's' : ''}</span>}
                {abiertos > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/15 text-red-400">{abiertos} abierto{abiertos !== 1 ? 's' : ''}</span>}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">Nivel máx: {maxNivel}</span>
              </div>
            </div>

            {/* Filas de riesgos */}
            <div className="divide-y divide-white/[0.04]">
              {grupo.map(r => {
                const fuentePrincipal = r.fuente.split('·')[0].trim();
                const fuenteExtra = r.fuente.split('·').slice(1).map(s => s.trim()).filter(Boolean);
                const cc = clfColor(r.clasificacion);
                return (
                  <button
                    key={r.codigo}
                    className="w-full text-left px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
                    onClick={() => onSelect(r)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Nivel badge */}
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border', cc.badge)}>
                        {r.nivel}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-white/30">{r.codigo}</span>
                          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-bold', cc.badge)}>{r.clasificacion}</span>
                          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-semibold', estColor(r.estado))}>{r.estado}</span>
                          <DeadlineBadge fecha={r.fechaLimite}/>
                        </div>
                        <p className="text-xs text-white/75 font-medium leading-snug group-hover:text-white transition-colors">{r.descripcion}</p>
                        {/* Evidencia primaria */}
                        <div className={cn('mt-2 rounded-lg px-2.5 py-1.5 border', sm.bg, sm.border)}>
                          <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-0.5', sm.color)}>Evidencia principal</p>
                          <p className="text-[10px] text-white/55 leading-snug">{fuentePrincipal}</p>
                        </div>
                        {fuenteExtra.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {fuenteExtra.map((fe, i) => (
                              <span key={i} className="text-[9px] text-white/30 bg-white/[0.03] border border-white/[0.06] rounded-md px-1.5 py-0.5">
                                {fe.length > 60 ? fe.substring(0, 60) + '…' : fe}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Arrow */}
                      <ChevronRight size={14} className="text-white/15 group-hover:text-white/40 transition-colors shrink-0 mt-2"/>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Mapa de Calor Tab
const CalorTab: React.FC<{ riesgos: RiesgoItem[]; onSelect: (r: RiesgoItem) => void }> = ({ riesgos, onSelect }) => {
  const enCelda = (p: number, i: number) => riesgos.filter(r => r.probabilidad === p && r.impacto === i);

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="bg-[#0d1117] rounded-xl border border-white/5 p-5">
        <p className="text-sm font-semibold text-white mb-4">Mapa de Calor — Probabilidad × Impacto</p>
        <div className="flex gap-2">
          <div className="flex flex-col justify-center items-center gap-0.5 mr-1">
            <p className="text-[9px] text-white/25 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 3 }}>PROBABILIDAD</p>
          </div>
          <div className="flex-1">
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map(p => (
                <div key={p} className="flex gap-1.5 items-center">
                  <span className="text-[10px] text-white/30 w-3 text-right shrink-0">{p}</span>
                  {[1, 2, 3, 4, 5].map(i => {
                    const celda = enCelda(p, i);
                    const hasRisk = celda.length > 0;
                    const hc = heatColor(p, i);
                    return (
                      <button
                        key={i}
                        className={cn(
                          'flex-1 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all h-11',
                          hc,
                          hasRisk ? 'ring-2 ring-white/30 scale-105 shadow-lg cursor-pointer' : 'opacity-20 cursor-default'
                        )}
                        title={celda.map(r => `${r.codigo}: ${r.descripcion}`).join('\n') || `P${p}×I${i} = ${p * i}`}
                        onClick={() => hasRisk && onSelect(celda[0])}
                      >
                        {hasRisk
                          ? <span>{celda.length > 1 ? `×${celda.length}` : celda[0].codigo.replace('RSG-', '')}</span>
                          : <span className="text-[9px] opacity-60">{p * i}</span>
                        }
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5 ml-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex-1 text-center text-[10px] text-white/25">{i}</div>
              ))}
            </div>
            <p className="text-[9px] text-white/25 text-center mt-1 uppercase tracking-widest">Impacto</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { color:'bg-red-600',     label:'CRÍTICO (≥17)' },
            { color:'bg-orange-500',  label:'ALTO (10-16)' },
            { color:'bg-amber-400',   label:'MEDIO (5-9)' },
            { color:'bg-emerald-500', label:'BAJO (1-4)' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded', l.color)} />
              <span className="text-[9px] text-white/35">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking por nivel */}
      <div className="bg-[#0d1117] rounded-xl border border-white/5 p-5">
        <p className="text-sm font-semibold text-white mb-4">Ranking por Nivel de Riesgo</p>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {[...riesgos]
            .sort((a, b) => b.nivel - a.nivel)
            .map(r => {
              const cc = clfColor(r.clasificacion);
              return (
                <button
                  key={r.codigo}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
                  onClick={() => onSelect(r)}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0', cc.badge)}>
                    {r.nivel}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 font-medium leading-snug truncate">{r.descripcion}</p>
                    <p className="text-[10px] text-white/30 mt-0.5 font-mono">{r.codigo} · {r.area.split('—')[0].trim()}</p>
                  </div>
                  <div className={cn('w-1.5 h-8 rounded-full shrink-0', cc.bar)} />
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};

// Por Área Tab
const AreaTab: React.FC<{ riesgos: RiesgoItem[]; onSelect: (r: RiesgoItem) => void }> = ({ riesgos, onSelect }) => {
  const areas = [...new Set(riesgos.map(r => r.area))].sort();

  return (
    <div className="space-y-4">
      {areas.map(area => {
        const grupo = riesgos.filter(r => r.area === area);
        const maxNivel = Math.max(...grupo.map(r => r.nivel));
        const criticos = grupo.filter(r => r.clasificacion === 'CRÍTICO').length;
        const altos = grupo.filter(r => r.clasificacion === 'ALTO').length;
        const abiertos = grupo.filter(r => r.estado === 'Abierto').length;
        const areaCC = clfColor(maxNivel >= 17 ? 'CRÍTICO' : maxNivel >= 10 ? 'ALTO' : maxNivel >= 5 ? 'MEDIO' : 'BAJO');

        return (
          <div key={area} className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className={cn('w-2 h-6 rounded-full shrink-0', areaCC.bar)} />
                <div>
                  <p className="text-xs font-bold text-white/80">{area}</p>
                  <p className="text-[10px] text-white/30">{grupo.length} riesgo{grupo.length > 1 ? 's' : ''} identificado{grupo.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {criticos > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-500/10 border-red-500/20 text-red-400 font-bold">
                    {criticos} crítico{criticos > 1 ? 's' : ''}
                  </span>
                )}
                {altos > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-orange-500/10 border-orange-500/20 text-orange-400 font-semibold">
                    {altos} alto{altos > 1 ? 's' : ''}
                  </span>
                )}
                {abiertos > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-500/10 border-red-500/20 text-red-400">
                    {abiertos} abierto{abiertos > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {grupo.sort((a, b) => b.nivel - a.nivel).map(r => (
                <button
                  key={r.codigo}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors text-left"
                  onClick={() => onSelect(r)}
                >
                  <span className="text-[10px] text-white/30 font-mono w-14 shrink-0">{r.codigo}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 leading-snug">{r.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-xs font-bold tabular-nums', clfColor(r.clasificacion).badge.split(' ').pop())}>
                      {r.nivel}
                    </span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-bold', clfColor(r.clasificacion).badge)}>
                      {r.clasificacion}
                    </span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold', estColor(r.estado))}>
                      {r.estado}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {areas.length === 0 && (
        <div className="bg-[#0d1117] rounded-xl border border-white/5 p-10 text-center text-white/20 text-sm">
          Sin riesgos para este filtro
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MatrizRiesgos: React.FC = () => {
  const [tab, setTab] = useState<TabId>('tabla');
  const [filtro, setFiltro] = useState<'todos' | 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'Abierto' | 'En curso' | 'Cerrado' | 'Aceptado'>('todos');
  const [filtroArea, setFiltroArea] = useState<string>('todos');
  const [filtroSistema, setFiltroSistema] = useState<string>('todos');
  const [selectedRiesgo, setSelectedRiesgo] = useState<RiesgoItem | null>(null);
  const [search, setSearch] = useState('');

  // KPIs
  const total      = RIESGOS.length;
  const criticos   = RIESGOS.filter(r => r.clasificacion === 'CRÍTICO').length;
  const altos      = RIESGOS.filter(r => r.clasificacion === 'ALTO').length;
  const medios     = RIESGOS.filter(r => r.clasificacion === 'MEDIO').length;
  const bajos      = RIESGOS.filter(r => r.clasificacion === 'BAJO').length;
  const conControl = RIESGOS.filter(r => r.control === 'Si').length;
  const parcial    = RIESGOS.filter(r => r.control === 'Parcial').length;
  const sinControl = RIESGOS.filter(r => r.control === 'No').length;
  const pctCtrl    = Math.round(((conControl + parcial * 0.5) / total) * 100);
  const abiertos   = RIESGOS.filter(r => r.estado === 'Abierto').length;
  const enCurso    = RIESGOS.filter(r => r.estado === 'En curso').length;
  const cerrados   = RIESGOS.filter(r => r.estado === 'Cerrado').length;
  const vencidos   = useMemo(() => RIESGOS.filter(r => diasRestantes(r.fechaLimite) < 0 && r.estado !== 'Cerrado').length, []);
  const urgentes   = useMemo(() => RIESGOS.filter(r => { const d = diasRestantes(r.fechaLimite); return d >= 0 && d <= 7 && r.estado !== 'Cerrado'; }).length, []);

  const pctCtrlColor = pctCtrl >= 70 ? 'text-amber-400' : 'text-red-400';
  const pctCtrlBar   = pctCtrl >= 70 ? 'bg-amber-500' : 'bg-red-500';

  // Sistemas presentes en los datos
  const sistemasPresentes = useMemo(() =>
    [...new Set(RIESGOS.map(r => r.sistemaFuente))].sort(), []);

  const visible = useMemo(() => RIESGOS.filter(r => {
    const matchClf     = filtro === 'todos' || r.clasificacion === filtro;
    const matchEst     = filtroEstado === 'todos' || r.estado === filtroEstado;
    const matchArea    = filtroArea === 'todos' || r.area === filtroArea;
    const matchSistema = filtroSistema === 'todos' || r.sistemaFuente === filtroSistema;
    const matchSearch  = !search || [r.descripcion, r.area, r.codigo, r.fuente, r.responsable]
      .some(f => f.toLowerCase().includes(search.toLowerCase()));
    return matchClf && matchEst && matchArea && matchSistema && matchSearch;
  }), [filtro, filtroEstado, filtroArea, filtroSistema, search]);

  const TABS: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'tabla',   label: 'Tabla',       icon: <LayoutGrid size={13}/> },
    { id: 'calor',   label: 'Mapa de Calor', icon: <Flame size={13}/> },
    { id: 'area',    label: 'Por Área',    icon: <MapPin size={13}/> },
    { id: 'fuentes', label: 'Fuentes',     icon: <Database size={13}/>, badge: sistemasPresentes.length },
  ];

  return (
    <div className="p-5 space-y-5 max-w-[1400px] mx-auto">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} className="text-orange-400"/>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Matriz de Análisis de Riesgos — MAR-SGC-001</h1>
            <p className="text-[11px] text-white/35">ISO 9001:2015 Cláusula 6.1 · v3.1 · Rev. 08/04/2026 · Resp: M. I. Torres</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] text-red-300 bg-red-600/20 border border-red-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">⚠ Auditoría ENG — 21 días</span>
              {vencidos > 0 && <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">{vencidos} deadline{vencidos > 1 ? 's' : ''} vencido{vencidos > 1 ? 's' : ''}</span>}
              {urgentes > 0 && <span className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">{urgentes} vence{urgentes > 1 ? 'n' : ''} en ≤7 días</span>}
              <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded-full">{total} riesgos · {sistemasPresentes.length} fuentes</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportMatrizRiesgosXLS(RIESGOS)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-500/25 text-emerald-400 hover:text-emerald-300 text-xs transition-colors font-semibold"
          >
            <Download size={12}/> Exportar Excel
          </button>
          <a
            href="https://drive.google.com/file/d/1NE0YLT0BQVlTeWIGrdA7y9BixiwxadNr/view"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/45 hover:text-white/70 text-xs transition-colors"
          >
            <ExternalLink size={12}/> Drive
          </a>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Controles */}
        <div className={cn('bg-[#0a0e17] rounded-xl border p-3.5 col-span-1', pctCtrl >= 70 ? 'border-amber-500/20' : 'border-red-500/25')}>
          <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">Controles</p>
          <p className={cn('text-2xl font-bold', pctCtrlColor)}>{pctCtrl}%</p>
          <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', pctCtrlBar)} style={{ width:`${pctCtrl}%` }}/>
          </div>
          <p className="text-[9px] text-white/20 mt-1.5">{conControl} impl · {parcial} parc · {sinControl} sin</p>
        </div>

        {/* Críticos */}
        <div className="bg-[#0a0e17] rounded-xl border border-red-500/25 p-3.5">
          <p className="text-[9px] text-red-400/60 uppercase tracking-wider mb-1.5">Críticos</p>
          <p className="text-2xl font-bold text-red-400">{criticos}</p>
          <p className="text-[9px] text-white/20 mt-1">P×I ≥ 16</p>
        </div>

        {/* Altos */}
        <div className="bg-[#0a0e17] rounded-xl border border-orange-500/20 p-3.5">
          <p className="text-[9px] text-orange-400/60 uppercase tracking-wider mb-1.5">Altos</p>
          <p className="text-2xl font-bold text-orange-400">{altos}</p>
          <p className="text-[9px] text-white/20 mt-1">P×I 9–15</p>
        </div>

        {/* Abiertos */}
        <div className="bg-[#0a0e17] rounded-xl border border-red-500/15 p-3.5">
          <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">Abiertos</p>
          <p className="text-2xl font-bold text-white/70">{abiertos}</p>
          <p className="text-[9px] text-white/20 mt-1">{enCurso} en curso · {cerrados} cerr</p>
        </div>

        {/* Deadline urgente */}
        <div className={cn('bg-[#0a0e17] rounded-xl border p-3.5', vencidos > 0 ? 'border-red-500/40' : urgentes > 0 ? 'border-orange-500/25' : 'border-white/5')}>
          <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">Urgencia</p>
          {vencidos > 0
            ? <p className="text-2xl font-bold text-red-400 animate-pulse">{vencidos}</p>
            : <p className="text-2xl font-bold text-orange-400">{urgentes}</p>
          }
          <p className="text-[9px] text-white/20 mt-1">{vencidos > 0 ? 'vencidos' : 'vencen ≤7d'}</p>
        </div>

        {/* Distribución */}
        <div className="bg-[#0a0e17] rounded-xl border border-white/5 p-3.5">
          <p className="text-[9px] text-white/30 uppercase tracking-wider mb-2">Distribución</p>
          <div className="space-y-1.5">
            {[
              { label:'CRÍTICO', count:criticos, bar:'bg-red-500' },
              { label:'ALTO',    count:altos,    bar:'bg-orange-500' },
              { label:'MEDIO',   count:medios,   bar:'bg-amber-400' },
              { label:'BAJO',    count:bajos,    bar:'bg-emerald-500' },
            ].map(item => {
              const w = Math.round((item.count / total) * 100);
              return (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={cn('h-1 rounded-full shrink-0', item.bar)} style={{ width: `${w}%`, minWidth: item.count > 0 ? 3 : 0 }}/>
                  <span className="text-[9px] text-white/25">{item.label} {item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="space-y-2">
        {/* Buscador + selects */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar código, riesgo, área, fuente, responsable..."
              className="w-full bg-[#0a0e17] border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40"
            />
          </div>
          <select
            value={filtroArea}
            onChange={e => setFiltroArea(e.target.value)}
            className="bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/50 focus:outline-none focus:border-violet-500/40 cursor-pointer"
          >
            <option value="todos">Todas las áreas</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={filtroSistema}
            onChange={e => setFiltroSistema(e.target.value)}
            className="bg-[#0a0e17] border border-violet-500/20 rounded-xl px-3 py-2.5 text-xs text-violet-300/70 focus:outline-none focus:border-violet-500/40 cursor-pointer"
          >
            <option value="todos">Todas las fuentes</option>
            {sistemasPresentes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Pills clasificación + estado */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <Filter size={11} className="text-white/15"/>
          {(['todos','CRÍTICO','ALTO','MEDIO','BAJO'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn('px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors',
                filtro === f
                  ? f==='CRÍTICO' ? 'bg-red-600 text-white' : f==='ALTO' ? 'bg-orange-600 text-white'
                    : f==='MEDIO' ? 'bg-amber-600 text-white' : f==='BAJO' ? 'bg-emerald-600 text-white'
                    : 'bg-white/15 text-white'
                  : 'bg-white/5 text-white/35 hover:text-white/60'
              )}>
              {f === 'todos' ? `Todos (${total})` : f}
            </button>
          ))}
          <span className="w-px bg-white/8 h-3 mx-0.5"/>
          {(['todos','Abierto','En curso','Cerrado','Aceptado'] as const).map(f => (
            <button key={f} onClick={() => setFiltroEstado(f)}
              className={cn('px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors',
                filtroEstado === f ? 'bg-white/12 text-white' : 'bg-white/5 text-white/35 hover:text-white/60'
              )}>
              {f}
            </button>
          ))}
          {(filtro !== 'todos' || filtroEstado !== 'todos' || filtroArea !== 'todos' || filtroSistema !== 'todos' || search) && (
            <button
              onClick={() => { setFiltro('todos'); setFiltroEstado('todos'); setFiltroArea('todos'); setFiltroSistema('todos'); setSearch(''); }}
              className="px-2 py-1 rounded-lg text-[10px] text-red-400/60 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-colors border border-red-500/10 ml-1"
            >
              ✕ Limpiar
            </button>
          )}
          {visible.length !== total && (
            <span className="text-[10px] text-violet-400 ml-1">{visible.length} resultado{visible.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-0.5 bg-white/[0.04] p-1 rounded-xl w-fit border border-white/5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all relative',
              tab === t.id ? 'bg-white/10 text-white shadow-sm' : 'text-white/35 hover:text-white/60'
            )}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && (
              <span className={cn(
                'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                tab === t.id ? 'bg-violet-500/30 text-violet-300' : 'bg-white/10 text-white/30'
              )}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      {tab === 'tabla'   && <TablaTab   riesgos={visible} total={total} onSelect={setSelectedRiesgo}/>}
      {tab === 'calor'   && <CalorTab   riesgos={visible} onSelect={setSelectedRiesgo}/>}
      {tab === 'area'    && <AreaTab    riesgos={visible} onSelect={setSelectedRiesgo}/>}
      {tab === 'fuentes' && <FuentesTab riesgos={visible} onSelect={setSelectedRiesgo}/>}

      {/* ── DETAIL MODAL ── */}
      {selectedRiesgo && (
        <RiesgoModal riesgo={selectedRiesgo} onClose={() => setSelectedRiesgo(null)}/>
      )}
    </div>
  );
};

export default MatrizRiesgos;
