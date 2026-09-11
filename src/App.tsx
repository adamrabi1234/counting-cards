import { Component, lazy, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { BookOpen, Brain, ChevronRight, CircleAlert, Home, Settings2, Spade, TrendingUp } from 'lucide-react';
import { useApp } from './data/store';
import { BLACKJACK_ROUTES, MEMORY_ROUTES, NAMES, pathFor, routeFromPath, type Route } from './navigation';
import { Button } from './components/ui';
import HomeScreen from './screens/HomeScreen';
const PaoScreen = lazy(() => import('./screens/PaoScreen'));
const MemoryScreen = lazy(() => import('./screens/MemoryScreen'));
const CountingScreen = lazy(() => import('./screens/CountingScreen'));
const StrategyScreen = lazy(() => import('./screens/StrategyScreen'));
const TableScreen = lazy(() => import('./screens/TableScreen'));
const ProgressScreen = lazy(() => import('./screens/ProgressScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
let initialized = false;
export default function App() {
  const store = useApp(), [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));
  useEffect(() => { if (!initialized) { initialized = true; void store.initialize(); } }, []);
  useEffect(() => { const pop = () => setRoute(routeFromPath(window.location.pathname)); window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop); }, []);
  useEffect(() => { document.title = `${NAMES[route]} · Counting Cards`; window.scrollTo({ top: 0, behavior: 'instant' }); }, [route]);
  function navigate(next: Route) { if (next !== route) { window.history.pushState({}, '', pathFor(next)); setRoute(next); } }
  const home = () => navigate('home');
  if (!store.ready) return <div className="app-loading"><Spade size={35} /><h1>Counting Cards</h1><p>Otevírám tvůj tréninkový klub…</p></div>;
  const focused = route === 'table';
  return <div className={`app-shell ${focused ? 'focused' : ''}`} data-motion={store.data.settings.motion ? 'on' : 'off'}><a href="#main" className="skip-link">Přejít na obsah</a>{!focused && <aside className="sidebar"><button type="button" className="brand" onClick={home}><Spade size={24} /><span>Counting Cards<small>TRÉNINKOVÝ KLUB</small></span></button><nav aria-label="Hlavní navigace"><NavLink route="home" current={route} navigate={navigate} icon={<Home size={18} />} /><div className="nav-section-label"><Brain size={16} /> Paměť</div>{MEMORY_ROUTES.map(r => <NavLink key={r} route={r} current={route} navigate={navigate} />)}<div className="nav-section-label"><Spade size={16} /> Blackjack</div>{BLACKJACK_ROUTES.map(r => <NavLink key={r} route={r} current={route} navigate={navigate} />)}<div className="nav-divider" /><NavLink route="progress" current={route} navigate={navigate} icon={<TrendingUp size={18} />} /><NavLink route="settings" current={route} navigate={navigate} icon={<Settings2 size={18} />} /></nav><div className="sidebar-footer"><span className={`status-dot ${store.error ? 'warning' : ''}`} /><span>{store.saving ? 'Ukládám změny…' : store.error ? 'Zkontroluj uložení dat' : 'Tvoje data na tomto zařízení'}</span></div></aside>}
    <div className="main-column">{!focused && <header className="mobile-header"><button type="button" className="brand" onClick={home}><Spade size={22} /><span>Counting Cards</span></button><button type="button" className="btn icon ghost" onClick={() => navigate('settings')} aria-label="Nastavení"><Settings2 size={21} /></button></header>}{store.error && <div className="storage-banner" role="alert"><CircleAlert size={18} /><span>{store.error}</span><Button onClick={() => navigate('settings')}>Otevřít zálohy</Button></div>}
    <main id="main" tabIndex={-1}><ErrorBoundary key={route}><Suspense fallback={<div className="page empty"><Spade size={28} className="gold" /><p>Připravuji trénink…</p></div>}>{route === 'home' ? <HomeScreen navigate={navigate} /> : route === 'pao' ? <PaoScreen /> : route === 'sequence' || route === 'shuffle' || route === 'missing' || route === 'visual' ? <MemoryScreen key={route} mode={route} onExit={home} /> : route === 'hilo' ? <CountingScreen onExit={home} /> : route === 'strategy' ? <StrategyScreen onExit={home} /> : route === 'table' ? <TableScreen onExit={home} /> : route === 'progress' ? <ProgressScreen navigate={navigate} /> : <SettingsScreen />}</Suspense></ErrorBoundary></main></div>
    {!focused && <nav className="bottom-nav" aria-label="Mobilní navigace">{[{ r: 'home', label: 'Domů', Icon: Home }, { r: 'pao', label: 'Paměť', Icon: BookOpen }, { r: 'hilo', label: 'Blackjack', Icon: Spade }, { r: 'progress', label: 'Pokrok', Icon: TrendingUp }].map(({ r, label, Icon }) => <button type="button" key={r} onClick={() => navigate(r as Route)} aria-current={route === r || r === 'pao' && MEMORY_ROUTES.includes(route) || r === 'hilo' && BLACKJACK_ROUTES.includes(route) ? 'page' : undefined}><Icon size={21} /><span>{label}</span></button>)}</nav>}
  </div>;
}
function NavLink({ route, current, navigate, icon }: { route: Route; current: Route; navigate: (r: Route) => void; icon?: ReactNode }) { return <a href={pathFor(route)} className={`nav-link ${route === current ? 'active' : ''} ${icon ? '' : 'sub'}`} aria-current={route === current ? 'page' : undefined} onClick={e => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); navigate(route); } }}>{icon ?? <span className="nav-small-dot" />}<span>{NAMES[route]}</span>{route === current && <ChevronRight size={15} />}</a>; }
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Counting Cards view error', error, info.componentStack); }
  render() { return this.state.failed ? <div className="page empty"><CircleAlert size={34} className="gold" /><h1>Tenhle pohled se nepodařilo otevřít.</h1><p>Uložené asociace zůstaly v prohlížeči. Zkus stránku načíst znovu.</p><Button variant="primary" onClick={() => window.location.reload()}>Obnovit stránku</Button></div> : this.props.children; }
}
