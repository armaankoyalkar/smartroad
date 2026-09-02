import { useMeta } from "@/meta/useMeta";

/** Straight road segments between junctions (viewBox 640 x 440). */
const ROADS: readonly [number, number, number, number][] = [
  [40, 330, 220, 250],
  [220, 250, 330, 290],
  [330, 290, 520, 200],
  [520, 200, 610, 240],
  [120, 90, 220, 250],
  [220, 250, 300, 120],
  [300, 120, 470, 60],
  [470, 60, 520, 200],
  [300, 120, 330, 290],
  [330, 290, 360, 400],
  [40, 330, 130, 410],
  [130, 410, 360, 400],
  [520, 200, 600, 80],
  [470, 60, 600, 80],
];

/** Junctions that light up. */
const NODES: readonly [number, number][] = [
  [220, 250],
  [330, 290],
  [520, 200],
  [300, 120],
  [470, 60],
  [130, 410],
];

/** The main route the animated "traffic" dash travels along. */
const MAIN_ROUTE = "M40 330 L220 250 L330 290 L520 200 L610 240";

/**
 * Animated road-network illustration for the hero: lines and nodes only, no imagery.
 * Category-coloured dots use the colours served by the API. Motion is disabled for users
 * who prefer reduced motion.
 */
export function RoadNetworkIllustration({ className }: { className?: string }) {
  const { categories } = useMeta();
  const accents = [categories[0], categories[2], categories[8], categories[4]].filter(Boolean);
  const dots: readonly [number, number][] = [
    [250, 200],
    [400, 250],
    [560, 130],
    [180, 340],
  ];

  return (
    <svg
      viewBox="0 0 640 440"
      role="img"
      aria-labelledby="road-illustration-title"
      className={className}
      focusable="false"
    >
      <title id="road-illustration-title">
        Illustration of a road network with lit junctions and colour-coded incident markers
      </title>
      <style>{`
        .sr-road-pulse { animation: sr-road-pulse 2.8s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        .sr-road-dash { stroke-dasharray: 18 260; animation: sr-road-dash 6s linear infinite; }
        .sr-road-dot { animation: sr-road-pulse 3.6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes sr-road-pulse { 0%, 100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.35); } }
        @keyframes sr-road-dash { from { stroke-dashoffset: 278; } to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .sr-road-pulse, .sr-road-dash, .sr-road-dot { animation: none; } }
      `}</style>
      <defs>
        <radialGradient id="sr-road-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sr-road-main" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>

      <rect width="640" height="440" rx="24" fill="#0B1220" />
      <g stroke="#182540" strokeWidth="1">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={`v${i}`} x1={i * 56 + 8} y1="0" x2={i * 56 + 8} y2="440" />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 56 + 20} x2="640" y2={i * 56 + 20} />
        ))}
      </g>
      <circle cx="330" cy="240" r="220" fill="url(#sr-road-glow)" />

      <g stroke="#34466B" strokeWidth="10" strokeLinecap="round">
        {ROADS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <g stroke="#0B1220" strokeWidth="2" strokeDasharray="8 10" strokeLinecap="round" opacity="0.9">
        {ROADS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>

      <path
        d={MAIN_ROUTE}
        fill="none"
        stroke="url(#sr-road-main)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d={MAIN_ROUTE}
        fill="none"
        stroke="#E6EDF7"
        strokeWidth="4"
        strokeLinecap="round"
        className="sr-road-dash"
      />

      {NODES.map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r="14"
            fill="#22D3EE"
            opacity="0.18"
            className="sr-road-pulse"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
          <circle cx={x} cy={y} r="6" fill="#0B1220" stroke="#22D3EE" strokeWidth="3" />
        </g>
      ))}

      {dots.map(([x, y], i) => {
        const color = accents[i % accents.length]?.color ?? "#94A3B8";
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="11"
              fill={color}
              opacity="0.25"
              className="sr-road-dot"
              style={{ animationDelay: `${i * 0.7}s` }}
            />
            <circle cx={x} cy={y} r="5" fill={color} stroke="#0B1220" strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
}
