// Usage: SEED_PASSWORD='a-strong-password' npm run seed
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { adminAuth, adminDb } from '../src/lib/firebase-admin';
import { AUDIT_SEED, CLIENTS, PROJECTS, SEED, USERS } from '../src/lib/data';

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 10) throw new Error('Set SEED_PASSWORD to a strong password (10+ chars). It is never bundled into the browser.');
  const auth=adminAuth(),db=adminDb();
  for(const u of USERS){
    let uid:string;
    try{uid=(await auth.getUserByEmail(u.email)).uid}catch{uid=(await auth.createUser({email:u.email,password,displayName:u.name})).uid}
    await db.doc(`users/${uid}`).set({...u,theme:'earth',read:[],disabled:false});
  }
  const batch=db.batch();PROJECTS.forEach(p=>batch.set(db.doc(`projects/${p.id}`),p));CLIENTS.forEach(c=>batch.set(db.doc(`clients/${c.id}`),c));await batch.commit();
  const normal=SEED.filter(r=>!['payments','agreements'].includes(r.m));
  const payments=SEED.filter(r=>r.m==='payments'); const agreements=SEED.filter(r=>r.m==='agreements');
  for(let i=0;i<normal.length;i+=400){const b=db.batch();normal.slice(i,i+400).forEach((r,j)=>{const{id,...rest}=r;b.set(db.doc(`records/${id}`),{...rest,ts:Date.now(),seq:i+j})});await b.commit()}
  for(const [collectionName,items] of [['payments',payments],['agreements',agreements]] as const){
    for(let i=0;i<items.length;i+=400){const b=db.batch();items.slice(i,i+400).forEach((r,j)=>{const{id,...rest}=r;b.set(db.doc(`${collectionName}/${id}`),{...rest,ts:Date.now(),seq:i+j})});await b.commit()}
  }
  const ab=db.batch();AUDIT_SEED.forEach((a,i)=>{const{id,...rest}=a;ab.set(db.doc(`audit/${id}`),{...rest,ts:Date.now()-(i+1)*3600000})});await ab.commit();
  console.log(`Seeded ${PROJECTS.length} projects, ${normal.length} records, ${payments.length} payments, ${agreements.length} agreements.`);
}
main().catch(e=>{console.error(e);process.exit(1)});
