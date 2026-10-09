import { Star } from 'lucide-react';
import { today, CARD_BASE } from './helpers';
import type { ModuleView } from './types';

export const feedback: ModuleView = {
  paginate:false,
  top:c=>{const{client,tp,pj,stars,setStars,add,say,myProjects,recsFor}=c;const canRate=client&&myProjects.some(p=>!recsFor('feedback',p.id).length);const ratingTarget=myProjects.find(p=>!recsFor('feedback',p.id).length)?.id??tp;const cats=['Overall satisfaction','Design quality','Communication','Workmanship'];return <>{canRate&&<div className="card p-6 mb-6 fade"><h3 className="serif text-2xl">How was your experience?</h3><p className="muted text-sm">Rate {pj(ratingTarget).name} — your feedback shapes our studio.</p><div className="grid sm:grid-cols-2 gap-4 mt-4">{cats.map(c=><div key={c} className="flex items-center justify-between"><span className="text-sm">{c}</span><div className="flex gap-1">{[1,2,3,4,5].map(i=><button key={i} onClick={()=>setStars(s=>({...s,[c]:i}))}><Star size={22} fill={i<=(stars[c]??0)?'var(--accent)':'none'} style={{color:'var(--accent)'}}/></button>)}</div></div>)}</div><button className="btn primary mt-5" onClick={async()=>{if(Object.keys(stars).length<4)return say('Please rate all four categories');try{for(const c of cats){const id=await add({p:ratingTarget,m:'feedback',t:c,s:'Rated',d:today(),pct:stars[c],rating:stars[c]},'Submitted feedback: '+c);if(!id)throw new Error('Feedback submission failed')}say('Thank you for your feedback!')}catch(e){say(e instanceof Error?e.message:'Feedback submission failed')}}}>Submit feedback</button></div>}</>},
  keepWhenEmpty:c=>c.client,
  card:(r,c)=>{return <div key={r.id} className={CARD_BASE}><div><b>{r.t}</b><p className="text-xs muted mt-1">{r.d}{r.comments?' · '+r.comments:''}</p></div><div className="flex gap-1">{[1,2,3,4,5].map(i=><Star key={i} size={18} fill={i<=(r.pct??r.rating??0)?'var(--accent)':'none'} style={{color:'var(--accent)'}}/>)}</div></div>},
};
