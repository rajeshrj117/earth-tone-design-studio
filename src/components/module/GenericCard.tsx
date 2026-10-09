import type { ReactNode } from 'react';
import { inr } from '@/lib/data';
import type { Rec } from '@/lib/data';
import { Pill } from '../ui';
import { openProtectedFile, CARD_BASE } from './helpers';
import { manage } from './recordActions';
import type { ModuleCtx } from './types';

export const genericCard=(r:Rec,c:ModuleCtx,extras:ReactNode=null)=>{const{say,token}=c;return <div key={r.id} className={CARD_BASE}><div className="flex-1 min-w-[240px]"><div className="flex items-center gap-2 flex-wrap"><b>{r.t}</b><Pill s={r.s}/></div><p className="text-xs muted mt-1">{r.d}{r.sub?' · '+r.sub:''}{r.changeRequest?' · Change requested: '+r.changeRequest:''}{r.owner?' · '+r.owner:''}{r.category?' · '+r.category:''}</p>{r.amt!=null&&<div className="serif text-xl mt-2">{inr(r.amt)}</div>}{r.fileUrl&&<button className="text-xs underline mt-2" onClick={()=>openProtectedFile(r.fileUrl!,token,say)}>Open attachment</button>}</div><div className="flex items-center gap-2 flex-wrap">{extras}{manage(r,c)}</div></div>};
