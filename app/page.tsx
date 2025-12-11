"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MenuBar } from "@/components/menu-bar";
import type { Manifest } from "@/lib/manifest";
import { getModelSlug } from "@/lib/manifest";

export default function HomePage() {
  const router = useRouter();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/builds/manifest.json")
      .then((res) => res.json())
      .then((data: Manifest) => {
        setManifest(data);
        setCurrentModel(data.default_model);
      })
      .catch(console.error);
  }, []);

  // Handle model change - navigate to model URL
  const handleModelChange = (model: string) => {
    if (model === manifest?.default_model) {
      // Stay on home for default model
      setCurrentModel(model);
    } else {
      // Navigate to model page
      router.push(`/${getModelSlug(model)}`);
    }
  };

  // Get current build path
  const currentBuild = manifest?.dates?.[0]?.builds?.find(
    (b) => b.model === currentModel && b.status === "success"
  );

  return (
    <>
      <MenuBar
        manifest={manifest}
        currentModel={currentModel}
        onModelChange={handleModelChange}
      />
      <main className="pt-[var(--menu-bar-height)]">
        {currentBuild ? (
          <iframe
            key={currentModel}
            src={`/${currentBuild.path}`}
            title={`Site built by ${currentModel}`}
            className="w-full h-[calc(100vh-var(--menu-bar-height))] border-0"
          />
        ) : (
          <div className="flex items-center justify-center h-[calc(100vh-var(--menu-bar-height))] text-black/60">
            <p>{manifest ? "No build available" : "Loading..."}</p>
          </div>
        )}
      </main>
    </>
  );
}

