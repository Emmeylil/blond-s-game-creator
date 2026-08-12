import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SpinWheel } from "@/components/SpinWheel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spin The Wheel — Win Instant Discounts" },
      {
        name: "description",
        content:
          "Spin the prize wheel for a chance to win ₦1,000, ₦2,000 or ₦3,000 off your next order.",
      },
      { property: "og:title", content: "Spin The Wheel — Win Instant Discounts" },
      {
        property: "og:description",
        content: "Give the wheel a spin and unlock an instant discount code.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [open, setOpen] = useState(true);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      {open ? (
        <SpinWheel onClose={() => setOpen(false)} />
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-[image:var(--gradient-spin)] px-8 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          Open the wheel
        </button>
      )}
    </main>
  );
}
