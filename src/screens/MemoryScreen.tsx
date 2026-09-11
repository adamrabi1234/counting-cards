import { useEffect, useRef, useState } from 'react';
import { Check, CircleHelp, Layers3, Pause, Play, Plus, RotateCcw, Trash2, Trophy, X } from 'lucide-react';
import { CARD_IDS, cardName, randomInt, RANKS, shuffled, SUIT, SUITS, uniqueId, type CardId } from '../engine/cards';
import { applyOperations, describeOperation, missingPool, missingRound, orderedScore, recallTarget, unorderedScore, type RecallTarget, type ShuffleOperation } from '../engine/memory';
import { useApp } from '../data/store';
import type { MemoryConfig, MemoryMode } from '../data/schema';
import { Card, preloadCards } from '../components/Card';
import { RecallPicker } from '../components/RecallPicker';
import { Button, Field, Heading, NumberField, Progress, seconds, Stat } from '../components/ui';
import { useExposure } from '../hooks/useExposure';
import { useShortcuts } from '../hooks/useShortcuts';
import { modeStats } from '../engine/progress';
import { fitGrid, type GridLayout } from '../engine/grid';
const COPY = {
  sequence: { title: 'Sekvence', text: 'Zapamatuj si karty jednu po druhé. Potom sestav jejich pořadí z celého balíčku.' },
  shuffle: { title: 'Míchání v paměti', text: 'Zapamatuj si původní pořadí a v hlavě proveď zadané operace s balíčkem.' },
  missing: { title: 'Chybějící karty', text: 'Prohlédni si karty ze zvoleného rozsahu. Po jejich skrytí vyber všechny, které chyběly.' },
  visual: { title: 'Vizuální paměť', text: 'Zapamatuj si karty a jejich místa v mřížce. Rozložení během kola zůstává stejné.' },
};
interface Round {
  key: string; sequence: CardId[]; target: RecallTarget; pool: CardId[]; number: number; config: MemoryConfig;
  queryCard?: CardId; queryPosition?: number; memorizeMs: number; eligible: boolean; recallStart: number;
  layout?: GridLayout; viewport: { width: number; height: number };
}
export function SpeedControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return <div className="stack"><span className="field">Čas na jednu kartu</span><div className="chips">{[200, 500, 1000, 2000].map(ms => <button type="button" className="chip mono" key={ms} aria-pressed={value === ms} onClick={() => onChange(ms)}>{seconds(ms)}</button>)}</div><NumberField label="Vlastní interval (sekundy)" value={value / 1000} onChange={n => onChange(Math.round(n * 1000))} min={.1} max={30} step={.1} /></div>;
}
function OperationEditor({ operations, onChange }: { operations: ShuffleOperation[]; onChange: (ops: ShuffleOperation[]) => void }) {
  function replace(index: number, op: ShuffleOperation) { onChange(operations.map((old, i) => i === index ? op : old)); }
  return <div className="stack"><div className="row between"><h3>Operace v pořadí</h3><Layers3 size={20} className="gold" /></div>{operations.map((op, i) => <div className="operation" key={i}><div className="row"><span className="mono gold">{i + 1}.</span><select aria-label={`Operace ${i + 1}`} value={op.type} onChange={e => replace(i, e.target.value === 'deal' ? { type: 'deal', piles: 2, order: [0, 1] } : e.target.value === 'riffle' ? { type: 'riffle', first: 'left' } : { type: e.target.value as 'cut' | 'move', count: 2 })}><option value="cut">Sejmutí</option><option value="move">Horní karty dolů</option><option value="deal">Rozdat a sesbírat</option><option value="riffle">Pravidelné proložení</option></select><Button className="icon" aria-label={`Odstranit operaci ${i + 1}`} onClick={() => onChange(operations.filter((_, j) => i !== j))}><Trash2 size={17} /></Button></div>
    {(op.type === 'cut' || op.type === 'move') && <NumberField label="Kolik horních karet přesunout dolů" min={0} max={52} value={op.count} onChange={count => replace(i, { ...op, count })} />}
    {op.type === 'riffle' && <Field label="Začínající polovina"><select value={op.first} onChange={e => replace(i, { ...op, first: e.target.value as 'left' | 'right' })}><option value="left">Horní polovina</option><option value="right">Dolní polovina</option></select></Field>}
    {op.type === 'deal' && <div className="fields"><Field label="Počet hromádek"><select value={op.piles} onChange={e => { const piles = Number(e.target.value) as 2 | 3 | 4; replace(i, { ...op, piles, order: Array.from({ length: piles }, (_, n) => n) }); }}>{[2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></Field><Field label="Pořadí sesbírání" hint="Klepnutím hromádku posuneš na konec pořadí."><div className="chips">{op.order.map(n => <button type="button" className="chip mono" key={n} onClick={() => replace(i, { ...op, order: [...op.order.filter(v => v !== n), n] })}>{n + 1}</button>)}</div></Field></div>}
  </div>)}<Button disabled={operations.length >= 12} onClick={() => onChange([...operations, { type: 'cut', count: 2 }])}><Plus size={17} /> Přidat operaci</Button><p className="muted"><small>Začátek seznamu je vršek balíčku. Rozdává se po jedné zleva doprava; v hromádce zůstává pořadí rozdání. Sesbírání spojí hromádky bez obracení. Proložení střídá karty dvou polovin; při lichém počtu má horní polovina o jednu kartu více.</small></p></div>;
}
function Memorize({ round, mode, onDone, onExit }: { round: Round; mode: MemoryMode; onDone: (result: { elapsed: number; eligible: boolean }) => void; onExit: () => void }) {
  const grid = mode === 'visual' || mode === 'missing';
  const clock = useExposure(grid ? 1 : round.sequence.length, grid ? round.config.displayMs : round.config.interval, onDone);
  const [resized, setResized] = useState(false);
  const pause = useRef(clock.pause); pause.current = clock.pause;
  useEffect(() => {
    const onResize = () => { if (grid && (Math.abs(window.innerWidth - round.viewport.width) > 20 || Math.abs(window.innerHeight - round.viewport.height) > 80)) { pause.current(); setResized(true); } };
    window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize);
  }, [grid, round.viewport]);
  useShortcuts({ ' ': resized ? undefined : clock.paused ? clock.resume : clock.pause, escape: onExit });
  if (resized) return <section className="memorize empty"><h2>Velikost obrazovky se změnila</h2><p>Aby pozice zůstaly stejné, připrav nové kolo pro aktuální rozměry.</p><Button variant="primary" onClick={onExit}>Připravit nové kolo</Button></section>;
  return <section className={`memorize ${grid ? 'grid-memorize' : ''}`} aria-label="Zapamatování karet"><div className="exposure-top"><div className="row"><Button onClick={clock.paused ? clock.resume : clock.pause}>{clock.paused ? <Play size={17} /> : <Pause size={17} />}{clock.paused ? 'Pokračovat' : 'Pauza'}</Button><Button variant="ghost" className="icon" aria-label="Ukončit kolo" onClick={onExit}><X size={19} /></Button></div><span className="mono muted">{grid ? `${round.sequence.length} karet` : `${clock.index + 1} / ${round.sequence.length}`} · kolo {round.number}/{round.config.rounds}</span></div>
    <div className="exposure-progress"><Progress value={clock.fraction * 100} label="Čas zobrazení karty" /></div>
    <div className="exposure-content">{clock.paused ? <div className="empty"><Card back size="stage" /><h2>Trénink je pozastavený</h2><p>Toto kolo dokončíš jako cvičení. Přerušení se nezapočítá do rychlostního rekordu.</p><Button variant="primary" onClick={clock.resume}><Play size={17} /> Pokračovat</Button></div> : !clock.ready ? <Card back size="stage" /> : grid ? <div className="memory-grid" style={{ gridTemplateColumns: `repeat(${round.layout!.columns}, ${round.layout!.cardWidth}px)`, gap: round.layout!.gap, width: round.layout!.width }}>{round.sequence.map((id, i) => <div className="spatial-card" key={id}><span className="mono muted">{i + 1}</span><Card id={id} size="medium" /></div>)}</div> : <Card id={round.sequence[clock.index]} size="stage" />}</div>
    <div className="exposure-bottom"><span className="eyebrow">{mode === 'shuffle' ? 'Zapamatuj si původní pořadí' : grid ? 'Všímej si karet i jejich pozic' : 'Jedna karta. Jeden obraz.'}</span>{!grid && <Progress value={clock.index + 1} max={round.sequence.length} label="Počet zobrazených karet" />}</div>
  </section>;
}
export default function MemoryScreen({ mode, onExit }: { mode: MemoryMode; onExit: () => void }) {
  const store = useApp(), [config, setConfig] = useState<MemoryConfig>(() => store.data.settings.memory[mode]);
  const [phase, setPhase] = useState<'setup' | 'loading' | 'memorize' | 'recall' | 'results'>('setup'), [round, setRound] = useState<Round | null>(null);
  const [answer, setAnswer] = useState<(CardId | null)[]>([]), [positionAnswer, setPositionAnswer] = useState<number | null>(null), [error, setError] = useState('');
  const [result, setResult] = useState<{ correct: number; total: number; recallMs: number } | null>(null);
  const token = useRef(0), submitted = useRef(false);
  const copy = COPY[mode], stats = modeStats(store.data.sessions, mode);
  function update(patch: Partial<MemoryConfig>) { setConfig(c => ({ ...c, ...patch })); }
  function exitRound() { token.current++; setPhase('setup'); setRound(null); }
  async function start(number = 1, retry?: Round) {
    const current = ++token.current; setError(''); setPhase('loading'); submitted.current = false;
    try {
      await preloadCards(); if (current !== token.current) return;
      let options = { ...config };
      if (mode === 'sequence' && options.progressive) {
        const p = useApp.getState().data.progression;
        const matching = p.enabled && p.increment === options.increment && p.required === options.required && options.start === store.data.settings.memory.sequence.start;
        const level = matching ? p.level : options.start;
        options.count = level;
        await store.update(s => ({ ...s, progression: matching ? s.progression : { level, streak: 0, increment: options.increment, required: options.required, enabled: true } }));
      }
      await store.memoryConfig(mode, config); if (current !== token.current) return;
      let sequence = shuffled(CARD_IDS).slice(0, options.count), pool = CARD_IDS, target: RecallTarget;
      let queryCard: CardId | undefined, queryPosition: number | undefined;
      if (retry) { sequence = [...retry.sequence]; target = retry.target; pool = retry.pool; options = retry.config; queryCard = retry.queryCard; queryPosition = retry.queryPosition; }
      else if (mode === 'missing') {
        pool = missingPool(options.suit, options.from, options.to);
        const generated = missingRound(pool, options.missingCount); sequence = generated.visible;
        target = { expected: generated.missing, positions: generated.missing.map((_, i) => i) };
      } else if (mode === 'shuffle') {
        const transformed = applyOperations(sequence, options.operations);
        target = options.shuffleRecall === 'position' ? recallTarget(transformed, 'position') : recallTarget(options.shuffleRecall === 'first' ? transformed.slice(0, options.firstN) : transformed, 'full');
      } else if (mode === 'visual') {
        if (options.visualKind === 'full') target = recallTarget(sequence, 'full');
        else { queryPosition = randomInt(sequence.length); queryCard = sequence[queryPosition]; target = { expected: [queryCard], positions: [queryPosition] }; }
      } else target = recallTarget(sequence, options.recall);
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const layout = mode === 'visual' || mode === 'missing' ? fitGrid(sequence.length, viewport.width - 48, viewport.height - 218, options.columns) : undefined;
      const next: Round = { key: uniqueId(), sequence, target, pool, number, config: options, queryCard, queryPosition, memorizeMs: 0, eligible: !retry, recallStart: 0, viewport, layout };
      setRound(next); setAnswer(Array(target.expected.length).fill(null)); setPositionAnswer(null); setResult(null); setPhase('memorize');
    } catch (e) { setError(e instanceof Error ? e.message : 'Kolo se nepodařilo připravit.'); setPhase('setup'); }
  }
  function submit() {
    if (!round || submitted.current) return;
    const finding = mode === 'visual' && round.config.visualKind === 'find';
    if (finding ? positionAnswer === null : answer.some(c => c === null)) return;
    submitted.current = true;
    const score = finding ? { correct: positionAnswer === round.queryPosition ? 1 : 0, total: 1 } : mode === 'missing' ? unorderedScore(round.target.expected, answer) : orderedScore(round.target.expected, answer);
    const recallMs = performance.now() - round.recallStart;
    setResult({ correct: score.correct, total: score.total, recallMs }); setPhase('results');
    const variant = mode === 'sequence' ? round.config.recall : mode === 'shuffle' ? round.config.shuffleRecall : mode === 'visual' ? round.config.visualKind : 'unordered';
    void store.addSession({ mode, correct: score.correct, total: score.total, durationMs: round.memorizeMs + recallMs, memorizeMs: round.memorizeMs, recallMs, eligible: round.eligible, intervalMs: (mode === 'sequence' || mode === 'shuffle') ? round.config.interval : undefined, count: score.total, variant, summary: mode === 'shuffle' ? round.config.operations.map(describeOperation).join(' · ').slice(0, 500) : undefined }, mode === 'sequence' && round.config.progressive && round.config.recall === 'full');
  }
  useShortcuts({ ' ': phase === 'setup' ? () => void start() : phase === 'results' ? () => round!.number < round!.config.rounds ? void start(round!.number + 1) : exitRound() : undefined, enter: phase === 'recall' ? submit : phase === 'results' ? () => round!.number < round!.config.rounds ? void start(round!.number + 1) : exitRound() : undefined, r: phase === 'results' ? () => void start(round!.number, round!) : undefined, escape: phase === 'setup' ? onExit : exitRound });
  if (phase === 'memorize' && round) return <Memorize key={round.key} round={round} mode={mode} onExit={exitRound} onDone={({ elapsed, eligible }) => { setRound(r => r && { ...r, memorizeMs: elapsed, eligible: r.eligible && eligible, recallStart: performance.now() }); setPhase('recall'); }} />;
  if (phase === 'loading') return <div className="page narrow empty"><div className="loading-cards"><Card back size="medium" /></div><h2>Připravuji karty</h2><p>Načítám karetní líce, aby zobrazení během tréninku nic nezdržovalo.</p><Button onClick={exitRound}>Zpět</Button></div>;
  if (phase === 'setup') {
    const missingSize = missingPool(config.suit, config.from, config.to).length;
    return <div className="page narrow"><Heading title={copy.title} description={copy.text} back={onExit} /><div className="stack">{error && <p className="notice danger" role="alert">{error}</p>}
      {(mode === 'sequence' || mode === 'shuffle') && <div className="panel stack"><NumberField label="Počet karet" value={config.count} min={1} max={52} onChange={count => update({ count })} /><SpeedControl value={config.interval} onChange={interval => update({ interval })} /></div>}
      {mode === 'sequence' && <div className="panel stack"><Field label="Způsob vybavení"><select value={config.recall} onChange={e => update({ recall: e.target.value as MemoryConfig['recall'] })}><option value="full">Celé pořadí</option><option value="reverse">Pořadí odzadu</option><option value="position">Náhodná pozice</option><option value="missing">Chybějící pozice v sekvenci</option></select></Field><label className="check"><input type="checkbox" checked={config.progressive} onChange={e => update({ progressive: e.target.checked })} />Postupně zvyšovat obtížnost</label>{config.progressive && <><div className="fields"><NumberField label="Počáteční počet" min={1} max={52} value={config.start} onChange={start => update({ start })} /><NumberField label="Zvýšit o" min={1} max={20} value={config.increment} onChange={increment => update({ increment })} /><NumberField label="Po kolika bezchybných kolech" min={1} max={20} value={config.required} onChange={required => update({ required })} /></div><p className="notice">Postup se počítá při vybavení celého pořadí bez přerušení. Aktuální úroveň: <strong>{store.data.progression.level} karet</strong>. Opakování stejného balíčku slouží jako cvičení.</p></>}</div>}
      {mode === 'shuffle' && <><div className="panel"><OperationEditor operations={config.operations} onChange={operations => update({ operations })} /></div><div className="panel stack"><Field label="Odpověď po manipulaci"><select value={config.shuffleRecall} onChange={e => update({ shuffleRecall: e.target.value as MemoryConfig['shuffleRecall'] })}><option value="full">Celé výsledné pořadí</option><option value="first">Prvních N karet</option><option value="position">Náhodná pozice</option></select></Field>{config.shuffleRecall === 'first' && <NumberField label="Prvních N karet" min={1} max={config.count} value={Math.min(config.firstN, config.count)} onChange={firstN => update({ firstN })} />}</div></>}
      {mode === 'missing' && <div className="panel stack"><Field label="Barva karet"><select value={config.suit} onChange={e => update({ suit: e.target.value as MemoryConfig['suit'] })}><option value="all">Všechny barvy</option>{SUITS.map(s => <option key={s} value={s}>{SUIT[s].symbol} {SUIT[s].name}</option>)}</select></Field><div className="fields"><Field label="Od hodnoty"><select value={config.from} onChange={e => update({ from: Number(e.target.value), to: Math.max(config.to, Number(e.target.value)) })}>{RANKS.map((r, i) => <option key={r} value={i}>{r}</option>)}</select></Field><Field label="Do hodnoty"><select value={config.to} onChange={e => update({ to: Number(e.target.value), from: Math.min(config.from, Number(e.target.value)) })}>{RANKS.map((r, i) => <option key={r} value={i}>{r}</option>)}</select></Field></div><NumberField label="Počet chybějících karet" value={config.missingCount} onChange={missingCount => update({ missingCount })} min={1} max={Math.max(1, missingSize - 1)} /><p className="muted">Rozsah obsahuje {missingSize} karet. Musí zůstat alespoň jedna viditelná.</p></div>}
      {mode === 'visual' && <div className="panel stack"><NumberField label="Počet karet v mřížce" value={config.count} onChange={count => update({ count })} min={1} max={52} /><Field label="Co si vybavit"><select value={config.visualKind} onChange={e => update({ visualKind: e.target.value as MemoryConfig['visualKind'] })}><option value="full">Celou mřížku</option><option value="card">Kartu na určeném místě</option><option value="find">Pozici určené karty</option></select></Field><NumberField label="Preferovaný počet sloupců" value={config.columns} min={2} max={6} onChange={columns => update({ columns })} suffix="U velké mřížky se sloupce přizpůsobí, aby byly všechny karty vidět současně." /></div>}
      {(mode === 'missing' || mode === 'visual') && <div className="panel"><NumberField label="Doba zobrazení (sekundy)" value={config.displayMs / 1000} min={.5} max={120} step={.5} onChange={s => update({ displayMs: Math.round(s * 1000) })} /></div>}
      <div className="panel"><NumberField label="Počet kol" value={config.rounds} min={1} max={100} onChange={rounds => update({ rounds })} /></div>
      <Button variant="primary" wide onClick={() => void start()} disabled={mode === 'missing' && config.missingCount >= missingSize}><Play size={19} /> Začít trénink <kbd>Space</kbd></Button><p className="muted"><small>Čas běží podle hodin prohlížeče, nezávisle na animacích. Přesnost je omezena obnovovací frekvencí displeje. Přepnutí karty nebo delší zásek trénink pozastaví.</small></p>
    </div></div>;
  }
  if (!round) return null;
  if (phase === 'results' && result) {
    const finding = mode === 'visual' && round.config.visualKind === 'find';
    const compared = mode === 'missing' ? round.target.expected.map((id, i) => ({ expected: id, actual: answer.includes(id) ? id : answer.filter(c => c && !round.target.expected.includes(c))[i] ?? null, correct: answer.includes(id), position: i + 1 })) : orderedScore(round.target.expected, answer).details;
    return <div className="page"><Heading title={result.correct === result.total ? 'Výborně. Všechno sedí.' : 'Každá chyba je vodítko.'} description={`${copy.title} · kolo ${round.number}/${round.config.rounds}`} back={exitRound}><Trophy className="gold result-trophy" size={38} /></Heading><div className="stack"><div className="stats-grid"><Stat label="Správně" value={`${result.correct} / ${result.total}`} /><Stat label="Zapamatování" value={seconds(round.memorizeMs)} /><Stat label="Odpověď" value={seconds(result.recallMs)} /><Stat label="Nejlepší rozsah" value={stats.best ? `${stats.best} karet` : '—'} caption={round.eligible ? 'bezchybně, bez přerušení' : 'toto kolo je cvičení'} /></div>{(mode === 'sequence' || mode === 'shuffle') && <p className="muted">Interval: <span className="mono">{seconds(round.config.interval)} / karta</span>{!round.eligible && ' · Cvičné kolo, nezapočítává se do rychlostního rekordu.'}</p>}
      {finding ? <div className="panel row wrap"><Card id={round.queryCard} /><div className="stack"><h2>Správná pozice: {round.queryPosition! + 1}</h2><p className={result.correct ? 'success' : 'error'}>Tvoje odpověď: {positionAnswer! + 1}</p></div></div> : <div className="comparison"><div className="comparison-labels"><span>Očekáváno</span><span>Tvoje odpověď</span></div><div className="comparison-scroll"><div className="comparison-cards">{compared.map((d, i) => <div className="comparison-pair" key={i}><span className="mono muted">{round.target.positions[i] + 1}</span><Card id={d.expected} size="small" /><span className={d.correct ? 'success' : 'error'} aria-label={d.correct ? 'Správně' : 'Chybně'}>{d.correct ? <Check size={19} /> : <X size={19} />}</span><Card id={d.actual} size="small" /></div>)}</div></div></div>}
      {mode === 'missing' && <p className="muted">Chyběly: {round.target.expected.map(cardName).join(', ')}. Vybral/a jsi: {answer.filter(Boolean).map(id => cardName(id!)).join(', ')}.</p>}
      <div className="result-actions"><Button onClick={() => void start(round.number, round)}><RotateCcw size={17} /> Stejné karty znovu</Button><Button variant="primary" onClick={() => round.number < round.config.rounds ? void start(round.number + 1) : exitRound()}>{round.number < round.config.rounds ? 'Další kolo' : 'Dokončit trénink'} <Play size={17} /></Button></div><Button variant="ghost" onClick={() => void start(1)}>Nový trénink se stejným nastavením</Button>
    </div></div>;
  }
  const finding = mode === 'visual' && round.config.visualKind === 'find';
  const positionOnly = (mode === 'sequence' && round.config.recall === 'position') || (mode === 'shuffle' && round.config.shuffleRecall === 'position') || (mode === 'visual' && round.config.visualKind === 'card');
  return <div className="page recall-page"><Heading title={finding ? 'Kde byla tato karta?' : positionOnly ? `Která karta byla na pozici ${round.target.positions[0] + 1}?` : mode === 'missing' ? 'Které karty chyběly?' : 'Vybav si pořadí'} description={`Kolo ${round.number}/${round.config.rounds} · ${mode === 'sequence' && round.config.recall === 'reverse' ? 'Sestav pořadí od poslední k první.' : mode === 'missing' ? 'Pořadí tvého výběru nerozhoduje.' : 'Karty už jsou skryté. Teď je řada na tvé paměti.'}`} back={exitRound} />
    <div className="stack">{mode === 'shuffle' && <div className="notice"><strong>Proveď v hlavě:</strong><ol>{round.config.operations.map((op, i) => <li key={i}>{describeOperation(op)}</li>)}</ol>{round.config.shuffleRecall === 'first' && <p>Vybav prvních {round.target.expected.length} karet výsledného pořadí.</p>}</div>}
    {round.target.context && <div className="context-sequence">{round.target.context.map((id, i) => <div key={i}><span className="mono muted">{i + 1}</span><Card id={id} size="small" /></div>)}</div>}
    {finding ? <><div className="center query-card"><Card id={round.queryCard} size="large" /></div><div className="position-grid" style={{ gridTemplateColumns: `repeat(${round.layout!.columns}, minmax(44px, 1fr))` }}>{round.sequence.map((_, i) => <button type="button" key={i} className={`position-button ${positionAnswer === i ? 'selected' : ''}`} aria-pressed={positionAnswer === i} onClick={() => setPositionAnswer(i)}>{i + 1}</button>)}</div></> : <RecallPicker key={round.key} answer={answer} onChange={setAnswer} labels={mode === 'missing' ? undefined : round.target.positions.map(i => String(i + 1))} columns={mode === 'visual' && round.config.visualKind === 'full' ? round.layout!.columns : undefined} allowed={mode === 'missing' ? round.pool : CARD_IDS} />}
    <div className="submit-bar"><span className="muted row"><CircleHelp size={17} /> {finding ? 'Vyber jednu pozici' : 'Odpověď můžeš před odesláním upravit.'}</span><Button variant="primary" disabled={finding ? positionAnswer === null : answer.some(c => !c)} onClick={submit}>Vyhodnotit <Check size={18} /></Button></div></div>
  </div>;
}
