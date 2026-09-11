import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, X } from 'lucide-react';
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger'; wide?: boolean }>(function Button({ variant, wide, className = '', children, ...props }, ref) {
  return <button ref={ref} type="button" className={`btn ${variant ?? ''} ${wide ? 'wide' : ''} ${className}`} {...props}>{children}</button>;
});
export function Heading({ title, description, children, back }: { title: string; description?: string; children?: ReactNode; back?: () => void }) {
  return <header className="page-heading"><div className="grow">{back && <Button variant="ghost" onClick={back} className="back-button"><ArrowLeft size={17} /> Zpět</Button>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</header>;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function NumberField({ label, value, onChange, min, max, step = 1, suffix }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return <Field label={label} hint={suffix}><input type="number" min={min} max={max} step={step} value={value} onChange={e => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, step === 1 ? Math.round(n) : n))); }} /></Field>;
}
export function Progress({ value, max = 100, label }: { value: number; max?: number; label?: string }) { return <div className="progress-track" role="progressbar" aria-label={label ?? 'Průběh'} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(max, value)}><div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value / max * 100))}%` }} /></div>; }
export function Stat({ label, value, caption }: { label: string; value: ReactNode; caption?: string }) { return <div className="stat"><span className="eyebrow">{label}</span><strong className="mono">{value}</strong>{caption && <small className="muted">{caption}</small>}</div>; }
export function Modal({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog"><Dialog.Title className="dialog-title">{title}</Dialog.Title><Dialog.Description className={description ? "dialog-description" : "sr-only"}>{description ?? title}</Dialog.Description><Dialog.Close asChild><Button variant="ghost" className="icon dialog-close" aria-label="Zavřít"><X size={19} /></Button></Dialog.Close>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export const seconds = (ms: number) => `${(ms / 1000).toLocaleString('cs', { maximumFractionDigits: 2 })} s`;
export const percentage = (n: number | null) => n === null ? '—' : `${Math.round(n)} %`;
