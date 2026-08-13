import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

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
const DEVICE_SPINS_KEY = "spin_wheel_device_spins_count_v1";
export const MAX_SPINS_PER_DEVICE = 5;

export function getDeviceSpinCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const val = localStorage.getItem(DEVICE_SPINS_KEY);
    return val ? Math.max(0, parseInt(val, 10) || 0) : 0;
  } catch (e) {
    return 0;
  }
}

export function incrementDeviceSpinCount(): number {
  if (typeof window === "undefined") return 0;
  const current = getDeviceSpinCount();
  const next = current + 1;
  try {
    localStorage.setItem(DEVICE_SPINS_KEY, String(next));
    window.dispatchEvent(new Event("spin_count_updated"));
  } catch (e) {}
  return next;
}

export function resetDeviceSpinCount(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEVICE_SPINS_KEY, "0");
    window.dispatchEvent(new Event("spin_count_updated"));
  } catch (e) {}
}

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

function saveVouchersLocally(vouchers: VoucherItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vouchers));
    window.dispatchEvent(new Event("vouchers_updated"));
  } catch (e) {
    console.error("Failed to save vouchers to localStorage", e);
  }
}

export async function saveVouchers(vouchers: VoucherItem[]): Promise<void> {
  // Always save to localStorage immediately for instant local UI update & fallback
  saveVouchersLocally(vouchers);

  // Sync to Cloud Firestore if connected
  if (db) {
    try {
      const voucherRef = doc(db, "settings", "vouchers");
      await setDoc(
        voucherRef,
        {
          items: vouchers,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Failed to save vouchers to Cloud Firestore:", e);
    }
  }
}

export function subscribeVouchersCloud(callback: (vouchers: VoucherItem[]) => void): () => void {
  if (typeof window === "undefined" || !db) {
    return () => {};
  }

  try {
    const voucherRef = doc(db, "settings", "vouchers");
    const unsubscribe = onSnapshot(
      voucherRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.items) && data.items.length > 0) {
            saveVouchersLocally(data.items);
            callback(data.items);
          }
        }
      },
      (error) => {
        console.warn("Firestore voucher listener notice:", error.message);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.error("Error setting up Firestore voucher listener:", e);
    return () => {};
  }
}

export function pickWeightedVoucherIndex(
  vouchers: VoucherItem[],
  currentSpinCount: number = 0
): number {
  const tryAgainIdx = vouchers.findIndex((v) => !v.win);
  const fallbackTryAgain = tryAgainIdx >= 0 ? tryAgainIdx : 0;

  // RULE: First spin on a device should mostly (90% chance) land on "Try Again"
  if (currentSpinCount === 0) {
    if (Math.random() < 0.90) {
      return fallbackTryAgain;
    }
  }

  const weights = vouchers.map((v) => (v.quantity > 0 ? v.quantity : v.win ? 0 : 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  if (totalWeight <= 0) {
    return fallbackTryAgain;
  }

  let random = Math.random() * totalWeight;
  for (let i = 0; i < vouchers.length; i++) {
    if (random < weights[i]) {
      return i;
    }
    random -= weights[i];
  }
  return fallbackTryAgain;
}

export async function claimVoucher(id: string): Promise<void> {
  const current = getVouchers();
  const updated = current.map((v) => {
    if (v.id === id && v.win && v.quantity > 0) {
      return { ...v, quantity: v.quantity - 1 };
    }
    return v;
  });
  await saveVouchers(updated);
}

