'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, documentId, onSnapshot, orderBy, query, setDoc, where, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Audit, Client, MODULES, Project, Rec, User } from './data';
import { setProjectsForCalc } from './calc';

type Ctx = {
  ready:boolean; user:User|null; recs:Rec[]; audit:Audit[]; theme:string; toast:string; read:string[];
  users:User[]; clients:Client[]; projects:Project[]; myProjects:Project[]; mods:typeof MODULES;
  login:(e:string,pw:string)=>Promise<{ok:boolean;msg?:string}>; logout:()=>void; setTheme:(t:string)=>void;
  act:(id:string,patch:Partial<Rec>,what:string)=>Promise<boolean>; add:(r:Omit<Rec,'id'>,what:string)=>Promise<string|null>;
  say:(m:string)=>void; markRead:(ids:string[])=>void; token:()=>Promise<string>;
  recsFor:(m:string,p?:string)=>Rec[]; upload:(file:File,pid:string,kind:string)=>Promise<{url:string,name:string,path:string}|null>;
};
const C=createContext<Ctx>(null as unknown as Ctx); 
const MIME_BY_EXT:Record<string,string>={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
// Converts iPhone HEIC/HEIF photos to JPEG (via canvas, works where the browser can decode HEIC) and fills in a missing MIME type.
async function normalizeUpload(file:File):Promise<File>{
  const ext=file.name.toLowerCase().split('.').pop()||'';
  if(ext==='heic'||ext==='heif'||/hei[cf]/.test(file.type)){
    try{
      const bmp=await createImageBitmap(file);
      const c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;c.getContext('2d')!.drawImage(bmp,0,0);
      const blob:Blob|null=await new Promise(r=>c.toBlob(r,'image/jpeg',0.9));
      if(blob)return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
    }catch{}
    throw new Error('This browser cannot read HEIC photos. Set the camera to "Most Compatible" or choose a JPG/PNG.');
  }
  if(!file.type&&MIME_BY_EXT[ext])return new File([file],file.name,{type:MIME_BY_EXT[ext]});
  return file;
}
export const useApp=()=>useContext(C);

const clean=<T extends object>(o:T)=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined)) as T;
async function api(path:string, body:unknown, method='POST') {
  const token=await auth.currentUser?.getIdToken();
  const res=await fetch(path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:method==='GET'?undefined:JSON.stringify(body)});
  const json=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(json.error||'Request failed');
  return json;
}

