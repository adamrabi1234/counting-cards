import { z } from 'zod';
import { CARD_IDS, type CardId, type Suit } from '../engine/cards';
import { DEFAULT_RULES, type Rules } from '../engine/blackjack';
import type { PaoData } from '../engine/pao';
import type { Progression, RecallKind, ShuffleOperation } from '../engine/memory';
export const MODES = ['pao', 'sequence', 'shuffle', 'missing', 'visual', 'hilo', 'strategy', 'table', 'table-count'] as const;
export type Mode = typeof MODES[number];
export interface SessionRecord {
  id: string; mode: Mode; createdAt: number; correct: number; total: number; durationMs: number; eligible: boolean;
  memorizeMs?: number; recallMs?: number; intervalMs?: number; count?: number; variant?: string; summary?: string;
  pao?: { cardId: CardId; correct: boolean }; outcome?: string;
}
export interface MemoryConfig {
  count: number; interval: number; rounds: number; recall: RecallKind; progressive: boolean;
  start: number; increment: number; required: number;
  operations: ShuffleOperation[]; shuffleRecall: 'full' | 'first' | 'position'; firstN: number;
  suit: Suit | 'all'; from: number; to: number; missingCount: number; displayMs: number;
  visualKind: 'full' | 'card' | 'find'; columns: number;
}
export interface HiLoConfig { decks: number; start: number; checkpoint: number; interval: number; rounds: number; difficulty: 'custom' | 'beginner' | 'regular' | 'fast'; kind: 'running' | 'true' }
export type MemoryMode = 'sequence' | 'shuffle' | 'missing' | 'visual';
export interface Snapshot {
  version: 1; revision: number; updatedAt: number; pao: PaoData; sessions: SessionRecord[];
  settings: { motion: boolean; dailyGoal: number; rules: Rules; memory: Record<MemoryMode, MemoryConfig>; hilo: HiLoConfig; strategy: { filter: 'all' | 'hard' | 'soft' | 'pairs'; rounds: number } };
  progression: Progression;
}
const integer = (min: number, max: number) => z.number().int().min(min).max(max);
const finite = (max = 1e13) => z.number().finite().min(0).max(max);
const cardId = z.enum(CARD_IDS as [CardId, ...CardId[]]);
export const RulesSchema = z.object({
  decks: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(6), z.literal(8)]), h17: z.boolean(),
  double: z.enum(['any', '9-11', '10-11', 'none']), das: z.boolean(), surrender: z.boolean(), resplit: z.boolean(), resplitAces: z.boolean(), maxHands: z.union([z.literal(2), z.literal(3), z.literal(4)]),
}).strict();
const operation = z.union([
  z.object({ type: z.enum(['cut', 'move']), count: integer(0, 52) }).strict(),
  z.object({ type: z.literal('riffle'), first: z.enum(['left', 'right']) }).strict(),
  z.object({ type: z.literal('deal'), piles: z.union([z.literal(2), z.literal(3), z.literal(4)]), order: z.array(integer(0, 3)).min(2).max(4) }).strict().refine(o => o.order.length === o.piles && new Set(o.order).size === o.piles && o.order.every(n => n < o.piles)),
]);
const memory = z.object({
  count: integer(1, 52), interval: integer(100, 30000), rounds: integer(1, 100), recall: z.enum(['full', 'reverse', 'position', 'missing']),
  progressive: z.boolean(), start: integer(1, 52), increment: integer(1, 20), required: integer(1, 20),
  operations: z.array(operation).max(12), shuffleRecall: z.enum(['full', 'first', 'position']), firstN: integer(1, 52),
  suit: z.enum(['all', 'S', 'H', 'D', 'C']), from: integer(0, 12), to: integer(0, 12), missingCount: integer(1, 51), displayMs: integer(500, 120000),
  visualKind: z.enum(['full', 'card', 'find']), columns: integer(2, 6),
}).strict().refine(v => v.from <= v.to);
export const SessionSchema = z.object({
  id: z.string().min(1).max(100), mode: z.enum(MODES), createdAt: finite(), correct: integer(0, 100000), total: integer(0, 100000), durationMs: finite(), eligible: z.boolean(),
  memorizeMs: finite().optional(), recallMs: finite().optional(), intervalMs: finite(120000).optional(), count: integer(1, 416).optional(), variant: z.string().max(120).optional(), summary: z.string().max(500).optional(),
  pao: z.object({ cardId, correct: z.boolean() }).strict().optional(), outcome: z.string().max(120).optional(),
}).strict().refine(v => v.correct <= v.total);
export const SnapshotSchema = z.object({
  version: z.literal(1), revision: finite(), updatedAt: finite(),
  pao: z.partialRecord(cardId, z.object({ person: z.string().max(500), action: z.string().max(500), object: z.string().max(500), updatedAt: finite() }).strict()),
  sessions: z.array(SessionSchema).max(50000),
  settings: z.object({
    motion: z.boolean(), dailyGoal: integer(1, 100), rules: RulesSchema,
    memory: z.object({ sequence: memory, shuffle: memory, missing: memory, visual: memory }).strict(),
    hilo: z.object({ decks: integer(1, 8), start: integer(-100, 100), checkpoint: integer(1, 52), interval: integer(100, 30000), rounds: integer(1, 100), difficulty: z.enum(['custom', 'beginner', 'regular', 'fast']), kind: z.enum(['running', 'true']) }).strict(),
    strategy: z.object({ filter: z.enum(['all', 'hard', 'soft', 'pairs']), rounds: integer(1, 100) }).strict(),
  }).strict(),
  progression: z.object({ level: integer(1, 52), streak: integer(0, 20), increment: integer(1, 20), required: integer(1, 20), enabled: z.boolean() }).strict(),
}).strict();
export function defaultMemory(): MemoryConfig { return { count: 5, interval: 1000, rounds: 3, recall: 'full', progressive: false, start: 5, increment: 2, required: 2, operations: [{ type: 'cut', count: 2 }], shuffleRecall: 'full', firstN: 5, suit: 'H', from: 0, to: 12, missingCount: 1, displayMs: 5000, visualKind: 'full', columns: 4 }; }
export function emptySnapshot(): Snapshot {
  return { version: 1, revision: 0, updatedAt: Date.now(), pao: {}, sessions: [], settings: { motion: true, dailyGoal: 10, rules: { ...DEFAULT_RULES }, memory: { sequence: defaultMemory(), shuffle: { ...defaultMemory(), count: 8 }, missing: defaultMemory(), visual: { ...defaultMemory(), count: 8 } }, hilo: { decks: 1, start: 0, checkpoint: 10, interval: 1000, rounds: 5, difficulty: 'beginner', kind: 'running' }, strategy: { filter: 'all', rounds: 10 } }, progression: { level: 5, streak: 0, increment: 2, required: 2, enabled: false } };
}
export function validateSnapshot(value: unknown): Snapshot { return SnapshotSchema.parse(value) as Snapshot; }
export function parseImport(text: string): Snapshot {
  if (text.length > 25_000_000) throw new Error('Záloha je větší než 25 MB.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Soubor není platná JSON záloha.'); }
  try { return validateSnapshot(value); } catch { throw new Error('Záloha má neplatná data nebo nepodporovanou verzi. Nic se nezměnilo.'); }
}
export function mergeSnapshots(current: Snapshot, incoming: Snapshot): Snapshot {
  const pao = { ...current.pao };
  for (const [key, entry] of Object.entries(incoming.pao)) if (entry && (!pao[key as CardId] || entry.updatedAt >= pao[key as CardId]!.updatedAt)) pao[key as CardId] = entry;
  const sessions = new Map(current.sessions.map(s => [s.id, s]));
  incoming.sessions.forEach(s => { if (!sessions.has(s.id)) sessions.set(s.id, s); });
  return validateSnapshot({ ...current, pao, sessions: [...sessions.values()].sort((a, b) => a.createdAt - b.createdAt) });
}
