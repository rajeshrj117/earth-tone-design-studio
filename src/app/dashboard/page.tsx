'use client';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, IndianRupee, Hammer, Layers, ClipboardCheck, Wallet, Palette } from 'lucide-react';
import Shell from '@/components/Shell';
import Art from '@/components/Art';
import { Bar, Head, Pill, Stat } from '@/components/ui';
import { useApp, notifsFor } from '@/lib/store';
import { inr } from '@/lib/data';
import { money } from '@/lib/calc';

export default function Dashboard() {
  const { user, recs, myProjects, audit } = useApp();
  if (!user) return <Shell><div /></Shell>;
  const ids = myProjects.map(p => p.id); const mine = recs.filter(r => ids.includes(r.p));
  const role = user.role; const active = myProjects.filter(p => p.stage !== 'Completed');
  const tot = (f: (m: ReturnType<typeof money>) => number) => myProjects.reduce((a, p) => a + f(money(recs, p.id)), 0);
  const cnt = (m: string, s: string[]) => mine.filter(r => r.m === m && s.includes(r.s)).length;
  const alerts = notifsFor(user, recs, ids).filter(n => n.tone !== 'info').slice(0, 5);
  const nextMeet = mine.find(r => r.m === 'meetings' && r.s === 'Scheduled');
  const lastUpd = mine.find(r => r.m === 'updates');
  const hero = active[0] ?? myProjects[0];
  const first = user.name.split(' ')[0].replace('Dr.', 'Doctor');
  const stats = {
    client: [['Contract value', inr(tot(m => m.current)), 'Incl. approved variations', <IndianRupee size={17} key="cv"/>], ['Paid so far', inr(tot(m => m.paid)), '', <Wallet size={17} key="ps"/>], ['Payment due', inr(tot(m => m.due)), 'Submit payment manually', <AlertCircle size={17} key="pd"/>], ['Awaiting your approval', String(cnt('approvals', ['Pending']) + cnt('variations', ['Pending'])), 'Designs & variations', <ClipboardCheck size={17} key="aa"/>]],
    admin: [['Active projects', String(active.length), myProjects.length + ' in portfolio', <Layers size={17} key=""/>], ['Portfolio value', inr(tot(m => m.current)), '', <IndianRupee size={17} key=""/>], ['Collected', inr(tot(m => m.paid)), '', <Wallet size={17} key=""/>], ['Payment pending', inr(tot(m => m.due)), '', <AlertCircle size={17} key=""/>]],
    pm: [['Active projects', String(active.length), '', <Layers size={17} key=""/>], ['Approvals pending', String(cnt('approvals', ['Pending'])), 'Waiting on clients', <ClipboardCheck size={17} key=""/>], ['Open snags', String(cnt('snags', ['Open', 'In Progress'])), '', <Hammer size={17} key=""/>], ['Tasks in progress', String(cnt('tasks', ['In Progress'])), '', <CheckCircle2 size={17} key=""/>]],
    designer: [['My projects', String(myProjects.length), '', <Layers size={17} key=""/>], ['Design tasks', String(cnt('tasks', ['In Progress', 'Pending Client Approval'])), 'Active', <Palette size={17} key=""/>], ['Awaiting client', String(cnt('approvals', ['Pending'])), 'Approvals', <ClipboardCheck size={17} key=""/>], ['Documents', String(cnt('documents', ['v1', 'v2', 'v3', 'v4'])), 'Shared', <Layers size={17} key=""/>]],
    accounts: [['Collected', inr(tot(m => m.paid)), '', <Wallet size={17} key=""/>], ['Due now', inr(tot(m => m.due)), 'To follow up', <AlertCircle size={17} key=""/>], ['Upcoming', inr(tot(m => m.upcoming)), 'Scheduled stages', <CalendarDays size={17} key=""/>], ['Pending variations', inr(mine.filter(r => r.m === 'variations' && r.s === 'Pending').reduce((a, b) => a + (b.amt ?? 0), 0)), 'Unapproved', <IndianRupee size={17} key=""/>]],
  }[role] as [string, string, string, React.ReactNode][];

  return (
    <Shell>
      {role === 'client' && hero ? (
        <Link href={'/projects/' + encodeURIComponent(hero.id)} className="card block relative overflow-hidden mb-6 fade">
          <Art v={hero.img} className="w-full h-64 md:h-80" /><div className="absolute inset-0 hero-grad" />
          <div className="absolute bottom-0 p-6 md:p-8 text-white w-full"><p className="text-xs uppercase tracking-[.2em] opacity-80">Welcome back, {first}</p><h1 className="serif text-3xl md:text-4xl mt-1">{hero.name}</h1>
            <div className="flex items-center gap-4 mt-4 max-w-xl"><div className="flex-1"><div className="h-2 rounded-full bg-white/30"><div className="h-full rounded-full bg-white" style={{ width: hero.progress + '%' }} /></div></div><b>{hero.progress}%</b><Pill s={hero.stage} /></div><p className="text-sm opacity-80 mt-2">Handover planned {hero.handover}</p></div>
        </Link>
      ) : <Head eyebrow={{ admin: 'Studio overview', pm: 'Site operations', designer: 'Design studio', accounts: 'Finance desk', client: '' }[role]} title={`Good day, ${first}`} sub={`Here's what needs your attention across ${myProjects.length} project${myProjects.length > 1 ? 's' : ''}.`} />}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{stats.map(s => <Stat key={s[0]} label={s[0]} value={s[1]} hint={s[2]} icon={s[3]} />)}</div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="card p-6"><div className="flex justify-between mb-4"><h2 className="serif text-2xl">{role === 'client' ? 'Your projects' : 'Active projects'}</h2><Link href="/projects" className="text-sm underline muted">View all</Link></div>
            <div className="space-y-4">{(role === 'client' ? myProjects : active).map(p => { const m = money(recs, p.id); return (
              <Link href={'/projects/' + encodeURIComponent(p.id)} key={p.id} className="flex gap-4 items-center p-3 rounded-2xl hover:bg-[var(--soft)] transition"><Art v={p.img} className="w-24 h-20 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0"><div className="flex justify-between gap-2"><b className="truncate">{p.name}</b><Pill s={p.stage} /></div><p className="text-xs muted">{p.id} · {p.loc}</p><div className="mt-2"><Bar v={p.progress} /></div>
                  <div className="flex justify-between text-xs muted mt-1"><span>{p.progress}% complete</span>{role !== 'designer' && <span>{role === 'accounts' ? `Paid ${inr(m.paid)} of ${inr(m.current)}` : 'Contract ' + inr(m.current)}</span>}</div></div></Link>); })}</div></div>

          {role === 'admin' && <div className="card p-6"><h2 className="serif text-2xl mb-4">Collections by project</h2>
            <div className="space-y-3">{myProjects.map(p => { const m = money(recs, p.id); return <div key={p.id}><div className="flex justify-between text-sm"><span>{p.name.split(' — ')[0]}</span><span className="muted">{inr(m.paid)} / {inr(m.current)}</span></div><Bar v={Math.round(m.paid / m.current * 100)} /></div>; })}</div></div>}

          {(role === 'pm' || role === 'designer') && <div className="card p-6"><h2 className="serif text-2xl mb-4">{role === 'pm' ? 'Today on site' : 'My design tasks'}</h2>
            <div className="space-y-4">{mine.filter(r => r.m === 'tasks' && r.s !== 'Completed').map(t => <div key={t.id}><div className="flex justify-between text-sm"><b>{t.t}</b><span className="muted">{t.pct}%</span></div><Bar v={t.pct ?? 0} /></div>)}</div></div>}

          {role === 'accounts' && <div className="card p-6"><h2 className="serif text-2xl mb-4">Invoices to follow up</h2>
            {mine.filter(r => r.m === 'payments' && r.s === 'Due').map(r => <div key={r.id} className="flex justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--line)' }}><div><b>{r.t}</b><p className="text-xs muted">{myProjects.find(p => p.id === r.p)?.name} · due {r.d}</p></div><span className="serif text-xl">{inr(r.amt ?? 0)}</span></div>)}</div>}

          {role === 'client' && lastUpd && <div className="card overflow-hidden grid md:grid-cols-[260px_1fr]"><Art v={lastUpd.img} className="w-full h-44 md:h-full" /><div className="p-6"><p className="text-xs uppercase tracking-widest muted">Latest from site · {lastUpd.d}</p><h3 className="serif text-2xl mt-1">{lastUpd.t}</h3><p className="muted mt-2 text-sm">{lastUpd.sub}</p><Link href="/m/updates" className="btn sm mt-4">All updates <ArrowRight size={13} /></Link></div></div>}
        </div>

        <div className="space-y-6">
          <div className="card p-6"><h2 className="serif text-2xl mb-3">{role === 'client' ? 'Needs your attention' : 'Action items'}</h2>
            {alerts.length ? alerts.map(a => <Link key={a.id + a.text} href={a.href} className="flex gap-3 py-3 border-b last:border-0 text-sm hover:opacity-80" style={{ borderColor: 'var(--line)' }}><span className={'pill ' + a.tone} style={{ height: 'fit-content' }}>•</span>{a.text}</Link>) : <p className="muted text-sm">You&apos;re all caught up. 🎉</p>}</div>
          {nextMeet && <div className="card p-6"><p className="text-xs uppercase tracking-widest muted">Next visit</p><h3 className="serif text-xl mt-1">{nextMeet.t}</h3><p className="text-sm muted mt-1 flex items-center gap-2"><CalendarDays size={14} />{nextMeet.d} · {nextMeet.sub}</p></div>}
          {role === 'admin' && <div className="card p-6"><h2 className="serif text-2xl mb-3">Recent activity</h2>{audit.slice(0, 5).map(a => <div key={a.id} className="py-2.5 border-b last:border-0 text-sm" style={{ borderColor: 'var(--line)' }}><b>{a.who}</b> <span className="muted">{a.what}</span><div className="text-[11px] muted">{a.at}</div></div>)}</div>}
        </div>
      </div>
    </Shell>
  );
}
