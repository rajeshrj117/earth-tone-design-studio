const PAL: Record<string, string[]> = {
  living: ['#efe0cc', '#e3c9a8', '#b8704f', '#6f8a62', '#4a3a30'],
  kitchen: ['#e8e4d8', '#d6cdb8', '#7d8f6d', '#c9894f', '#3f4a3c'],
  bedroom: ['#eadfd6', '#d9c3b3', '#a86b5c', '#8d9a7c', '#4b3b36'],
  cafe: ['#e9d9bf', '#cfae84', '#2f5d62', '#d98c4a', '#2b3a3a'],
  clinic: ['#e7ede6', '#cfdccd', '#6b8f7b', '#d5a15c', '#35483f'],
  farm: ['#f2e1c5', '#e6c391', '#a0573a', '#6c8a4f', '#3f3a2a'],
  doc: ['#f1ece4', '#ded4c4', '#8a7a68', '#b5654a', '#4a3f35'],
};
export default function Art({ v = 'living', className = '' }: { v?: string; className?: string }) {
  const [wall, floor, a, b, ink] = PAL[v] ?? PAL.living;
  const g = `g-${v}`;
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={v + ' interior illustration'}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={wall} /><stop offset="1" stopColor={floor} /></linearGradient>
        <radialGradient id={g + 's'} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      {v === 'doc' ? (<>
        <rect width="400" height="260" fill={`url(#${g})`} />
        <rect x="120" y="28" width="160" height="206" rx="8" fill="#fffdf9" stroke={floor} />
        {[60, 80, 96, 112, 128, 144, 160].map((y, i) => <rect key={y} x="140" y={y} width={i === 0 ? 70 : 120 - (i % 3) * 18} height="6" rx="3" fill={i === 0 ? a : floor} />)}
        <rect x="140" y="188" width="52" height="24" rx="4" fill="none" stroke={a} strokeWidth="2" /><path d="M200 206c12-18 22 10 40-8" stroke={ink} strokeWidth="2" fill="none" />
      </>) : v === 'farm' ? (<>
        <rect width="400" height="260" fill="#f6dcb4" /><circle cx="318" cy="64" r="34" fill="#fff3d6" opacity=".9" />
        <path d="M0 170 Q100 120 200 160 T400 150 V260 H0Z" fill={b} opacity=".55" /><rect y="190" width="400" height="70" fill={b} opacity=".8" />
        <rect x="110" y="110" width="170" height="88" fill={wall} /><path d="M96 112 L195 52 L294 112Z" fill={a} />
        <rect x="178" y="146" width="34" height="52" rx="17" fill={ink} /><rect x="130" y="130" width="30" height="30" rx="4" fill="#fff6e0" /><rect x="232" y="130" width="30" height="30" rx="4" fill="#fff6e0" />
        <rect x="46" y="130" width="8" height="70" fill={ink} /><circle cx="50" cy="118" r="30" fill={b} /><circle cx="70" cy="138" r="20" fill="#7d9b5c" />
      </>) : (<>
        <rect width="400" height="260" fill={`url(#${g})`} />
        <rect y="182" width="400" height="78" fill={floor} /><rect y="182" width="400" height="5" fill={ink} opacity=".12" />
        <ellipse cx="200" cy="228" rx="150" ry="14" fill={ink} opacity=".08" />
        {v === 'living' && (<>
          <path d="M280 182V96a48 48 0 0 1 96 0v86Z" fill="#fff4dc" /><circle cx="328" cy="110" r="52" fill={`url(#${g}s)`} />
          <rect x="60" y="132" width="170" height="52" rx="16" fill={a} /><rect x="48" y="124" width="34" height="62" rx="14" fill={a} /><rect x="210" y="124" width="34" height="62" rx="14" fill={a} /><rect x="86" y="118" width="52" height="30" rx="10" fill="#f6e8d4" /><rect x="150" y="118" width="52" height="30" rx="10" fill={b} />
          <rect x="258" y="156" width="10" height="28" fill={ink} /><path d="M246 112h34l-8 34h-18Z" fill="#f4d9a0" /><rect x="86" y="38" width="62" height="46" rx="4" fill="#fff8ea" stroke={ink} strokeOpacity=".25" /><circle cx="108" cy="62" r="12" fill={a} opacity=".7" /><rect x="118" y="52" width="22" height="22" rx="11" fill={b} opacity=".7" />
          <ellipse cx="30" cy="160" rx="16" ry="30" fill={b} /><rect x="26" y="170" width="8" height="16" fill={ink} />
        </>)}
        {v === 'kitchen' && (<>
          <rect x="24" y="30" width="352" height="48" rx="6" fill={b} /><path d="M104 30v48M184 30v48M264 30v48M330 30v48" stroke="#fff" strokeOpacity=".4" />
          <rect x="24" y="92" width="352" height="46" fill={wall} stroke={floor} /><rect x="24" y="138" width="352" height="46" rx="4" fill={ink} opacity=".9" /><rect x="24" y="132" width="352" height="10" fill="#fff" />
          <rect x="120" y="160" width="160" height="26" rx="4" fill={a} /><rect x="110" y="152" width="180" height="12" rx="3" fill="#fff" />
          {[120, 200, 280].map(x => <g key={x}><rect x={x - 1} y="0" width="2" height="34" fill={ink} /><path d={`M${x - 16} 52q16-26 32 0Z`} fill={a} /></g>)}
        </>)}
        {v === 'bedroom' && (<>
          <rect x="90" y="40" width="220" height="100" rx="14" fill={a} /><rect x="70" y="124" width="260" height="56" rx="14" fill="#f6ede2" /><rect x="70" y="146" width="260" height="38" rx="12" fill={b} /><rect x="104" y="106" width="76" height="30" rx="12" fill="#fff" /><rect x="220" y="106" width="76" height="30" rx="12" fill="#fff" />
          <rect x="30" y="140" width="30" height="44" rx="4" fill={ink} /><path d="M26 100h38l-8 34H34Z" fill="#f4d9a0" /><rect x="340" y="140" width="30" height="44" rx="4" fill={ink} /><path d="M336 100h38l-8 34h-22Z" fill="#f4d9a0" />
          <path d="M0 0h42v176q-20 16-42 0Z" fill={b} opacity=".55" /><path d="M358 0h42v176q-22 16-42 0Z" fill={b} opacity=".55" />
        </>)}
        {v === 'cafe' && (<>
          <rect x="0" y="0" width="400" height="30" fill={a} opacity=".95" /><circle cx="330" cy="86" r="34" fill="none" stroke={b} strokeWidth="5" /><text x="330" y="92" textAnchor="middle" fontSize="16" fontFamily="Georgia,serif" fill={b}>open</text>
          {[70, 140, 210].map(x => <g key={x}><rect x={x} y="30" width="2" height="38" fill={ink} /><ellipse cx={x + 1} cy="76" rx="20" ry="14" fill="#e6b980" /><circle cx={x + 1} cy="82" r="24" fill={`url(#${g}s)`} /></g>)}
          <rect x="30" y="130" width="250" height="54" rx="6" fill={a} /><rect x="22" y="120" width="266" height="12" rx="5" fill="#f7efe2" /><path d="M30 150h250" stroke="#fff" strokeOpacity=".3" strokeDasharray="3 6" />
          {[60, 120, 180, 240].map(x => <g key={x}><rect x={x} y="168" width="6" height="52" fill={ink} /><ellipse cx={x + 3} cy="164" rx="16" ry="6" fill={b} /></g>)}
          <rect x="300" y="132" width="76" height="58" rx="10" fill="#7fae6f" opacity=".85" /><circle cx="324" cy="150" r="14" fill="#5e9558" /><circle cx="352" cy="164" r="16" fill="#6aa361" />
        </>)}
        {v === 'clinic' && (<>
          <rect x="24" y="24" width="352" height="10" rx="5" fill="#fff" opacity=".9" /><rect x="0" y="60" width="400" height="122" fill={b} opacity=".28" />{[40, 80, 120, 160, 200, 240, 280, 320, 360].map(x => <rect key={x} x={x} y="60" width="3" height="122" fill="#fff" opacity=".35" />)}
          <rect x="40" y="136" width="150" height="48" rx="8" fill="#fbf8f2" /><rect x="40" y="130" width="150" height="10" rx="4" fill={a} />
          <rect x="250" y="146" width="90" height="36" rx="16" fill={b} /><rect x="268" y="96" width="30" height="58" rx="12" fill={ink} opacity=".85" /><path d="M300 100q40-20 54 14" stroke={ink} strokeWidth="6" fill="none" strokeLinecap="round" /><circle cx="356" cy="118" r="10" fill={a} />
          <path d="M60 76h56M60 90h36" stroke={ink} strokeOpacity=".35" strokeWidth="5" strokeLinecap="round" /><circle cx="170" cy="86" r="22" fill="#fff" /><path d="M170 74v24M158 86h24" stroke={b} strokeWidth="5" strokeLinecap="round" />
        </>)}
      </>)}
    </svg>
  );
}
