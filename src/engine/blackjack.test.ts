import { describe, expect, it } from 'vitest';
import { card, CARD_IDS, runningCount, type CardId, type PhysicalCard } from './cards';
import { createTable, dealHand, DEFAULT_RULES, handValue, ids, legalActions, natural, playAction, recommend, tableActions, type Rules, value } from './blackjack';
const r = DEFAULT_RULES;
const fixed=(names:CardId[]):PhysicalCard[]=>names.map((id,i)=>({...card(id),uid:`test:${i}`}));
describe('basic strategy from rule matrices',()=>{
  it.each([
    [['10H','6S'],'AS',{},'surrender'],
    [['10H','6S'],'AS',{surrender:false},'hit'],
    [['10H','5S'],'10S',{},'surrender'],
    [['10H','7S'],'AS',{h17:true},'surrender'],
    [['8H','8S'],'AS',{h17:false},'split'],
    [['8H','8S'],'AS',{h17:true},'surrender'],
    [['AH','7S'],'2S',{h17:false},'stand'],
    [['AH','7S'],'2S',{h17:true},'double'],
    [['AH','7S'],'2S',{h17:true,double:'10-11'},'stand'],
    [['6H','5S'],'AS',{h17:false},'hit'],
    [['6H','5S'],'AS',{h17:true},'double'],
    [['4H','4S'],'5S',{das:true},'split'],
    [['4H','4S'],'5S',{das:false},'hit'],
    [['4H','4S'],'5S',{decks:1,das:false},'double'],
    [['4H','4S'],'5S',{decks:1,das:false,double:'none'},'hit'],
  ] as [CardId[],CardId,Partial<Rules>,string][])('%j versus%s with%j =>%s',(hand,dealer,changes,answer)=>{
    expect(recommend(hand,dealer,{...r,...changes}).action).toBe(answer);
  });
  it('never recommends an illegal action over every two-card hand and rule family',()=>{
    for(const decks of [1,2,4,6,8] as const) for(const h17 of [false,true]) for(const double of ['any','9-11','10-11','none'] as const) for(const das of [false,true]) {
      const rules={...r,decks,h17,double,das};
      for(const a of CARD_IDS.slice(0,13)) for(const b of CARD_IDS.slice(13,26)) for(const d of CARD_IDS.slice(26,39)) {
        const legal=legalActions([a,b],rules);
        if(legal.length) expect(legal).toContain(recommend([a,b],d,rules).action);
      }
    }
  });
  it('falls back when split or double is restricted',()=>{
    expect(legalActions(['8H','8S'],r,{fromSplit:true,hands:4})).not.toContain('split');
    expect(recommend(['8H','8S'],'10S',r,{fromSplit:true,hands:4}).action).toBe('hit');
    expect(legalActions(['AH','AS'],r,{fromSplit:true,splitAces:true,hands:2})).toEqual(['stand']);
    expect(recommend(['AH','AS'],'6S',{...r,resplitAces:true},{fromSplit:true,splitAces:true,hands:2}).action).toBe('split');
  });
});
describe('finite blackjack table',()=>{
  it('values aces and recognizes naturals only before split',()=>{
    expect(handValue(['AH','AS','9D'])).toEqual({total:21,soft:true,bust:false});
    expect(handValue(['AH','6S','10D'])).toEqual({total:17,soft:false,bust:false});
    expect(natural(['AH','KS'])).toBe(true); expect(natural(['AH','KS'],true)).toBe(false); expect(value('Q')).toBe(10);
  });
  it('excludes hole card until reveal, then counts it exactly once',()=>{
    const state=dealHand(createTable(r,fixed(['10H','6D','7S','10C','5H'])));
    expect(state.count).toBe(0); expect(state.holeRevealed).toBe(false);
    const done=playAction(state,'stand'); expect(done.phase).toBe('done'); expect(done.holeRevealed).toBe(true);
    expect(done.count).toBe(runningCount(ids(done.shoe.slice(0,done.cursor)))); expect(state.cursor).toBe(4);
  });
  it('dealer hits soft17 only with H17',()=>{
    const ordered=fixed(['10H','AS','7S','6C','4D']);
    const s=playAction(dealHand(createTable({...r,h17:false},ordered)),'stand');
    const h=playAction(dealHand(createTable({...r,h17:true},ordered)),'stand');
    expect(s.cursor).toBe(4); expect(h.cursor).toBe(5); expect(handValue(ids(h.dealer)).total).toBe(21);
  });
  it('resolves dealer peek and simultaneous naturals before actions',()=>{
    const s=dealHand(createTable(r,fixed(['AH','AS','KS','10C'])));
    expect(s.phase).toBe('done'); expect(s.hands[0].outcome).toBe('push'); expect(s.count).toBe(-4); expect(tableActions(s)).toEqual([]);
  });
  it('double gets exactly one card and records two units',()=>{
    const s=dealHand(createTable(r,fixed(['5H','10D','6S','7C','10H'])));
    const done=playAction(s,'double'); expect(done.hands[0].cards).toHaveLength(3); expect(done.hands[0].stake).toBe(2); expect(done.hands[0].outcome).toBe('win'); expect(done.hands[0].units).toBe(2);
  });
  it('splits into two independently played hands without losing a card',()=>{
    let s=dealHand(createTable(r,fixed(['8H','10D','8S','7C','2H','3S','9C'])));
    s=playAction(s,'split'); expect(s.hands).toHaveLength(2); expect(s.active).toBe(0); expect(s.cursor).toBe(6);
    s=playAction(s,'stand'); expect(s.phase).toBe('playing'); expect(s.active).toBe(1);
    s=playAction(s,'double'); expect(s.phase).toBe('done'); expect(new Set(s.hands.flatMap(h=>h.cards.map(c=>c.uid))).size).toBe(5);
  });
  it('split aces receive one card and21 is a normal win',()=>{
    let s=dealHand(createTable(r,fixed(['AH','10D','AS','7C','KH','3S'])));
    s=playAction(s,'split'); expect(s.phase).toBe('done'); expect(s.hands[0].outcome).toBe('win'); expect(s.hands[0].units).toBe(1); expect(s.cursor).toBe(6);
  });
  it('late surrender loses half a unit, reveals hole, and does not draw dealer',()=>{
    const s=playAction(dealHand(createTable(r,fixed(['10H','6D','6S','10C']))),'surrender');
    expect(s.hands[0].units).toBe(-.5); expect(s.cursor).toBe(4); expect(s.holeRevealed).toBe(true);
  });
});
