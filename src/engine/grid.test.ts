import { describe, expect, it } from 'vitest';
import { fitGrid } from './grid';
describe('simultaneous card grid',()=>{
  it('fits every supported card count on phone and desktop',()=>{
    for(const [w,h] of [[354,626],[1392,770],[732,820]]) for(let count=1;count<=52;count++) {
      const grid=fitGrid(count,w,h,4);expect(grid.width).toBeLessThanOrEqual(w);expect(grid.height).toBeLessThanOrEqual(h);expect(grid.cardWidth).toBeGreaterThanOrEqual(28);expect(grid.rows*grid.columns).toBeGreaterThanOrEqual(count);
    }
  });
  it('keeps requested geometry when legible and adapts a full deck',()=>{
    expect(fitGrid(8,354,626,4).columns).toBe(4);expect(fitGrid(52,354,626,4).columns).toBeGreaterThan(4);expect(fitGrid(52,1392,770,4).columns).toBeGreaterThan(4);
  });
  it('rejects unusable viewports instead of timing hidden cards',()=>{expect(()=>fitGrid(52,120,110,4)).toThrow();});
});
