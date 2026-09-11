export const SUITS = ['S', 'H', 'D', 'C'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type Suit = typeof SUITS[number];
export type Rank = typeof RANKS[number];
export type CardId = `${Rank}${Suit}`;
export const SUIT = {
  S: { symbol: '♠', name: 'Piky', file: 'spades', adjective: 'pikové' },
  H: { symbol: '♥', name: 'Srdce', file: 'hearts', adjective: 'srdcové' },
  D: { symbol: '♦', name: 'Káry', file: 'diamonds', adjective: 'kárové' },
  C: { symbol: '♣', name: 'Kříže', file: 'clubs', adjective: 'křížové' },
} as const;
export interface Card { id: CardId; rank: Rank; suit: Suit }
export interface PhysicalCard extends Card { uid: string }
export const DECK: readonly Card[] = SUITS.flatMap(suit => RANKS.map(rank => ({ id: `${rank}${suit}` as CardId, rank, suit })));
const byId = new Map(DECK.map(card => [card.id, card]));
export const CARD_IDS = DECK.map(c => c.id);
export function isCardId(id: string): id is CardId { return byId.has(id as CardId); }
export function card(id: CardId): Card {
  const found = byId.get(id);
  if (!found) throw new Error(`Neznámá karta: ${id}`);
  return found;
}
export function cardName(id: CardId): string {
  const c = card(id);
  return `${({ A: 'Eso', J: 'Kluk', Q: 'Dáma', K: 'Král' } as Partial<Record<Rank, string>>)[c.rank] ?? c.rank} ${SUIT[c.suit].name.toLocaleLowerCase('cs')}`;
}
export function cardImage(id: CardId): string {
  const c = card(id);
  const rank = ({ A: 'ace', J: 'jack', Q: 'queen', K: 'king' } as Partial<Record<Rank, string>>)[c.rank] ?? c.rank;
  return `/cards/${rank}_of_${SUIT[c.suit].file}.svg`;
}
export type RandomInt = (exclusiveMax: number) => number;
export const randomInt: RandomInt = max => {
  if (!Number.isInteger(max) || max < 1 || max > 0x100000000) throw new RangeError('Neplatný rozsah náhody.');
  const limit = Math.floor(0x100000000 / max) * max;
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % max;
};
export function shuffled<T>(values: readonly T[], rng: RandomInt = randomInt): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) throw new RangeError('Náhodný index je mimo rozsah.');
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function uniqueId(): string {
  const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  return Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
}
export function shoe(decks: number, rng: RandomInt = randomInt): PhysicalCard[] {
  if (!Number.isInteger(decks) || decks < 1 || decks > 8) throw new RangeError('Počet balíčků musí být 1–8.');
  return shuffled(Array.from({ length: decks }, (_, d) => DECK.map(c => ({ ...c, uid: `${d}:${c.id}` }))).flat(), rng);
}
export function hiLo(c: Card | CardId): number {
  const rank = typeof c === 'string' ? card(c).rank : c.rank;
  return ['2', '3', '4', '5', '6'].includes(rank) ? 1 : ['7', '8', '9'].includes(rank) ? 0 : -1;
}
export function runningCount(cards: readonly (Card | CardId)[], start = 0): number { return cards.reduce((n, c) => n + hiLo(c), start); }
export function trueCount(count: number, unseen: number): number | null { return unseen > 0 ? count / (unseen / 52) : null; }
