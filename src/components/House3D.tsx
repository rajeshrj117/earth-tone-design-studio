'use client';
import { useRef, useState } from 'react';
import type React from 'react';
import { Box, Rotate3D, ZoomIn, ZoomOut } from 'lucide-react';
import Pano360 from './Pano360';

export default function House3D({ title = '3D Building View' }: { title?: string }) {
  const [rot, setRot] = useState(32);
  const [zoom, setZoom] = useState(1);
  const [floor, setFloor] = useState('All floors');
  const [view, setView] = useState<'3d'|'360'>('3d');
  const drag = useRef<{x:number;rot:number}|null>(null);
  const floors = ['All floors', 'Ground floor', 'First floor', 'Second floor'];
  const dim = (n: string) => ({ opacity: floor === 'All floors' || floor === n ? 1 : 0.12, transition: 'opacity .3s', outline: floor === n ? '2px solid var(--accent, #c9a063)' : undefined } as React.CSSProperties);
  return <div className="card overflow-hidden fade">
    <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b" style={{borderColor:'var(--line)'}}>
      <div><div className="flex items-center gap-2"><Box size={18}/><h2 className="serif text-2xl">{title}</h2></div><p className="text-sm muted mt-1">Interactive 3D house preview (drag to rotate, pick a floor to isolate it) and a real 360° panorama viewer.</p></div>
      <div className="flex gap-2 flex-wrap"><button className={'btn sm ' + (view==='3d' ? 'primary' : '')} onClick={()=>setView('3d')}>3D</button><button className={'btn sm ' + (view==='360' ? 'primary' : '')} onClick={()=>setView('360')}>360°</button>{view==='3d'&&<select className="input !w-auto" value={floor} onChange={e=>setFloor(e.target.value)}>{floors.map(x=><option key={x}>{x}</option>)}</select>}{view==='3d'&&<><button className="btn sm" onClick={()=>setRot(v=>v-20)}><Rotate3D size={14}/>Rotate</button><button className="btn sm" onClick={()=>setZoom(v=>Math.max(.75,v-.1))}><ZoomOut size={14}/></button><button className="btn sm" onClick={()=>setZoom(v=>Math.min(1.35,v+.1))}><ZoomIn size={14}/></button></>}</div>
    </div>
    {view==='360' ? <Pano360 /> : <>
    <div className="house-stage select-none" onPointerDown={e=>{drag.current={x:e.clientX,rot};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drag.current)setRot(drag.current.rot+(e.clientX-drag.current.x)*0.7)}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
      <div className="house-grid" />
      <div className="house-scene" style={{transform:`scale(${zoom}) rotateY(${rot}deg) rotateX(4deg)`}}>
        <div className="house-ground" />
        <div className="house-floor house-ground-floor" style={dim('Ground floor')}><span>GROUND</span><i className="house-window w1"/><i className="house-window w2"/><i className="house-door"/></div>
        <div className="house-floor house-first-floor" style={dim('First floor')}><span>FIRST</span><i className="house-window w1"/><i className="house-window w2"/></div>
        <div className="house-floor house-second-floor" style={dim('Second floor')}><span>SECOND</span><i className="house-window w1"/><i className="house-window w2"/></div>
        <div className="house-roof" />
        <div className="house-balcony" />
      </div>
      <div className="house-label">{floor} · 3D mode · drag left/right to rotate</div>
    </div></>}
  </div>;
}
