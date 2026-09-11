import { useEffect, useRef } from 'react';
export function useShortcuts(actions: Record<string, (() => void) | undefined>) {
  const ref = useRef(actions); ref.current = actions;
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || el?.closest('input,textarea,select,[contenteditable=true],[role=dialog]')) return;
      // Focused buttons keep their native Enter/Space semantics.
      if ((event.key === 'Enter' || event.key === ' ') && el?.closest('button,a')) return;
      const action = ref.current[event.key.toLowerCase()];
      if (action) { event.preventDefault(); action(); }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);
}
