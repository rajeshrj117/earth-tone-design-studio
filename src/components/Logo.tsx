import Image from 'next/image';

// variant: 'full' = monogram + wordmark lockup, 'mark' = ETDS monogram only. tone: 'dark' (brown) for light bg, 'light' (ivory) for dark bg.
export default function Logo({ variant = 'full', tone = 'dark', width = 160, className = '' }: { variant?: 'full' | 'mark'; tone?: 'dark' | 'light'; width?: number; className?: string }) {
  const src = `/brand/logo-${variant === 'full' ? 'full' : 'monogram'}${tone === 'light' ? '-light' : ''}.png`;
  const ratio = variant === 'full' ? 1200 / 1164 : 595 / 600;
  return <Image src={src} alt="Earth Tone Design Studio" width={width} height={Math.round(width * ratio)} priority className={className} style={{ width, height: 'auto' }} />;
}
