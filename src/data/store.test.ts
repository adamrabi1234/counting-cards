import { expect, it, vi } from 'vitest';
import { emptySnapshot } from './schema';
import { blankAssociation } from '../engine/pao';
const mock = vi.hoisted(() => ({ persisted: null as any, reject: false }));
vi.mock('./storage', () => ({ SnapshotStorage: class {
  async load() { return { snapshot: mock.persisted, readonly: false, recovery: false, backend: 'test' }; }
  async mutate(change: any) { if (mock.reject) throw new Error('Quota exceeded'); mock.persisted = change(mock.persisted); return mock.persisted; }
} }));
import { useApp } from './store';
it('keeps failed PAO writes exportable and replays them with the next successful transaction', async () => {
  mock.persisted = emptySnapshot(); await useApp.getState().initialize();
  mock.reject = true;
  expect(await useApp.getState().savePao('AS', { ...blankAssociation(), object: 'Kompas' })).toBe(false);
  expect(useApp.getState().data.pao.AS?.object).toBe('Kompas'); expect(mock.persisted.pao.AS).toBeUndefined();
  mock.reject = false;
  expect(await useApp.getState().savePao('KH', { ...blankAssociation(), person: 'Ada' })).toBe(true);
  expect(mock.persisted.pao.AS?.object).toBe('Kompas'); expect(mock.persisted.pao.KH?.person).toBe('Ada');
  expect(useApp.getState().error).toBeNull();
});
