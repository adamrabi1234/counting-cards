import { create } from 'zustand';
import { uniqueId, type CardId } from '../engine/cards';
import type { Association } from '../engine/pao';
import { SnapshotStorage } from './storage';
import { emptySnapshot, mergeSnapshots, type MemoryConfig, type MemoryMode, type SessionRecord, type Snapshot } from './schema';
import { advanceProgression } from '../engine/memory';
let local: Storage | undefined;
try { local = typeof window !== 'undefined' ? window.localStorage : undefined; } catch { /* Storage status exposes this. */ }
const storage = new SnapshotStorage(typeof indexedDB === 'undefined' ? undefined : indexedDB, local);
let queue: Promise<unknown> = Promise.resolve();
let unsaved: ((current: Snapshot) => Snapshot)[] = [];
let channel: BroadcastChannel | undefined;
try { if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel('counting-cards-data'); } catch { /* Cross-tab sync is optional; transactions still serialize writes. */ }
interface AppStore {
  data: Snapshot; ready: boolean; saving: number; error: string | null; notice: string | null; readonly: boolean; recovery: boolean; backend: string; raw?: unknown;
  initialize(): Promise<void>;
  update(fn: (current: Snapshot) => Snapshot): Promise<boolean>;
  savePao(id: CardId, association: Association): Promise<boolean>;
  addSession(record: Omit<SessionRecord, 'id' | 'createdAt'>, progress?: boolean): Promise<boolean>;
  memoryConfig(mode: MemoryMode, config: MemoryConfig): Promise<boolean>;
  importData(incoming: Snapshot): Promise<boolean>;
  recover(): Promise<boolean>;
  dismiss(): void;
}
export const useApp = create<AppStore>((set, get) => ({
  data: emptySnapshot(), ready: false, saving: 0, error: null, notice: null, readonly: false, recovery: false, backend: '',
  async initialize() {
    const result = await storage.load();
    set({ data: result.snapshot, ready: true, error: result.warning ?? null, readonly: result.readonly, recovery: result.recovery, backend: result.backend, raw: result.raw });
  },
  async update(fn) {
    if (get().readonly) { set({ error: 'Data jsou chráněna před přepsáním. Nejprve použij obnovu v Nastavení.' }); return false; }
    // Keep the unsaved draft exportable when persistence fails.
    const draft = fn(get().data);
    set(state => ({ data: draft, saving: state.saving + 1 }));
    let success = false;
    const task = queue.then(async () => {
      unsaved.push(fn);
      try {
        const saved = await storage.mutate(current => unsaved.reduce((value, change) => change(value), current));
        unsaved = [];
        set(state => ({ data: state.saving <= 1 ? saved : state.data, error: null }));
        channel?.postMessage(saved.revision); success = true;
      } catch (error) { set({ error: `Neuloženo: ${error instanceof Error ? error.message : 'Zápis selhal.'} Rozpracovaná data můžeš exportovat v Nastavení.` }); }
      finally { set(state => ({ saving: Math.max(0, state.saving - 1) })); }
    });
    queue = task.catch(() => undefined);
    await task; return success;
  },
  savePao(id, association) { return get().update(current => ({ ...current, pao: { ...current.pao, [id]: { ...association, person: association.person.trim(), action: association.action.trim(), object: association.object.trim(), updatedAt: Date.now() } } })); },
  addSession(record, progress = false) {
    const session: SessionRecord = { ...record, id: uniqueId(), createdAt: Date.now() };
    return get().update(current => ({ ...current, sessions: [...current.sessions, session], progression: progress ? advanceProgression(current.progression, record.total > 0 && record.correct === record.total, record.eligible) : current.progression }));
  },
  memoryConfig(mode, config) { return get().update(current => ({ ...current, settings: { ...current.settings, memory: { ...current.settings.memory, [mode]: config } } })); },
  importData(incoming) { return get().update(current => mergeSnapshots(current, incoming)); },
  async recover() {
    try { const data = await storage.recover(); set({ data, recovery: false, readonly: false, raw: undefined, error: null, notice: 'Poslední platná záloha byla obnovena.' }); return true; }
    catch (e) { set({ error: `Obnova se nezdařila: ${e instanceof Error ? e.message : 'Chyba úložiště'}` }); return false; }
  },
  dismiss() { set({ notice: null }); },
}));
if (channel) channel.onmessage = async () => {
  const state = useApp.getState();
  if (!state.ready || state.saving || state.error) return;
  const result = await storage.load();
  if (result.snapshot.revision > state.data.revision) useApp.setState({ data: result.snapshot });
};
