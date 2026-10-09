// Small helper text shown under every upload button. Derives the wording from the input's `accept` list.
const IMG = ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'];
export default function FormatHint({ accept, max = 15, className = '' }: { accept: string; max?: number | null; className?: string }) {
  const exts = accept.split(',').map(s => s.trim().replace('.', '').toLowerCase()).filter(Boolean);
  const names: string[] = [];
  for (const e of exts) {
    if (e === 'jpeg' && exts.includes('jpg')) continue;
    if (e === 'heif' && exts.includes('heic')) continue;
    names.push(e === 'jpg' && exts.includes('jpeg') ? 'JPG/JPEG' : e === 'heic' && exts.includes('heif') ? 'HEIC' : e.toUpperCase());
  }
  const imagesOnly = exts.every(e => IMG.includes(e));
  return <span className={'block text-[11px] leading-snug muted ' + className}>{imagesOnly ? 'Only images allowed: ' : 'Allowed: '}{names.join(', ')}{max ? ` · max ${max} MB` : ''}</span>;
}
