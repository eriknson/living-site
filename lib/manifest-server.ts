import { promises as fs } from "fs";
import path from "path";
import type { Manifest } from "./manifest";

export async function getManifest(): Promise<Manifest> {
  const manifestPath = path.join(process.cwd(), "public", "builds", "manifest.json");
  const content = await fs.readFile(manifestPath, "utf-8");
  return JSON.parse(content);
}

