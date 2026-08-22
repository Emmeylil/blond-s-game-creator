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

const STORAGE_KEY = "spin_wheel_vouchers_v4";
const DEVICE_DAILY_DATE_KEY = "spin_wheel_daily_date_v2";
const DEVICE_DAILY_SPINS_KEY = "spin_wheel_daily_spins_v2";
const DEVICE_DAILY_WON_KEY = "spin_wheel_daily_won_v2";
export const MAX_SPINS_PER_DEVICE = 5;

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getMsUntilMidnight(): number {
  const d = new Date();
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - d.getTime();
}

export function formatTimeUntilMidnight(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export function checkAndAutoResetDaily(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const today = getTodayDateString();
    const storedDate = localStorage.getItem(DEVICE_DAILY_DATE_KEY);
    if (storedDate !== today) {
      localStorage.setItem(DEVICE_DAILY_DATE_KEY, today);
      localStorage.setItem(DEVICE_DAILY_SPINS_KEY, "0");
      localStorage.removeItem(DEVICE_DAILY_WON_KEY);
      window.dispatchEvent(new Event("spin_count_updated"));
      return true;
    }
  } catch (e) {}
  return false;
}

export function getDeviceSpinCount(): number {
  if (typeof window === "undefined") return 0;
  checkAndAutoResetDaily();
  try {
    const val = localStorage.getItem(DEVICE_DAILY_SPINS_KEY);
    return val ? Math.max(0, parseInt(val, 10) || 0) : 0;
  } catch (e) {
    return 0;
  }
}

export function incrementDeviceSpinCount(): number {
  if (typeof window === "undefined") return 0;
  checkAndAutoResetDaily();
  const current = getDeviceSpinCount();
  const next = current + 1;
  try {
    localStorage.setItem(DEVICE_DAILY_SPINS_KEY, String(next));
    window.dispatchEvent(new Event("spin_count_updated"));
  } catch (e) {}
  return next;
}

export function getDeviceWonVoucher(): VoucherItem | null {
  if (typeof window === "undefined") return null;
  if (checkAndAutoResetDaily()) return null;
  try {
    const data = localStorage.getItem(DEVICE_DAILY_WON_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (parsed) {
      const sanitized = sanitizeVouchers([parsed]);
      return sanitized[0] ?? null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function setDeviceWonVoucher(voucher: VoucherItem): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEVICE_DAILY_WON_KEY, JSON.stringify(voucher));
    window.dispatchEvent(new Event("spin_count_updated"));
  } catch (e) {}
}

export function resetDeviceSpinCount(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEVICE_DAILY_DATE_KEY, getTodayDateString());
    localStorage.setItem(DEVICE_DAILY_SPINS_KEY, "0");
    localStorage.removeItem(DEVICE_DAILY_WON_KEY);
    window.dispatchEvent(new Event("spin_count_updated"));
  } catch (e) {}
}

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

export function getVouchers(): VoucherItem[] {
  if (typeof window === "undefined") return DEFAULT_VOUCHERS;
  try {
    // Automatically purge old restrictive keys from browser localStorage
    localStorage.removeItem("spin_wheel_device_spins_count_v1");
    localStorage.removeItem("spin_wheel_device_won_v1");
    localStorage.removeItem("spin_wheel_device_claim_time_v1");

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
          const items = data ? data["items"] : undefined;
          if (Array.isArray(items) && items.length > 0) {
            const clean = sanitizeVouchers(items as VoucherItem[]);
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

  // RULE 1: If this is the 5th (last allowed spin of the day) and device has not won yet, FORCE a win if stock exists
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
      return winningIndices[0]?.i ?? fallbackTryAgain;
    }
  }

  // RULE 2: First spin of the day should mostly (90% chance) land on "Try Again" so user gets multiple spins
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
    const weight = weights[i] ?? 0;
    if (random < weight) {
      return i;
    }
    random -= weight;
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


