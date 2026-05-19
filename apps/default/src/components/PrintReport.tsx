import React, { useState, useEffect } from 'react';

interface KpiData {
  title: string;
  meta: number;
  real: number;
  semaforo: string;
  obs: string;
}

interface NCData {
  codigo: string;
  clausula: string;
  descripcion: string;
  responsable: string;
  estado: string;
  deadline: string;
}

interface PrintReportProps {
  kpis: KpiData[];
  ncs: NCData[];
}

// Lee KPIs directamente desde la API — independiente del Dashboard montado
async function fetchKpisForPrint(): Promise<KpiData[]> {
  try {
    const res = await fetch('/api/taskade/projects/7xwhpRdgsRdwdBhK/nodes');
    const data = await res.json();
    if (data.ok && data.payload?.nodes) {
      return (data.payload.nodes as Array<{ fieldValues: Record<string, unknown> }>)
        .filter(n => n.fieldValues['/text'])
        .map(n => ({
          title: n.fieldValues['/text'] as string,
          meta: (n.fieldValues['/attributes/@kpi02'] as number) || 0,
          real: (n.fieldValues['/attributes/@kpi03'] as number) || 0,
          semaforo: (n.fieldValues['/attributes/@kpi04'] as string) || 'rojo',
          obs: (n.fieldValues['/attributes/@kpi07'] as string) || '',
        }));
    }
  } catch { /* noop */ }
  return [];
}

// Lee datos operativos del localStorage para incluirlos en el reporte
function readOpStats(): { rondas: number; presentes: number; ausentes: number; supervisiones: number; puntajePromedio: number } {
  const keys = [
    'spi_sgc_spi_rondas_form_v1', 'spi_sgc_rondas_v2', 'spi_rondas',
    'spi_sgc_spi_presentismo_v1', 'spi_presentismo',
    'spi_sgc_supervisiones', 'spi_supervisiones',
  ];
  let rondas = 0; let presentes = 0; let ausentes = 0;
  let supCount = 0; let supPuntaje = 0;
  const seenR = new Set<string>(); const seenP = new Set<string>(); const seenS = new Set<string>();

  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw || !raw.startsWith('[')) continue;
      const arr = JSON.parse(raw) as Record<string, unknown>[];
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const s = arr[0];
      const isSup = ('puntaje' in s) && ('supervisor' in s);
      const isPres = !isSup && ['Presente','Ausente','Tardanza'].includes(String(s.estado ?? ''));
      const isRonda = !isSup && !isPres && ('escaneoOk' in s || 'vigiladorNombre' in s || 'clienteObjetivo' in s || 'vigilador' in s);
      for (const r of arr) {
        const uid = String((r as Record<string,unknown>).id ?? (r as Record<string,unknown>).timestamp ?? Math.random());
        if (isRonda && !seenR.has(uid)) { seenR.add(uid); rondas++; }
        else if (isPres && !seenP.has(uid)) {
          seenP.add(uid);
          if ((r as Record<string,unknown>).estado === 'Presente') presentes++;
          else ausentes++;
        } else if (isSup && !seenS.has(uid)) {
          seenS.add(uid); supCount++;
          supPuntaje += Number((r as Record<string,unknown>).puntaje) || 0;
        }
      }
    } catch { /* noop */ }
  }
  return { rondas, presentes, ausentes, supervisiones: supCount, puntajePromedio: supCount > 0 ? Math.round(supPuntaje / supCount) : 0 };
}

const RONDAS_PRINT = [
  { sede: 'Racing Club — Nogoyá 3045', rondas: '46/48', qr: '72%', nc: 1, riesgo: 'Aceptable' },
  { sede: 'Konig La Bernalesa + U720 + U552', rondas: '28/32', qr: '34%', nc: 2, riesgo: 'Alto' },
  { sede: 'ATILRA — Independencia 3332', rondas: '18/20', qr: '60%', nc: 3, riesgo: 'Alto' },
  { sede: 'Consorcio — Coronel Díaz 2241', rondas: '18/24', qr: '21%', nc: 2, riesgo: 'Alto' },
  { sede: 'HPCC — Los Jazmines + Bunker', rondas: '21/36', qr: '58%', nc: 2, riesgo: 'Crítico' },
  { sede: 'Binka M1060 / Avellaneda Espinosa', rondas: '22/28', qr: '40%', nc: 2, riesgo: 'Alto' },
];

