import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getVouchers,
  saveVouchers,
  subscribeVouchersCloud,
  resetDeviceSpinCount,
  DEFAULT_VOUCHERS,
  type VoucherItem,
} from "@/lib/vouchers";
import {
  isAdminAuthenticated,
  loginWithFirebaseOrLocal,
  logoutAdminAuth,
  subscribeAuthChange,
  getAdminPassword,
  setAdminPassword,
  DEFAULT_USERNAME,
} from "@/lib/adminAuth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Voucher Management" },
      { name: "description", content: "Manage vouchers, amounts, codes, and stock quantities for the prize wheel." },
    ],
  }),
  component: AdminPage,
});

const COLOR_PRESETS = [
  "#F68B1E", // Brand Orange
  "#7F4CEF", // Block Purple
  "#3B82F6", // Block Blue
  "#AC80F7", // Iris Light Purple
  "#8B5CF6", // Iris Aurora
  "#F59E0B", // Amber Aurora
  "#D8B4FE", // Soft Ice Purple
  "#DDEDFF", // Light Blue
];

function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState(DEFAULT_USERNAME);
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const [changePassOpen, setChangePassOpen] = useState(false);
  const [newPassInput, setNewPassInput] = useState("");
  const [passNotice, setPassNotice] = useState<string | null>(null);

  useEffect(() => {
    setAuthenticated(isAdminAuthenticated());
    setVouchers(getVouchers());

    const unsubscribeAuth = subscribeAuthChange((user) => {
      if (user) {
        setAuthenticated(true);
      }
    });

    const unsubscribeCloud = subscribeVouchersCloud((updated) => {
      if (Array.isArray(updated) && updated.length > 0) {
        setVouchers(updated);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeCloud();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    const res = await loginWithFirebaseOrLocal(usernameInput, passwordInput);
    setLoading(false);

    if (res.success) {
      setAuthenticated(true);
    } else {
      setLoginError(res.error || "Login failed. Please check your credentials.");
    }
  };

  const handleLogout = async () => {
    await logoutAdminAuth();
    setAuthenticated(false);
    setPasswordInput("");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassInput.trim()) {
      setPassNotice("Password cannot be empty.");
      return;
    }
    setAdminPassword(newPassInput.trim());
    setPassNotice("✓ Password updated successfully!");
    setTimeout(() => {
      setChangePassOpen(false);
      setPassNotice(null);
      setNewPassInput("");
    }, 2000);
  };

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
      code: "",
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

  const handleSave = async () => {
    setSaving(true);
    await saveVouchers(vouchers);
    setSaving(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3500);
  };

  const handleResetDefaults = async () => {
    if (confirm("Are you sure you want to reset all vouchers to default values?")) {
      setSaving(true);
      setVouchers(DEFAULT_VOUCHERS);
      await saveVouchers(DEFAULT_VOUCHERS);
      setSaving(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3500);
    }
  };

  // 1. LOGIN SCREEN WITH FIREBASE AUTH & LOCAL FALLBACK
  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0e17] px-4 py-12 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#181628] p-8 shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-3xl">
            🔥
          </div>
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-white">
            Firebase & Admin Portal
          </h1>
          <p className="mt-1 text-center text-xs font-medium text-gray-400">
            Sign in with your Firebase Email or default admin credentials.
          </p>

          {loginError ? (
            <div className="mt-4 rounded-xl bg-rose-500/20 border border-rose-500/40 p-3 text-center text-xs font-semibold text-rose-300">
              {loginError}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Email or Username
              </label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white focus:border-amber-500 focus:outline-none"
                placeholder="admin or name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white focus:border-amber-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Log In to Admin"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-4 text-center">
            <p className="text-[11px] text-gray-400">
              Firebase Project: <span className="font-mono text-amber-400">spin-the-wheel-crm</span>
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              Default Fallback: <span className="font-mono text-amber-400">admin</span> / <span className="font-mono text-amber-400">{getAdminPassword()}</span>
            </p>
            <div className="mt-3">
              <Link to="/" className="text-xs font-semibold text-gray-400 hover:text-white underline">
                ← Back to Spin Wheel Game
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalStock = vouchers
    .filter((v) => v.win)
    .reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

  // 2. AUTHENTICATED DASHBOARD
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
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-white/15"
            >
              <span>🎮</span> View Wheel
            </Link>
            <button
              onClick={() => {
                resetDeviceSpinCount();
                alert("✓ Device spin counter has been reset to 0!");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-300 transition-all hover:bg-purple-500/20"
            >
              <span>🔄</span> Reset Device Spins
            </button>
            <button
              onClick={() => setChangePassOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-500/20"
            >
              <span>🔑</span> Change Password
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400 transition-all hover:bg-rose-500/20"
            >
              <span>🚪</span> Log Out
            </button>
          </div>
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
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving to Cloud..." : "Save All Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {changePassOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-[#181628] p-6 text-center shadow-2xl">
            <button
              onClick={() => setChangePassOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              &times;
            </button>
            <h3 className="text-xl font-extrabold text-white">Change Admin Password</h3>
            <p className="mt-1 text-xs text-gray-400">Enter a new password for your admin account.</p>

            {passNotice ? (
              <div className="mt-3 rounded-lg bg-emerald-500/20 p-2 text-xs font-semibold text-emerald-300">
                {passNotice}
              </div>
            ) : null}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
              <input
                type="password"
                required
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white focus:border-amber-500 focus:outline-none"
                placeholder="New Password"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
