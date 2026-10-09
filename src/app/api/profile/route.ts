import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser, errorResponse, audit } from '@/lib/server-auth';
export async function POST(req:NextRequest){try{const {uid,profile}=await requireUser(req);const b=await req.json() as {name?:string;avatarUrl?:string};const patch:Record<string,string>={};if(typeof b.name==='string'&&b.name.trim())patch.name=b.name.trim();if(typeof b.avatarUrl==='string')patch.avatarUrl=b.avatarUrl;await adminDb().doc(`users/${uid}`).set(patch,{merge:true});await audit(uid,profile,'Updated profile','');return Response.json({ok:true})}catch(e){return errorResponse(e)}}
