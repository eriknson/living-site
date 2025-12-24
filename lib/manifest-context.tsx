"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Manifest } from "./manifest";
import { getModelSlug, getModelIdFromSlug, getBuildForModel, getBatch } from "./manifest";

interface ManifestContextValue {
  manifest: Manifest | null;
  currentModel: string | null;
  currentDate: string | null;
  currentTimestamp: string | null;
  currentBuildPath: string | null;
  isLoading: boolean;
  setModel: (modelId: string) => void;
  setDate: (date: string) => void;
  setTimestamp: (timestamp: string) => void;
}

const ManifestContext = createContext<ManifestContextValue | null>(null);

export function ManifestProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get model, date, and timestamp from URL params
  const modelSlug = searchParams.get("model");
  const dateFromUrl = searchParams.get("date");
  const timestampFromUrl = searchParams.get("t");
  const modelIdFromUrl = modelSlug ? getModelIdFromSlug(modelSlug) : null;

  // Current values: from URL if valid, otherwise defaults from manifest
  const currentModel = modelIdFromUrl || manifest?.default_model || null;
  const currentDate = dateFromUrl || manifest?.latest_date || null;
  const currentTimestamp = timestampFromUrl || manifest?.latest_timestamp || null;

  // Get current build path using model, date, and timestamp
  const currentBuildPath = manifest && currentModel && currentDate
    ? getBuildForModel(manifest, currentModel, currentDate, currentTimestamp || undefined)?.path || null
    : null;

  // Fetch manifest once on mount
  useEffect(() => {
    fetch("/builds/manifest.json")
      .then((res) => res.json())
      .then((data: Manifest) => {
        setManifest(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  // Update URL params helper
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const queryString = params.toString();
      router.replace(queryString ? `/agent?${queryString}` : "/agent", { scroll: false });
    },
    [router, searchParams]
  );

  // Handle model change - stays within the current batch
  const setModel = useCallback(
    (modelId: string) => {
      if (!manifest) return;

      updateParams({
        model: modelId === manifest.default_model ? null : getModelSlug(modelId),
      });
    },
    [manifest, updateParams]
  );

  // Handle date change - resets to latest batch for that date
  const setDate = useCallback(
    (date: string) => {
      if (!manifest) return;

      // When changing date, clear timestamp to get the latest batch for that date
      updateParams({
        date: date === manifest.latest_date ? null : date,
        t: null,
      });
    },
    [manifest, updateParams]
  );

  // Handle timestamp (batch) change
  const setTimestamp = useCallback(
    (timestamp: string) => {
      if (!manifest) return;

      // Check if this is the latest timestamp for the current date
      const batch = getBatch(manifest, currentDate || undefined);
      const isLatestBatch = batch?.timestamp === timestamp;

      updateParams({
        t: isLatestBatch && currentDate === manifest.latest_date ? null : timestamp,
      });
    },
    [manifest, currentDate, updateParams]
  );

  return (
    <ManifestContext.Provider
      value={{
        manifest,
        currentModel,
        currentDate,
        currentTimestamp,
        currentBuildPath,
        isLoading,
        setModel,
        setDate,
        setTimestamp,
      }}
    >
      {children}
    </ManifestContext.Provider>
  );
}

export function useManifest() {
  const context = useContext(ManifestContext);
  if (!context) {
    throw new Error("useManifest must be used within ManifestProvider");
  }
  return context;
}
