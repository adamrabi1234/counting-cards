import type { Mode } from './data/schema';
export const ROUTES = ['home', 'pao', 'sequence', 'shuffle', 'missing', 'visual', 'hilo', 'strategy', 'table', 'progress', 'settings'] as const;
export type Route = typeof ROUTES[number];
export const NAMES: Record<Route | Mode, string> = { home: 'Domů', pao: 'PAO knihovna', sequence: 'Sekvence', shuffle: 'Míchání v paměti', missing: 'Chybějící karty', visual: 'Vizuální paměť', hilo: 'Hi-Lo počítání', strategy: 'Základní strategie', table: 'Tréninkový stůl', 'table-count': 'Count u stolu', progress: 'Tvůj pokrok', settings: 'Nastavení a zálohy' };
export const MEMORY_ROUTES: Route[] = ['pao', 'sequence', 'shuffle', 'missing', 'visual'];
export const BLACKJACK_ROUTES: Route[] = ['hilo', 'strategy', 'table'];
export function pathFor(route: Route) { return route === 'home' ? '/' : `/practice/${route}`; }
export function routeFromPath(path: string): Route { const candidate = path.replace(/\/$/, '').split('/').pop(); return ROUTES.includes(candidate as Route) ? candidate as Route : 'home'; }
