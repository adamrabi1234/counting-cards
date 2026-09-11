// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useExposure } from './useExposure';
let time = 0, nextId = 1, frames = new Map<number, FrameRequestCallback>();
beforeEach(() => {
  time = 0; nextId = 1; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => time);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = nextId++; frames.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function frame(now: number) { time = now; const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach(f => f(now))); }
function Harness({ finish }: { finish: (r: { elapsed: number; eligible: boolean }) => void }) { const clock = useExposure(3, 200, finish); return <output>{clock.index}:{String(clock.paused)}</output>; }
it('advances each foreground card at its absolute deadline and finishes exactly once', () => {
  const finish = vi.fn(); render(<Harness finish={finish} />);
  frame(0);
  frame(199); expect(screen.getByText('0:false')).toBeTruthy();
  frame(200); expect(screen.getByText('1:false')).toBeTruthy();
  frame(400); expect(screen.getByText('2:false')).toBeTruthy();
  frame(600); expect(finish).toHaveBeenCalledWith({ elapsed: 600, eligible: true });
  frame(800); expect(finish).toHaveBeenCalledOnce();
});
it('cancels all callbacks when leaving a timed round', () => {
  const finish = vi.fn(); const view = render(<Harness finish={finish} />); view.unmount();
  frame(1000); expect(finish).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
});
it('pauses hidden-tab exposure without completing or skipping the first card', () => {
  const finish = vi.fn(); render(<Harness finish={finish} />);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  frame(5000); expect(screen.getByText('0:true')).toBeTruthy(); expect(finish).not.toHaveBeenCalled();
});

it('starts exposure at the first ready frame even after a slow initial render', () => {
  const finish = vi.fn(); render(<Harness finish={finish} />);
  frame(1049); expect(screen.getByText('0:false')).toBeTruthy();
  frame(1249); expect(screen.getByText('1:false')).toBeTruthy();
  frame(1449); expect(screen.getByText('2:false')).toBeTruthy();
  frame(1649); expect(finish).toHaveBeenCalledWith({ elapsed: 600, eligible: true });
});
