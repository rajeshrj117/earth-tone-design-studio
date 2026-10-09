'use client';
import FormatHint from '@/components/FormatHint';
import { useState } from 'react';
import { Check, Minus, Plus, UserX, RotateCcw, Trash2 } from 'lucide-react';
import Shell from '@/components/Shell';
import { Empty, Head, Pill } from '@/components/ui';
import { ProtectedImage } from '@/components/Module';
import { useApp } from '@/lib/store';
import { MODULES, ROLE_LABEL, Role, User } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const roles: Role[] = ['admin','pm','designer','accounts','client'];
async function callAdmin(path:string, body:unknown) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
  const json=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(json.error||'Request failed');
  return json;
}

export default function Users() {
  const {user,users,projects,clients,say,upload,token}=useApp(); const [avatar,setAvatar]=useState<File|null>(null);
  const [open,setOpen]=useState(false), [editing,setEditing]=useState<User|null>(null);
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[role,setRole]=useState<Role>('client');
  const [title,setTitle]=useState(''),[clientId,setClientId]=useState(''),[assigned,setAssigned]=useState<string[]>([]);

  if(user&&user.role!=='admin') return <Shell><Empty text="User management is restricted to administrators." /></Shell>;
  const reset=()=>{setAvatar(null);setOpen(false);setEditing(null);setClientId('');setName('');setEmail('');setRole('client');setTitle('');setAssigned([])};
  const edit=(u:User)=>{setAvatar(null);setEditing(u);setName(u.name);setEmail(u.email);setRole(u.role);setTitle(u.title);setClientId(u.clientId||'');setAssigned(u.projects==='all'?projects.map(p=>p.id):u.projects);setOpen(true)};
  const save=async()=>{try{
    if(!name.trim()||(!editing&&!email.trim())) throw new Error('Name and email are required');
    let avatarUrl=editing?.avatarUrl||''; if(avatar&&assigned[0]){const u=await upload(avatar,assigned[0],'avatars');if(u)avatarUrl=u.url;} await callAdmin('/api/admin/users',editing?{action:'update',id:editing.id,name,email,role,projects:assigned,title,clientId,avatarUrl}:{name,email,role,projects:assigned,title,clientId,avatarUrl});
    if(!editing) await sendPasswordResetEmail(auth,email.trim().toLowerCase());
    say(editing?'User updated':'User created; password setup email sent');reset();
  }catch(e){say(e instanceof Error?e.message:'Save failed')}};
  const remove=async(u:User)=>{if(!u.id||!window.confirm(`Delete ${u.name}? This permanently removes the account.`))return;try{await callAdmin('/api/admin/users',{action:'delete',id:u.id});say('User deleted')}catch(e){say(e instanceof Error?e.message:'Delete failed')}};
  const toggle=async(u:User)=>{try{await callAdmin('/api/admin/users',{action:'deactivate',id:u.id,disabled:!u.disabled});say(u.disabled?'Account enabled':'Account disabled')}catch(e){say(e instanceof Error?e.message:'Action failed')}};
  const resetPw=async(u:User)=>{try{await sendPasswordResetEmail(auth,u.email);say('Password reset email sent')}catch(e){say(e instanceof Error?e.message:'Could not send reset email')}};

  return <Shell>
    <Head eyebrow="Access control" title="Users & Permissions" sub="Create accounts, assign roles and project access. Sensitive changes are server-authorized." />
    <div className="flex justify-end mb-5"><button className="btn primary" onClick={()=>{reset();setOpen(true)}}><Plus size={15}/>New user</button></div>
    <div className="card p-4 md:p-6 mb-6 overflow-x-auto">
      <table className="w-full text-sm"><thead><tr className="text-left muted text-xs uppercase tracking-wider"><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Projects</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{users.map(u=>
        <tr key={u.id} className="border-t" style={{borderColor:'var(--line)'}}>
          <td className="py-3 flex items-center gap-3"><span className="w-8 h-8 rounded-full overflow-hidden grid place-items-center text-white text-xs font-bold" style={{background:u.color}}>{u.avatarUrl?<ProtectedImage url={u.avatarUrl} token={token} className="w-full h-full object-cover"/>:u.name[0]}</span><b>{u.name}</b></td>
          <td className="muted">{u.email}</td><td><Pill s={ROLE_LABEL[u.role]}/></td>
          <td className="muted">{u.projects==='all'?'All projects':u.projects.length+' assigned'}</td><td>{u.disabled?<Pill s="Disabled"/>:<Pill s="Active" />}</td>
          <td><div className="flex gap-2"><button className="btn sm" onClick={()=>edit(u)}>Edit</button><button className="btn sm" onClick={()=>resetPw(u)}><RotateCcw size={13}/>Reset</button><button className="btn sm" onClick={()=>remove(u)}><Trash2 size={13}/>Delete</button><button className="btn sm" onClick={()=>toggle(u)}><UserX size={13}/>{u.disabled?'Enable':'Disable'}</button></div></td>
        </tr>
      )}</tbody></table>
    </div>
    <div className="card p-4 md:p-6 overflow-x-auto">
      <h2 className="serif text-2xl mb-4">Permission matrix</h2>
      <table className="w-full text-sm"><thead><tr className="text-left muted text-xs uppercase tracking-wider"><th className="py-2">Section</th>{roles.map(r=><th key={r} className="text-center">{ROLE_LABEL[r]}</th>)}</tr></thead>
      <tbody>{MODULES.map(m=><tr key={m.key} className="border-t" style={{borderColor:'var(--line)'}}><td className="py-2.5">{m.label}</td>{roles.map(r=><td key={r} className="text-center">{m.roles.includes(r)?<Check size={16} className="inline" style={{color:'var(--good)'}}/>:<Minus size={16} className="inline muted"/>}</td>)}</tr>)}</tbody></table>
    </div>
    {open&&<div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"><div className="card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center"><h2 className="serif text-2xl">{editing?'Edit user':'New user'}</h2><button className="btn" onClick={reset}>Close</button></div>
      <div className="space-y-3 mt-5">
        <input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input className="input" placeholder="Job title" value={title} onChange={e=>setTitle(e.target.value)}/>
        <select className="input" value={role} onChange={e=>setRole(e.target.value as Role)}>{roles.map(r=><option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
        {role==='client'&&<select className="input" value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Link client record</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
        <div className="flex flex-col gap-1 items-stretch w-full"><label className="btn w-full justify-center cursor-pointer">{avatar?avatar.name:'Upload avatar'}<input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.heic,.heif" onChange={e=>setAvatar(e.target.files?.[0]??null)}/></label><FormatHint accept=".jpg,.jpeg,.png,.webp,.heic,.heif"/></div><div><p className="text-sm font-semibold mb-2">Project access</p><div className="grid sm:grid-cols-2 gap-2">{projects.map(p=><label key={p.id} className="flex gap-2 items-center text-sm"><input type="checkbox" checked={assigned.includes(p.id)} onChange={e=>setAssigned(a=>e.target.checked?[...a,p.id]:a.filter(x=>x!==p.id))}/>{p.name}</label>)}</div></div>
        <button className="btn primary w-full justify-center" onClick={save}>{editing?'Save changes':'Create user'}</button>
      </div>
    </div></div>}
  </Shell>;
}