import { CARD_IDS, card, randomInt, RANKS, shuffled, type CardId, type RandomInt, type Suit } from './cards';
export type RecallKind = 'full' | 'reverse' | 'position' | 'missing';
export interface RecallTarget { expected: CardId[]; positions: number[]; context?: (CardId | null)[] }
export function recallTarget(sequence: readonly CardId[], kind: RecallKind, rng: RandomInt = randomInt): RecallTarget {
  if (!sequence.length) throw new Error('Sekvence je prázdná.');
  if (kind === 'reverse') return { expected: [...sequence].reverse(), positions: sequence.map((_, i) => sequence.length - 1 - i) };
  if (kind === 'position' || kind === 'missing') {
    const i = rng(sequence.length);
    return { expected: [sequence[i]], positions: [i], ...(kind === 'missing' ? { context: sequence.map((c, n) => n === i ? null : c) } : {}) };
  }
  return { expected: [...sequence], positions: sequence.map((_, i) => i) };
}
export function orderedScore(expected: readonly CardId[], actual: readonly (CardId | null)[]) {
  const seen = new Set<CardId>();
  const details = expected.map((id, index) => {
    const answer = actual[index] ?? null;
    const correct = answer === id && !seen.has(answer);
    if (answer) seen.add(answer);
    return { expected: id, actual: answer, correct, position: index + 1 };
  });
  return { correct: details.filter(d => d.correct).length, total: expected.length, details };
}
export function unorderedScore(expected: readonly CardId[], actual: readonly (CardId | null)[]) {
  const unique = new Set(actual.filter((id): id is CardId => id !== null));
  return { correct: expected.filter(id => unique.has(id)).length, total: expected.length, missing: expected.filter(id => !unique.has(id)), extra: [...unique].filter(id => !expected.includes(id)) };
}
export interface Progression { level: number; streak: number; increment: number; required: number; enabled: boolean }
export function advanceProgression(p: Progression, perfect: boolean, eligible = true): Progression {
  if (!p.enabled || !eligible) return p;
  if (!perfect) return { ...p, streak: 0 };
  const streak = p.streak + 1;
  return streak >= p.required ? { ...p, level: Math.min(52, p.level + p.increment), streak: 0 } : { ...p, streak };
}
export function missingPool(suit: Suit | 'all', from: number, to: number): CardId[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 12 || from > to) throw new RangeError('Neplatný rozsah karet.');
  return CARD_IDS.filter(id => (suit === 'all' || card(id).suit === suit) && RANKS.indexOf(card(id).rank) >= from && RANKS.indexOf(card(id).rank) <= to);
}
export function missingRound(pool: readonly CardId[], count: number, rng: RandomInt = randomInt) {
  if (!Number.isInteger(count) || count < 1 || count >= pool.length) throw new RangeError('Musí zůstat alespoň jedna viditelná karta.');
  const mixed = shuffled(pool, rng);
  return { missing: mixed.slice(0, count), visible: mixed.slice(count) };
}
export type ShuffleOperation =
  | { type: 'cut' | 'move'; count: number }
  | { type: 'deal'; piles: 2 | 3 | 4; order: number[] }
  | { type: 'riffle'; first: 'left' | 'right' };
export function cut<T>(deck: readonly T[], count: number): T[] {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('Počet musí být celé nezáporné číslo.');
  if (!deck.length) return [];
  const n = count % deck.length;
  return [...deck.slice(n), ...deck.slice(0, n)];
}
export function deal<T>(deck: readonly T[], count: number): T[][] {
  if (![2, 3, 4].includes(count)) throw new RangeError('Použij 2, 3 nebo 4 hromádky.');
  const piles: T[][] = Array.from({ length: count }, () => []);
  deck.forEach((c, i) => piles[i % count].push(c));
  return piles;
}
export function gather<T>(piles: readonly (readonly T[])[], order: readonly number[]): T[] {
  if (order.length !== piles.length || new Set(order).size !== piles.length || order.some(i => !Number.isInteger(i) || i < 0 || i >= piles.length)) throw new Error('Každá hromádka musí být v pořadí právě jednou.');
  return order.flatMap(i => [...piles[i]]);
}
export function riffle<T>(deck: readonly T[], first: 'left' | 'right' = 'left'): T[] {
  const middle = Math.ceil(deck.length / 2), left = deck.slice(0, middle), right = deck.slice(middle), out: T[] = [];
  const halves = first === 'left' ? [left, right] : [right, left];
  for (let i = 0; i < middle; i++) for (const half of halves) if (i < half.length) out.push(half[i]);
  return out;
}
export function applyOperations<T>(deck: readonly T[], operations: readonly ShuffleOperation[]): T[] {
  return operations.reduce<T[]>((current, op) => op.type === 'deal' ? gather(deal(current, op.piles), op.order) : op.type === 'riffle' ? riffle(current, op.first) : cut(current, op.count), [...deck]);
}
export function describeOperation(op: ShuffleOperation): string {
  if (op.type === 'deal') return `Rozdat střídavě do ${op.piles} hromádek → sesbírat ${op.order.map(i => i + 1).join(' → ')}`;
  if (op.type === 'riffle') return `Proložit dvě poloviny, začíná ${op.first === 'left' ? 'horní' : 'dolní'}`;
  return `${op.type === 'cut' ? 'Sejmout' : 'Přesunout'} horních ${op.count} karet dolů`;
}
