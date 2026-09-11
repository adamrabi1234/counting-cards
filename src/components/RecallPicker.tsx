import { useState } from 'react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { Undo2, X, MoveHorizontal } from 'lucide-react';
import { CARD_IDS, card, cardName, SUIT, SUITS, type CardId, type Suit } from '../engine/cards';
import { Card } from './Card';
import { Button } from './ui';
function Pickable({ id, used, onPick }: { id: CardId; used: boolean; onPick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `bank:${id}`, data: { card: id }, disabled: used });
  return <button ref={setNodeRef} {...attributes} {...listeners} type="button" onClick={onPick} disabled={used} aria-label={`Vybrat ${cardName(id)}`} className={`bank-card ${isDragging ? 'dragging' : ''}`}><Card id={id} size="small" decorative /></button>;
}
function Slot({ id, index, selected, onSelect, label }: { id: CardId | null; index: number; selected: boolean; onSelect: () => void; label: string }) {
  const drag = useDraggable({ id: `slot:${index}`, data: { card: id, source: index }, disabled: !id });
  const drop = useDroppable({ id: `target:${index}`, data: { target: index } });
  return <div ref={drop.setNodeRef} className={`answer-slot ${selected ? 'selected' : ''} ${drop.isOver ? 'over' : ''}`}>
    <span className="slot-index mono">{label}</span>
    <button ref={drag.setNodeRef} {...drag.attributes} {...drag.listeners} type="button" onClick={onSelect} className="slot-main" aria-label={`Pozice ${label}${id ? `, ${cardName(id)}` : ', prázdná'}`} aria-pressed={selected} aria-disabled={false}>{id ? <Card id={id} size="small" decorative /> : <span className="slot-placeholder">{label}</span>}</button>
  </div>;
}
export function SuitFilter({ value, onChange, all = true }: { value: Suit | 'all'; onChange: (s: Suit | 'all') => void; all?: boolean }) {
  return <div className="chips suit-filter" aria-label="Filtrovat barvu karet">{all && <button type="button" className="chip" aria-pressed={value === 'all'} onClick={() => onChange('all')}>Vše</button>}{SUITS.map(s => <button type="button" key={s} className="chip" aria-label={SUIT[s].name} aria-pressed={value === s} onClick={() => onChange(s)}><span className={s === 'H' || s === 'D' ? 'red-suit' : ''}>{SUIT[s].symbol}</span><span className="suit-word">{SUIT[s].name}</span></button>)}</div>;
}
export function RecallPicker({ answer, onChange, labels, columns, allowed = CARD_IDS }: { answer: (CardId | null)[]; onChange: (answer: (CardId | null)[]) => void; labels?: string[]; columns?: number; allowed?: readonly CardId[] }) {
  const [active, setActive] = useState(0), [filter, setFilter] = useState<Suit | 'all'>('all'), [history, setHistory] = useState<(CardId | null)[][]>([]), [swap, setSwap] = useState(false);
  const [dragged, setDragged] = useState<CardId | null>(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 7 } }));
  function change(next: (CardId | null)[]) { setHistory(h => [...h.slice(-99), [...answer]]); onChange(next); }
  function place(id: CardId, target = active) {
    const next = [...answer], source = next.indexOf(id);
    if (source >= 0) next[source] = next[target];
    next[target] = id; change(next);
    const after = next.findIndex((c, i) => i > target && c === null), empty = next.indexOf(null);
    setActive(after >= 0 ? after : empty >= 0 ? empty : target);
  }
  function onDragEnd(event: DragEndEvent) {
    setDragged(null);
    const id = event.active.data.current?.card as CardId | undefined, target = event.over?.data.current?.target as number | undefined;
    if (id && target !== undefined) place(id, target);
  }
  const used = new Set(answer.filter(Boolean));
  return <DndContext sensors={sensors} onDragEnd={onDragEnd} onDragStart={event => setDragged(event.active.data.current?.card ?? null)} onDragCancel={() => setDragged(null)}><div className="recall-picker">
    <div className="recall-instructions"><MoveHorizontal size={19} /><p>Klepni na pozici a potom na kartu. Karty můžeš také přetáhnout. „Odebrat“ vyprázdní vybranou pozici; „Prohodit“ ji vymění s pozicí, na kterou potom klepneš.</p></div>
    <div className="row wrap between"><span className="muted">{answer.filter(Boolean).length} / {answer.length} umístěno</span><div className="row wrap"><Button disabled={!answer[active]} onClick={() => { const next = [...answer]; next[active] = null; change(next); }}><X size={16} /> Odebrat</Button><Button onClick={() => setSwap(v => !v)} aria-pressed={swap}>{swap ? 'Vyber druhou pozici' : 'Prohodit'}</Button><Button disabled={!history.length} onClick={() => { onChange(history[history.length - 1]); setHistory(h => h.slice(0, -1)); }}><Undo2 size={16} /> Zpět</Button></div></div>
    <div className={`recall-slots ${columns ? 'spatial' : ''}`} style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(44px, 1fr))` } : undefined}>{answer.map((id, i) => <Slot key={i} id={id} index={i} selected={i === active} label={labels?.[i] ?? String(i + 1)} onSelect={() => { if (swap) { const next = [...answer]; [next[i], next[active]] = [next[active], next[i]]; change(next); setSwap(false); } setActive(i); }} />)}</div>
    <SuitFilter value={filter} onChange={setFilter} />
    <div className="card-bank">{allowed.filter(id => filter === 'all' || card(id).suit === filter).map(id => <Pickable key={id} id={id} used={used.has(id)} onPick={() => place(id)} />)}</div>
  </div><DragOverlay dropAnimation={null}>{dragged ? <Card id={dragged} size="small" /> : null}</DragOverlay></DndContext>;
}
