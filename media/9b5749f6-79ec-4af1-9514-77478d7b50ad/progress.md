# SPI SGC App — Enhancement Task

## Status: COMPLETE ✅ — Last update: 02/04/2026
### Formularios imprimibles subidos a Google Drive (02/04/2026 — sesión 5):
- FOR-OPS-001 Control de Rondas QR — ID: 1Mr73KfBRZzW1Ts6XvFBDD5qevAeDBpeJ
- FOR-OPS-002 Control de Presentismo — ID: 1dTuUL96PczrVxvgAS3Li-ISineswqx3G
- FOR-OPS-003 Reporte de Incidentes — ID: 1BABBCf9Tj0b9W2ZsUorZ_OSlslsFuYrn
- Todos en carpeta Drive ID: 1FfIxgnsUtH8deS9pr7nN8OVZSyjo7835 (Instructivos SPI)
- Formato profesional SPI: encabezado ISO 9001:2015, código/versión/fecha, 6-9 secciones, checklist, firmas, uso exclusivo supervisión/QHSE

### Recent additions (02/04/2026 — sesión 4):
- ClientesObjetivos.tsx — módulo completo con 47 clientes del Drive SPI, búsqueda/filtro, edición inline, formulario nuevo cliente, registro automático en Taskade project vjNACQB6Yk4rtVmF
- Proyecto Taskade "SPI — Clientes & Objetivos" (vjNACQB6Yk4rtVmF) con 47 clientes pre-cargados y 10 custom fields
- Workflow automático "SPI — Nuevo Cliente → Registro Automático BD" (01KN807YFDEQE0QWCS75FTSEW7)
- RondasForm.tsx: OBJETIVOS_RONDA → getClientesObjetivos() dinámico
- Presentismo.tsx: OBJETIVOS → getClientesObjetivos() dinámico
- SupervisionOperativa.tsx: InputField texto libre → SelectField dinámico con getClientesObjetivos()
- Sidebar: nuevo item "Clientes & Objetivos" con Building2 icon en grupo Datos & Configuración
- getClientesObjetivos() exported from ClientesObjetivos.tsx — lee localStorage spi_clientes_objetivos con fallback a lista base de 47 clientes

### Recent additions:
- SupervisionOperativa.tsx — full checklist form with auto-score + localStorage
- MobileLanding.tsx — 3 form cards + QR section (ASCII SVG patterns)
- Dashboard.tsx — 4 operational KPI cards + last-5-supervisiones table (reads localStorage)
- RondasForm.tsx — email notification modal after save (3 fixed recipients, mailto, confirm dialog)
### Auditoría de fórmulas y semáforos 02/04/2026 (sesión 3):

**Bugs corregidos en Dashboard.tsx computeOpKpis():**
1. Fórmula Cobertura ROTA: era presentes/(diasMes×3) → imposible alcanzar. CORRECCIÓN: presentes/total_registros_mes×100. Semáforo: ≥90 verde, ≥75 amarillo, <75 rojo.
2. Presentismo leía key "presentismo" (no existía). CORRECCIÓN: nueva función readPresentismoAll() lee ['spi_presentismo', 'spi_sgc_spi_presentismo_v1', 'spi_presentismo_v1'] con dedup por id.
3. Supervisiones leía 'spi_sgc_supervisiones' primero. CORRECCIÓN: readSupsAll() lee ['spi_supervisiones', 'spi_sgc_supervisiones', 'supervisiones'] con dedup.
4. appendSpiSupervision no guardaba clienteObjetivo/hora/satisfaccionCliente. CORRECCIÓN: ahora guarda campos completos.
5. Tailwind class dinámica bg-${color}-500 en Ausentismo no funciona (purge). CORRECCIÓN: clases explícitas con IIFE.
6. Cumplimiento Operativo: icon color stuck en amber para <60%. CORRECCIÓN: IIFE con todos los niveles (emerald/sky/amber/red).
7. Refresh on focus: añadido visibilitychange listener + storage event listener.
8. Storage events: appendSpiPresentismo, appendSpiRonda, appendSpiSupervision ahora disparan window.dispatchEvent(StorageEvent) para notificar Dashboard en mismo tab.
9. Presentismo handleSave: form reset y tab change para Ausente/Tardanza ahora ocurre dentro del setTimeout y el modal QHSE se muestra después. Bug de flujo reparado.
10. Botón ↻ Refrescar manual en header de sección Operaciones.

### 3 mejoras adicionales 02/04/2026 (sesión 2):
- Dashboard.tsx: NovedadesTable sub-component added below Últimas Supervisiones. Reads spi_novedades every 15s. Shows Fecha|Objetivo|Ítem|Supervisor|Prioridad|Estado with colored badges. Filter pills Todas/Abiertas/Cerradas. "Cerrar" button writes back to localStorage. Imported NovedadOperativa type and Check icon.
- RondasForm.tsx: openQhseRondaMailto updated with exact spec subject "[SPI] Nueva Ronda Registrada — {objetivo} — {fecha}" and body "Se registró una nueva ronda...". Email modal redesigned: QHSE button is now primary (amber), supervisors secondary, plain save tertiary.
- SupervisionOperativa.tsx: openQhseSupervisionMailto updated with exact spec subject "[SPI] Supervisión Operativa — {resultado} — {objetivo} — {fecha}" and body. QHSE button now always visible on success screen. Color: red if <60%, orange if 60-74%, emerald if ≥75%. Label changes: "⚠️ Notificar QHSE — Supervisión Crítica/Regular/informativa".

