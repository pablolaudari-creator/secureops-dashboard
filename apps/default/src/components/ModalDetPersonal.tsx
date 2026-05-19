import React from 'react';
import { X, Users, Building2 } from 'lucide-react';
import type { ModuleId } from '../App';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface RegPres {
  id?: string;
  timestamp?: number;
  nombreApellido?: string;
  nombre?: string;
  nroDocumento?: string;
  estado?: string;
  turno?: string;
  objetivo?: string;
  fecha?: string;
}

// ─── Lee registros desde localStorage ────────────────────────────────────────
// useLocalStorage en Presentismo.tsx guarda con prefijo 'spi_sgc_'
// key 'spi_presentismo_v1' → localStorage key: 'spi_sgc_spi_presentismo_v1'
// appendSpiPresentismo también escribe en 'spi_presentismo' (sin prefijo)
function leerRegistros(): RegPres[] {
  const claves = [
    'spi_sgc_spi_presentismo_v1', // principal
    'spi_presentismo',             // dual-write de appendSpiPresentismo
    'spi_presentismo_v1',          // fallback directo
  ];
  const vistos = new Set<string>();
  const lista: RegPres[] = [];
  for (const k of claves) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) continue;
      for (const r of arr as RegPres[]) {
        const uid = r.id ?? String(r.timestamp ?? Math.random());
        if (!vistos.has(uid)) {
          vistos.add(uid);
          lista.push(r);
        }
      }
    } catch { /* noop */ }
  }
  return lista;
}

// ─── Tipos del modal ─────────────────────────────────────────────────────────

export type FocoModal = 'ausentismo' | 'cobertura' | 'mes' | 'alerta';

interface Props {
  foco: FocoModal;
  onClose: () => void;
  onNavigate: (id: ModuleId) => void;
}

const CFG: Record<FocoModal, { emoji: string; titulo: string; sub: string }> = {
  ausentismo: { emoji: '🔴', titulo: 'Vigiladores con Ausentismo',    sub: 'Ausencias y tardanzas agrupadas por cliente' },
  cobertura:  { emoji: '✅', titulo: 'Vigiladores con Asistencia',     sub: 'Personal presente agrupado por cliente'      },
  mes:        { emoji: '📅', titulo: 'Incidencias — últimos 30 días', sub: 'Ausencias y tardanzas del último mes'         },
  alerta:     { emoji: '⚠️', titulo: 'Alerta Operativa — Afectados',  sub: 'Clientes con mayor impacto de ausentismo'    },
};

interface Entrada {
  nom: string;
  dni: string;
  turno: string;
  fecha: string;
  estado: string;
}

interface Grupo {
  cliente: string;
  ausentes: Entrada[];
  tardanzas: Entrada[];
  presentes: Entrada[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

const ModalDetPersonal: React.FC<Props> = ({ foco, onClose, onNavigate }) => {
  const registros = React.useMemo(() => leerRegistros(), []);

  const getNom = (r: RegPres) =>
    (r.nombreApellido ?? r.nombre ?? 'Sin nombre').trim();

  const items = React.useMemo<RegPres[]>(() => {
    if (foco === 'ausentismo' || foco === 'alerta') {
      return registros.filter(r => r.estado === 'Ausente' || r.estado === 'Tardanza');
    }
    if (foco === 'cobertura') {
      return registros.filter(r => r.estado === 'Presente');
    }
    // mes: últimos 30 días con incidencias
    const corte = Date.now() - 30 * 24 * 3600 * 1000;
    return registros.filter(
      r => (r.timestamp ?? 0) >= corte && (r.estado === 'Ausente' || r.estado === 'Tardanza')
    );
  }, [registros, foco]);

  const grupos = React.useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>();
    for (const r of items) {
      const cli = (r.objetivo ?? 'Sin cliente').trim();
      if (!mapa.has(cli)) {
        mapa.set(cli, { cliente: cli, ausentes: [], tardanzas: [], presentes: [] });
      }
      const g = mapa.get(cli)!;
      const e: Entrada = {
        nom: getNom(r),
        dni: r.nroDocumento ?? '',
        turno: r.turno ?? '—',
        fecha: r.fecha ?? '—',
        estado: r.estado ?? '—',
      };
      if (r.estado === 'Ausente') g.ausentes.push(e);
      else if (r.estado === 'Tardanza') g.tardanzas.push(e);
      else g.presentes.push(e);
    }
    return Array.from(mapa.values()).sort(
      (a, b) =>
        (b.ausentes.length + b.tardanzas.length) -
        (a.ausentes.length + a.tardanzas.length)
    );
  }, [items]);

