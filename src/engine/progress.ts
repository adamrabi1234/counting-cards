import type { Mode, SessionRecord } from '../data/schema';
import { configured, type PaoData } from './pao';
export function accuracy(records: readonly SessionRecord[]): number | null {
  const total = records.reduce((n, r) => n + r.total, 0);
  return total ? records.reduce((n, r) => n + r.correct, 0) / total * 100 : null;
}
export function dateKey(time: number): string { const d = new Date(time); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function streak(records: readonly SessionRecord[], now = Date.now()): number {
  const days = new Set(records.map(r => dateKey(r.createdAt)));
  const cursor = new Date(now); cursor.setHours(12, 0, 0, 0);
  if (!days.has(dateKey(+cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(dateKey(+cursor))) { n++; cursor.setDate(cursor.getDate() - 1); }
  return n;
}
export function modeStats(records: readonly SessionRecord[], mode: Mode) {
  const selected = records.filter(r => r.mode === mode);
  const fullRecall = mode === 'sequence' || mode === 'shuffle' || mode === 'visual';
  const perfect = selected.filter(r => r.eligible && r.total > 0 && r.correct === r.total && (!fullRecall || r.variant === 'full'));
  return { rounds: selected.length, accuracy: accuracy(selected), best: perfect.reduce((n, r) => Math.max(n, r.count ?? 0), 0), fastest: perfect.filter(r => r.intervalMs).reduce<number | null>((n, r) => n === null ? r.intervalMs! : Math.min(n, r.intervalMs!), null) };
}
export function latestMastery(records: readonly SessionRecord[], associations?: PaoData) {
  const latest = new Map<string, boolean>();
  [...records].sort((a, b) => a.createdAt - b.createdAt).forEach(r => { if (r.pao && (!associations || configured(associations[r.pao.cardId]))) latest.set(r.pao.cardId, r.pao.correct); });
  return [...latest.values()].filter(Boolean).length;
}
