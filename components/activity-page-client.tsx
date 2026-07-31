"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Liveline } from "liveline";
import type { LivelinePoint } from "liveline";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { useIsMobile } from "@/lib/use-media-query";
import { getModelDisplayName, type Manifest } from "@/lib/manifest";

interface ActivityData {
  points: LivelinePoint[];
  latestValue: number;
}

interface ModelTimeSeries {
  modelId: string;
  label: string;
  points: LivelinePoint[];
  latestValue: number;
  avgValue: number;
}

function useSystemTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mq.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) =>
      setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return theme;
}

const MODEL_FAMILIES: [string, string[]][] = [
  ["Grok", ["cursor-grok-4.5-high-fast"]],
  ["Composer", ["composer-2.5-fast", "composer-2-fast", "composer-1.5", "composer-1"]],
  ["GPT", ["gpt-5.6-sol-xhigh", "gpt-5.5-extra-high", "gpt-5.4-high-fast", "gpt-5.3-codex-xhigh", "gpt-5.1-codex", "gpt-5.1-codex-max-low-fast"]],
  ["Fable", ["claude-fable-5-thinking-max"]],
  ["Claude", ["claude-opus-4-8-thinking-max-fast", "claude-opus-4-7-thinking-max"]],
  ["Kimi", ["kimi-k2.5", "kimi-k2.6"]],
  ["Gemma", ["google-gemma-4-31b-it"]],
  ["Nougat", ["claude-nougat-eap-thinking-max"]],
  ["Opus", ["opus-4.6-thinking", "claude-4.6-opus-max-thinking", "claude-4.5-opus-high-thinking"]],
  ["Gemini", ["gemini-3.6-flash-high", "gemini-3.1-pro", "gemini-3-pro"]],
];

/** Compute a trailing 7-day rolling average from daily contribution points */
function rollingWeeklyAverage(points: LivelinePoint[]): LivelinePoint[] {
  const WINDOW = 7;
  return points.map((point, i) => {
    const start = Math.max(0, i - WINDOW + 1);
    const windowSlice = points.slice(start, i + 1);
    const avg =
      windowSlice.reduce((sum, p) => sum + p.value, 0) / windowSlice.length;
    return { time: point.time, value: Math.round(avg * 10) / 10 };
  });
}

function buildDurationSeries(manifest: Manifest): ModelTimeSeries[] {
  const allPoints: Record<string, LivelinePoint[]> = {};

  for (const dateEntry of manifest.dates) {
    for (const batch of dateEntry.batches) {
      const batchTime = new Date(batch.timestamp).getTime() / 1000;
      for (const build of batch.builds) {
        if (build.status !== "success" || !build.duration_ms) continue;
        if (!allPoints[build.model]) allPoints[build.model] = [];
        allPoints[build.model].push({
          time: batchTime,
          value: Math.round(build.duration_ms / 1000),
        });
      }
    }
  }

  return MODEL_FAMILIES
    .map(([label, ids]) => {
      const pts = ids
        .flatMap((id) => allPoints[id] ?? [])
        .sort((a, b) => a.time - b.time);
      if (pts.length < 2) return null;
      const avg = pts.reduce((s, p) => s + p.value, 0) / pts.length;
      return {
        modelId: ids[0],
        label,
        points: pts,
        latestValue: pts[pts.length - 1].value,
        avgValue: Math.round(avg),
      };
    })
    .filter((s): s is ModelTimeSeries => s !== null);
}

