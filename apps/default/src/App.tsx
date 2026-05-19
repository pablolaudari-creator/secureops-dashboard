import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import Dashboard, { type KpiData } from './components/Dashboard';
import RondasQR from './components/RondasQR';
import RondasForm from './components/RondasForm';
import Presentismo from './components/Presentismo';
import MobileLanding from './components/MobileLanding';
import NoConformidades from './components/NoConformidades';
import CCTVAlarmas from './components/CCTVAlarmas';
import Capacitaciones from './components/Capacitaciones';
import Supervision from './components/Supervision';
import SupervisionOperativa from './components/SupervisionOperativa';
import Incidentes from './components/Incidentes';
import MatrizRiesgosPage from './components/MatrizRiesgos';
import DataConfigHub from './components/DataConfigHub';
import ReporteAbril from './components/ReporteAbril';
import AgentChat from './components/AgentChat';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ToastContainer from './components/ToastContainer';
import PrintReport from './components/PrintReport';
import { useToasts, triggerPrint } from './hooks/useAppHooks';

export type ModuleId =
  | 'dashboard'
  | 'rondas'
  | 'rondasform'
  | 'presentismo'
  | 'noconformidades'
  | 'riesgos'
  | 'cctv'
  | 'capacitaciones'
  | 'supervision'
  | 'incidentes'
  | 'supervision-operativa'
  | 'reporte-semanal'
  | 'reporte-abril'
  | 'datos-config'
  | 'drive-sync'
  | 'clientes'
  | 'auditoria';

// Real NC data for print report
const PRINT_NCS = [
  { codigo: 'NC-001', clausula: 'ISO 6.2.1 b)', descripcion: 'Objetivos de calidad sin metas ni medición por proceso', responsable: 'María I. Torres', estado: 'abierta', deadline: '30/04/2026' },
  { codigo: 'NC-002', clausula: 'ISO 9.3.3 a) b) c)', descripcion: 'Revisión por la Dirección sin conclusiones documentadas', responsable: 'María I. Torres', estado: 'abierta', deadline: '30/04/2026' },
  { codigo: 'NC-003', clausula: 'ISO 8.4.2 b)', descripcion: 'Evaluación de proveedores incompleta (2 de 11 evaluados)', responsable: 'María I. Torres', estado: 'abierta', deadline: '30/04/2026' },
  { codigo: 'NC-004', clausula: 'ISO 9.2.1 b)', descripcion: 'Auditorías internas no planificadas en procesos clave', responsable: 'María I. Torres', estado: 'abierta', deadline: '30/04/2026' },
];

// ── Hash-based router ────────────────────────────────────────────────────────
// #rondas  → Formulario Rondas QR
// #presentismo → Formulario Presentismo
// #panel   → Panel SGC completo (desktop)
// (vacío)  → Landing de formularios

type AppRoute = 'landing' | 'rondas' | 'presentismo' | 'supervision' | 'reporte-semanal' | 'panel';

function getRoute(): AppRoute {
  const hash = window.location.hash.replace('#', '').trim().toLowerCase();
  if (hash === 'rondas') return 'rondas';
  if (hash === 'presentismo') return 'presentismo';
  if (hash === 'supervision') return 'supervision';
  if (hash === 'reporte-semanal') return 'reporte-semanal';
  if (hash === 'panel') return 'panel';
  return 'landing';
}

