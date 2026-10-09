'use client';
import { useEffect, useState } from 'react';

export function ProtectedImage({url,token,className}:{url:string;token:()=>Promise<string>;className?:string}){
 const [src,setSrc]=useState('');
 useEffect(()=>{let live=true,obj='';(async()=>{try{const tk=await token();const res=await fetch(url,{headers:tk?{Authorization:'Bearer '+tk}:{}});if(!res.ok)throw new Error();obj=URL.createObjectURL(await res.blob());if(live)setSrc(obj)}catch{}})();return()=>{live=false;if(obj)URL.revokeObjectURL(obj)}},[url,token]);
 return src?<img src={src} alt="Project attachment" className={className}/>:<div className={(className||'')+' bg-[var(--soft)] grid place-items-center'}><span className="text-sm muted">Loading attachment…</span></div>;
}