  const cfg = CFG[foco];
  const totalVigi = new Set(items.map(r => getNom(r))).size;
  const vacio = items.length === 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.13)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 640,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{cfg.titulo}</span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
              {cfg.sub}
            </p>
            {!vacio && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {[
                  `🏢 ${grupos.length} cliente${grupos.length !== 1 ? 's' : ''}`,
                  `👤 ${totalVigi} vigilador${totalVigi !== 1 ? 'es' : ''}`,
                  `📋 ${items.length} registro${items.length !== 1 ? 's' : ''}`,
                ].map(txt => (
                  <span
                    key={txt}
                    style={{
                      fontSize: 10,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 99,
                      padding: '3px 10px',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {txt}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {vacio ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <Users size={24} color="rgba(255,255,255,0.12)" />
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 600, margin: 0 }}>
                Sin registros cargados aún
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.2)',
                  marginTop: 6,
                  lineHeight: 1.6,
                  maxWidth: 280,
                  margin: '8px auto 0',
                }}
              >
                Al cargar registros en el formulario de Presentismo, los vigiladores y sus clientes
                aparecen automáticamente aquí.
              </p>
              <button
                onClick={() => { onClose(); onNavigate('presentismo'); }}
                style={{
                  marginTop: 16,
                  padding: '8px 18px',
                  borderRadius: 10,
                  background: '#0284c7',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Users size={13} /> Ir a cargar registros
              </button>
            </div>
          ) : (
            grupos.map(g => {
              const nInc = g.ausentes.length + g.tardanzas.length;
              const critico = nInc >= 2 && foco !== 'cobertura';
              const entradas =
                foco === 'cobertura' ? g.presentes : [...g.ausentes, ...g.tardanzas];
              const borderCol = critico ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)';
              const headerBg  = critico ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)';

              return (
                <div
                  key={g.cliente}
                  style={{ border: `1px solid ${borderCol}`, borderRadius: 12, overflow: 'hidden' }}
                >
                  {/* fila cliente */}
                  <div
                    style={{
                      background: headerBg,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Building2
                        size={13}
                        color={critico ? '#f87171' : '#38bdf8'}
                        style={{ flexShrink: 0 }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {g.cliente}
                      </span>
                      {critico && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 99,
                            background: 'rgba(239,68,68,0.12)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: '#f87171',
                            flexShrink: 0,
                          }}
                        >
                          IMPACTO ALTO
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {g.ausentes.length > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171',
                          }}
                        >
                          {g.ausentes.length} aus.
                        </span>
                      )}
                      {g.tardanzas.length > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: 'rgba(245,158,11,0.1)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            color: '#fbbf24',
                          }}
                        >
                          {g.tardanzas.length} tard.
                        </span>
                      )}
                      {foco === 'cobertura' && g.presentes.length > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.2)',
                            color: '#34d399',
                          }}
                        >
                          {g.presentes.length} pres.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* filas vigiladores */}
                  {entradas.map((en, i) => {
                    const isA = en.estado === 'Ausente';
                    const isT = en.estado === 'Tardanza';
                    const dot = isA ? '🔴' : isT ? '🟡' : '✅';
                    const col = isA ? '#f87171' : isT ? '#fbbf24' : '#34d399';
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '9px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          borderTop: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <span style={{ fontSize: 14, flexShrink: 0 }}>{dot}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              margin: 0,
                            }}
                          >
                            {en.nom}
                          </p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                            {en.dni ? `DNI ${en.dni} · ` : ''}
                            {en.turno} · {en.fecha}
                          </p>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: col, flexShrink: 0 }}>
                          {en.estado}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            Fuente: formulario de Presentismo SPI
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
            <button
              onClick={() => { onClose(); onNavigate('presentismo'); }}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                background: '#0284c7',
                border: 'none',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Users size={12} /> Ver Presentismo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetPersonal;
