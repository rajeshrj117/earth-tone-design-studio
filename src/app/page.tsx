'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import Art from '@/components/Art';
import Logo from '@/components/Logo';
import { useApp } from '@/lib/store';

export default function Login() {
  const { ready, user, login } = useApp(); const r = useRouter();
  // Demo mode: login form is pre-filled. Change or clear these two values to turn it off.
  const [email, setEmail] = useState('admin@etds.in'); const [pw, setPw] = useState('ETDSDemo@2026'); const [err, setErr] = useState('');
  useEffect(() => { if (ready && user) r.replace('/dashboard'); }, [ready, user, r]);
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(''); const res = await login(email, pw); setBusy(false); if (res.ok) r.push('/dashboard'); else setErr(res.msg || 'Invalid email or password.'); };
  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:block relative overflow-hidden side">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0 opacity-90">
          {['living', 'kitchen', 'bedroom', 'cafe'].map(v => <Art key={v} v={v} className="w-full h-full" />)}
        </div>
        <div className="absolute inset-0 hero-grad" />
        <div className="relative h-full p-14 flex flex-col justify-between text-white">
          <Logo tone="light" width={190} />
          <div className="max-w-xl"><span className="glass inline-flex mt-4 items-center gap-2 rounded-full px-3 py-1 text-xs mb-5" style={{ color: '#fff' }}><Sparkles size={13} />Client project portal</span>
            <h1 className="serif text-5xl leading-[1.08]">Every decision, payment and milestone — beautifully transparent.</h1>
            <p className="mt-5 opacity-80 text-lg">Approve designs, track site progress and settle stages in one calm, elegant place.</p></div>
          <small className="opacity-60">Spaces with soul. Designed to last.</small>
        </div>
      </section>
      <section className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={go} className="w-full max-w-md space-y-5 fade">
          <div><div className="lg:hidden mb-4"><Logo width={150} /></div><h2 className="script text-7xl" style={{ color: 'var(--brand)' }}>Welcome back</h2><p className="muted mt-1">Sign in to your ETDS project portal</p></div>
          <div><label className="text-xs font-semibold muted uppercase tracking-wider">Email</label><input className="input mt-1" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label className="text-xs font-semibold muted uppercase tracking-wider">Password</label><input className="input mt-1" type="password" value={pw} onChange={e => setPw(e.target.value)} /></div>
          {err && <p className="text-sm" style={{ color: 'var(--bad)' }}>{err}</p>}
          <button disabled={busy} className="btn primary w-full justify-center py-3 text-sm">{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></button>
        </form>
      </section>
    </main>
  );
}
