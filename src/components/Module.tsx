'use client';
import { useState } from 'react';
import { useApp } from '@/lib/store';
import { MODULES, Rec } from '@/lib/data';
import { Empty } from './ui';
import Art from './Art';
import SearchSelect from './SearchSelect';
import { VIEWS } from './module/index';
import { usePagedRecords } from '@/lib/paged-records';
import { defaultForm } from './module/config';
import { ChangesModal } from './module/ChangesModal';
import { RecordFormModal } from './module/RecordFormModal';
import type { FormValue, ModalState, ModuleCtx } from './module/types';

// Kept so existing `import { ProtectedImage } from '@/components/Module'` call sites keep working.
export { ProtectedImage } from './module/ProtectedImage';

export default function Module({mod,pid}:{mod:string;pid?:string}){
 const {user,recsFor,myProjects,clients,act,add,say,upload,token}=useApp();
 const [f,setF]=useState('all'); const [modal,setModal]=useState<ModalState>(null); const [form,setForm]=useState<FormValue>({}); const [file,setFile]=useState<File|null>(null); const [comment,setComment]=useState(''); const [method,setMethod]=useState('upi'); const [stars,setStars]=useState<Record<string,number>>({});
 const view=VIEWS[mod]??{};
 const pagedTarget=pid??(f==='all'?undefined:f);
 const canSee=!!user&&!!MODULES.find(m=>m.key===mod)?.roles.includes(user.role);
 const paged=usePagedRecords({mod,projectIds:pagedTarget?[pagedTarget]:myProjects.map(p=>p.id),pageSize:view.layout==='grid'?24:20,enabled:canSee&&view.paginate!==false});
 if(!user)return null;
 const role=user.role,staff=role!=='client',staffWrite=['admin','pm','designer'].includes(role),pm=['pm','admin'].includes(role),client=role==='client';
 const target=pid??(f==='all'?undefined:f); const list=recsFor(mod,target); const def=MODULES.find(m=>m.key===mod); if(!def||!def.roles.includes(role))return <Empty text="You don't have access to this section."/>;
 const pids=Array.from(new Set(list.map(x=>x.p))); const tp=target??myProjects[0]?.id??''; const pj=(id:string)=>myProjects.find(p=>p.id===id)!;
 const close=()=>{setModal(null);setForm({});setFile(null);setComment('');setMethod('upi')};
 const openForm=(kind:string,r?:Rec)=>{setForm(defaultForm(mod,r));setFile(null);setModal({kind,rec:r})};
 const st=async(r:Rec,s:string,what:string,extra:Partial<Rec>={})=>act(r.id,{s,...extra},`${what}: ${r.t}`);
 const c:ModuleCtx={mod,pid,def,role,staff,staffWrite,pm,client,list,pids,tp,pj,f,setF,modal,setModal,form,setForm,file,setFile,comment,setComment,method,setMethod,stars,setStars,close,openForm,st,act,add,say,upload,token,clients,myProjects,recsFor};

 const actions=view.actions?.(c)??[];
 const wrap=view.layout==='grid'?'grid sm:grid-cols-2 xl:grid-cols-3 gap-4':'space-y-3';
 // `list` is the full, in-memory set (stats, timeline, counts). `shown` is the current page of it.
 const paging=paged.enabled;
 const fallback=paging&&!!paged.error; // query failed (e.g. index not deployed): page the in-memory list instead
 const shown=!paging?list:fallback?list.slice(0,paged.limit):paged.recs;
 const shownPids=Array.from(new Set(shown.map(x=>x.p)));
 const more=paging&&(fallback?list.length>paged.limit:paged.hasMore);
 const body=()=>{
  if(!list.length&&!view.keepWhenEmpty?.(c))return <Empty text="Nothing here yet for the selected project."/>;
  if(view.body)return view.body(c);
  if(paging&&paged.loading)return <p className="text-sm muted py-6 text-center">Loading…</p>;
  return shownPids.map(id=><section key={id} className="mb-8">{!pid&&shownPids.length>0&&<div className="flex items-center gap-3 mb-3"><Art v={pj(id)?.img} className="w-12 h-12 rounded-xl"/><div><b>{pj(id)?.name}</b><div className="text-xs muted">{id}</div></div></div>}<div className={wrap}>{shown.filter(x=>x.p===id).map(r=>view.card?.(r,c))}</div></section>)
 };

 return <>
  <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><div className="flex gap-2">{!pid&&myProjects.length>1&&<SearchSelect value={f} onChange={setF} placeholder="Search projects…" options={[{value:'all',label:'All projects'},...myProjects.map(p=>({value:p.id,label:p.name.split(' — ')[0]}))]} />}</div><div className="flex gap-2">{actions}</div></div>
  {view.top?.(c)}
  {body()}
  {more&&<div className="flex flex-col items-center gap-2 mb-8"><p className="text-xs muted">Showing {shown.length} of {list.length}</p><button className="btn" disabled={paged.loadingMore} onClick={paged.loadMore}>{paged.loadingMore?'Loading…':'Load more'}</button></div>}

  <ChangesModal c={c}/>
  <RecordFormModal c={c}/>
  {view.modals?.(c)}
 </>;
}