const INCIDENTES_PRINT = [
  { codigo: 'INC-PDF-006', fecha: '04/04/2026', sede: 'HPCC Bunker', gravedad: 'Crítica', titulo: 'Cámaras analíticas deshabilitadas por Supervisor Búnker', estado: 'Investigando' },
  { codigo: 'INC-PDF-003', fecha: '04/04/2026', sede: 'Binka M1060', gravedad: 'Crítica', titulo: 'Matafuego n°74854 vacío — frente a Elaboración Graneles', estado: 'Abierto' },
  { codigo: 'INC-PDF-004', fecha: '08/04/2026', sede: 'ATILRA', gravedad: 'Crítica', titulo: 'Matafuegos puestos n°4 y n°7 faltantes', estado: 'Abierto' },
  { codigo: 'INC-PDF-001', fecha: '03/04/2026', sede: 'Avellaneda Espinosa', gravedad: 'Alta', titulo: 'Agujero en pared — Depósito Desechos Sólidos y Líquidos', estado: 'Abierto' },
  { codigo: 'INC-PDF-002', fecha: '04/04/2026', sede: 'Binka M1060', gravedad: 'Alta', titulo: 'Cámara 10 con falla intermitente de video', estado: 'Investigando' },
  { codigo: 'INC-PDF-007', fecha: '06/04/2026', sede: 'HPCC Bunker', gravedad: 'Alta', titulo: 'Zonas 8–12 sin luz perimetral', estado: 'Investigando' },
  { codigo: 'INC-PDF-005', fecha: '07/04/2026', sede: 'ATILRA', gravedad: 'Media', titulo: 'Foco quemado junto al portón vehicular', estado: 'Investigando' },
  { codigo: 'INC-PDF-008', fecha: '15/04/2026', sede: 'Consorcio Díaz', gravedad: 'Media', titulo: 'Estacionamiento inundado + caño con goteras', estado: 'Abierto' },
  { codigo: 'INC-PDF-010', fecha: '07/04/2026', sede: 'ATILRA', gravedad: 'Baja', titulo: 'QR chico faltante en sector Archivos b/c', estado: 'Abierto' },
];

