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
import {
  getModelSlug,
  getModelIdFromSlug,
  getBuildForModel,
  getBatch,
  getDefaultModelForBatch,
} from "./manifest";

const DEFAULT_MODEL_ID = "composer-2.5-fast";

interface GamesManifestContextValue {
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

const GamesManifestContext = createContext<GamesManifestContextValue | null>(null);

export function GamesManifestProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const modelSlug = searchParams.get("model");
  const dateFromUrl = searchParams.get("date");
  const timestampFromUrl = searchParams.get("t");
  const modelIdFromUrl = modelSlug ? getModelIdFromSlug(modelSlug) : null;

  const currentDate = dateFromUrl || manifest?.latest_date || null;
  const currentTimestamp = timestampFromUrl || manifest?.latest_timestamp || null;
  const currentModel = manifest
    ? getDefaultModelForBatch(manifest, currentDate || undefined, currentTimestamp || undefined, modelIdFromUrl || undefined)
    : modelIdFromUrl || DEFAULT_MODEL_ID;
  const resolvedCurrentModel = currentModel || null;

  useEffect(() => {
    if (manifest && resolvedCurrentModel && getModelIdFromSlug(modelSlug || "") !== resolvedCurrentModel) {
      const defaultSlug = getModelSlug(resolvedCurrentModel);
      const params = new URLSearchParams(searchParams.toString());
      params.set("model", defaultSlug);
      router.replace(`/play?${params.toString()}`, { scroll: false });
    }
  }, [resolvedCurrentModel, manifest, modelSlug, router, searchParams]);

  const currentBuildPath = manifest && resolvedCurrentModel && currentDate
    ? getBuildForModel(manifest, resolvedCurrentModel, currentDate, currentTimestamp || undefined)?.path || null
    : null;

  useEffect(() => {
    fetch("/games/manifest.json")
      .then((res) => res.json())
      .then((data: Manifest) => {
        setManifest(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

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
      router.replace(queryString ? `/play?${queryString}` : "/play", { scroll: false });
    },
    [router, searchParams]
  );

  const setModel = useCallback(
    (modelId: string) => {
      if (!manifest) return;
      updateParams({ model: getModelSlug(modelId) });
    },
    [manifest, updateParams]
  );

  const setDate = useCallback(
    (date: string) => {
      if (!manifest) return;
      updateParams({
        date: date === manifest.latest_date ? null : date,
        t: null,
      });
    },
    [manifest, updateParams]
  );

  const setTimestamp = useCallback(
    (timestamp: string) => {
      if (!manifest) return;
      const batch = getBatch(manifest, currentDate || undefined);
      const isLatestBatch = batch?.timestamp === timestamp;
      updateParams({
        t: isLatestBatch && currentDate === manifest.latest_date ? null : timestamp,
      });
    },
    [manifest, currentDate, updateParams]
  );

  return (
    <GamesManifestContext.Provider
      value={{
        manifest,
        currentModel: resolvedCurrentModel,
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
    </GamesManifestContext.Provider>
  );
}

export function useGamesManifest() {
  const context = useContext(GamesManifestContext);
  if (!context) {
    throw new Error("useGamesManifest must be used within GamesManifestProvider");
  }
  return context;
}
