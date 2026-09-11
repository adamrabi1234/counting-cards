import { card, hiLo, shoe, type CardId, type PhysicalCard, type Rank } from './cards';
import tables from './strategy-tables.json';
export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender';
export interface Rules {
  decks: 1 | 2 | 4 | 6 | 8;
  h17: boolean;
  double: 'any' | '9-11' | '10-11' | 'none';
  das: boolean;
  surrender: boolean;
  resplit: boolean;
  resplitAces: boolean;
  maxHands: 2 | 3 | 4;
}
export const DEFAULT_RULES: Rules = { decks: 6, h17: false, double: 'any', das: true, surrender: true, resplit: true, resplitAces: false, maxHands: 4 };
export const ACTION_NAMES: Record<Action, string> = { hit: 'Vzít kartu', stand: 'Stát', double: 'Zdvojnásobit', split: 'Rozdělit', surrender: 'Vzdát se' };
export const ACTION_SHORT: Record<Action, string> = { hit: 'H', stand: 'S', double: 'D', split: 'P', surrender: 'R' };
export function value(rank: Rank): number { return rank === 'A' ? 11 : ['10', 'J', 'Q', 'K'].includes(rank) ? 10 : Number(rank); }
export function handValue(ids: readonly CardId[]) {
  let total = ids.reduce((n, id) => n + value(card(id).rank), 0);
  let aces = ids.filter(id => card(id).rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0, bust: total > 21 };
}
export function natural(ids: readonly CardId[], split = false): boolean { return !split && ids.length === 2 && handValue(ids).total === 21; }
export interface HandContext { fromSplit?: boolean; splitAces?: boolean; hands?: number; done?: boolean }
export function legalActions(ids: readonly CardId[], rules: Rules, context: HandContext = {}): Action[] {
  const total = handValue(ids).total;
  if (context.done || total >= 21 || ids.length < 2) return [];
  const two = ids.length === 2, pair = two && value(card(ids[0]).rank) === value(card(ids[1]).rank);
  const acePair = pair && card(ids[0]).rank === 'A';
  const canSplit = pair && (context.hands ?? 1) < rules.maxHands && (!context.fromSplit || rules.resplit) && (!acePair || !context.fromSplit || rules.resplitAces);
  if (context.splitAces) return canSplit ? ['stand', 'split'] : ['stand'];
  const out: Action[] = ['hit', 'stand'];
  const doubleRange = rules.double === 'any' || (rules.double === '9-11' && total >= 9 && total <= 11) || (rules.double === '10-11' && total >= 10 && total <= 11);
  if (two && doubleRange && (!context.fromSplit || rules.das)) out.push('double');
  if (canSplit) out.push('split');
  if (two && !context.fromSplit && rules.surrender) out.push('surrender');
  return out;
}
function tableFor(rules: Rules): string[][] {
  return tables[`${rules.h17 ? 'H' : 'S'}17_${rules.decks === 1 ? 0 : rules.decks === 2 ? 1 : 2}` as keyof typeof tables];
}
export function recommend(ids: readonly CardId[], dealer: CardId, rules: Rules, context: HandContext = {}): { action: Action; code: string; explanation: string } {
  const legal = legalActions(ids, rules, context), state = handValue(ids);
  if (!legal.length) return { action: 'stand', code: 'S', explanation: state.bust ? 'Ruka překročila 21 a je dohraná.' : 'Na 21 už další kartu nebereme.' };
  if (context.splitAces) return { action: legal.includes('split') ? 'split' : 'stand', code: legal.includes('split') ? 'P' : 'S', explanation: 'Rozdělená esa dostávají jednu kartu. Znovu je rozdělíme pouze tehdy, dovolují-li to pravidla.' };
  const up = value(card(dealer).rank), col = up === 11 ? 9 : up - 2;
  const matrix = tableFor(rules);
  const totalRow = state.soft ? 17 + Math.max(0, state.total - 13) : Math.max(0, state.total - 5);
  const pair = ids.length === 2 && value(card(ids[0]).rank) === value(card(ids[1]).rank);
  const pairValue = value(card(ids[0]).rank);
  const row = pair && legal.includes('split') ? 26 + (pairValue === 11 ? 9 : pairValue - 2) : totalRow;
  const code = matrix[row]?.[col] ?? 'H';
  function resolve(cell: string): Action {
    if (cell.startsWith('R')) return legal.includes('surrender') ? 'surrender' : resolve(cell.slice(1));
    if (cell.startsWith('Q')) return rules.das && rules.double !== 'none' && legal.includes('split') ? 'split' : resolve(cell.slice(1));
    if (cell.startsWith('D')) return legal.includes('double') ? 'double' : cell === 'DS' ? 'stand' : 'hit';
    if (cell === 'P') return legal.includes('split') ? 'split' : resolve(matrix[totalRow][col]);
    return cell === 'S' ? 'stand' : 'hit';
  }
  const action = resolve(code);
  const hand = pair && legal.includes('split') ? `Pár ${card(ids[0]).rank}` : `${state.soft ? 'Měkkých' : 'Tvrdých'} ${state.total}`;
  const reason: Record<Action, string> = {
    hit: 'Vezmi další kartu; podle této tabulky je to nejlepší dostupná volba.',
    stand: 'Dál už nedobírej. Tabulka doporučuje ponechat současný součet.',
    double: 'Zdvojnásob a vezmi právě jednu poslední kartu.',
    split: 'Rozděl pár na dvě samostatné ruce podle nastavených pravidel.',
    surrender: 'Po vyloučení dealerova blackjacku vzdej počáteční ruku za polovinu virtuální jednotky.',
  };
  const fallback = (code.startsWith('D') && action !== 'double') ? ' Zdvojnásobení zde není povolené, proto používáme náhradní tah.' : '';
  return { action, code, explanation: `${hand} proti ${up === 11 ? 'esu' : up}. ${reason[action]}${fallback} ${rules.decks} balíčků, ${rules.h17 ? 'H17' : 'S17'}, ${rules.das ? 'DAS' : 'bez DAS'}, ${rules.surrender ? 'pozdní surrender' : 'bez surrender'}.` };
}
export function rulesSummary(r: Rules): string { return `${r.decks} bal. · ${r.h17 ? 'H17' : 'S17'} · ${r.das ? 'DAS' : 'bez DAS'} · ${r.surrender ? 'pozdní vzdání' : 'bez vzdání'}`; }

