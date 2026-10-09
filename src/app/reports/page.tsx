'use client';
import Shell from '@/components/Shell';
import { Empty, Head, Stat } from '@/components/ui';
import { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import { inr } from '@/lib/data';
import { money } from '@/lib/calc';

export default function Reports() {
  const { user, myProjects, recs } = useApp();
  const [projectFilter,setProjectFilter]=useState('all'); const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const fin = user?.role !== 'pm'; const visibleRecs=useMemo(()=>recs.filter(r=>{if(projectFilter!=='all'&&r.p!==projectFilter)return false;const ts=r.ts??0;if(from&&ts<new Date(from).getTime())return false;if(to&&ts>new Date(to+'T23:59:59').getTime())return false;return true}),[recs,projectFilter,from,to]); const rows = myProjects.filter(p=>projectFilter==='all'||p.id===projectFilter).map(p => ({ p, ...money(visibleRecs,p.id) })); const max = Math.max(...rows.flatMap(r => [r.current, r.paid]), 1); const pct = (v: number) => Math.max(0, Math.min(100, v / max * 100));
  if (user && !['admin', 'pm', 'accounts'].includes(user.role)) return <Shell><Empty text="You don't have access to this section." /></Shell>;
    const snag = ['Open', 'In Progress', 'Rectified', 'Closed'].map(s => [s, recs.filter(r => r.m === 'snags' && r.s === s).length] as const);
  const tt = snag.reduce((a, b) => a + b[1], 0) || 1; const col = ['var(--bad)', 'var(--warn)', 'var(--info)', 'var(--good)'];
  let off = 0;
  return (
    <Shell><Head eyebrow="Insights" title="Reports" sub="Live from Firestore." right={<div className="flex gap-2"><button className="btn" onClick={()=>window.print()}>Export PDF</button><button className="btn" onClick={()=>{const csv=[['Project','Stage','Progress','Value','Paid','Due'],...rows.map(r=>[r.p.name,r.p.stage,String(r.p.progress),String(r.current),String(r.paid),String(r.due)])].map(x=>x.join(',')).join('\n');const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='etds-report.csv';a.click()}}>Export CSV</button></div>}/><div className="card p-4 mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_auto] items-center"><select className="input" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)}><option value="all">All projects</option>{myProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} /><input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} /><button className="btn" onClick={()=>{setProjectFilter('all');setFrom('');setTo('')}}>Clear filters</button></div>
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
      </div></Shell>
  );
}
