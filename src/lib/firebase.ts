import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDNyR1-zony7SBlW2wuP8aCr4jxVnA1mgA",
  authDomain: "spin-the-wheel-crm.firebaseapp.com",
  projectId: "spin-the-wheel-crm",
  storageBucket: "spin-the-wheel-crm.firebasestorage.app",
  messagingSenderId: "305196275656",
  appId: "1:305196275656:web:3cfdd915adacb350a5d2fd",
  measurementId: "G-4VV2YGSP38",
};

// Initialize Firebase (singleton pattern for SSR re-evaluations)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export let analytics: Analytics | undefined;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
