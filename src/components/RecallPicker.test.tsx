// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { RecallPicker } from './RecallPicker';
import type { CardId } from '../engine/cards';
afterEach(cleanup);
function Harness() { const [answer, setAnswer] = useState<(CardId | null)[]>([null, null]); return <RecallPicker answer={answer} onChange={setAnswer} />; }
describe('accessible recall placement', () => {
  it('selects empty slots, fills from all 52 cards, swaps, removes separately and undoes', () => {
    render(<Harness />);
    expect(screen.getAllByRole('button', { name: /^Vybrat / })).toHaveLength(52);
    expect(screen.getByRole('button', { name: 'Pozice 1, prázdná' }).getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Vybrat Eso piky' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vybrat Král srdce' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pozice 1, Eso piky' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prohodit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pozice 2, Král srdce' }));
    expect(screen.getByRole('button', { name: 'Pozice 1, Král srdce' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Odebrat' }));
    expect(screen.getByRole('button', { name: 'Pozice 2, prázdná' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Vybrat Eso piky' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Zpět' }));
    expect(screen.getByRole('button', { name: 'Pozice 2, Eso piky' })).toBeTruthy();
  });
});
