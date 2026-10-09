'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { Head, Empty, Pill } from '@/components/ui';
import { useApp } from '@/lib/store';

export default function SearchPage(){
 const [q,setQ]=useState(''); useEffect(()=>{const value=new URLSearchParams(window.location.search).get('q')?.trim().toLowerCase()||''; queueMicrotask(()=>setQ(value))},[]); const {recs,myProjects,clients}=useApp();
 if(!q)return <Shell><Head eyebrow="Search" title="Search" sub="Search projects, clients and records."/><Empty text="Enter a search term above."/></Shell>;
 const projects=myProjects.filter(p=>[p.id,p.name,p.client,p.type,p.loc].join(' ').toLowerCase().includes(q));
 const cl=clients.filter(c=>[c.name,c.contact,c.email,c.phone,c.city].join(' ').toLowerCase().includes(q));
 const rs=recs.filter(r=>[r.id,r.p,r.m,r.t,r.s,r.d,r.sub].join(' ').toLowerCase().includes(q)).slice(0,80);
 return <Shell><Head eyebrow="Search" title={`Results for “${q}”`} sub={`${projects.length+cl.length+rs.length} matches found.`}/><div className="space-y-5">
 {projects.length>0&&<section><h2 className="serif text-2xl mb-3">Projects</h2><div className="grid md:grid-cols-2 gap-3">{projects.map(p=><Link key={p.id} href={'/projects/'+encodeURIComponent(p.id)} className="card p-4"><b>{p.name}</b><p className="text-xs muted">{p.id} · {p.client}</p></Link>)}</div></section>}
 {cl.length>0&&<section><h2 className="serif text-2xl mb-3">Clients</h2><div className="grid md:grid-cols-2 gap-3">{cl.map(c=><Link href={'/clients?client='+c.id} key={c.id} className="card p-4 block"><b>{c.name}</b><p className="text-xs muted">{c.contact} · {c.email}</p></Link>)}</div></section>}
 {rs.length>0&&<section><h2 className="serif text-2xl mb-3">Records</h2><div className="space-y-2">{rs.map(r=><Link key={r.id} href={'/m/'+r.m} className="card p-4 flex justify-between gap-3"><div><b>{r.t}</b><p className="text-xs muted">{r.p} · {r.d}</p></div><Pill s={r.s}/></Link>)}</div></section>}
 {!projects.length&&!cl.length&&!rs.length&&<Empty text="No accessible results found."/>}</div></Shell>
}