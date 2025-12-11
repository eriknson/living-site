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
import { getModelSlug, getModelIdFromSlug, getBuildForModel } from "./manifest";

interface ManifestContextValue {
  manifest: Manifest | null;
  currentModel: string | null;
  currentDate: string | null;
  currentBuildPath: string | null;
  isLoading: boolean;
  setModel: (modelId: string) => void;
  setDate: (date: string) => void;
}

const ManifestContext = createContext<ManifestContextValue | null>(null);

export function ManifestProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get model and date from URL params
  const modelSlug = searchParams.get("model");
  const dateFromUrl = searchParams.get("date");
  const modelIdFromUrl = modelSlug ? getModelIdFromSlug(modelSlug) : null;

  // Current values: from URL if valid, otherwise defaults from manifest
  const currentModel = modelIdFromUrl || manifest?.default_model || null;
  const currentDate = dateFromUrl || manifest?.latest_date || null;

  // Get current build path
  const currentBuildPath = manifest && currentModel && currentDate
    ? getBuildForModel(manifest, currentModel, currentDate)?.path || null
    : null;

  // Fetch manifest once on mount
  useEffect(() => {
    fetch("/builds/manifest.json")
      .then((res) => res.json())
      .then((data: Manifest) => {
        setManifest(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch manifest:", err);
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
      router.replace(queryString ? `/?${queryString}` : "/", { scroll: false });
    },
    [router, searchParams]
  );

  // Handle model change
  const setModel = useCallback(
    (modelId: string) => {
      if (!manifest) return;

      updateParams({
        model: modelId === manifest.default_model ? null : getModelSlug(modelId),
      });
    },
    [manifest, updateParams]
  );

  // Handle date change
  const setDate = useCallback(
    (date: string) => {
      if (!manifest) return;

      updateParams({
        date: date === manifest.latest_date ? null : date,
      });
    },
    [manifest, updateParams]
  );

  return (
    <ManifestContext.Provider
      value={{
        manifest,
        currentModel,
        currentDate,
        currentBuildPath,
        isLoading,
        setModel,
        setDate,
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
