import { NextRequest } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { adminDb } from '@/lib/firebase-admin';
import { MODULES, Rec, Role } from '@/lib/data';
import { requireUser, canProject, errorResponse, audit } from '@/lib/server-auth';

const CLIENT_CREATE = new Set(['requests', 'snags', 'feedback']);
const CLIENT_UPDATE: Record<string, string[]> = {
  approvals: ['s', 'd', 'changeRequest'],
  variations: ['s', 'd', 'changeRequest'],
  materials: ['s', 'd'],
  quotations: ['s', 'd'],
  snags: ['s'],
  completion: ['s'],
  agreements: ['s', 'd'],
};

const FIELDS: Record<string, Set<string>> = {
  scope:new Set(['p','m','t','s','d','sub','trade','startDate','amt']),
  quotations:new Set(['p','m','t','s','d','sub','version','amt','fileUrl','fileName']),
  variations:new Set(['p','m','t','s','d','sub','category','amt','version','fileUrl','fileName','changeRequest']),
  timeline:new Set(['p','m','t','s','d','sub','owner','startDate','endDate']),
  floorplans:new Set(['p','m','t','s','d','sub','level','drawingNo','area','fileUrl','fileName']),
  materials:new Set(['p','m','t','s','d','sub','category','specification','supplier','amt','fileUrl','fileName']),
  expenses:new Set(['p','m','t','s','d','sub','category','vendor','amt','fileUrl','fileName']),
  tasks:new Set(['p','m','t','s','d','sub','owner','priority','pct']),
  approvals:new Set(['p','m','t','s','d','sub','owner','type','fileUrl','fileName','changeRequest']),
  documents:new Set(['p','m','t','s','d','sub','type','version','fileUrl','fileName']),
  updates:new Set(['p','m','t','s','d','sub','type','fileUrl','fileName']),
  meetings:new Set(['p','m','t','s','d','sub','type','attendees']),
  requests:new Set(['p','m','t','s','d','sub','category','priority']),
  snags:new Set(['p','m','t','s','d','sub','location','priority','fileUrl','fileName']),
  completion:new Set(['p','m','t','s','d','sub','owner']),
  feedback:new Set(['p','m','t','s','d','pct','rating','comments']),
};

const STATUS: Record<string,string[]> = {
  scope:['Planned','Upcoming','In Progress','Completed','On Hold'],
  quotations:['Draft','Sent','Under Review','Approved','Rejected','Superseded'],
  variations:['Draft','Pending','Approved','Rejected','Under Estimate'],
  timeline:['Upcoming','In Progress','Completed','Delayed'],
  floorplans:['Concept','Draft','Review','Approved','Issued','Superseded'],
  materials:['Awaiting selection','Shortlisted','Selected','Rejected','Ordered','Delivered'],
  expenses:['Pending','Approved','Paid','Rejected'],
  tasks:['Upcoming','In Progress','Pending Client Approval','Completed','Blocked'],
  approvals:['Pending','Approved','Changes requested','Rejected'],
  documents:['Draft','Uploaded','Approved','Superseded'],
  updates:['Site','Design','Milestone','Issue'],
  meetings:['Scheduled','Completed','Cancelled','Done'],
  requests:['In Review','Approved','Rejected','Resolved'],
  snags:['Open','In Progress','Rectified','Closed'],
  completion:['Pending','In Progress','Done'],
  feedback:['Rated']
};

function clean(v: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined));
}

