'use client';
import FormatHint from './FormatHint';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';

// Real 360° viewer: maps an equirectangular panorama photo onto the inside of a sphere (three.js).
// Drag to look around, wheel/pinch buttons to zoom. Image stays in the browser (not uploaded).
export default function Pano360() {
  const host = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  useEffect(() => {
    if (!src || !host.current) return;
    let stop = false, raf = 0, cleanup = () => {};
    (async () => {
      const THREE = await import('three');
      if (stop || !host.current) return;
      const el = host.current;
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(el.clientWidth, el.clientHeight);
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 0.1, 1100);
      const geo = new THREE.SphereGeometry(500, 64, 40); geo.scale(-1, 1, 1);
      const tex = await new THREE.TextureLoader().loadAsync(src).catch(() => null);
      if (!tex || stop) { if (!stop) setErr('Could not load that image. Use a JPG/PNG panorama (2:1 ratio).'); renderer.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
      scene.add(mesh);
      let lon = 0, lat = 0, fov = 75, down: { x: number; y: number; lon: number; lat: number } | null = null;
      const cv = renderer.domElement; cv.style.touchAction = 'none'; cv.style.cursor = 'grab'; cv.style.display = 'block'; cv.style.width = '100%'; cv.style.height = '100%';
      const pd = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, lon, lat }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; };
      const pm = (e: PointerEvent) => { if (!down) return; lon = down.lon - (e.clientX - down.x) * 0.15; lat = Math.max(-85, Math.min(85, down.lat + (e.clientY - down.y) * 0.15)); };
      const pu = () => { down = null; cv.style.cursor = 'grab'; };
      const wh = (e: WheelEvent) => { e.preventDefault(); fov = Math.max(30, Math.min(100, fov + e.deltaY * 0.05)); cam.fov = fov; cam.updateProjectionMatrix(); };
      cv.addEventListener('pointerdown', pd); cv.addEventListener('pointermove', pm); cv.addEventListener('pointerup', pu); cv.addEventListener('pointercancel', pu); cv.addEventListener('wheel', wh, { passive: false });
      const ro = new ResizeObserver(() => { renderer.setSize(el.clientWidth, el.clientHeight); cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); }); ro.observe(el);
      const loop = () => {
        if (!down) lon += 0.03; // gentle auto-rotate until the user grabs it
        const phi = THREE.MathUtils.degToRad(90 - lat), th = THREE.MathUtils.degToRad(lon);
        cam.lookAt(500 * Math.sin(phi) * Math.cos(th), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(th));
        renderer.render(scene, cam); raf = requestAnimationFrame(loop);
      };
      loop();
      cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener('pointerdown', pd); cv.removeEventListener('pointermove', pm); cv.removeEventListener('pointerup', pu); cv.removeEventListener('pointercancel', pu); cv.removeEventListener('wheel', wh); geo.dispose(); tex.dispose(); renderer.dispose(); cv.remove(); };
    })();
    return () => { stop = true; cleanup(); };
  }, [src]);

  return (
    <div className="relative" style={{ height: 440 }}>
      <div ref={host} className="absolute inset-0 bg-black/80" />
      {!src && (
        <div className="absolute inset-0 grid place-items-center text-center p-6">
          <div>
            <p className="font-semibold">360° panorama viewer</p>
            <p className="text-sm muted mt-1 mb-4">Pick an equirectangular (2:1) panorama photo from your 360 camera or phone panorama mode.</p>
            <div className="flex flex-col gap-1 items-start"><label className="btn primary cursor-pointer"><ImagePlus size={14} />Choose 360° photo
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setErr(''); setSrc(URL.createObjectURL(f)); } e.target.value = ''; }} />
            </label><FormatHint accept=".jpg,.jpeg,.png,.webp" max={null}/></div>
            {err && <p className="text-sm mt-3" style={{ color: 'var(--bad, #c0392b)' }}>{err}</p>}
          </div>
        </div>
      )}
      {src && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center pointer-events-none">
          <span className="rounded-full px-3 py-1 text-xs font-semibold glass">Drag to look around · scroll to zoom</span>
          <div className="flex flex-col gap-1 items-start pointer-events-auto"><label className="btn sm cursor-pointer pointer-events-auto"><ImagePlus size={13} />Change photo
            <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setErr(''); setSrc(URL.createObjectURL(f)); } e.target.value = ''; }} />
          </label><FormatHint accept=".jpg,.jpeg,.png,.webp" max={null} className="rounded-full px-2 py-0.5 glass"/></div>
        </div>
      )}
    </div>
  );
}
