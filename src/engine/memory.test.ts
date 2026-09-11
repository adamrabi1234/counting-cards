import { describe, expect, it } from 'vitest';
import { CARD_IDS, DECK, hiLo, shuffled, shoe, type CardId } from './cards';
import { advanceProgression, applyOperations, cut, deal, gather, missingPool, missingRound, orderedScore, recallTarget, riffle, unorderedScore } from './memory';
import { blankAssociation, configuredFields, paoCounts, reverseMatches, scorePao } from './pao';
import { ExposureClock } from './timing';
describe('canonical cards and randomization', () => {
  it('has each rank/suit exactly once and a balanced Hi-Lo count', () => {
    expect(DECK).toHaveLength(52); expect(new Set(CARD_IDS).size).toBe(52);
    expect(DECK.reduce((n,c)=>n+hiLo(c),0)).toBe(0);
    for (const decks of [1,2,6,8]) { const s=shoe(decks); expect(s).toHaveLength(decks*52); expect(new Set(s.map(c=>c.uid)).size).toBe(s.length); }
  });
  it('shuffles without changing input or losing cards', () => {
    const input=[...CARD_IDS]; for(let i=0;i<40;i++) expect([...shuffled(input)].sort()).toEqual([...CARD_IDS].sort());
    expect(input).toEqual(CARD_IDS); expect(shuffled([])).toEqual([]); expect(shuffled([1])).toEqual([1]);
    expect(()=>shuffled([1,2],()=>9)).toThrow(); expect(()=>shoe(0)).toThrow();
  });
});
describe('deck transformations', () => {
  it('preserves explicit order for cuts, odd dealing, gather and riffle', () => {
    expect(cut([1,2,3,4,5],2)).toEqual([3,4,5,1,2]); expect(cut([1,2],2)).toEqual([1,2]); expect(cut([1,2],5)).toEqual([2,1]);
    const piles=deal([1,2,3,4,5,6,7],3); expect(piles).toEqual([[1,4,7],[2,5],[3,6]]);
    expect(gather(piles,[2,0,1])).toEqual([3,6,1,4,7,2,5]); expect(()=>gather(piles,[0,0,2])).toThrow();
    expect(riffle([1,2,3,4,5])).toEqual([1,4,2,5,3]); expect(riffle([1,2,3,4,5],'right')).toEqual([4,1,5,2,3]);
    expect(applyOperations([1,2,3,4,5,6],[{type:'cut',count:2},{type:'deal',piles:2,order:[1,0]}])).toEqual([4,6,2,3,5,1]);
  });
  it('conserves every card through operation combinations', () => {
    for(let n=1;n<=52;n++){ const input=CARD_IDS.slice(0,n); const out=applyOperations(input,[{type:'move',count:17},{type:'deal',piles:4,order:[3,1,0,2]},{type:'riffle',first:'right'}]); expect([...out].sort()).toEqual([...input].sort()); }
  });
});
describe('recall, PAO and progression', () => {
  const seq: CardId[]=['AH','2S','KC'];
  it('builds targets without leaking random/missing answers into context', () => {
    expect(recallTarget(seq,'reverse').expected).toEqual(['KC','2S','AH']);
    expect(recallTarget(seq,'position',()=>1)).toEqual({expected:['2S'],positions:[1]});
    expect(recallTarget(seq,'missing',()=>1).context).toEqual(['AH',null,'KC']);
    expect(orderedScore(seq,['AH','KC','2S']).correct).toBe(1);
    expect(orderedScore(CARD_IDS,CARD_IDS).correct).toBe(52);
    expect(unorderedScore(['AH','2S'],['AH','AH']).correct).toBe(1);
    const pool=missingPool('H',0,12); expect(pool).toHaveLength(13);
    const round=missingRound(pool,3); expect(round.visible).toHaveLength(10); expect(new Set([...round.visible,...round.missing]).size).toBe(13);
    expect(()=>missingRound(pool,13)).toThrow();
  });
  it('tests any independent field and normalizes only case/spacing', () => {
    for (const field of ['person','action','object'] as const) {
      const entry={...blankAssociation(),[field]:'  Želí   běží '};
      expect(configuredFields(entry)).toEqual([field]);
      expect(scorePao(entry,{[field]:'želí běží'})[0].correct).toBe(true);
      expect(scorePao(entry,{[field]:'zeli bezi'})[0].correct).toBe(false);
    }
    const a={...blankAssociation(),person:'Ada'};
    expect(paoCounts({AH:a,KS:{...a,action:'píše',object:'program'},QC:blankAssociation()})).toEqual({complete:1,partial:1,configured:2,missing:50});
    expect(reverseMatches({AH:a,AS:a},a)).toEqual(['AH','AS']);
  });
  it('advances only on eligible consecutive perfect rounds and caps at52', () => {
    const p={level:5,streak:0,increment:2,required:2,enabled:true};
    const once=advanceProgression(p,true); expect(once.level).toBe(5); expect(once.streak).toBe(1);
    expect(advanceProgression(once,true).level).toBe(7); expect(advanceProgression(once,false).streak).toBe(0);
    expect(advanceProgression(once,true,false)).toEqual(once);
    expect(advanceProgression({...once,level:51},true).level).toBe(52);
  });
});
describe('exposure clock', () => {
  it('uses exact deadlines rather than accumulating frame drift', () => {
    const c=new ExposureClock(3,1000,50);
    expect(c.tick(1049)).toBe('none'); expect(c.tick(1055)).toBe('advance'); expect(c.index).toBe(1);
    expect(c.tick(2050)).toBe('advance'); expect(c.tick(3050)).toBe('done'); expect(c.elapsed(4000)).toBe(3000); expect(c.eligible).toBe(true);
  });
  it('pauses instead of skipping cards on large gaps; resumes explicitly', () => {
    const c=new ExposureClock(52,200,0);
    expect(c.tick(2000)).toBe('paused'); expect(c.index).toBe(0); expect(c.eligible).toBe(false);
    c.resume(3000); expect(c.tick(3199)).toBe('none'); expect(c.tick(3200)).toBe('advance'); expect(c.elapsed(3200)).toBe(2200);
    expect(c.tick(3400)).toBe('advance');
  });
  it('manual pause preserves remaining exposure time and invalidates speed', () => {
    const c=new ExposureClock(2,1000,0); c.pause(400); c.resume(2400);
    expect(c.tick(2999)).toBe('none'); expect(c.tick(3000)).toBe('advance'); expect(c.tick(4000)).toBe('done'); expect(c.elapsed(8000)).toBe(2000);
  });
});