export async function POST(req: NextRequest) {
  try {
    const { uid, profile } = await requireUser(req);
    const body = await req.json() as { action: 'create'|'update'|'delete'; id?: string; record?: Partial<Rec>; patch?: Partial<Rec>; what?: string };
    const db = adminDb();

    if (body.action === 'create') {
      const r = body.record as Partial<Rec>;
      if (!r?.p || !r.m || !r.t || !r.s || !canProject(profile, r.p)) throw new Error('FORBIDDEN');
      const def = MODULES.find(x => x.key === r.m);
      if (!def || !def.roles.includes(profile.role)) throw new Error('FORBIDDEN');
      if (profile.role === 'client' && !CLIENT_CREATE.has(r.m)) throw new Error('FORBIDDEN');
      if (r.m === 'payments' || r.m === 'agreements') throw new Error('FORBIDDEN');
      if (profile.role === 'designer' && !['updates','documents','tasks','materials','approvals','floorplans'].includes(r.m)) throw new Error('FORBIDDEN');
      if (profile.role === 'accounts' && !['quotations','variations','expenses'].includes(r.m)) throw new Error('FORBIDDEN');
      const fields = FIELDS[r.m];
      if (!fields || Object.keys(r).some(k => !fields.has(k))) throw new Error('INVALID_RECORD_FIELDS');
      if (typeof r.t !== 'string' || r.t.trim().length > 200) throw new Error('INVALID_TITLE');
      if (typeof r.s !== 'string' || !STATUS[r.m]?.includes(r.s)) throw new Error('INVALID_STATUS');
      if (r.m === 'requests' && !/^REQ-\d{4}-\d{4,}$/.test(r.t)) {
        const year = new Date().getFullYear();
        const counterRef=db.doc(`counters/requests-${year}`);
        const count=await db.runTransaction(async tx=>{const snap=await tx.get(counterRef);const next=(Number(snap.data()?.value)||0)+1;tx.set(counterRef,{value:next},{merge:true});return next;});
        r.t = `REQ-${year}-${String(count).padStart(4,'0')} · ${r.t}`;
      }
      if (r.m === 'variations' && !/^VAR-\d{4}-\d{4,}/.test(r.t)) {
        const year = new Date().getFullYear();
        const counterRef=db.doc(`counters/variations-${year}`);
        const count=await db.runTransaction(async tx=>{const snap=await tx.get(counterRef);const next=(Number(snap.data()?.value)||0)+1;tx.set(counterRef,{value:next},{merge:true});return next;});
        r.t = `VAR-${year}-${String(count).padStart(4,'0')} · ${r.t}`;
      }
      const now = Date.now();
      const safeRecord = Object.fromEntries(Object.entries(r).filter(([k,v]) => fields.has(k) && v !== undefined));
      const ref = await db.collection('records').add({ ...safeRecord, by: uid, ts: now, seq: now });
      if (r.m === 'timeline') {
        const snapAll = await db.collection('records').where('p','==',r.p).where('m','==','timeline').get();
        const progress = snapAll.size ? Math.round(snapAll.docs.filter(d => d.data().s === 'Completed').length / snapAll.size * 100) : 0;
        await db.doc(`projects/${r.p}`).set({progress}, {merge:true});
      }
      await audit(uid, profile, body.what || `Created ${r.m}: ${r.t}`, r.p);
      return Response.json({ id: ref.id });
    }

    const id = body.id;
    if (!id) throw new Error('FORBIDDEN');
    const ref = db.doc(`records/${id}`);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: 'Record not found' }, { status: 404 });
    const old = snap.data() as Rec;
    if (!canProject(profile, old.p)) throw new Error('FORBIDDEN');
    const editableRoles = ['admin','pm','designer','accounts'];
    if (body.action === 'delete') {
      if (!editableRoles.includes(profile.role)) throw new Error('FORBIDDEN');
      if (old.m === 'payments' || old.m === 'agreements') throw new Error('FORBIDDEN');
      if (profile.role === 'designer' && !['tasks','documents','updates','approvals','materials','floorplans'].includes(old.m)) throw new Error('FORBIDDEN');
      if (profile.role === 'accounts' && !['quotations','variations','expenses'].includes(old.m)) throw new Error('FORBIDDEN');
      if (old.fileUrl) { const path = new URL(old.fileUrl, 'http://localhost').searchParams.get('path'); if (path && path.startsWith('projects/')) await getStorage().bucket().file(path).delete({ignoreNotFound:true}); }
      await ref.delete();
      if (old.m === 'timeline') {
        const snapAll = await db.collection('records').where('p','==',old.p).where('m','==','timeline').get();
        const progress = snapAll.size ? Math.round(snapAll.docs.filter(d => d.data().s === 'Completed').length / snapAll.size * 100) : 0;
        await db.doc(`projects/${old.p}`).set({progress}, {merge:true});
      }
      await audit(uid, profile, body.what || `Deleted ${old.m}: ${old.t}`, old.p);
      return Response.json({ ok: true });
    }
    const patch = clean((body.patch || {}) as Record<string, unknown>);
    // The edit form sends the whole record; immutable fields that are unchanged are harmless, so drop them
    // instead of rejecting the request. A changed value is still refused below.
    for (const k of ['p','m','by','ts','seq']) if (k in patch && patch[k] === (old as unknown as Record<string, unknown>)[k]) delete patch[k];
    const fields = FIELDS[old.m];
    if (!fields || Object.keys(patch).some(k => !fields.has(k) || ['p','m','by','ts','seq'].includes(k))) throw new Error('FORBIDDEN');
    if ('s' in patch && (typeof patch.s !== 'string' || !STATUS[old.m]?.includes(patch.s))) throw new Error('INVALID_STATUS');

    if (profile.role === 'client') {
      const allowed = CLIENT_UPDATE[old.m] || [];
      if (!Object.keys(patch).every(k => allowed.includes(k))) throw new Error('FORBIDDEN');
      if (old.m === 'approvals' && old.s !== 'Pending') throw new Error('FORBIDDEN');
      if (old.m === 'variations' && old.s !== 'Pending') throw new Error('FORBIDDEN');
      if (old.m === 'snags' && (old.s !== 'Rectified' || patch.s !== 'Closed')) throw new Error('FORBIDDEN');
      if (old.m === 'completion' && !old.t.toLowerCase().includes('acknowledgement')) throw new Error('FORBIDDEN');
    } else {
      if (!['admin','pm','designer','accounts'].includes(profile.role)) throw new Error('FORBIDDEN');
      if (profile.role === 'designer') {
        if (!['tasks','documents','updates','approvals','materials','floorplans'].includes(old.m)) throw new Error('FORBIDDEN');

      }
      if (profile.role === 'pm' && (old.m === 'payments' || old.m === 'agreements')) throw new Error('FORBIDDEN');
      if (profile.role === 'accounts' && !['quotations','variations','expenses'].includes(old.m)) throw new Error('FORBIDDEN');
    }
    await ref.update(patch);
    if (old.m === 'timeline' && typeof patch.s === 'string') {
      const snapAll = await db.collection('records').where('p','==',old.p).where('m','==','timeline').get();
      const completed = snapAll.docs.filter(d => d.data().s === 'Completed').length; // the patch is already written, so the snapshot includes this change
      const progress = snapAll.size ? Math.round(completed / snapAll.size * 100) : 0;
      await db.doc(`projects/${old.p}`).set({progress}, {merge:true});
    }
    await audit(uid, profile, body.what || `Updated ${old.m}: ${old.t}`, old.p);
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
