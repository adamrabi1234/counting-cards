import { emptySnapshot, validateSnapshot, type Snapshot } from './schema';
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface LoadResult { snapshot: Snapshot; warning?: string; recovery: boolean; readonly: boolean; backend: 'IndexedDB' | 'localStorage' | 'paměť'; raw?: unknown }
const MAIN = 'counting-cards:snapshot:v1', BACKUP = 'counting-cards:backup:v1';
function safe(value: unknown): Snapshot | null { try { return validateSnapshot(value); } catch { return null; } }
function decoded(text: string | null): unknown { if (text === null) return undefined; try { return JSON.parse(text); } catch { return text; } }
function newer(value: unknown) { return !!value && typeof value === 'object' && 'version' in value && typeof value.version === 'number' && value.version > 1; }
export class SnapshotStorage {
  private db: IDBDatabase | null = null;
  private fallback = false;
  private locked = false;
  private volatile = false;
  private recoveryValue: Snapshot | null = null;
  constructor(private factory?: IDBFactory, private local?: StorageLike, private dbName = 'counting-cards-v1') {}
  private open(): Promise<IDBDatabase> {
    if (!this.factory) return Promise.reject(new Error('IndexedDB není k dispozici.'));
    return new Promise((resolve, reject) => {
      const request = this.factory!.open(this.dbName, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('snapshots')) request.result.createObjectStore('snapshots'); };
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Databázi blokuje jiná otevřená verze aplikace.'));
    });
  }
  private read(key: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('snapshots', 'readonly'), request = tx.objectStore('snapshots').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async load(): Promise<LoadResult> {
    let primary: unknown, backup: unknown;
    try {
      if (this.fallback) throw new Error('Pokračovat ve zvoleném náhradním úložišti.');
      this.db ??= await this.open();
      [primary, backup] = await Promise.all([this.read('primary'), this.read('backup')]);
    } catch {
      this.fallback = true;
      try {
        if (!this.local) throw new Error('Úložiště chybí.');
        primary = decoded(this.local.getItem(MAIN)); backup = decoded(this.local.getItem(BACKUP));
      } catch { this.volatile = true; }
    }
    const backend = this.volatile ? 'paměť' : this.fallback ? 'localStorage' : 'IndexedDB';
    if (this.volatile) return { snapshot: emptySnapshot(), backend, readonly: false, recovery: false, warning: 'Úložiště není dostupné. Změny zůstanou jen v této kartě prohlížeče; stáhni si zálohu.' };
    const valid = safe(primary);
    this.recoveryValue = safe(backup);
    if (primary === undefined) return { snapshot: emptySnapshot(), backend, readonly: false, recovery: false };
    if (valid) return { snapshot: valid, backend, readonly: false, recovery: false };
    this.locked = true;
    const future = newer(primary);
    return { snapshot: this.recoveryValue ?? emptySnapshot(), backend, readonly: true, recovery: !future && !!this.recoveryValue, raw: primary,
      warning: future ? 'Uložená data vytvořila novější verze aplikace. Zachováváme je beze změny. Obnov stránku po aktualizaci nebo stáhni původní data.' : 'Hlavní data se nepodařilo ověřit. Původní obsah je zachovaný. Můžeš stáhnout data a obnovit poslední platnou zálohu.' };
  }
  async mutate(update: (current: Snapshot) => Snapshot): Promise<Snapshot> {
    if (this.locked) throw new Error('Zápis je pozastavený, aby se původní data nepřepsala. Použij obnovu nebo export.');
    if (this.volatile) throw new Error('Data se neuložila. Úložiště je nedostupné; stáhni zálohu.');
    if (this.fallback) {
      const raw = decoded(this.local!.getItem(MAIN));
      const current = raw === undefined ? emptySnapshot() : validateSnapshot(raw);
      const next = validateSnapshot({ ...update(current), revision: current.revision + 1, updatedAt: Date.now() });
      this.local!.setItem(BACKUP, JSON.stringify(current));
      this.local!.setItem(MAIN, JSON.stringify(next));
      return next;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('snapshots', 'readwrite'), store = tx.objectStore('snapshots');
      let next: Snapshot;
      let failure: unknown;
      const request = store.get('primary');
      request.onsuccess = () => {
        try {
          const current = request.result === undefined ? emptySnapshot() : validateSnapshot(request.result);
          next = validateSnapshot({ ...update(current), revision: current.revision + 1, updatedAt: Date.now() });
          store.put(current, 'backup'); store.put(next, 'primary');
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(next);
      tx.onerror = () => reject(failure ?? tx.error ?? new Error('Data se neuložila.'));
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('Ukládání bylo přerušeno.'));
    });
  }
  async recover(): Promise<Snapshot> {
    if (!this.recoveryValue) throw new Error('Platná záloha není dostupná.');
    const recovery = this.recoveryValue;
    if (this.fallback) {
      const raw = this.local!.getItem(MAIN);
      if (raw) this.local!.setItem('counting-cards:rejected:v1', raw);
      this.local!.setItem(MAIN, JSON.stringify(recovery));
    } else {
      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction('snapshots', 'readwrite'), store = tx.objectStore('snapshots'), request = store.get('primary');
        request.onsuccess = () => { store.put(request.result, 'rejected'); store.put(recovery, 'primary'); };
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });
    }
    this.locked = false;
    return recovery;
  }
  close() { this.db?.close(); }
}
