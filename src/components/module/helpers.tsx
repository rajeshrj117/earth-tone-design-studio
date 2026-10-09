import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { ModuleCtx, Role } from './types';

export const CARD_BASE='card p-5 flex flex-wrap items-center justify-between gap-4 fade';

export const today=()=>new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
export const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

export async function openProtectedFile(url: string, token: () => Promise<string>, say: (m: string) => void) {
  const w=window.open('','_blank'); // open synchronously (inside the click) so mobile popup blockers allow it
  try { const tk=await token(); const res=await fetch(url,{headers:tk?{Authorization:'Bearer '+tk}:{}}); if(!res.ok)throw new Error('Could not open file'); const objectUrl=URL.createObjectURL(await res.blob()); if(w){w.location.href=objectUrl}else{window.location.assign(objectUrl)} setTimeout(()=>URL.revokeObjectURL(objectUrl),60000); }
  catch(e){w?.close();say(e instanceof Error?e.message:'Could not open file');}
}

export async function deleteUploadedFile(path:string,token:()=>Promise<string>){
  if(!path)return;
  const tk=await token();
  await fetch('/api/files?path='+encodeURIComponent(path),{method:'DELETE',headers:tk?{Authorization:'Bearer '+tk}:{}});
}

export const Btn=({children,onClick,k='' }:{children:ReactNode;onClick:()=>void|Promise<void>;k?:string})=><button className={'btn sm '+k} onClick={onClick}>{children}</button>;

export function ProjectPicker({projects,value,onChange}:{projects:{id:string;name:string}[];value:string;onChange:(v:string)=>void}){return <select className="input" value={value} onChange={e=>onChange(e.target.value)}><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}

/** Primary "add" button shown to the given roles (admin/pm/designer/accounts/client). Returns an array so views can spread several. */
export const addButton=(c:ModuleCtx,roles:Role[],label=`Add ${c.def.label}`,key='create')=>roles.includes(c.role)?[<button key={key} className="btn primary" onClick={()=>c.openForm('create')}><Plus size={15}/>{label}</button>]:[];
