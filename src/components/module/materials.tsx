import { Check, Palette } from 'lucide-react';
import { Pill, Stat } from '../ui';
import { Btn, today, CARD_BASE, addButton } from './helpers';
import { manage } from './recordActions';
import type { ModuleView } from './types';

export const materials: ModuleView = {
  actions:c=>addButton(c,['admin','pm','designer']),
  layout:'grid',
  top:c=>{const{list}=c;return <div className="grid sm:grid-cols-3 gap-4 mb-6"><Stat label="Selected" value={String(list.filter(x=>x.s==='Selected').length)}/><Stat label="Awaiting choice" value={String(list.filter(x=>x.s!=='Selected').length)}/><Stat label="Total items" value={String(list.length)}/></div>},
  card:(r,c)=>{const{staffWrite,client,st,say}=c;return <div key={r.id} className={CARD_BASE}><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl grid place-items-center soft"><Palette size={18}/></div><div><div className="flex items-center gap-2 flex-wrap"><b>{r.t}</b><Pill s={r.s}/></div><p className="text-xs muted mt-1">{r.category||r.note}{r.specification?' · '+r.specification:''}{r.supplier?' · '+r.supplier:''}</p></div></div><div className="flex gap-2">{client&&r.s!=='Selected'&&<Btn k="primary" onClick={()=>st(r,'Selected','Client selected material',{d:today()}).then(()=>say('Material selection saved'))}><Check size={13}/>Select</Btn>}{staffWrite&&r.s!=='Selected'&&<Btn onClick={()=>st(r,'Selected','Approved material',{d:today()}).then(()=>say('Material approved'))}>Approve</Btn>}{manage(r,c)}</div></div>},
};
