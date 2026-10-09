import { Check } from 'lucide-react';
import type { Rec } from '@/lib/data';
import { Btn, today, addButton } from './helpers';
import { fileCard } from './FileCard';
import type { ModuleView, ModuleCtx } from './types';

export const snags: ModuleView = {
  actions:c=>addButton(c,['admin','pm','client'],'Report snag','snag'),
  card:fileCard,
};

/** Snag workflow buttons (move forward / confirm fixed). NOTE: these were dead code in the original Module.tsx
 *  (snags returned the file card before reaching them), so they are intentionally NOT wired into `snags.card`. */
export const snagActions=(r:Rec,c:ModuleCtx)=>{const{pm,client,st,say}=c;return <>{pm&&r.s!=='Closed'&&<Btn onClick={()=>{const n=r.s==='Open'?'In Progress':r.s==='In Progress'?'Rectified':'Closed';st(r,n,'Snag moved forward').then(()=>say('Snag → '+n))}}>Move forward</Btn>}{client&&r.s==='Rectified'&&<Btn k="good" onClick={()=>st(r,'Closed','Client verified snag',{d:today()}).then(()=>say('Snag closed'))}><Check size={13}/>Confirm fixed</Btn>}</>};
