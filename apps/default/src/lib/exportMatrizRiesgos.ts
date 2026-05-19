/**
 * exportMatrizRiesgos.ts
 * Genera un .xls (SpreadsheetML XML) con la Matriz de Riesgos SPI.
 * Compatible con Excel 2010+ y LibreOffice Calc. Sin dependencias.
 *
 * REGLAS CRÍTICAS:
 * 1. NUNCA usar ss:Index en celdas — siempre secuencial.
 * 2. SIEMPRE declarar ss:ExpandedColumnCount y ss:ExpandedRowCount en <Table>.
 * 3. MergeAcross N consume N+1 columnas; NO agregar celdas de relleno después.
 * 4. Cada <Row> debe sumar exactamente el ExpandedColumnCount en celdas.
 */

export interface RiesgoExport {
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
  fuente: string;
}

// ─── Colores ──────────────────────────────────────────────────────────────────
const C = {
  spiBlue:      '#1E3A6E',
  spiMid:       '#2B5295',
  critBg:       '#FFE6E6',
  altoBg:       '#FFF3E0',
  medioBg:      '#FFFDE7',
  bajoBg:       '#E8F5E9',
  critFill:     '#C62828',
  altoFill:     '#E65100',
  medioFill:    '#F9A825',
  bajoFill:     '#2E7D32',
  siGreen:      '#2E7D32',
  parcialAmb:   '#F57F17',
  noRed:        '#C62828',
  abiertoRed:   '#B71C1C',
  encursoBlue:  '#0277BD',
  cerradoGreen: '#1B5E20',
  aceptGray:    '#424242',
  white:        '#FFFFFF',
  offWhite:     '#F5F5F5',
  border:       '#BDBDBD',
  dark:         '#1A1A1A',
  muted:        '#555555',
};

