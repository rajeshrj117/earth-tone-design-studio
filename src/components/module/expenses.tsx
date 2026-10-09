import { Check, ReceiptText } from 'lucide-react';
import { inr } from '@/lib/data';
import { Pill, Stat } from '../ui';
import { Btn, today, CARD_BASE, addButton } from './helpers';
import { manage } from './recordActions';
import type { ModuleView } from './types';

export const expenses: ModuleView = {
  actions:c=>addButton(c,['admin','pm','accounts']),
  top:c=>{const{list}=c;const total=list.reduce((a,x)=>a+(x.amt??0),0);return <div className="grid sm:grid-cols-3 gap-4 mb-6"><Stat label="Tracked expenses" value={inr(total)}/><Stat label="Paid" value={inr(list.filter(x=>x.s==='Paid').reduce((a,b)=>a+(b.amt??0),0))}/><Stat label="Pending" value={inr(list.filter(x=>x.s==='Pending').reduce((a,b)=>a+(b.amt??0),0))}/></div>},
  card:(r,c)=>{const{role,st,say}=c;return <div key={r.id} className={CARD_BASE}><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl grid place-items-center soft"><ReceiptText size={18}/></div><div><div className="flex items-center gap-2 flex-wrap"><b>{r.t}</b><Pill s={r.s}/></div><p className="text-xs muted mt-1">{r.category||'Expense'} · {r.vendor||''} · {r.d}</p></div></div><div className="flex items-center gap-3"><div className="serif text-2xl">{inr(r.amt??0)}</div>{['admin','accounts'].includes(role)&&r.s!=='Paid'&&<Btn k="good" onClick={()=>st(r,'Paid','Expense marked paid',{d:today()}).then(()=>say('Expense marked paid'))}><Check size={13}/>Mark paid</Btn>}{manage(r,c)}</div></div>},
};
