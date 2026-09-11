import { ArrowRight, BookOpen, Brain, ChevronRight, Flame, Layers3, ScanEye, Search, Shuffle, Spade, Target, TrendingUp } from 'lucide-react';
import { useApp } from '../data/store';
import { paoCounts } from '../engine/pao';
import { accuracy, dateKey, modeStats, streak } from '../engine/progress';
import { Card } from '../components/Card';
import { Button, percentage, Progress, Stat } from '../components/ui';
import type { Route } from '../navigation';
const memoryModes = [
  { route: 'pao', name: 'PAO knihovna', description: 'Tvoje osobní obrazy pro všech 52 karet.', Icon: BookOpen },
  { route: 'sequence', name: 'Sekvence', description: 'Od prvních karet až po celý balíček.', Icon: Layers3 },
  { route: 'shuffle', name: 'Míchání v paměti', description: 'Udrž pořadí i po manipulaci s balíčkem.', Icon: Shuffle },
  { route: 'missing', name: 'Chybějící karty', description: 'Najdi to, co v balíčku nebylo.', Icon: Search },
  { route: 'visual', name: 'Vizuální paměť', description: 'Zapamatuj si karty i jejich místo.', Icon: ScanEye },
] as const;
const blackjackModes = [
  { route: 'hilo', name: 'Hi-Lo počítání', description: 'Získej jistotu v průběžném countu.', Icon: TrendingUp },
  { route: 'strategy', name: 'Základní strategie', description: 'Správný tah pro každou situaci.', Icon: Target },
  { route: 'table', name: 'Tréninkový stůl', description: 'Propoj rozhodování a počítání při hře.', Icon: Spade },
] as const;
export default function HomeScreen({ navigate }: { navigate: (r: Route) => void }) {
  const { data } = useApp(), pao = paoCounts(data.pao), days = streak(data.sessions), today = data.sessions.filter(s => dateKey(s.createdAt) === dateKey(Date.now())).length;
  const best = modeStats(data.sessions, 'sequence').best;
  return <div className="home-page"><section className="home-hero"><div className="hero-cards" aria-hidden="true"><Card id="AS" decorative size="large" /><Card id="KS" decorative size="large" /><Card id="AH" decorative size="large" /><Card id="KH" decorative size="large" /></div><div className="hero-copy"><span className="eyebrow row"><span className="hero-seal"><Spade size={17} /></span> Dnešní trénink</span><h1>Každá karta.<br /><em>O něco jistěji.</em></h1><p>Deset minut pro lepší paměť a klidnější rozhodování u stolu.</p><div className="row wrap hero-badges"><span className="badge gold"><Flame size={14} />{days} {days === 1 ? 'den v řadě' : 'dní v řadě'}</span><span className="badge">{pao.configured} / 52 PAO</span>{data.sessions.length > 0 && <span className="badge success">{percentage(accuracy(data.sessions))} přesnost</span>}</div><div className="row wrap"><Button variant="primary" onClick={() => navigate('sequence')}>Spustit trénink <ArrowRight size={18} /></Button><Button onClick={() => navigate('pao')}>{pao.configured ? 'Pokračovat v PAO' : 'Vytvořit první asociaci'}</Button></div></div></section>
    <div className="home-body stack"><div className="stats-grid"><Stat label="Dnes dokončeno" value={today} caption={`cíl ${data.settings.dailyGoal} kol`} /><Stat label="Tvoje PAO" value={`${pao.configured}/52`} caption="karet s asociací" /><Stat label="Hi-Lo přesnost" value={percentage(modeStats(data.sessions, 'hilo').accuracy)} caption={modeStats(data.sessions, 'hilo').rounds ? 'ze skutečných odpovědí' : 'zatím bez tréninku'} /><Stat label="Nejlepší sekvence" value={best || '—'} caption="karet bez jediné chyby" /></div>
    <section className="panel pao-progress"><div className="row between"><div><h3>Tvůj balíček roste</h3><p className="muted"><small>{pao.configured} nastavených karet · {pao.missing} zbývá</small></p></div><span className="mono gold">{Math.round(pao.configured / 52 * 100)} %</span></div><Progress value={pao.configured} max={52} label="Nastavené PAO karty" /><div className="milestones">{[3, 5, 10, 20, 30, 52].map(n => <span className={`mono ${pao.configured >= n ? 'achieved' : ''}`} key={n}>{n}</span>)}</div></section>
    <div className="home-mode-columns">{[{ title: 'Paměť', Icon: Brain, modes: memoryModes }, { title: 'Blackjack', Icon: Spade, modes: blackjackModes }].map(group => <section className="mode-section" key={group.title}><h2 className="row"><group.Icon size={19} className="gold" />{group.title}</h2><div className="mode-list">{group.modes.map(mode => <button className="mode-link" type="button" key={mode.route} onClick={() => navigate(mode.route)}><span className="mode-icon"><mode.Icon size={21} /></span><span className="grow"><strong>{mode.name}</strong><small>{mode.description}</small></span><ChevronRight size={18} /></button>)}</div></section>)}</div>
    <div className="home-bottom"><span>Postup přichází s pravidelným tréninkem.</span><button type="button" onClick={() => navigate('progress')}>Otevřít tvůj pokrok <ArrowRight size={16} /></button></div></div>
  </div>;
}
