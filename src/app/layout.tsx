import './globals.css';
import type { ReactNode } from 'react';
import { AppProvider } from '@/lib/store';
export const metadata = { title: 'ETDS Project Portal', description: 'Earth Tone Design Studio — client & project portal' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en" data-theme="earth" data-scroll-behavior="smooth"><body><AppProvider>{children}</AppProvider></body></html>;
}
