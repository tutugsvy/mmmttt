export default function HeroVisual() {
  // Two directional fields of thin lines converging toward one precise point.
  const lines = [];
  const N = 9;
  for (let i = 0; i < N; i++) {
    const y = 60 + i * 60;
    const bend = 300 + i * 14;
    lines.push(
      <path
        key={`l${i}`}
        className={`hv-path${i % 2 ? ' hv-path--b' : ''}`}
        d={`M-40 ${y} C ${bend} ${y}, 500 360, 760 360`}
      />,
      <path
        key={`r${i}`}
        className={`hv-path${i % 2 ? '' : ' hv-path--b'}`}
        d={`M1560 ${720 - y} C ${1560 - bend} ${720 - y}, 1020 360, 760 360`}
      />
    );
  }

  return (
    <svg viewBox="0 0 1520 720" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="irid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe29a" />
          <stop offset="55%" stopColor="#ff8b7a" />
          <stop offset="100%" stopColor="#7ec8ff" />
        </linearGradient>
      </defs>

      {lines}

      {[26, 58, 96, 140].map((r) => (
        <circle key={r} className="hv-ring" cx="760" cy="360" r={r} />
      ))}

      <circle className="hv-core" cx="760" cy="360" r="7" />
    </svg>
  );
}
