import path from "path";
import { readFile } from "fs/promises";
import type { Manifest } from "@/lib/manifest";
import { BuildsPageClient } from "@/components/builds/builds-page-client";

export const dynamic = "force-static";

interface BuildEntry {
  id: string;
  timestamp: string;
  formatted_timestamp: string;
  status: "success" | "failure";
  duration_ms?: number;
  model?: string;
  agent_output: string;
  token_count?: number;
  line_count?: number;
  github_run_url?: string;
}

interface BuildHistory {
  builds: BuildEntry[];
}

async function readJsonFile<T>(absolutePath: string): Promise<T | null> {
  try {
    const raw = await readFile(absolutePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default async function BuildsPage() {
  const manifestPath = path.join(process.cwd(), "public", "builds", "manifest.json");
  const historyPath = path.join(process.cwd(), "public", "builds", "history.json");

  const manifest = await readJsonFile<Manifest>(manifestPath);
  const history = await readJsonFile<BuildHistory>(historyPath);

  return <BuildsPageClient manifest={manifest} history={history} />;
}
