import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser, canProject, errorResponse, audit } from '@/lib/server-auth';
type PaymentData={p:string;t:string;s:string;amt?:number;d?:string;};

export async function POST(req: NextRequest) {
  try {
    const { uid, profile } = await requireUser(req);
    const b = await req.json() as {
      action: 'submit-manual' | 'record' | 'reject' | 'create-milestone' | 'update-milestone' | 'delete-milestone';
      paymentId?: string; projectId?: string; amount?: number; method?: string; name?: string; status?: string;
      reference?: string; paidDate?: string; date?: string; note?: string; proofUrl?: string; proofName?: string; reason?: string;
    };
    const db = adminDb();


    if (b.action === 'create-milestone') {
      if (!['admin','accounts'].includes(profile.role) || !b.projectId || !canProject(profile, b.projectId) || !b.amount || b.amount < 0 || !(b.name||b.method)) throw new Error('FORBIDDEN');
      const ref = db.collection('payments').doc();
      await ref.set({ p:b.projectId,m:'payments',t:b.name||b.method,s:(b.status==='Upcoming'?'Upcoming':'Due'),d:b.date||b.paidDate||'TBD',amt:Math.round(Number(b.amount)),sub:b.note||'Payment milestone',ts:Date.now() });
      await audit(uid,profile,`Created payment milestone: ${b.name||b.method}`,b.projectId);
      return Response.json({ok:true,id:ref.id});
    }

    if (b.action === 'submit-manual') {
      if (!['client','admin','accounts'].includes(profile.role) || !b.projectId || !canProject(profile, b.projectId) || !b.amount || b.amount <= 0) throw new Error('FORBIDDEN');
      const method = String(b.method || '').trim();
      if (!method) throw new Error('FORBIDDEN');
      const ref = db.collection('payments').doc();
      const data = {
        p: b.projectId, m: 'payments', t: 'Manual payment · ' + method,
        s: 'Pending verification', d: b.paidDate || new Date().toLocaleDateString('en-IN'),
        amt: Math.round(Number(b.amount)), sub: b.note || 'Submitted manually for verification',
        paymentMethod: method, paymentRef: b.reference || '', paidAt: Date.now(),
        proofUrl: b.proofUrl || '', proofName: b.proofName || '', submittedBy: uid, submittedByName: profile.name,
        ts: Date.now()
      };
      await ref.set(data);
      await audit(uid, profile, `Submitted manual payment of ₹${Math.round(Number(b.amount)).toLocaleString('en-IN')} via ${method}`, b.projectId);
      return Response.json({ ok: true, id: ref.id });
    }


    if (b.action === 'reject') {
      if (!['admin','accounts'].includes(profile.role) || !b.paymentId || !b.reason?.trim()) throw new Error('FORBIDDEN');
      const ref = db.doc(`payments/${b.paymentId}`), snap = await ref.get();
      if (!snap.exists) return Response.json({ error: 'Payment not found' }, { status: 404 });
      const payment = snap.data() as PaymentData;
      if (!canProject(profile, payment.p)) throw new Error('FORBIDDEN');
      await ref.set({ s: 'Rejected', rejectionReason: b.reason.trim(), rejectedAt: Date.now(), rejectedBy: uid, rejectedByName: profile.name }, { merge: true });
      await audit(uid, profile, `Rejected manual payment: ${b.reason.trim()}`, payment.p || '');
      return Response.json({ ok: true });
    }

    if (b.action === 'update-milestone' || b.action === 'delete-milestone') {
      if (!['admin','accounts'].includes(profile.role) || !b.paymentId) throw new Error('FORBIDDEN');
      const ref = db.doc(`payments/${b.paymentId}`), snap = await ref.get();
      if (!snap.exists) return Response.json({ error: 'Payment milestone not found' }, { status: 404 });
      const payment = snap.data() as PaymentData;
      if (!canProject(profile, payment.p)) throw new Error('FORBIDDEN');
      if (b.action === 'delete-milestone') {
        await ref.delete();
        await audit(uid, profile, `Deleted payment milestone: ${payment.t}`, payment.p);
        return Response.json({ ok: true });
      }
      const patch: Record<string, unknown> = {
        ...((b.name||b.reference) ? { t: b.name||b.reference } : {}),
        ...(b.amount != null ? { amt: Math.round(Number(b.amount)) } : {}),
        ...(b.method ? { paymentMethod: b.method } : {}),
        ...((b.date||b.paidDate) ? { d: b.date||b.paidDate } : {}),
        ...(b.note != null ? { sub: b.note } : {})
      };
      if (b.status === 'Upcoming' || b.status === 'Due' || b.status === 'Received') patch.s = b.status; else if (b.reason === 'Upcoming' || b.reason === 'Due' || b.reason === 'Received') patch.s = b.reason;
      await ref.set(patch, { merge: true });
      await audit(uid, profile, `Updated payment milestone: ${payment.t}`, payment.p);
      return Response.json({ ok: true });
    }

    if (b.action === 'record') {
      if (!['admin', 'accounts'].includes(profile.role) || !b.paymentId) throw new Error('FORBIDDEN');
      const ref = db.doc(`payments/${b.paymentId}`), snap = await ref.get();
      if (!snap.exists) return Response.json({ error: 'Payment not found' }, { status: 404 });
      const payment = snap.data() as PaymentData;
      if (!canProject(profile, payment.p)) throw new Error('FORBIDDEN');
      await ref.set({ s: 'Received', verifiedAt: Date.now(), recordedBy: uid, verifiedByName: profile.name }, { merge: true });
      await audit(uid, profile, `Verified manual payment: ${b.paymentId}`, payment.p || '');
      return Response.json({ ok: true });
    }

    throw new Error('FORBIDDEN');
  } catch (e) { return errorResponse(e); }
}
