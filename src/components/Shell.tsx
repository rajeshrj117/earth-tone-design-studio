'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ComponentType, FormEvent, ReactNode, useEffect, useState } from 'react';
import * as L from 'lucide-react';
import { useApp, notifsFor } from '@/lib/store';
import { ROLE_LABEL } from '@/lib/data';

const THEMES = [['earth', '#b5654a'], ['sage', '#4f7a5e'], ['ink', '#2a2018']];
export default function Shell({ children }: { children: ReactNode }) {
  const { ready, user, logout, theme, setTheme, toast, mods, myProjects, recs } = useApp();
  const r = useRouter(); const path = usePathname(); const [open, setOpen] = useState(false); const [q,setQ]=useState('');
  useEffect(() => { if (ready && !user) r.replace('/'); }, [ready, user, r]);
  if (!ready || !user) return <div className="min-h-screen grid place-items-center muted">Loading…</div>;
  const Ic = (n: string) => { const C = (L as unknown as Record<string, ComponentType<{size?: number}>>)[n] ?? L.Circle; return <C size={17} />; };
  const n = notifsFor(user, recs, myProjects.map(p => p.id)).length;
  const staff = user.role !== 'client';
  const links: [string, string, string][] = [['Dashboard', '/dashboard', 'LayoutDashboard'], ['Projects', '/projects', 'FolderKanban']];
  if (['admin', 'pm', 'accounts'].includes(user.role)) links.push(['Clients', '/clients', 'Users']);
  const tail: [string, string, string][] = [];
  if (['admin', 'pm', 'accounts'].includes(user.role)) tail.push(['Reports', '/reports', 'BarChart3']);
  if (user.role === 'admin') tail.push(['Audit Trail', '/audit', 'History'], ['Users & Roles', '/users', 'ShieldCheck']);
  tail.push(['Settings', '/settings', 'Settings']);
  const item = (a: [string, string, string]) => <Link key={a[1]} href={a[1]} onClick={() => setOpen(false)} className={'nav ' + (path === a[1] || path.startsWith(a[1] + '/') ? 'on' : '')}>{Ic(a[2])}{a[0]}</Link>;
  return (
    <div className="min-h-screen lg:flex">
      <div className={'fixed inset-0 z-30 bg-black/50 lg:hidden ' + (open ? '' : 'hidden')} onClick={() => setOpen(false)} />
      <aside className={'side fixed inset-y-0 left-0 z-40 w-72 p-4 overflow-y-auto transition-transform lg:translate-x-0 ' + (open ? '' : '-translate-x-full')}>
        <div className="flex items-center gap-3 px-2 mb-6"><div className="w-10 h-10 rounded-2xl grid place-items-center serif text-lg" style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}>E</div><div><div className="serif text-lg leading-tight">Earth Tone</div><div className="text-[11px] opacity-60 tracking-wider uppercase">Design Studio</div></div></div>
        <nav className="space-y-1">{links.map(item)}
          <div className="text-[11px] uppercase tracking-widest opacity-50 px-3 pt-5 pb-1">{staff ? 'Workspace' : 'Your project'}</div>
          {mods.map(m => item([m.label, '/m/' + m.key, m.icon]))}
          <div className="text-[11px] uppercase tracking-widest opacity-50 px-3 pt-5 pb-1">Studio</div>
          {tail.map(item)}
        </nav>
      </aside>
      <div className="flex-1 lg:ml-72 min-w-0">
        <div className="sticky top-0 z-20 glass flex items-center gap-3 px-4 md:px-8 py-3">
          <button className="btn menu-btn" onClick={() => setOpen(true)} aria-label="Menu"><L.Menu size={16} /></button>
          <div className="relative flex-1 max-w-md hidden md:block"><L.Search size={15} className="absolute left-3 top-3 muted" /><form className="relative w-full" onSubmit={(e:FormEvent)=>{e.preventDefault();if(q.trim())r.push('/search?q='+encodeURIComponent(q.trim()))}}><input className="input" style={{paddingLeft:36}} placeholder="Search projects, clients, tasks…" value={q} onChange={e=>setQ(e.target.value)} /></form></div>
          <div className="flex-1 md:hidden" />
          <div className="flex gap-1.5 mr-1">{THEMES.map(t => <button key={t[0]} title={t[0] + ' theme'} onClick={() => setTheme(t[0])} className="w-6 h-6 rounded-full border-2" style={{ background: t[1], borderColor: theme === t[0] ? 'var(--ink)' : 'transparent' }} />)}</div>
          <Link href="/notifications" className="btn relative" aria-label="Notifications"><L.Bell size={16} />{n > 0 && <span className="absolute -top-1.5 -right-1.5 text-[10px] rounded-full px-1.5 font-bold" style={{ background: 'var(--bad)', color: '#fff' }}>{n}</span>}</Link>
          <div className="flex items-center gap-2.5 pl-2 border-l" style={{ borderColor: 'var(--line)' }}>
            <div className="w-9 h-9 rounded-full grid place-items-center text-white text-sm font-bold" style={{ background: user.color }}>{user.name.split(' ').map(x => x[0]).slice(-2).join('')}</div>
            <div className="hidden sm:block leading-tight"><div className="text-sm font-semibold">{user.name}</div><div className="text-[11px] muted">{ROLE_LABEL[user.role]}</div></div>
            <button className="btn sm ghost" onClick={() => { logout(); r.push('/'); }} title="Sign out"><L.LogOut size={14} /></button>
          </div>
        </div>
        <main className="p-4 md:p-8 max-w-[1400px]">{children}</main>
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl text-sm font-semibold fade shadow-xl" style={{ background: 'var(--ink)', color: 'var(--bg)' }}>{toast}</div>}
    </div>
  );
}
