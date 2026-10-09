'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import Shell from '@/components/Shell';
import { Empty, Head } from '@/components/ui';
import { useApp, notifsFor } from '@/lib/store';

export default function Notifications() {
  const { user, recs, myProjects, read, markRead } = useApp();
  const list = user ? notifsFor(user, recs, myProjects.map(p => p.id)) : [];
  return (
    <Shell><Head eyebrow="Inbox" title="Notifications" right={list.length ? <div className="flex gap-2"><div className="flex gap-2"><button className="btn" onClick={() => markRead(list.map(n => n.id + n.text))}>Mark all read</button><button className="btn" onClick={() => markRead(list.map(n => n.id + n.text))}>Clear</button></div><button className="btn" onClick={() => markRead(list.map(n => n.id + n.text))}>Clear</button></div> : undefined} />
      {list.length ? <div className="card p-2">{list.map(n => { const k = n.id + n.text; return <Link key={k} href={n.href} onClick={() => markRead([k])} className="flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--soft)]" style={{ opacity: read.includes(k) ? 0.5 : 1 }}><span className={'pill ' + n.tone}><Bell size={13} /></span><span className="text-sm">{n.text}</span></Link>; })}</div> : <Empty text="You're all caught up." />}</Shell>
  );
}
