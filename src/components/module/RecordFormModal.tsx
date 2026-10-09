'use client';
import { useState } from 'react';
import { Upload } from 'lucide-react';
import type { Rec } from '@/lib/data';
import { Modal } from '../ui';
import FormatHint from '../FormatHint';
import { deleteUploadedFile, ProjectPicker } from './helpers';
import { FIELDS, FILE_MODS } from './config';
import type { ModuleCtx } from './types';

export function RecordFormModal({c}:{c:ModuleCtx}){
  const{mod,pid,def,tp,f,setF,modal,form,setForm,file,setFile,close,act,add,say,upload,token,myProjects}=c;
  const [saving,setSaving]=useState(false);
 const saveRecord=async()=>{if(saving)return;setSaving(true);try{
   const p=modal?.rec?.p||(f==='all'?tp:f);if(!p)return say('Select a project');if(!form.t?.trim())return say('Title is required');
   const r:Record<string,string|number>={p,m:mod,...form};
   if(r.amt!==undefined)r.amt=Number(r.amt)||0;
   if(r.pct!==undefined)r.pct=Math.max(0,Math.min(100,Number(r.pct)||0));
   if(mod==='scope'&&!r.trade)return say('Select a trade');if(mod==='tasks'&&!r.owner)return say('Assign the task to someone');
   if(mod==='snags'&&!r.location)return say('Enter the snag location');if(['quotations','variations','expenses'].includes(mod)&&!r.amt)return say('Enter amount');
   if(mod==='floorplans'&&!file&&!modal?.rec?.fileUrl)return say('Upload the floor plan file');if(mod==='documents'&&!file&&!modal?.rec?.fileUrl)return say('Upload the document file');
   if(mod==='updates'&&!form.sub?.trim())return say('Add the update details');if(mod==='meetings'&&!r.d)return say('Enter the meeting date/time');
   if(mod==='requests'&&!String(r.sub??'').trim())return say('Add request details');if(mod==='completion'&&!r.d)return say('Enter target date');
   if(mod==='approvals'&&!r.d)return say('Enter decision due date');if(mod==='materials'&&!r.specification)return say('Enter the material specification');
   if(mod==='timeline'&&(!r.startDate||!r.endDate))return say('Enter start and end dates');
   let uploadedPath='';
   if(file){const u=await upload(file,p,mod);if(!u)return;r.fileUrl=u.url;r.fileName=u.name;uploadedPath=u.path;}
   const id=modal?.rec?.id;
   if(id){
     const oldPath=modal.rec?.fileUrl?new URL(modal.rec.fileUrl,window.location.origin).searchParams.get('path')||'':'';
     const{p:_p,m:_m,...patch}=r;if(await act(id,patch as Partial<Rec>,'Updated '+mod+': '+r.t)){if(uploadedPath&&oldPath&&oldPath!==uploadedPath)await deleteUploadedFile(oldPath,token);close();say('Updated successfully')}else if(uploadedPath)await deleteUploadedFile(uploadedPath,token);
   }else{
     const created=await add(r as Omit<Rec,'id'>,'Created '+mod+': '+r.t);
     if(created){close();say('Created successfully')}else if(uploadedPath)await deleteUploadedFile(uploadedPath,token);
   }
 }finally{setSaving(false)}};
  return <Modal open={modal?.kind==='create'||modal?.kind==='edit'} onClose={close}><h3 className="serif text-2xl">{modal?.kind==='edit'?'Edit':'Add'} {def.label}</h3><p className="text-xs muted mt-1 mb-2">Every module has its own business fields; saved records sync live across the project.</p>{!pid&&<div className="mb-3"><ProjectPicker projects={myProjects} value={f==='all'?tp:f} onChange={setF}/></div>}<div className="grid sm:grid-cols-2 gap-3 mt-4">{(FIELDS[mod]||[]).map(x=>x.key==='s'?<select key={x.key} className="input" value={form[x.key]||''} onChange={e=>setForm(v=>({...v,[x.key]:e.target.value}))}><option value="">{x.label}</option>{x.options?.map(o=><option key={o}>{o}</option>)}</select>:x.options?<select key={x.key} className="input" value={form[x.key]||''} onChange={e=>setForm(v=>({...v,[x.key]:e.target.value}))}><option value="">{x.label}</option>{x.options.map(o=><option key={o}>{o}</option>)}</select>:x.type==='date'||x.type==='datetime-local'?<label key={x.key} className="text-xs muted">{x.label}<input className="input mt-1" type={x.type} value={form[x.key]||''} onChange={e=>setForm(v=>({...v,[x.key]:e.target.value}))}/></label>:x.type==='number'?<label key={x.key} className="text-xs muted">{x.label}<input className="input mt-1" type="number" min="0" value={form[x.key]||''} onChange={e=>setForm(v=>({...v,[x.key]:e.target.value}))}/></label>:<input key={x.key} className={'input '+(x.full?'sm:col-span-2':'')} placeholder={x.label} value={form[x.key]||''} onChange={e=>setForm(v=>({...v,[x.key]:e.target.value}))}/>)}
  {FILE_MODS.has(mod)&&<div className="flex flex-col gap-1 items-start"><label className="btn sm sm:col-span-2 justify-center cursor-pointer"><Upload size={14}/>{file?file.name:modal?.rec?.fileName||'Upload attachment'}<input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.doc,.docx" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><FormatHint accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.doc,.docx"/></div>}</div><div className="flex gap-2 mt-5"><button className="btn primary flex-1 justify-center" disabled={saving} onClick={saveRecord}>{saving?'Saving…':modal?.kind==='edit'?'Save changes':'Create '+def.label}</button><button className="btn" onClick={close}>Cancel</button></div></Modal>;
}
