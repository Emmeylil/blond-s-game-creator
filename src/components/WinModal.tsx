import { useState } from "react";
import { type VoucherItem } from "@/lib/vouchers";

type WinModalProps = {
  voucher: VoucherItem;
  onClose: () => void;
};

export function WinModal({ voucher, onClose }: WinModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!voucher.code) return;
    navigator.clipboard.writeText(voucher.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#181628] p-8 text-center shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 text-gray-400 transition-colors hover:text-white text-xl"
        >
          &times;
        </button>

        {/* Confetti Emoji */}
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center text-4xl">
          🎉
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Congratulations!
        </h2>

        {/* Subheading */}
        <p className="mt-3 text-lg font-medium text-gray-300">
          You won{" "}
          <span className="font-bold text-emerald-400">
            {voucher.label}
          </span>
        </p>

        {/* Voucher Code Box */}
        {voucher.code ? (
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              onClick={handleCopy}
              className="group relative flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-xl font-bold tracking-widest text-white shadow-inner transition-all hover:border-emerald-400/50 hover:bg-white/10 active:scale-95"
            >
              <span>{voucher.code}</span>
              <span className="text-lg opacity-80 transition-opacity group-hover:opacity-100">
                📋
              </span>
            </button>

            {/* Click to copy caption */}
            <p className="text-xs font-medium text-amber-400 transition-all">
              {copied ? "✓ Copied to clipboard!" : "👇 Click the code to copy"}
            </p>
          </div>
        ) : null}

        {/* Action Button */}
        <div className="mt-8">
          <button
            onClick={onClose}
            className="w-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-95"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
