import { Check } from 'lucide-react';
import { Bar, Pill } from '../ui';
import { Btn, CARD_BASE, addButton } from './helpers';
import { manage } from './recordActions';
import type { ModuleView } from './types';

export const tasks: ModuleView = {
  actions:c=>addButton(c,['admin','pm','designer']),
  card:(r,c)=>{const{st}=c;return <div key={r.id} className={CARD_BASE}><div className="flex-1 min-w-[240px]"><div className="flex items-center gap-2"><b>{r.t}</b><Pill s={r.s}/></div><p className="text-xs muted mt-1">{r.owner||'Unassigned'} · Due {r.d}{r.priority?' · '+r.priority:''}</p><div className="mt-3 flex items-center gap-3"><div className="flex-1"><Bar v={r.pct??0}/></div><span className="text-xs font-bold">{r.pct??0}%</span></div></div><div className="flex gap-2 flex-wrap">{r.s!=='Completed'&&<><Btn onClick={()=>{const v=Math.min(100,(r.pct??0)+10);st(r,v===100?'Completed':'In Progress','Updated task progress',{pct:v})}}>+10%</Btn><Btn k="good" onClick={async()=>{await st(r,'Completed','Completed task',{pct:100})}}><Check size={13}/>Complete</Btn></>}{manage(r,c)}</div></div>},
};
