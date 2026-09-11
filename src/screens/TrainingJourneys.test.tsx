// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { emptySnapshot, validateSnapshot, mergeSnapshots, type MemoryConfig, type MemoryMode } from '../data/schema';
import { advanceProgression } from '../engine/memory';
import { CARD_IDS, cardName, type CardId } from '../engine/cards';
const mock = vi.hoisted(() => ({ state: {} as any }));
vi.mock('../data/store', () => ({ useApp: Object.assign(() => mock.state, { getState: () => mock.state }) }));
vi.mock('../engine/cards', async importOriginal => {
  const actual = await importOriginal<typeof import('../engine/cards')>();
  return { ...actual, shuffled: <T,>(values: readonly T[]) => [...values], randomInt: () => 0,
    shoe: (decks: number) => Array.from({ length: decks }, (_, d) => actual.DECK.map(c => ({ ...c, uid: d + ':' + c.id }))).flat() };
});
vi.mock('../components/Card', async importOriginal => ({ ...await importOriginal<typeof import('../components/Card')>(), preloadCards: vi.fn(async () => {}) }));
import MemoryScreen from './MemoryScreen';
import CountingScreen from './CountingScreen';
import SettingsScreen from './SettingsScreen';
let now = 0, sequence = 0, frames = new Map<number, FrameRequestCallback>();
beforeEach(() => {
  now = 0; sequence = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++sequence; frames.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  mock.state = { data: emptySnapshot(), backend: 'test', readonly: false,
    update: vi.fn(async (fn: any) => { mock.state.data = validateSnapshot(fn(mock.state.data)); return true; }),
    memoryConfig: vi.fn(async (mode: MemoryMode, config: MemoryConfig) => { mock.state.data.settings.memory[mode] = config; return true; }),
    addSession: vi.fn(async (record: any, progress = false) => {
      mock.state.data.sessions.push({ ...record, id: String(mock.state.data.sessions.length + 1), createdAt: Date.now() });
      if (progress) mock.state.data.progression = advanceProgression(mock.state.data.progression, record.correct === record.total, record.eligible);
      return true;
    }),
    importData: vi.fn(async (incoming: any) => { mock.state.data = mergeSnapshots(mock.state.data, incoming); return true; }),
  };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function frame(next: number) {
  now = next; const pending = [...frames.values()]; frames.clear();
  act(() => pending.forEach(callback => callback(next)));
}
async function click(name: string) { await act(async () => fireEvent.click(screen.getByRole('button', { name }))); }
async function startMemory(mode: MemoryMode, config: Partial<MemoryConfig>) {
  Object.assign(mock.state.data.settings.memory[mode], { count: 3, rounds: 1, interval: 200 }, config);
  const view = render(<MemoryScreen mode={mode} onExit={() => {}} />);
  await click('Začít trénink Space');
  return view;
}
function exposeSequence(count: number, interval: number) {
  const shown: string[] = []; frame(now);
  for (let i = 0; i < count; i++) {
    shown.push(screen.getByRole('img').getAttribute('alt')!);
    frame(now + interval);
  }
  return shown;
}
async function pick(cards: CardId[]) {
  for (const id of cards) await click('Vybrat ' + cardName(id));
  await click('Vyhodnotit');
}
describe('independent memory UI journeys with controlled monotonic frames', () => {
  it.each([200, 500, 2000])('completes a clean three-card interval %d without skips or first-frame pauses', async interval => {
    await startMemory('sequence', { interval });
    expect(screen.queryByRole('img')).toBeNull();
    expect(exposeSequence(3, interval)).toEqual(CARD_IDS.slice(0, 3).map(cardName));
    await pick(CARD_IDS.slice(0, 3));
    expect(screen.getByRole('heading', { name: 'Výborně. Všechno sedí.' })).toBeTruthy();
    expect(mock.state.data.sessions[0]).toMatchObject({ correct: 3, total: 3, memorizeMs: interval * 3, eligible: true });
  });
  it('reconstructs all 52 distinct cards from the complete bank', async () => {
    await startMemory('sequence', { count: 52 });
    expect(new Set(exposeSequence(52, 200)).size).toBe(52);
    expect(screen.getAllByRole('button', { name: /^Vybrat / })).toHaveLength(52);
    await pick(CARD_IDS);
    expect(mock.state.data.sessions[0]).toMatchObject({ correct: 52, total: 52, count: 52 });
  });
  it.each(['reverse', 'position', 'missing'] as const)('scores the %s variant using its intended target', async recall => {
    await startMemory('sequence', { recall });
    exposeSequence(3, 200);
    if (recall === 'missing') {
      expect(screen.getByRole('img', { name: cardName('2S') })).toBeTruthy();
      expect(screen.getByRole('img', { name: cardName('3S') })).toBeTruthy();
    }
    await pick(recall === 'reverse' ? ['3S', '2S', 'AS'] : ['AS']);
    expect(mock.state.data.sessions[0]).toMatchObject({ correct: recall === 'reverse' ? 3 : 1, variant: recall });
  });
  it('records wrong positions and advances a configured progressive full-recall level only after a perfect round', async () => {
    await startMemory('sequence', { progressive: true, start: 2, increment: 1, required: 1, rounds: 2 });
    exposeSequence(2, 200); await pick(['AS', '2S']);
    expect(mock.state.data.progression.level).toBe(3);
    await click('Další kolo');
    expect(exposeSequence(3, 200)).toHaveLength(3);
    await pick(['AS', '3S', '2S']);
    expect(mock.state.data.sessions[1]).toMatchObject({ correct: 1, total: 3 });
    expect(mock.state.data.progression.level).toBe(3);
    expect(screen.getByRole('heading', { name: 'Každá chyba je vodítko.' })).toBeTruthy();
  });
  it('transforms cut then explicit deal/gather and records the operation context', async () => {
    await startMemory('shuffle', { count: 4, operations: [{ type: 'cut', count: 1 }, { type: 'deal', piles: 2, order: [1, 0] }] });
    exposeSequence(4, 200); await pick(['3S', 'AS', '2S', '4S']);
    expect(mock.state.data.sessions[0]).toMatchObject({ correct: 4, total: 4, variant: 'full' });
    expect(mock.state.data.sessions[0].summary).toContain('2 → 1');
  });
  it('accepts missing cards in either order and hides every exposed card on recall', async () => {
    await startMemory('missing', { suit: 'H', from: 0, to: 4, missingCount: 2, displayMs: 500 });
    frame(0); expect(screen.getAllByRole('img').map(img => img.getAttribute('alt'))).toEqual((['3H', '4H', '5H'] as CardId[]).map(cardName));
    frame(500); expect(screen.queryByRole('img', { name: cardName('3H') })).toBeNull();
    await pick(['2H', 'AH']);
    expect(mock.state.data.sessions[0]).toMatchObject({ correct: 2, total: 2, variant: 'unordered' });
  });
  it.each(['full', 'card', 'find'] as const)('completes visual %s and records only the answered count', async visualKind => {
    const view = await startMemory('visual', { count: 8, visualKind, displayMs: 500 });
    frame(0);
    const columns = (view.container.querySelector('.memory-grid') as HTMLElement).style.gridTemplateColumns.match(/repeat\((\d+)/)![1];
    expect(screen.getAllByRole('img')).toHaveLength(8);
    frame(500);
    if (visualKind === 'find') {
      expect((view.container.querySelector('.position-grid') as HTMLElement).style.gridTemplateColumns).toContain('repeat(' + columns);
      await click('1'); await click('Vyhodnotit');
    } else {
      if (visualKind === 'full') expect((view.container.querySelector('.recall-slots') as HTMLElement).style.gridTemplateColumns).toContain('repeat(' + columns);
      await pick(visualKind === 'full' ? CARD_IDS.slice(0, 8) : ['AS']);
    }
    expect(mock.state.data.sessions[0]).toMatchObject({ correct: visualKind === 'full' ? 8 : 1, count: visualKind === 'full' ? 8 : 1, variant: visualKind });
  });
  it('never records an abandoned exposure or invokes its stale finish callback', async () => {
    await startMemory('sequence', {});
    frame(0); await click('Ukončit kolo'); frame(6000);
    expect(mock.state.data.sessions).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Sekvence' })).toBeTruthy();
  });
});
describe('independent Hi-Lo checkpoint journeys', () => {
  async function begin(kind: 'running' | 'true', checkpoint = 1, rounds = 2, start = 3) {
    Object.assign(mock.state.data.settings.hilo, { kind, checkpoint, rounds, start, interval: 200 });
    render(<CountingScreen onExit={() => {}} />);
    await click('Spustit počítání'); await click('Začít rozdávání');
  }
  async function answer(value: string, kind = 'running') {
    fireEvent.change(screen.getByRole('spinbutton', { name: kind === 'running' ? 'Tvůj count (celé číslo)' : 'Tvůj true count (jedno desetinné místo)' }), { target: { value } });
    await click('Vyhodnotit');
  }
  it('carries the previous count across checkpoints and persists two distinct scored questions', async () => {
    await begin('running'); exposeSequence(1, 200); await answer('2');
    expect(mock.state.data.sessions[0].correct).toBe(1);
    await click('Další otázka'); exposeSequence(1, 200); await answer('3');
    expect(mock.state.data.sessions[1].correct).toBe(1);
    await click('Dokončit');
    expect(screen.getByText('2 / 2', { exact: true })).toBeTruthy();
  });
  it('rounds true count to one decimal using remaining cards', async () => {
    await begin('true', 1, 1, 3); exposeSequence(1, 200); await answer('2.0', 'true');
    expect(mock.state.data.sessions[0]).toMatchObject({ correct: 1, variant: 'true' });
  });
  it('keeps a completed deck balanced and explicitly resets the next shoe', async () => {
    await begin('running', 52, 2, 7); exposeSequence(52, 200); await answer('7');
    await click('Další otázka');
    expect(screen.getByRole('heading', { name: 'Nový shoe' })).toBeTruthy();
    expect(screen.getByText('+7', { exact: true })).toBeTruthy();
  });
  it('does not score undefined true count at an empty shoe', async () => {
    await begin('true', 52, 1, 0); exposeSequence(52, 200);
    expect(screen.getByRole('heading', { name: 'Shoe je prázdný' })).toBeTruthy();
    expect(screen.getByText(/Tato otázka se nehodnotí/)).toBeTruthy();
    expect(mock.state.data.sessions).toHaveLength(0);
  });
});
describe('backup input integration', () => {
  it('rejects invalid backup atomically and previews then merges a valid one', async () => {
    render(<SettingsScreen />);
    const input = screen.getByLabelText('Soubor zálohy');
    await act(async () => fireEvent.change(input, { target: { files: [{ size: 15, text: async () => '{"version":999}' }] } }));
    expect(screen.getByRole('alert').textContent).toContain('nepodporovanou verzi');
    expect(mock.state.importData).not.toHaveBeenCalled();
    const incoming = emptySnapshot(); incoming.pao['2H'] = { person: 'QA postava', action: '', object: '', updatedAt: Date.now() };
    await act(async () => fireEvent.change(input, { target: { files: [{ size: 1000, text: async () => JSON.stringify(incoming) }] } }));
    expect(screen.getByRole('dialog', { name: 'Sloučit zálohu' })).toBeTruthy();
    await click('Sloučit data');
    expect(mock.state.data.pao['2H'].person).toBe('QA postava');
    expect(screen.getByRole('status').textContent).toContain('sloučena');
  });
});
