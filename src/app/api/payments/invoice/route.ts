import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser, canProject, errorResponse } from '@/lib/server-auth';

function makePdf(lines:string[]){
 const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
 const c=['BT','/F1 22 Tf','50 760 Td',`(${esc(lines[0])}) Tj`,'/F1 11 Tf','0 -35 Td',...lines.slice(1).flatMap(x=>[`(${esc(x)}) Tj`,'0 -22 Td']),'ET'].join('\n');
 const o=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(c)} >>\nstream\n${c}\nendstream`];
 let out='%PDF-1.4\n',off=[0];o.forEach((x,i)=>{off[i+1]=Buffer.byteLength(out);out+=`${i+1} 0 obj\n${x}\nendobj\n`});const x=Buffer.byteLength(out);out+=`xref\n0 ${o.length+1}\n0000000000 65535 f \n`;for(let i=1;i<off.length;i++)out+=`${String(off[i]).padStart(10,'0')} 00000 n \n`;out+=`trailer\n<< /Size ${o.length+1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;return Buffer.from(out,'binary');
}
export async function GET(req:NextRequest){
 try{
  const {profile}=await requireUser(req);if(!['admin','accounts','client'].includes(profile.role))throw new Error('FORBIDDEN');const id=new URL(req.url).searchParams.get('id');if(!id)throw new Error('FORBIDDEN');const snap=await adminDb().doc(`payments/${id}`).get();if(!snap.exists)return new Response('Not found',{status:404});const p=snap.data() as {p:string;t:string;s:string;amt?:number;paidAt?:number;};if(!canProject(profile,p.p))throw new Error('FORBIDDEN');
  const project=(await adminDb().doc(`projects/${p.p}`).get()).data() as {name?:string}|undefined;const rate=Number(process.env.GST_RATE||18);const base=Number(p.amt||0);const tax=base*rate/100;const half=tax/2;
  const lines=['EARTH TONE DESIGN STUDIO','TAX INVOICE',`Invoice: INV-${id}`,`GSTIN: ${process.env.GSTIN||'Configure GSTIN'}`,`Project: ${project?.name||p.p}`,`Description: ${p.t}`,`Taxable value: INR ${base.toLocaleString('en-IN')}`,`GST ${rate}%: INR ${tax.toLocaleString('en-IN')}`,`CGST ${rate/2}%: INR ${half.toLocaleString('en-IN')}`,`SGST ${rate/2}%: INR ${half.toLocaleString('en-IN')}`,`Total: INR ${(base+tax).toLocaleString('en-IN')}`,`Date: ${new Date(p.paidAt||Date.now()).toLocaleString('en-IN')}`];
  return new Response(makePdf(lines) as unknown as BodyInit,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="INV-${id}.pdf"`}});
 }catch(e){return errorResponse(e)}
}