const PrintReport: React.FC<PrintReportProps> = ({ kpis: kpisFromParent, ncs }) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  // FIX: Mantener KPIs propios — no depender del Dashboard montado
  // Si el padre pasa datos úsalos; si no, fetch propio al imprimir
  const [ownKpis, setOwnKpis] = useState<KpiData[]>(kpisFromParent);
  const [opStats, setOpStats] = useState(() => readOpStats());

  // Actualizar cuando el padre reciba nuevos datos
  useEffect(() => {
    if (kpisFromParent.length > 0) setOwnKpis(kpisFromParent);
  }, [kpisFromParent]);

  // Al montar y antes de imprimir: fetch propio de KPIs + lectura de localStorage
  useEffect(() => {
    const prepare = async () => {
      if (ownKpis.length === 0) {
        const fetched = await fetchKpisForPrint();
        if (fetched.length > 0) setOwnKpis(fetched);
      }
      setOpStats(readOpStats());
    };
    prepare();
    // Refrescar antes de cada impresión
    const onBeforePrint = () => { prepare(); };
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('storage', () => setOpStats(readOpStats()));
    return () => window.removeEventListener('beforeprint', onBeforePrint);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = ownKpis.length > 0 ? ownKpis : kpisFromParent;

  return (
    // FIX: Usar className en vez de style inline para que @media print pueda sobreescribir display
    <div id="print-report" className="print-only-hidden">
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body > * { display: none !important; }
          body > #root { display: block !important; }
          .print-only-hidden {
            display: block !important;
            font-family: Arial, sans-serif;
            color: #1a1a1a;
            background: white;
            padding: 1.2cm 1.5cm;
            font-size: 11px;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 99999;
            overflow: visible;
          }
          /* Ocultar todo lo que no es el reporte */
          header, nav, aside, .sidebar, .no-print,
          [class*="sidebar"], [class*="header"], [class*="modal"],
          [class*="toast"], [class*="agent"] { display: none !important; }
          #print-report {
            display: block !important;
            font-family: Arial, sans-serif;
            color: #1a1a1a;
            background: white;
            padding: 1.2cm 1.5cm;
            font-size: 11px;
          }
          .pr-header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #1e3a5f; padding-bottom: 14px; margin-bottom: 18px; }
          .pr-logo { font-size: 22px; font-weight: 900; color: #1e3a5f; letter-spacing: -1px; }
          .pr-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
          .pr-meta { text-align: right; font-size: 10px; color: #64748b; }
          .pr-meta strong { color: #1e3a5f; font-size: 12px; display: block; margin-bottom: 2px; }
          .pr-section { margin-bottom: 18px; page-break-inside: avoid; }
          .pr-section h2 { font-size: 12px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; margin-top: 0; }
          .pr-table { width: 100%; border-collapse: collapse; font-size: 10px; }
          .pr-table th { background: #f1f5f9; text-align: left; padding: 6px 9px; font-weight: 600; color: #475569; border: 1px solid #e2e8f0; }
          .pr-table td { padding: 6px 9px; border: 1px solid #e2e8f0; vertical-align: top; }
          .pr-table tr:nth-child(even) td { background: #f8fafc; }
          .pr-table td.center { text-align: center; }
          .badge { padding: 1px 7px; border-radius: 99px; font-size: 9px; font-weight: 700; white-space: nowrap; }
          .badge-verde    { background: #dcfce7; color: #15803d; }
          .badge-amarillo { background: #fef9c3; color: #a16207; }
          .badge-rojo     { background: #fee2e2; color: #dc2626; }
          .badge-crítica  { background: #fee2e2; color: #dc2626; }
          .badge-critica  { background: #fee2e2; color: #dc2626; }
          .badge-crítico  { background: #fee2e2; color: #dc2626; }
          .badge-critico  { background: #fee2e2; color: #dc2626; }
          .badge-alta     { background: #ffedd5; color: #c2410c; }
          .badge-alto     { background: #ffedd5; color: #c2410c; }
          .badge-media    { background: #fef9c3; color: #a16207; }
          .badge-baja     { background: #dcfce7; color: #15803d; }
          .badge-abierta  { background: #fee2e2; color: #dc2626; }
          .badge-abierto  { background: #fee2e2; color: #dc2626; }
          .badge-investigando { background: #fef9c3; color: #a16207; }
          .badge-aceptable { background: #dcfce7; color: #15803d; }
          .pr-bar-wrap { width: 60px; height: 5px; background: #e2e8f0; border-radius: 3px; display: inline-block; overflow: hidden; vertical-align: middle; }
          .pr-bar { height: 100%; border-radius: 3px; }
          .pr-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
          .pr-kpi-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
          .kpi-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
          .kpi-value { font-size: 20px; font-weight: 800; color: #1e3a5f; margin: 2px 0; }
          .kpi-sub { font-size: 9px; color: #94a3b8; }
          .pr-alertas { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; }
          .pr-alertas ul, .pr-ok ul { margin: 4px 0 0 0; padding-left: 14px; }
          .pr-alertas li { font-size: 10px; color: #7f1d1d; margin-bottom: 2px; }
          .pr-ok { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; }
          .pr-ok li { font-size: 10px; color: #166534; margin-bottom: 2px; }
          .pr-footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
          .totals-row td { font-weight: 700; background: #f1f5f9 !important; }
        }
      `}</style>

      {/* ── ENCABEZADO ── */}
      <div className="pr-header">
        <div>
          <div className="pr-logo">SPI S.A.</div>
          <div className="pr-sub">Sistema de Gestión de Calidad — ISO 9001:2015</div>
        </div>
        <div className="pr-meta">
          <strong>REPORTE OPERATIVO — ABRIL 2026</strong>
          <div>Período: 03–15/04/2026 · 6 sedes · 13 efectivos</div>
          <div>Impresión: {dateStr}</div>
          <div>Responsable: V. Gómez · Auditor: ENG · SGC: I. Torres</div>
        </div>
      </div>

      {/* ── KPI RESUMEN — datos reales del localStorage + históricos ── */}
      <div className="pr-kpi-grid">
        <div className="pr-kpi-card">
          <div className="kpi-label">Rondas Registradas</div>
          <div className="kpi-value">{588 + opStats.rondas}</div>
          <div className="kpi-sub">{opStats.rondas > 0 ? `+${opStats.rondas} cargadas en app` : 'Base histórica Ene–Abr'}</div>
        </div>
        <div className="pr-kpi-card">
          <div className="kpi-label">Supervisiones</div>
          <div className="kpi-value" style={{ color: opStats.puntajePromedio >= 75 ? '#15803d' : '#dc2626' }}>
            {opStats.puntajePromedio > 0 ? `${opStats.puntajePromedio}%` : '—'}
          </div>
          <div className="kpi-sub">{opStats.supervisiones > 0 ? `${opStats.supervisiones} registros en app` : 'Sin datos cargados'}</div>
        </div>
        <div className="pr-kpi-card">
          <div className="kpi-label">Personal Presente</div>
          <div className="kpi-value" style={{ color: '#15803d' }}>{opStats.presentes > 0 ? opStats.presentes : '—'}</div>
          <div className="kpi-sub">{opStats.presentes + opStats.ausentes > 0 ? `${opStats.ausentes} ausencias registradas` : 'Sin registros de presentismo'}</div>
        </div>
        <div className="pr-kpi-card">
          <div className="kpi-label">Incidentes Críticos</div>
          <div className="kpi-value" style={{ color: '#dc2626' }}>3</div>
          <div className="kpi-sub">7 abiertos de 9 total</div>
        </div>
      </div>

      {/* ── ALERTAS ── */}
      <div className="pr-alertas">
        <strong style={{ color: '#dc2626', fontSize: 11 }}>🚨 Alertas Críticas del Período</strong>
        <ul>
          <li>HPCC Bunker: cámaras analíticas deshabilitadas por personal del cliente (04/04) — sistema sin cobertura perimetral. Requiere investigación y protocolo preventivo.</li>
          <li>ATILRA: matafuegos puestos n°4 y n°7 faltantes + Binka: matafuego n°74854 vacío — riesgo de incendio sin capacidad de respuesta. Reposición inmediata.</li>
          <li>Tasa QR muy baja: Consorcio Díaz 21% · Konig 34% — vigiladores no escanean en cada ronda. Capacitación urgente.</li>
          <li>HPCC zonas 8–12 sin luz perimetral — visibilidad nocturna comprometida en 5 zonas del perímetro sur.</li>
        </ul>
      </div>

      {/* ── RONDAS ── */}
      <div className="pr-section">
        <h2>Control de Rondas por Sede — Abril 2026 (03–15/04)</h2>
        <table className="pr-table">
          <thead>
            <tr>
              <th>Sede / Objetivo</th>
              <th className="center">Rondas Real/Plan</th>
              <th className="center">Tasa QR</th>
              <th className="center">NC Activas</th>
              <th className="center">Nivel de Riesgo</th>
            </tr>
          </thead>
          <tbody>
            {RONDAS_PRINT.map((r, i) => (
              <tr key={i}>
                <td>{r.sede}</td>
                <td className="center">{r.rondas}</td>
                <td className="center"><strong>{r.qr}</strong></td>
                <td className="center">{r.nc}</td>
                <td className="center">
                  <span className={`badge badge-${r.riesgo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{r.riesgo}</span>
                </td>
              </tr>
            ))}
            <tr className="totals-row">
              <td>TOTALES / PROMEDIO</td>
              <td className="center">153/188 (81%)</td>
              <td className="center">47% prom.</td>
              <td className="center">12</td>
              <td className="center">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── INCIDENTES ── */}
      <div className="pr-section">
        <h2>Incidentes y Hallazgos — Abril 2026</h2>
        <table className="pr-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha</th>
              <th>Sede</th>
              <th>Descripción del Hallazgo</th>
              <th className="center">Gravedad</th>
              <th className="center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {INCIDENTES_PRINT.map((inc, i) => (
              <tr key={i}>
                <td><strong>{inc.codigo}</strong></td>
                <td style={{ whiteSpace: 'nowrap' }}>{inc.fecha}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{inc.sede}</td>
                <td>{inc.titulo}</td>
                <td className="center">
                  <span className={`badge badge-${inc.gravedad.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{inc.gravedad}</span>
                </td>
                <td className="center">
                  <span className={`badge badge-${inc.estado.toLowerCase()}`}>{inc.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── NC SGC ── */}
      {ncs.length > 0 && (
        <div className="pr-section">
          <h2>No Conformidades SGC — Auditoría ISO 9001:2015</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cláusula ISO</th>
                <th>Descripción</th>
                <th>Responsable</th>
                <th>Deadline</th>
                <th className="center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ncs.map((nc, i) => (
                <tr key={i}>
                  <td><strong>{nc.codigo}</strong></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{nc.clausula}</td>
                  <td>{nc.descripcion}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{nc.responsable}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{nc.deadline}</td>
                  <td className="center"><span className={`badge badge-${nc.estado.toLowerCase()}`}>{nc.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── KPIs SGC ── */}
      {kpis.length > 0 && (
        <div className="pr-section">
          <h2>Semáforo de Cumplimiento — Objetivos SGC</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Objetivo</th>
                <th className="center">Meta</th>
                <th className="center">Real</th>
                <th className="center">Progreso</th>
                <th className="center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((kpi, i) => {
                const pct = kpi.meta > 0 ? Math.round((kpi.real / kpi.meta) * 100) : 0;
                const color = kpi.semaforo === 'verde' ? '#22c55e' : kpi.semaforo === 'amarillo' ? '#eab308' : '#ef4444';
                return (
                  <tr key={i}>
                    <td>{kpi.title}</td>
                    <td className="center">{kpi.meta}%</td>
                    <td className="center">{kpi.real.toFixed(1)}%</td>
                    <td className="center">
                      <div className="pr-bar-wrap">
                        <div className="pr-bar" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                      </div>
                      <span style={{ fontSize: 9, marginLeft: 4 }}>{pct}%</span>
                    </td>
                    <td className="center">
                      <span className={`badge badge-${kpi.semaforo}`}>
                        {kpi.semaforo === 'verde' ? '🟢 Verde' : kpi.semaforo === 'amarillo' ? '🟡 Alerta' : '🔴 Crítico'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ASPECTOS POSITIVOS ── */}
      <div className="pr-ok">
        <strong style={{ color: '#15803d', fontSize: 11 }}>✅ Aspectos Positivos del Período</strong>
        <ul>
          <li>Racing Club: 98% cumplimiento de rondas — equipo estable (Pablo Otero, Luis Viera, Nora Torres). Sin NC activas en el período.</li>
          <li>Highland Park (Gonzalo Conde, leg. 229): cámaras en funcionamiento confirmado, sin novedades.</li>
          <li>HPCC: cámaras restablecidas a las 06:18hs tras incidente — respuesta oportuna del equipo SPI.</li>
          <li>Consorcio Díaz 15/04: doble recorrido por lluvias ejecutado — protocolo de respuesta ante eventos climáticos funcionando.</li>
        </ul>
      </div>

      <div className="pr-footer">
        Generado por SPI SGC Dashboard · {dateStr} · ISO 9001:2015 · Confidencial — solo para uso interno
        <br />Fuente: PDFs "Control de Rondas Compilado" (20–23/03/2026) y "Control de Rondas Abril" (03–15/04/2026) · 13 vigiladores activos · 6 sedes
      </div>
    </div>
  );
};

export default PrintReport;
