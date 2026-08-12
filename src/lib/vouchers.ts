export type VoucherItem = {
  id: string;
  label: string;
  code: string;
  amount: number;
  quantity: number;
  color: string;
  win: boolean;
};

export const DEFAULT_VOUCHERS: VoucherItem[] = [
  { id: "1", label: "Try Again", code: "", amount: 0, quantity: 100, color: "#7F4CEF", win: false },
  { id: "2", label: "₦1,000 OFF", code: "BLOND1K", amount: 1000, quantity: 50, color: "#F68B1E", win: true },
  { id: "3", label: "₦2,000 OFF", code: "BLOND2K", amount: 2000, quantity: 20, color: "#3B82F6", win: true },
  { id: "4", label: "₦3,000 OFF", code: "RJA26", amount: 3000, quantity: 10, color: "#AC80F7", win: true },
];

const STORAGE_KEY = "spin_wheel_vouchers_v1";

export function getVouchers(): VoucherItem[] {
  if (typeof window === "undefined") return DEFAULT_VOUCHERS;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read vouchers from localStorage", e);
  }
  return DEFAULT_VOUCHERS;
}

export function saveVouchers(vouchers: VoucherItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vouchers));
    window.dispatchEvent(new Event("vouchers_updated"));
  } catch (e) {
    console.error("Failed to save vouchers to localStorage", e);
  }
}

export function pickWeightedVoucherIndex(vouchers: VoucherItem[]): number {
  const weights = vouchers.map((v) => (v.quantity > 0 ? v.quantity : v.win ? 0 : 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  if (totalWeight <= 0) {
    const tryAgainIdx = vouchers.findIndex((v) => !v.win);
    return tryAgainIdx >= 0 ? tryAgainIdx : 0;
  }

  let random = Math.random() * totalWeight;
  for (let i = 0; i < vouchers.length; i++) {
    if (random < weights[i]) {
      return i;
    }
    random -= weights[i];
  }
  return 0;
}

export function claimVoucher(id: string): void {
  const current = getVouchers();
  const updated = current.map((v) => {
    if (v.id === id && v.win && v.quantity > 0) {
      return { ...v, quantity: v.quantity - 1 };
    }
    return v;
  });
  saveVouchers(updated);
}
