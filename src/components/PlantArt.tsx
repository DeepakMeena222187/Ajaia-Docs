/* eslint-disable @next/next/no-img-element -- plain <img> keeps the image optimizer (an SSRF surface) disabled */

type Props = { art: string; hue: number; imageUrl?: string | null; name: string; className?: string };

/**
 * Plant picture. Uses the admin-provided photo when set, otherwise a built-in
 * illustration so every product has artwork even before photos are added.
 */
export function PlantArt({ art, hue, imageUrl, name, className = "" }: Props) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  const h = ((hue % 360) + 360) % 360;
  const leaf = `hsl(${h} 42% 38%)`;
  const leafLight = `hsl(${h} 45% 52%)`;
  const bg = `hsl(${h} 35% 90%)`;
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={name} className={`h-full w-full ${className}`}>
      <rect width="200" height="200" fill={bg} />
      <circle cx="160" cy="40" r="60" fill={`hsl(${h} 40% 85%)`} />
      <g>{renderArt(art, leaf, leafLight, h)}</g>
      {/* terracotta pot */}
      <path d="M62 150 L138 150 L130 192 L70 192 Z" fill="#c2643d" />
      <rect x="56" y="142" width="88" height="14" rx="4" fill="#b0552f" />
      <path d="M70 160 L130 160" stroke="#d98a63" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function renderArt(art: string, leaf: string, light: string, h: number) {
  switch (art) {
    case "monstera":
      return (
        <>
          <path d="M100 145 C 98 120, 96 100, 92 80" stroke={leaf} strokeWidth="4" fill="none" />
          <path d="M100 145 C 110 120, 125 100, 140 92" stroke={leaf} strokeWidth="4" fill="none" />
          <path d="M100 145 C 88 125, 70 112, 56 108" stroke={leaf} strokeWidth="4" fill="none" />
          {[
            [92, 62, -10, 34],
            [142, 80, 30, 28],
            [54, 96, -40, 28],
          ].map(([x, y, r, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s / 30})`}>
              <path d="M0 -30 C 28 -28, 32 10, 0 30 C -32 10, -28 -28, 0 -30 Z" fill={i === 0 ? light : leaf} />
              <path d="M0 -26 L0 28" stroke={`hsl(${h} 40% 25%)`} strokeWidth="1.5" />
              <path d="M4 -12 L24 -14 M5 0 L27 2 M4 12 L20 18" stroke={`hsl(${h} 35% 90%)`} strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="-12" cy="-6" rx="3" ry="5" fill={`hsl(${h} 35% 90%)`} />
              <ellipse cx="-12" cy="10" rx="3" ry="4" fill={`hsl(${h} 35% 90%)`} />
            </g>
          ))}
        </>
      );
    case "snake":
      return (
        <>
          {[
            [100, 40, 0],
            [80, 60, -10],
            [120, 58, 10],
            [64, 84, -20],
            [136, 82, 18],
          ].map(([x, top, rot], i) => (
            <path
              key={i}
              transform={`rotate(${rot} ${x} 148)`}
              d={`M${x - 9} 148 C ${x - 12} 110, ${x - 6} ${top + 20}, ${x} ${top} C ${x + 6} ${top + 20}, ${x + 12} 110, ${x + 9} 148 Z`}
              fill={i % 2 ? leaf : light}
              stroke={`hsl(${h + 20} 60% 60%)`}
              strokeWidth="2"
            />
          ))}
        </>
      );
    case "trailing":
      return (
        <>
          {[-1, 1].map((dir) => (
            <path
              key={dir}
              d={`M100 146 C ${100 + dir * 40} 140, ${100 + dir * 60} 160, ${100 + dir * 70} 190`}
              stroke={leaf}
              strokeWidth="2.5"
              fill="none"
            />
          ))}
          {Array.from({ length: 14 }).map((_, i) => {
            const dir = i % 2 ? 1 : -1;
            const t = Math.floor(i / 2) / 7;
            const x = 100 + dir * (20 + t * 55);
            const y = 138 - (1 - t) * 40 + t * 50;
            return <ellipse key={i} cx={x} cy={y} rx="11" ry="8" transform={`rotate(${dir * 30} ${x} ${y})`} fill={i % 3 ? leaf : light} />;
          })}
        </>
      );
    case "flower":
      return (
        <>
          {[-30, 0, 30].map((r) => (
            <path key={r} transform={`rotate(${r} 100 148)`} d="M100 148 C 92 120, 92 100, 100 80 C 108 100, 108 120, 100 148 Z" fill={leaf} />
          ))}
          <path d="M100 148 L100 70" stroke={leaf} strokeWidth="3" />
          {[
            [100, 62],
            [70, 84],
            [132, 80],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {Array.from({ length: 6 }).map((_, k) => (
                <ellipse key={k} cx="0" cy="-10" rx="7" ry="11" transform={`rotate(${k * 60})`} fill={`hsl(${h} 70% ${i ? 62 : 70}%)`} />
              ))}
              <circle r="5" fill="#f2c14e" />
            </g>
          ))}
        </>
      );
    case "palm":
      return (
        <>
          {[-60, -35, -12, 12, 35, 60].map((r, i) => (
            <g key={r} transform={`rotate(${r} 100 148)`}>
              <path d="M100 148 C 98 110, 100 80, 100 50" stroke={leaf} strokeWidth="2.5" fill="none" />
              {Array.from({ length: 8 }).map((_, k) => (
                <path key={k} d={`M100 ${60 + k * 10} l ${k % 2 ? 14 : -14} -8`} stroke={i % 2 ? light : leaf} strokeWidth="5" strokeLinecap="round" />
              ))}
            </g>
          ))}
        </>
      );
    case "fern":
      return (
        <>
          {[-55, -28, 0, 28, 55].map((r, i) => (
            <g key={r} transform={`rotate(${r} 100 148)`}>
              <path d="M100 148 Q 104 100 100 56" stroke={leaf} strokeWidth="2" fill="none" />
              {Array.from({ length: 11 }).map((_, k) => (
                <g key={k}>
                  <ellipse cx={93} cy={64 + k * 7.5} rx="7" ry="3" fill={i % 2 ? light : leaf} />
                  <ellipse cx={107} cy={64 + k * 7.5} rx="7" ry="3" fill={i % 2 ? leaf : light} />
                </g>
              ))}
            </g>
          ))}
        </>
      );
    case "succulent":
      return (
        <>
          {Array.from({ length: 3 }).map((_, ring) =>
            Array.from({ length: 7 }).map((_, k) => (
              <ellipse
                key={`${ring}-${k}`}
                cx="100"
                cy={128 - (28 - ring * 8)}
                rx={11 - ring * 2}
                ry={28 - ring * 8}
                transform={`rotate(${k * (360 / 7) + ring * 20} 100 128)`}
                fill={`hsl(${h} ${38 + ring * 6}% ${46 + ring * 9}%)`}
              />
            )),
          )}
          <circle cx="100" cy="128" r="6" fill={`hsl(${h} 45% 70%)`} />
        </>
      );
    case "cactus":
      return (
        <>
          <ellipse cx="100" cy="110" rx="36" ry="40" fill={leaf} />
          {[-24, -12, 0, 12, 24].map((x) => (
            <path key={x} d={`M${100 + x} 74 Q ${100 + x * 1.4} 110 ${100 + x} 148`} stroke={light} strokeWidth="3" fill="none" />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <circle key={i} cx={74 + (i % 4) * 17} cy={86 + Math.floor(i / 4) * 16} r="1.8" fill="#f6e3a1" />
          ))}
          <circle cx="100" cy="72" r="7" fill="#f2c14e" />
        </>
      );
    case "herb":
      return (
        <>
          {[-40, -20, 0, 20, 40].map((r) => (
            <path key={r} transform={`rotate(${r} 100 148)`} d="M100 148 L100 72" stroke={leaf} strokeWidth="2.5" />
          ))}
          {Array.from({ length: 22 }).map((_, i) => {
            const a = ((i * 137.5) % 180) - 90;
            const d = 20 + (i % 6) * 12;
            const x = 100 + Math.sin((a * Math.PI) / 180) * d;
            const y = 140 - Math.cos((a * Math.PI) / 180) * d * 1.1;
            return <ellipse key={i} cx={x} cy={y} rx="8" ry="5.5" transform={`rotate(${a} ${x} ${y})`} fill={i % 3 ? leaf : light} />;
          })}
        </>
      );
    case "tree":
      return (
        <>
          <path d="M100 148 L100 92" stroke="#7a5537" strokeWidth="7" strokeLinecap="round" />
          <path d="M100 112 L84 98 M100 104 L118 92" stroke="#7a5537" strokeWidth="4" strokeLinecap="round" />
          {[
            [100, 60, 30],
            [70, 80, 24],
            [130, 78, 26],
            [88, 52, 20],
            [116, 48, 20],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? light : leaf} />
          ))}
        </>
      );
    default:
      return (
        <>
          {[-50, -25, 0, 25, 50].map((r, i) => (
            <g key={r} transform={`rotate(${r} 100 148)`}>
              <path d="M100 148 L100 74" stroke={leaf} strokeWidth="3" />
              {[0, 1, 2, 3].map((k) => (
                <ellipse key={k} cx={k % 2 ? 108 : 92} cy={80 + k * 15} rx="9" ry="13" fill={i % 2 ? light : leaf} transform={`rotate(${k % 2 ? 35 : -35} ${k % 2 ? 108 : 92} ${80 + k * 15})`} />
              ))}
            </g>
          ))}
        </>
      );
  }
}
