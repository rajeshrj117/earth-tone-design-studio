'use client';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useApp } from '@/lib/store';
import { GalleryImage, Project } from '@/lib/data';
import { ProtectedImage } from '@/components/module/ProtectedImage';
import { Empty } from '@/components/ui';
import FormatHint from '@/components/FormatHint';

const ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.heif';
async function authFetch(url: string, init: RequestInit = {}) { const t = await auth.currentUser?.getIdToken(); return fetch(url, { ...init, headers: { ...(init.headers || {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) } }); }
export async function saveGallery(id: string, gallery: GalleryImage[]) {
  const r = await authFetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id, project: { gallery } }) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not save gallery');
}

export default function ProjectGallery({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const { token, upload, say } = useApp();
  const images = project.gallery ?? [];
  const [busy, setBusy] = useState(false); const [view, setView] = useState<number | null>(null);
  const step = useCallback((d: number) => setView(v => (v === null ? v : (v + d + images.length) % images.length)), [images.length]);
  useEffect(() => {
    if (view === null) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setView(null); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [view, step]);

  const add = async (files: FileList | null) => {
    if (!files?.length) return; setBusy(true); const added: GalleryImage[] = [];
    try {
      for (const f of Array.from(files)) { const u = await upload(f, project.id, 'project-cover'); if (u) added.push({ url: u.url, name: u.name, path: u.path }); }
      if (added.length) { await saveGallery(project.id, [...images, ...added]); say(`${added.length} image${added.length > 1 ? 's' : ''} added`); }
    } catch (e) { for (const a of added) await authFetch('/api/files?path=' + encodeURIComponent(a.path), { method: 'DELETE' }).catch(() => {}); say(e instanceof Error ? e.message : 'Could not add images'); }
    setBusy(false);
  };
  const remove = async (img: GalleryImage) => {
    if (!window.confirm('Remove this image from the gallery?')) return;
    try { await saveGallery(project.id, images.filter(x => x.path !== img.path)); await authFetch('/api/files?path=' + encodeURIComponent(img.path), { method: 'DELETE' }).catch(() => {}); say('Image removed'); }
    catch (e) { say(e instanceof Error ? e.message : 'Could not remove image'); }
  };

  return (
    <div className="card p-6 fade">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div><h2 className="serif text-2xl">Image Gallery</h2><p className="muted text-sm mt-1">{images.length ? `${images.length} image${images.length > 1 ? 's' : ''} · click to enlarge` : 'Photos and renders of this project.'}</p></div>
        {canEdit && <div className="flex flex-col items-end gap-1"><label className={'btn primary cursor-pointer ' + (busy ? 'opacity-60 pointer-events-none' : '')}><ImagePlus size={14} />{busy ? 'Uploading…' : 'Add images'}<input type="file" multiple className="hidden" accept={ACCEPT} onChange={e => { add(e.target.files); e.target.value = ''; }} /></label><FormatHint accept={ACCEPT} /></div>}
      </div>
      {!images.length ? <Empty text={canEdit ? 'No images yet. Add some, or upload them when creating the project.' : 'No images have been added to this project yet.'} /> : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div key={img.path} className="relative group rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
              <button className="block w-full" onClick={() => setView(i)} aria-label={`Open ${img.name}`}><ProtectedImage url={img.url} token={token} className="w-full h-44 object-cover transition-transform group-hover:scale-[1.03]" /></button>
              {canEdit && <button className="btn sm absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => remove(img)} title="Remove image"><Trash2 size={13} /></button>}
            </div>
          ))}
        </div>
      )}
      {view !== null && images[view] && (
        <div className="fixed inset-0 z-[70] bg-black/85 grid place-items-center p-4" onClick={() => setView(null)}>
          <button className="btn absolute top-4 right-4" onClick={() => setView(null)} aria-label="Close"><X size={16} /></button>
          {images.length > 1 && <button className="btn absolute left-4 top-1/2 -translate-y-1/2" onClick={e => { e.stopPropagation(); step(-1); }} aria-label="Previous"><ChevronLeft size={18} /></button>}
          <div onClick={e => e.stopPropagation()} className="max-w-5xl w-full"><ProtectedImage key={images[view].path} url={images[view].url} token={token} className="w-full max-h-[85vh] object-contain rounded-xl" /><p className="text-center text-white/70 text-xs mt-2">{view + 1} / {images.length}</p></div>
          {images.length > 1 && <button className="btn absolute right-4 top-1/2 -translate-y-1/2" onClick={e => { e.stopPropagation(); step(1); }} aria-label="Next"><ChevronRight size={18} /></button>}
        </div>
      )}
    </div>
  );
}
