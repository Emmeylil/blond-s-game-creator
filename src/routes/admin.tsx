import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getVouchers,
  saveVouchers,
  DEFAULT_VOUCHERS,
  type VoucherItem,
} from "@/lib/vouchers";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Voucher & Prize Management" },
      { name: "description", content: "Manage vouchers, amounts, codes, and stock quantities for the prize wheel." },
    ],
  }),
  component: AdminPage,
});

const COLOR_PRESETS = [
  "var(--wheel-1)",
  "var(--wheel-2)",
  "var(--wheel-3)",
  "var(--wheel-4)",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
];

function AdminPage() {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setVouchers(getVouchers());
  }, []);

  const handleUpdateField = <K extends keyof VoucherItem>(
    id: string,
    field: K,
    value: VoucherItem[K]
  ) => {
    setVouchers((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const updated = { ...v, [field]: value };
          if (field === "label" && typeof value === "string") {
            const numMatch = value.match(/\d+/g);
            if (numMatch) {
              const parsedAmount = parseInt(numMatch.join(""), 10);
              if (!isNaN(parsedAmount) && parsedAmount > 0) {
                updated.amount = parsedAmount;
              }
            }
          }
          return updated;
        }
        return v;
      })
    );
  };

  const handleAddVoucher = () => {
    const newId = String(Date.now());
    const newVoucher: VoucherItem = {
      id: newId,
      label: "₦5,000 OFF",
      code: `WIN${Math.floor(1000 + Math.random() * 9000)}`,
      amount: 5000,
      quantity: 5,
      color: COLOR_PRESETS[vouchers.length % COLOR_PRESETS.length],
      win: true,
    };
    setVouchers((prev) => [...prev, newVoucher]);
  };

  const handleDeleteVoucher = (id: string) => {
    if (vouchers.length <= 2) {
      alert("The wheel needs at least 2 segments to function properly.");
      return;
    }
    setVouchers((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSave = () => {
    saveVouchers(vouchers);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleResetDefaults = () => {
    if (confirm("Are you sure you want to reset all vouchers to default values?")) {
      setVouchers(DEFAULT_VOUCHERS);
      saveVouchers(DEFAULT_VOUCHERS);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    }
  };

  const totalStock = vouchers
    .filter((v) => v.win)
    .reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

  return (
    <div className="min-h-screen bg-[#0f0e17] text-white p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>⚙️</span> Voucher & Wheel Admin
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Manage discount vouchers, amounts, codes, and stock quantities to control wheel probability.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/15"
          >
            <span>🎮</span> Test Spin Wheel
          </Link>
        </div>

        {/* Saved Toast Notice */}
        {savedNotice ? (
          <div className="mt-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-emerald-300 font-semibold text-center animate-in fade-in">
            ✓ Changes saved successfully! Wheel is now updated.
          </div>
        ) : null}

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Vouchers Remaining
            </p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-400">
              {totalStock} <span className="text-sm font-normal text-gray-400">vouchers</span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Active Wheel Segments
            </p>
            <p className="mt-2 text-3xl font-extrabold text-amber-400">
              {vouchers.length} <span className="text-sm font-normal text-gray-400">segments</span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Prize Options
            </p>
            <p className="mt-2 text-3xl font-extrabold text-purple-400">
              {vouchers.filter((v) => v.win).length} <span className="text-sm font-normal text-gray-400">prizes</span>
            </p>
          </div>
        </div>

        {/* Vouchers Table */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#181628] p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-white">Voucher Inventory & Segments</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddVoucher}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20"
              >
                + Add Segment
              </button>
              <button
                onClick={handleResetDefaults}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-300 transition-all hover:bg-white/10"
              >
                Reset Defaults
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {vouchers.map((v, index) => (
              <div
                key={v.id}
                className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-12 sm:items-center"
              >
                {/* Segment Index & Color */}
                <div className="sm:col-span-1 flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                  <input
                    type="color"
                    value={v.color.startsWith("#") ? v.color : "#3b82f6"}
                    onChange={(e) => handleUpdateField(v.id, "color", e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
                    title="Change segment color"
                  />
                </div>

                {/* Label */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Label / Prize Name
                  </label>
                  <input
                    type="text"
                    value={v.label}
                    onChange={(e) => handleUpdateField(v.id, "label", e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. ₦3,000 OFF"
                  />
                </div>

                {/* Voucher Code */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Voucher Code
                  </label>
                  <input
                    type="text"
                    value={v.code}
                    disabled={!v.win}
                    onChange={(e) => handleUpdateField(v.id, "code", e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-mono font-bold text-amber-400 focus:border-amber-500 focus:outline-none disabled:opacity-40"
                    placeholder="e.g. RJA26"
                  />
                </div>

                {/* Quantity / Stock */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Quantity (Stock)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={v.quantity}
                    onChange={(e) =>
                      handleUpdateField(v.id, "quantity", Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold text-emerald-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Prize Type */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Type
                  </label>
                  <select
                    value={v.win ? "win" : "loss"}
                    onChange={(e) => handleUpdateField(v.id, "win", e.target.value === "win")}
                    className="w-full rounded-lg border border-white/15 bg-[#201d36] px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="win">Prize (Win)</option>
                    <option value="loss">Try Again (Loss)</option>
                  </select>
                </div>

                {/* Delete Action */}
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    onClick={() => handleDeleteVoucher(v.id)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
                    title="Delete segment"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Save Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <p className="text-xs text-gray-400">
              * Segments with higher quantities have a higher probability of being landed on.
            </p>
            <button
              onClick={handleSave}
              className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
            >
              Save All Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
