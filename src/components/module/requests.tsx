import { Btn, addButton } from './helpers';
import { genericCard } from './GenericCard';
import type { ModuleView } from './types';

export const requests: ModuleView = {
  actions:c=>addButton(c,['admin','pm','client'],'New request','req'),
  card:(r,c)=>{const{pm,st,say}=c;return genericCard(r,c,<>{pm&&r.s==='In Review'&&<Btn k="good" onClick={()=>st(r,'Resolved','Resolved request').then(()=>say('Request resolved'))}>Resolve</Btn>}</>)},
};
