import { memo, type CSSProperties } from 'react';
import { cardImage, cardName, CARD_IDS, type CardId } from '../engine/cards';
export const Card = memo(function Card({ id, back = false, size = 'medium', className = '', style, decorative = false }: { id?: CardId | null; back?: boolean; size?: 'tiny' | 'small' | 'medium' | 'large' | 'stage'; className?: string; style?: CSSProperties; decorative?: boolean }) {
  return <div className={`playing-card card-${size} ${back ? 'card-back' : ''} ${!id && !back ? 'card-empty' : ''} ${className}`} style={style}>
    {back ? <span className="back-emblem" aria-hidden="true">♠</span> : id ? <img src={cardImage(id)} alt={decorative ? '' : cardName(id)} draggable={false} decoding="async" /> : <span aria-hidden="true">?</span>}
    {back && !decorative && <span className="sr-only">Karta lícem dolů</span>}
  </div>;
});
let preload: Promise<void> | null = null;
export function preloadCards(): Promise<void> {
  preload ??= Promise.all(CARD_IDS.map(id => new Promise<void>((resolve, reject) => {
    const image = new Image(); image.onload = () => { (image.decode?.() ?? Promise.resolve()).then(() => resolve(), () => resolve()); }; image.onerror = () => reject(new Error('Karty se nepodařilo načíst. Zkus to prosím znovu.')); image.src = cardImage(id);
  }))).then(() => undefined).catch(e => { preload = null; throw e; });
  return preload;
}