// ── Formulario Shell (para rondas y presentismo solos) ───────────────────────
const FormShell: React.FC<{ title: string; onBack: () => void; children: React.ReactNode }> = ({ title, onBack, children }) => (
  <div className="min-h-screen bg-[#080b10] text-white flex flex-col">
    <div className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-[#0a0c11]/95 backdrop-blur-md border-b border-white/5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-white/50 active:text-white text-sm transition-colors px-2 py-1 rounded-lg active:bg-white/5"
      >
        ← Inicio
      </button>
      <span className="text-white/15">|</span>
      <span className="text-xs text-white/50 font-semibold truncate">{title}</span>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
          <span className="text-white font-bold text-[9px]">SPI</span>
        </div>
      </div>
    </div>
    <div className="flex-1 overflow-auto">
      {children}
    </div>
  </div>
);

// ── MAIN APP ─────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(getRoute);
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [kpisForPrint, setKpisForPrint] = useState<KpiData[]>([]);
  const { toasts, addToast, removeToast } = useToasts();

  // Keep URL hash in sync
  const navigate = useCallback((r: AppRoute) => {
    window.location.hash = r === 'landing' ? '' : r;
    setRoute(r);
  }, []);

  // Listen to browser back/forward
  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Toasts only on panel (no molestar a guardias)
  useEffect(() => {
    if (route !== 'panel') return;
    const daysToAudit = Math.ceil((new Date('2026-04-30').getTime() - Date.now()) / 86400000);
    const daysToEvidence = Math.ceil((new Date('2026-04-15').getTime() - Date.now()) / 86400000);
    const t1 = setTimeout(() => addToast({ type: 'error', title: '⚠ 2ª Auditoría ISO — 30/04/2026', message: `Quedan ${daysToAudit} días. 0/4 NC cerradas.` }), 800);
    const t2 = setTimeout(() => addToast({ type: 'warning', title: 'NC-001: Objetivos sin KPIs', message: 'ISO 6.2.1 b) — Deadline 30/04/2026' }), 1600);
    const t3 = setTimeout(() => addToast({ type: 'warning', title: `Evidencias: ${daysToEvidence}d para el 15/04`, message: 'Preparar paquete evidencias 15/04–28/04' }), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const handlePrint = useCallback(() => triggerPrint(), []);
  const handleKpisLoaded = useCallback((kpis: KpiData[]) => setKpisForPrint(kpis), []);

  const renderPanelModule = () => {
    switch (activeModule) {
      // key={activeModule} fuerza remonte limpio del Dashboard cada vez que
      // se navega a él → re-lee localStorage con datos siempre frescos
      case 'dashboard': return <Dashboard key="dashboard" onNavigate={setActiveModule} searchQuery={searchQuery} onKpisLoaded={handleKpisLoaded} />;
      case 'rondas': return <RondasQR searchQuery={searchQuery} />;
      case 'rondasform': return <RondasForm searchQuery={searchQuery} />;
      case 'presentismo': return <Presentismo searchQuery={searchQuery} />;
      case 'noconformidades': return <NoConformidades searchQuery={searchQuery} />;
      case 'riesgos': return <MatrizRiesgosPage />;
      case 'cctv': return <CCTVAlarmas />;
      case 'capacitaciones': return <Capacitaciones />;
      case 'supervision': return <Supervision />;
      case 'incidentes': return <Incidentes />;
      case 'reporte-abril': return <ReporteAbril />;
      // Hub unificado de Datos & Configuración
      case 'datos-config':
      case 'drive-sync':
      case 'clientes':
      case 'auditoria':
        return <DataConfigHub key="datos-config" onNavigate={setActiveModule} searchQuery={searchQuery} />;
      default: return <Dashboard onNavigate={setActiveModule} searchQuery={searchQuery} onKpisLoaded={handleKpisLoaded} />;
    }
  };

  // ── ROUTE: Formulario Rondas (standalone) ────────────────────────────────
  if (route === 'rondas') {
    return (
      <ThemeProvider>
        <FormShell title="Control de Rondas con QR" onBack={() => navigate('landing')}>
          <RondasForm searchQuery="" />
        </FormShell>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </ThemeProvider>
    );
  }

  // ── ROUTE: Formulario Presentismo (standalone) ────────────────────────────
  if (route === 'presentismo') {
    return (
      <ThemeProvider>
        <FormShell title="Control de Presentismo" onBack={() => navigate('landing')}>
          <Presentismo searchQuery="" />
        </FormShell>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </ThemeProvider>
    );
  }

  // ── ROUTE: Supervisión Operativa (standalone) ─────────────────────────────
  if (route === 'supervision') {
    return (
      <ThemeProvider>
        <SupervisionOperativa onBack={() => navigate('landing')} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </ThemeProvider>
    );
  }

  // ── ROUTE: Landing (inicio del personal) ─────────────────────────────────
  if (route === 'landing') {
    return (
      <ThemeProvider>
        <MobileLanding
          onNavigate={(id) => {
            if (id === 'rondasform') navigate('rondas');
            else if (id === 'presentismo') navigate('presentismo');
            else if (id === 'supervision' || id === 'supervision-operativa') navigate('supervision');
            else if (id === 'reporte-semanal') navigate('reporte-semanal');
            else navigate('panel');
          }}
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </ThemeProvider>
    );
  }

  // ── ROUTE: Panel SGC completo (supervisores / desktop) ───────────────────
  return (
    <ThemeProvider>
      <div className="flex h-screen bg-[#0a0c11] text-white overflow-hidden">
        <Sidebar
          activeModule={activeModule}
          onNavigate={id => { setActiveModule(id); setSearchQuery(''); }}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            activeModule={activeModule}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onPrint={handlePrint}
          />
          <main className="flex-1 overflow-auto">
            {renderPanelModule()}
          </main>
        </div>
        <AgentChat agentId="01KMTFNX629QSR6F4XSE5Y93XV" />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <PrintReport kpis={kpisForPrint} ncs={PRINT_NCS} />
      </div>
    </ThemeProvider>
  );
};

export default App;
