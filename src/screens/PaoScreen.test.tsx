// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { emptySnapshot } from '../data/schema';
import { blankAssociation } from '../engine/pao';
const mock = vi.hoisted(() => ({ state: {} as any, save: vi.fn(async () => true) }));
vi.mock('../data/store', () => { const useApp = Object.assign(() => mock.state, { getState: () => mock.state }); return { useApp }; });
import PaoScreen from './PaoScreen';
afterEach(cleanup);
describe('PAO draft durability', () => {
  it('flushes the latest optional-field draft when global navigation unmounts the editor', () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    mock.save.mockClear(); mock.state = { data: emptySnapshot(), savePao: mock.save, readonly: false };
    mock.state.data.pao.AS = { ...blankAssociation(), object: 'Kompas' };
    const page = render(<PaoScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Upravit Eso piky, částečné' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Akce · volitelné' }), { target: { value: 'otáčí se' } });
    page.unmount();
    expect(mock.save).toHaveBeenCalledOnce();
    expect(mock.save).toHaveBeenCalledWith('AS', expect.objectContaining({ person: '', object: 'Kompas', action: 'otáčí se' }));
  });
});
