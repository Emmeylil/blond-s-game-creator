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
  { id: "2", label: "₦1,000 OFF", code: "", amount: 1000, quantity: 50, color: "#F68B1E", win: true },
  { id: "3", label: "₦2,000 OFF", code: "", amount: 2000, quantity: 20, color: "#3B82F6", win: true },
  { id: "4", label: "₦3,000 OFF", code: "", amount: 3000, quantity: 10, color: "#AC80F7", win: true },
];

const STORAGE_KEY = "spin_wheel_vouchers_v3";
const DEVICE_SPINS_KEY = "spin_wheel_device_spins_count_v1";
const DEVICE_WON_KEY = "spin_wheel_device_won_v1";
export const MAX_SPINS_PER_DEVICE = 5;

export function sanitizeVouchers(vouchers: VoucherItem[]): VoucherItem[] {
  if (!Array.isArray(vouchers)) return DEFAULT_VOUCHERS;
  return vouchers.map((v) => {
    let code = v.code || "";
    if (
      code === "BLOND1K" ||
      code === "BLOND2K" ||
      code === "RJA26" ||
      code === "SAVE1000" ||
      code === "SAVE2000" ||
      code === "SAVE3000"
    ) {
      code = "";
    }
    return { ...v, code };
  });
}

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

export function getDeviceWonVoucher(): VoucherItem | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(DEVICE_WON_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (parsed) {
      const [sanitized] = sanitizeVouchers([parsed]);
      return sanitized;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function setDeviceWonVoucher(voucher: VoucherItem): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEVICE_WON_KEY, JSON.stringify(voucher));
    window.dispatchEvent(new Event("spin_count_updated"));
  } catch (e) {}
}

export function resetDeviceSpinCount(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEVICE_SPINS_KEY, "0");
    localStorage.removeItem(DEVICE_WON_KEY);
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
        return sanitizeVouchers(parsed);
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
    const clean = sanitizeVouchers(vouchers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event("vouchers_updated"));
  } catch (e) {
    console.error("Failed to save vouchers to localStorage", e);
  }
}

export async function saveVouchers(vouchers: VoucherItem[]): Promise<void> {
  const clean = sanitizeVouchers(vouchers);
  // Always save to localStorage immediately for instant local UI update & fallback
  saveVouchersLocally(clean);

  // Sync to Cloud Firestore if connected
  if (db) {
    try {
      const voucherRef = doc(db, "settings", "vouchers");
      await setDoc(
        voucherRef,
        {
          items: clean,
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
            const clean = sanitizeVouchers(data.items);
            saveVouchersLocally(clean);
            callback(clean);
          }
        } else {
          // Document does not exist in Cloud Firestore yet: auto-seed with current clean vouchers
          const current = getVouchers();
          setDoc(voucherRef, { items: current, updatedAt: new Date().toISOString() }).catch((err) => {
            console.warn("Auto-seed Firestore notice (check Firestore security rules):", err?.message || err);
          });
        }
      },
      (error) => {
        console.warn("Firestore voucher listener notice (check Firestore security rules):", error.message);
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

  // RULE 1: If this is the 5th (last allowed) spin and device has not won yet, FORCE a win if stock exists
  if (currentSpinCount >= MAX_SPINS_PER_DEVICE - 1) {
    const winningIndices = vouchers
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v.win && v.quantity > 0);

    if (winningIndices.length > 0) {
      const totalWinWeight = winningIndices.reduce((sum, item) => sum + item.v.quantity, 0);
      let rand = Math.random() * totalWinWeight;
      for (const item of winningIndices) {
        if (rand < item.v.quantity) {
          return item.i;
        }
        rand -= item.v.quantity;
      }
      return winningIndices[0].i;
    }
  }

  // RULE 2: First spin on a device should mostly (90% chance) land on "Try Again"
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


