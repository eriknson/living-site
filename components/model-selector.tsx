"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Manifest } from "@/lib/manifest";
import {
  formatDuration,
  getAvailableModels,
  getModelDisplayName,
  getModelIdFromSlug,
  getModelSlug,
} from "@/lib/manifest";

interface ModelSelectorProps {
  manifest: Manifest | null;
}

export function ModelSelector({ manifest }: ModelSelectorProps) {
  const pathname = usePathname();

  // Get current model from URL
  const pathSlug = pathname === "/" ? null : pathname.slice(1);
  const currentModelId = pathSlug
    ? getModelIdFromSlug(pathSlug)
    : manifest?.default_model;

  const availableModels = manifest ? getAvailableModels(manifest) : [];
  const currentBuild = availableModels.find((b) => b.model === currentModelId);

  if (!manifest) {
    return (
      <div className="px-2.5 py-0.5 text-black/40 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-black/20" />
        Loading...
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="px-2.5 py-0.5 rounded hover:bg-black/5 active:bg-black/10 outline-none flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>{getModelDisplayName(currentModelId || "")}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal text-black/60">
          Built {manifest.latest_date}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {availableModels.map((build) => {
          const isActive = build.model === currentModelId;
          const slug = getModelSlug(build.model);
          const href = build.model === manifest.default_model ? "/" : `/${slug}`;

          return (
            <DropdownMenuItem key={build.model} asChild>
              <Link
                href={href}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {isActive ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="w-4" />
                  )}
                  {getModelDisplayName(build.model)}
                </span>
                {build.duration_ms && (
                  <span className="text-black/40 text-xs">
                    {formatDuration(build.duration_ms)}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
