'use client';
import FormatHint from '@/components/FormatHint';
import Shell from '@/components/Shell';
import { Head, Pill } from '@/components/ui';
import { ProtectedImage } from '@/components/Module';
import { useState } from 'react';
import { Upload, KeyRound } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useApp } from '@/lib/store';
import { ROLE_LABEL } from '@/lib/data';

export default function Settings() {
  const { user, theme, setTheme, say, upload, myProjects, token } = useApp(); const [name,setName]=useState(user?.name||''); const [avatar,setAvatar]=useState<File|null>(null); const [emailNotify,setEmailNotify]=useState(true);
  const T = [['earth', 'Earth Clay', ['#f7f1e8', '#b5654a', '#3b2d26']], ['sage', 'Sage Garden', ['#f1f4ee', '#4f7a5e', '#233a2e']], ['ink', 'Midnight Oak', ['#16130f', '#d98c5f', '#0f0d0a']]] as const;
  return (
    <Shell><Head eyebrow="Preferences" title="Settings" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6"><h2 className="serif text-2xl mb-4">Profile</h2><div className="flex items-center gap-4"><div className="w-16 h-16 rounded-full overflow-hidden grid place-items-center text-white text-xl font-bold" style={{ background: user?.color }}>{user?.avatarUrl?<ProtectedImage url={user.avatarUrl} token={token} className="w-full h-full object-cover"/>:user?.name[0]}</div><div className="flex-1"><input className="input" value={name} onChange={e=>setName(e.target.value)} /><p className="text-sm muted mt-1">{user?.email}</p><Pill s={user ? ROLE_LABEL[user.role] : ''} /></div></div><div className="flex gap-2 mt-4 flex-wrap"><button className="btn primary" onClick={async()=>{try{const tk=await auth.currentUser?.getIdToken();const r=await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json',...(tk?{Authorization:'Bearer '+tk}:{})},body:JSON.stringify({name})});if(!r.ok)throw new Error('Could not save profile');say('Profile updated')}catch(e){say(e instanceof Error?e.message:'Could not save profile')}}}>Save name</button><div className="flex flex-col gap-1 items-start"><label className="btn cursor-pointer"><Upload size={14}/>{avatar?'Avatar selected':'Change avatar'}<input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.heic,.heif" onChange={async e=>{const f=e.target.files?.[0];if(!f||!myProjects[0]?.id)return;const u=await upload(f,myProjects[0].id,'avatars');if(!u)return;const tk=await auth.currentUser?.getIdToken();await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json',...(tk?{Authorization:'Bearer '+tk}:{})},body:JSON.stringify({avatarUrl:u.url})});setAvatar(f);say('Avatar updated')}}/></label><FormatHint accept=".jpg,.jpeg,.png,.webp,.heic,.heif"/></div><button className="btn" onClick={async()=>{try{if(!user?.email)throw new Error();await sendPasswordResetEmail(auth,user.email);say('Password reset email sent')}catch{say('Could not send password reset email')}}}><KeyRound size={14}/>Change password</button></div></div>
        <div className="card p-6"><h2 className="serif text-2xl mb-4">Appearance</h2><div className="grid grid-cols-3 gap-3">{T.map(t => <button key={t[0]} onClick={() => { setTheme(t[0]); say(t[1] + ' theme applied'); }} className="rounded-2xl border-2 p-2 text-left" style={{ borderColor: theme === t[0] ? 'var(--brand)' : 'var(--line)' }}><div className="h-14 rounded-xl flex overflow-hidden">{t[2].map(c => <i key={c} className="flex-1" style={{ background: c }} />)}</div><p className="text-xs font-semibold mt-2">{t[1]}</p></button>)}</div></div>
        <div className="card p-6 lg:col-span-2"><h2 className="serif text-2xl">Notifications</h2><label className="flex items-center gap-3 mt-4"><input type="checkbox" checked={emailNotify} onChange={e=>setEmailNotify(e.target.checked)}/> Email notifications enabled</label><p className="text-xs muted mt-2">Payment reminders and portal alerts can be controlled here.</p></div><div className="card p-6 lg:col-span-2"><h2 className="serif text-2xl">Data & security</h2><p className="muted text-sm mt-1">Your data is stored in Firebase Firestore and synced live. Access is enforced server-side by Firestore security rules based on your role and assigned projects.</p></div>
      </div></Shell>
  );
}
