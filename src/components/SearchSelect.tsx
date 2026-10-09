'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export type Opt = { value: string; label: string };

// Dropdown with a search box. Replaces the old horizontal tab bars.
export default function SearchSelect({ value, options, onChange, placeholder = 'Search…', className = '' }: {
  value: string; options: Opt[]; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const cur = options.find(o => o.value === value);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter(o => o.label.toLowerCase().includes(s)) : options;
  }, [q, options]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent | TouchEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); setQ(''); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && list[hi]) { e.preventDefault(); pick(list[hi].value); }
  };

  return (
    <div ref={box} className={'relative ' + className} style={{ minWidth: 220 }}>
      <button type="button" className="input flex items-center justify-between gap-2 text-left font-semibold" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => { setOpen(o => !o); setQ(''); setHi(Math.max(0, options.findIndex(o => o.value === value))); }}>
        <span className="truncate">{cur?.label ?? 'Select…'}</span><ChevronDown size={16} />
      </button>
      {open && (
        <div className="card absolute z-50 mt-2 w-full p-2 shadow-xl" style={{ minWidth: 240, maxWidth: '90vw' }} onKeyDown={key}>
          <div className="flex items-center gap-2 px-2 pb-2 border-b" style={{ borderColor: 'var(--line)' }}>
            <Search size={14} className="muted" />
            <input autoFocus className="w-full bg-transparent outline-none text-sm py-1" placeholder={placeholder} value={q}
              onChange={e => { setQ(e.target.value); setHi(0); }} />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto pt-1">
            {list.length === 0 && <li className="px-3 py-2 text-sm muted">No match</li>}
            {list.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer"
                style={{ background: i === hi ? 'var(--soft)' : undefined, fontWeight: o.value === value ? 700 : 500 }}
                onMouseEnter={() => setHi(i)} onClick={() => pick(o.value)}>
                <span className="truncate">{o.label}</span>{o.value === value && <Check size={14} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
