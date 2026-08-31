"use client";

import { useMemo, useState } from "react";
import { GlobalMenuBar } from "@/components/global-menu-bar";

export type Metric = "areaKm2" | "population" | "gdpUsd";

export interface Country {
  code: string;
  name: string;
  areaKm2: number;
  population: number;
  gdpUsd: number;
  region: string;
}

export interface CountriesData {
  asOf: string;
  source: string;
  countries: Country[];
}

const METRICS: { id: Metric; label: string }[] = [
  { id: "areaKm2", label: "Area" },
  { id: "population", label: "Population" },
  { id: "gdpUsd", label: "GDP" },
];

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

function formatMetric(metric: Metric, value: number): string {
  switch (metric) {
    case "areaKm2":
      return `${formatCompact(value)} km²`;
    case "population":
      return formatCompact(value);
    case "gdpUsd":
      return `$${formatCompact(value)}`;
  }
}

function metricUnit(metric: Metric): string {
  switch (metric) {
    case "areaKm2":
      return "land area";
    case "population":
      return "people";
    case "gdpUsd":
      return "nominal GDP";
  }
}

type SortKey = Metric | "name" | "region";

export function CountriesDashboard({ data }: { data: CountriesData }) {
  const [metric, setMetric] = useState<Metric>("areaKm2");
  const [sortKey, setSortKey] = useState<SortKey>("areaKm2");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const ranked = useMemo(() => {
    return [...data.countries].sort((a, b) => b[metric] - a[metric]);
  }, [data.countries, metric]);

  const top10 = ranked.slice(0, 10);
  const maxValue = top10[0]?.[metric] ?? 1;
  const leader = ranked[0];

  const tableRows = useMemo(() => {
    const rows = [...data.countries];
    rows.sort((a, b) => {
      if (sortKey === "name" || sortKey === "region") {
        const cmp = a[sortKey].localeCompare(b[sortKey]);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const cmp = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [data.countries, sortKey, sortDir]);

  function handleMetricChange(next: Metric) {
    setMetric(next);
    setSortKey(next);
    setSortDir("desc");
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" || key === "region" ? "asc" : "desc");
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return (
      <span className="ml-1 text-tertiary" aria-hidden>
        {sortDir === "desc" ? "↓" : "↑"}
      </span>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh bg-page text-primary">
      <GlobalMenuBar currentRoute={"/builds" as never} />

      <main className="max-w-[720px] mx-auto px-6 pt-10 pb-20">
        <div className="mb-8">
          <h1 className="text-[22px] font-semibold tracking-tight text-black/90 dark:text-white/90">
            Biggest countries
          </h1>
          <p className="text-[15px] text-black/50 dark:text-white/50 mt-1">
            Ranked by area, population, or GDP · {data.asOf}
          </p>
        </div>

        <div
          className="inline-flex rounded-xl border border-subtle bg-hover/40 p-1 mb-8"
          role="tablist"
          aria-label="Metric"
        >
          {METRICS.map((m) => {
            const active = metric === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleMetricChange(m.id)}
                className={`px-3.5 py-1.5 text-[14px] rounded-lg transition-colors ${
                  active
                    ? "bg-page text-primary shadow-sm font-medium"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {leader && (
          <div className="mb-8 rounded-2xl border border-subtle px-5 py-4">
            <p className="text-[13px] text-tertiary uppercase tracking-wide">
              #1 by {metricUnit(metric)}
            </p>
            <p className="mt-1 text-[20px] font-semibold tracking-tight text-black/90 dark:text-white/90">
              {leader.name}
            </p>
            <p className="mt-0.5 text-[15px] text-secondary">
              {formatMetric(metric, leader[metric])}
            </p>
          </div>
        )}

        <section className="mb-12" aria-label="Top 10 chart">
          <h2 className="text-[15px] font-medium text-black/70 dark:text-white/70 mb-4">
            Top 10
          </h2>
          <ul className="space-y-2.5">
            {top10.map((country, i) => {
              const pct = Math.max(4, (country[metric] / maxValue) * 100);
              return (
                <li key={country.code} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-[13px] tabular-nums text-tertiary text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="text-[14px] font-medium truncate">
                        {country.name}
                      </span>
                      <span className="text-[13px] tabular-nums text-secondary shrink-0">
                        {formatMetric(metric, country[metric])}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-black/70 dark:bg-white/75 transition-[width] duration-300 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="All countries table">
          <h2 className="text-[15px] font-medium text-black/70 dark:text-white/70 mb-4">
            All countries
          </h2>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[560px] text-left border-collapse">
              <thead>
                <tr className="border-b border-subtle text-[13px] text-tertiary">
                  <th className="py-2 pr-3 font-medium w-10">#</th>
                  <th className="py-2 pr-3 font-medium">
                    <button
                      type="button"
                      className="hover:text-primary"
                      onClick={() => handleSort("name")}
                    >
                      Country
                      {sortIndicator("name")}
                    </button>
                  </th>
                  <th className="py-2 pr-3 font-medium hidden sm:table-cell">
                    <button
                      type="button"
                      className="hover:text-primary"
                      onClick={() => handleSort("region")}
                    >
                      Region
                      {sortIndicator("region")}
                    </button>
                  </th>
                  <th
                    className={`py-2 pr-3 font-medium text-right ${
                      metric === "areaKm2" ? "text-primary" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="hover:text-primary"
                      onClick={() => handleSort("areaKm2")}
                    >
                      Area
                      {sortIndicator("areaKm2")}
                    </button>
                  </th>
                  <th
                    className={`py-2 pr-3 font-medium text-right ${
                      metric === "population" ? "text-primary" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="hover:text-primary"
                      onClick={() => handleSort("population")}
                    >
                      Pop.
                      {sortIndicator("population")}
                    </button>
                  </th>
                  <th
                    className={`py-2 font-medium text-right ${
                      metric === "gdpUsd" ? "text-primary" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="hover:text-primary"
                      onClick={() => handleSort("gdpUsd")}
                    >
                      GDP
                      {sortIndicator("gdpUsd")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((country) => {
                  const rank =
                    ranked.findIndex((c) => c.code === country.code) + 1;
                  return (
                    <tr
                      key={country.code}
                      className="border-b border-subtle/70 text-[14px]"
                    >
                      <td className="py-2.5 pr-3 tabular-nums text-tertiary">
                        {rank}
                      </td>
                      <td className="py-2.5 pr-3 font-medium">{country.name}</td>
                      <td className="py-2.5 pr-3 text-secondary hidden sm:table-cell">
                        {country.region}
                      </td>
                      <td
                        className={`py-2.5 pr-3 text-right tabular-nums ${
                          metric === "areaKm2"
                            ? "text-primary font-medium"
                            : "text-secondary"
                        }`}
                      >
                        {formatMetric("areaKm2", country.areaKm2)}
                      </td>
                      <td
                        className={`py-2.5 pr-3 text-right tabular-nums ${
                          metric === "population"
                            ? "text-primary font-medium"
                            : "text-secondary"
                        }`}
                      >
                        {formatMetric("population", country.population)}
                      </td>
                      <td
                        className={`py-2.5 text-right tabular-nums ${
                          metric === "gdpUsd"
                            ? "text-primary font-medium"
                            : "text-secondary"
                        }`}
                      >
                        {formatMetric("gdpUsd", country.gdpUsd)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-[12px] text-tertiary leading-relaxed">
            {data.source}
          </p>
        </section>
      </main>
    </div>
  );
}