export function ActivityPageClient() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowSecs, setWindowSecs] = useState(90 * 86400);
  const theme = useSystemTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch("/api/github-activity")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d: ActivityData) => setData(d))
      .catch((err) => setError(err.message));

    fetch("/builds/manifest.json")
      .then((res) => res.json())
      .then((m: Manifest) => setManifest(m))
      .catch(() => {});
  }, []);

  const buildSeries = useMemo(
    () => (manifest ? buildDurationSeries(manifest) : []),
    [manifest]
  );

  const handleWindowChange = useCallback((secs: number) => {
    setWindowSecs(secs);
  }, []);

  const filteredPoints =
    data?.points.filter((p) => {
      if (!data.points.length) return true;
      const latest = data.points[data.points.length - 1].time;
      return p.time >= latest - windowSecs;
    }) ?? [];

  const smoothedPoints = useMemo(
    () => rollingWeeklyAverage(filteredPoints),
    [filteredPoints]
  );

  const latestValue = smoothedPoints[smoothedPoints.length - 1]?.value ?? 0;

  const avgValue =
    smoothedPoints.length > 0
      ? smoothedPoints.reduce((sum, p) => sum + p.value, 0) / smoothedPoints.length
      : 0;

  return (
    <div className="min-h-screen min-h-dvh bg-page text-primary">
      <GlobalMenuBar currentRoute={"/builds" as never} />

      <main className="max-w-[640px] mx-auto px-6 pt-10 pb-20">
        <div className="mb-8">
          <h1 className="text-[22px] font-semibold tracking-tight text-black/90 dark:text-white/90">
            Activity
          </h1>
          <p className="text-[15px] text-black/50 dark:text-white/50 mt-1">
            GitHub contributions · 7-day rolling avg
          </p>
        </div>

        {!data && !error && (
          <div className="h-[300px] animate-pulse rounded-2xl bg-black/[0.02] dark:bg-white/[0.02]" />
        )}

        {data && (
          <>
            <div className="-mx-6 sm:mx-[-24px]">
              <div style={{ height: isMobile ? 280 : 320 }}>
                <Liveline
                  data={smoothedPoints}
                  value={latestValue}
                  theme={theme}
                  color="#238636"
                  momentum={true}
                  scrub={true}
                  showValue={false}
                  valueMomentumColor={true}
                  fill={true}
                  grid={true}
                  badge={true}
                  badgeVariant="minimal"
                  badgeTail={true}
                  exaggerate={true}
                  degen={{ scale: 0.8, downMomentum: true }}
                  pulse={true}
                  windows={[
                    { label: "7d", secs: 7 * 86400 },
                    { label: "14d", secs: 14 * 86400 },
                    { label: "30d", secs: 30 * 86400 },
                    { label: "90d", secs: 90 * 86400 },
                  ]}
                  windowStyle="rounded"
                  onWindowChange={handleWindowChange}
                  formatValue={(v) => Math.round(v).toString()}
                  formatTime={(t) => {
                    const d = new Date(t * 1000);
                    return d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  window={90 * 86400}
                  referenceLine={{ value: Math.round(avgValue * 10) / 10, label: "avg" }}
                  lerpSpeed={0.06}
                  padding={isMobile
                    ? { top: 16, right: 60, bottom: 32, left: 12 }
                    : { top: 20, right: 80, bottom: 36, left: 24 }
                  }
                />
              </div>
            </div>
          </>
        )}

        {buildSeries.length > 0 && (
          <div className="mt-16">
            <div className="mb-8">
              <h2 className="text-[22px] font-semibold tracking-tight text-black/90 dark:text-white/90">
                Build times
              </h2>
              <p className="text-[15px] text-black/50 dark:text-white/50 mt-1">
                How long each model takes to generate this site
              </p>
            </div>

            <div className="space-y-10">
              {buildSeries.map((series) => (
                <div key={series.modelId}>
                  <div className="mb-2 px-1">
                    <span className="text-[15px] font-medium text-black/70 dark:text-white/70">
                      {series.label}
                    </span>
                  </div>
                  <div className="-mx-6 sm:mx-[-24px]">
                    <div style={{ height: isMobile ? 180 : 200 }}>
                      <Liveline
                        data={series.points}
                        value={series.latestValue}
                        theme={theme}
                        color="#3b82f6"
                        window={30 * 86400}
                        momentum={true}
                        scrub={true}
                        showValue={false}
                        fill={true}
                        grid={true}
                        badge={true}
                        badgeVariant="minimal"
                        exaggerate={true}
                        referenceLine={{ value: series.avgValue, label: "avg" }}
                        formatValue={(v) => {
                          if (v >= 60) return `${Math.floor(v / 60)}m ${Math.round(v % 60)}s`;
                          return `${Math.round(v)}s`;
                        }}
                        formatTime={(t) => {
                          const d = new Date(t * 1000);
                          return d.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                        }}
                        lerpSpeed={0.08}
                        padding={isMobile
                          ? { top: 12, right: 60, bottom: 28, left: 12 }
                          : { top: 16, right: 80, bottom: 32, left: 24 }
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