export interface PlayerHand {
  cards: PhysicalCard[];
  fromSplit: boolean;
  splitAces: boolean;
  status: 'playing' | 'stood' | 'bust' | 'surrender';
  stake: 1 | 2;
  outcome?: 'win' | 'loss' | 'push' | 'blackjack' | 'surrender';
  units?: number;
}
export interface TableState {
  shoe: PhysicalCard[];
  cursor: number;
  count: number;
  dealer: PhysicalCard[];
  holeRevealed: boolean;
  hands: PlayerHand[];
  active: number;
  phase: 'ready' | 'playing' | 'done';
  rules: Rules;
  shoeNumber: number;
  round: number;
  decisions: { action: Action; expected: Action; correct: boolean }[];
}
export const ids = (cards: readonly PhysicalCard[]) => cards.map(c => c.id);
export function createTable(rules: Rules, orderedShoe?: PhysicalCard[]): TableState {
  return { shoe: orderedShoe ?? shoe(rules.decks), cursor: 0, count: 0, dealer: [], holeRevealed: false, hands: [], active: 0, phase: 'ready', rules: { ...rules }, shoeNumber: 1, round: 0, decisions: [] };
}
function clone(state: TableState): TableState { return { ...state, dealer: [...state.dealer], hands: state.hands.map(h => ({ ...h, cards: [...h.cards] })), decisions: [...state.decisions] }; }
function draw(state: TableState, visible = true): PhysicalCard {
  const c = state.shoe[state.cursor++];
  if (!c) throw new Error('Balíček v této ruce došel. Začni nový shoe; neúplná ruka se nezapočítá.');
  if (visible) state.count += hiLo(c);
  return c;
}
function reveal(state: TableState) { if (!state.holeRevealed && state.dealer[1]) { state.count += hiLo(state.dealer[1]); state.holeRevealed = true; } }
function context(state: TableState, hand: PlayerHand): HandContext { return { fromSplit: hand.fromSplit, splitAces: hand.splitAces, hands: state.hands.length, done: hand.status !== 'playing' }; }
export function tableActions(state: TableState): Action[] { return state.phase === 'playing' ? legalActions(ids(state.hands[state.active].cards), state.rules, context(state, state.hands[state.active])) : []; }
function settle(state: TableState) {
  reveal(state);
  const dealerNatural = natural(ids(state.dealer));
  const playDealer = !dealerNatural && state.hands.some(h => h.status !== 'bust' && h.status !== 'surrender' && !natural(ids(h.cards), h.fromSplit));
  if (playDealer) {
    while (true) {
      const d = handValue(ids(state.dealer));
      if (d.total < 17 || (d.total === 17 && d.soft && state.rules.h17)) state.dealer.push(draw(state)); else break;
    }
  }
  const dealer = handValue(ids(state.dealer));
  for (const h of state.hands) {
    const p = handValue(ids(h.cards)), bj = natural(ids(h.cards), h.fromSplit);
    if (h.status === 'surrender') { h.outcome = 'surrender'; h.units = -.5; }
    else if (p.bust || (dealerNatural && !bj)) { h.outcome = 'loss'; h.units = -h.stake; }
    else if (bj && !dealerNatural) { h.outcome = 'blackjack'; h.units = 1.5; }
    else if (dealer.bust || p.total > dealer.total) { h.outcome = 'win'; h.units = h.stake; }
    else if (p.total === dealer.total) { h.outcome = 'push'; h.units = 0; }
    else { h.outcome = 'loss'; h.units = -h.stake; }
    if (h.status === 'playing') h.status = 'stood';
  }
  state.phase = 'done';
}
function advance(state: TableState) {
  for (const h of state.hands) {
    if (h.status !== 'playing') continue;
    const v = handValue(ids(h.cards));
    if (v.bust) h.status = 'bust';
    else if (v.total === 21 || (h.splitAces && !legalActions(ids(h.cards), state.rules, context(state, h)).includes('split'))) h.status = 'stood';
  }
  const active = state.hands.findIndex(h => h.status === 'playing');
  if (active === -1) settle(state); else state.active = active;
}
export function dealHand(state: TableState): TableState {
  if (state.phase === 'playing') throw new Error('Nejprve dohraj aktuální ruku.');
  const next = clone(state);
  // Start only with enough cards for an unusually long split hand; never reshuffle during it.
  if (next.shoe.length - next.cursor < Math.min(40, Math.floor(next.shoe.length * .6))) {
    next.shoe = shoe(next.rules.decks); next.cursor = 0; next.count = 0; next.shoeNumber++;
  }
  next.dealer = []; next.hands = []; next.decisions = []; next.holeRevealed = false; next.active = 0; next.round++; next.phase = 'playing';
  const first = draw(next), up = draw(next), second = draw(next), hole = draw(next, false);
  next.dealer = [up, hole];
  next.hands = [{ cards: [first, second], fromSplit: false, splitAces: false, status: 'playing', stake: 1 }];
  if (natural(ids(next.dealer)) || natural([first.id, second.id])) settle(next); else advance(next);
  return next;
}
export function playAction(state: TableState, action: Action): TableState {
  if (!tableActions(state).includes(action)) throw new Error('Tento tah není podle pravidel povolen.');
  const next = clone(state), h = next.hands[next.active];
  const expected = recommend(ids(h.cards), next.dealer[0].id, next.rules, context(next, h)).action;
  next.decisions.push({ action, expected, correct: expected === action });
  if (action === 'hit') h.cards.push(draw(next));
  if (action === 'stand') h.status = 'stood';
  if (action === 'surrender') h.status = 'surrender';
  if (action === 'double') { h.stake = 2; h.cards.push(draw(next)); h.status = handValue(ids(h.cards)).bust ? 'bust' : 'stood'; }
  if (action === 'split') {
    const splitAces = h.cards[0].rank === 'A';
    const first: PlayerHand = { cards: [h.cards[0], draw(next)], status: 'playing', fromSplit: true, splitAces, stake: 1 };
    const second: PlayerHand = { cards: [h.cards[1], draw(next)], status: 'playing', fromSplit: true, splitAces, stake: 1 };
    next.hands.splice(next.active, 1, first, second);
  }
  advance(next);
  return next;
}
