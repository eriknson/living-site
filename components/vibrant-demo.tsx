"use client";

import { useEffect, useState } from "react";

// Each pair: an sRGB-clamped hex and its wider-gamut Display-P3 equivalent.
// On a P3-capable display the right half of every swatch reads noticeably
// more saturated than the left; on sRGB displays the two halves match.
const SWATCHES: { name: string; srgb: string; p3: string }[] = [
  { name: "Red", srgb: "#ff0000", p3: "color(display-p3 1 0 0)" },
  { name: "Green", srgb: "#00ff00", p3: "color(display-p3 0 1 0)" },
  { name: "Magenta", srgb: "#ff00b4", p3: "color(display-p3 1 0 0.55)" },
  { name: "Cyan", srgb: "#00d4ff", p3: "color(display-p3 0 0.85 1)" },
  { name: "Orange", srgb: "#ff7a00", p3: "color(display-p3 1 0.5 0)" },
  { name: "Violet", srgb: "#7b2bff", p3: "color(display-p3 0.5 0.15 1)" },
];

function useP3Support() {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setSupported(
        window.matchMedia("(color-gamut: p3)").matches &&
          CSS.supports("color", "color(display-p3 1 1 1)")
      );
    } catch {
      setSupported(false);
    }
  }, []);
  return supported;
}

export function VibrantDemo() {
  const p3 = useP3Support();

  return (
    <section className="mt-10 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-5 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[15px] font-medium text-black/80 dark:text-white/80">
          Wide-gamut color
        </h2>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: "var(--v-bg-tint-1)",
            color: "var(--v-accent)",
          }}
        >
          {p3 === null ? "checking…" : p3 ? "P3 display detected" : "sRGB display"}
        </span>
      </div>
      <p className="text-[13px] text-black/50 dark:text-white/50 leading-relaxed mb-5">
        Each swatch is split: the left half is the sRGB color, the right half is
        the same color in Display-P3. On a P3 screen the right side glows more.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SWATCHES.map((s) => (
          <div key={s.name}>
            <div
              className="gamut-swatch"
              style={
                {
                  "--swatch-srgb": s.srgb,
                  "--swatch-p3": s.p3,
                } as React.CSSProperties
              }
            >
              <span className="swatch-divider" />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-black/40 dark:text-white/40">
              <span>{s.name}</span>
              <span className="tabular-nums">sRGB · P3</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-[13px] text-black/50 dark:text-white/50 mb-2">
          Full P3 spectrum
        </p>
        <div className="gamut-bar" />
      </div>
    </section>
  );
}
