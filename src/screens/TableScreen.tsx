import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Eye, EyeOff, Play, RotateCcw, Spade, X } from 'lucide-react';
import { randomInt, trueCount } from '../engine/cards';
import { ACTION_NAMES, ACTION_SHORT, createTable, dealHand, handValue, ids, playAction, rulesSummary, tableActions, type Action, type Rules, type TableState } from '../engine/blackjack';
import { useApp } from '../data/store';
import { Card, preloadCards } from '../components/Card';
import { RulesDialog } from '../components/RulesDialog';
import { Button, Field, Heading, Modal } from '../components/ui';
import { useShortcuts } from '../hooks/useShortcuts';
const OUTCOME = { win: 'Výhra', loss: 'Prohra', push: 'Remíza', blackjack: 'Blackjack', surrender: 'Vzdáno' };
export default function TableScreen({ onExit }: { onExit: () => void }) {
  const store = useApp(), [game, setGame] = useState(() => createTable(store.data.settings.rules)), [hints, setHints] = useState(false), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<{ target: number; remaining: number; answer: string; correct: boolean | null; started: number } | null>(null), [score, setScore] = useState({ hands: 0, good: 0, decisions: 0 });
  const threshold = useRef(4 + randomInt(5)), sinceCheck = useRef(0), began = useRef(performance.now()), recorded = useRef('');
  const preferReducedMotion = useReducedMotion();
  const reduceMotion = preferReducedMotion || !store.data.settings.motion;
  function accept(next: TableState) {
    const oldExposed = game.cursor - Number(game.dealer.length > 0 && !game.holeRevealed), nextExposed = next.cursor - Number(next.dealer.length > 0 && !next.holeRevealed);
    sinceCheck.current += Math.max(0, nextExposed - (next.shoeNumber === game.shoeNumber ? oldExposed : 0));
    if (next.shoeNumber !== game.shoeNumber) setError('Připraven nový shoe. Running count začal znovu na nule.');
    setGame(next);
    if (!hints && sinceCheck.current >= threshold.current) { sinceCheck.current = 0; threshold.current = 4 + randomInt(7); setQuiz({ target: next.count, remaining: next.shoe.length - next.cursor + Number(!next.holeRevealed), answer: '', correct: null, started: performance.now() }); }
    const key = `${next.shoeNumber}:${next.round}`;
    if (next.phase === 'done' && recorded.current !== key) {
      recorded.current = key;
      const good = next.decisions.filter(d => d.correct).length;
      setScore(s => ({ hands: s.hands + next.hands.length, good: s.good + good, decisions: s.decisions + next.decisions.length }));
      void store.addSession({ mode: 'table', correct: good, total: next.decisions.length, durationMs: performance.now() - began.current, eligible: !hints, variant: 'basic-strategy', outcome: next.hands.map(h => OUTCOME[h.outcome!]).join(' / '), summary: rulesSummary(next.rules) });
    }
  }
  async function deal() {
    if (loading || quiz) return;
    setLoading(true); setError('');
    try { await preloadCards(); began.current = performance.now(); accept(dealHand(game)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Rozdání se nezdařilo.'); }
    finally { setLoading(false); }
  }
  function action(next: Action) { if (quiz) return; try { accept(playAction(game, next)); } catch (e) { setError(e instanceof Error ? e.message : 'Tah se nezdařil.'); } }
  function newShoe(rules = game.rules) { setGame(createTable(rules)); recorded.current = ''; sinceCheck.current = 0; threshold.current = 4 + randomInt(5); setQuiz(null); setError('Nový shoe je připraven. Running count začíná na nule.'); }
  function applyRules(rules: Rules) { void store.update(s => ({ ...s, settings: { ...s.settings, rules } })); newShoe(rules); }
  function submitCount() {
    if (!quiz || quiz.correct !== null || !quiz.answer.trim() || !Number.isInteger(Number(quiz.answer))) return;
    const correct = Number(quiz.answer) === quiz.target; setQuiz(q => q && { ...q, correct });
    void store.addSession({ mode: 'table-count', correct: Number(correct), total: 1, durationMs: performance.now() - quiz.started, eligible: true, variant: 'running', summary: 'Počítání viditelných karet u stolu' });
  }
  const legal = tableActions(game), unseen = game.shoe.length - game.cursor + Number(game.dealer.length > 0 && !game.holeRevealed), tc = trueCount(game.count, unseen);
  useShortcuts({ ' ': game.phase !== 'playing' && !quiz ? () => void deal() : undefined, enter: game.phase !== 'playing' && !quiz ? () => void deal() : undefined, escape: !quiz ? onExit : undefined, h: legal.includes('hit') ? () => action('hit') : undefined, s: legal.includes('stand') ? () => action('stand') : undefined, d: legal.includes('double') ? () => action('double') : undefined, p: legal.includes('split') ? () => action('split') : undefined, r: legal.includes('surrender') ? () => action('surrender') : undefined });
  const handCards = (cards: TableState['dealer'], dealer = false) => <div className="hand-cards">{cards.map((c, i) => <motion.div key={`${game.shoeNumber}:${c.uid}`} initial={reduceMotion ? false : { opacity: 0, y: -18, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: .18 }}><Card id={dealer && i === 1 && !game.holeRevealed ? undefined : c.id} back={dealer && i === 1 && !game.holeRevealed} size="medium" /></motion.div>)}</div>;
  return <div className="table-page"><header className="table-header"><div className="table-title-row"><Button variant="ghost" onClick={onExit}>Zpět</Button><h1>Tréninkový stůl</h1><RulesDialog rules={game.rules} onApply={applyRules} locked={game.phase === 'playing'} /></div><div className="table-stats-row"><span className="badge gold">{rulesSummary(game.rules)}</span><div><span className="eyebrow">Ruce</span><span className="mono">{score.hands}</span></div><div><span className="eyebrow">Zbývá karet</span><span className="mono">{game.shoe.length - game.cursor}</span></div><Button variant="ghost" onClick={() => setHints(h => !h)} aria-pressed={hints}>{hints ? <EyeOff size={17} /> : <Eye size={17} />}{hints ? 'Skrýt count' : 'Nápověda'}</Button></div>{hints && <div className="count-hint"><span>Running count <strong className="mono">{game.count >= 0 ? '+' : ''}{game.count}</strong></span><span>True count <strong className="mono">{tc === null ? '—' : tc.toFixed(1)}</strong></span><small>Skrytá karta se do countu započítá až při odhalení. V tomto režimu se náhodné otázky neobjevují.</small></div>}</header>
    {error && <div className="table-notice" role="status">{error}{/došel|nezdařilo/.test(error) && <Button onClick={() => newShoe()}>Nový shoe</Button>}</div>}
    <div className="practice-felt"><div className="hand-zone dealer-zone"><span className="eyebrow">Dealer</span>{game.dealer.length ? handCards(game.dealer, true) : <Card back size="medium" />}<span className="mono hand-total">{game.dealer.length ? game.holeRevealed ? handValue(ids(game.dealer)).total : `${handValue([game.dealer[0].id]).total} + ?` : 'Čeká na rozdání'}</span></div>
      <div className="table-center"><Spade size={24} /><span>COUNTING CARDS</span><small>{game.phase === 'ready' ? 'Trénink rozhodování a počítání' : game.phase === 'playing' ? `Na tahu: ruka ${game.active + 1}` : 'Ruka dohrána'}</small></div>
      <div className="player-hands">{game.hands.length ? game.hands.map((h, i) => { const v = handValue(ids(h.cards)); return <div className={`hand-zone player-zone ${game.phase === 'playing' && game.active === i ? 'active-hand' : ''}`} key={i}><span className={`mono hand-total ${v.bust ? 'error' : ''}`}>{v.total}{v.soft ? ' měkkých' : ''}{h.stake === 2 ? ' · ×2' : ''}</span>{handCards(h.cards)}<span className="eyebrow">Hráč{game.hands.length > 1 ? ` · ruka ${i + 1}` : ''}</span>{h.outcome && <span className={`badge ${h.units! > 0 ? 'success' : h.units! < 0 ? 'error' : ''}`}>{OUTCOME[h.outcome]} · {h.units! > 0 ? '+' : ''}{h.units} j.</span>}</div>; }) : <div className="hand-zone"><Card back size="medium" /><span className="eyebrow">Tvoje místo u stolu</span></div>}</div>
    </div>
    <footer className="table-actions"><div className="action-grid">{game.phase === 'playing' ? legal.map(a => <Button key={a} disabled={!!quiz} onClick={() => action(a)}><kbd>{ACTION_SHORT[a]}</kbd>{ACTION_NAMES[a]}</Button>) : <><Button variant="primary" disabled={loading || !!quiz} onClick={() => void deal()}><Play size={18} />{loading ? 'Připravuji…' : game.phase === 'ready' ? 'Rozdat karty' : 'Další ruka'}</Button><Button disabled={loading || !!quiz} onClick={() => newShoe()}><RotateCcw size={17} /> Nový shoe</Button></>}</div>{game.phase === 'done' && game.decisions.length > 0 && <details className="decision-review"><summary>Rozbor tahů · {game.decisions.filter(d => d.correct).length}/{game.decisions.length} podle strategie</summary>{game.decisions.map((d, i) => <p key={i} className={d.correct ? 'success' : 'error'}>{i + 1}. {ACTION_NAMES[d.action]} {d.correct ? '✓' : `→ doporučeno ${ACTION_NAMES[d.expected]}`}</p>)}</details>}<p className="table-footnote">Virtuální tréninkové jednotky · žádné peníze · americký peek · blackjack 3:2</p></footer>
    <Modal open={!!quiz} onOpenChange={open => { if (!open) setQuiz(null); }} title="Jaký je aktuální count?" description="Započítej pouze karty, které jsi viděl/a. Skrytá dealerova karta zatím nepatří do součtu.">{quiz && <form className="stack" onSubmit={e => { e.preventDefault(); quiz.correct === null ? submitCount() : setQuiz(null); }}>{quiz.correct === null ? <Field label="Running count"><input autoFocus type="number" step={1} required value={quiz.answer} onChange={e => setQuiz(q => q && { ...q, answer: e.target.value })} className="count-input mono" /></Field> : <div className={`feedback-line ${quiz.correct ? 'success' : 'error'}`}>{quiz.correct ? <Check size={24} /> : <X size={24} />}<div><h2>{quiz.correct ? 'Správně.' : `Správný count je ${quiz.target}.`}</h2><p>Tvoje odpověď: {quiz.answer}</p></div></div>}<Button type="submit" variant="primary">{quiz.correct === null ? 'Vyhodnotit' : 'Pokračovat ve hře'}</Button>{quiz.correct === null && <Button variant="ghost" onClick={() => setQuiz(null)}>Přeskočit otázku</Button>}</form>}</Modal>
  </div>;
}
