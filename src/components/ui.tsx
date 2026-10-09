'use client';
import { ReactNode } from 'react';
export const tone = (s: string) => {
  const x = s.toLowerCase();
  if (/(approved|received|completed|complete|resolved|acknowledged|closed|done|rated|rectified)/.test(x)) return 'good';
  if (/(due|open|reject|overdue|changes)/.test(x)) return 'bad';
  if (/(pending|review|progress|under|scheduled)/.test(x)) return 'warn';
  if (/(upcoming|^v\d|site|design)/.test(x)) return 'info';
  return '';
};
export const Pill = ({ s }: { s: string }) => <span className={'pill ' + tone(s)}>{s}</span>;
export const Bar = ({ v }: { v: number }) => <div className="bar"><i style={{ width: v + '%' }} /></div>;
export const Stat = ({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: ReactNode }) => (
  <div className="card p-5 fade"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider muted font-semibold">{label}</span>{icon && <span className="muted">{icon}</span>}</div><div className="serif text-2xl mt-2">{value}</div>{hint && <div className="text-xs muted mt-1">{hint}</div>}</div>
);
export const Head = ({ eyebrow, title, sub, right }: { eyebrow?: string; title: string; sub?: string; right?: ReactNode }) => (
  <header className="flex flex-wrap items-end justify-between gap-3 mb-6 fade"><div>{eyebrow && <p className="text-xs uppercase tracking-[.18em] muted font-semibold">{eyebrow}</p>}<h1 className="serif text-3xl md:text-4xl mt-1">{title}</h1>{sub && <p className="muted mt-1 max-w-2xl">{sub}</p>}</div>{right}</header>
);
export const Empty = ({ text }: { text: string }) => <div className="card p-10 text-center muted">{text}</div>;
export const Modal = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) => open ? (
  <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50" onClick={onClose}><div className="card w-full max-w-md p-6 fade" onClick={e => e.stopPropagation()}>{children}</div></div>
) : null;
