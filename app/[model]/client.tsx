"use client";

import { useRouter } from "next/navigation";
import { MenuBar } from "@/components/menu-bar";
import type { Manifest } from "@/lib/manifest";
import { getModelSlug, getModelDisplayName } from "@/lib/manifest";

interface ModelPageClientProps {
  manifest: Manifest;
  modelId: string;
  buildPath: string;
}

export function ModelPageClient({ manifest, modelId, buildPath }: ModelPageClientProps) {
  const router = useRouter();

  // Handle model change - navigate to model URL
  const handleModelChange = (model: string) => {
    if (model === manifest.default_model) {
      router.push("/");
    } else {
      router.push(`/${getModelSlug(model)}`);
    }
  };

  return (
    <>
      <MenuBar
        manifest={manifest}
        currentModel={modelId}
        onModelChange={handleModelChange}
      />
      <main className="pt-[var(--menu-bar-height)]">
        <iframe
          src={`/${buildPath}`}
          title={`Site built by ${getModelDisplayName(modelId)}`}
          className="w-full h-[calc(100vh-var(--menu-bar-height))] border-0"
        />
      </main>
    </>
  );
}
