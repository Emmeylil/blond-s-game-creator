import { useEffect, useRef, useState } from "react";
import {
  getVouchers,
  pickWeightedVoucherIndex,
  claimVoucher,
  type VoucherItem,
} from "@/lib/vouchers";
import { WinModal } from "./WinModal";

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

function wedgePath(index: number, total: number) {
  const seg = 360 / total;
  const start = index * seg;
  const end = start + seg;
  const [x1, y1] = polar(100, 100, 96, start);
  const [x2, y2] = polar(100, 100, 96, end);
  return `M100,100 L${x1},${y1} A96,96 0 0,1 ${x2},${y2} Z`;
}

export function SpinWheel({ onClose }: { onClose: () => void }) {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<VoucherItem | null>(null);
  const [winModalVoucher, setWinModalVoucher] = useState<VoucherItem | null>(null);
  const spins = useRef(0);

  useEffect(() => {
    const load = () => setVouchers(getVouchers());
    load();
    window.addEventListener("vouchers_updated", load);
    return () => window.removeEventListener("vouchers_updated", load);
  }, []);

  const currentVouchers = vouchers.length > 0 ? vouchers : getVouchers();
  const totalSegments = currentVouchers.length;
  const segAngle = 360 / Math.max(1, totalSegments);

  const spin = () => {
    if (spinning || totalSegments === 0) return;
    setSpinning(true);
    setResult(null);

    const pick = pickWeightedVoucherIndex(currentVouchers);
    spins.current += 1;

    // Pointer sits at top (0deg); center of picked wedge must land there
    const target =
      spins.current * 360 * 5 + (360 - (pick * segAngle + segAngle / 2)) - (rotation % 360) + rotation;
    setRotation(target);

    window.setTimeout(() => {
      setSpinning(false);
      const landed = currentVouchers[pick];
      setResult(landed);

      if (landed && landed.win) {
        claimVoucher(landed.id);
        setWinModalVoucher(landed);
      }
    }, 4200);
  };

  return (
    <>
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
              {currentVouchers.map((s, i) => (
                <path key={s.id} d={wedgePath(i, totalSegments)} fill={s.color} />
              ))}
              {currentVouchers.map((s, i) => (
                <text
                  key={s.id}
                  x="100"
                  y="100"
                  fill="oklch(0.25 0.02 280)"
                  fontSize={totalSegments > 6 ? "8" : "10"}
                  fontWeight="700"
                  textAnchor="middle"
                  transform={`rotate(${i * segAngle + segAngle / 2} 100 100) translate(0 -60) rotate(90 100 100)`}
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

        <div className="mt-4 flex flex-col items-center gap-3">
          <button
            onClick={spin}
            disabled={spinning}
            className="rounded-full bg-[image:var(--gradient-spin)] px-10 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
          >
            {spinning ? "..." : "Spin"}
          </button>
        </div>
      </div>

      {winModalVoucher ? (
        <WinModal
          voucher={winModalVoucher}
          onClose={() => setWinModalVoucher(null)}
        />
      ) : null}
    </>
  );
}
