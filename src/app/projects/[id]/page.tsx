'use client';
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { useParams } from 'next/navigation';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import Shell from '@/components/Shell';
import Art from '@/components/Art';
import Module, { ProtectedImage } from '@/components/Module';
import { Bar, Empty, Pill, Stat } from '@/components/ui';
import { useApp } from '@/lib/store';
import { inr } from '@/lib/data';
import { money } from '@/lib/calc';
import ProjectGallery from '@/components/ProjectGallery';
import SearchSelect from '@/components/SearchSelect';

async function adminProject(body:unknown){const t=await auth.currentUser?.getIdToken();const r=await fetch('/api/admin/projects',{method:'POST',headers:{'Content-Type':'application/json',...(t?{Authorization:`Bearer ${t}`}:{})},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Request failed');return j}

export default function ProjectPage() {
  const { id: rawId } = useParams<{ id: string }>(); const id = (() => { try { return decodeURIComponent(rawId); } catch { return rawId; } })(); const { user, myProjects, mods, recs, say, token } = useApp(); const [tab, setTab] = useState('overview'); const [edit,setEdit]=useState(false); const [stage,setStage]=useState(''); const [progress,setProgress]=useState(''); const [value,setValue]=useState(''); const [loc,setLoc]=useState(''); const [handover,setHandover]=useState(''); const [team,setTeam]=useState(''); const [desc,setDesc]=useState('');
  const p = myProjects.find(x => x.id === id);
  if (!user) return <Shell><div /></Shell>;
  if (!p) return <Shell><Empty text="This project isn't available to your account." /></Shell>;
  const m = money(recs, p.id);
  const beginEdit=()=>{setStage(p.stage);setProgress(String(p.progress));setValue(String(p.value));setLoc(p.loc);setHandover(p.handover);setTeam(p.team.join(', '));setDesc(p.desc);setEdit(true)};
  const saveEdit=async()=>{try{await adminProject({action:'update',id:p.id,project:{stage,progress:Number(progress)||0,value:Number(value)||0,loc,handover,team:team.split(',').map(x=>x.trim()).filter(Boolean),desc}});setEdit(false);say('Project updated')}catch(e){say(e instanceof Error?e.message:'Could not update project')}}; const money_ok = user.role !== 'designer';
  const upd = recs.filter(r => r.p === p.id && r.m === 'updates').slice(0, 2);
  return (
    <Shell>
      <div className="card overflow-hidden relative mb-6 fade">{p.img?.startsWith('/api/files')?<ProtectedImage url={p.img} token={token} className="w-full h-56 md:h-72 object-cover"/>:<Art v={p.img} className="w-full h-56 md:h-72" />}<div className="absolute inset-0 hero-grad" />
        <div className="absolute top-4 right-4 z-10">{user.role==='admin'&&<button className="btn" onClick={beginEdit}>Edit project</button>}</div><div className="absolute bottom-0 p-6 md:p-8 text-white w-full"><div className="flex items-center gap-2 text-xs opacity-80">{p.id} · {p.type}<Pill s={p.stage} /></div><h1 className="serif text-3xl md:text-4xl mt-1">{p.name}</h1><p className="text-sm opacity-85 flex items-center gap-1 mt-1"><MapPin size={14} />{p.loc}</p></div></div>
      {money_ok && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><Stat label="Original value" value={inr(m.orig)} /><Stat label="Approved variations" value={inr(m.vars)} /><Stat label="Current value" value={inr(m.current)} /><Stat label="Paid" value={inr(m.paid)} hint={(m.current > 0 ? Math.round(m.paid / m.current * 100) : 0) + '% settled'} /></div>}
      <div className="mb-6"><SearchSelect value={tab} onChange={setTab} placeholder="Search modules…" options={[{value:'overview',label:'Overview'},{value:'gallery',label:'Image Gallery'},...mods.map(x=>({value:x.key,label:x.label}))]} /></div>
      {tab === 'gallery' ? <ProjectGallery project={p} canEdit={user.role === 'admin'} /> : tab === 'overview' ? (
        <div className="grid lg:grid-cols-3 gap-6 fade">
          <div className="lg:col-span-2 space-y-6"><div className="card p-6"><h2 className="serif text-2xl">About this project</h2><p className="muted mt-2">{p.desc}</p><div className="mt-5"><Bar v={p.progress} /><p className="text-xs muted mt-2">{p.progress}% complete</p></div></div>
            {upd.map(u => <div key={u.id} className="card overflow-hidden grid md:grid-cols-[240px_1fr]">{u.fileUrl?<ProtectedImage url={u.fileUrl} token={token} className="w-full h-40 md:h-full object-cover"/>:<Art v={u.img} className="w-full h-40 md:h-full" />}<div className="p-5"><p className="text-xs muted">{u.d}</p><h3 className="serif text-xl">{u.t}</h3><p className="text-sm muted mt-1">{u.sub}</p></div></div>)}</div>
          <div className="card p-6 h-fit space-y-4"><div className="flex gap-3"><CalendarDays size={18} className="muted" /><div><p className="text-xs muted">Start</p><b>{p.start}</b></div></div><div className="flex gap-3"><CalendarDays size={18} className="muted" /><div><p className="text-xs muted">Planned handover</p><b>{p.handover}</b></div></div><div className="flex gap-3"><Users size={18} className="muted" /><div><p className="text-xs muted">Studio team</p><b>{p.team.join(', ')}</b></div></div></div>
        </div>
      ) : <Module key={tab} mod={tab} pid={p.id} />}
      {edit&&<div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"><div className="card p-6 w-full max-w-2xl"><div className="flex justify-between"><h2 className="serif text-2xl">Edit project</h2><button className="btn" onClick={()=>setEdit(false)}>Close</button></div><div className="grid md:grid-cols-2 gap-3 mt-5"><select className="input" value={stage} onChange={e=>setStage(e.target.value)}><option>Design</option><option>Procurement</option><option>Execution</option><option>Snagging</option><option>Handover</option><option>Completed</option></select><input className="input" type="number" min="0" max="100" value={progress} onChange={e=>setProgress(e.target.value)} placeholder="Progress %"/><input className="input" type="number" value={value} onChange={e=>setValue(e.target.value)} placeholder="Value ₹"/><input className="input" value={loc} onChange={e=>setLoc(e.target.value)} placeholder="Location"/><input className="input" value={handover} onChange={e=>setHandover(e.target.value)} placeholder="Handover"/><input className="input md:col-span-2" value={team} onChange={e=>setTeam(e.target.value)} placeholder="Team, comma separated"/><textarea className="input md:col-span-2 min-h-28" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description"/></div><button className="btn primary w-full justify-center mt-5" onClick={saveEdit}>Save changes</button></div></div>}
    </Shell>
  );
}
