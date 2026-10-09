import { Check, Clock } from 'lucide-react';
import { Pill, Stat } from '../ui';
import { Btn, addButton } from './helpers';
import { manage } from './recordActions';
import type { ModuleView } from './types';

export const timeline: ModuleView = {
  paginate:false,
  actions:c=>addButton(c,['admin','pm']),
  top:c=>{const{list,pids,pj}=c;const ps=pids.map(id=>pj(id)).filter(Boolean);const avg=ps.length?Math.round(ps.reduce((a,p)=>a+p.progress,0)/ps.length):0;return <div className="grid sm:grid-cols-3 gap-4 mb-6"><Stat label="Overall progress" value={avg+'%'}/><Stat label="Completed stages" value={String(list.filter(x=>x.s==='Completed').length)}/><Stat label="Upcoming stages" value={String(list.filter(x=>x.s==='Upcoming').length)}/></div>},
  body:c=>{const{pid,pm,list,pids,pj,st,say}=c;return <div className="space-y-5">{pids.map(id=>{const rs=list.filter(x=>x.p===id);return <div key={id} className="card p-6 fade">{!pid&&<h3 className="font-semibold mb-4">{pj(id)?.name}</h3>}<ol className="relative border-l ml-3" style={{borderColor:'var(--line)'}}>{rs.map((r,i)=><li key={r.id} className="ml-6 pb-6 last:pb-0"><span className="absolute -left-[13px] w-6 h-6 rounded-full grid place-items-center" style={{background:r.s==='Completed'?'var(--good)':r.s==='In Progress'?'var(--brand)':'var(--soft)',color:'#fff'}}>{r.s==='Completed'?<Check size={13}/>:r.s==='In Progress'?<Clock size={13}/>:null}</span><div className="flex flex-wrap items-center gap-2"><b>{r.t}</b><Pill s={r.s}/></div><p className="text-xs muted mt-0.5">{r.startDate||r.d}{r.endDate?' – '+r.endDate:''}</p>{r.sub&&<p className="text-sm mt-1" style={{color:'var(--warn)'}}>{r.sub}</p>}{manage(r,c)}{pm&&r.s==='In Progress'&&<Btn onClick={async()=>{await st(r,'Completed','Completed stage');const n=rs[i+1];if(n)await st(n,'In Progress','Started next stage');say('Stage completed — next stage started')}}>Complete stage</Btn>}</li>)}</ol></div>})}</div>},
};
