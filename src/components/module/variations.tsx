import { inr } from '@/lib/data';
import { Stat } from '../ui';
import { addButton } from './helpers';
import { decide } from './recordActions';
import { genericCard } from './GenericCard';
import type { ModuleView } from './types';

export const variations: ModuleView = {
  actions:c=>addButton(c,['admin','pm','accounts'],'Create variation','var'),
  top:c=>{const{list}=c;return <div className="grid sm:grid-cols-3 gap-4 mb-6"><Stat label="Approved additions" value={inr(list.filter(x=>x.s==='Approved').reduce((a,b)=>a+(b.amt??0),0))}/><Stat label="Awaiting approval" value={inr(list.filter(x=>x.s==='Pending').reduce((a,b)=>a+(b.amt??0),0))}/><Stat label="Total records" value={String(list.length)}/></div>},
  card:(r,c)=>genericCard(r,c,decide(r,c)),
};
