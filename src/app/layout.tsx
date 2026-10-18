import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
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

const SITE_URL = 'https://earth-tone-design-studio.vercel.app';
const TITLE = 'Earth Tone Design Studio — Client Project Portal';
const DESCRIPTION = 'Approve designs, track site progress and settle stages in one place. Architecture & interior design — spaces with soul, designed to last.';
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website', url: SITE_URL, siteName: 'Earth Tone Design Studio', title: TITLE, description: DESCRIPTION,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Earth Tone Design Studio — Architecture | Interior' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og-image.jpg'] },
};
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en" data-theme="earth" data-scroll-behavior="smooth" className={`${montserrat.variable} ${lato.variable} ${script.variable}`}><body><AppProvider>{children}</AppProvider></body></html>;
}