export function AppProvider({children}:{children:ReactNode}){
 const [ready,setReady]=useState(false),[user,setUser]=useState<User|null>(null),[uid,setUid]=useState<string|null>(null);
 const [recordRecs,setRecordRecs]=useState<Rec[]>([]),[paymentRecs,setPaymentRecs]=useState<Rec[]>([]),[agreementRecs,setAgreementRecs]=useState<Rec[]>([]),[audit,setAudit]=useState<Audit[]>([]),[projects,setProjects]=useState<Project[]>([]),[clients,setClients]=useState<Client[]>([]),[users,setUsers]=useState<User[]>([]);
 const [read,setRead]=useState<string[]>([]),[theme,setThemeS]=useState('earth'),[toast,setToast]=useState('');
 const say=useCallback((m:string)=>setToast(m),[]);
 useEffect(()=>{let offProfile=()=>{};const off=onAuthStateChanged(auth,fb=>{offProfile();if(!fb){setUid(null);setUser(null);setRecordRecs([]);setPaymentRecs([]);setAgreementRecs([]);setAudit([]);setProjects([]);setClients([]);setUsers([]);setReady(true);return;}setUid(fb.uid);offProfile=onSnapshot(doc(db,'users',fb.uid),s=>{if(s.exists()){const d=s.data() as User&{theme?:string;read?:string[];disabled?:boolean};if(d.disabled){signOut(auth);setUser(null);}else{setUser({...d,id:fb.uid});setThemeS(d.theme??'earth');setRead(d.read??[]);}}else setUser(null);setReady(true)},e=>{console.error('profile',e);setReady(true);setToast(`Could not load your profile. ${e.code||'Permission denied'}`)});});return()=>{off();offProfile();}},[]);

 useEffect(()=>{
  if(!user)return;
  const ids=user.projects==='all'?null:user.projects;
  if(ids && ids.length===0){queueMicrotask(()=>setProjects([]));return;}
  if(ids){
    const chunks:string[][]=[]; for(let i=0;i<ids.length;i+=30) chunks.push(ids.slice(i,i+30));
    const off=chunks.map(group=>onSnapshot(query(collection(db,'projects'),where(documentId(),'in',group)),snap=>{
      setProjects(prev=>{const incoming=snap.docs.map(d=>({...d.data() as Project,id:d.id}));const got=new Set(incoming.map(x=>x.id));return [...prev.filter(x=>!got.has(x.id)),...incoming].sort((a,b)=>a.id.localeCompare(b.id));});
    },e=>{console.error('projects',e);say(`Could not load projects. ${e.code||'Permission denied'}`)}));
    return()=>off.forEach(f=>f());
  }
  const off=onSnapshot(collection(db,'projects'),snap=>setProjects(snap.docs.map(d=>({...d.data() as Project,id:d.id})).sort((a,b)=>a.id.localeCompare(b.id))),e=>{console.error('projects',e);say(`Could not load projects. ${e.code||'Permission denied'}`)});
  return()=>off();
 },[user,say]);

 useEffect(()=>{
  if(!user)return;
  const off:(()=>void)[]=[];
  const projectIds = projects.map(p=>p.id);
  const chunks = <T,>(items:T[], size=30) => {
    const out:T[][]=[];
    for(let i=0;i<items.length;i+=size) out.push(items.slice(i,i+size));
    return out;
  };
  const listenByProjects = (name:'records'|'payments'|'agreements', onDocs:(docs:QueryDocumentSnapshot<DocumentData>[])=>void) => {
    if(!projectIds.length) return;
    for(const ids of chunks(projectIds)){
      const q=query(collection(db,name),where('p','in',ids));
      off.push(onSnapshot(q,s=>onDocs(s.docs),e=>{console.error(name,e);say(`Could not load ${name}. ${e.code||'Permission denied'}`)}));
    }
  };

  if(projectIds.length){
    listenByProjects('records',docs=>{
      const allowed=MODULES.filter(m=>m.roles.includes(user.role)).map(m=>m.key);
      setRecordRecs(prev=>{
        const incoming=docs.map(d=>({...d.data() as Rec,id:d.id}));
        const ids=new Set(incoming.map(x=>x.id));
        const other=prev.filter(x=>!ids.has(x.id));
        return [...other,...incoming].filter(r=>allowed.includes(r.m)).sort((a,b)=>(b.ts??0)-(a.ts??0)||(a.seq??0)-(b.seq??0));
      });
    });
  } else queueMicrotask(()=>setRecordRecs([]));

  if(['admin','pm','accounts'].includes(user.role)){
    off.push(onSnapshot(collection(db,'clients'),s=>setClients(s.docs.map(d=>({...d.data() as Client,id:d.id}))),e=>{console.error('clients',e);say(`Could not load clients. ${e.code||'Permission denied'}`)}));
  } else queueMicrotask(()=>setClients([]));

  const sensitiveRoles=['admin','accounts','client'];
  if(sensitiveRoles.includes(user.role)){
    listenByProjects('payments',docs=>{
      setPaymentRecs(prev=>{
        const incoming=docs.map(d=>({...d.data() as Rec,id:d.id,m:'payments'}));
        const ids=new Set(incoming.map(x=>x.id));
        return [...prev.filter(x=>!ids.has(x.id)),...incoming];
      });
    });
    listenByProjects('agreements',docs=>{
      setAgreementRecs(prev=>{
        const incoming=docs.map(d=>({...d.data() as Rec,id:d.id,m:'agreements'}));
        const ids=new Set(incoming.map(x=>x.id));
        return [...prev.filter(x=>!ids.has(x.id)),...incoming];
      });
    });
  } else { queueMicrotask(()=>{setPaymentRecs([]); setAgreementRecs([]);}); }

  if(user.role==='admin'){
    off.push(onSnapshot(query(collection(db,'audit'),orderBy('ts','desc')),s=>setAudit(s.docs.map(d=>{const x=d.data() as Audit;return {...x,id:d.id,at:new Date(x.ts??0).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};})),e=>{console.error('audit',e);say(`Could not load audit trail. ${e.code||'Permission denied'}`)}));
    off.push(onSnapshot(collection(db,'users'),s=>setUsers(s.docs.map(d=>({...d.data() as User,id:d.id}))),e=>{console.error('users',e);say(`Could not load users. ${e.code||'Permission denied'}`)}));
  } else { queueMicrotask(()=>{setAudit([]); setUsers([]);}); }

  return()=>off.forEach(f=>f());
 },[user,projects,say]);

 const recs=useMemo(()=>[...recordRecs,...(user&&['admin','accounts','client'].includes(user.role)?paymentRecs:[]),...(user&&['admin','accounts','client'].includes(user.role)?agreementRecs:[])],[recordRecs,paymentRecs,agreementRecs,user]);

 useEffect(()=>setProjectsForCalc(projects),[projects]); useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);
 useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)}},[toast]);
 const act=useCallback(async(id:string,patch:Partial<Rec>,what:string)=>{
   try{
    const rec=recs.find(x=>x.id===id); if(!rec)throw new Error('Record not found');
    if(rec.m==='payments'){
      if(patch.s==='Received') await api('/api/payments',{action:'record',paymentId:id});
      else throw new Error('Use the payment actions to change payment status');
    }
    else if(rec.m==='agreements'){await api('/api/agreements',{action:'update',id,patch,what});}
    else await api('/api/records',{action:'update',id,patch,what});
    return true;
   }catch(e){say(e instanceof Error?e.message:'Not allowed');return false}
 },[recs,say]);
 const add=useCallback(async(r:Omit<Rec,'id'>,what:string)=>{
   try{const x=await api('/api/records',{action:'create',record:clean(r),what});return x.id as string}catch(e){say(e instanceof Error?e.message:'Not allowed');return null}
 },[say]);
 const login=async(e:string,pw:string):Promise<{ok:boolean;msg?:string}>=>{
  // Client-side cooldown (deters casual guessing). Real throttling is enforced by Firebase Auth itself (auth/too-many-requests).
  const KEY='etds-login-guard'; const now=Date.now(); let g:{n:number;first:number;until:number}={n:0,first:now,until:0};
  try{g=JSON.parse(localStorage.getItem(KEY)||'')||g}catch{}
  if(g.until>now)return {ok:false,msg:`Too many attempts. Try again in ${Math.ceil((g.until-now)/1000)}s.`};
  try{await signInWithEmailAndPassword(auth,e.trim().toLowerCase(),pw);try{localStorage.removeItem(KEY)}catch{}return {ok:true}}
  catch(err){
    const code=(err as {code?:string})?.code||'';
    if(now-g.first>15*60000)g={n:0,first:now,until:0};
    g.n+=1; if(g.n>=5){g.until=now+Math.min(30*60000,60000*2**(g.n-5));}
    try{localStorage.setItem(KEY,JSON.stringify(g))}catch{}
    if(code==='auth/too-many-requests')return {ok:false,msg:'Too many attempts. Please wait a few minutes or reset your password.'};
    return {ok:false,msg:g.until>now?`Too many attempts. Try again in ${Math.ceil((g.until-now)/1000)}s.`:'Invalid email or password.'};
  }
};
 const logout=()=>signOut(auth); const prefs=(patch:object)=>uid&&setDoc(doc(db,'users',uid),patch,{merge:true}).catch(()=>{});
 const setTheme=(t:string)=>{setThemeS(t);prefs({theme:t})}; const markRead=(ids:string[])=>{const n=Array.from(new Set([...read,...ids]));setRead(n);prefs({read:n})};
 const token=async()=>await auth.currentUser?.getIdToken()??'';
 const upload=useCallback(async(raw:File,pid:string,kind:string)=>{
  try{const file=await normalizeUpload(raw);const token=await auth.currentUser?.getIdToken();const fd=new FormData();fd.append('file',file);fd.append('projectId',pid);fd.append('kind',kind);const res=await fetch('/api/files',{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:fd});const j=await res.json();if(!res.ok)throw new Error(j.error||'Upload failed');return {url:j.url,name:j.name,path:j.path}}catch(e){say(e instanceof Error?e.message:'Upload failed');return null}
 },[say]);
 const myProjects=projects; const mods=useMemo(()=>MODULES.filter(m=>user&&m.roles.includes(user.role)),[user]);
 const recsFor=useCallback((m:string,p?:string)=>recs.filter(x=>x.m===m&&(p?x.p===p:myProjects.some(y=>y.id===x.p))),[recs,myProjects]);
 return <C.Provider value={{ready,user,recs,audit,theme,toast,read,users,clients,projects,myProjects,mods,login,logout,setTheme,act,add,say,markRead,token,recsFor,upload}}>{children}</C.Provider>
}
export function notifsFor(user:User,recs:Rec[],pids:string[]){
 const mine=recs.filter(r=>pids.includes(r.p));const recent=Date.now()-14*86400000;const out:{id:string;text:string;href:string;tone:string}[]=[];
 mine.forEach(r=>{
  if(['approvals','variations'].includes(r.m)&&r.s==='Pending'&&user.role==='client')out.push({id:r.id,text:`Needs your approval: ${r.t}`,href:'/m/'+r.m,tone:'warn'});
  if(r.m==='payments'&&r.s==='Due'&&['client','accounts','admin'].includes(user.role))out.push({id:r.id,text:`Payment due ${r.d}: ${r.t}`,href:'/m/payments',tone:'bad'});
  if(r.m==='agreements'&&r.s.startsWith('Pending')&&user.role==='client')out.push({id:r.id,text:`Please acknowledge: ${r.t}`,href:'/m/agreements',tone:'warn'});
  if(r.m==='snags'&&['Open','In Progress'].includes(r.s)&&['pm','admin'].includes(user.role))out.push({id:r.id,text:`Open snag: ${r.t}`,href:'/m/snags',tone:'warn'});
  if(r.m==='snags'&&r.s==='Rectified'&&user.role==='client')out.push({id:r.id,text:`Please verify rectified snag: ${r.t}`,href:'/m/snags',tone:'good'});
  if(r.m==='requests'&&r.s==='In Review'&&['pm','admin'].includes(user.role))out.push({id:r.id,text:`Client request awaiting reply: ${r.t}`,href:'/m/requests',tone:'warn'});
  if(r.m==='approvals'&&r.s==='Pending'&&user.role==='designer')out.push({id:r.id,text:`Waiting on client: ${r.t}`,href:'/m/approvals',tone:'info'});
  if(r.m==='meetings'&&r.s==='Scheduled')out.push({id:r.id,text:`Upcoming ${r.d}: ${r.t}`,href:'/m/meetings',tone:'info'});
  if(r.m==='updates'&&user.role==='client'&&(r.ts??0)>=recent)out.push({id:r.id,text:`New site update: ${r.t}`,href:'/m/updates',tone:'good'});
 }); return out;
}
