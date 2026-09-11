import type { CardId } from './cards';
export const PAO_FIELDS = ['person', 'action', 'object'] as const;
export type PaoField = typeof PAO_FIELDS[number];
export interface Association { person: string; action: string; object: string; updatedAt: number }
export type PaoData = Partial<Record<CardId, Association>>;
export const FIELD_NAMES: Record<PaoField, string> = { person: 'Osoba', action: 'Akce', object: 'Předmět' };
export const blankAssociation = (): Association => ({ person: '', action: '', object: '', updatedAt: Date.now() });
export function configuredFields(entry?: Association): PaoField[] { return entry ? PAO_FIELDS.filter(f => entry[f].trim()) : []; }
export function configured(entry?: Association): boolean { return configuredFields(entry).length > 0; }
export function normalizeAnswer(text: string): string { return text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('cs'); }
export function scorePao(entry: Association, answer: Partial<Record<PaoField, string>>) {
  return configuredFields(entry).map(field => ({ field, expected: entry[field], actual: answer[field] ?? '', correct: normalizeAnswer(entry[field]) === normalizeAnswer(answer[field] ?? '') }));
}
export function reverseMatches(data: PaoData, target: Association): CardId[] {
  const fields = configuredFields(target);
  return (Object.entries(data) as [CardId, Association][]).filter(([, entry]) => fields.length > 0 && fields.every(f => normalizeAnswer(entry[f]) === normalizeAnswer(target[f]))).map(([id]) => id);
}
export function paoCounts(data: PaoData) {
  const counts = Object.values(data).map(configuredFields);
  const complete = counts.filter(fields => fields.length === 3).length, partial = counts.filter(fields => fields.length > 0 && fields.length < 3).length;
  return { complete, partial, configured: complete + partial, missing: 52 - complete - partial };
}
