import { describe, expect, it } from 'vitest';
import { latestMastery, modeStats } from './progress';
import { blankAssociation } from './pao';
import type { Mode, SessionRecord } from '../data/schema';
const record = (mode: Mode, variant: string, total: number, count = total): SessionRecord => ({ id: `${variant}-${count}`, mode, variant, count, total, correct: total, eligible: true, createdAt: 1, durationMs: 100 });
describe('comparable memory records', () => {
  it('does not label a cleared association as mastered', () => {
    const learned: SessionRecord = { ...record('pao', 'forward', 1), pao: { cardId: 'AS', correct: true } };
    expect(latestMastery([learned], { AS: blankAssociation() })).toBe(0);
    expect(latestMastery([learned], { AS: { ...blankAssociation(), object: 'Kompas' } })).toBe(1);
  });
  for (const mode of ['sequence', 'visual', 'shuffle'] as const) it(`${mode} does not count one-position answers as a full-deck record, including older records`, () => {
    const result = modeStats([record(mode, 'position', 1, 52), record(mode, 'card', 1, 52), record(mode, 'first', 3, 52), record(mode, 'full', 8)], mode);
    expect(result.best).toBe(8); expect(result.rounds).toBe(4); expect(result.accuracy).toBe(100);
  });
});
