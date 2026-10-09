import { CircleCheck, Circle } from 'lucide-react';
import { Pill } from '../ui';
import { Btn, CARD_BASE, addButton } from './helpers';
import { manage } from './recordActions';
import type { ModuleView } from './types';

export const completion: ModuleView = {
  paginate:false,
  actions:c=>addButton(c,['admin','pm']),
  card:(r,c)=>{const{pm,client,st,say}=c;return <div key={r.id} className={CARD_BASE}><div className="flex items-center gap-3">{r.s==='Done'?<CircleCheck style={{color:'var(--good)'}}/>:<Circle className="muted"/>}<div><b>{r.t}</b><p className="text-xs muted">{r.owner||'Responsible team'} · Target {r.d}</p></div></div><div className="flex items-center gap-3"><Pill s={r.s}/>{(pm||(client&&r.t.toLowerCase().includes('acknowledgement')))&&<Btn onClick={()=>st(r,r.s==='Done'?'Pending':'Done',r.s==='Done'?'Reopened completion step':'Completed completion step').then(()=>say(r.s==='Done'?'Step reopened':'Step completed'))}>{r.s==='Done'?'Reopen':client?'Acknowledge':'Mark done'}</Btn>}{manage(r,c)}</div></div>},
};
