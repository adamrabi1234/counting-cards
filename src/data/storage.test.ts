import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { SnapshotStorage, type StorageLike } from './storage';
import { emptySnapshot, mergeSnapshots, parseImport, validateSnapshot } from './schema';
import { blankAssociation } from '../engine/pao';
const memoryLocal=():StorageLike=>{const values=new Map<string,string>();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);}};};
describe('validated durable snapshots',()=>{
  it('keeps using a chosen fallback consistently across reloads', async () => {
    const local = memoryLocal();
    const factory = { open: () => { throw new Error('Temporarily unavailable'); } } as unknown as IDBFactory;
    const storage = new SnapshotStorage(factory, local);
    await storage.load();
    await storage.mutate(s => ({ ...s, pao: { AS: { ...blankAssociation(), object: 'Kompas' } } }));
    const working = new IDBFactory(); factory.open = working.open.bind(working);
    const loaded = await storage.load();
    expect(loaded.backend).toBe('localStorage'); expect(loaded.snapshot.pao.AS?.object).toBe('Kompas');
  });
  it('accepts empty PAO and independent partial associations',()=>{
    const s=emptySnapshot();s.pao.AH={...blankAssociation(),object:'Kolo'};expect(validateSnapshot(s).pao.AH?.object).toBe('Kolo');
    expect(()=>parseImport('{broken')).toThrow();expect(()=>validateSnapshot({...s,version:2})).toThrow();expect(()=>validateSnapshot({...s,pao:{ZZ:blankAssociation()}})).toThrow();
    expect(()=>validateSnapshot({...s,sessions:[{id:'x',mode:'pao',createdAt:0,correct:2,total:1,durationMs:0,eligible:true}]})).toThrow();
  });
  it('merges without deleting unrelated PAO, deduplicates session IDs',()=>{
    const a=emptySnapshot(),b=emptySnapshot();a.pao.AH={...blankAssociation(),person:'Ada',updatedAt:10};b.pao.KS={...blankAssociation(),action:'běží',updatedAt:20};
    b.pao.AH={...blankAssociation(),person:'Staré',updatedAt:5};
    const record={id:'same',mode:'sequence' as const,createdAt:1,correct:1,total:1,durationMs:10,eligible:true};a.sessions=[record];b.sessions=[record];
    const merged=mergeSnapshots(a,b);expect(merged.pao.AH?.person).toBe('Ada');expect(merged.pao.KS?.action).toBe('běží');expect(merged.sessions).toHaveLength(1);
  });
  it('persists changes across instances and serializes concurrent transactions',async()=>{
    const factory=new IDBFactory(),a=new SnapshotStorage(factory),b=new SnapshotStorage(factory);await a.load();await b.load();
    await Promise.all([a.mutate(s=>({...s,pao:{...s.pao,AH:{...blankAssociation(),person:'Ada'}}})),b.mutate(s=>({...s,pao:{...s.pao,KS:{...blankAssociation(),object:'Klíč'}}}))]);
    const loaded=await b.load();expect(loaded.snapshot.pao.AH?.person).toBe('Ada');expect(loaded.snapshot.pao.KS?.object).toBe('Klíč');expect(loaded.snapshot.revision).toBe(2);a.close();b.close();
  });
  it('does not overwrite unsupported newer data',async()=>{
    const local=memoryLocal();const original=JSON.stringify({...emptySnapshot(),version:2});local.setItem('counting-cards:snapshot:v1',original);
    const s=new SnapshotStorage(undefined,local);const result=await s.load();expect(result.readonly).toBe(true);expect(result.recovery).toBe(false);
    await expect(s.mutate(v=>v)).rejects.toThrow();expect(local.getItem('counting-cards:snapshot:v1')).toBe(original);
  });
  it('recovers a prior valid backup and preserves malformed primary',async()=>{
    const local=memoryLocal(),backup=emptySnapshot();backup.pao.AH={...blankAssociation(),person:'Ada'};local.setItem('counting-cards:snapshot:v1','{bad');local.setItem('counting-cards:backup:v1',JSON.stringify(backup));
    const s=new SnapshotStorage(undefined,local),result=await s.load();expect(result.recovery).toBe(true);expect(result.snapshot.pao.AH?.person).toBe('Ada');expect(local.getItem('counting-cards:snapshot:v1')).toBe('{bad');
    await s.recover();expect(local.getItem('counting-cards:rejected:v1')).toBe('{bad');expect((await s.load()).readonly).toBe(false);
  });
  it('surfaces quota failures and keeps the valid primary intact',async()=>{
    const original=JSON.stringify(emptySnapshot());const local:StorageLike={getItem:k=>k.includes('snapshot')?original:null,setItem:()=>{throw new Error('QuotaExceeded');}};
    const s=new SnapshotStorage(undefined,local);await s.load();await expect(s.mutate(v=>({...v,pao:{AH:{...blankAssociation(),person:'Ada'}}}))).rejects.toThrow('QuotaExceeded');expect(local.getItem('counting-cards:snapshot:v1')).toBe(original);
  });
});