// ─── XML escape ───────────────────────────────────────────────────────────────
function x(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Celda string ─────────────────────────────────────────────────────────────
function cs(val: string, sid: number, across = 0): string {
  const m = across > 0 ? ` ss:MergeAcross="${across}"` : '';
  return `<Cell ss:StyleID="s${sid}"${m}><Data ss:Type="String">${x(val)}</Data></Cell>`;
}

// ─── Celda número ─────────────────────────────────────────────────────────────
function cn(val: number, sid: number): string {
  return `<Cell ss:StyleID="s${sid}"><Data ss:Type="Number">${val}</Data></Cell>`;
}

// ─── Celda vacía ─────────────────────────────────────────────────────────────
function ce(sid: number): string {
  return `<Cell ss:StyleID="s${sid}"/>`;
}

// ─── Style IDs ────────────────────────────────────────────────────────────────
const S = {
  DEF:    1,  // default
  TITLE:  2,  // título SPI
  SUB:    3,  // subtítulo
  META:   4,  // metadata row
  HDR:    5,  // column header
  // row bg (wrap off)
  RCRIT:  6,
  RALTO:  7,
  RMEDIO: 8,
  RBAJO:  9,
  // row bg (wrap on)
  WCRIT:  10,
  WALTO:  11,
  WMEDIO: 12,
  WBAJO:  13,
  // numerics
  NCRIT:  14,
  NALTO:  15,
  NMEDIO: 16,
  NBAJO:  17,
  // clf badges
  BCRIT:  18,
  BALTO:  19,
  BMEDIO: 20,
  BBAJO:  21,
  // control badges
  BSI:    22,
  BPAR:   23,
  BNO:    24,
  // estado badges
  BAB:    25,
  BEC:    26,
  BCER:   27,
  BACE:   28,
  // section / summary
  SECT:   29,
  SMHDR:  30,
  SMLBL:  31,
  SMVAL:  32,
  FOOT:   33,
};

// ─── Style builders ───────────────────────────────────────────────────────────
function f(name: string, sz: number, bold: boolean, color: string) {
  return `<Font ss:FontName="${name}" ss:Size="${sz}"${bold ? ' ss:Bold="1"' : ''} ss:Color="${color}"/>`;
}
function fill(color: string) {
  return `<Interior ss:Color="${color}" ss:Pattern="Solid"/>`;
}
function brd(color: string) {
  return `<Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${color}"/>
    <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${color}"/>
    <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${color}"/>
    <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${color}"/>
  </Borders>`;
}
function al(h: string, v: string, wrap = false) {
  return `<Alignment ss:Horizontal="${h}" ss:Vertical="${v}"${wrap ? ' ss:WrapText="1"' : ''}/>`;
}
function st(id: number, ...parts: string[]) {
  return `<Style ss:ID="s${id}">${parts.join('')}</Style>`;
}

function buildStyles(): string {
  return `<Styles>
${st(S.DEF,   f('Calibri',10,false,C.dark),    fill(C.white),       al('Left','Center'),   brd(C.border))}
${st(S.TITLE, f('Calibri',18,true, C.white),   fill(C.spiBlue),     al('Center','Center'))}
${st(S.SUB,   f('Calibri',11,true, C.white),   fill(C.spiMid),      al('Center','Center'))}
${st(S.META,  f('Calibri', 9,false,C.muted),   fill(C.offWhite),    al('Left','Center'),   brd(C.border))}
${st(S.HDR,   f('Calibri',10,true, C.white),   fill(C.spiBlue),     al('Center','Center'), brd(C.spiBlue))}
${st(S.RCRIT, f('Calibri', 9,false,'#7B0000'), fill(C.critBg),      al('Left','Center'),   brd(C.border))}
${st(S.RALTO, f('Calibri', 9,false,'#7F3000'), fill(C.altoBg),      al('Left','Center'),   brd(C.border))}
${st(S.RMEDIO,f('Calibri', 9,false,'#6B5100'), fill(C.medioBg),     al('Left','Center'),   brd(C.border))}
${st(S.RBAJO, f('Calibri', 9,false,'#1B4B1E'), fill(C.bajoBg),      al('Left','Center'),   brd(C.border))}
${st(S.WCRIT, f('Calibri', 9,false,'#7B0000'), fill(C.critBg),      al('Left','Top',true), brd(C.border))}
${st(S.WALTO, f('Calibri', 9,false,'#7F3000'), fill(C.altoBg),      al('Left','Top',true), brd(C.border))}
${st(S.WMEDIO,f('Calibri', 9,false,'#6B5100'), fill(C.medioBg),     al('Left','Top',true), brd(C.border))}
${st(S.WBAJO, f('Calibri', 9,false,'#1B4B1E'), fill(C.bajoBg),      al('Left','Top',true), brd(C.border))}
${st(S.NCRIT, f('Calibri',11,true, C.critFill),fill(C.critBg),      al('Center','Center'), brd(C.border))}
${st(S.NALTO, f('Calibri',11,true, C.altoFill),fill(C.altoBg),      al('Center','Center'), brd(C.border))}
${st(S.NMEDIO,f('Calibri',11,true,'#8B6500'),  fill(C.medioBg),     al('Center','Center'), brd(C.border))}
${st(S.NBAJO, f('Calibri',11,true, C.bajoFill),fill(C.bajoBg),      al('Center','Center'), brd(C.border))}
${st(S.BCRIT, f('Calibri', 9,true, C.white),   fill(C.critFill),    al('Center','Center'), brd(C.critFill))}
${st(S.BALTO, f('Calibri', 9,true, C.white),   fill(C.altoFill),    al('Center','Center'), brd(C.altoFill))}
${st(S.BMEDIO,f('Calibri', 9,true,'#3E2800'),  fill(C.medioFill),   al('Center','Center'), brd(C.medioFill))}
${st(S.BBAJO, f('Calibri', 9,true, C.white),   fill(C.bajoFill),    al('Center','Center'), brd(C.bajoFill))}
${st(S.BSI,   f('Calibri', 9,true, C.white),   fill(C.siGreen),     al('Center','Center'), brd(C.siGreen))}
${st(S.BPAR,  f('Calibri', 9,true, C.white),   fill(C.parcialAmb),  al('Center','Center'), brd(C.parcialAmb))}
${st(S.BNO,   f('Calibri', 9,true, C.white),   fill(C.noRed),       al('Center','Center'), brd(C.noRed))}
${st(S.BAB,   f('Calibri', 9,true, C.white),   fill(C.abiertoRed),  al('Center','Center'), brd(C.abiertoRed))}
${st(S.BEC,   f('Calibri', 9,true, C.white),   fill(C.encursoBlue), al('Center','Center'), brd(C.encursoBlue))}
${st(S.BCER,  f('Calibri', 9,true, C.white),   fill(C.cerradoGreen),al('Center','Center'), brd(C.cerradoGreen))}
${st(S.BACE,  f('Calibri', 9,true, C.white),   fill(C.aceptGray),   al('Center','Center'), brd(C.aceptGray))}
${st(S.SECT,  f('Calibri',10,true, C.white),   fill(C.spiBlue),     al('Left','Center'),   brd(C.spiBlue))}
${st(S.SMHDR, f('Calibri',10,true, C.white),   fill(C.spiMid),      al('Center','Center'), brd(C.spiMid))}
${st(S.SMLBL, f('Calibri', 9,true, C.dark),    fill(C.offWhite),    al('Left','Center'),   brd(C.border))}
${st(S.SMVAL, f('Calibri',12,true, C.spiBlue), fill(C.white),       al('Center','Center'), brd(C.border))}
${st(S.FOOT,  f('Calibri', 8,false,C.white),   fill(C.spiBlue),     al('Center','Center'))}
</Styles>`;
}

// ─── Selectores de estilo ─────────────────────────────────────────────────────
const bgRow  = (c: string) => c==='CRÍTICO'?S.RCRIT:c==='ALTO'?S.RALTO:c==='MEDIO'?S.RMEDIO:S.RBAJO;
const wRow   = (c: string) => c==='CRÍTICO'?S.WCRIT:c==='ALTO'?S.WALTO:c==='MEDIO'?S.WMEDIO:S.WBAJO;
const numSt  = (c: string) => c==='CRÍTICO'?S.NCRIT:c==='ALTO'?S.NALTO:c==='MEDIO'?S.NMEDIO:S.NBAJO;
const clfSt  = (c: string) => c==='CRÍTICO'?S.BCRIT:c==='ALTO'?S.BALTO:c==='MEDIO'?S.BMEDIO:S.BBAJO;
const ctrlSt = (c: string) => c==='Si'?S.BSI:c==='Parcial'?S.BPAR:S.BNO;
const estSt  = (e: string) => e==='Abierto'?S.BAB:e==='En curso'?S.BEC:e==='Cerrado'?S.BCER:S.BACE;

// ─── Sheet 1: Matriz (14 columnas) ───────────────────────────────────────────
function buildMatrizSheet(riesgos: RiesgoExport[], now: string): string {
  // 14 columnas: A=Código B=Descripción C=Área D=P E=I F=PxI G=Clf H=Ctrl I=Estado J=Resp K=Fecha L=ISO M=Acción N=Fuente
  const NCOLS = 14;

  const dataRows: string[] = [];

  // Fila 1: Título — una sola celda que abarca las 13 columnas
  dataRows.push(
    `<Row ss:Height="48">${cs('SPI S.A.  —  SISTEMA DE GESTIÓN DE CALIDAD', S.TITLE, NCOLS - 1)}</Row>`
  );

  // Fila 2: Subtítulo
  dataRows.push(
    `<Row ss:Height="26">${cs('MATRIZ DE ANÁLISIS DE RIESGOS  ·  MAR-SGC-001  ·  ISO 9001:2015 Cláusula 6.1', S.SUB, NCOLS - 1)}</Row>`
  );

  // Fila 3: Meta — 14 celdas individuales simples
  dataRows.push(`<Row ss:Height="18">
    ${cs('Versión: 3.1',                              S.META)}
    ${cs('Revisión: ' + now,                          S.META)}
    ${cs('Responsable: M. I. Torres / V. Gómez',      S.META)}
    ${cs('Criterio: BAJO 1-3 | MEDIO 4-8 | ALTO 9-15 | CRITICO >=16', S.META)}
    ${cs('Total riesgos: ' + riesgos.length,          S.META)}
    ${cs('Auditoria ENG: 30/04/2026',                 S.META)}
    ${ce(S.META)}
    ${ce(S.META)}
    ${ce(S.META)}
    ${ce(S.META)}
    ${ce(S.META)}
    ${ce(S.META)}
    ${ce(S.META)}
    ${ce(S.META)}
  </Row>`);

  // Fila 4: Separador vacío — 14 celdas
  dataRows.push(`<Row ss:Height="6">
    ${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}
    ${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}
  </Row>`);

  // Fila 5: Cabecera de columnas — 14 celdas
  dataRows.push(`<Row ss:Height="32">
    ${cs('Codigo',                S.HDR)}
    ${cs('Descripcion del Riesgo',S.HDR)}
    ${cs('Area / Proceso',        S.HDR)}
    ${cs('P',                     S.HDR)}
    ${cs('I',                     S.HDR)}
    ${cs('PxI',                   S.HDR)}
    ${cs('Clasificacion',         S.HDR)}
    ${cs('Control',               S.HDR)}
    ${cs('Estado',                S.HDR)}
    ${cs('Responsable',           S.HDR)}
    ${cs('Fecha Limite',          S.HDR)}
    ${cs('Ref. ISO',              S.HDR)}
    ${cs('Accion de Mitigacion',  S.HDR)}
    ${cs('Fuente de Informacion', S.HDR)}
  </Row>`);

  // Grupos
  const groups = [
    { label: 'RIESGOS CRITICOS (PxI >= 16) — Accion inmediata', clf: 'CRÍTICO' },
    { label: 'RIESGOS ALTOS (PxI 9-15) — Plan de accion urgente', clf: 'ALTO'  },
    { label: 'RIESGOS MEDIOS (PxI 4-8) — Seguimiento periodico', clf: 'MEDIO'  },
    { label: 'RIESGOS BAJOS (PxI 1-3) — Aceptados o controlados', clf: 'BAJO'  },
  ];

  for (const g of groups) {
    const grupo = riesgos.filter(r => r.clasificacion === g.clf);
    if (grupo.length === 0) continue;

    // Fila separadora de sección — 13 celdas, la primera con merge 12
    dataRows.push(
      `<Row ss:Height="18">${cs(g.label, S.SECT, NCOLS - 1)}</Row>`
    );

    // Filas de datos — exactamente 13 celdas cada una
    for (const r of grupo) {
      const bg  = bgRow(r.clasificacion);
      const wr  = wRow(r.clasificacion);
      const ns  = numSt(r.clasificacion);
      const clf = clfSt(r.clasificacion);
      const ct  = ctrlSt(r.control);
      const es  = estSt(r.estado);

      dataRows.push(`<Row ss:Height="50">
        ${cs(r.codigo,        bg)}
        ${cs(r.descripcion,   wr)}
        ${cs(r.area,          wr)}
        ${cn(r.probabilidad,  ns)}
        ${cn(r.impacto,       ns)}
        ${cn(r.nivel,         ns)}
        ${cs(r.clasificacion, clf)}
        ${cs(r.control,       ct)}
        ${cs(r.estado,        es)}
        ${cs(r.responsable,   wr)}
        ${cs(r.fechaLimite,   bg)}
        ${cs(r.isoRef,        bg)}
        ${cs(r.accion,        wr)}
        ${cs(r.fuente,        wr)}
      </Row>`);
    }
  }

  // Pie
  dataRows.push(
    `<Row ss:Height="16">${cs('SPI S.A.  —  MAR-SGC-001  ·  Generado: ' + now + '  ·  Confidencial — Uso interno', S.FOOT, NCOLS - 1)}</Row>`
  );

  // Contar filas totales para ExpandedRowCount
  const totalRows = 4 + 1 + 1 + dataRows.length; // aproximación, usamos un número seguro
  const safeRowCount = riesgos.length + 20; // header rows + data rows + section rows + footer

  // Anchos: Código|Descr|Área|P|I|PxI|Clf|Ctrl|Estado|Resp|Fecha|ISO|Acción|Fuente
  const widths = [72, 210, 150, 36, 36, 46, 70, 56, 63, 140, 68, 95, 290, 270];
  const colDefs = widths.map(w => `<Column ss:Width="${w}"/>`).join('\n    ');

  return `<Worksheet ss:Name="Matriz de Riesgos">
  <Table ss:ExpandedColumnCount="${NCOLS}" ss:ExpandedRowCount="${safeRowCount + 50}" x:FullColumns="1" x:FullRows="1">
    ${colDefs}
    ${dataRows.join('\n    ')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
    <PageSetup>
      <Layout x:Orientation="Landscape"/>
      <PageMargins x:Bottom="0.5" x:Left="0.4" x:Right="0.4" x:Top="0.5"/>
    </PageSetup>
    <Print>
      <FitWidth>1</FitWidth>
      <FitHeight>0</FitHeight>
      <ValidPrinterInfo/>
      <Scale>70</Scale>
    </Print>
    <FitToPage/>
    <FreezePanes/>
    <FrozenNoSplit/>
    <SplitHorizontal>5</SplitHorizontal>
    <TopRowBottomPane>5</TopRowBottomPane>
    <ActivePane>2</ActivePane>
  </WorksheetOptions>
</Worksheet>`;
}

// ─── Sheet 2: Resumen ejecutivo (6 columnas) ──────────────────────────────────
function buildResumenSheet(riesgos: RiesgoExport[], now: string): string {
  const NCOLS = 6;
  const total     = riesgos.length;
  const criticos  = riesgos.filter(r => r.clasificacion === 'CRÍTICO').length;
  const altos     = riesgos.filter(r => r.clasificacion === 'ALTO').length;
  const medios    = riesgos.filter(r => r.clasificacion === 'MEDIO').length;
  const bajos     = riesgos.filter(r => r.clasificacion === 'BAJO').length;
  const conCtrl   = riesgos.filter(r => r.control === 'Si').length;
  const parcial   = riesgos.filter(r => r.control === 'Parcial').length;
  const sinCtrl   = riesgos.filter(r => r.control === 'No').length;
  const abiertos  = riesgos.filter(r => r.estado === 'Abierto').length;
  const enCurso   = riesgos.filter(r => r.estado === 'En curso').length;
  const cerrados  = riesgos.filter(r => r.estado === 'Cerrado').length;
  const aceptados = riesgos.filter(r => r.estado === 'Aceptado').length;
  const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;
  const pctCtrl   = total ? Math.round(((conCtrl + parcial * 0.5) / total) * 100) : 0;

  const rows: string[] = [];

  rows.push(`<Row ss:Height="48">${cs('SPI S.A.  —  RESUMEN EJECUTIVO MATRIZ DE RIESGOS', S.TITLE, NCOLS - 1)}</Row>`);
  rows.push(`<Row ss:Height="22">${cs('MAR-SGC-001 v3.1  ·  ' + now + '  ·  ISO 9001:2015', S.SUB, NCOLS - 1)}</Row>`);
  rows.push(`<Row ss:Height="8">${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}</Row>`);

  // Distribución
  rows.push(`<Row ss:Height="22">${cs('DISTRIBUCION POR NIVEL DE RIESGO', S.SMHDR, NCOLS - 1)}</Row>`);
  const kpis: Array<[string, number, number]> = [
    ['CRITICO', criticos, S.BCRIT],
    ['ALTO',    altos,    S.BALTO],
    ['MEDIO',   medios,   S.BMEDIO],
    ['BAJO',    bajos,    S.BBAJO],
  ];
  for (const [lbl, cnt, sid] of kpis) {
    rows.push(`<Row ss:Height="26">
      ${cs(lbl,            sid)}
      ${cs(lbl,            sid)}
      ${cn(cnt,            S.SMVAL)}
      ${cs(pct(cnt) + '%', S.SMLBL)}
      ${cs(pct(cnt) + '% del total', S.SMLBL)}
      ${ce(S.DEF)}
    </Row>`);
  }
  rows.push(`<Row ss:Height="26">
    ${cs('TOTAL', S.SMHDR)}${cs('TOTAL', S.SMHDR)}
    ${cn(total, S.SMVAL)}
    ${cs('riesgos identificados', S.SMLBL)}
    ${cs(now, S.SMLBL)}
    ${ce(S.DEF)}
  </Row>`);

  rows.push(`<Row ss:Height="8">${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}</Row>`);

  // Estado
  rows.push(`<Row ss:Height="22">${cs('ESTADO DE ACCIONES CORRECTIVAS', S.SMHDR, NCOLS - 1)}</Row>`);
  const ests: Array<[string, number, number]> = [
    ['Abierto',  abiertos, S.BAB],
    ['En curso', enCurso,  S.BEC],
    ['Cerrado',  cerrados, S.BCER],
    ['Aceptado', aceptados,S.BACE],
  ];
  for (const [lbl, cnt, sid] of ests) {
    rows.push(`<Row ss:Height="24">
      ${cs(lbl, sid)}${cs(lbl, sid)}
      ${cn(cnt, S.SMVAL)}
      ${cs(pct(cnt) + '%', S.SMLBL)}
      ${ce(S.DEF)}${ce(S.DEF)}
    </Row>`);
  }

  rows.push(`<Row ss:Height="8">${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}</Row>`);

  // Controles
  rows.push(`<Row ss:Height="22">${cs('CUMPLIMIENTO DE CONTROLES — ' + pctCtrl + '%', S.SMHDR, NCOLS - 1)}</Row>`);
  const ctrls: Array<[string, number, number]> = [
    ['Implementado', conCtrl, S.BSI],
    ['Parcial',      parcial, S.BPAR],
    ['Sin control',  sinCtrl, S.BNO],
  ];
  for (const [lbl, cnt, sid] of ctrls) {
    rows.push(`<Row ss:Height="24">
      ${cs(lbl, sid)}${cs(lbl, sid)}
      ${cn(cnt, S.SMVAL)}
      ${cs(pct(cnt) + '%', S.SMLBL)}
      ${ce(S.DEF)}${ce(S.DEF)}
    </Row>`);
  }

  rows.push(`<Row ss:Height="8">${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}</Row>`);

  // Firmas
  rows.push(`<Row ss:Height="22">${cs('FIRMAS DE APROBACION', S.SMHDR, NCOLS - 1)}</Row>`);
  rows.push(`<Row ss:Height="18">
    ${cs('Elaborado por:', S.SMLBL)}${cs('', S.SMLBL)}
    ${cs('Revisado por:', S.SMLBL)}${cs('', S.SMLBL)}
    ${cs('Aprobado por:', S.SMLBL)}${cs('', S.SMLBL)}
  </Row>`);
  rows.push(`<Row ss:Height="40">
    ${cs('M. I. Torres / QHSE', S.SMVAL)}${cs('', S.SMVAL)}
    ${cs('V. Gomez / Supervisor', S.SMVAL)}${cs('', S.SMVAL)}
    ${cs('Direccion / SPI S.A.', S.SMVAL)}${cs('', S.SMVAL)}
  </Row>`);
  rows.push(`<Row ss:Height="40">
    ${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}
  </Row>`);
  rows.push(`<Row ss:Height="16">${cs('SPI S.A.  —  Documento controlado  ·  ' + now + '  ·  Confidencial', S.FOOT, NCOLS - 1)}</Row>`);

  const widths = [120, 120, 90, 120, 120, 120];
  const colDefs = widths.map(w => `<Column ss:Width="${w}"/>`).join('\n    ');

  return `<Worksheet ss:Name="Resumen Ejecutivo">
  <Table ss:ExpandedColumnCount="${NCOLS}" ss:ExpandedRowCount="60" x:FullColumns="1" x:FullRows="1">
    ${colDefs}
    ${rows.join('\n    ')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
    <PageSetup>
      <Layout x:Orientation="Portrait"/>
      <PageMargins x:Bottom="0.5" x:Left="0.5" x:Right="0.5" x:Top="0.5"/>
    </PageSetup>
    <Print><FitWidth>1</FitWidth><FitHeight>1</FitHeight><ValidPrinterInfo/></Print>
    <FitToPage/>
  </WorksheetOptions>
</Worksheet>`;
}

// ─── Sheet 3: Plan de acción (7 columnas) ────────────────────────────────────
function buildPlanSheet(riesgos: RiesgoExport[], now: string): string {
  const NCOLS = 7;
  const urgentes = riesgos
    .filter(r => r.clasificacion === 'CRÍTICO' || r.clasificacion === 'ALTO')
    .sort((a, b) => b.nivel - a.nivel);

  const rows: string[] = [];

  rows.push(`<Row ss:Height="48">${cs('SPI S.A.  —  PLAN DE ACCION CORRECTIVA', S.TITLE, NCOLS - 1)}</Row>`);
  rows.push(`<Row ss:Height="22">${cs('Riesgos Criticos y Altos  ·  MAR-SGC-001 v3.1  ·  ' + now + '  ·  Auditoria ENG: 30/04/2026', S.SUB, NCOLS - 1)}</Row>`);
  rows.push(`<Row ss:Height="6">${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}</Row>`);
  rows.push(`<Row ss:Height="32">
    ${cs('Codigo',              S.HDR)}
    ${cs('Riesgo',              S.HDR)}
    ${cs('Nivel',               S.HDR)}
    ${cs('Responsable',         S.HDR)}
    ${cs('Fecha Limite',        S.HDR)}
    ${cs('Accion Correctiva',   S.HDR)}
    ${cs('Fuente de Informacion', S.HDR)}
  </Row>`);

  for (const r of urgentes) {
    const bg  = bgRow(r.clasificacion);
    const wr  = wRow(r.clasificacion);
    const ns  = numSt(r.clasificacion);
    const clf = clfSt(r.clasificacion);
    rows.push(`<Row ss:Height="58">
      ${cs(r.codigo,      bg)}
      ${cs(r.descripcion, wr)}
      ${cn(r.nivel,       ns)}
      ${cs(r.responsable, wr)}
      ${cs(r.fechaLimite, clf)}
      ${cs(r.accion,      wr)}
      ${cs(r.fuente,      wr)}
    </Row>`);
  }

  rows.push(`<Row ss:Height="6">${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}${ce(S.DEF)}</Row>`);
  rows.push(`<Row ss:Height="16">${cs('SPI S.A.  —  MAR-SGC-001  ·  ' + now + '  ·  Confidencial', S.FOOT, NCOLS - 1)}</Row>`);

  const widths = [75, 230, 50, 155, 75, 290, 260];
  const colDefs = widths.map(w => `<Column ss:Width="${w}"/>`).join('\n    ');

  return `<Worksheet ss:Name="Plan de Accion">
  <Table ss:ExpandedColumnCount="${NCOLS}" ss:ExpandedRowCount="${urgentes.length + 10}" x:FullColumns="1" x:FullRows="1">
    ${colDefs}
    ${rows.join('\n    ')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
    <PageSetup>
      <Layout x:Orientation="Landscape"/>
      <PageMargins x:Bottom="0.5" x:Left="0.4" x:Right="0.4" x:Top="0.5"/>
    </PageSetup>
    <Print><FitWidth>1</FitWidth><FitHeight>0</FitHeight><ValidPrinterInfo/><Scale>75</Scale></Print>
    <FitToPage/>
  </WorksheetOptions>
</Worksheet>`;
}

// ─── Export principal ─────────────────────────────────────────────────────────
export function exportMatrizRiesgosXLS(riesgos: RiesgoExport[]): void {
  const now = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>MAR-SGC-001 Matriz de Riesgos SPI</Title>
    <Author>SPI S.A.</Author>
    <Company>SPI S.A.</Company>
  </DocumentProperties>
  <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
    <WindowHeight>12000</WindowHeight>
    <WindowWidth>24000</WindowWidth>
  </ExcelWorkbook>
  ${buildStyles()}
  ${buildMatrizSheet(riesgos, now)}
  ${buildResumenSheet(riesgos, now)}
  ${buildPlanSheet(riesgos, now)}
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `SPI_MAR-SGC-001_v3.1_${now.replace(/\//g, '-')}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
