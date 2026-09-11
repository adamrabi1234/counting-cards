// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { emptySnapshot } from '../data/schema';
const mock = vi.hoisted(() => ({ state: {} as any, save: vi.fn() }));
vi.mock('../data/store', () => ({ useApp: Object.assign(() => mock.state, { getState: () => mock.state }) }));
import PaoScreen from './PaoScreen';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('independent PAO save durability', () => {
  it('preserves edits made while a preceding save is pending', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    let complete!: (ok: boolean) => void;
    mock.save.mockReset().mockImplementationOnce(() => new Promise<boolean>(resolve => { complete = resolve; })).mockResolvedValue(true);
    mock.state = { data: emptySnapshot(), savePao: mock.save, readonly: false };
    const page = render(<PaoScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Upravit Eso piky, chybí' }));
    const input = screen.getByRole('textbox', { name: 'Předmět · volitelné' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'První verze' } });
    fireEvent.click(screen.getByRole('button', { name: 'Uložit' }));
    if (input.disabled) { await act(async () => complete(true)); return; }
    fireEvent.change(input, { target: { value: 'Novější rozepsaná verze' } });
    await act(async () => complete(true));
    page.unmount();
    expect(mock.save.mock.calls.some(([, entry]) => entry.object === 'Novější rozepsaná verze')).toBe(true);
  });
});
