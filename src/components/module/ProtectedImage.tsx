'use client';
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

export function ProtectedImage({url,token,className,name}:{url:string;token:()=>Promise<string>;className?:string;name?:string}){
 const [src,setSrc]=useState('');
 const [isImage,setIsImage]=useState(true);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{let live=true,obj='';setSrc('');setFailed(false);(async()=>{try{const tk=await token();const res=await fetch(url,{headers:tk?{Authorization:'Bearer '+tk}:{}});if(!res.ok)throw new Error();const blob=await res.blob();const img=blob.type.startsWith('image/');obj=img?URL.createObjectURL(blob):'';if(live){setIsImage(img);setSrc(img?obj:'file')}}catch{if(live)setFailed(true)}})();return()=>{live=false;if(obj)URL.revokeObjectURL(obj)}},[url,token]);
 const fileName=name||decodeURIComponent((url.split('/').pop()||'').split('-').slice(1).join('-'))||'Attachment';
 const ext=(fileName.split('.').pop()||'file').toUpperCase().slice(0,5);
 const tile=(label:string)=><div className={(className||'')+' bg-[var(--soft)] flex flex-col items-center justify-center gap-2 px-4 text-center'}><FileText size={44} strokeWidth={1.4} className="text-[#9b3d2e]"/><span className="text-xs font-semibold tracking-wider">{label}</span><span className="text-xs muted max-w-full truncate">{fileName}</span></div>;
 if(failed)return tile('UNAVAILABLE');
 if(!src)return <div className={(className||'')+' bg-[var(--soft)] grid place-items-center'}><span className="text-sm muted">Loading attachment…</span></div>;
 return isImage?<img src={src} alt="Project attachment" className={className}/>:tile(ext);
}
