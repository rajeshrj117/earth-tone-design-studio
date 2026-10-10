'use client';
import Shell from '@/components/Shell';
import { Bar, Empty, Head, Pill, Stat } from '@/components/ui';
import { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import { inr, Rec } from '@/lib/data';
import { money } from '@/lib/calc';

export default function Reports() {
  const { user, myProjects, recs } = useApp();
  const [projectFilter,setProjectFilter]=useState('all'); const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const fin = user?.role !== 'pm'; const visibleRecs=useMemo(()=>recs.filter(r=>{if(projectFilter!=='all'&&r.p!==projectFilter)return false;const ts=r.ts??0;if(from&&ts<new Date(from).getTime())return false;if(to&&ts>new Date(to+'T23:59:59').getTime())return false;return true}),[recs,projectFilter,from,to]); const rows = myProjects.filter(p=>projectFilter==='all'||p.id===projectFilter).map(p => ({ p, ...money(visibleRecs,p.id) })); const max = Math.max(...rows.flatMap(r => [r.current, r.paid]), 1); const pct = (v: number) => Math.max(0, Math.min(100, v / max * 100));
  if (user && !['admin', 'pm', 'accounts'].includes(user.role)) return <Shell><Empty text="You don't have access to this section." /></Shell>;
    const snag = ['Open', 'In Progress', 'Rectified', 'Closed'].map(s => [s, visibleRecs.filter(r => r.m === 'snags' && r.s === s).length] as const);
  const tt = snag.reduce((a, b) => a + b[1], 0) || 1; const col = ['var(--bad)', 'var(--warn)', 'var(--info)', 'var(--good)'];
  let off = 0;
  const rate = (r: Rec) => r.rating ?? r.pct ?? 0;
  const det = rows.map(r => { const of = (m: string) => visibleRecs.filter(x => x.p === r.p.id && x.m === m); const ag = of('agreements'), docs = of('documents'), sn = of('snags'), cp = of('completion'), fb = of('feedback'); const done = cp.filter(x => x.s === 'Done').length; const rated = fb.filter(x => rate(x) > 0); const avg = rated.length ? rated.reduce((a, x) => a + rate(x), 0) / rated.length : 0; return { ...r, ag, docs, sn, cp, fb, done, avg, cpPct: cp.length ? Math.round(done / cp.length * 100) : 0 }; });
  const q = (v: unknown) => { let t = String(v ?? ''); if (typeof v === 'string' && /^[=+\-@]/.test(t)) t = "'" + t; return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const exportCsv = () => {
    const head = ['Project', 'Stage', 'Progress %', ...(fin ? ['Original value', 'Approved variations', 'Project total value', 'Amount received', 'Outstanding due', 'Agreements'] : []), 'Documents', 'Snags (total)', 'Snags (not closed)', 'Completion steps done', 'Completion steps', 'Completion %', 'Feedback avg (of 5)', 'Feedback entries'];
    const sum = det.map(d => [d.p.name, d.p.stage, d.p.progress, ...(fin ? [d.orig, d.vars, d.current, d.paid, d.due, d.ag.length] : []), d.docs.length, d.sn.length, d.sn.filter(x => x.s !== 'Closed').length, d.done, d.cp.length, d.cpPct, d.avg ? d.avg.toFixed(1) : '', d.fb.length]);
    const items: (string | number)[][] = [['Project', 'Section', 'Item', 'Status', 'Date', 'Details']];
    det.forEach(d => { const add = (sec: string, list: Rec[], f: (x: Rec) => string) => list.forEach(x => items.push([d.p.name, sec, x.t, x.s, x.d, f(x)]));
      if (fin) add('Agreement', d.ag, x => x.sub || x.fileName || ''); add('Document', d.docs, x => x.fileName || x.category || ''); add('Snag', d.sn, x => x.sub || x.note || ''); add('Completion', d.cp, x => x.owner || ''); add('Feedback', d.fb, x => (rate(x) ? rate(x) + '/5' : '') + (x.comments ? ' ' + x.comments : '')); });
    const csv = '\ufeff' + [head, ...sum].map(r => r.map(q).join(',')).join('\n') + '\n\n' + items.map(r => r.map(q).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'etds-report.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <Shell><Head eyebrow="Insights" title="Reports" sub="Live from Firestore." right={<div className="flex gap-2 no-print"><button className="btn" onClick={()=>window.print()}>Export PDF</button><button className="btn" onClick={exportCsv}>Export CSV</button></div>}/><div className="card p-4 mb-6 no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_auto] items-center"><select className="input" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)}><option value="all">All projects</option>{myProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} /><input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} /><button className="btn" onClick={()=>{setProjectFilter('all');setFrom('');setTo('')}}>Clear filters</button></div>
      {fin && rows.some(r => r.paid > r.current) && <div className="card p-4 mb-6 text-sm" style={{ borderColor: 'var(--warn)' }}>⚠ Collected is higher than the contract value for: {rows.filter(r => r.paid > r.current).map(r => r.p.name).join(', ')}. Check the project value and its received payments.</div>}
      {fin && <div className="grid sm:grid-cols-3 gap-4 mb-6"><Stat label="Total contract value" value={inr(rows.reduce((a, r) => a + r.current, 0))} /><Stat label="Collected" value={inr(rows.reduce((a, r) => a + r.paid, 0))} /><Stat label="Outstanding now" value={inr(rows.reduce((a, r) => a + r.due, 0))} /></div>}
      <div className="grid lg:grid-cols-2 gap-6">
        {fin && <div className="card p-6"><h2 className="serif text-2xl mb-5">Contract value vs collected</h2>
          <div className="flex items-end gap-5 h-56 overflow-hidden">{rows.map(r => <div key={r.p.id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end"><div className="w-full flex items-end gap-1.5 h-full"><div className="flex-1 rounded-t-lg" title={'Contract value ' + inr(r.current)} style={{ height: pct(r.current) + '%', background: 'var(--soft)' }} /><div className="flex-1 rounded-t-lg" title={'Collected ' + inr(r.paid)} style={{ height: pct(r.paid) + '%', background: 'var(--brand)' }} /></div><span className="text-[11px] muted text-center leading-tight">{r.p.name.split(' ').slice(0, 2).join(' ')}</span></div>)}</div>
          <div className="flex gap-4 text-xs muted mt-4"><span>■ <span style={{ color: 'var(--brand)' }}>Collected</span></span><span>■ Contract value</span></div></div>}
        <div className="card p-6"><h2 className="serif text-2xl mb-5">Snag status</h2><div className="flex items-center gap-8"><svg viewBox="0 0 36 36" className="w-40 h-40 -rotate-90"><circle cx="18" cy="18" r="14" fill="none" stroke="var(--soft)" strokeWidth="5" />{snag.map((s, i) => { const len = s[1] / tt * 88; const el = <circle key={s[0]} cx="18" cy="18" r="14" fill="none" stroke={col[i]} strokeWidth="5" strokeDasharray={`${len} ${88 - len}`} strokeDashoffset={-off} />; off += len; return el; })}</svg>
          <div className="space-y-2">{snag.map((s, i) => <div key={s[0]} className="flex items-center gap-2 text-sm"><i className="w-3 h-3 rounded-full" style={{ background: col[i] }} />{s[0]} <b>{s[1]}</b></div>)}</div></div></div>
        <div className="card p-6 lg:col-span-2"><h2 className="serif text-2xl mb-4">Project health</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left muted text-xs uppercase tracking-wider"><th className="py-2">Project</th><th>Stage</th><th>Progress</th>{fin && <><th>Value</th><th>Paid</th><th>Due</th></>}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.p.id} className="border-t" style={{ borderColor: 'var(--line)' }}><td className="py-3 font-semibold">{r.p.name}</td><td>{r.p.stage}</td><td>{r.p.progress}%</td>{fin && <><td>{inr(r.current)}</td><td>{inr(r.paid)}</td><td>{inr(r.due)}</td></>}</tr>)}</tbody></table></div></div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-end justify-between"><h2 className="serif text-2xl">Project-wise report</h2><span className="text-xs muted">{det.length} project{det.length === 1 ? '' : 's'}</span></div>
          {det.map(d => <div key={d.p.id} className="card p-6 space-y-5" style={{ breakInside: 'avoid' }}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="serif text-xl">{d.p.name}</h3><p className="text-xs muted">{d.p.id} · {d.p.client}</p></div><Pill s={d.p.stage} /></div>
            {fin && <div className="grid sm:grid-cols-3 gap-3"><Stat label="Project total value" value={inr(d.current)} hint={d.vars ? `${inr(d.orig)} + ${inr(d.vars)} variations` : undefined} /><Stat label="Amount received" value={inr(d.paid)} hint={(d.current > 0 ? Math.round(d.paid / d.current * 100) : 0) + '% of total'} /><Stat label="Outstanding due" value={inr(d.due)} /></div>}
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {fin && <div className="soft rounded-2xl p-4"><h4 className="font-semibold text-sm mb-2">Agreements <span className="muted">({d.ag.length})</span></h4>{d.ag.length ? <ul className="space-y-1.5 text-sm">{d.ag.map(x => <li key={x.id} className="flex items-center justify-between gap-2"><span className="truncate">{x.t}</span><Pill s={x.s} /></li>)}</ul> : <p className="text-sm muted">No agreements.</p>}</div>}
              <div className="soft rounded-2xl p-4"><h4 className="font-semibold text-sm mb-2">All documents <span className="muted">({d.docs.length})</span></h4>{d.docs.length ? <ul className="space-y-1.5 text-sm">{d.docs.slice(0, 8).map(x => <li key={x.id} className="flex items-center justify-between gap-2"><span className="truncate">{x.t}</span><span className="text-xs muted whitespace-nowrap">{x.d}</span></li>)}{d.docs.length > 8 && <li className="text-xs muted">+{d.docs.length - 8} more (all included in CSV)</li>}</ul> : <p className="text-sm muted">No documents.</p>}</div>
              <div className="soft rounded-2xl p-4"><h4 className="font-semibold text-sm mb-2">Snags <span className="muted">({d.sn.length})</span></h4><div className="flex flex-wrap gap-2">{['Open', 'In Progress', 'Rectified', 'Closed'].map(st => <span key={st} className="text-sm"><Pill s={st} /> <b>{d.sn.filter(x => x.s === st).length}</b></span>)}</div></div>
              <div className="soft rounded-2xl p-4"><h4 className="font-semibold text-sm mb-2">Completion</h4>{d.cp.length ? <><Bar v={d.cpPct} /><p className="text-xs muted mt-2">{d.done} of {d.cp.length} steps done · {d.cpPct}%</p></> : <p className="text-sm muted">No completion steps.</p>}</div>
              <div className="soft rounded-2xl p-4"><h4 className="font-semibold text-sm mb-2">Feedback <span className="muted">({d.fb.length})</span></h4>{d.fb.length ? <><p className="text-2xl serif">{d.avg ? d.avg.toFixed(1) : '–'}<span className="text-sm muted"> / 5</span></p><ul className="mt-1 space-y-0.5 text-xs muted">{d.fb.map(x => <li key={x.id}>{x.t}: {rate(x) || '–'}/5{x.comments ? ' · ' + x.comments : ''}</li>)}</ul></> : <p className="text-sm muted">No feedback yet.</p>}</div>
            </div>
          </div>)}
        </div>
      </div></Shell>
  );
}
