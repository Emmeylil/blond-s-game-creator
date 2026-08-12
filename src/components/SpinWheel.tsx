import { useRef, useState } from "react";

type Segment = { label: string; color: string; win: boolean };

const SEGMENTS: Segment[] = [
  { label: "Try Again", color: "var(--wheel-1)", win: false },
  { label: "\u20A61,000 OFF", color: "var(--wheel-2)", win: true },
  { label: "\u20A62,000 OFF", color: "var(--wheel-3)", win: true },
  { label: "\u20A63,000 OFF", color: "var(--wheel-4)", win: true },
];

const SEG = 360 / SEGMENTS.length;

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

function wedgePath(index: number) {
  const start = index * SEG;
  const end = start + SEG;
  const [x1, y1] = polar(100, 100, 96, start);
  const [x2, y2] = polar(100, 100, 96, end);
  return `M100,100 L${x1},${y1} A96,96 0 0,1 ${x2},${y2} Z`;
}

export function SpinWheel({ onClose }: { onClose: () => void }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const spins = useRef(0);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const pick = Math.floor(Math.random() * SEGMENTS.length);
    spins.current += 1;
    // pointer sits at top (0deg); center of picked wedge must land there
    const target =
      spins.current * 360 * 5 + (360 - (pick * SEG + SEG / 2)) - (rotation % 360) + rotation;
    setRotation(target);
    window.setTimeout(() => {
      setSpinning(false);
      setResult(SEGMENTS[pick] ?? null);
    }, 4200);
  };

  return (
    <div className="relative w-full max-w-md rounded-2xl bg-card px-6 py-8 shadow-[var(--shadow-modal)]">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-3 text-lg text-muted-foreground transition-colors hover:text-foreground"
      >
        &times;
      </button>

      <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
        🎡 Spin The Wheel
      </h1>
      <p className="mt-2 text-center text-sm font-medium text-accent">
        Exciting Prizes Awaits You!
      </p>

      <div className="mt-8 flex justify-center">
        <div className="relative h-72 w-72">
          <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[16px] border-x-transparent border-t-foreground" />
          <svg
            viewBox="0 0 200 200"
            onClick={spin}
            className="h-full w-full cursor-pointer rounded-full shadow-[var(--shadow-wheel)] ring-4 ring-border"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: "transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)",
            }}
          >
            {SEGMENTS.map((s, i) => (
              <path key={s.label} d={wedgePath(i)} fill={s.color} />
            ))}
            {SEGMENTS.map((s, i) => (
              <text
                key={s.label}
                x="100"
                y="100"
                fill="oklch(0.25 0.02 280)"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                transform={`rotate(${i * SEG + SEG / 2} 100 100) translate(0 -60) rotate(90 100 100)`}
              >
                {s.label}
              </text>
            ))}
            <circle cx="100" cy="100" r="24" fill="var(--hub)" />
          </svg>
          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-foreground">
            SPIN
          </span>
        </div>
      </div>

      <p className="mt-6 min-h-6 text-center text-sm text-muted-foreground">
        {spinning
          ? "Spinning..."
          : result
            ? result.win
              ? `🎉 You won ${result.label}!`
              : "😅 Try Again!"
            : "Click the wheel or SPIN to start"}
      </p>

      <div className="mt-4 flex justify-center">
        <button
          onClick={spin}
          disabled={spinning}
          className="rounded-full bg-[image:var(--gradient-spin)] px-10 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
        >
          {spinning ? "..." : "Spin"}
        </button>
      </div>
    </div>
  );
}
