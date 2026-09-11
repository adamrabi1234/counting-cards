import { useEffect, useRef, useState } from 'react';
import { ExposureClock } from '../engine/timing';
export function useExposure(count: number, interval: number, onFinish: (result: { elapsed: number; eligible: boolean }) => void) {
  const [index, setIndex] = useState(0), [paused, setPaused] = useState(false), [fraction, setFraction] = useState(0), [ready, setReady] = useState(false);
  const clock = useRef<ExposureClock | null>(null), callback = useRef(onFinish);
  const pending = useRef({ pause: false, interrupted: false });
  callback.current = onFinish;
  useEffect(() => {
    let raf = 0, stopped = false, c: ExposureClock | null = null;
    clock.current = null; pending.current = { pause: false, interrupted: false };
    setIndex(0); setPaused(false); setFraction(0); setReady(false);
    function frame(now: number) {
      if (stopped) return;
      // Keep faces hidden until the browser can paint. Initial render latency is not exposure.
      if (!c) {
        c = new ExposureClock(count, interval, now); clock.current = c;
        if (pending.current.pause || document.hidden) { c.pause(now); setPaused(true); }
        if (pending.current.interrupted) c.eligible = false;
        setReady(true);
      }
      const event = c.tick(now);
      if (event === 'advance') setIndex(c.index);
      if (event === 'paused') { setPaused(true); if (import.meta.env.DEV) console.info('Exposure interrupted by a delayed frame ' + JSON.stringify({ lateness: c.lateness, frame: now, current: performance.now(), hidden: document.hidden, index: c.index })); }
      if (event === 'done') { callback.current({ elapsed: c.elapsed(now), eligible: c.eligible }); return; }
      setFraction(c.fraction(now)); raf = requestAnimationFrame(frame);
    }
    const visibility = () => { if (document.hidden) { pending.current = { pause: true, interrupted: true }; c?.pause(performance.now()); setPaused(true); } };
    if (document.hidden) visibility();
    raf = requestAnimationFrame(frame); document.addEventListener('visibilitychange', visibility);
    return () => { stopped = true; clock.current = null; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', visibility); };
  }, [count, interval]);
  return {
    index, paused, fraction, ready,
    pause: () => { pending.current = { pause: true, interrupted: true }; clock.current?.pause(performance.now()); setPaused(true); },
    resume: () => { if (!document.hidden) { pending.current.pause = false; clock.current?.resume(performance.now()); setPaused(false); } },
  };
}
