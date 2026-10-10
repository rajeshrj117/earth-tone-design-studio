import './globals.css';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { AppProvider } from '@/lib/store';

// Brand fonts (self-hosted, CSP-safe): Montserrat = titles/nav, Lato = body, Mrs Saint Delafield = signature script
const montserrat = localFont({
  src: [
    { path: '../fonts/montserrat-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/montserrat-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/montserrat-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/montserrat-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-montserrat', display: 'swap',
});
const lato = localFont({
  src: [
    { path: '../fonts/lato-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/lato-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-lato', display: 'swap',
});
const script = localFont({
  src: [{ path: '../fonts/mrs-saint-delafield-latin-400-normal.woff2', weight: '400', style: 'normal' }],
  variable: '--font-script', display: 'swap',
});

export const metadata = { title: 'ETDS Project Portal', description: 'Earth Tone Design Studio — Spaces with soul. Designed to last.' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en" data-theme="earth" data-scroll-behavior="smooth" className={`${montserrat.variable} ${lato.variable} ${script.variable}`}><body><AppProvider>{children}</AppProvider></body></html>;
}
