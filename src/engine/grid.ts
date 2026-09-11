export interface GridLayout { columns: number; cardWidth: number; rows: number; gap: number; width: number; height: number }
/** Fit every face simultaneously; freeze this layout for the corresponding recall. */
export function fitGrid(count: number, width: number, height: number, preferred = 4): GridLayout {
  if (!Number.isInteger(count) || count < 1 || count > 52 || width < 100 || height < 100) throw new RangeError('Mřížka se na tuto obrazovku nevejde.');
  const ratio = 167.087 / 242.667, gap = 5, label = 16;
  function candidate(columns: number): GridLayout {
    const rows = Math.ceil(count / columns);
    const cardWidth = Math.max(1, Math.floor(Math.min(110, (width - (columns - 1) * gap) / columns, ((height - (rows - 1) * gap) / rows - label) * ratio)));
    return { columns, cardWidth, rows, gap, width: columns * cardWidth + (columns - 1) * gap, height: rows * (cardWidth / ratio + label) + (rows - 1) * gap };
  }
  const chosen = candidate(Math.min(count, preferred));
  if (chosen.cardWidth >= 48) return chosen;
  let best = chosen;
  for (let n = 1; n <= Math.min(13, count); n++) { const option = candidate(n); if (option.cardWidth > best.cardWidth || option.cardWidth === best.cardWidth && option.height < best.height) best = option; }
  if (best.cardWidth < 28) throw new RangeError('Na této výšce displeje by karty byly příliš malé. Otoč zařízení nebo zmenši počet karet.');
  return best;
}
