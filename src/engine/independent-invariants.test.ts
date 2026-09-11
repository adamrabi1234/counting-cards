import { describe, expect, it } from 'vitest';
import { card, DECK, hiLo, shoe, shuffled, type CardId, type PhysicalCard } from './cards';
import { createTable, dealHand, DEFAULT_RULES, handValue, ids, playAction, tableActions, type Rules } from './blackjack';
const fixed = (cards: CardId[]): PhysicalCard[] => cards.map((id, i) => ({ ...card(id), uid: 'independent:' + i }));
function seeded(seed: number) {
  let state = seed >>> 0;
  return (max: number) => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % max; };
}
describe('independent finite-shoe invariants', () => {
  it('conserves physical cards and visible running count over 500 complete legal-action games', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const rng = seeded(seed);
      const rules: Rules = { ...DEFAULT_RULES, decks: ([1, 2, 4, 6, 8] as const)[seed % 5], h17: !!(seed % 2), das: !!(seed % 3), surrender: !!(seed % 4), resplit: true, resplitAces: true };
      let state = dealHand(createTable(rules, shoe(rules.decks, rng)));
      let turns = 0;
      while (state.phase === 'playing') {
        expect(turns++).toBeLessThan(80);
        const before = JSON.stringify(state);
        const actions = tableActions(state);
        expect(actions.length).toBeGreaterThan(0);
        const next = playAction(state, actions[rng(actions.length)]);
        expect(JSON.stringify(state)).toBe(before);
        state = next;
        const dealt = [...state.dealer, ...state.hands.flatMap(h => h.cards)];
        expect(new Set(dealt.map(c => c.uid)).size).toBe(state.cursor);
        expect(dealt).toHaveLength(state.cursor);
        const seen = [...state.dealer.filter((_, i) => i !== 1 || state.holeRevealed), ...state.hands.flatMap(h => h.cards)];
        expect(state.count).toBe(seen.reduce((n, c) => n + hiLo(c), 0));
      }
      expect(state.holeRevealed).toBe(true);
      expect(state.hands.every(h => h.status !== 'playing' && h.outcome !== undefined && Number.isFinite(h.units))).toBe(true);
    }
  });
  it('rejects an exhausted draw atomically without damaging the playable state', () => {
    const state = dealHand(createTable(DEFAULT_RULES, fixed(['5H', '2D', '6S', '3C', '10H'])));
    const before = JSON.stringify(state);
    expect(() => playAction(state, 'double')).toThrow(/došel/);
    expect(JSON.stringify(state)).toBe(before);
  });
  it('resplits aces only while rules and maximum hand count permit it', () => {
    let state = dealHand(createTable({ ...DEFAULT_RULES, resplitAces: true, maxHands: 3 }, fixed(['AH', '10D', 'AS', '7C', 'AD', '3S', 'AC', '9H'])));
    state = playAction(state, 'split');
    expect(tableActions(state)).toEqual(['stand', 'split']);
    state = playAction(state, 'split');
    expect(state.hands).toHaveLength(3);
    expect(state.phase).toBe('done');
    expect(state.hands.every(h => h.cards.length === 2)).toBe(true);
    expect(state.hands.map(h => handValue(ids(h.cards)).total)).toEqual([12, 20, 14]);
  });
  it('supports empty/singleton shuffle and rejects malformed random-source outputs', () => {
    expect(shuffled([])).toEqual([]);
    expect(shuffled(['x'])).toEqual(['x']);
    expect(() => shuffled(DECK, () => -1)).toThrow(RangeError);
    expect(() => shuffled(DECK, max => max)).toThrow(RangeError);
    expect(() => shuffled(DECK, () => .5)).toThrow(RangeError);
  });
});