### Auditoría y reparación completa 02/04/2026:

**OBJETIVO 1 — Flujo de datos reparado:**
- RondasForm: guardaba en `spi_rondas_form_v1` (via spi_sgc_ hook) — ahora dual-write: mantiene spi_sgc_spi_rondas_form_v1 + escribe en `spi_rondas` (raw, simplified structure para Dashboard)
- Presentismo: guardaba en `spi_presentismo_v1` sin campo estado/turno — ahora dual-write a `spi_presentismo` con { estado: Presente/Ausente/Tardanza, turno }. Form tiene selector de turno + botones de estado.
- SupervisionOperativa: guardaba en `spi_sgc_supervisiones` (hook prefix) — ahora dual-write a `spi_supervisiones` (raw)
- Dashboard readLS(): ahora lee raw key primero, fallback a spi_sgc_ prefix. Keys corregidas: spi_rondas, spi_presentismo (ya estaba), spi_supervisiones
- Supervisiones críticas: ahora cuenta puntaje < 60 OR resultado='CRÍTICO'

**OBJETIVO 2 — Dashboard tiempo real:**
- lastUpdated state; 30s setInterval actualiza opKpis + lastUpdated
- Header "Operaciones" muestra dot verde pulsante + "Act. HH:MM"

**OBJETIVO 3 — Emails QHSE (plaudari.qhse@spiseguridad.com.ar, CC: vgomez, itorres, wrodriguez):**
- RondasForm: modal post-save tiene 3 botones: Notificar supervisores+QHSE / Solo QHSE / Solo guardar. openQhseRondaMailto()
- Presentismo: al guardar Ausente/Tardanza → modal QHSE. openQhseAusenciaMailto()
- SupervisionOperativa: puntaje<75 → botón "Notificar QHSE — Resultado X" en pantalla success. openQhseSupervisionMailto()
- Incidentes (novedades): botón Mail "QHSE" en cada fila de novedades operativas. openQhseNovedadMailto()

### 3 mejoras 01/04/2026:
- SupervisionOperativa.tsx: NovedadOperativa type exported; handleSave generates spi_novedades entries for each "No cumple" item; success screen shows summary with count and list
- Dashboard.tsx: OperationalKpis extended with ausentismo fields; computeOpKpis reads spi_presentismo (both raw and prefixed); new 5th KPI card "Ausentismo" with traffic light colors (<5% green, 5-15% yellow, >15% red); grid changed to 5 cols
- Incidentes.tsx: imports NovedadOperativa type; loadNovedades reads spi_novedades; full table with Fecha|Objetivo|Ítem|Supervisor|Estado|Prioridad; filter Todas/Abierta/Cerrada; cerrarNovedad button per row

### Hash-router fix 30/03/2026:
- Replaced broken isMobile detection (was reading iframe width, not real device)
- Implemented hash-based routing: #rondas, #presentismo, #panel, (vacío)=landing
- Landing is now the default for ALL users — works on any device
- FormShell wrapper for standalone form pages with back button
- MobileLanding fully rewritten: touch-optimized, live clock, online status

### New modules added 30/03/2026:
- RondasForm.tsx — Formulario Rondas QR (exact PDF fields: fecha, turno, nro ronda, cliente, dirección, criticidad, vigilador, legajo, supervisor, código QR, punto, sector, horarios, escaneo OK, novedad, ítems, observaciones, firma digital, email supervisor → Controlderondas@spi.com.ar)
- Presentismo.tsx — Formulario Control Presentismo (exact PDF fields: nombre/apellido, DNI, foto, fecha, hora ingreso/egreso, objetivo, observaciones, firma digital, email → itorres@spiseguridad.com.ar)
- Sidebar updated with group separator "Formularios Operativos"
- App.tsx updated with new module types and routes

## Plan:
1. [ ] Create shared hooks (useLocalStorage, useToast, useCountdown, useClock)
2. [ ] Create Toast component
3. [ ] Create PrintStyles component + export logic
4. [ ] Update App.tsx (search state, toast, print)
5. [ ] Update Header.tsx (clock, countdown, search, online status, print button)
6. [ ] Update Dashboard.tsx (NC real data, audit alert, ISO points, sparklines, animations, modal, auto-refresh)
7. [ ] Update NoConformidades.tsx (real NC data from audit 07/01/2026, revisiones SGC tab)
8. [ ] Update RondasQR.tsx (localStorage persistence, inline form)
9. [ ] Update index.css (print styles, keyframe animations)

## Real NC Data (07/01/2026 audit):
- NC-001: Objetivos sin metas — ISO 6.2.1b — Resp: María I. Torres — 30/04/2026
- NC-002: Rev Dirección sin conclusiones — ISO 9.3.3 — Resp: María I. Torres — 30/04/2026  
- NC-003: Proveedores evaluación incompleta — ISO 8.4.2b — Resp: María I. Torres — 30/04/2026
- NC-004: Auditorías internas no planificadas — ISO 9.2.1b — Resp: María I. Torres — 30/04/2026
- All 4 OPEN, 0 closed, deadline 2ª auditoría: 30/04/2026

## Key Notes:
- DEADLINE_NC = 30/04/2026 (2ª auditoría seguimiento)
- DEADLINE_GLOBAL = 15/04/2026 (evidencias)
- Use localStorage prefix "spi_sgc_"
- No external heavy libs
- Keep dark theme, semáforo palette
