import { Check, X, Clock } from 'lucide-react';
import type { Rec } from '@/lib/data';
import { Btn, today } from './helpers';
import type { ModuleCtx, Role } from './types';

export const canManage=(r:Rec,role:Role)=>{
   if(r.m==='payments'||r.m==='agreements')return false;
   if(role==='admin'||role==='pm')return true;
   if(role==='designer')return ['tasks','documents','updates','approvals','materials','floorplans'].includes(r.m);
   if(role==='accounts')return ['quotations','variations','expenses'].includes(r.m);
   return false;
 };
export const remove=async(r:Rec,{token,say}:ModuleCtx)=>{if(!window.confirm(`Delete “${r.t}”?`))return;try{const tk=await token();const res=await fetch('/api/records',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tk},body:JSON.stringify({action:'delete',id:r.id,what:`Deleted ${r.m}: ${r.t}`})});const j=await res.json().catch(()=>({}));if(!res.ok)throw new Error(j.error||'Delete failed');say('Deleted successfully')}catch(e){say(e instanceof Error?e.message:'Delete failed')}};
export const manage=(r:Rec,c:ModuleCtx)=>canManage(r,c.role)?<div className="flex gap-2 mt-3 mb-1"><Btn onClick={()=>c.openForm('edit',r)}>Edit</Btn><Btn k="bad" onClick={()=>remove(r,c)}>Delete</Btn></div>:null;
export const decide=(r:Rec,c:ModuleCtx)=>{const{staff,client,setModal,setComment,st,say}=c;return client&&r.s==='Pending'?<div className="flex gap-2 flex-wrap"><Btn k="good" onClick={()=>st(r,'Approved','Client approved',{d:today()}).then(()=>say('Approved — the team has been notified.'))}><Check size={14}/>Approve</Btn><Btn onClick={()=>{setModal({kind:'changes',rec:r});setComment('')}}><X size={14}/>Request changes</Btn></div>:r.s==='Pending'&&staff?<span className="text-xs muted flex items-center gap-1"><Clock size={13}/>Awaiting client</span>:null};
