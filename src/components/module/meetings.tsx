import { CalendarDays } from 'lucide-react';
import { Pill } from '../ui';
import { Btn, CARD_BASE, addButton } from './helpers';
import { manage } from './recordActions';
import type { ModuleView } from './types';

export const meetings: ModuleView = {
  actions:c=>addButton(c,['admin','pm']),
  card:(r,c)=>{return <div key={r.id} className={CARD_BASE}><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl soft grid place-items-center"><CalendarDays size={19}/></div><div><b>{r.t}</b><p className="text-xs muted mt-1">{r.d} · {r.type||'Site visit'} · {r.attendees||'No attendees listed'}</p><p className="text-sm muted mt-1">{r.sub||''}</p></div></div><div className="flex gap-2 flex-wrap"><Pill s={r.s}/>{r.s==='Scheduled'&&<Btn onClick={()=>{const a=document.createElement('a');const dt=new Date(r.d);const start=Number.isNaN(dt.getTime())?'':dt.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');a.href='data:text/calendar;charset=utf-8,'+encodeURIComponent(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ETDS//Portal//EN\r\nBEGIN:VEVENT\r\n${start?`DTSTART:${start}\r\n`:''}SUMMARY:${r.t}\r\nDESCRIPTION:${(r.sub||'').replace(/\r?\n/g,' ')}\r\nEND:VEVENT\r\nEND:VCALENDAR`);a.download='meeting.ics';a.click()}}>Add to calendar</Btn>}{manage(r,c)}</div></div>},
};
